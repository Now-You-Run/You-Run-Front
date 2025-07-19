import { fetchCurrentAvatar } from '@/api/user';
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
import { calculateTrackDistance, haversineDistance } from '@/utils/RunningUtils';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Region } from 'react-native-maps';

function BotRunningScreenInner({ isTestMode, setIsTestMode }: { isTestMode: boolean, setIsTestMode: (v: boolean) => void }) {
  // 🧪 테스트 모드 상태는 최상단에 선언
  // const [testMode, setTestMode] = useState(isTestMode); // 제거
  // 대신 isTestMode, setIsTestMode prop 사용
  const router = useRouter();
  const navigation = useNavigation();
  const { trackId, botMin, botSec, source } = useLocalSearchParams<{ trackId?: string; botMin?: string; botSec?: string; source: string }>();

  // useRunning에서 path 등 필요한 값 먼저 가져오기
  const runningContext = useRunning();
  const { path, startLocationTracking, stopLocationTracking, addToPath, startRunning, setCurrentSpeed } = runningContext;

  // 트랙 정보
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>();
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // 아바타 포지션
  const { avatarScreenPos, handleAvatarReady, updateAvatarPosition, setMapRef, avatarReady } = useAvatarPosition();

  // 🆕 위치 업데이트 중복 방지를 위한 디바운싱
  const locationUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 🆕 음성 안내 우선순위 처리
  const speakWithPriority = useCallback((text: string, priority: 'high' | 'low' = 'low') => {
    if (priority === 'high') {
      Speech.stop(); // 기존 음성 중단
      setTimeout(() => Speech.speak(text), 100);
    } else {
      // 낮은 우선순위는 기존 음성이 끝난 후 재생
      Speech.speak(text);
    }
  }, []);

  // 봇 페이스/시뮬레이션
  const botPace = useMemo(() => ({
    minutes: botMin ? parseInt(botMin, 10) : 0,
    seconds: botSec ? parseInt(botSec, 10) : 0
  }), [botMin, botSec]);
  const isSimulating = runningContext?.isActive && !!trackInfo && !!mapRegion && !!runningContext?.userLocation;
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

  // 러닝 로직 (botTrackDistance를 인자로 넘기고 한 번만 호출)
  const runningLogic = useRunningLogic(
    botTrackDistance.distanceMeters,
    botTrackDistance.isAhead,
    trackInfo?.distanceMeters ? trackInfo.distanceMeters / 1000 : undefined,
    'track' // 트랙 모드임을 명시
  );
  const {
    isActive,
    isPaused,
    elapsedTime,
    totalDistance,
    displaySpeed,
    onMainPress,
    handleFinish,
    userLocation,
    resetRunning,
    setUserLocation,
    pauseRunning,
    resumeRunning,
  } = runningLogic;

  // 🆕 위치 업데이트 중복 방지를 위한 디바운싱 함수
  const debouncedSetUserLocation = useCallback((coord: any) => {
    if (locationUpdateTimeoutRef.current) {
      clearTimeout(locationUpdateTimeoutRef.current);
    }
    
    locationUpdateTimeoutRef.current = setTimeout(() => {
      setUserLocation(coord);
    }, 50); // 50ms 디바운싱
  }, [setUserLocation]);

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
      Speech.stop(); // 모든 음성 안내 중단
      speakWithPriority('러닝이 종료되었습니다.', 'high');
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
  // customOnMainPress에서만 트랙 시작점 이동/초기화
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
      // 테스트 모드: 트랙 시작점으로 완전 초기화 후 러닝 시작
      resetRunning();
      const startCoord = { ...startPoint, timestamp: Date.now() };
      setUserLocation(startCoord);
      addToPath(startCoord);
      accIdxRef.current = 0;
      lastCoordRef.current = startCoord;
      speakWithPriority("러닝을 시작합니다.", 'high');
      speakWithPriority("웜업 구간입니다. 속도를 조절해주세요.", 'low');
      startRunning();
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
  }, [isActive, isPaused, onMainPress, trackInfo, userLocation, isTestMode, setUserLocation, resetRunning, addToPath, startRunning]);

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

  // 도착점 반경(m)
  const FINISH_RADIUS_METERS = 15;

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
      Speech.stop(); // 도착점 도달 시 모든 음성 안내 중단
      speakWithPriority('완주를 축하합니다!', 'high');
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

  // 뒤로가기(하드웨어/제스처) 방지 및 얼럿 처리
  useEffect(() => {
    const handleBeforeRemove = (e: any) => {
      // 정상 종료(완주, 러닝 종료 등) 시에는 얼럿 없이 바로 나감
      if (!isActive && !isPaused && elapsedTime === 0) {
        return;
      }
      e.preventDefault();
      Alert.alert(
        '정말 나가시겠습니까?',
        '진행 중인 러닝이 종료됩니다.',
        [
          { text: '취소', style: 'cancel', onPress: () => {} },
          {
            text: '나가기',
            style: 'destructive',
            onPress: () => {
              resetRunning();
              stopSimulation();
              setIsFinishModalVisible(false);
              setIsFinishPressed(false);
              finishProgressAnimation.setValue(0);
              scaleAnimation.setValue(1);
              router.replace('/');
            },
          },
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
              resetRunning();
              stopSimulation();
              setIsFinishModalVisible(false);
              setIsFinishPressed(false);
              finishProgressAnimation.setValue(0);
              scaleAnimation.setValue(1);
              router.replace('/');
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
  }, [navigation, isActive, isPaused, elapsedTime, resetRunning, stopSimulation, setIsFinishModalVisible, setIsFinishPressed, finishProgressAnimation, scaleAnimation, router]);

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
    if (!trackInfo?.path || trackInfo.path.length < 2) {
      console.log('🧪 테스트 모드 - 인터벌 시작 실패: 트랙 경로 없음');
      return;
    }
    if (fakeLocationIntervalRef.current) {
      console.log('🧪 테스트 모드 - 기존 인터벌 정리');
      clearInterval(fakeLocationIntervalRef.current);
    }

    console.log('🧪 테스트 모드 - 인터벌 시작');
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
      // 마지막 점에 도달했는지 확인
      if (idx >= trackInfo.path.length - 1) {
        // 마지막 점으로 정확히 이동
        prevCoord = { ...trackInfo.path[trackInfo.path.length - 1], timestamp: Date.now() };
        idx = trackInfo.path.length - 1;
        console.log('🏁 봇 모드 테스트 - 마지막 점 도달:', idx, '/', trackInfo.path.length - 1);
      }
      accIdxRef.current = idx;
      lastCoordRef.current = prevCoord;
      debouncedSetUserLocation(prevCoord);
      addToPath(prevCoord);
      updateAvatarPosition(prevCoord, false);
      setCurrentSpeed(testSpeedKmh);
      prevTimestamp = Date.now();
      
      console.log(`🧪 테스트 모드 - 위치 업데이트: 인덱스 ${idx}/${trackInfo.path.length - 1}, 좌표: ${prevCoord.latitude.toFixed(6)}, ${prevCoord.longitude.toFixed(6)}`);
    }, 1000) as any;
  }, [trackInfo?.path, isActive, isPaused, setUserLocation, addToPath, updateAvatarPosition, setCurrentSpeed, testSpeedKmh]);

  // 🧪 러닝 처음 시작할 때만 진행 상태 초기화 + setInterval 시작
  // 러닝 시작(테스트 모드) 시에는 중복 setUserLocation/addToPath 하지 않도록 분기
  const startFakeTrackMovement = useCallback(() => {
    if (!trackInfo?.path || trackInfo.path.length < 2) {
      console.log('🧪 테스트 모드 - 트랙 경로 없음');
      return;
    }
    
    // 이미 트랙 시작점으로 초기화된 상태라면 중복 세팅하지 않음
    if (accIdxRef.current === 0 && lastCoordRef.current && 
        lastCoordRef.current.latitude === trackInfo.path[0].latitude && 
        lastCoordRef.current.longitude === trackInfo.path[0].longitude) {
      console.log('🧪 테스트 모드 - 이미 시작점에 있음, 러닝만 시작');
      startRunning(); // 러닝 상태만 활성화
      startFakeTrackInterval();
      return;
    }
    
    console.log('🧪 테스트 모드 - 시작점 초기화 및 러닝 시작');
    accIdxRef.current = 0;
    lastCoordRef.current = { ...trackInfo.path[0], timestamp: Date.now() };
    debouncedSetUserLocation(lastCoordRef.current);
    addToPath(lastCoordRef.current);
    startRunning();
    startFakeTrackInterval();
  }, [trackInfo?.path, setUserLocation, addToPath, startRunning, startFakeTrackInterval]);

  // 🧪 테스트 모드 이동 제어
  useEffect(() => {
    // 러닝 처음 시작할 때만 진행 상태 초기화 + setInterval 시작
    if (isTestMode && isActive && !prevActiveRef.current && accIdxRef.current === 0) {
      console.log('🧪 테스트 모드 - 러닝 시작');
      startFakeTrackMovement();
    }
    prevActiveRef.current = isActive;
    // 일시정지/재개 시에는 setInterval만 멈추거나 재시작
    if ((!isTestMode || !isActive || isPaused) && fakeLocationIntervalRef.current) {
      console.log('🧪 테스트 모드 - 인터벌 정지');
      clearInterval(fakeLocationIntervalRef.current);
      fakeLocationIntervalRef.current = null;
    }
    // 재개 시에는 진행 상태(accIdxRef, lastCoordRef)는 그대로 두고 setInterval만 새로 시작
    if (isTestMode && isActive && !isPaused && !fakeLocationIntervalRef.current && accIdxRef.current > 0) {
      console.log('🧪 테스트 모드 - 인터벌 재시작');
      startFakeTrackInterval(); // 진행 상태는 그대로, setInterval만 새로 시작
    }
  }, [isTestMode, isActive, isPaused]);

  // 🧪 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (fakeLocationIntervalRef.current) {
        clearInterval(fakeLocationIntervalRef.current);
        fakeLocationIntervalRef.current = null;
      }
      if (locationUpdateTimeoutRef.current) {
        clearTimeout(locationUpdateTimeoutRef.current);
        locationUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  // 지도 준비 상태: 트랙 정보와 지도 영역이 모두 준비되었을 때 true
  const isMapReady = !!(trackInfo && mapRegion);

  // 현재 선택된 아바타 상태 관리
  const [currentAvatar, setCurrentAvatar] = useState<{ id: string; glbUrl: string } | null>(null);

  // 컴포넌트 마운트 시 현재 아바타 정보 가져오기
  useEffect(() => {
    const loadCurrentAvatar = async () => {
      try {
        const avatarData = await fetchCurrentAvatar();
        setCurrentAvatar({
          id: avatarData.id,
          glbUrl: avatarData.glbUrl
        });
      } catch (error) {
        console.error('Failed to fetch current avatar:', error);
      }
    };
    loadCurrentAvatar();
  }, []);

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
      <View style={styles.headerBarRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        {/* 테스트 모드 UI */}
        <View style={styles.testModeBox}>
          <View style={styles.testModeRow}>
            <Text style={styles.testModeLabel}>🧪 테스트 모드</Text>
            <TouchableOpacity
              style={[
                styles.testModeToggle,
                { backgroundColor: isTestMode ? '#ff6b6b' : '#4ecdc4' }
              ]}
              onPress={() => setIsTestMode(!isTestMode)}
            >
              <Text style={styles.testModeToggleText}>
                {isTestMode ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
          {isTestMode && (
            <>
              <TouchableOpacity
                style={styles.startPointBtn}
                onPress={() => {
                  if (Array.isArray(trackInfo?.path) && trackInfo.path.length > 0) {
                    const startCoord = { ...trackInfo.path[0], timestamp: Date.now() };
                    debouncedSetUserLocation(startCoord);
                    addToPath(startCoord);
                    accIdxRef.current = 0;
                    lastCoordRef.current = startCoord;
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
          isRunning={isActive && !isPaused}
          speed={displaySpeed}
          avatarUrl={currentAvatar?.glbUrl || "https://models.readyplayer.me/686ece0ae610780c6c939703.glb"}
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
          Speech.stop(); // 모든 음성 안내 중단
          Speech.speak('러닝이 종료되었습니다.');
          resetRunning();
          stopSimulation();
          setIsFinishModalVisible(false);
          router.replace('/');
        }}
        onConfirm={() => {
          if (summaryData) {
            Speech.stop(); // 모든 음성 안내 중단
            Speech.speak('러닝이 종료되었습니다.');
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
  headerBarRow: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0, // 배경이 없으니 패딩 최소화
    minHeight: 60,
    backgroundColor: 'transparent', // 배경 제거
    borderRadius: 0, // 카드 느낌 제거
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: { fontSize: 24, color: '#333' },
  headerSpacer: {
    flex: 1,
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
  testModeBox: {
    marginLeft: 6,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff', // 더 진한 흰색
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3, // 안드로이드 그림자
    alignItems: 'center',
    minWidth: 110,
    maxWidth: 140,
  },
  testModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  testModeLabel: {
    fontWeight: 'bold',
    fontSize: 13,
    marginRight: 4,
  },
  testModeToggle: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  testModeToggleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  startPointBtn: {
    backgroundColor: '#888',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginVertical: 3,
    width: 90,
    alignItems: 'center',
  },
  startPointBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
  },
  speedControlVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  speedBtn: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 4,
  },
  speedValue: {
    fontSize: 13,
    fontWeight: 'bold',
    marginHorizontal: 4,
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
