import { useRunning } from '@/context/RunningContext';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const useRunningLogic = (
  botDistanceMeters?: number,
  isAhead?: boolean,
  externalTrackKm?: number,
  externalMode?: 'track' | 'match' | 'free'
) => {
  const { mode: paramMode, trackDistance, trackId } = useLocalSearchParams<{
    mode?: 'track' | 'match' | 'free';
    trackDistance?: string;
    trackId?: string;
  }>();

  const mode: 'track' | 'match' | 'free' = (externalMode ?? paramMode ?? 'free') as 'track' | 'match' | 'free';
  const trackKm = externalTrackKm ?? (mode === 'track' && trackDistance ? parseFloat(trackDistance) : undefined);

  const {
    isActive,
    elapsedTime,
    path,
    currentSpeed,
    totalDistance,
    startRunning,
    stopRunning,
    pauseRunning,
    resumeRunning,
    resetRunning,
    addStartPointIfNeeded,
    userLocation,
    setUserLocation,
  } = useRunning();

  const [sectionIndex, setSectionIndex] = useState(0);
  const [nextAnnounceKm, setNextAnnounceKm] = useState(0.1);
  const [isPaused, setIsPaused] = useState(false);


  const sections = useMemo(() => {
    if (mode === 'track' && trackKm) {
      return [
        { name: '본격 구간', end: trackKm * 0.2 },
        { name: '마무리 구간', end: trackKm * 0.8 },
      ];
    }
    return [];
  }, [mode, trackKm]);

  const displaySpeed = currentSpeed > 0.1 ? currentSpeed : 0;

  // ✅ 안정적인 함수 참조를 위한 ref 사용
  const callbacksRef = useRef({
    startRunning,
    stopRunning,
    pauseRunning,
    resumeRunning,
    resetRunning,
    addStartPointIfNeeded,
  });

  // ✅ 함수 참조 업데이트 (의존성 배열 없음)
  callbacksRef.current = {
    startRunning,
    stopRunning,
    pauseRunning,
    resumeRunning,
    resetRunning,
    addStartPointIfNeeded,
  };

  const onMainPress = useCallback(async () => {
    const callbacks = callbacksRef.current;
    
    if (isActive) {
      callbacks.pauseRunning();
      setIsPaused(true);
      Speech.speak('일시 정지 합니다.');
    } else if (isPaused) {
      callbacks.resumeRunning();
      setIsPaused(false);
      Speech.speak('러닝을 재개합니다.');
    } else {
      callbacks.resetRunning();
      callbacks.startRunning();
      setIsPaused(false);
      setSectionIndex(0);
      setNextAnnounceKm(0.1);
      await callbacks.addStartPointIfNeeded();
      Speech.speak('러닝을 시작합니다.');
              if (mode === 'track') {
          Speech.speak('웜업 구간입니다. 속도를 조절해주세요.');
        } else if (mode === 'match') {
          // 매치 모드 시작 음성은 MatchRunningScreen에서 직접 처리
        }
    }
  }, [isActive, isPaused, mode]);

  const handleFinish = useCallback(() => {
    callbacksRef.current.stopRunning();
    Speech.speak('러닝을 종료합니다.');
    const snapshot = {
      path: [...path],
      totalDistance,
      elapsedTime,
      trackId,
    };
    return snapshot;
  }, [path, totalDistance, elapsedTime, trackId]);

  // ✅ 음성 안내 로직 - 최소 의존성
  useEffect(() => {
    console.log('trackKm:', trackKm, 'sections:', sections, 'sectionIndex:', sectionIndex, 'totalDistance:', totalDistance, 'mode:', mode);
    if (!isActive) return;
    
    if (mode === 'track' && sectionIndex < sections.length) {
      const sec = sections[sectionIndex];
      if (totalDistance >= sec.end) {
        Speech.speak(`${sec.name}입니다. 속도를 조절해주세요.`);
        // 구간 안내와 함께 추월 안내도 추가
        if (typeof isAhead === 'boolean') {
          const getAheadText = () => {
            if (!isAhead) return '당신이 앞서고 있습니다.';
            // 매치 모드일 때는 상대방, 트랙 모드일 때는 봇으로 안내
            return externalMode === 'match' ? '상대방이 앞서고 있습니다.' : '봇이 앞서고 있습니다.';
          };
          Speech.speak(getAheadText());
        }
        setSectionIndex((prev) => prev + 1);
      }
    } else if (mode !== 'track' && totalDistance >= nextAnnounceKm) {
      const meters = Math.round(nextAnnounceKm * 1000);
      Speech.speak(`${meters}미터 지점에 도달했습니다.`);
      setNextAnnounceKm((prev) => prev + 0.1);
    }
  }, [totalDistance, isActive, mode, sectionIndex, sections.length, nextAnnounceKm, isAhead]);

  // 봇 거리 음성 안내 관련 상태
  const lastBotAnnounceStep = useRef<number | null>(null);
  const lastIsAhead = useRef<boolean | null>(null);

  // 러닝이 비활성화될 때 봇 안내 상태 초기화
  useEffect(() => {
    if (!isActive) {
      lastBotAnnounceStep.current = null;
      lastIsAhead.current = null;
    }
  }, [isActive]);

  // 100m마다 거리만 안내 (트랙 모드에서만, 매치 모드는 MatchRunningScreen에서 처리)
  const announcedSteps = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!isActive || externalMode === 'match') {
      announcedSteps.current.clear();
      return; // 러닝 종료 시 또는 매치 모드일 때 안내 로직 실행하지 않음
    }
    if (
      typeof botDistanceMeters === 'number' &&
      botDistanceMeters >= 0 &&
      totalDistance > 0.1 // 100m 이상 이동한 경우에만 안내
    ) {
      const currentStep = Math.floor(botDistanceMeters / 100);
      if (!announcedSteps.current.has(currentStep)) {
        Speech.speak(`봇과의 거리는 약 ${Math.round(botDistanceMeters)}미터.`);
        announcedSteps.current.add(currentStep);
      }
    }
  }, [botDistanceMeters, isActive, totalDistance, externalMode]);

  // 🆕 매치 모드 거리 안내는 MatchRunningScreen에서 직접 처리하므로 제거

  return {
    isActive,
    isPaused,
    elapsedTime,
    path,
    totalDistance,
    displaySpeed,
    trackKm,
    mode,
    onMainPress,
    handleFinish,
    resetRunning: callbacksRef.current.resetRunning,
    setSectionIndex,
    setNextAnnounceKm,
    setIsPaused,
    userLocation,
    setUserLocation,
    pauseRunning: callbacksRef.current.pauseRunning,
    resumeRunning: callbacksRef.current.resumeRunning,
  };
};