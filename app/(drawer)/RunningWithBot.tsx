import { AvatarOverlay } from '@/components/running/AvatarOverlay';
import { BotDistanceDisplay } from '@/components/running/BotDistanceDisplay';
import { FinishModal } from '@/components/running/FinishModal';
import { RunningControls } from '@/components/running/RunningControls';
import { RunningMap } from '@/components/running/RunningMap';
import { RunningStats } from '@/components/running/RunningStats';
import { RunningProvider, useRunning } from '@/context/RunningContext';
import { useAvatarPosition } from '@/hooks/useAvatarPosition';
import { useOffCourseDetection } from '@/hooks/useOffCourseDetection';
import { useRunningLogic } from '@/hooks/useRunningLogic';
import { useTrackSimulation } from '@/hooks/useTrackSimulation';
import { loadTrackInfo, TrackInfo } from '@/repositories/appStorage';
import { AVATAR_CONSTANTS } from '@/utils/Constants';
import { calculateTrackDistance, haversineDistance } from '@/utils/RunningUtils';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Region } from 'react-native-maps';

function BotRunningScreenInner({ isTestMode, setIsTestMode }: { isTestMode: boolean, setIsTestMode: (v: boolean) => void }) {
  // 🧪 테스트 모드 상태는 최상단에 선언
  // const [testMode, setTestMode] = useState(isTestMode); // 제거
  // 대신 isTestMode, setIsTestMode prop 사용
  const router = useRouter();
  const navigation = useNavigation();
  const { trackId, botMin, botSec, source } = useLocalSearchParams<{ trackId?: string; botMin?: string; botSec?: string; source: string }>();

  // 러닝 로직
  const {
    isActive,
    isPaused,
    elapsedTime,
    path,
    totalDistance,
    displaySpeed,
    onMainPress,
    handleFinish,
    userLocation,
    resetRunning,
    setUserLocation,
    pauseRunning,
    resumeRunning,
  } = useRunningLogic();

  // 위치 구독 함수는 useRunning에서 직접 가져온다
  const { startLocationTracking, stopLocationTracking } = useRunning();

  // 트랙 정보
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>();
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // 아바타 포지션
  const { avatarScreenPos, handleAvatarReady, updateAvatarPosition, setMapRef, avatarReady } = useAvatarPosition();

  // 봇 페이스/시뮬레이션
  const botPace = useMemo(() => ({
    minutes: botMin ? parseInt(botMin, 10) : 0,
    seconds: botSec ? parseInt(botSec, 10) : 0
  }), [botMin, botSec]);
  const isSimulating = isActive && !!trackInfo && !!mapRegion && !!userLocation;
  const {
    currentPosition,
    startCoursePosition,
    endCoursePosition,
    stopSimulation,
    pauseSimulation,
    resumeSimulation
  } = useTrackSimulation({
    externalPath: trackInfo?.path ?? [],
    botPace,
    isSimulating,
  });

  // 봇과 사용자 거리/진행률 계산
  const botTrackDistance = useMemo(() => {
    if (!currentPosition || path.length === 0 || !trackInfo?.path) {
      return { distanceMeters: 0, isAhead: false, botProgress: 0, userProgress: 0 };
    }
    const userPos = path[path.length - 1];
    return calculateTrackDistance(currentPosition, userPos, trackInfo.path);
  }, [currentPosition, path, trackInfo?.path]);

  // 러닝 로직에 봇 거리 정보 전달
  useRunningLogic(botTrackDistance.distanceMeters, botTrackDistance.isAhead);

  // 종료 버튼 관련 상태/애니메이션
  const [isFinishPressed, setIsFinishPressed] = useState(false);
  const finishProgressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 종료 버튼 3초 누르기 핸들러
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
      resetRunning();
      stopSimulation();
      setIsFinishModalVisible(false);
      setIsFinishPressed(false);
      finishProgressAnimation.setValue(0);
      scaleAnimation.setValue(1);
      router.replace('/');
    }, 3000);
  }, [resetRunning, stopSimulation, router, finishProgressAnimation]);

  const handleFinishPressOut = useCallback(() => {
    setIsFinishPressed(false);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    finishProgressAnimation.stopAnimation();
    finishProgressAnimation.setValue(0);
    scaleAnimation.setValue(1);
  }, [finishProgressAnimation, scaleAnimation]);

  // 러닝 시작 시 시작점 10m 이내 proximity 체크
  const START_BUFFER_METERS = 10;
  const customOnMainPress = useCallback(async () => {
    if (isActive || isPaused) {
      onMainPress();
      return;
    }
    if (!trackInfo?.path || trackInfo.path.length === 0) {
      alert('트랙 경로 정보가 없습니다.');
      return;
    }
    const startPoint = trackInfo.path[0];

    if (isTestMode) {
      // 테스트 모드: 내 위치를 트랙 시작점으로 강제 세팅 후 시작
      setUserLocation({
        ...startPoint,
        timestamp: Date.now(),
      });
      onMainPress();
      return;
    }

    // 실제 모드: GPS 위치 체크
    if (!userLocation) {
      alert('GPS 위치를 받아오는 중입니다.');
      return;
    }
    const dist = haversineDistance(
      startPoint.latitude,
      startPoint.longitude,
      userLocation.latitude,
      userLocation.longitude
    ) * 1000;
    if (dist > START_BUFFER_METERS) {
      alert(`시작점에서 약 ${Math.round(dist)}m 떨어져 있습니다. ${START_BUFFER_METERS}m 이내로 이동해주세요.`);
      return;
    }
    onMainPress();
  }, [isActive, isPaused, onMainPress, trackInfo, userLocation, isTestMode, setUserLocation]);

  // 트랙 정보 로딩
  useEffect(() => {
    if (trackId) {
      loadTrackInfo(trackId)
        .then((info) => {
          if (info) setTrackInfo(info);
          else setTrackError('트랙 정보를 찾을 수 없습니다.');
        })
        .catch(() => setTrackError('트랙 정보를 불러오는 중 오류가 발생했습니다.'));
    }
  }, [trackId]);

  // 최초 userLocation 수신 시 mapRegion을 1회만 설정
  useEffect(() => {
    if (!mapRegion && userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002
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

  // userLocation이 있고 path가 비어있을 때 아바타 위치 강제 계산
  useEffect(() => {
    if (userLocation && path.length === 0) {
      updateAvatarPosition(userLocation, true);
    }
  }, [userLocation, path.length, updateAvatarPosition]);

  // userLocation이 바뀔 때마다 아바타 위치도 갱신 (avatarReady + 1m 이상 이동 시만)
  const prevLocationRef = useRef<any>(null);
  useEffect(() => {
    if (!avatarReady || !userLocation) return;
    const prev = prevLocationRef.current;
    const moved =
      prev
        ? haversineDistance(
            prev.latitude,
            prev.longitude,
            userLocation.latitude,
            userLocation.longitude
          ) * 1000
        : Infinity;
    if (moved > 1) {
      updateAvatarPosition(userLocation, true);
      prevLocationRef.current = userLocation;
      console.log('🧪 useEffect: updateAvatarPosition(userLocation)', userLocation);
    }
  }, [userLocation, avatarReady, updateAvatarPosition]);

  // 러닝 시작 전 최초 GPS 위치를 받아와 userLocation에 세팅
  useEffect(() => {
    if (isTestMode) return; // 테스트 모드면 GPS로 세팅하지 않음
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
  }, [isTestMode, userLocation, setUserLocation]);

  // 🧪 위치 구독: 테스트 모드일 때는 아예 구독하지 않음
  useEffect(() => {
    if (isTestMode) {
      return;
    }
    if (startLocationTracking && stopLocationTracking) {
      startLocationTracking();
      return () => {
        stopLocationTracking();
      };
    }
  }, [isTestMode, startLocationTracking, stopLocationTracking]);

  // useRunning에서 setCurrentSpeed 가져오기
  const { addToPath, startRunning, setCurrentSpeed } = useRunning();

  // 1. 테스트 모드 진입 useEffect에서 isActive를 의존성에 추가
  useEffect(() => {
    if (isTestMode && trackInfo?.path?.length && !isActive) {
      accIdxRef.current = 0;
      lastCoordRef.current = { ...trackInfo.path[0], timestamp: Date.now() };
      console.log('🧪 테스트모드 진입: 트랙 첫 좌표', lastCoordRef.current);
    }
  }, [isTestMode, trackInfo, isActive]);

  // 테스트 모드 진입 시 러닝 상태/경로/위치 모두 트랙 시작점으로 완전 초기화
  useEffect(() => {
    if (isTestMode && trackInfo?.path?.length) {
      resetRunning();
      const startCoord = { ...trackInfo.path[0], timestamp: Date.now() };
      setUserLocation(startCoord);
      addToPath(startCoord);
      accIdxRef.current = 0;
      lastCoordRef.current = startCoord;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTestMode, trackInfo?.path]);

  // 도착점 반경(m)
  const FINISH_RADIUS_METERS = 10;

  // 기존 useFinishDetection, 진행률 기반 자동 완주 useEffect 제거 후 아래로 통합
  useEffect(() => {
    if (!trackInfo?.path || path.length === 0 || !userLocation || !isActive) return;
    const finishPoint = trackInfo.path[trackInfo.path.length - 1];
    const distToFinish = haversineDistance(
      finishPoint.latitude, finishPoint.longitude,
      userLocation.latitude, userLocation.longitude
    ) * 1000;
    const totalRunMeters = totalDistance * 1000;
    if (distToFinish <= FINISH_RADIUS_METERS && totalRunMeters >= (trackInfo.distanceMeters ?? 0)) {
      setSummaryData({
        trackPath: trackInfo.path ?? [],
        userPath: path,
        totalDistance,
        elapsedTime,
        source,
        trackId,
      });
      setIsFinishModalVisible(true);
      stopSimulation();
    }
  }, [userLocation, path, isActive, trackInfo, totalDistance, elapsedTime, source, trackId, stopSimulation]);

  // 경로 이탈 감지 및 자동 일시정지/재개
  const [isOffCourse, setIsOffCourse] = useState(false);
  if (
    !isTestMode &&
    isActive &&
    trackInfo?.path &&
    userLocation &&
    path.length > 0
  ) {
    useOffCourseDetection({
      externalPath: trackInfo.path,
      userLocation,
      isActive,
      onPause: pauseRunning,
      onResume: resumeRunning,
      onOffCourse: () => setIsOffCourse(true),
    });
  }
  // 복귀 시 isOffCourse false로
  useEffect(() => {
    if (isActive && isOffCourse) setIsOffCourse(false);
  }, [isActive, isOffCourse]);

  // pause/resume 시 봇 시뮬레이션도 함께 제어
  useEffect(() => {
    if (isPaused) {
      pauseSimulation && pauseSimulation();
    } else if (isActive) {
      resumeSimulation && resumeSimulation();
    }
  }, [isPaused, isActive, pauseSimulation, resumeSimulation]);

  // 뒤로가기 방지
  useEffect(() => {
    const handleBeforeRemove = (e: any) => {
      if (!isActive && elapsedTime === 0) return;
      e.preventDefault();
      resetRunning();
      stopSimulation();
      navigation.dispatch(e.data.action);
    };
    navigation.addListener('beforeRemove', handleBeforeRemove);
    return () => navigation.removeListener('beforeRemove', handleBeforeRemove);
  }, [navigation, isActive, elapsedTime, resetRunning, stopSimulation]);

  // 🧪 테스트 모드 상태
  const fakeLocationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accIdxRef = useRef(0);
  const lastCoordRef = useRef<any>(null);
  const prevActiveRef = useRef(isActive);

  const minSpeedMps = 8 / 3.6; // 8km/h
  const defaultSpeedMps = 10 / 3.6; // 10km/h

  // 테스트 모드 속도 상태 추가
  const [testSpeedKmh, setTestSpeedKmh] = useState(10); // 기본 10km/h

  // 🧪 트랙 path 자동 이동 setInterval만 시작 (진행 상태는 건드리지 않음)
  const startFakeTrackInterval = useCallback(() => {
    if (!trackInfo?.path || trackInfo.path.length < 2) return;
    if (fakeLocationIntervalRef.current) clearInterval(fakeLocationIntervalRef.current);

    // 테스트 모드 속도 적용
    const speedMps = testSpeedKmh / 3.6;

    // 진행 상태는 오직 러닝 처음 시작할 때만 초기화 (interval 재시작 시에는 그대로 둠)
    // accIdxRef.current, lastCoordRef.current는 startFakeTrackMovement에서만 초기화

    let prevCoord = lastCoordRef.current || { ...trackInfo.path[0], timestamp: Date.now() };
    let prevTimestamp = prevCoord.timestamp || Date.now();
    let accDist = 0;
    let idx = accIdxRef.current;

    fakeLocationIntervalRef.current = setInterval(() => {
      if (!isActive || isPaused) return;
      // 1초마다 speedMps만큼 path를 따라 이동
      let remainDist = speedMps; // 1초 동안 이동해야 할 거리(m)
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
          // 다음 점까지 이동
          remainDist -= dMeters;
          prevCoord = { ...nextCoord, timestamp: Date.now() };
          idx++;
        } else {
          // 다음 점까지 못 가면 비율로 보간
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
      updateAvatarPosition(prevCoord, false);
      setCurrentSpeed(testSpeedKmh);
      prevTimestamp = Date.now();
    }, 1000) as any;
  }, [trackInfo, isActive, isPaused, setUserLocation, addToPath, updateAvatarPosition, setCurrentSpeed, testSpeedKmh]);

  // 🧪 러닝 처음 시작할 때만 진행 상태 초기화 + setInterval 시작
  // 러닝 시작(테스트 모드) 시에는 중복 setUserLocation/addToPath 하지 않도록 분기
  const startFakeTrackMovement = useCallback(() => {
    if (!trackInfo?.path || trackInfo.path.length < 2) return;
    // 이미 트랙 시작점으로 초기화된 상태라면 중복 세팅하지 않음
    if (accIdxRef.current === 0 && lastCoordRef.current && lastCoordRef.current.latitude === trackInfo.path[0].latitude && lastCoordRef.current.longitude === trackInfo.path[0].longitude) {
      startRunning(); // 러닝 상태만 활성화
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

  // 🧪 테스트 모드 이동 제어
  useEffect(() => {
    // 러닝 처음 시작할 때만 진행 상태 초기화 + setInterval 시작
    if (isTestMode && isActive && !prevActiveRef.current && accIdxRef.current === 0) {
      startFakeTrackMovement();
    }
    prevActiveRef.current = isActive;
    // 일시정지/재개 시에는 setInterval만 멈추거나 재시작
    if ((!isTestMode || !isActive || isPaused) && fakeLocationIntervalRef.current) {
      clearInterval(fakeLocationIntervalRef.current);
      fakeLocationIntervalRef.current = null;
    }
    // 재개 시에는 진행 상태(accIdxRef, lastCoordRef)는 그대로 두고 setInterval만 새로 시작
    if (isTestMode && isActive && !isPaused && !fakeLocationIntervalRef.current && accIdxRef.current > 0) {
      startFakeTrackInterval(); // 진행 상태는 그대로, setInterval만 새로 시작
    }
  }, [isTestMode, isActive, isPaused, startFakeTrackMovement, startFakeTrackInterval]);

  // 🧪 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (fakeLocationIntervalRef.current) {
        clearInterval(fakeLocationIntervalRef.current);
        fakeLocationIntervalRef.current = null;
      }
    };
  }, []);

  // 지도 준비 상태: 트랙 정보와 지도 영역이 모두 준비되었을 때 true
  const isMapReady = !!(trackInfo && mapRegion);

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
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        {/* 🧪 테스트 모드 토글 버튼 */}
        <TouchableOpacity
          style={[{ marginLeft: 10, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: isTestMode ? '#ff6b6b' : '#4ecdc4' }]}
          onPress={() => setIsTestMode(!isTestMode)}
        >
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
            {isTestMode ? '🧪 테스트 ON' : '🧪 테스트 OFF'}
          </Text>
        </TouchableOpacity>
        {/* 🧪 테스트 속도 조절 UI */}
        {isTestMode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
            <TouchableOpacity onPress={() => setTestSpeedKmh(s => Math.max(1, s - 1))}>
              <Text style={{ fontSize: 18, marginHorizontal: 8 }}>-</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, width: 48, textAlign: 'center' }}>{testSpeedKmh} km/h</Text>
            <TouchableOpacity onPress={() => setTestSpeedKmh(s => Math.min(30, s + 1))}>
              <Text style={{ fontSize: 18, marginHorizontal: 8 }}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <RunningMap
        path={path}
        isActive={isActive}
        initialRegion={mapRegion}
        region={mapRegion}
        userLocation={userLocation}
        onAvatarPositionUpdate={updateAvatarPosition}
        onMapReady={setMapRef}
        externalPath={trackInfo?.path}
        botPosition={currentPosition}
        startPosition={startCoursePosition}
        endPosition={endCoursePosition}
        isSimulating={isSimulating}
      />

      {avatarScreenPos && (
        <AvatarOverlay
          screenPos={avatarScreenPos}
          isRunning={isActive}
          speed={displaySpeed}
          avatarId={AVATAR_CONSTANTS.AVATAR_ID}
          onAvatarReady={handleAvatarReady}
        />
      )}

      <View style={styles.overlay}>
        {trackInfo && (
          <>
            <BotDistanceDisplay
              distanceMeters={botTrackDistance.distanceMeters}
              isAhead={botTrackDistance.isAhead}
              userProgress={botTrackDistance.userProgress}
              totalDistance={trackInfo.distanceMeters}
              isOffCourse={isOffCourse}
            />
            <RunningStats
              totalDistance={totalDistance}
              displaySpeed={displaySpeed}
              elapsedTime={elapsedTime}
            />
          </>
        )}
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

      {/* 오버레이: 트랙/지도 준비 중이거나, 3D 아바타 준비 중일 때 메시지 */}
      {!isMapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>
            {!trackInfo
              ? '트랙 정보 로딩 중...'
              : !mapRegion
                ? 'GPS 신호 수신 중...'
                : ''}
          </Text>
        </View>
      )}
      {/* 3D 아바타 준비 중 메시지는 별도로 */}
      {isMapReady && !avatarScreenPos && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>3D 아바타 준비 중...</Text>
        </View>
      )}

      <FinishModal
        visible={isFinishModalVisible}
        summaryData={summaryData}
        onClose={() => {
          resetRunning();
          stopSimulation();
          setIsFinishModalVisible(false);
          router.replace('/');
        }}
        onConfirm={() => {
          if (summaryData) {
            resetRunning();
            stopSimulation();
            router.replace({
              pathname: '/summary',
              params: { data: JSON.stringify(summaryData) },
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
    borderRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: { fontSize: 24, color: '#333' },
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
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
});

// RunningProvider로 감싸기
export default function BotRunningScreen() {
  const [isTestMode, setIsTestMode] = React.useState(false);
  return (
    <RunningProvider isTestMode={isTestMode}>
      <BotRunningScreenInner isTestMode={isTestMode} setIsTestMode={setIsTestMode} />
    </RunningProvider>
  );
}
