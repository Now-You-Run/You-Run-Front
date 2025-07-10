// metro.config.js

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 기본 설정을 가져옵니다.
const config = getDefaultConfig(__dirname);

// 1. 경로 별칭 (Alias) 설정
// '@' 문자가 프로젝트의 루트 디렉터리를 가리키도록 설정합니다.
config.resolver.alias = {
  '@': path.resolve(__dirname),
};

// 2. 해석할 파일 확장자(Source Extensions) 설정
// Metro가 모듈을 찾을 때 .ts와 .tsx 파일을 포함하도록 명시합니다. (매우 중요)
const defaultSourceExts = config.resolver.sourceExts;
config.resolver.sourceExts = ['js', 'json', 'ts', 'tsx', 'jsx', 'cjsx'].concat(defaultSourceExts);


// 3. 필요한 asset 확장자 추가
// 기존에 추가하셨던 설정도 그대로 유지합니다.
config.resolver.assetExts.push('bin', 'gltf', 'glb', 'png');

module.exports = config;
