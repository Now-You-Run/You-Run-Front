import { EventArg, NavigationAction } from '@react-navigation/native';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Region } from 'react-native-maps';

import BackButton from '@/components/button/BackButton';
import { BotDistanceDisplay } from '@/components/running/BotDistanceDisplay';
import { FinishModal } from '@/components/running/FinishModal';
import { RunningControls } from '@/components/running/RunningControls';
import { RunningMap } from '@/components/running/RunningMap';
import { RunningStats } from '@/components/running/RunningStats';
import { RunningProvider, useRunning } from '@/context/RunningContext';
import { loadTrackInfo, TrackInfo } from '@/repositories/appStorage';
import { Coordinate } from '@/types/TrackDto';
import { calculateTotalDistance, calculateTrackDistance, getOpponentPathAndGhost, haversineDistance } from '@/utils/RunningUtils';

interface SummaryData {
  trackPath: Coordinate[];
  userPath: Coordinate[];
  totalDistance: number;
  elapsedTime: number;
  trackId?: string;
  opponentId?: string;
  isWinner?: boolean;
  mode?: string;
}

const START_BUFFER_METERS = 10;
const FINISH_RADIUS_METERS = 10;

function MatchRunningScreenInner({ isTestMode, setIsTestMode }: { isTestMode: boolean, setIsTestMode: (v: boolean) => void }) {
  const router = useRouter();
  const navigation = useNavigation();
  const { trackId, recordId, trackInfo: trackInfoParam } = useLocalSearchParams<{ trackId?: string; recordId?: string; trackInfo?: string }>();

  // --- 러닝 로직 ---
  const {
    isActive,
    isPaused,
    elapsedTime,
    path,
    totalDistance,
    userLocation,
    resetRunning,
    setUserLocation,
    pauseRunning,
    resumeRunning,
    addToPath,
    startRunning,
    setCurrentSpeed,
  } = useRunning();

  // 위치 구독 함수와 clearPath는 useRunning에서 직접 가져온다
  const runningCtx = useRunning();
  const startLocationTracking = runningCtx.startLocationTracking;
  const stopLocationTracking = runningCtx.stopLocationTracking;

  // --- State Management ---
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>();

  // --- 상대방 경로 관리 ---
  const [opponentPath, setOpponentPath] = useState<Coordinate[]>([]);

  // --- 종료 버튼 관련 상태/애니메이션 ---
  const [isFinishPressed, setIsFinishPressed] = useState(false);
  const finishProgressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 테스트 모드 상태 및 참조 ---
  const [isTestModeState, setIsTestModeState] = useState(isTestMode);
  const [testSpeedKmh, setTestSpeedKmh] = useState(10); // 기본 10km/h
  const fakeLocationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accIdxRef = useRef(0);
  const lastCoordRef = useRef<any>(null);
  const prevActiveRef = useRef(isActive);

  // 최신 isTestMode 값을 항상 참조
  const isTestModeRef = useRef(isTestModeState);
  useEffect(() => { isTestModeRef.current = isTestModeState; }, [isTestModeState]);

  // --- 상대방 기록 불러오기 ---
  useEffect(() => {
    if (!recordId) return;
    axios.get(`https://yourun.shop/api/record/${recordId}`).then(res => {
      const userPath = res.data.data.userPath;
      const baseTime = userPath[0]?.timestamp ?? 0;
      const path = res.data.data.userPath.map((point: any) => ({
        latitude: point.latitude || point.Latitude,
        longitude: point.longitude || point.Longitude,
        timestamp: point.timestamp - baseTime,
      }));
      setOpponentPath(path);
    }).catch(err => {
      console.log('🔥🔥 axios 에러:', err);
    });
  }, [recordId]);

  // --- 상대 실선+고스트 (경과시간 기준) ---
  const { livePath: opponentLivePath, ghost: opponentGhost } = React.useMemo(() => {
    return getOpponentPathAndGhost(opponentPath, elapsedTime ?? 0);
  }, [opponentPath, elapsedTime]);

  // --- 트랙 정보 로딩 ---
  useEffect(() => {
    if (trackInfoParam) {
      try {
        const parsed = JSON.parse(trackInfoParam);
        setTrackInfo(parsed);
      } catch (e) {
        setTrackInfo(null);
      }
    } else if (trackId) {
      loadTrackInfo(trackId)
        .then(info => {
          if (info) setTrackInfo(info);
          else setTrackError('트랙 정보를 찾을 수 없습니다.');
        })
        .catch(() => setTrackError('트랙 정보를 불러오는 중 오류가 발생했습니다.'));
    }
  }, [trackId, trackInfoParam]);

  // --- 지도 region 초기화 ---
  useEffect(() => {
    if (!mapRegion && userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      });
    }
  }, [userLocation, mapRegion]);

  // userLocation 없을땐 trackInfo 기준 지도
  useEffect(() => {
    if (!mapRegion && trackInfo?.origin) {
      setMapRegion({
        latitude: trackInfo.origin.latitude,
        longitude: trackInfo.origin.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      });
    }
  }, [mapRegion, trackInfo]);

  // mapRegion이 바뀔 때마다 delta를 항상 0.002로 고정
  useEffect(() => {
    if (mapRegion && (mapRegion.latitudeDelta !== 0.002 || mapRegion.longitudeDelta !== 0.002)) {
      setMapRegion({
        ...mapRegion,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      });
    }
  }, [mapRegion]);

  // --- 위치 구독 시작 (테스트 모드 아닐 때만) ---
  useEffect(() => {
    if (isTestModeRef.current) return;
    if (startLocationTracking && stopLocationTracking) {
      startLocationTracking();
      return () => {
        stopLocationTracking();
      };
    }
  }, [isTestModeRef.current, startLocationTracking, stopLocationTracking]);

  // --- 테스트 모드 진입 시점에 상태 완전 초기화 ---
  useEffect(() => {
    if (isTestModeState) {
      if (trackInfo?.path && trackInfo.path.length > 0) {
        const startCoord = { ...trackInfo.path[0], timestamp: Date.now() };
        setUserLocation(startCoord);
        accIdxRef.current = 0;
        lastCoordRef.current = startCoord;
        resetRunning();
        // path를 명시적으로 비우고 시작점만 추가 (clearPath가 있으면 사용)
        runningCtx.clearPath();
        addToPath(startCoord);
      }
    }
    // 테스트 모드 해제 시, 필요하다면 GPS 위치를 다시 받아오게 할 수 있음
    // else { ... }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTestModeState]);

  // --- 최초 GPS 위치 수신 (테스트 모드 아닐 때만, 안전하게) ---
  useEffect(() => {
    // 🚨 테스트 모드일 때는 절대 GPS 위치를 요청하지 마세요!
    // 이 로직은 isTestMode가 false일 때만 동작합니다.
    if (isTestModeRef.current) return;
    if (!userLocation) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: Date.now(),
          });
        }
      })();
    }
    // 앞으로 어떤 기능이 추가되어도, isTestMode가 true면 GPS 위치가 절대 세팅되지 않도록 유지하세요.
  }, [isTestModeRef.current]);

  // --- 테스트 모드: 트랙 path 자동 이동 setInterval만 시작 (진행 상태는 건드리지 않음) ---
  const startFakeTrackInterval = useCallback(() => {
    if (!trackInfo?.path || trackInfo.path.length < 2) return;
    if (fakeLocationIntervalRef.current) clearInterval(fakeLocationIntervalRef.current);
    const speedMps = testSpeedKmh / 3.6;
    let prevCoord = lastCoordRef.current || { ...trackInfo.path[0], timestamp: Date.now() };
    let idx = accIdxRef.current;
    fakeLocationIntervalRef.current = setInterval(() => {
      if (!isActive || isPaused) return;
      let remainDist = speedMps;
      while (remainDist > 0 && idx < trackInfo.path.length - 1) {
        const nextCoord = trackInfo.path[idx + 1];
        const dKm = haversineDistance(
          prevCoord.latitude,
          prevCoord.longitude,
          nextCoord.latitude,
          nextCoord.longitude
        );
        const dMeters = dKm * 1000;
        if (dMeters <= remainDist) {
          remainDist -= dMeters;
          prevCoord = { ...nextCoord, timestamp: Date.now() };
          idx++;
        } else {
          const ratio = remainDist / dMeters;
          const lat = prevCoord.latitude + (nextCoord.latitude - prevCoord.latitude) * ratio;
          const lng = prevCoord.longitude + (nextCoord.longitude - prevCoord.longitude) * ratio;
          prevCoord = { latitude: lat, longitude: lng, timestamp: Date.now() };
          remainDist = 0;
        }
      }
      accIdxRef.current = idx;
      lastCoordRef.current = prevCoord;
      setUserLocation(prevCoord);
      addToPath(prevCoord);
      setCurrentSpeed(testSpeedKmh);
    }, 1000) as any;
  }, [trackInfo, isActive, isPaused, setUserLocation, addToPath, setCurrentSpeed, testSpeedKmh]);

  // --- 러닝 처음 시작할 때만 진행 상태 초기화 + setInterval 시작 ---
  const startFakeTrackMovement = useCallback(() => {
    if (!trackInfo?.path || trackInfo.path.length < 2) return;
    if (accIdxRef.current === 0 && lastCoordRef.current && lastCoordRef.current.latitude === trackInfo.path[0].latitude && lastCoordRef.current.longitude === trackInfo.path[0].longitude) {
      startRunning();
      startFakeTrackInterval();
      return;
    }
    accIdxRef.current = 0;
    lastCoordRef.current = { ...trackInfo.path[0], timestamp: Date.now() };
    setUserLocation(lastCoordRef.current);
    addToPath(lastCoordRef.current);
    startRunning();
    startFakeTrackInterval();
  }, [trackInfo, setUserLocation, startFakeTrackInterval, addToPath, startRunning]);

  // --- 테스트 모드 이동 제어 ---
  useEffect(() => {
    if (isTestModeState && isActive && !prevActiveRef.current && accIdxRef.current === 0) {
      startFakeTrackMovement();
    }
    prevActiveRef.current = isActive;
    if ((!isTestModeState || !isActive || isPaused) && fakeLocationIntervalRef.current) {
      clearInterval(fakeLocationIntervalRef.current);
      fakeLocationIntervalRef.current = null;
    }
    if (isTestModeState && isActive && !isPaused && !fakeLocationIntervalRef.current && accIdxRef.current > 0) {
      startFakeTrackInterval();
    }
  }, [isTestModeState, isActive, isPaused, startFakeTrackMovement, startFakeTrackInterval]);

  // --- 컴포넌트 언마운트 시 인터벌 정리 ---
  useEffect(() => {
    return () => {
      if (fakeLocationIntervalRef.current) {
        clearInterval(fakeLocationIntervalRef.current);
        fakeLocationIntervalRef.current = null;
      }
    };
  }, []);

  // --- 러닝 시작 ---
  const customOnMainPress = useCallback(() => {
    if (isActive) {
      pauseRunning();
      return;
    } else if (isPaused) {
      resumeRunning();
      return;
    }
    if (!trackInfo?.path || trackInfo.path.length === 0) {
      Alert.alert('오류', '트랙 경로 정보가 없습니다.');
      return;
    }
    const startPoint = trackInfo.path[0];
    if (isTestModeState) {
      resetRunning();
      runningCtx.clearPath();
      const startCoord = { ...startPoint, timestamp: Date.now() };
      accIdxRef.current = 0;
      lastCoordRef.current = startCoord;
      setUserLocation(startCoord);
      addToPath(startCoord);
      startRunning();
      startFakeTrackInterval();
      return;
    }
    if (!userLocation) {
      Alert.alert('GPS 위치를 받아오는 중입니다.');
      return;
    }
    const dist = haversineDistance(
      startPoint.latitude,
      startPoint.longitude,
      userLocation.latitude,
      userLocation.longitude
    ) * 1000;
    if (dist > START_BUFFER_METERS) {
      Alert.alert('시작 위치 오류', `시작점에서 약 ${Math.round(dist)}m 떨어져 있습니다. ${START_BUFFER_METERS}m 이내로 이동해주세요.`);
      return;
    }
    Speech.speak('러닝 대결을 시작합니다. 파이팅!');
    // onMainPress(); // This line was removed from useRunning, so it's removed here.
  }, [isActive, isPaused, pauseRunning, resumeRunning, trackInfo, userLocation, isTestModeState, resetRunning, setUserLocation, addToPath, startRunning, startFakeTrackInterval, runningCtx.clearPath]);

  // --- 완주(트랙 도착) 처리 ---
  useEffect(() => {
    const MIN_REQUIRED_METERS = 50;
    if (!trackInfo?.path || path.length < 2 || !userLocation || !isActive) return;
    const finishPoint = trackInfo.path[trackInfo.path.length - 1];
    const distToFinish = haversineDistance(
      finishPoint.latitude, finishPoint.longitude,
      userLocation.latitude, userLocation.longitude
    ) * 1000;
    const totalRunMeters = totalDistance * 1000;
    if (distToFinish <= FINISH_RADIUS_METERS && totalRunMeters >= ((trackInfo?.distanceMeters ?? 0) - 10) &&
          totalRunMeters >= MIN_REQUIRED_METERS) {
      handleMatchFinish();
    }
  }, [userLocation, path, isActive, trackInfo, totalDistance]);

  // --- 매치 완주 처리 ---
  const handleMatchFinish = useCallback(async () => {
    let isWinner = false;
    try {
      console.log('recordId:', recordId);
      const res = await axios.get(`https://yourun.shop/api/record/${recordId}`);
      const opponentElapsed = res.data.data.record.resultTime;
      if (typeof opponentElapsed === 'number' && !isNaN(opponentElapsed)) {
        isWinner = elapsedTime < opponentElapsed;
      } else {
        Alert.alert('오류', '상대방 기록을 불러올 수 없습니다. 기록은 정상 저장됩니다.');
        isWinner = false;
      }
      // 로그로 확인
      console.log('내 기록:', elapsedTime, '상대 기록:', opponentElapsed, 'isWinner:', isWinner);
    } catch (e) {
      Alert.alert('오류', '상대방 기록을 불러올 수 없습니다. 기록은 정상 저장됩니다.');
      isWinner = false;
    }

    if (isWinner) {
      Speech.speak('러닝을 완료했습니다. 상대방과의 대결에서 승리하였습니다!');
    } else {
      Speech.speak('러닝을 완료했습니다. 아쉽게도 상대방과의 대결에서 패배하였습니다.');
    }

    setSummaryData({
      mode: 'MATCH',
      trackPath: trackInfo?.path ?? [],
      userPath: path,
      totalDistance,
      elapsedTime,
      trackId,
      opponentId: recordId,
      isWinner,
    });
    setIsFinishModalVisible(true);
  }, [trackInfo, path, elapsedTime, trackId, recordId, totalDistance]);

  // --- 종료 버튼 3초 누르기 핸들러 ---
  const handleFinishPressIn = useCallback(() => {
    setIsFinishPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(finishProgressAnimation, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();
    finishTimeoutRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleForfeit();
    }, 3000);
  }, [finishProgressAnimation]);

  const handleFinishPressOut = useCallback(() => {
    setIsFinishPressed(false);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    finishProgressAnimation.stopAnimation();
    finishProgressAnimation.setValue(0);
  }, [finishProgressAnimation]);

  // --- 강제 나가기 ---
  const handleForfeit = useCallback(() => {
    resetRunning();
    setIsFinishModalVisible(false);
    setIsFinishPressed(false);
    finishProgressAnimation.setValue(0);
    scaleAnimation.setValue(1);
    router.replace('/');
  }, [resetRunning, router, finishProgressAnimation, scaleAnimation]);

  // --- 네비게이션 이탈 시 경고 ---
  useEffect(() => {
    const handleBeforeRemove = (e: EventArg<'beforeRemove', true, { action: NavigationAction }>) => {
      if (!isActive && !isPaused && elapsedTime === 0) {
        return;
      }
      e.preventDefault();
      Alert.alert(
        "러닝 중단", "정말로 현재 러닝을 중단하고 나가시겠습니까?",
        [
          { text: "계속 달리기", style: "cancel" },
          { text: "나가기", style: "destructive", onPress: () => { handleForfeit(); navigation.dispatch(e.data.action); } },
        ]
      );
    };
    navigation.addListener('beforeRemove', handleBeforeRemove);
    
    // 하드웨어 뒤로가기(Android)도 동일하게 처리
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isActive && !isPaused && elapsedTime === 0) {
        return false; // 정상 종료 시 기본 동작 허용
      }
      Alert.alert(
        '정말 나가시겠습니까?',
        '진행 중인 러닝이 종료됩니다.',
        [
          { text: '취소', style: 'cancel', onPress: () => {} },
          {
            text: '나가기',
            style: 'destructive',
            onPress: () => {
              handleForfeit();
            },
          },
        ]
      );
      return true; // 뒤로가기 기본 동작 막기
    });
    
    return () => {
      navigation.removeListener('beforeRemove', handleBeforeRemove);
      backHandler.remove();
    };
  }, [navigation, isActive, isPaused, elapsedTime, handleForfeit]);

  // --- 최종 준비 여부 ---
  const isMapReady = !!(trackInfo && mapRegion);

  // --- 진행률/거리 계산 (user vs opponent) ---
  const userVsOpponent = React.useMemo(() => {
    if (!trackInfo?.path || path.length === 0 || !opponentLivePath || opponentLivePath.length === 0) {
      // fallback: 트랙 거리 직접 계산
      const fallbackTotal = trackInfo?.path ? calculateTotalDistance(trackInfo.path) * 1000 : 0;
      return { distanceMeters: 0, isAhead: false, userProgress: 0, totalDistance: fallbackTotal };
    }
    const userPos = path[path.length - 1];
    const opponentPos = opponentLivePath[opponentLivePath.length - 1];
    const result = calculateTrackDistance(opponentPos, userPos, trackInfo.path);

    // trackInfo.distanceMeters가 없으면 직접 계산
    let totalDist = trackInfo.distanceMeters;
    if (!totalDist && trackInfo.path) {
      totalDist = calculateTotalDistance(trackInfo.path) * 1000; // km → m
    }

    return {
      distanceMeters: result.distanceMeters,
      isAhead: result.isAhead,
      userProgress: result.userProgress, // 이미 미터 단위
      totalDistance: totalDist ?? 0,
    };
  }, [trackInfo?.path, path, opponentLivePath, trackInfo?.distanceMeters]);

  // --- 렌더 ---
  if (trackError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{trackError}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLinkText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 상단바 */}
      <BackButton onPress={() => router.back()} />
      <View style={styles.testModeBox}>
        {/* 테스트 모드 UI */}
        <View style={styles.testModeRow}>
          <Text style={styles.testModeLabel}>🧪 테스트 모드</Text>
          <TouchableOpacity
            style={[
              styles.testModeToggle,
              { backgroundColor: isTestModeState ? '#ff6b6b' : '#4ecdc4' }
            ]}
            onPress={() => setIsTestModeState(!isTestModeState)}
          >
            <Text style={styles.testModeToggleText}>
              {isTestModeState ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
        {isTestModeState && (
          <>
            <TouchableOpacity
              style={styles.startPointBtn}
              onPress={() => {
                if (Array.isArray(trackInfo?.path) && trackInfo.path.length > 0) {
                  const startCoord = { ...trackInfo.path[0], timestamp: Date.now() };
                  runningCtx.clearPath();
                  setUserLocation(startCoord);
                  accIdxRef.current = 0;
                  lastCoordRef.current = startCoord;
                  // path가 완전히 비워진 뒤에 addToPath 실행
                  setTimeout(() => {
                    addToPath(startCoord);
                  }, 0);
                }
              }}
            >
              <Text style={styles.startPointBtnText}>🚩 시작점 이동</Text>
            </TouchableOpacity>
            <View style={styles.speedControlVertical}>
              <TouchableOpacity onPress={() => setTestSpeedKmh(s => Math.max(1, s - 1))}>
                <Text style={styles.speedBtn}>-</Text>
              </TouchableOpacity>
              <Text style={styles.speedValue}>{testSpeedKmh} km/h</Text>
              <TouchableOpacity onPress={() => setTestSpeedKmh(s => Math.min(30, s + 1))}>
                <Text style={styles.speedBtn}>+</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* 지도/러닝 경로 */}
      <RunningMap
        path={path}
        isActive={isActive}
        initialRegion={mapRegion}
        region={mapRegion}
        userLocation={userLocation}
        externalPath={trackInfo?.path}
        opponentLivePath={opponentLivePath} // 상대 실시간 경로
        startPosition={trackInfo?.path?.[0]}
        endPosition={trackInfo?.path?.[trackInfo?.path.length - 1]}
        onAvatarPositionUpdate={() => {}}
        opponentGhost={opponentGhost}
      />

      {/* 하단 오버레이 */}
      <View style={styles.overlay}>
        <BotDistanceDisplay
          distanceMeters={userVsOpponent.distanceMeters}
          isAhead={userVsOpponent.isAhead}
          userProgress={userVsOpponent.userProgress}
          totalDistance={userVsOpponent.totalDistance}
        />
        <RunningStats 
          totalDistance={totalDistance} 
          displaySpeed={testSpeedKmh}
          elapsedTime={elapsedTime} 
        />
        <RunningControls
          isActive={isActive}
          isPaused={isPaused}
          elapsedTime={elapsedTime}
          isFinishPressed={isFinishPressed}
          finishProgress={0}
          progressAnimation={finishProgressAnimation}
          scaleAnimation={scaleAnimation}
          onMainPress={customOnMainPress}
          onFinishPressIn={handleFinishPressIn}
          onFinishPressOut={handleFinishPressOut}
          isReady={isMapReady}
        />
      </View>

      {/* 로딩 오버레이 */}
      {!isMapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>
            {!trackInfo ? '트랙 정보 로딩 중...' : !mapRegion ? 'GPS 신호 수신 중...' : ''}
          </Text>
        </View>
      )}

      {/* 완주 모달 */}
      <FinishModal
        visible={isFinishModalVisible}
        summaryData={summaryData}
        onClose={() => { 
          resetRunning(); 
          setIsFinishModalVisible(false); 
          router.replace('/'); 
        }}
        onConfirm={() => { 
          if (summaryData) { 
            resetRunning(); 
            router.replace({ 
              pathname: '/summary', 
              params: { data: JSON.stringify(summaryData) } 
            }); 
          } 
          setIsFinishModalVisible(false); 
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerBar: { 
    position: 'absolute', 
    top: 50, 
    left: 20, 
    zIndex: 10, 
    backgroundColor: 'rgba(255,255,255,0.8)', 
    borderRadius: 20 
  },
  // backButton: { 
  //   width: 40, 
  //   height: 40, 
  //   justifyContent: 'center', 
  //   alignItems: 'center' 
  // },
  // backButtonText: { fontSize: 24, color: '#333' },
  overlay: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    padding: 20, 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    alignItems: 'center', 
    zIndex: 5, 
    paddingBottom: 40 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  errorText: { color: 'red', fontSize: 16, textAlign: 'center' },
  backLinkText: { color: '#007AFF', marginTop: 20, fontSize: 16 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  // --- 테스트 모드 UI 스타일 (더 작고 오른쪽 상단에 위치) ---
  testModeBox: {
    position: 'absolute',
    top: 50,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 6,
    minWidth: 110,
    maxWidth: 140,
    alignItems: 'center',
    zIndex: 20,
    // 그림자 효과를 원하면 아래 추가
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.15,
    // shadowRadius: 4,
    // elevation: 4,
  },
  testModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    width: '100%',
  },
  testModeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  testModeToggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  testModeToggleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  startPointBtn: {
    backgroundColor: '#4ecdc4',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'center',
  },
  startPointBtnText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  speedControlVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 4,
    width: '100%',
  },
  speedBtn: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 4,
  },
  speedValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 4,
  },
});

// RunningProvider로 감싸기
export default function MatchRunningScreen() {
  const [isTestMode, setIsTestMode] = React.useState(false);
  // isTestMode를 MatchRunningScreenInner에 prop으로 넘기고, RunningProvider에도 전달
  return (
    <RunningProvider isTestMode={isTestMode}>
      <MatchRunningScreenInner isTestMode={isTestMode} setIsTestMode={setIsTestMode} />
    </RunningProvider>
  );
}