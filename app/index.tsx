import CharacterSection from '@/components/CharacterSection';
import CustomDrawer from '@/components/CustomDrawer'; // 사용자 정의 Drawer 컴포넌트
import FloatingActionButton from '@/components/FloatingActionButton';
import ProfileIcons from '@/components/ProfileIcons';
import { useDrawer } from '@/context/DrawerContext';
import {
  getTimeBasedColors,
  getWeatherAnimationKey,
  getWeatherData,
  WeatherAnimationKey
} from '@/utils/WeatherUtils';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Splash screen for font loading
SplashScreen.preventAutoHideAsync();

export default function HomeScreen() {
  // Animation sources and styles (could be imported from WeatherUtils for even more DRYness)
  const animationSources: Record<WeatherAnimationKey, any> = {
    rain: require('@/assets/animations/rain.json'),
    snow: require('@/assets/animations/snow.json'),
    cloud: require('@/assets/animations/cloud.json'),
    sunny: require('@/assets/animations/sunny.json'),
    moon: require('@/assets/animations/moon.json'),
  };

  const animationStyleObjects: Record<WeatherAnimationKey, object> = {
    rain: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none' },
    snow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none' },
    cloud: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', zIndex: 5, pointerEvents: 'none' },
    sunny: { position: 'absolute', top: 50, left: 20, width: 120, height: 120, zIndex: 5, pointerEvents: 'none' },
    moon: { position: 'absolute', top: 40, left: 10, width: 140, height: 140, zIndex: 5, pointerEvents: 'none' },
  };

  // State
  const [backgroundColors, setBackgroundColors] = useState<[string, string, string]>(['#E8E4F3', '#F8F9FA', '#FFFFFF']);
  const [currentWeather, setCurrentWeather] = useState('Clear');
  const [animationKey, setAnimationKey] = useState<WeatherAnimationKey>('sunny');
  const [weatherAnimation, setWeatherAnimation] = useState(animationSources.sunny);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userName] = useState('나롱이');

  const { isMenuVisible, closeMenu } = useDrawer();

  const router = useRouter();

  // Font loading
  const [fontsLoaded] = useFonts({
    'Karantina-Light': require('@/assets/fonts/Karantina-Light.ttf'),
    'Karantina-Regular': require('@/assets/fonts/Karantina-Regular.ttf'),
    'Karantina-Bold': require('@/assets/fonts/Karantina-Bold.ttf'),
  });

  // Weather update logic
  const updateWeather = async () => {
    const { weatherMain, currentHour } = await getWeatherData();
    setBackgroundColors(getTimeBasedColors(currentHour, weatherMain));
    setCurrentWeather(weatherMain);

    const key = getWeatherAnimationKey(weatherMain, currentHour);
    setAnimationKey(key);
    setWeatherAnimation(animationSources[key]);
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      updateWeather();
    }
  }, [fontsLoaded]);

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

        {/* Weather info (debug) */}
        <View style={styles.weatherInfo}>
          <Text style={styles.weatherText}>현재 날씨: {currentWeather}</Text>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <ProfileIcons />
          <CharacterSection userName={userName} />
        </View>

        {/* Run button */}
        {!isModalVisible && (
          <View style={styles.bottomSection}>
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
              onPress={() => { }}
            >
              <Text style={styles.modalText}>{userName}님, 달려볼까요?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modeButton, styles.freeButton]}
                  onPress={() => {
                    setIsModalVisible(false);
                    router.push('./(drawer)/Running');
                  }}
                >
                  <Text style={styles.modeButtonText}>자유</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, styles.trackButton]}
                  onPress={() => {
                    setIsModalVisible(false);
                    router.push('/(drawer)/SelectTrack');
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
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
  },
  weatherInfo: {
    position: 'absolute',
    top: 100,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 5,
    zIndex: 15,
  },
  weatherText: {
    color: 'white',
    fontSize: 12,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  runButton: {
    backgroundColor: '#5EFFAE',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
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
