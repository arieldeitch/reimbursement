const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .wasm files as binary assets.
// Required for expo-sqlite web support (wa-sqlite WebAssembly module).
config.resolver.assetExts.push('wasm');

module.exports = config;
