const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude @react-native/debugger-frontend (uses import.meta) so it never gets into the web bundle.
// 1) Resolve it to an empty module for web so require() gets {} instead of the real package.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName && (moduleName.includes('debugger-frontend') || moduleName === '@react-native/debugger-frontend')) {
    if (platform === 'web') {
      return {
        type: 'sourceFile',
        filePath: path.join(__dirname, 'empty-module.js'),
      };
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// 2) Blocklist so any file under debugger-frontend is never bundled (safety net).
config.resolver.blockList = [
  /node_modules[\\/]@react-native[\\/]debugger-frontend[\\/]/,
  /node_modules[\\/]@react-native[\\/]community-cli-plugin[\\/]node_modules[\\/]@react-native[\\/]debugger-frontend[\\/]/,
].concat(config.resolver.blockList || []);

config.resolver.emptyModulePath = path.join(__dirname, 'empty-module.js');

module.exports = config;
