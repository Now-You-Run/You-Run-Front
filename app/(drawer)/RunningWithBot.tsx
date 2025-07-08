import { useRunning } from '@/context/RunningContext';
import { Section, useSectionAnnouncements } from '@/hooks/useSectionAnnouncements';
import { loadTrackInfo, TrackInfo } from '@/repositories/appStorage';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Image, Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker, Polyline, Region } from 'react-native-maps';
import type { Coordinate } from '../../types/LocalTrackDto';
import { createPathTools } from '../../utils/PathTools';

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
  return `${m}'${String(s).padStart(2, '0')}"`;
}

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

  const router = useRouter();
  const handleBackPress = () => {
    router.back();
  };
  const { trackId, botMin, botSec } = useLocalSearchParams<{
    trackId?: string;
    botMin?: string;
    botSec?: string;
  }>();

  const mapRef = useRef<MapView>(null);

  // 경로이탈을 위한 컴포넌트
  const OFFCOURSE_THRESHOLD_M = 20;   // 코스 이탈 기준 거리 (10m)
  const offCourseRef = useRef(false); // 안내 중복 방지 
  const forfeitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pausedPositionRef = useRef<Coordinate | null>(null);

  // 1) AsyncStorage에서 저장해둔 TrackInfo 불러오기
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  useEffect(() => {
    if (trackId) {
      loadTrackInfo(trackId).then(info => {
        setTrackInfo(info);
      });
    }
  }, [trackId]);

  // 2) 불러온 trackInfo로 외부 경로, 시작점, 지도 영역 설정
  const [externalPath, setExternalPath] = useState<Coordinate[] | null>(null);
  const [origin, setOrigin] = useState<Coordinate | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>();
  useEffect(() => {
    if (trackInfo) {
      setExternalPath(trackInfo.path);
      setOrigin(trackInfo.origin);
      setMapRegion({
        latitude: trackInfo.origin.latitude,
        longitude: trackInfo.origin.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [trackInfo]);

  // 3) 봇 페이스 계산
  const botPace = useMemo(() => ({
    minutes: botMin ? parseInt(botMin, 10) : 0,
    seconds: botSec ? parseInt(botSec, 10) : 0,
  }), [botMin, botSec]);

  // // 4) 총 거리 (meters)
  // const trackDistanceMeters = trackInfo?.distanceMeters ?? 0;

  // RunningContext
  const {
    isActive,
    elapsedTime,
    path,
    currentSpeed,
    startRunning,
    pauseRunning,
    resumeRunning,
    stopRunning,
    resetRunning,
    userLocation,
  } = useRunning();

  // 실시간 통계(거리, 페이스)
  const liveDistanceKm = useMemo(() => calculateTotalDistance(path), [path]);
  const instantPace = useMemo(() => calculateInstantPace(currentSpeed), [currentSpeed]);
  // 초/km 로 환산한 순간 페이스
  const currentPaceSec = currentSpeed > 0 ? 3600 / currentSpeed : undefined;

  // 저장된 전체 거리의 20%, 80% 지점으로 구간 정의 (meters 단위)
  const sections: Section[] = trackInfo ? [
    { name: '본격 구간', endMeters: trackInfo.distanceMeters * 0.2 },
    { name: '마무리 구간', endMeters: trackInfo.distanceMeters * 0.8 },
  ] : [];

  // 시뮬레이션 상태 & position
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null);
  const [startCoursePosition, setStartCoursePosition] = useState<Coordinate | null>(null);
  const [endCoursePosition, setEndCoursePosition] = useState<Coordinate | null>(null);
  const animationFrameId = useRef<number | null>(null);
  
  // 봇(currentPosition)↔사용자(path 마지막) 거리 (km)
  const botDistanceKm = useMemo(() => {
    if (!currentPosition || path.length === 0) return 0;
    const userPos = path[path.length - 1];
    return haversineDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      userPos.latitude,
      userPos.longitude
    );
  }, [currentPosition, path]);

  useSectionAnnouncements(
    liveDistanceKm * 1000,  // km → m
    sections,
    100,                    // 100m 간격 안내
    botPace,                // 목표 페이스 { minutes, seconds }
    currentPaceSec,         // 현재 페이스 (초/km)
    botDistanceKm * 1000    // 봇과의 거리(m)
  );



  useEffect(() => {
    if (externalPath && externalPath.length > 0) {
      setStartCoursePosition(externalPath[0]);
      setEndCoursePosition(externalPath[externalPath.length - 1]);
      setCurrentPosition(externalPath[0])
    }
  }, [externalPath]);


  // simulation useEffect
  useEffect(() => {
    if (!externalPath || externalPath.length === 0) return;
    if (!isSimulating) return;

    const pausedCoord = pausedPositionRef.current;

     // ← 추가된 부분: 어디서부터 시작할지 정하기
    // pausedPositionRef.current 가 있으면, 그 위치에 가장 가까운 인덱스를 찾아 경로를 잘라냅니다.
    let startIndex = 0;
    if (pausedCoord) {
    let minD = Infinity;
    externalPath.forEach((p, i) => {
      const d = haversineDistance(
        p.latitude, p.longitude,
        pausedCoord.latitude, pausedCoord.longitude
      ) * 1000;
      if (d < minD) {
        minD = d;
        startIndex = i;
      }
    });
  }

    const simPath = externalPath.slice(startIndex);
    
    const tools = createPathTools(simPath);
    const speedMps = paceToKmh(botPace.minutes, botPace.seconds) / 3.6; // m/s

    // 3) 이 시점에만 pausedCoord 사용
    setCurrentPosition(pausedCoord ?? simPath[0]);
    pausedPositionRef.current = null;  
    
    let startTime: number | null = null;
    animationFrameId.current = requestAnimationFrame(function animate(ts) {
      if (!startTime) startTime = ts;
      const elapsedSec = (ts - startTime) / 1000;
      const dist = elapsedSec * speedMps;

      if (dist >= tools.totalDistance) {
        // ② 끝 지점에서 한번 더 설정
        setCurrentPosition(tools.getCoordinateAt(tools.totalDistance));
        // ③ 남아있는 애니메이션 프레임 취소
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }
        return;
      }
      setCurrentPosition(tools.getCoordinateAt(dist));
      animationFrameId.current = requestAnimationFrame(animate);
    });

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [externalPath, botPace, isSimulating]);


  // 실제 사용자가 달리는 경로(path)와 설계된 코스(externalPath)를 비교해서
  // 이탈 여부를 음성으로 안내합니다.
  useEffect(() => {
    if (!externalPath?.length || !userLocation) return;

    // 최신 사용자 위치
    const userPos = userLocation;
    // 코스 상의 모든 점과의 최소 거리 계산
    let minDistM = Infinity;
    for (const p of externalPath) {
      const dKm = haversineDistance(
        p.latitude, p.longitude,
        userPos.latitude, userPos.longitude
      );
      minDistM = Math.min(minDistM, dKm * 1000);
    }

    

    // 이탈 감지
    if (minDistM > OFFCOURSE_THRESHOLD_M && !offCourseRef.current) {
      // ← 추가된 부분: 이탈 시점에 봇 위치 저장
      pausedPositionRef.current = currentPosition;
      Speech.speak('트랙을 이탈했습니다. 복귀해주세요. 기록을 일시정지합니다.');
      offCourseRef.current = true;
      pauseRunning();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      setIsSimulating(false);
    }
    // 복귀 감지
    else if (minDistM <= OFFCOURSE_THRESHOLD_M && offCourseRef.current) {
      Speech.speak('트랙으로 돌아왔습니다. 러닝을 재개합니다.');
      offCourseRef.current = false;
      //pausedPositionRef.current = null;
      resumeRunning();
      setIsSimulating(true);
    }
  }, [userLocation, path, externalPath, pauseRunning,resumeRunning]);

  // **threshold**: 시작 가능 반경 (미터)
  const START_RADIUS_METERS = 10;
  // 시작 버튼 누르면 botRunning 시작 (기존 startRunning 대체)
  const handleStart = async () => {

    hasFinishedRef.current = false;

    if (!externalPath || externalPath.length === 0) {
      Alert.alert('오류', '트랙 경로 정보가 없습니다.');
      return;
    }
    const startPoint = externalPath[0];
    const { coords } = await Location.getCurrentPositionAsync({});
    const { latitude: curLat, longitude: curLon } = coords;

    const startDistKm = haversineDistance(
      startPoint.latitude,
      startPoint.longitude,
      curLat,
      curLon
    );
    const startDistM = startDistKm * 1000;

    if (startDistM > START_RADIUS_METERS) {
      Alert.alert(
        '시작 위치 오류',
        `지정된 시작점에서 ${Math.round(startDistM)}m 떨어져 있습니다.\n` +
        `시작점에서 ${START_RADIUS_METERS}m 이내로 이동한 뒤 다시 시도해 주세요.`
      );
      return;
    }

    Speech.speak('러닝을 시작합니다. 웜업구간입니다. 속도를 천천히 올려주세요');
    startRunning();
    setIsSimulating(true);
  };

  // 러닝 종료 처리
  const handleStopRunning = async () => {
    Speech.speak('러닝을 종료합니다.');

    // ① animationFrame 취소
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    // ② RunningContext 클린업
    stopRunning();
    resetRunning();
    
    // ③ 로컬 상태 클린업
    setIsSimulating(false);
    setCurrentPosition(null);
    offCourseRef.current = false;       // 이탈 알림 초기화
  

    // summary에 필요한 최소 데이터
    const summaryData = {
      trackPath: externalPath ?? [],  // 트랙 경로
      userPath: path,                 // 유저가 실제로 뛴 경로
      totalDistance: liveDistanceKm,  // km
      elapsedTime,                    // sec
    };

    router.replace({
      pathname: '/Summary',
      params: { data: JSON.stringify(summaryData) },
    });

  };

  // 자동 종료용 useEffect 
  const FINISH_RADIUS_M = 10;
  const hasFinishedRef = useRef(false);

  // off-course 감지 useEffect 바로 아래쯤에 추가
  useEffect(() => {
    if (!externalPath?.length || !userLocation || hasFinishedRef.current || !trackInfo) return;

    const finishPoint = externalPath[externalPath.length - 1];
    // m 단위 거리 계산
    const distM =
      haversineDistance(
        finishPoint.latitude,
        finishPoint.longitude,
        userLocation.latitude,
        userLocation.longitude
      ) *
      1000;

    const TrackLengthM = trackInfo.distanceMeters;  // 트랙 길이
    const runLengthM = liveDistanceKm * 1000;       // 실제 달린 거리

    if (distM <= FINISH_RADIUS_M && runLengthM >= TrackLengthM -10) {
      hasFinishedRef.current = true;
      Speech.speak('완주를 축하합니다! 러닝을 종료합니다.');
      // 봇 애니메이션, 러닝 기록 모두 종료
      handleStopRunning();
    }
  }, [userLocation, externalPath, trackInfo,liveDistanceKm]);

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
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        //region={mapRegion}
        zoomEnabled
        scrollEnabled
        rotateEnabled
        pitchEnabled
        showsUserLocation
      >
        {startCoursePosition && (
          <Marker coordinate={startCoursePosition} title="Start">
            <Image
              source={require('@/assets/images/start-line.png')}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </Marker>
        )}
        {startCoursePosition && (
          <Circle
            center={startCoursePosition}
            radius={START_RADIUS_METERS}
            strokeColor="rgba(0, 200, 0, 0.7)"  // Green border
            fillColor="rgba(0, 200, 0, 0.2)"    // Transparent green fill
          />
        )}

        {endCoursePosition && (
          <Marker coordinate={endCoursePosition} title="Finish">
            <Image
              source={require('@/assets/images/finish-line.png')}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </Marker>
        )}
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
        {currentPosition && (
          <Marker coordinate={currentPosition} title="Bot" pinColor="red" />
        )}

      </MapView>

      <View style={styles.overlay}>
        {/* ——— 봇과의 거리 표시 추가 ——— */}
        <View style={styles.botDistanceRow}>
          <Text style={styles.botDistanceLabel}>봇과의 거리</Text>
          <Text style={styles.botDistanceValue}>
          {(botDistanceKm * 1000).toFixed(0)} m
          </Text>
        </View>
        <Text style={styles.distance}>{liveDistanceKm.toFixed(2)} km</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>{currentSpeed.toFixed(1)} km/h</Text>
          <Text style={styles.stat}>{formatTime(elapsedTime)} 분:초</Text>
          <Text style={styles.stat}>{instantPace} 페이스</Text>
        </View>

        <View style = {styles.buttonRow}>
          {/* ───────── 이탈 중 “경기 포기” 버튼 ─────────*/}
          <Pressable
            style={styles.forfeitButton}
            onPressIn={() => {
              // 3초 롱프레스 타이머
              forfeitTimeout.current = setTimeout(() => {
                router.replace('/');         // 홈으로 이동
              }, 3000);
            }}
            onPressOut={() => {
              if (forfeitTimeout.current) {
                clearTimeout(forfeitTimeout.current);
                forfeitTimeout.current = null;
                Alert.alert(
                  '안내',
                  '3초간 꾹 눌러야 경기를 포기합니다.\n지금까지 뛴 기록은 사라집니다.',
                  [{ text: '알겠습니다' }]
                );
              }
            }}
            >
            <Text style={styles.forfeitText}>경기 포기</Text>
          </Pressable>
          {/* 시작 전일 때만 “시작” 버튼 */}
          {!isSimulating && (
          <Pressable
            onPress={handleStart}
            style={styles.startButton}
          >
            <Text style={styles.startButtonText}>시작</Text>
          </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 10,
  },
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
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333'
  },
  botDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  botDistanceLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 6,
  },
  botDistanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007aff',
  },
  forfeitButton: {
    flex:1,
    marginRight:5,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#cc0000',
    alignItems: 'center',
  },
  forfeitText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  startButton: {
    flex: 1,
    marginLeft: 5,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#007aff',
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
