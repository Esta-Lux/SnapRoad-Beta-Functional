#!/usr/bin/env node
/**
 * Correct EAS entrypoint for this monorepo (always use this or the root npm scripts).
 *
 * What breaks without it
 * - Monorepo / wrong archive root: default git/VCS packaging archives from repo root
 *   (paths like app/mobile/package.json). The Linux worker layout may not match, causing
 *   missing package.json or broken paths under build/… . We set EAS_NO_VCS=1 and
 *   EAS_PROJECT_ROOT=<abs path to app/mobile> so the tarball root is the Expo app.
 *   @see https://github.com/expo/eas-cli/issues/2938
 * - Windows read-only: copies (e.g. Robocopy) can leave the read-only bit set. EAS
 *   preserves attributes; Linux extract then fails with Permission denied. On win32 we
 *   run `attrib -R … /S /D` on app/mobile before invoking EAS.
 *
 * How to run
 * - From repo root: npm run eas:android:production (or eas:android:preview, etc.)
 * - From app/mobile: npm run eas:build:prod:android (scripts call this file)
 * - Do not run plain `eas build` from repo root, or from app/mobile without this wrapper
 *   on Windows without clearing read-only first.
 *
 * .easignore: app/mobile/.easignore is authoritative; root .easignore is a safety net.
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = resolve(root, "app", "mobile");

/**
 * Robocopy / Windows often leaves the read-only flag set on files. EAS uploads a
 * tarball that preserves modes; Linux extract then fails with "Permission denied".
 */
function clearWindowsReadOnlyTree(projectRoot) {
  if (process.platform !== "win32") return;
  spawnSync("attrib", ["-R", `${projectRoot}\\*`, "/S", "/D"], {
    stdio: "inherit",
    shell: true,
  });
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/eas-build-mobile.mjs <eas-cli args...>");
  console.error(
    "Example: node scripts/eas-build-mobile.mjs build --platform android --profile preview --clear-cache --non-interactive",
  );
  process.exit(1);
}

clearWindowsReadOnlyTree(mobileRoot);

const env = {
  ...process.env,
  EAS_NO_VCS: "1",
  EAS_PROJECT_ROOT: mobileRoot,
};

const result = spawnSync("npx", ["eas-cli", ...args], {
  cwd: mobileRoot,
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status === null ? 1 : result.status);
