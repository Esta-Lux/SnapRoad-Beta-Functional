#!/usr/bin/env node
/**
 * Sync environment variables from local .env files into EAS (Expo) → Production.
 *
 * Reads (in order; later files override):
 *   app/backend/.env
 *   app/frontend/.env
 *   app/mobile/.env
 *
 * Also copies VITE_* → EXPO_PUBLIC_* where the mobile app expects them (Mapbox, Supabase, Stripe pk).
 * Sets API_URL + EXPO_PUBLIC_API_URL to PRODUCTION_API_URL (default https://api.snaproad.app) unless
 * mobile .env already sets EXPO_PUBLIC_API_URL to a non-localhost HTTPS URL.
 *
 * Usage (from repo root):
 *   node scripts/sync-eas-env.mjs
 *
 * Requires: npx eas-cli, logged in (`cd app/mobile && npx eas-cli login`).
 *
 * Security:
 * - Backend secrets (JWT, service role, Stripe secret, etc.) are stored in EAS as --visibility secret.
 *   They are NOT used by the FastAPI/Railway runtime — set those on Railway separately.
 * - Apple IAP **JWT private key + Key ID + Issuer** belong only on the API host (Railway).
 *   This script skips `APPLE_*` App Store Server API vars so merging `app/backend/.env`
 *   does not upload `.p8` material to Expo. Mobile uses only `EXPO_PUBLIC_APPLE_IAP_*` SKUs from `app/mobile/.env`.
 * - EXPO_PUBLIC_* values are still embedded in the app JS bundle at build time (expected for client keys).
 * - Do not commit real .env files; this script only reads them locally.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MOBILE = join(ROOT, "app", "mobile");

const PRODUCTION_API_URL = (
  process.env.EAS_SYNC_PRODUCTION_API_URL || "https://api.snaproad.app"
).replace(/\/$/, "");

const VITE_TO_EXPO = {
  VITE_SUPABASE_URL: "EXPO_PUBLIC_SUPABASE_URL",
  VITE_SUPABASE_ANON_KEY: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  VITE_MAPBOX_TOKEN: "EXPO_PUBLIC_MAPBOX_TOKEN",
  VITE_STRIPE_PUBLISHABLE_KEY: "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
};

function parseEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  return parseEnv(readFileSync(path, "utf8"));
}

function visibilityFor(name) {
  const n = name.toUpperCase();
  if (name === "StripeBackEndKey") return "secret";
  if (
    n.includes("SECRET") ||
    n.includes("PASSWORD") ||
    n === "JWT_SECRET" ||
    n === "REDIS_URL" ||
    n === "OPENAI_API_KEY" ||
    n === "VITE_OPENAI_API_KEY" ||
    n === "NVIDIA_API_KEY" ||
    n.endsWith("_WEBHOOK_SECRET") ||
    n.includes("STRIPE_SECRET_KEY") ||
    n === "SUPABASE_SECRET_KEY" ||
    n === "SUPABASE_SERVICE_ROLE_KEY" ||
    n === "MAPKIT_PRIVATE_KEY"
  ) {
    return "secret";
  }
  if (
    n.includes("KEY") ||
    n.includes("TOKEN") ||
    n.includes("DSN") ||
    n.includes("API_KEY") ||
    n.includes("OHGO") ||
    n.includes("MAPKIT") ||
    n.includes("GOOGLE")
  ) {
    return "sensitive";
  }
  return "plaintext";
}

/** Vars from Railway/backend that must never be uploaded to Expo (wrong runtime + IAP .p8). */
function skipKeyForEas(key) {
  const ku = key.toUpperCase();
  if (key.startsWith("APPLE_IAP_") || key.startsWith("APPLE_APP_")) return true;
  if (ku === "SNAPROAD_PUBLIC_API_BASE") return true;
  return false;
}

function main() {
  const merged = {
    ...loadEnvFile(join(ROOT, "app", "backend", ".env")),
    ...loadEnvFile(join(ROOT, "app", "frontend", ".env")),
    ...loadEnvFile(join(ROOT, "app", "mobile", ".env")),
  };

  const pathP8 = merged.MAPKIT_PRIVATE_KEY_PATH;
  if (pathP8 && existsSync(pathP8) && !merged.MAPKIT_PRIVATE_KEY) {
    try {
      merged.MAPKIT_PRIVATE_KEY = readFileSync(pathP8, "utf8").trim();
    } catch {
      // skip if unreadable (e.g. on CI)
    }
  }

  // Map VITE_* → EXPO_PUBLIC_* for mobile parity (only if target empty).
  for (const [viteName, expoName] of Object.entries(VITE_TO_EXPO)) {
    const v = merged[viteName];
    if (v && String(v).trim() && !(merged[expoName] || "").trim()) {
      merged[expoName] = v;
    }
  }

  // Production API host for store/TestFlight builds.
  const existingApi = (merged.EXPO_PUBLIC_API_URL || "").trim();
  if (
    !existingApi ||
    existingApi.includes("localhost") ||
    existingApi.includes("127.0.0.1") ||
    existingApi.includes("trycloudflare.com") ||
    existingApi.includes("loca.lt")
  ) {
    merged.EXPO_PUBLIC_API_URL = PRODUCTION_API_URL;
  }
  merged.API_URL = merged.EXPO_PUBLIC_API_URL;

  const skipKeys = new Set();
  if ((merged.MAPKIT_PRIVATE_KEY || "").trim()) skipKeys.add("MAPKIT_PRIVATE_KEY_PATH");

  const keys = Object.keys(merged).filter((k) => {
    if (skipKeys.has(k)) return false;
    if (skipKeyForEas(k)) return false;
    const v = merged[k];
    return v != null && String(v).trim() !== "";
  });
  keys.sort();

  let ok = 0;
  let fail = 0;
  for (const name of keys) {
    const value = String(merged[name]);
    const vis = visibilityFor(name);
    const r = spawnSync(
      "npx",
      [
        "--yes",
        "eas-cli",
        "env:create",
        "production",
        "--name",
        name,
        "--value",
        value,
        "--force",
        "--non-interactive",
        "--visibility",
        vis,
      ],
      {
        cwd: MOBILE,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      }
    );
    if (r.status !== 0) {
      console.error(`FAIL ${name}: ${(r.stderr || r.stdout || "").slice(0, 200)}`);
      fail += 1;
    } else {
      console.log(`OK ${name} (${vis})`);
      ok += 1;
    }
  }

  console.log(`\nDone. ${ok} ok, ${fail} failed.`);
  if (fail) process.exit(1);
}

main();
