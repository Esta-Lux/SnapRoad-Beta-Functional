#!/usr/bin/env node
/**
 * Mobile dev stack from repo root:
 *   npm run dev:mobile       → backend → wait until stable → pause → cloudflared + Expo --tunnel
 *   npm run dev:mobile:lan   → backend → wait → write http://<LAN_IP>:8001 to .env + Expo --lan (no Cloudflare/ngrok for API)
 *
 * Optional: export NGROK_AUTH_TOKEN from https://dashboard.ngrok.com for stabler --tunnel sessions.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(ROOT, "app", "backend");
const MOBILE_DIR = path.join(ROOT, "app", "mobile");
const MOBILE_ENV = path.join(MOBILE_DIR, ".env");

const TRY_CLOUDFLARE_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
/** Max time to wait for the API to come up (slow venv imports, Supabase, etc.). */
const BACKEND_READY_MS = 180_000;
/** Require this many consecutive successful GET / responses before treating the backend as ready. */
const BACKEND_STABLE_HITS = 3;
/** Pause between stable hits (ms). */
const BACKEND_STABLE_GAP_MS = 700;
/** After backend is stable, wait before cloudflared so the origin is less likely to return HTTP 530. */
const PRE_CLOUDFLARED_SETTLE_MS = 6_000;
const TUNNEL_URL_MS = 120_000;

const useLanMetro = process.argv.includes("--lan");

/**
 * Best-effort LAN IPv4 for same-WiFi devices (not loopback).
 */
function pickLanIPv4() {
  const nets = os.networkInterfaces();
  const scored = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family !== "IPv4" || net.internal) continue;
      const a = net.address;
      let prio = 10;
      if (/^192\.168\./.test(a)) prio = 1;
      else if (/^10\./.test(a)) prio = 2;
      else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(a)) prio = 3;
      scored.push({ a, prio });
    }
  }
  scored.sort((x, y) => x.prio - y.prio);
  return scored[0]?.a ?? null;
}

function resolveBackendPython() {
  // Prefer python3 in venv (macOS/Homebrew often has no `python` on PATH outside venv).
  const candidates = [
    path.join(BACKEND_DIR, ".venv", "bin", "python3"),
    path.join(BACKEND_DIR, ".venv", "bin", "python"),
    path.join(BACKEND_DIR, "venv", "bin", "python3"),
    path.join(BACKEND_DIR, "venv", "bin", "python"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return process.platform === "win32" ? "python" : "python3";
}

function upsertEnvLine(content, key, value) {
  const lines = (content || "").split(/\r?\n/);
  let found = false;
  const out = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) {
    if (out.length && out[out.length - 1] !== "") out.push("");
    out.push(`${key}=${value}`);
  }
  return out.join("\n").replace(/\n+$/, "\n");
}

function writeMobileApiUrl(url) {
  const normalized = url.replace(/\/+$/, "");
  let body = "";
  if (existsSync(MOBILE_ENV)) {
    body = readFileSync(MOBILE_ENV, "utf8");
  }
  body = upsertEnvLine(body, "EXPO_PUBLIC_API_URL", normalized);
  body = upsertEnvLine(body, "API_URL", normalized);
  mkdirSync(path.dirname(MOBILE_ENV), { recursive: true });
  writeFileSync(MOBILE_ENV, body, "utf8");
  console.log(`\n[dev:mobile] Wrote EXPO_PUBLIC_API_URL and API_URL → ${normalized}\n`);
}

async function waitForBackendStable() {
  const start = Date.now();
  let consecutive = 0;
  while (Date.now() - start < BACKEND_READY_MS) {
    try {
      const res = await fetch("http://127.0.0.1:8001/", { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        consecutive++;
        if (consecutive >= BACKEND_STABLE_HITS) {
          console.log(
            `[dev:mobile] Backend responded OK ${BACKEND_STABLE_HITS} times in a row on http://127.0.0.1:8001/`,
          );
          return;
        }
        await new Promise((r) => setTimeout(r, BACKEND_STABLE_GAP_MS));
      } else {
        consecutive = 0;
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch {
      consecutive = 0;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(
    `Backend did not become stable on http://127.0.0.1:8001 within ${BACKEND_READY_MS / 1000}s ` +
      `(need ${BACKEND_STABLE_HITS} consecutive OK responses).`,
  );
}

function spawnBackend() {
  const py = resolveBackendPython();
  const child = spawn(py, ["run_server.py"], {
    cwd: BACKEND_DIR,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env },
  });
  child.on("error", (err) => {
    console.error("[dev:mobile] Failed to start backend:", err.message);
  });
  return child;
}

function spawnCloudflared(onUrl) {
  const child = spawn(
    "cloudflared",
    ["tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:8001"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    }
  );

  let buf = "";
  const scan = (chunk) => {
    buf += chunk.toString();
    const m = buf.match(TRY_CLOUDFLARE_RE);
    if (m) onUrl(m[0]);
  };

  child.stdout.on("data", (c) => {
    process.stdout.write(c);
    scan(c);
  });
  child.stderr.on("data", (c) => {
    process.stderr.write(c);
    scan(c);
  });

  child.on("error", (err) => {
    console.error("[dev:mobile] cloudflared failed:", err.message);
    console.error("Install: brew install cloudflared (or download from Cloudflare)");
  });

  return child;
}

function spawnExpo(packagerHostname, metroPort = 8081) {
  const args = useLanMetro
    ? ["expo", "start", "--dev-client", "--lan", "--clear"]
    : ["expo", "start", "--dev-client", "--tunnel", "--clear"];
  const expoEnv = { ...process.env, FORCE_COLOR: "1" };
  delete expoEnv.CI;
  // Physical device: Expo UrlCreator reads EXPO_PACKAGER_PROXY_URL first, then REACT_NATIVE_PACKAGER_HOSTNAME.
  // Without these, --lan may pick the wrong interface (VPN) and the dev client shows "Could not connect to development server".
  if (packagerHostname) {
    expoEnv.REACT_NATIVE_PACKAGER_HOSTNAME = packagerHostname;
    expoEnv.EXPO_PACKAGER_PROXY_URL = `http://${packagerHostname}:${metroPort}`;
  }
  // Listen on all interfaces so phones on LAN can reach Metro (not only 127.0.0.1).
  expoEnv.EXPO_DEVTOOLS_LISTEN_ADDRESS = expoEnv.EXPO_DEVTOOLS_LISTEN_ADDRESS || "0.0.0.0";
  return spawn("npx", args, {
    cwd: MOBILE_DIR,
    shell: true,
    stdio: "inherit",
    env: expoEnv,
  });
}

function killTree(child, name) {
  if (!child || child.killed || child.exitCode != null) return;
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  console.error(`[dev:mobile] Sent SIGTERM to ${name}`);
}

async function main() {
  console.log(
    "[dev:mobile] API secrets: FastAPI loads app/backend/.env on this Mac only. " +
      "EAS env applies to native builds, not this Python process.\n" +
      "[dev:mobile] Starting backend (port 8001)…",
  );
  const backend = spawnBackend();

  try {
    await waitForBackendStable();
  } catch (e) {
    killTree(backend, "backend");
    console.error(e.message || e);
    process.exit(1);
  }

  let cf = null;
  /** LAN IPv4 for API URL + Metro packager hostname (physical device). */
  let lanIp = null;

  if (useLanMetro) {
    lanIp = pickLanIPv4();
    if (lanIp) {
      const lanUrl = `http://${lanIp}:8001`;
      writeMobileApiUrl(lanUrl);
      console.log(
        `[dev:mobile] LAN mode: wrote EXPO_PUBLIC_API_URL → ${lanUrl} (same Wi‑Fi as this Mac).\n` +
          "  • Phone + Mac on the same Wi‑Fi; open the dev client from Metro’s QR / URL.\n" +
          "  • If this IP is wrong (VPN / multiple interfaces), edit app/mobile/.env manually.\n" +
          `  • Metro URL for dev client: EXPO_PACKAGER_PROXY_URL=http://${lanIp}:8081 (and REACT_NATIVE_PACKAGER_HOSTNAME)\n` +
          `  • If Metro uses another port, set METRO_PORT before starting (default 8081).\n` +
          "[dev:mobile] Starting Expo (dev client + LAN)…\n",
      );
    } else {
      console.log(
        "[dev:mobile] LAN mode: could not detect a LAN IPv4; not changing app/mobile/.env.\n" +
          "  • Set EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:8001 or leave unset for Metro-host auto-detect.\n" +
          "[dev:mobile] Starting Expo (dev client + LAN)…\n",
      );
    }
  } else {
    console.log(
      `[dev:mobile] Waiting ${PRE_CLOUDFLARED_SETTLE_MS / 1000}s before cloudflared so :8001 is fully ready (reduces HTTP 530)…`,
    );
    await new Promise((r) => setTimeout(r, PRE_CLOUDFLARED_SETTLE_MS));
    console.log("[dev:mobile] Starting cloudflared → localhost:8001…");

    let tunnelUrl = null;
    let urlResolve;
    let urlReject;
    const urlReady = new Promise((resolve, reject) => {
      urlResolve = resolve;
      urlReject = reject;
    });

    const cfTimeout = setTimeout(() => {
      if (!tunnelUrl) urlReject(new Error("Timed out waiting for *.trycloudflare.com URL from cloudflared."));
    }, TUNNEL_URL_MS);

    cf = spawnCloudflared((url) => {
      if (tunnelUrl) return;
      tunnelUrl = url;
      clearTimeout(cfTimeout);
      try {
        writeMobileApiUrl(url);
        urlResolve();
      } catch (e) {
        urlReject(e);
      }
    });

    try {
      await urlReady;
    } catch (e) {
      killTree(cf, "cloudflared");
      killTree(backend, "backend");
      console.error(e.message || e);
      process.exit(1);
    }

    console.log(
      "[dev:mobile] Starting Expo (dev client + tunnel / ngrok). " +
        "If the tunnel drops, run: npm run dev:mobile:lan (same Wi‑Fi) or set NGROK_AUTH_TOKEN.\n",
    );
  }

  const metroPort = Number(process.env.METRO_PORT || process.env.RCT_METRO_PORT || 8081) || 8081;
  const expo = spawnExpo(useLanMetro ? lanIp : null, metroPort);
  expo.on("error", (err) => {
    console.error("[dev:mobile] Expo failed:", err.message);
  });

  const shutdown = () => {
    killTree(expo, "expo");
    if (cf) killTree(cf, "cloudflared");
    killTree(backend, "backend");
  };

  process.on("SIGINT", () => {
    shutdown();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(0);
  });

  expo.on("exit", (code) => {
    if (cf) killTree(cf, "cloudflared");
    killTree(backend, "backend");
    process.exit(code ?? 0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
