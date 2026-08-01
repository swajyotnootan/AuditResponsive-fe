const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Get default config
const config = getDefaultConfig(__dirname);

// Use .reverse() instead of .toReversed()
// toReversed() is not supported in Node 18
module.exports = withNativeWind(config, { 
  input: './app/global.css',
  inline: true,
});