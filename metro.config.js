const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // 필요한 asset 확장자 추가
  config.resolver.assetExts.push('bin', 'gltf', 'glb', 'png');

  return config;
})();