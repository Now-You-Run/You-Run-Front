// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 이 줄이 필요합니다.
      
      [
        'module-resolver',
        {
          alias: {
            // '@' 별칭이 프로젝트의 루트 폴더를 가리키도록 설정합니다.
            '@': './',
          },
        },
      ],
      'react-native-reanimated/plugin',
      // --
    ],

  };
};
