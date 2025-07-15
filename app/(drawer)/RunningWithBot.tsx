import { AvatarOverlay } from '@/components/running/AvatarOverlay';
import { BotDistanceDisplay } from '@/components/running/BotDistanceDisplay';
import { FinishModal } from '@/components/running/FinishModal';
import { RunningControls } from '@/components/running/RunningControls';
import { RunningMap } from '@/components/running/RunningMap';
import { RunningStats } from '@/components/running/RunningStats';
import { useRunning } from '@/context/RunningContext';
import { useAvatarPosition } from '@/hooks/useAvatarPosition';
import { useFinishDetection } from '@/hooks/useFinishDetection';
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

export default function BotRunningScreen() {
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
  const { avatarScreenPos, handleAvatarReady, updateAvatarPosition, setMapRef } = useAvatarPosition();

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
    stopSimulation
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
    if (!userLocation) {
      alert('GPS 위치를 받아오는 중입니다.');
      return;
    }
    const startPoint = trackInfo.path[0];
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
  }, [isActive, isPaused, onMainPress, trackInfo, userLocation]);

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

  // 러닝 시작 전 최초 GPS 위치를 받아와 userLocation에 세팅
  useEffect(() => {
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
  }, [userLocation, setUserLocation]);

  // 위치 구독: 러닝 시작 전에도 항상 위치를 실시간으로 받도록
  useEffect(() => {
    if (startLocationTracking && stopLocationTracking) {
      startLocationTracking();
      return () => {
        stopLocationTracking();
      };
    }
  }, [startLocationTracking, stopLocationTracking]);

  // 완주 감지
  useFinishDetection({
    userProgressMeters: path.length && trackInfo?.path ? calculateTrackDistance(currentPosition, path[path.length - 1], trackInfo.path).userProgress : 0,
    trackDistanceMeters: trackInfo?.distanceMeters ?? 0,
    isActive,
    onFinish: () => {
      setSummaryData({
        trackPath: trackInfo?.path ?? [],
        userPath: path,
        totalDistance,
        elapsedTime,
        source,
        trackId,
      });
      setIsFinishModalVisible(true);
      stopSimulation();
    },
    userLocation,
    externalPath: trackInfo?.path ?? [],
  });

  // 진행률 100% 도달 시 자동 완주 처리
  useEffect(() => {
    if (
      trackInfo &&
      botTrackDistance.userProgress >= (trackInfo.distanceMeters ?? 0) * 0.99 &&
      isActive
    ) {
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
  }, [botTrackDistance.userProgress, trackInfo, isActive, path, totalDistance, elapsedTime, source, trackId, stopSimulation]);

  // 경로 이탈 감지 및 자동 일시정지/재개
  const [isOffCourse, setIsOffCourse] = useState(false);
  useOffCourseDetection({
    externalPath: trackInfo?.path ?? [],
    userLocation,
    isActive,
    onPause: pauseRunning,
    onResume: resumeRunning,
    onOffCourse: () => setIsOffCourse(true),
  });
  // 복귀 시 isOffCourse false로
  useEffect(() => {
    if (isActive && isOffCourse) setIsOffCourse(false);
  }, [isActive, isOffCourse]);

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

  // 로딩 오버레이: 경로 + GPS(초기 mapRegion)만 필요 (avatarScreenPos는 3D 아바타 준비용)
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
