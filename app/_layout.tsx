import CustomDrawer from '@/components/CustomDrawer'; // 사용자 정의 Drawer 컴포넌트
import { DrawerProvider, useDrawer } from '@/context/DrawerContext'; // 사용자 정의 Drawer Context
import { PaceProvider } from '@/context/PaceContext';
import { RepositoryProvider } from '@/context/RepositoryContext';
import { RunningProvider } from '@/context/RunningContext';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import { fetchUserProfile } from '@/repositories/UserRepository';
import { useUserStore } from '@/stores/userStore';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'; // React Navigation 테마
import { useFonts } from 'expo-font'; // 커스텀 폰트 로드를 위한 Expo 훅
import { SplashScreen, Stack } from "expo-router"; // Expo Router의 Stack Navigator
import { StatusBar } from 'expo-status-bar'; // Expo의 상태바 관리 컴포넌트
import React, { useEffect, useState } from 'react'; // React 컴포넌트 생성을 위해 필수
import { ActivityIndicator, useColorScheme, View } from 'react-native'; // 시스템 테마 (light/dark) 감지 훅
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isMenuVisible, closeMenu } = useDrawer();
  const [isLoading, setIsLoading] = useState(true);
  const setProfile = useUserStore((state) => state.setProfile);
  useEffect(() => {
    console.log('화면이 처음 나타났습니다!');
    AuthAsyncStorage.saveUserId(1);

  }, []);

  useEffect(() => {
    async function loadDataAndSetup() {
      try {
        // --- This is where you call the new method ---
        const userProfile = await fetchUserProfile();

        // If successful, store the data in the global state
        if (userProfile) {
          setProfile(userProfile);
        }

      } catch (e) {
        // Handle errors, e.g., redirect to a login screen if unauthorized
        console.warn('Failed to load user data:', e);
      } finally {
        // Data loading is complete (or failed), so we can hide the splash screen
        // and show the app UI.
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    }

    loadDataAndSetup();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
    <SafeAreaProvider>
      <RepositoryProvider>
        <RunningProvider>
          <DrawerProvider>
            <PaceProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <RootLayoutNav />
                <StatusBar style="auto" />
              </ThemeProvider>
            </PaceProvider>
          </DrawerProvider>
        </RunningProvider>
      </RepositoryProvider>
    </SafeAreaProvider>
  );
}
