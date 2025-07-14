import { EventArg, NavigationAction } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Region } from 'react-native-maps';

import { AvatarOverlay } from '@/components/running/AvatarOverlay';
import { BotDistanceDisplay } from '@/components/running/BotDistanceDisplay';
import { FinishModal } from '@/components/running/FinishModal';
import { RunningControls } from '@/components/running/RunningControls'; // BotRunningControls 대신 사용
import { RunningMap } from '@/components/running/RunningMap';
import { RunningStats } from '@/components/running/RunningStats';
import { useRunning } from '@/context/RunningContext';
import { useAvatarPosition } from '@/hooks/useAvatarPosition';
import { useFinishDetection } from '@/hooks/useFinishDetection';
import { useOffCourseDetection } from '@/hooks/useOffCourseDetection';
import { useSectionAnnouncements } from '@/hooks/useSectionAnnouncements';
import { useTrackSimulation } from '@/hooks/useTrackSimulation';
import { loadTrackInfo, TrackInfo } from '@/repositories/appStorage';
import { Coordinate } from '@/types/TrackDto';
import { AVATAR_CONSTANTS, TRACK_CONSTANTS } from '@/utils/Constants';
import { calculateTotalDistance, calculateTrackDistance, haversineDistance, smoothPath } from '@/utils/RunningUtils';
import { SourceType } from './TrackDetailScreen';

interface SummaryData {
  trackPath: Coordinate[];
  userPath: Coordinate[];
  totalDistance: number;
  elapsedTime: number;
  source: SourceType;
  trackId?: string;
}

export default function BotRunningScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { trackId, botMin, botSec, source } = useLocalSearchParams<{
    trackId?: string;
    botMin?: string;
    botSec?: string;
    source: SourceType;
  }>();

  // --- 상태 관리 ---
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>();
  const [isSimulating, setIsSimulating] = useState(false);
  const [pausedPosition, setPausedPosition] = useState<Coordinate | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // --- RunningControls를 위한 상태 및 애니메이션 ---
  const [isFinishPressed, setIsFinishPressed] = useState(false);
  const [finishProgress, setFinishProgress] = useState(0);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 컨텍스트 및 커스텀 훅 ---
  const {
    isActive, elapsedTime, path, currentSpeed, startRunning, pauseRunning,
    resumeRunning, stopRunning, resetRunning, userLocation,
  } = useRunning();

  // '일시정지' 상태는 기존 값들로 추론
  const isPaused = !isActive && elapsedTime > 0;

  const { avatarScreenPos, handleAvatarReady, updateAvatarPosition, setMapRef } = useAvatarPosition();
  const botPace = useMemo(() => ({ minutes: botMin ? parseInt(botMin, 10) : 0, seconds: botSec ? parseInt(botSec, 10) : 0 }), [botMin, botSec]);
  const { currentPosition, startCoursePosition, endCoursePosition, stopSimulation } = useTrackSimulation({ externalPath: trackInfo?.path ?? [], botPace, isSimulating, pausedPosition });
  const liveDistanceKm = useMemo(() => calculateTotalDistance(path), [path]);
  const [initialStartPoint, setInitialStartPoint] = useState<Coordinate | null>(null);

  const [initialGpsLoaded, setInitialGpsLoaded] = useState(false);
  const [isAvatarReady, setIsAvatarReady] = useState(false);

  const START_BUFFER_METERS = 10;


  // --- 로직 훅 ---
  useOffCourseDetection({
    externalPath: trackInfo?.path ?? [], userLocation, isActive,
    onPause: () => {
      setPausedPosition(currentPosition);
      pauseRunning();
      setIsSimulating(false);
    },
    onResume: () => { resumeRunning(); setIsSimulating(true); },
    onOffCourse: setPausedPosition,
  });

  useSectionAnnouncements(
    isActive ? liveDistanceKm * 1000 : 0,
    trackInfo ? [{ name: '본격 구간', endMeters: trackInfo.distanceMeters * 0.2 }, { name: '마무리 구간', endMeters: trackInfo.distanceMeters * 0.8 }] : [],
  );

  const botTrackDistance = useMemo(() => {
    if (!currentPosition || path.length === 0 || !trackInfo?.path) {
      return { distanceMeters: 0, isAhead: false, botProgress: 0, userProgress: 0 };
    }

    const userPos = path[path.length - 1];
    const realDistanceData = calculateTrackDistance(currentPosition, userPos, trackInfo.path);
    // Check if we are still within the start buffer
    if (initialStartPoint) {
      const distanceFromStart = haversineDistance(
        initialStartPoint.latitude,
        initialStartPoint.longitude,
        userPos.latitude,
        userPos.longitude
      ) * 1000;

      // 3. 버퍼 안에 있다면, 계산된 데이터에서 userProgress 값만 0으로 덮어씁니다.
      if (distanceFromStart < START_BUFFER_METERS) {
        return {
          ...realDistanceData, // 봇과의 거리(distanceMeters) 등 다른 값은 그대로 유지
          userProgress: 0,     // 사용자 진행률만 0으로 설정
        };
      }
    }

    // Once outside the buffer, perform the normal calculation
    return calculateTrackDistance(currentPosition, userPos, trackInfo.path);
  }, [currentPosition, path, trackInfo?.path, initialStartPoint]);

  // --- 데이터 로딩 ---
  useEffect(() => {
    if (trackId) {
      loadTrackInfo(trackId)
        .then(info => {
          if (info) {
            setTrackInfo(info);
            setMapRegion({ latitude: info.origin.latitude, longitude: info.origin.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
          } else {
            setTrackError('트랙 정보를 찾을 수 없습니다.');
          }
        })
        .catch(err => {
          console.error("트랙 로딩 실패:", err);
          setTrackError('트랙 정보를 불러오는 중 오류가 발생했습니다.');
        });
    }
  }, [trackId]);
  useEffect(() => {
    if (trackInfo && !initialGpsLoaded) {
      const getInitialLocation = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setTrackError("Location permission is required to start running.");
            return;
          }
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setMapRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          setInitialGpsLoaded(true);
        } catch (error) {
          console.error("Failed to get initial location:", error);
          setTrackError("Could not retrieve your current location.");
        }
      };
      getInitialLocation();
    }
  }, [trackInfo, initialGpsLoaded]);

  const handleAvatarComponentReady = useCallback(() => {
    // This function can be passed to the AvatarOverlay.
    // We can also call the original handleAvatarReady from the hook if needed.
    handleAvatarReady();
    setIsAvatarReady(true);
  }, [handleAvatarReady]);
  // --- 상태 정리 및 내비게이션 관리 ---
  const cleanupRunningState = useCallback(() => {
    stopSimulation();
    resetRunning();
    setIsSimulating(false);
    setPausedPosition(null);
    setInitialStartPoint(null);
    Speech.stop();
  }, [stopSimulation, resetRunning]);

  // 뒤로가기 버튼 핸들러 (물리, 제스처, 헤더)
  useEffect(() => {
    const handleBeforeRemove = (e: EventArg<'beforeRemove', true, { action: NavigationAction }>) => {
      if (!isActive && elapsedTime === 0) return;
      e.preventDefault();
      Alert.alert(
        "러닝 중단", "정말로 현재 러닝을 중단하고 나가시겠습니까?",
        [
          { text: "계속 달리기", style: "cancel" },
          { text: "나가기", style: "destructive", onPress: () => { cleanupRunningState(); navigation.dispatch(e.data.action); } },
        ]
      );
    };
    navigation.addListener('beforeRemove', handleBeforeRemove);
    return () => navigation.removeListener('beforeRemove', handleBeforeRemove);
  }, [navigation, isActive, elapsedTime, cleanupRunningState]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  // --- 이벤트 핸들러 ---
  const handleFinish = useCallback(() => {
    Speech.speak('목표 달성! 러닝을 완료했습니다.');
    const finalSummaryData: SummaryData = {
      trackPath: trackInfo?.path ?? [], userPath: path, totalDistance: liveDistanceKm,
      elapsedTime, source: source, trackId: trackId
    };
    setSummaryData(finalSummaryData);
    setIsFinishModalVisible(true);
    stopSimulation();
    stopRunning();
    setIsSimulating(false);
  }, [trackInfo, path, liveDistanceKm, elapsedTime, source, trackId, stopSimulation, stopRunning]);

  useFinishDetection({
    // Use the projected progress from botTrackDistance
    userProgressMeters: botTrackDistance.userProgress,
    // The total distance of the official track
    trackDistanceMeters: trackInfo?.distanceMeters ?? 0,
    isActive,
    onFinish: handleFinish,
    // Pass the user's location to detect if they are near the finish line
    userLocation: userLocation,
    externalPath: trackInfo?.path ?? [],
  });

  const handleStart = async () => {
    try {
      if (!trackInfo?.path || trackInfo.path.length === 0) {
        Alert.alert('오류', '트랙 경로 정보가 없습니다.');
        return;
      }
      const startPoint = trackInfo.path[0];
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '러닝을 시작하려면 위치 권한이 필요합니다.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const startDistMeters = haversineDistance(startPoint.latitude, startPoint.longitude, coords.latitude, coords.longitude) * 1000;
      if (startDistMeters > TRACK_CONSTANTS.START_RADIUS_METERS) {
        Alert.alert('시작 위치 오류', `시작점에서 약 ${Math.round(startDistMeters)}m 떨어져 있습니다. ${TRACK_CONSTANTS.START_RADIUS_METERS}m 이내로 이동해주세요.`);
        return;
      }

      const firstPoint: Coordinate = {
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      setInitialStartPoint(firstPoint);
      Speech.speak('러닝을 시작합니다. 웜업구간입니다. 속도를 천천히 올려주세요');
      startRunning();
      setIsSimulating(true);
    } catch (error) {
      console.error('러닝 시작 중 오류:', error);
      Alert.alert('오류', '러닝을 시작하는 중 오류가 발생했습니다.');
    }
  };

  // 메인 버튼 (시작/정지/재개) 핸들러
  const handleMainPress = () => {
    if (isActive) {
      pauseRunning();
      setIsSimulating(false);
      setPausedPosition(currentPosition);
    } else if (isPaused) {
      resumeRunning();
      setIsSimulating(true);
    } else {
      handleStart();
    }
  };

  // 종료 버튼 누르기 시작 핸들러
  const handleFinishPressIn = useCallback(() => {
    setIsFinishPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    finishTimeoutRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cleanupRunningState();
      router.replace('/');
    }, 3000);
  }, [cleanupRunningState, progressAnimation, router]);

  // 종료 버튼에서 손 떼기 핸들러
  const handleFinishPressOut = useCallback(() => {
    setIsFinishPressed(false);
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    progressAnimation.stopAnimation();
    progressAnimation.setValue(0);
  }, [progressAnimation]);

  const handleMapReady = useCallback((mapRef: MapView | null) => {
    setMapRef(mapRef);
  }, [setMapRef]);

  // --- 렌더링 로직 ---
  if (trackError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{trackError}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLinkText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trackInfo || !mapRegion) {
    return (
      <View style={styles.loadingContainer}>
        <Text>트랙 정보를 불러오는 중...</Text>
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
        path={smoothPath(path, 5)} isActive={isActive} initialRegion={mapRegion}
        userLocation={userLocation} onAvatarPositionUpdate={updateAvatarPosition}
        onMapReady={handleMapReady} externalPath={trackInfo.path} botPosition={currentPosition}
        startPosition={startCoursePosition} endPosition={endCoursePosition} isSimulating={isSimulating}
      />

      {avatarScreenPos && <AvatarOverlay screenPos={avatarScreenPos} isRunning={isActive} speed={currentSpeed} avatarId={AVATAR_CONSTANTS.AVATAR_ID} onAvatarReady={handleAvatarReady} />}

      <View style={styles.overlay}>
        <BotDistanceDisplay distanceMeters={botTrackDistance.distanceMeters} isAhead={botTrackDistance.isAhead} userProgress={botTrackDistance.userProgress} totalDistance={trackInfo.distanceMeters} />
        <RunningStats totalDistance={liveDistanceKm} displaySpeed={currentSpeed} elapsedTime={elapsedTime} />
        <RunningControls
          isActive={isActive}
          isPaused={isPaused}
          elapsedTime={elapsedTime}
          isFinishPressed={isFinishPressed}
          finishProgress={finishProgress}
          progressAnimation={progressAnimation}
          scaleAnimation={scaleAnimation}
          onMainPress={handleMainPress}
          onFinishPressIn={handleFinishPressIn}
          onFinishPressOut={handleFinishPressOut}
          isReady={!!trackInfo}
        />
      </View>

      <FinishModal
        visible={isFinishModalVisible}
        summaryData={summaryData}
        onClose={() => {
          cleanupRunningState();
          setIsFinishModalVisible(false);
          router.replace('/');
        }}
        onConfirm={() => {
          if (summaryData) {
            cleanupRunningState();
            router.replace({ pathname: '/summary', params: { data: JSON.stringify(summaryData) } });
          }
          setIsFinishModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { position: 'absolute', top: 50, left: 20, zIndex: 1100, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#333' },
  overlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(255,255,255,0.95)', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center', zIndex: 1000, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: 'red', fontSize: 16, textAlign: 'center' },
  backLinkText: { color: '#007AFF', marginTop: 20, fontSize: 16 },
});
