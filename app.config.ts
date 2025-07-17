// app.config.ts
import { ConfigContext, ExpoConfig } from '@expo/config';
import 'dotenv/config';

// It's good practice to define environment variables or constants here if needed
const EXPO_PUBLIC_KAKAO_API_KEY =
  process.env.EXPO_PUBLIC_KAKAO_API_KEY ||
  '{{native app key default or placeholder}}'; // Or retrieve from .env or elsewhere
const EXPO_PUBLIC_ANDROID_GOOGLE_MAP_API_KEY =
  process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAP_API_KEY;
const EXPO_PUBLIC_IOS_GOOGLE_MAP_API_KEY =
  process.env.EXPO_PUBLIC_IOS_GOOGLE_MAP_API_KEY;
const EXPO_PUBLIC_PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config, // Keep existing configuration if any, though usually you'd define it all here
    name: 'YouRun',
    slug: 'YouRun',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'yourun',
    userInterfaceStyle: 'automatic',
    // Note: newArchEnabled is usually managed by Expo's SDK, but you can set it if explicitly needed
    // newArchEnabled: true, // This property is often handled by Expo's build process based on SDK version.

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.zepelown.yourun',
      config: {
        googleMapsApiKey: EXPO_PUBLIC_IOS_GOOGLE_MAP_API_KEY,
      },
      infoPlist: {
        UIBackgroundModes: ['location'],
        // ✅ 모든 필수 위치 권한 키 추가
        NSLocationAlwaysAndWhenInUseUsageDescription:
          '이 앱은 러닝 중 위치를 추적하기 위해 백그라운드에서 위치 정보를 사용합니다.',
        NSLocationWhenInUseUsageDescription:
          '이 앱은 러닝 중 위치를 추적하기 위해 위치 정보를 사용합니다.',
        NSLocationAlwaysUsageDescription:
          '이 앱은 러닝 기록을 위해 백그라운드에서도 위치 정보를 사용합니다.',
        // ✅ 추가 권한 (필요시)
        NSLocationUsageDescription:
          '이 앱은 러닝 추적을 위해 위치 정보를 사용합니다.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      config: {
        googleMaps: {
          apiKey: EXPO_PUBLIC_ANDROID_GOOGLE_MAP_API_KEY,
        },
      },
      permissions: [
        'ACCESS_BACKGROUND_LOCATION',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
      ],
      edgeToEdgeEnabled: true,
      package: 'com.zepelown.yourun',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: [
              'https://devrepo.kakao.com/nexus/content/groups/public/',
            ],
            newArchEnabled: true,
          },
          ios: {
            newArchEnabled: true,
          },
        },
      ],
      [
        'expo-location',
        {
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
          locationAlwaysAndWhenInUsePermission:
            '이 앱은 러닝 추적을 위해 위치 정보를 사용합니다.',
          locationAlwaysPermission:
            '이 앱은 백그라운드 러닝 추적을 위해 위치 정보를 사용합니다.',
          locationWhenInUsePermission:
            '이 앱은 러닝 중 위치를 추적하기 위해 위치 정보를 사용합니다.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    // Optional: Add extra for custom values you might want to access in your app
    extra: {
      eas: {
        projectId: '6a645e27-b64f-4c1c-8831-20a05154c26a', // If you use EAS Build and want to define project ID here
      },
    },
  };
};
