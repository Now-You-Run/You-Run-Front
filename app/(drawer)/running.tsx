import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Region } from 'react-native-maps';

import { AvatarOverlay } from '@/components/running/AvatarOverlay';
import { FinishModal } from '@/components/running/FinishModal';
import { RunningControls } from '@/components/running/RunningControls';
import { RunningMap } from '@/components/running/RunningMap';
import { RunningStats } from '@/components/running/RunningStats';
import { useAvatarPosition } from '@/hooks/useAvatarPosition';
import { useRunningLogic } from '@/hooks/useRunningLogic';
import { JSX } from 'react';

const avatarId: string = "686ece0ae610780c6c939703";

interface SummaryData {
  path: any[];
  totalDistance: number;
  elapsedTime: number;
  trackId?: string;
}

export default function RunningScreen(): JSX.Element {
  const router = useRouter();
  
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState<boolean>(false);
  const [isFinishPressed, setIsFinishPressed] = useState<boolean>(false);
  const [finishProgress, setFinishProgress] = useState<number>(0);
  const [finishCompleted, setFinishCompleted] = useState<boolean>(false);
  const [mapRegion, setMapRegion] = useState<Region | undefined>();
  const [initialLocationLoaded, setInitialLocationLoaded] = useState<boolean>(false);

  // 애니메이션 refs
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ 지도 및 아바타 준비 상태 관리
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [isAvatarConnected, setIsAvatarConnected] = useState<boolean>(false);

  const {
    isActive,
    isPaused,
    elapsedTime,
    path,
    totalDistance,
    displaySpeed,
    trackKm,
    mode,
    onMainPress: originalOnMainPress,
    handleFinish,
    resetRunning,
  } = useRunningLogic();

  const {
    avatarScreenPos,
    avatarReady,
    handleAvatarReady,
    updateAvatarPosition,
    setMapRef,
  } = useAvatarPosition();

  // 초기화 로직
  useEffect(() => {
    setIsFinishPressed(false);
    setFinishProgress(0);
    setSummaryData(null);
    setIsFinishModalVisible(false);
    console.log('🔄 러닝 화면 진입 - 상태 초기화 완료');
  }, []);

  // 러닝 상태 초기화
  useEffect(() => {
    resetRunning();
    console.log('🔄 러닝 상태 초기화');
  }, []);

  // ✅ 지도 준비 완료 시 mapRef 연결 및 상태 업데이트
  const handleMapReady = useCallback((mapRef: MapView | null) => {
    console.log('🗺️ 지도 준비 완료, mapRef 연결');
    setMapRef(mapRef);
    setIsMapReady(true);

    // 아바타도 연결되었는지 확인
    if (avatarReady) {
      setIsAvatarConnected(true);
    }
  }, [setMapRef, avatarReady]);

  // ✅ 아바타 준비 완료 시 연결 상태 업데이트
  useEffect(() => {
    if (avatarReady && isMapReady) {
      setIsAvatarConnected(true);
      console.log('🎭 아바타와 지도 모두 준비 완료');
    }
  }, [avatarReady, isMapReady]);

  // ✅ 러닝 시작 전 준비 상태 체크하는 함수
  const checkReadinessAndStart = useCallback(() => {
    console.log('🔍 러닝 시작 준비 상태 체크:', {
      initialLocationLoaded,
      isMapReady,
      isAvatarConnected,
      mapRegion: !!mapRegion
    });

    // 위치 정보가 로드되지 않은 경우
    if (!initialLocationLoaded || !mapRegion) {
      Alert.alert(
        "위치 로딩 중",
        "현재 위치 정보를 가져오는 중입니다. 잠시만 기다려주세요.",
        [{ text: "확인" }]
      );
      return;
    }

    // 지도가 준비되지 않은 경우
    if (!isMapReady) {
      Alert.alert(
        "지도 로딩 중",
        "지도를 준비하는 중입니다. 잠시만 기다려주세요.",
        [{ text: "확인" }]
      );
      return;
    }

    // 아바타가 연결되지 않은 경우
    if (!isAvatarConnected) {
      Alert.alert(
        "아바타 로딩 중",
        "3D 아바타를 준비하는 중입니다. 잠시만 기다려주세요.",
        [{ text: "확인" }]
      );
      return;
    }

    // 모든 준비가 완료된 경우 러닝 시작
    console.log('✅ 모든 준비 완료, 러닝 시작');
    originalOnMainPress();
  }, [
    initialLocationLoaded,
    isMapReady,
    isAvatarConnected,
    mapRegion,
    originalOnMainPress
  ]);

  // ✅ 조건부 러닝 시작 함수
  const onMainPress = useCallback(() => {
    // 이미 러닝 중이거나 일시정지 상태면 바로 실행
    if (isActive || isPaused) {
      originalOnMainPress();
      return;
    }

    // 러닝 시작 시에만 준비 상태 체크
    checkReadinessAndStart();
  }, [isActive, isPaused, checkReadinessAndStart, originalOnMainPress]);

  // 위치 권한 및 초기 설정
  useEffect(() => {
    const requestPermissions = async (): Promise<void> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("위치 권한 필요", "러닝을 기록하려면 위치 권한이 필요합니다.");
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const initialRegion: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setMapRegion(initialRegion);
        setInitialLocationLoaded(true);
        console.log('📍 초기 위치 설정 완료:', initialRegion);

        const initialCoord = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };

        setTimeout(() => {
          updateAvatarPosition(initialCoord, true);
        }, 1000);

      } catch (error) {
        console.error('위치 가져오기 실패:', error);
        Alert.alert("위치 오류", "현재 위치를 가져올 수 없습니다.");
      }
    };

    requestPermissions();
  }, [updateAvatarPosition]);

  // 자동 완료 체크
  const autoFinishRef = useRef(handleFinish);
  autoFinishRef.current = handleFinish;

  useEffect(() => {
    if (isActive && mode === 'track' && trackKm && totalDistance >= trackKm) {
      console.log('🏁 목표 거리 도달, 자동 완료 처리');
      const data = autoFinishRef.current();
      setSummaryData(data);
      setIsFinishModalVisible(true);
    }
  }, [totalDistance, isActive, mode, trackKm]);

  const handleBackPress = (): void => {
    if (elapsedTime > 0) {
      Alert.alert(
        "러닝 중단",
        "진행 중인 러닝 기록이 사라집니다. 정말로 나가시겠습니까?",
        [
          { text: "취소", style: "cancel" },
          { text: "나가기", style: "destructive", onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // handleFinish 참조를 안정화
  const finishRef = useRef(handleFinish);
  finishRef.current = handleFinish;

  const startFinishPress = useCallback((): void => {
    console.log('🔴 종료 프로세스 시작');
    setIsFinishPressed(true);
    setFinishProgress(0);
    setFinishCompleted(false);

    // 즉시 진동 피드백
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 버튼 스케일 애니메이션
    Animated.spring(scaleAnimation, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 3,
    }).start();

    // 프로그레스 애니메이션
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    // 진행률 업데이트 및 중간 진동
    let progress = 0;
    finishIntervalRef.current = setInterval(() => {
      progress += 1;
      setFinishProgress(progress);

      // 33%, 66%에서 추가 진동
      if (progress === 33 || progress === 66) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log(`🔴 진행률 ${progress}% - 중간 진동`);
      }

      if (progress >= 100) {
        console.log('🔴 종료 프로세스 완료');
        // 완료 시 강한 진동
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setFinishCompleted(true);
        const data = finishRef.current();
        setSummaryData(data);
        setIsFinishModalVisible(true);

        // 정리
        cleanupFinishProcess();
      }
    }, 30);

    // 3초 후 자동 완료 (안전장치)
    timeoutRef.current = setTimeout(() => {
      if (!finishCompleted) {
        console.log('🔴 종료 프로세스 타임아웃 완료');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setFinishCompleted(true);
        const data = finishRef.current();
        setSummaryData(data);
        setIsFinishModalVisible(true);

        cleanupFinishProcess();
      }
    }, 3000);
  }, [progressAnimation, scaleAnimation]);

  const cancelFinishPress = useCallback((): void => {
    console.log('🔴 종료 프로세스 취소');

    // 이미 완료된 경우 취소하지 않음
    if (finishCompleted) {
      console.log('🔴 이미 완료된 종료 프로세스 - 취소 무시');
      return;
    }

    setIsFinishPressed(false);
    setFinishProgress(0);

    // 취소 진동
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 애니메이션 리셋
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 3,
    }).start();

    progressAnimation.setValue(0);

    // 타이머 정리
    cleanupFinishProcess();

    // 취소 안내 메시지 (진행률에 따라 다르게)
    if (finishProgress > 10) {
      Alert.alert('종료 취소', '러닝 종료가 취소되었습니다.', [{ text: '확인' }]);
    }
  }, [progressAnimation, scaleAnimation, finishCompleted, finishProgress]);

  const cleanupFinishProcess = useCallback((): void => {
    if (finishIntervalRef.current) {
      clearInterval(finishIntervalRef.current);
      finishIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 애니메이션 상태 초기화
    setTimeout(() => {
      setIsFinishPressed(false);
      setFinishProgress(0);
      progressAnimation.setValue(0);
      scaleAnimation.setValue(1);
    }, 100);
  }, [progressAnimation, scaleAnimation]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (finishIntervalRef.current) {
        clearInterval(finishIntervalRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ 위치 로딩 상태 표시 */}
      {!initialLocationLoaded && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>위치 정보 가져오는 중...</Text>
            <Text style={styles.loadingSubtext}>GPS 신호를 수신하고 있습니다</Text>
          </View>
        </View>
      )}

      {/* 지도 */}
      {initialLocationLoaded && mapRegion && (
        <RunningMap
          path={path}
          isActive={isActive}
          initialRegion={mapRegion}
          onAvatarPositionUpdate={updateAvatarPosition}
          onMapReady={handleMapReady}
        />
      )}

      {/* ✅ 지도 로딩 상태 표시 */}
      {initialLocationLoaded && !isMapReady && (
        <View style={styles.mapLoadingOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>지도 로딩 중...</Text>
            <Text style={styles.loadingSubtext}>지도를 준비하고 있습니다</Text>
          </View>
        </View>
      )}

      {/* 아바타 */}
      {initialLocationLoaded && (
        <AvatarOverlay
          screenPos={avatarScreenPos}
          isRunning={isActive}
          speed={displaySpeed}
          avatarId={avatarId}
          onAvatarReady={handleAvatarReady}
        />
      )}

      {/* ✅ 아바타 로딩 상태 표시 */}
      {initialLocationLoaded && isMapReady && !isAvatarConnected && (
        <View style={styles.avatarLoadingOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>아바타 로딩 중...</Text>
            <Text style={styles.loadingSubtext}>3D 아바타를 준비하고 있습니다</Text>
          </View>
        </View>
      )}

      {/* 디버깅용 마커 */}
      {__DEV__ && avatarScreenPos && (
        <View>
          <View
            style={{
              position: 'absolute',
              left: avatarScreenPos.x - 5,
              top: avatarScreenPos.y - 5,
              width: 10,
              height: 10,
              backgroundColor: 'red',
              borderRadius: 5,
              zIndex: 1000,
            }}
          />
          <Text
            style={{
              position: 'absolute',
              left: avatarScreenPos.x + 10,
              top: avatarScreenPos.y - 20,
              color: 'red',
              fontSize: 12,
              fontWeight: 'bold',
              zIndex: 1001,
            }}
          >
            GPS
          </Text>
        </View>
      )}

      {/* 하단 오버레이 */}
      <View style={[styles.overlay, { paddingBottom: 40 }]}>
        <RunningStats
          totalDistance={totalDistance}
          displaySpeed={displaySpeed}
          elapsedTime={elapsedTime}
        />

        <RunningControls
          isActive={isActive}
          isPaused={isPaused}
          elapsedTime={elapsedTime}
          isFinishPressed={isFinishPressed}
          finishProgress={finishProgress}
          progressAnimation={progressAnimation}
          scaleAnimation={scaleAnimation}
          onMainPress={onMainPress} // ✅ 수정된 함수 사용
          onFinishPressIn={startFinishPress}
          onFinishPressOut={cancelFinishPress}
          isReady={initialLocationLoaded && isMapReady && isAvatarConnected} // ✅ 준비 상태 전달
        />
      </View>

      {/* 완료 모달 */}
      <FinishModal
        visible={isFinishModalVisible}
        summaryData={summaryData}
        onClose={() => setIsFinishModalVisible(false)}
        onConfirm={() => {
          if (summaryData) {
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
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  headerBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 24,
    color: '#333'
  },
  overlay: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    zIndex: 1000
  },
  // ✅ 로딩 관련 스타일 추가
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    zIndex: 1500,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    zIndex: 1500,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
