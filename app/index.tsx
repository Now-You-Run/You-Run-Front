import { fetchCurrentAvatar } from '@/api/user';
import CharacterSection from '@/components/CharacterSection';
import FloatingActionButton from '@/components/FloatingActionButton';
import { useDrawer } from '@/context/DrawerContext';
import {
    getTimeBasedColors,
    getWeatherAnimationKey,
    getWeatherData,
    WeatherAnimationKey,
} from '@/utils/WeatherUtils';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;
const MY_USER_ID = 1;

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
      zIndex: 1, // z-index를 낮춤
      pointerEvents: 'none',
    },
    snow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1, // z-index를 낮춤
      pointerEvents: 'none',
    },
    cloud: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '40%',
      zIndex: 1, // z-index를 낮춤
      pointerEvents: 'none',
    },
    sunny: {
      position: 'absolute',
      top: 50,
      left: 20,
      width: 120,
      height: 120,
      zIndex: 1, // z-index를 낮춤
      pointerEvents: 'none',
    },
    moon: {
      position: 'absolute',
      top: 40,
      left: 10,
      width: 140,
      height: 140,
      zIndex: 1, // z-index를 낮춤
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
  const fetchUserProfile = async (userId: number) => {
    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/user?userId=${MY_USER_ID}`
      );
      if (!response.ok) {
        throw new Error('네트워크 오류');
      }
      const json = await response.json();
      const { name, averagePace } = json.data;
      console.log('✅ user profile response:', json.data);

      setUserName(name);
      setAveragePace(averagePace ?? 0);
    } catch (e) {
      console.error('유저 프로필 로드 실패:', e);
      setUserName('이름 없음');
      setAveragePace(0);
    }
  };

  // Initial data loading
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      updateWeather();
      
      // 현재 아바타 정보 가져오기
      fetchCurrentAvatar()
        .then(setCurrentAvatar)
        .catch(error => {
          console.error('현재 아바타 로드 실패:', error);
          Alert.alert('오류', '아바타 로드에 실패했습니다.');
        });

      fetchUserProfile(MY_USER_ID);
    }
  }, [fontsLoaded]);

  // Weather update interval
  useEffect(() => {
    const interval = setInterval(updateWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FloatingActionButton />
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
          <CharacterSection
            userName={userName}
            averagePace={averagePace}
            selectedAvatar={currentAvatar ? {
              id: currentAvatar.id,
              url: currentAvatar.glbUrl
            } : null}
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

        {/* Run mode modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={() => {}}
            >
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
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    paddingTop: 20,
  },
  content: {
    flex: 1,
    marginTop: 40, // 20에서 40으로 변경하여 더 아래로
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 30,
    zIndex: 100, // z-index를 높여서 다른 요소들 위에 표시
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
    zIndex: 101, // z-index를 높여서 확실히 클릭 가능하도록 함
  },
  runButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
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
});
