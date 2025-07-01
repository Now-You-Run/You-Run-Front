import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Image, Modal } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import FloatingActionButton from '@/components/FloatingActionButton';
import { useRouter } from 'expo-router';

// 스플래시 화면 유지(폰트깨짐 방지)
SplashScreen.preventAutoHideAsync();

export default function HomeScreen() {
  const [backgroundColors, setBackgroundColors] = useState(['#E8E4F3', '#FFFFFF']);
  const [isRaining, setIsRaining] = useState(false); // 비 애니메이션 제어
  const [currentWeather, setCurrentWeather] = useState('Clear'); // 현재 날씨 상태
  const [weatherAnimation, setWeatherAnimation] = useState(null); // 날씨 애니메이션
  const [animationStyle, setAnimationStyle] = useState('weatherAnimationOverlay'); // 애니메이션 스타일
  const [isModalVisible, setIsModalVisible] = useState(false); // 모달 상태
  const [userName] = useState('나롱이'); // 사용자 이름 (나중에 DB에서 가져올 예정)

  const router = useRouter();

  // 폰트 로드
  const [fontsLoaded] = useFonts({
    'Karantina-Light': require('@/assets/fonts/Karantina-Light.ttf'),
    'Karantina-Regular': require('@/assets/fonts/Karantina-Regular.ttf'),
    'Karantina-Bold': require('@/assets/fonts/Karantina-Bold.ttf'),
  });

  // 시간대별 배경색 결정 (색깔과 흰색을 더 뚜렷하게 구분)
  const getTimeBasedColors = (hour, weather) => {
    let topColor = '#E6F3FF'; // 기본값: 연한 하늘색
    
    // 날씨별 조정
    if (weather === 'Rain' || weather === 'Drizzle') {
      topColor = '#B0B8C4'; // 비 - 연한 회색
    } else if (weather === 'Snow') {
      topColor = '#F0F4F8'; // 눈 - 아주 밝은 회색
    } else if (weather === 'Clouds') {
      topColor = '#D1D9E0'; // 흐림 - 연한 회색
    } else {
      // 맑은 날씨 기준 시간대별
      if (hour >= 5 && hour < 8) {
        // 새벽 - 은은한 일출 (연한 분홍빛)
        topColor = '#FFE4E6'; // 연한 분홍 (은은한 일출)
      } else if (hour >= 8 && hour < 17) {
        // 낮 - 연한 하늘색
        topColor = '#E6F3FF'; // 연한 하늘색
      } else if (hour >= 17 && hour < 19) {
        // 저녁 - 은은한 노을 (연한 주황)
        topColor = '#FFF0E6'; // 연한 피치색 (은은한 노을)
      } else {
        // 밤 (19-4시) - 연한 어두운 파란색
        topColor = '#E8E4F3'; // 연한 보라빛 파랑
      }
    }
    
    // 3색 그라디언트로 더 뚜렷한 구분
    return [topColor, '#F8F9FA', '#FFFFFF']; // 위쪽 색상 → 중간 색상 → 흰색
  };

  // 날씨와 시간에 따른 애니메이션 결정
  const getWeatherAnimation = (weather, hour) => {
    // 비/소나기/천둥번개는 항상 비 애니메이션 (전체 화면)
    if (weather === 'Rain' || weather === 'Drizzle' || weather === 'Thunderstorm') {
      setAnimationStyle('weatherAnimationOverlay');
      return require('@/assets/animations/rain.json');
    }
    
    // 눈은 항상 눈 애니메이션 (전체 화면)
    if (weather === 'Snow') {
      setAnimationStyle('weatherAnimationOverlay');
      return require('@/assets/animations/snow.json');
    }
    
    // 흐림/안개는 항상 구름 애니메이션 (상단에만)
    if (weather === 'Clouds' || weather === 'Fog') {
      setAnimationStyle('cloudAnimationTop');
      return require('@/assets/animations/cloud.json');
    }
    
    // 맑음일 때 시간에 따라 (전체 화면)
    if (weather === 'Clear') {
      setAnimationStyle('weatherAnimationOverlay');
      if (hour >= 6 && hour < 19) {
        // 낮 시간 (6-19시): 태양
        return require('@/assets/animations/sunny.json');
      } else {
        // 밤 시간 (19-6시): 달
        return require('@/assets/animations/moon.json');
      }
    }
    
    // 기본값: 태양
    setAnimationStyle('weatherAnimationOverlay');
    return require('@/assets/animations/sunny.json');
  };

  // OpenMeteo 날씨 코드를 일반적인 날씨로 변환
  const getWeatherFromCode = (code) => {
    if (code === 0) return 'Clear'; // 맑음
    if (code >= 1 && code <= 3) return 'Clouds'; // 흐림
    if (code >= 45 && code <= 48) return 'Fog'; // 안개
    if (code >= 51 && code <= 67) return 'Rain'; // 비
    if (code >= 71 && code <= 77) return 'Snow'; // 눈
    if (code >= 80 && code <= 82) return 'Rain'; // 소나기
    if (code >= 85 && code <= 86) return 'Snow'; // 눈 소나기
    if (code >= 95 && code <= 99) return 'Thunderstorm'; // 천둥번개
    return 'Clear';
  };

  // 위치 및 날씨 정보 가져오기 (OpenMeteo 사용)
  const getWeatherData = async () => {
    try {
      // 위치 권한 요청
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('위치 권한이 거부되었습니다');
        // 맑음과 동일하게 처리
        const currentHour = new Date().getHours();
        setBackgroundColors(getTimeBasedColors(currentHour, 'Clear'));
        setCurrentWeather('Clear');
        setWeatherAnimation(getWeatherAnimation('Clear', currentHour));
        setIsRaining(false);
        return;
      }

      // 현재 위치 가져오기
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // OpenMeteo API 호출 (무료, API 키 불필요)
      const weather_url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      
      const response = await fetch(weather_url);
      const data = await response.json();
      
      // 현재 시간
      const currentHour = new Date().getHours();
      
      // OpenMeteo 날씨 코드를 일반적인 형태로 변환
      const weatherCode = data.current_weather.weathercode;
      const weatherMain = getWeatherFromCode(weatherCode);
      
      // 배경색 설정
      setBackgroundColors(getTimeBasedColors(currentHour, weatherMain));
      setCurrentWeather(weatherMain);
      
      // 날씨 애니메이션 설정
      setWeatherAnimation(getWeatherAnimation(weatherMain, currentHour));
      
      // 비가 오는지 확인하여 비 애니메이션 제어
      if (weatherMain === 'Rain' || weatherMain === 'Drizzle' || weatherMain === 'Thunderstorm') {
        setIsRaining(true);
      } else {
        setIsRaining(false);
      }
      
    } catch (error) {
      console.log('날씨 정보를 가져올 수 없습니다:', error);
      // 맑음과 동일하게 처리 (시간대별 배경 + 애니메이션)
      const currentHour = new Date().getHours();
      setBackgroundColors(getTimeBasedColors(currentHour, 'Clear'));
      setCurrentWeather('Clear');
      setWeatherAnimation(getWeatherAnimation('Clear', currentHour));
      setIsRaining(false);
    }
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      getWeatherData(); // 날씨 정보 가져오기
    }
  }, [fontsLoaded]);

  // 30분마다 날씨 업데이트
  useEffect(() => {
    const interval = setInterval(getWeatherData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!fontsLoaded) {
    return null; // 폰트 로딩 중일 때 빈 화면
  }

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
        {/* 날씨 애니메이션 효과 */}
        {weatherAnimation && (
          <LottieView
            source={weatherAnimation}
            autoPlay
            loop
            style={styles[animationStyle]}
          />
        )}

        {/* 현재 날씨 표시 (디버깅용) */}
        <View style={styles.weatherInfo}>
          <Text style={styles.weatherText}>현재 날씨: {currentWeather}</Text>
        </View>

        {/* 메인 콘텐츠 */}
        <View style={styles.content}>
          {/* 상단 프로필 영역 */}
          <View style={styles.topSection}>
            <View style={styles.profileIcons}>
              <TouchableOpacity style={styles.iconButton}>
                <Image 
                  source={require('@/assets/images/profile-icon.png')} 
                  style={styles.iconImage}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Image 
                  source={require('@/assets/images/settings-icon.png')} 
                  style={styles.iconImage}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* 중앙 캐릭터 영역 */}
          <View style={styles.characterSection}>
            <View style={styles.nameContainer}>
              <Image 
                source={require('@/assets/images/diamond.png')} 
                style={styles.diamondIcon}
              />
              <Text style={styles.characterName}> {userName} </Text>
            </View>
            {/* 3D 캐릭터 */}
            <View style={styles.characterContainer}>
              <View style={styles.paceContainer}>
                <Text style={styles.paceText}>6'00"</Text>
              </View>
              <Image 
                source={require('@/assets/images/character.png')} 
                style={styles.characterImage}
              />
            </View>
          </View>
        </View>

        {/* 하단 달리기 버튼 - 항상 고정 위치 */}
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

        {/* 달리기 모드 선택 모달 */}
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
                    router.push('/(drawer)/running');
                  }}
                >
                  <Text style={styles.modeButtonText}>자유</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modeButton, styles.trackButton]}
                  onPress={() => {
                    setIsModalVisible(false);
                    console.log('트랙 모드 선택');
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
  // 날씨 애니메이션 스타일 (전체 화면)
  weatherAnimationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    pointerEvents: 'none',
  },
  // 구름 애니메이션 스타일 (상단만)
  cloudAnimationTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    zIndex: 5,
    pointerEvents: 'none',
  },
  // 날씨 정보 표시 (디버깅용)
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
  topSection: {
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingRight: 10,
  },
  profileIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    width: 30,
    height: 30,
    backgroundColor: 'none',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 15,
  },
  iconImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  characterSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10, // 50에서 20으로 줄여서 위쪽으로 이동
    marginTop: -120, // 위쪽으로 더 이동
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  characterName: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  diamondIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  characterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceContainer: {
    position: 'absolute',
    zIndex: 1,
    right: -35,
    top: 55,
  },
  paceText: {
    fontSize: 150,
    fontWeight: 'bold',
    fontFamily: 'Karantina-Regular',
    color: 'rgba(22, 22, 22, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: {width: 2, height: 9 },
    textShadowRadius: 5,
    transform: [{ scaleY: 1.3}],
  },
  characterImage: {
    width: 350,
    height: 450,
    resizeMode: 'contain',
    zIndex: 2,
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
    justifyContent:'center',
    alignItems:'center',
  },
  runButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // 모달 스타일들
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