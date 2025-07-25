import { fetchCurrentAvatar } from '@/api/user';
import CharacterSection from '@/components/CharacterSection';
import { useDrawer } from '@/context/DrawerContext';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import { useUserStore } from '@/stores/userStore';
import {
  getTimeBasedColors,
  getWeatherAnimationKey,
  getWeatherData,
  WeatherAnimationKey,
} from '@/utils/WeatherUtils';
import { Entypo, FontAwesome5, Fontisto } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;

// Splash screen for font loading
SplashScreen.preventAutoHideAsync();

export default function HomeScreen() {
  // Animation sources and styles
  const animationSources: Record<WeatherAnimationKey, any> = {
    rain: require('@/assets/animations/rain.json'),
    snow: require('@/assets/animations/snow.json'),
    cloud: require('@/assets/animations/cloud.json'),
    sunny: require('@/assets/animations/sunny.json'),
    moon: require('@/assets/animations/moon.json'),
  };

  const animationStyleObjects: Record<WeatherAnimationKey, object> = {
    rain: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: Platform.OS === 'android' ? 1:-1,
      pointerEvents: 'none',
    },
    snow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: Platform.OS === 'android' ? 1:-1,
      pointerEvents: 'none',
    },
    cloud: {
      position: 'absolute',
      top: 22,
      right: 15,
      width: 130,
      height: 150,
      zIndex: Platform.OS === 'android' ? 1:-1,
      pointerEvents: 'none',
    },
    sunny: {
      position: 'absolute',
      top: 50,
      left: 20,
      width: 120,
      height: 120,
      zIndex: Platform.OS === 'android' ? 1:-1,
      pointerEvents: 'none',
    },
    moon: {
      position: 'absolute',
      top: 40,
      left: 10,
      width: 140,
      height: 140,
      zIndex: Platform.OS === 'android' ? 1:-1,
      pointerEvents: 'none',
    },
  };

  // State
  const [backgroundColors, setBackgroundColors] = useState<[string, string, string]>(['#E8E4F3', '#F8F9FA', '#FFFFFF']);
  const [currentWeather, setCurrentWeather] = useState('Clear');
  const [animationKey, setAnimationKey] = useState<WeatherAnimationKey>('sunny');
  const [weatherAnimation, setWeatherAnimation] = useState(animationSources.sunny);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [averagePace, setAveragePace] = useState<number>(0);

  // Current avatar state
  const [currentAvatar, setCurrentAvatar] = useState<{
    id: string;
    name: string;
    imageUrl: string;
    glbUrl: string;
    price: number;
    gender: string;
  } | null>(null);

  const { isMenuVisible, closeMenu } = useDrawer();
  const router = useRouter();

  const updateSelectedAvatar = useUserStore(state => state.updateSelectedAvatar);

  // Font loading
  const [fontsLoaded] = useFonts({
    'Karantina-Light': require('@/assets/fonts/Karantina-Light.ttf'),
    'Karantina-Regular': require('@/assets/fonts/Karantina-Regular.ttf'),
    'Karantina-Bold': require('@/assets/fonts/Karantina-Bold.ttf'),
  });

  // Notification effect
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('알림 수신:', notification);
        Alert.alert(
          '알림 도착',
          notification.request.content.body ?? '새 알림이 도착했습니다.'
        );
      }
    );

    return () => subscription.remove();
  }, []);

  // Weather update logic
  const updateWeather = async () => {
    const { weatherMain, currentHour } = await getWeatherData();
    setBackgroundColors(getTimeBasedColors(currentHour, weatherMain));
    setCurrentWeather(weatherMain);

    const key = getWeatherAnimationKey(weatherMain, currentHour);
    setAnimationKey(key);
    setWeatherAnimation(animationSources[key]);
  };

  // User profile fetch
  const fetchUserProfile = async () => {
    try {
      const userId = await AuthAsyncStorage.getUserId();
      const response = await fetch(
        `${SERVER_API_URL}/api/user?userId=${userId}`
      );
      if (!response.ok) {
        throw new Error('네트워크 오류');
      }
      const json = await response.json();
      const { name, averagePace } = json.data;
      console.log('✅ User profile data:', json.data);
      console.log('✅ Average pace before setting:', averagePace);

      setUserName(name);
      setAveragePace(averagePace ?? 5);  // 기본값 5로 설정
      console.log('✅ Average pace after setting:', averagePace ?? 5);
    } catch (e) {
      console.error('유저 프로필 로드 실패:', e);
      setUserName('이름 없음');
      setAveragePace(5);  // 에러 시에도 기본값 5로 설정
    }
  };

  // 현재 아바타 정보 가져오기
  const loadCurrentAvatar = useCallback(async () => {
    try {
      const avatar = await fetchCurrentAvatar();
      setCurrentAvatar(avatar);
      // 전역 상태도 업데이트
      updateSelectedAvatar({
        id: Number(avatar.id),
        url: avatar.glbUrl  // glbUrl 사용
      });
    } catch (error) {
      console.error('현재 아바타 로드 실패:', error);
    }
  }, [updateSelectedAvatar]);

  // 화면에 포커스될 때마다 아바타 정보 새로 불러오기
  useFocusEffect(
    useCallback(() => {
      console.log('홈 화면 포커스 - 아바타 정보 새로 불러오기');
      loadCurrentAvatar();
    }, [loadCurrentAvatar])
  );

  // Initial data loading
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      updateWeather();
      loadCurrentAvatar();  // 초기 로딩
      fetchUserProfile();
    }
  }, [fontsLoaded, loadCurrentAvatar]);

  // Weather update interval
  useEffect(() => {
    const interval = setInterval(updateWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={backgroundColors}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.4 }}
          locations={[0, 0.7, 1]}
        >
          {/* Weather animation */}
          {weatherAnimation && (
            <LottieView
              source={weatherAnimation}
              autoPlay
              loop
              style={animationStyleObjects[animationKey]}
            />
          )}

          {/* Main content */}
          <View style={styles.content}>
            <View style={[styles.topRightMenu]}>
        <Pressable
          style={styles.menuButton}
          onPress={() => router.push('/(drawer)/myPage')}
        >
          <Fontisto name="slightly-smile" size={24} />
          <Text style={styles.menuLabel}>My</Text>
        </Pressable>

        <Pressable
          style={styles.menuButton}
          onPress={() => router.push('/(drawer)/Social')}
        >
          <FontAwesome5 name="user-friends" size={24} />
          <Text style={styles.menuLabel}>친구</Text>
        </Pressable>

        <Pressable
          style={styles.menuButton}
          onPress={() => router.push('/(drawer)/AvatarShop')}
        >
          <Entypo name="shop" size={24} />
          <Text style={styles.menuLabel}>상점</Text>
        </Pressable>
        </View>

          <CharacterSection
            userName={userName}
            averagePace={averagePace}
            selectedAvatar={currentAvatar ? {
              id: currentAvatar.id,
              url: currentAvatar.glbUrl
            } : null}
            grade='실버'
          />
        </View>

        {/* Bottom buttons */}
        {!isModalVisible && (
          <View style={styles.bottomSection}>
            {/* Run button */}
            <TouchableOpacity
              style={styles.runButton}
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.runButtonText}>달리기</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
      </SafeAreaView>

      {/* Run mode modal - SafeAreaView 바깥으로 이동 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setIsModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>{userName}님, 달려볼까요?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modeButton, styles.freeButton]}
                onPress={() => {
                  setIsModalVisible(false);
                  router.push('./(drawer)/running');
                }}
              >
                <Text style={styles.modeButtonText}>자유</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, styles.trackButton]}
                onPress={() => {
                  setIsModalVisible(false);
                  router.push('/(drawer)/selectTrack');
                }}
              >
                <Text style={styles.modeButtonText}>트랙</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    position: 'relative',  // 추가
  },
  gradientBackground: {
    flex: 1,
    paddingTop: 20,
    position: 'relative',  // 추가
  },
  content: {
    position: 'absolute',  // flex: 1 대신 absolute로 변경
    top: 20,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSection: {
    position: 'absolute',  // 추가
    bottom: 30,           // 추가
    left: 0,             // 추가
    right: 0,            // 추가
    width: '100%',
    alignItems: 'center',
  },
  runButton: {
    backgroundColor: '#5EFFAE',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  runButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 30,
    alignItems: 'center',
    height: '33%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 50,
  },
  modeButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  freeButton: {
    backgroundColor: '#FFF79A',
  },
  trackButton: {
    backgroundColor: '#FF9CF8',
  },
  modeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  topRightMenu: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },

  // 아이콘과 텍스트를 세로로 정렬
  menuButton: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft: 16,      // 버튼 간 간격
  },

  menuLabel: {
    fontSize: 12,
    marginTop: 4,        // 아이콘과 레이블 사이 여백
    color: '#000',
  },
});
