module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      'babel-preset-expo',
      ['nativewind/babel', { mode: 'compile' }],
    ],
    plugins: [
      // ✅ Required for react-native-reanimated v4.x
      //    Must be LAST in the plugins array
      'react-native-worklets/plugin',
    ],
  };
};