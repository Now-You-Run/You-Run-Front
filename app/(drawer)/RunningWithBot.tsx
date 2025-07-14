import { EventArg, NavigationAction } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AvatarOverlay } from '@/components/running/AvatarOverlay';
import { BotDistanceDisplay } from '@/components/running/BotDistanceDisplay';
import { FinishModal } from '@/components/running/FinishModal';
import { RunningControls } from '@/components/running/RunningControls';
import { RunningMap } from '@/components/running/RunningMap';
import { RunningStats } from '@/components/running/RunningStats';
import { useRunning } from '@/context/RunningContext';
import { useAvatarPosition } from '@/hooks/useAvatarPosition';
import { useFinishDetection } from '@/hooks/useFinishDetection';
import { useTrackSimulation } from '@/hooks/useTrackSimulation';
import { loadTrackInfo, TrackInfo } from '@/repositories/appStorage';
import { Coordinate } from '@/types/TrackDto';
import { AVATAR_CONSTANTS, TRACK_CONSTANTS } from '@/utils/Constants';
import { calculateTotalDistance, calculateTrackDistance, haversineDistance, smoothPath } from '@/utils/RunningUtils';
import { Region } from 'react-native-maps';
import { SourceType } from './TrackDetailScreen';

interface SummaryData {
  trackPath: Coordinate[];
  userPath: Coordinate[];
  totalDistance: number;
  elapsedTime: number;
  source: SourceType;
  trackId?: string;
}

const START_BUFFER_METERS = 10;

export default function BotRunningScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { trackId, botMin, botSec, source } = useLocalSearchParams<{
    trackId?: string;
    botMin?: string;
    botSec?: string;
    source: SourceType;
  }>();

  // --- State Management ---
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [pausedPosition, setPausedPosition] = useState<Coordinate | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [initialStartPoint, setInitialStartPoint] = useState<Coordinate | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>();

  const [isAvatarComponentReady, setIsAvatarComponentReady] = useState(false);

  // --- RunningControls State & Animation ---
  const [isFinishPressed, setIsFinishPressed] = useState(false);
  const finishProgressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Contexts and Custom Hooks ---
  const {
    isActive, elapsedTime, path, currentSpeed, startRunning, pauseRunning,
    resumeRunning, stopRunning, resetRunning, userLocation,
  } = useRunning();

  const isPaused = !isActive && elapsedTime > 0;
  const { avatarScreenPos, handleAvatarReady, updateAvatarPosition, setMapRef } = useAvatarPosition();
  const botPace = useMemo(() => ({ minutes: botMin ? parseInt(botMin, 10) : 0, seconds: botSec ? parseInt(botSec, 10) : 0 }), [botMin, botSec]);
  const { currentPosition, startCoursePosition, endCoursePosition, stopSimulation } = useTrackSimulation({ externalPath: trackInfo?.path ?? [], botPace, isSimulating, pausedPosition });
  const liveDistanceKm = useMemo(() => calculateTotalDistance(path), [path]);

  // --- Data Loading ---
  useEffect(() => {
    if (trackId) {
      loadTrackInfo(trackId)
        .then(info => {
          if (info) setTrackInfo(info);
          else setTrackError('트랙 정보를 찾을 수 없습니다.');
        })
        .catch(err => {
          console.error("트랙 로딩 실패:", err);
          setTrackError('트랙 정보를 불러오는 중 오류가 발생했습니다.');
        });
    }
  }, [trackId]);
  useEffect(() => {
    if (!mapRegion) {
      if (userLocation) {
        setMapRegion({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      } else if (trackInfo?.origin) {
        // Fallback to track origin if GPS not ready yet
        setMapRegion({
          latitude: trackInfo.origin.latitude,
          longitude: trackInfo.origin.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    }
  }, [userLocation, mapRegion, trackInfo]);

  // --- Logic Hooks & Handlers ---
  const onAvatarComponentReady = useCallback(() => {
    handleAvatarReady();
    setIsAvatarComponentReady(true);
  }, [handleAvatarReady]);

  const botTrackDistance = useMemo(() => {
    if (!currentPosition || path.length === 0 || !trackInfo?.path) {
      return { distanceMeters: 0, isAhead: false, botProgress: 0, userProgress: 0 };
    }
    const userPos = path[path.length - 1];
    const realDistanceData = calculateTrackDistance(currentPosition, userPos, trackInfo.path);
    if (initialStartPoint) {
      const distanceFromStart = haversineDistance(initialStartPoint.latitude, initialStartPoint.longitude, userPos.latitude, userPos.longitude) * 1000;
      if (distanceFromStart < START_BUFFER_METERS) {
        return { ...realDistanceData, userProgress: 0 };
      }
    }
    return realDistanceData;
  }, [currentPosition, path, trackInfo?.path, initialStartPoint]);

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
    userProgressMeters: botTrackDistance.userProgress,
    trackDistanceMeters: trackInfo?.distanceMeters ?? 0,
    isActive,
    onFinish: handleFinish,
    userLocation: userLocation,
    externalPath: trackInfo?.path ?? [],
  });

  const cleanupRunningState = useCallback(() => {
    stopSimulation();
    resetRunning();
    setIsSimulating(false);
    setPausedPosition(null);
    setInitialStartPoint(null);
    Speech.stop();
  }, [stopSimulation, resetRunning]);

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
      const firstPoint: Omit<Coordinate, 'timestamp'> = { latitude: coords.latitude, longitude: coords.longitude };
      setInitialStartPoint(firstPoint);
      Speech.speak('러닝을 시작합니다. 웜업구간입니다. 속도를 천천히 올려주세요');
      startRunning();
      setIsSimulating(true);
    } catch (error) {
      console.error('러닝 시작 중 오류:', error);
      Alert.alert('오류', '러닝을 시작하는 중 오류가 발생했습니다.');
    }
  };

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

  const handleFinishPressIn = useCallback(() => {
    setIsFinishPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(finishProgressAnimation, { toValue: 1, duration: 3000, useNativeDriver: false }).start();
    finishTimeoutRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cleanupRunningState();
      router.replace('/');
    }, 3000);
  }, [cleanupRunningState, finishProgressAnimation, router]);

  const handleFinishPressOut = useCallback(() => {
    setIsFinishPressed(false);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    finishProgressAnimation.stopAnimation();
    finishProgressAnimation.setValue(0);
  }, [finishProgressAnimation]);

  // ✅ 2. Determine the final ready state. userLocation coming from context signifies GPS is ready.
  const isFullyLoaded = !!(trackInfo && mapRegion);

  // --- Render Logic ---

  if (trackError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{trackError}</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backLinkText}>돌아가기</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>←</Text></TouchableOpacity>
      </View>

      {/* ✅ 3. Always render the map and avatar so they can load in the background */}
      <RunningMap
        path={smoothPath(path, 5)}
        isActive={isActive}
        initialRegion={mapRegion}
        userLocation={userLocation}
        onAvatarPositionUpdate={updateAvatarPosition}
        onMapReady={setMapRef}
        externalPath={trackInfo?.path}
        botPosition={currentPosition}
        startPosition={startCoursePosition}
        endPosition={endCoursePosition}
        isSimulating={isSimulating}
      />
      {isSimulating && avatarScreenPos && (
        <AvatarOverlay
          screenPos={avatarScreenPos}
          isRunning={isActive}
          speed={currentSpeed}
          avatarId={AVATAR_CONSTANTS.AVATAR_ID}
          onAvatarReady={handleAvatarReady} // 기존 훅에서 제공하는 함수 사용
        />
      )}
      <View style={styles.overlay}>
        {trackInfo && (
          <>
            <BotDistanceDisplay distanceMeters={botTrackDistance.distanceMeters} isAhead={botTrackDistance.isAhead} userProgress={botTrackDistance.userProgress} totalDistance={trackInfo.distanceMeters} />
            <RunningStats totalDistance={liveDistanceKm} displaySpeed={currentSpeed} elapsedTime={elapsedTime} />
          </>
        )}
        <RunningControls
          isActive={isActive}
          isPaused={isPaused}
          elapsedTime={elapsedTime}
          isFinishPressed={isFinishPressed}
          finishProgress={0} // finishProgress state is not used in the new RunningControls
          progressAnimation={finishProgressAnimation}
          scaleAnimation={scaleAnimation}
          onMainPress={handleMainPress}
          onFinishPressIn={handleFinishPressIn}
          onFinishPressOut={handleFinishPressOut}
          isReady={isFullyLoaded} // Pass the final ready state
        />
      </View>

      {/* ✅ 4. Loading overlay sits on top of everything and disappears when ready */}
      {!isFullyLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>
            {!trackInfo ? '트랙 정보 로딩 중...' :
              !mapRegion ? 'GPS 신호 수신 중...' : ''}
          </Text>
        </View>
      )}


      <FinishModal
        visible={isFinishModalVisible}
        summaryData={summaryData}
        onClose={() => { cleanupRunningState(); setIsFinishModalVisible(false); router.replace('/'); }}
        onConfirm={() => { if (summaryData) { cleanupRunningState(); router.replace({ pathname: '/summary', params: { data: JSON.stringify(summaryData) } }); } setIsFinishModalVisible(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerBar: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#333' },
  overlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(255,255,255,0.95)', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center', zIndex: 5, paddingBottom: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
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
