// WeatherUtils.ts
import * as Location from 'expo-location';

// 1. 타입 정의
export type WeatherAnimationKey = 'rain' | 'snow' | 'cloud' | 'sunny' | 'moon';

// 2. 애니메이션 리소스 객체
export const animationSources: Record<WeatherAnimationKey, any> = {
  rain: require('@/assets/animations/rain.json'),
  snow: require('@/assets/animations/snow.json'),
  cloud: require('@/assets/animations/cloud.json'),
  sunny: require('@/assets/animations/sunny.json'),
  moon: require('@/assets/animations/moon.json'),
};

// 3. 애니메이션 스타일 객체
export const animationStyleObjects: Record<WeatherAnimationKey, object> = {
  rain: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
  },
  snow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
  },
  cloud: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
  },
  sunny: {
    position: 'absolute',
    top: 50, left: 20, width: 120, height: 120,
    pointerEvents: 'none',
  },
  moon: {
    position: 'absolute',
    top: 40, left: 10, width: 140, height: 140,
    pointerEvents: 'none',
  },
};

// 4. 시간대별 배경색 결정
export const getTimeBasedColors = (hour: number, weather: string): [string, string, string]  => {
  let topColor = '#E6F3FF';
  if (weather === 'Rain' || weather === 'Drizzle') {
    topColor = '#B0B8C4';
  } else if (weather === 'Snow') {
    topColor = '#F0F4F8';
  } else if (weather === 'Clouds') {
    topColor = '#D1D9E0';
  } else {
    if (hour >= 5 && hour < 8) {
      topColor = '#FFE4E6';
    } else if (hour >= 8 && hour < 17) {
      topColor = '#B3DAFF';
    } else if (hour >= 17 && hour < 19) {
      topColor = '#FFF0E6';
    } else {
      topColor = '#8C7CD9';
    }
  }
  return [topColor, '#F8F9FA', '#FFFFFF'];
};

// 5. 날씨와 시간에 따른 애니메이션 종류 결정 (key 반환)
export const getWeatherAnimationKey = (weather: string, hour: number): WeatherAnimationKey => {
  if (weather === 'Rain' || weather === 'Drizzle' || weather === 'Thunderstorm') return 'rain';
  if (weather === 'Snow') return 'snow';
  if (weather === 'Clouds' || weather === 'Fog') return 'cloud';
  if (weather === 'Clear') {
    if (hour >= 6 && hour < 19) return 'sunny';
    else return 'moon';
  }
  return 'sunny';
};

// 6. OpenMeteo 날씨 코드를 일반적인 날씨로 변환
export const getWeatherFromCode = (code: number): string => {
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Clouds';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain';
  if (code >= 85 && code <= 86) return 'Snow';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Clear';
};

// 7. 위치 및 날씨 정보 가져오기 (OpenMeteo 사용)
export const getWeatherData = async () => {
  let weatherMain = 'Clear';
  let latitude = 37.5665;
  let longitude = 126.9780;
  let error: any = null;

  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission denied');
    let location = await Location.getCurrentPositionAsync({});
    latitude = location.coords.latitude;
    longitude = location.coords.longitude;
    const weather_url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const response = await fetch(weather_url);
    const data = await response.json();
    const weatherCode = data.current_weather.weathercode;
    weatherMain = getWeatherFromCode(weatherCode);
  } catch (e) {
    error = e;
    weatherMain = 'Clear';
  }
  const currentHour = new Date().getHours();
  return { weatherMain, currentHour, latitude, longitude, error };
};
