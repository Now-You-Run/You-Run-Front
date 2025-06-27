import CustomDrawer from '@/components/CustomDrawer'; // 사용자 정의 Drawer 컴포넌트
import { DrawerProvider, useDrawer } from '@/context/DrawerContext'; // 사용자 정의 Drawer Context
import { initializeKakaoSDK } from "@react-native-kakao/core";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'; // React Navigation 테마
import { useFonts } from 'expo-font'; // 커스텀 폰트 로드를 위한 Expo 훅
import { Stack } from "expo-router"; // Expo Router의 Stack Navigator
import { StatusBar } from 'expo-status-bar'; // Expo의 상태바 관리 컴포넌트
import React, { useEffect } from 'react'; // React 컴포넌트 생성을 위해 필수
import { useColorScheme } from 'react-native'; // 시스템 테마 (light/dark) 감지 훅



function RootLayoutNav() {
  const { isMenuVisible, closeMenu } = useDrawer();
  const kakaoNativeAppKey = process.env.EXPO_PUBLIC_NATIVE_APP_KEY || "";
  useEffect(() => {
	  initializeKakaoSDK(kakaoNativeAppKey);
  }, []);

  return (
    <>
      {/* screenOptions를 사용하여 모든 스크린의 헤더를 숨깁니다. */}
      <Stack screenOptions={{ headerShown: false }}>
        
      </Stack>
      {isMenuVisible && <CustomDrawer closeMenu={closeMenu} />}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
      <DrawerProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootLayoutNav />
          <StatusBar style="auto" />
        </ThemeProvider>
      </DrawerProvider>
  );
}
