import { fetchCurrentAvatar } from '@/api/user';
import CustomDrawer from '@/components/CustomDrawer';
import { DrawerProvider, useDrawer } from '@/context/DrawerContext';
import { PaceProvider } from '@/context/PaceContext';
import { RepositoryProvider } from '@/context/RepositoryContext';
import { RunningProvider } from '@/context/RunningContext';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import { fetchUserProfile } from '@/repositories/UserRepository';
import { useUserStore } from '@/stores/userStore';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

// ✅ Safe Area가 적용된 컨테이너 컴포넌트
function SafeAreaContainer({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.safeContainer,
      {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }
    ]}>
      {children}
    </View>
  );
}

function RootLayoutNav() {
  const { isMenuVisible, closeMenu } = useDrawer();
  const [isLoading, setIsLoading] = useState(true);
  const setProfile = useUserStore((state) => state.setProfile);
  const updateSelectedAvatar = useUserStore((state) => state.updateSelectedAvatar);

  useEffect(() => {
    console.log('화면이 처음 나타났습니다!');
    AuthAsyncStorage.saveUserId(1);
  }, []);

  useEffect(() => {
    async function loadDataAndSetup() {
      try {
        const [userProfile, currentAvatar] = await Promise.all([
          fetchUserProfile(),
          fetchCurrentAvatar()
        ]);

        if (userProfile) {
          setProfile(userProfile);
        }

        if (currentAvatar) {
          updateSelectedAvatar({
            id: Number(currentAvatar.id),  // 문자열을 숫자로 변환
            url: currentAvatar.imageUrl
          });
        }
      } catch (e) {
        console.warn('Failed to load user data:', e);
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    }

    loadDataAndSetup();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 모든 스크린이 여기에 렌더링됩니다 */}
      </Stack>
      {isMenuVisible && <CustomDrawer closeMenu={closeMenu} />}
    </SafeAreaContainer>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Karantina-Bold': require('../assets/fonts/Karantina-Bold.ttf'),
    'Karantina-Regular': require('../assets/fonts/Karantina-Regular.ttf'),
    'Karantina-Light': require('../assets/fonts/Karantina-Light.ttf'),
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

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#fff', // 필요에 따라 배경색 조정
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
