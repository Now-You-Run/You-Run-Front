// app.config.ts

import { ConfigContext, ExpoConfig } from '@expo/config';

// It's good practice to define environment variables or constants here if needed
const KAKAO_NATIVE_APP_KEY = process.env.EXPO_KAKAO_API_KEY || "{{native app key default or placeholder}}"; // Or retrieve from .env or elsewhere

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config, // Keep existing configuration if any, though usually you'd define it all here
    name: "YouRun",
    slug: "YouRun",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "yourun",
    userInterfaceStyle: "automatic",
    // Note: newArchEnabled is usually managed by Expo's SDK, but you can set it if explicitly needed
    // newArchEnabled: true, // This property is often handled by Expo's build process based on SDK version.

    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.zepelown.YouRun"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      [
        "expo-build-properties",
        {
          android: {
            extraMavenRepos: [
              "https://devrepo.kakao.com/nexus/content/groups/public/"
            ],
            newArchEnabled: true
          },
          ios: {
            newArchEnabled: true
          }
        }
      ],
      // Kakao Plugin Configuration
      [
        "@react-native-kakao/core",
        {
          // Using the constant here, which can be dynamically set from an environment variable
          nativeAppKey: KAKAO_NATIVE_APP_KEY,
          android: {
            // Your Android-specific Kakao settings, if any
             authCodeHandlerActivity: true
          },
          ios: {
            // Your iOS-specific Kakao settings, if any
            handleKakaoOpenUrl: true,
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    // Optional: Add extra for custom values you might want to access in your app
    // extra: {
    //   someCustomValue: "hello",
    //   eas: {
    //     projectId: "YOUR_EAS_PROJECT_ID" // If you use EAS Build and want to define project ID here
    //   }
    // }
  };
};

