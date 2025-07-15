import { EventArg, NavigationAction } from '@react-navigation/native';
import axios from 'axios';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FinishModal } from '@/components/running/FinishModal';
import { RunningControls } from '@/components/running/RunningControls';
import { RunningMap } from '@/components/running/RunningMap';
import { RunningStats } from '@/components/running/RunningStats';
import { useRunning } from '@/context/RunningContext';
import { loadTrackInfo, TrackInfo } from '@/repositories/appStorage';
import { Coordinate } from '@/types/TrackDto';
import { calculateTotalDistance, getOpponentPathAndGhost, haversineDistance, smoothPath } from '@/utils/RunningUtils';
import { Region } from 'react-native-maps';

interface SummaryData {
  trackPath: Coordinate[];
  userPath: Coordinate[];
  totalDistance: number;
  elapsedTime: number;
  trackId?: string;
}

const START_BUFFER_METERS = 10;

export default function MatchRunningScreen() {

  const router = useRouter();
  const navigation = useNavigation();
  const { trackId, recordId } = useLocalSearchParams<{ trackId?: string; recordId?: string }>();

  // --- State Management ---
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [initialStartPoint, setInitialStartPoint] = useState<Coordinate | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>();
  const [isFinishPressed, setIsFinishPressed] = useState(false);

  // --- 애니메이션 ---
  const finishProgressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 러닝 컨텍스트 (내 상태/위치/경로 등) ---
  const {
    isActive, elapsedTime, path, currentSpeed, startRunning, pauseRunning,
    resumeRunning, stopRunning, resetRunning, userLocation,
  } = useRunning();

  const isPaused = !isActive && elapsedTime > 0;

  // --- 상대방 경로 관리 ---
  const [opponentPath, setOpponentPath] = useState<Coordinate[]>([]);

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

  // --- 트랙 정보 불러오기 ---
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

  // --- 지도 region 초기화 ---
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
        setMapRegion({
          latitude: trackInfo.origin.latitude,
          longitude: trackInfo.origin.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    }
  }, [userLocation, mapRegion, trackInfo]);

  // --- 완주(트랙 도착) 처리 ---
  useEffect(() => {
    if (!trackInfo?.path || path.length === 0 || !userLocation || !isActive) return;
    const finishPoint = trackInfo.path[trackInfo.path.length - 1];
    const distToFinish = haversineDistance(
      finishPoint.latitude, finishPoint.longitude,
      userLocation.latitude, userLocation.longitude
    ) * 1000;
    const totalRunMeters = calculateTotalDistance(path) * 1000;
    if (distToFinish <= 10 && totalRunMeters >= (trackInfo?.distanceMeters ?? 0) - 10) {
      handleFinish();
    }
  }, [userLocation, path, isActive, trackInfo]);

  // --- 러닝 시작 ---
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
      if (startDistMeters > START_BUFFER_METERS) {
        Alert.alert('시작 위치 오류', `시작점에서 약 ${Math.round(startDistMeters)}m 떨어져 있습니다. ${START_BUFFER_METERS}m 이내로 이동해주세요.`);
        return;
      }
      const firstPoint: Omit<Coordinate, 'timestamp'> = { latitude: coords.latitude, longitude: coords.longitude };
      setInitialStartPoint(firstPoint);
      Speech.speak('러닝 대결을 시작합니다. 파이팅!');
      startRunning();
    } catch (error) {
      console.error('러닝 시작 중 오류:', error);
      Alert.alert('오류', '러닝을 시작하는 중 오류가 발생했습니다.');
    }
  };

  // --- 일시정지/재개 ---
  const handlePauseResume = () => {
    if (isActive) {
      pauseRunning();
    } else if (isPaused) {
      resumeRunning();
    }
  };

  // --- 러닝 강제 종료/완주 ---
  const handleFinish = useCallback(() => {
    Speech.speak('러닝을 완료했습니다!');
    setSummaryData({
      trackPath: trackInfo?.path ?? [],
      userPath: path,
      totalDistance: calculateTotalDistance(path),
      elapsedTime,
      trackId,
    });
    setIsFinishModalVisible(true);
    stopRunning();
  }, [trackInfo, path, elapsedTime, trackId, stopRunning]);

  // --- 강제 나가기 ---
  const handleForfeit = useCallback(() => {
    stopRunning();
    resetRunning();
    router.replace('/');
  }, [stopRunning, resetRunning, router]);

  // --- 하단 종료 버튼 (꾹 누르기) ---
  const handleFinishPressIn = useCallback(() => {
    setIsFinishPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(finishProgressAnimation, { toValue: 1, duration: 3000, useNativeDriver: false }).start();
    finishTimeoutRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleForfeit();
    }, 3000);
  }, [handleForfeit, finishProgressAnimation]);

  const handleFinishPressOut = useCallback(() => {
    setIsFinishPressed(false);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    finishProgressAnimation.stopAnimation();
    finishProgressAnimation.setValue(0);
  }, [finishProgressAnimation]);

  // --- 네비게이션 이탈 시 경고 ---
  useEffect(() => {
    const handleBeforeRemove = (e: EventArg<'beforeRemove', true, { action: NavigationAction }>) => {
      if (!isActive && elapsedTime === 0) return;
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
    return () => navigation.removeListener('beforeRemove', handleBeforeRemove);
  }, [navigation, isActive, elapsedTime, handleForfeit]);

  // --- 최종 준비 여부 ---
  const isFullyLoaded = !!(trackInfo && mapRegion);

  // --- 렌더 ---
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
      {/* 상단바 */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>←</Text></TouchableOpacity>
      </View>

      {/* 지도/러닝 경로 */}
      <RunningMap
        path={smoothPath(path, 5)}
        isActive={isActive}
        initialRegion={mapRegion}
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
        <RunningStats totalDistance={calculateTotalDistance(path)} displaySpeed={currentSpeed} elapsedTime={elapsedTime} />
        <RunningControls
          isActive={isActive}
          isPaused={isPaused}
          elapsedTime={elapsedTime}
          isFinishPressed={isFinishPressed}
          finishProgress={0}
          progressAnimation={finishProgressAnimation}
          scaleAnimation={scaleAnimation}
          onMainPress={isActive || isPaused ? handlePauseResume : handleStart}
          onFinishPressIn={handleFinishPressIn}
          onFinishPressOut={handleFinishPressOut}
          isReady={isFullyLoaded}
        />
      </View>

      {/* 로딩 오버레이 */}
      {!isFullyLoaded && (
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
        onClose={() => { resetRunning(); setIsFinishModalVisible(false); router.replace('/'); }}
        onConfirm={() => { if (summaryData) { resetRunning(); router.replace({ pathname: '/summary', params: { data: JSON.stringify(summaryData) } }); } setIsFinishModalVisible(false); }}
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
