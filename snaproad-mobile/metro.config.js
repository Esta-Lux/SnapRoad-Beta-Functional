const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Transform all node_modules to handle import.meta
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
    'expo-dev-client',
    '@expo',
    'react-navigation',
    '@react-navigation',
    'react-native-web',
    'react-native-safe-area-context',
    'react-native-screens',
    '@react-native-async-storage',
    'react-native-svg',
    '@babel/runtime',
    'regenerator-runtime',
  ].join('|') + ')/)',
];

module.exports = config;
