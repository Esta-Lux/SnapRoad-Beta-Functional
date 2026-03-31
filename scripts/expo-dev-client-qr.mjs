#!/usr/bin/env node
/**
 * When `expo start` runs without a TTY (supervisor / piped logs), the QR code may not print.
 * This script writes a PNG and opens it (macOS: Preview) so you can scan with the iPhone Camera.
 * Opens SnapRoad dev client via exp+slug → Metro on your LAN.
 *
 * Usage:
 *   npm run expo:qr
 *   npm run expo:qr -- 192.168.1.161
 *   METRO_PORT=8082 npm run expo:qr -- 10.0.0.5
 *   npm run expo:qr -- http://192.168.1.161:8081
 *
 * Same Wi‑Fi as the Mac; Metro must be running (`npm run dev:mobile:lan` or `app/mobile` `npm run start:dev:lan`).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Must match app/mobile app.config.ts `slug`. */
const SLUG = "snaproad";

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

function parseArgs(argv) {
  let metroPort = Number(process.env.METRO_PORT || "8081") || 8081;
  /** Full metro URL or bare IPv4 / hostname */
  let target = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port" && argv[i + 1]) {
      metroPort = Number(argv[++i]) || metroPort;
      continue;
    }
    if (a.startsWith("-")) continue;
    if (target == null) target = a;
  }
  return { metroPort, target };
}

function resolveMetroHttp({ metroPort, target }) {
  if (target) {
    const t = target.trim();
    if (/^https?:\/\//i.test(t)) return t.replace(/\/+$/, "");
    return `http://${t}:${metroPort}`;
  }
  const ip = pickLanIPv4();
  if (!ip) {
    console.error(
      "Could not detect LAN IPv4. Pass your Mac IP:\n" +
        "  npm run expo:qr -- 192.168.1.161\n" +
        "Or full URL:\n" +
        "  npm run expo:qr -- http://192.168.1.161:8081",
    );
    process.exit(1);
  }
  return `http://${ip}:${metroPort}`;
}

async function main() {
  const { metroPort, target } = parseArgs(process.argv.slice(2));
  const metroHttp = resolveMetroHttp({ metroPort, target });
  const deepLink = `exp+${SLUG}://expo-development-client/?url=${encodeURIComponent(metroHttp)}`;

  console.log("Metro URL (dev client manual entry):", metroHttp);
  console.log("Open in Safari on iPhone:", deepLink);
  console.log("");

  const outDir = mkdtempSync(path.join(os.tmpdir(), "snaproad-expo-qr-"));
  const png = path.join(outDir, "dev-client-qr.png");

  try {
    await QRCode.toFile(png, deepLink, { width: 512, margin: 2, errorCorrectionLevel: "M" });
  } catch (e) {
    console.error("Failed to write QR PNG. From repo root run: npm install");
    console.error(e?.message || e);
    process.exit(1);
  }

  if (process.platform === "darwin") {
    spawnSync("open", [png], { stdio: "ignore" });
    console.log("Opened QR image — scan with iPhone Camera; it should offer to open SnapRoad dev client.");
  } else if (process.platform === "win32") {
    spawnSync("cmd", ["/c", "start", "", png], { stdio: "ignore" });
    console.log("Opened QR image — scan with your phone.");
  } else {
    console.log("QR saved to:", png);
  }
}

main();
