#!/usr/bin/env node
/**
 * Run Expo in LAN mode with env vars the CLI needs for physical devices.
 * @see https://github.com/expo/expo/blob/main/packages/@expo/cli/src/start/server/UrlCreator.ts
 *
 * Usage (from app/mobile):
 *   npm run start:dev:lan
 *
 * Override IP if auto-detect is wrong (VPN):
 *   METRO_HOST=192.168.1.161 npm run start:dev:lan
 *
 * If Metro is not on 8081:
 *   METRO_PORT=8082 npm run start:dev:lan
 */
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MOBILE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const metroPort = Number(process.env.METRO_PORT || process.env.RCT_METRO_PORT || 8081) || 8081;
const explicitHost = (process.env.METRO_HOST || "").trim();
const ip = explicitHost || pickLanIPv4();

const env = { ...process.env, FORCE_COLOR: "1" };
delete env.CI;

if (ip) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = ip;
  env.EXPO_PACKAGER_PROXY_URL = `http://${ip}:${metroPort}`;
  env.EXPO_DEVTOOLS_LISTEN_ADDRESS = env.EXPO_DEVTOOLS_LISTEN_ADDRESS || "0.0.0.0";
  console.log(
    `[start:dev:lan] REACT_NATIVE_PACKAGER_HOSTNAME=${ip}\n` +
      `[start:dev:lan] EXPO_PACKAGER_PROXY_URL=${env.EXPO_PACKAGER_PROXY_URL}\n` +
      `[start:dev:lan] EXPO_DEVTOOLS_LISTEN_ADDRESS=${env.EXPO_DEVTOOLS_LISTEN_ADDRESS}\n`,
  );
} else {
  console.warn(
    "[start:dev:lan] No LAN IPv4 found. Set METRO_HOST=192.168.x.x or use repo root: npm run dev:mobile:lan\n",
  );
}

const child = spawn("npx", ["expo", "start", "--dev-client", "--lan", "--clear"], {
  cwd: MOBILE_ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});

child.on("exit", (code) => process.exit(code ?? 0));
