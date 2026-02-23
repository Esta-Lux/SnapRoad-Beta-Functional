const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure expo packages that use import.meta are transformed by Babel
// Without this, import.meta in node_modules causes "Cannot use 'import.meta' outside a module"
config.transformer = config.transformer || {};
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(' + [
    'react-native',
    '@react-native',
    '@react-native-community',
    'expo',
    'expo-font',
    'expo-asset',
    'expo-constants',
    'expo-file-system',
    'expo-linear-gradient',
    'expo-location',
    'expo-modules-core',
    'expo-status-bar',
    '@expo',
    'react-navigation',
    '@react-navigation',
    'react-native-web',
    'react-native-safe-area-context',
    'react-native-screens',
    '@react-native-async-storage',
  ].join('|') + ')/)',
];

module.exports = config;
