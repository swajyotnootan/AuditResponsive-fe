// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Get default config
const config = getDefaultConfig(__dirname);

// ✅ FIX: Alias tslib to the ES6 module build that pdf-lib expects.
// Prevents: "Cannot destructure property '__extends' of 'tslib.default'"
const ALIASES = {
  'tslib': require.resolve('tslib/tslib.es6.mjs'),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const aliasedModule = ALIASES[moduleName] ?? moduleName;

  if (originalResolveRequest) {
    return originalResolveRequest(context, aliasedModule, platform);
  }

  return context.resolveRequest(context, aliasedModule, platform);
};

// Use .reverse() instead of .toReversed()
// toReversed() is not supported in Node 18
module.exports = withNativeWind(config, {
  input: './app/global.css',
  inline: true,
});