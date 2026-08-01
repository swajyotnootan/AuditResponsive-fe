module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      ['nativewind/babel', { mode: 'compile' }], // ← This must be here
    ],
    plugins: [
      'react-native-reanimated/plugin', // If using reanimated
    ],
  };
};