#!/usr/bin/env node
/**
 * Validates that the monorepo is configured correctly for EAS builds
 * from app/mobile/ without root-level Expo/EAS config collisions.
 *
 * Run:  node scripts/validate-eas-setup.mjs        (from repo root)
 *       npm run eas:validate                        (from repo root)
 */

import { existsSync } from "fs";
import { resolve, sep } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const MOBILE = resolve(ROOT, "app", "mobile");

let ok = true;

function pass(msg) { console.log(`  ✔  ${msg}`); }
function fail(msg) { console.error(`  ✖  ${msg}`); ok = false; }
function info(msg) { console.log(`  ℹ  ${msg}`); }

console.log(`\n  cwd:          ${process.cwd()}`);
console.log(`  repo root:    ${ROOT}`);
console.log(`  mobile root:  ${MOBILE}\n`);

// --- Required files inside app/mobile ---
for (const f of ["package.json", "eas.json", "app.config.ts"]) {
  existsSync(resolve(MOBILE, f)) ? pass(`app/mobile/${f} exists`) : fail(`app/mobile/${f} MISSING`);
}

existsSync(resolve(MOBILE, ".easignore"))
  ? pass("app/mobile/.easignore exists")
  : info("app/mobile/.easignore missing (optional but recommended)");

// --- Conflicting files at repo root ---
for (const f of ["eas.json", "app.json", "app.config.js", "app.config.ts"]) {
  existsSync(resolve(ROOT, f)) ? fail(`Root ${f} exists — will confuse EAS`) : pass(`No root ${f}`);
}

// --- Machine-local files that should not ship ---
const localProps = resolve(MOBILE, "android", "local.properties");
existsSync(localProps) ? fail("app/mobile/android/local.properties exists — remove it") : pass("No local.properties");

console.log("");
if (ok) {
  console.log("  ✅  EAS monorepo setup looks correct.\n");
  console.log("  Build from app/mobile (set env vars so the archive is not git-root-relative):");
  console.log("    PowerShell:");
  console.log('      $env:EAS_NO_VCS="1"; $env:EAS_PROJECT_ROOT=(Resolve-Path app\\mobile).Path');
  console.log("      cd app\\mobile; npx eas-cli build --platform android --profile preview --clear-cache --non-interactive\n");
  console.log("  Or from repo root (uses EAS_NO_VCS + absolute EAS_PROJECT_ROOT):");
  console.log("    npm run eas:android:preview\n");
} else {
  console.error("  ❌  Issues found — fix them before running EAS builds.\n");
  process.exitCode = 1;
}
