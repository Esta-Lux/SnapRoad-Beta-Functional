#!/usr/bin/env node
/**
 * Injects App Store Connect "Apple ID" (numeric ascAppId) into eas.json for one submit run,
 * then restores the file. EAS Submit does not expand ${VAR} in eas.json for submit profiles.
 *
 * Required env:
 *   ASC_APP_ID — digits from App Store Connect → App → General → App Information → Apple ID
 *
 * One-time (non-interactive submit auth): from app/mobile run:
 *   npx eas-cli credentials -p ios
 * and add an App Store Connect API key for EAS Submit (or set EXPO_APPLE_APP_SPECIFIC_PASSWORD).
 *
 * Usage: ASC_APP_ID=1234567890 node scripts/submit-ios-testflight.cjs [-- extra eas args]
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const easPath = path.join(root, "eas.json");

const asc = (process.env.ASC_APP_ID || "").trim().replace(/\D/g, "");
if (!asc || asc.length < 6) {
  console.error(
    "Set ASC_APP_ID to the numeric Apple ID from App Store Connect (App → App Information).\n" +
      "See https://expo.fyi/asc-app-id",
  );
  process.exit(1);
}

const raw = fs.readFileSync(easPath, "utf8");
const eas = JSON.parse(raw);
const baseIos = { ...(eas.submit?.production?.ios || {}) };
if ((process.env.EXPO_APPLE_ID || "").trim()) {
  baseIos.appleId = process.env.EXPO_APPLE_ID.trim();
}
const ios = {
  ...baseIos,
  ascAppId: asc,
};
eas.submit = eas.submit || {};
eas.submit.production = eas.submit.production || {};
eas.submit.production.ios = ios;

fs.writeFileSync(easPath, `${JSON.stringify(eas, null, 2)}\n`);

const extra = process.argv.slice(2);
const dash = extra.indexOf("--");
const forward = dash >= 0 ? extra.slice(dash + 1) : [];
const args = ["eas-cli", "submit", "--platform", "ios", "--latest", "--non-interactive", ...forward];

let status = 1;
try {
  const r = spawnSync("npx", args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  status = r.status ?? 1;
} finally {
  fs.writeFileSync(easPath, raw);
}
process.exit(status);
