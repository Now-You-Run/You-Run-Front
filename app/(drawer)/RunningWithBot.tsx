import { Section, useSectionAnnouncements } from '@/app/hooks/useSectionAnnouncements';
import { useRunning } from '@/context/RunningContext';
import { loadBotPace, loadLastTrack } from '@/storage/appStorage';
import { loadPaths } from '@/storage/RunningStorage';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import Running3DModel from '../dummy/Running3DModel'; // 3D 모델 컴포넌트 임포트

import { Alert } from 'react-native';

// km/h = 60 / (pace_minutes + pace_seconds / 60)
function paceToKmh(minutes: number, seconds: number): number {
  const totalMinutes = minutes + seconds / 60;
  return totalMinutes === 0 ? 0 : 60 / totalMinutes;
}

// 두 GPS 좌표 간 거리 (km) 계산
const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 총 이동 거리 계산 (km)
const calculateTotalDistance = (
  path: { latitude: number; longitude: number }[]
) => {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineDistance(
      path[i - 1].latitude,
      path[i - 1].longitude,
      path[i].latitude,
      path[i].longitude
    );
  }
  return total;
};

/** 현재 속도(km/h) → 순간 페이스 문자열 (mm′ss″) */
function calculateInstantPace(speedKmh: number): string {
  if (speedKmh <= 0) return `0'00"`;
  const secPerKm = 3600 / speedKmh;           // 1km 당 걸리는 초
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2,'0')}"`;
}

// 평균 페이스 계산 (1km당 시간)
const calculatePace = (distanceKm: number, elapsedSeconds: number): string => {
  if (!distanceKm || !elapsedSeconds) return '0\'00"';
  const pace = elapsedSeconds / distanceKm;
  const min = Math.floor(pace / 60);
  const sec = Math.round(pace % 60);
  return `${min}'${String(sec).padStart(2, '0')}"`;
};

// 초를 MM:SS 형식으로 변환
const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// 경로 부드럽게 smoothing (옵션)
function smoothPath(
  path: { latitude: number; longitude: number }[],
  windowSize: number = 5
) {
  if (path.length < windowSize) return path;

  const smoothed: { latitude: number; longitude: number }[] = [];

  for (let i = 0; i < path.length; i++) {
    let latSum = 0;
    let lonSum = 0;
    let count = 0;
    for (
      let j = Math.max(0, i - Math.floor(windowSize / 2));
      j <= Math.min(path.length - 1, i + Math.floor(windowSize / 2));
      j++
    ) {
      latSum += path[j].latitude;
      lonSum += path[j].longitude;
      count++;
    }
    smoothed.push({
      latitude: latSum / count,
      longitude: lonSum / count,
    });
  }

  return smoothed;
}

export default function RunningScreen() {

  // 1) AsyncStorage에 저장된 마지막 트랙 요약과 봇 페이스 불러오기
  const [summary, setSummary]     = useState<{ distanceMeters: number; durationSec: number } | null>(null);
  const [storedPace, setStoredPace] = useState<{ minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    (async () => {
      setSummary(   await loadLastTrack()   );
      setStoredPace(await loadBotPace()     );
    })();
  }, []);

  const router = useRouter();
  const handleBackPress = () => {
    router.back();
  };
  const { trackId, avgPaceMinutes, avgPaceSeconds } = useLocalSearchParams<{
    trackId?: string;
    avgPaceMinutes?: string;
    avgPaceSeconds?: string;
  }>();

  const botPace = useMemo(() => {
    if (avgPaceMinutes && avgPaceSeconds) {
      return {
        minutes: parseInt(avgPaceMinutes, 10),
        seconds: parseInt(avgPaceSeconds, 10),
      };
    }
    return { minutes: 0, seconds: 0 };
  }, [avgPaceMinutes, avgPaceSeconds]);

  const [externalPath, setExternalPath] = useState<
    { latitude: number; longitude: number }[] | null
  >(null);
  const [heading, setHeading] = useState(0);
  const { isActive, elapsedTime, path, currentSpeed , startRunning, stopRunning, addToPath } =
    useRunning();
  const [origin, setOrigin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | undefined>();

  const liveDistanceKm = useMemo(() => calculateTotalDistance(path), [path]);

  // 2) 저장된 전체 거리의 20%, 80% 지점으로 구간 정의 (meters 단위)
  const sections: Section[] = summary ? [
       { name: '본격 구간', endMeters: summary.distanceMeters * 0.2 },
       { name: '마무리 구간', endMeters: summary.distanceMeters * 0.8 },
     ]: [];

  // // 3) 100m마다 기본 안내, 구간 경계마다 구간명 안내
  // useSectionAnnouncements(
  //   liveDistanceKm * 1000,  // km → m 단위 실시간 거리
  //   sections,               // 위에서 만든 구간 배열
  //   100                     // 100m 간격 안내
  // );

  // 1) 초/km 로 환산한 순간 페이스
  const currentPaceSec = currentSpeed > 0 ? 3600 / currentSpeed : undefined;
  // 2) 목표 페이스 객체 (분/초)
  const target = storedPace ?? botPace;

  useSectionAnnouncements(
    liveDistanceKm * 1000,  // km → m
    sections,
    100,                    // 100m 간격 안내
    target,                 // 목표 페이스 { minutes, seconds }
    currentPaceSec          // 현재 페이스 (초/km)
  );


  // 순간 페이스
  const instantPace = useMemo(
    () => calculateInstantPace(currentSpeed),
    [currentSpeed]
  );

  // Bot 러닝 위치 상태
  const [botPosition, setBotPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 속도 계산 (m/s)
  const speedKmh = paceToKmh(botPace.minutes, botPace.seconds);
  const speedMps = speedKmh / 3.6;

  // 애니메이션 상태 refs
  const animationRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  // 자동 경로 이동 함수
  const startBotRunning = () => {
    if (!externalPath || externalPath.length < 2) {
      Alert.alert('경로가 충분하지 않습니다.');
      return;
    }

    indexRef.current = 0;
    lastTimeRef.current = null;

    const step = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const elapsed = (timestamp - lastTimeRef.current) / 1000; // 초
      lastTimeRef.current = timestamp;

      const nextIndex = indexRef.current + 1;
      if (nextIndex >= externalPath.length) {
        cancelAnimationFrame(animationRef.current!);
        animationRef.current = null;
        return;
      }

      const current = externalPath[indexRef.current];
      const next = externalPath[nextIndex];

      const distance =
        haversineDistance(
          current.latitude,
          current.longitude,
          next.latitude,
          next.longitude
        ) * 1000; // m

      const travel = speedMps * elapsed;

      if (travel >= distance) {
        indexRef.current = nextIndex;
        setBotPosition(next);
      } else {
        const ratio = travel / distance;
        setBotPosition({
          latitude:
            current.latitude + (next.latitude - current.latitude) * ratio,
          longitude:
            current.longitude + (next.longitude - current.longitude) * ratio,
        });
      }

      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
  };

  // 시작 버튼 누르면 botRunning 시작 (기존 startRunning 대체)
  const handleStart = () => {
    Speech.speak('러닝을 시작합니다. 웜업구간입니다. 속도를 천천히 올려주세요');
    startRunning();
    startBotRunning();
  };

  // 러닝 종료 처리
  const handleStopRunning = async () => {
    Speech.speak('러닝을 종료합니다.');
    stopRunning();
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // summary에 필요한 최소 데이터
    const summaryData = {
      path: externalPath ?? path,
      totalDistance: liveDistanceKm,  // km
      elapsedTime,                    // sec
    };

    router.replace({
      pathname: '/summary',
      params: { data: JSON.stringify(summaryData) },
    });

  };

  // 트랙 아이디에 따라 경로 불러오기
  useEffect(() => {
    if (!trackId) return;

    (async () => {
      try {
        const savedTracks = await loadPaths();
        const track = savedTracks.find((t) => t.id === trackId);
        if (track) {
          setExternalPath(track.path);
          setOrigin(track.path[0]);
          setMapRegion({
            latitude: track.path[0].latitude,
            longitude: track.path[0].longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
        }
      } catch (e) {
        console.warn('트랙 로드 실패:', e);
      }
    })();
  }, [trackId]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('위치 권한이 거부되었습니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setOrigin({ latitude, longitude });
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    })();
  }, []);

  useEffect(() => {
    if (path.length > 0) {
      const latest = path[path.length - 1];
      setMapRegion({
        latitude: latest.latitude,
        longitude: latest.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [path]);
  if (!origin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>위치를 가져오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ✅ 뒤로가기 버튼 */}
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 20,
          zIndex: 10,
          backgroundColor: 'rgba(255,255,255,0.8)',
          borderRadius: 20,
        }}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        region={mapRegion}
        zoomEnabled
        scrollEnabled
        rotateEnabled
        pitchEnabled
        showsUserLocation
      >
        {externalPath && (
          <Polyline
            coordinates={externalPath}
            strokeColor="rgba(255, 0, 0, 0.5)"
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        )}

        <Polyline
          coordinates={smoothPath(path, 5)}
          strokeColor="#007aff"
          strokeWidth={5}
        />
        {botPosition && (
          <Marker coordinate={botPosition} anchor={{ x: 0.5, y: 0.5 }} flat>
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 20,
                borderRightWidth: 20,
                borderBottomWidth: 30,
                borderStyle: 'solid',
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: 'rgba(0, 122, 255, 0.6)',
                transform: [{ rotate: `0rad` }],
              }}
            />
          </Marker>
        )}
      </MapView>

      {origin && (
        <Running3DModel
          path={externalPath ?? path}
          origin={origin}
          heading={heading}
          botPosition={botPosition}
        />
      )}

      <View style={styles.overlay}>
        <Text style={styles.distance}>{liveDistanceKm.toFixed(2)} km</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>{currentSpeed.toFixed(1)} km/h</Text>
          <Text style={styles.stat}>{formatTime(elapsedTime)} 분:초</Text>
          <Text style={styles.stat}>{instantPace} 페이스</Text>
        </View>
        <Pressable
          onPress={!botPosition ? handleStart : handleStopRunning} // 시작/종료 토글
          style={({ pressed }) => [
            styles.runButton,
            { backgroundColor: !botPosition ? '#007aff' : '#ff4d4d' },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.runButtonText}>
            {!botPosition ? '시작' : '정지'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  distance: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  runButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 5,
  },
  runButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
