#!/usr/bin/env node
/**
 * Run EAS CLI from app/mobile with EAS_NO_VCS=1 and absolute EAS_PROJECT_ROOT.
 *
 * When EAS uses the git repo root, archives can contain paths like app/mobile/src/...
 * while the build worker expects the Expo app at workingdir/build/app/mobile — which
 * breaks extraction. Disabling VCS mode makes EAS pack from the app directory only,
 * so tarball entries are package.json, src/, etc. at the correct root.
 *
 * @see https://github.com/expo/eas-cli/issues/2938
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
