import { useRunning } from '@/context/RunningContext';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const useRunningLogic = () => {
  const { mode, trackDistance, trackId } = useLocalSearchParams<{
    mode?: string;
    trackDistance?: string;
    trackId?: string;
  }>();

  const trackKm = mode === 'track' && trackDistance ? parseFloat(trackDistance) : undefined;

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
    userLocation
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
    if (!isActive) return;
    
    if (mode === 'track' && sectionIndex < sections.length) {
      const sec = sections[sectionIndex];
      if (totalDistance >= sec.end) {
        Speech.speak(`${sec.name}입니다. 속도를 조절해주세요.`);
        setSectionIndex((prev) => prev + 1);
      }
    } else if (mode !== 'track' && totalDistance >= nextAnnounceKm) {
      const meters = Math.round(nextAnnounceKm * 1000);
      Speech.speak(`${meters}미터 지점에 도달했습니다.`);
      setNextAnnounceKm((prev) => prev + 0.1);
    }
  }, [totalDistance, isActive, mode, sectionIndex, sections.length, nextAnnounceKm]);

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
  };
};
