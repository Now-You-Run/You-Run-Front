// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 이 줄이 필요합니다.
      'react-native-reanimated/plugin',
    ],
  };
};
