/**
 * @expo/vector-icons references bundled .ttf files under build/vendor/...
 * Some installs end up without those binaries (cache/proxy). Restore from npm tarball.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const mobileRoot = path.join(__dirname, '..');
const marker = path.join(
  mobileRoot,
  'node_modules',
  '@expo',
  'vector-icons',
  'build',
  'vendor',
  'react-native-vector-icons',
  'Fonts',
  'Ionicons.ttf',
);

function main() {
  try {
    if (fs.existsSync(marker) && fs.statSync(marker).size > 1000) {
      return;
    }
  } catch {
    // continue
  }

  const pkgPath = path.join(
    mobileRoot,
    'node_modules',
    '@expo',
    'vector-icons',
    'package.json',
  );
  if (!fs.existsSync(pkgPath)) {
    console.warn('[restore-expo-vector-fonts] @expo/vector-icons not installed; skip');
    return;
  }

  const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  const extractBase = path.join(
    mobileRoot,
    'node_modules',
    '@expo',
    'vector-icons',
    'build',
    'vendor',
    'react-native-vector-icons',
  );

  fs.mkdirSync(extractBase, { recursive: true });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-vi-'));
  try {
    execSync(`npm pack @expo/vector-icons@${version}`, {
      cwd: tmp,
      stdio: 'pipe',
      shell: true,
    });
    const tgz = fs.readdirSync(tmp).find((f) => f.endsWith('.tgz'));
    if (!tgz) {
      throw new Error('npm pack did not produce a .tgz');
    }
    const tgzPath = path.join(tmp, tgz);
    const inner = 'package/build/vendor/react-native-vector-icons/Fonts';
    // strip package/build/vendor/react-native-vector-icons (4) -> leaves Fonts/ under extractBase
    execSync(
      `tar -xf "${tgzPath}" -C "${extractBase}" --strip-components=4 ${inner}`,
      { stdio: 'pipe', shell: true },
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (!fs.existsSync(marker) || fs.statSync(marker).size < 1000) {
    throw new Error(
      '[restore-expo-vector-fonts] Ionicons.ttf missing after restore; check npm/tar',
    );
  }
  console.log('[restore-expo-vector-fonts] Restored @expo/vector-icons font files');
}

main();
