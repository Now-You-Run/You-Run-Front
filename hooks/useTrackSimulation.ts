import { Coordinate } from '@/types/TrackDto';
import { createPathTools } from '@/utils/PathTools';
import { paceToKmh } from '@/utils/RunningUtils';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTrackSimulationProps {
  externalPath: Coordinate[];
  botPace: { minutes: number; seconds: number };
  isSimulating: boolean;
  pausedPosition?: Coordinate | null;
}

export const useTrackSimulation = ({
  externalPath,
  botPace,
  isSimulating,
  pausedPosition
}: UseTrackSimulationProps) => {
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null);
  const [startCoursePosition, setStartCoursePosition] = useState<Coordinate | null>(null);
  const [endCoursePosition, setEndCoursePosition] = useState<Coordinate | null>(null);
  const animationFrameId = useRef<number | null>(null);
  // 봇 진행 상태(거리, 시간) 저장
  const progressRef = useRef<{ distance: number; startIndex: number }>({ distance: 0, startIndex: 0 });
  const [savedProgress, setSavedProgress] = useState<{ distance: number; startIndex: number } | null>(null);

  // 시작점과 끝점 설정
  useEffect(() => {
    if (externalPath && externalPath.length > 0) {
      setStartCoursePosition(externalPath[0]);
      setEndCoursePosition(externalPath[externalPath.length - 1]);
      setCurrentPosition(externalPath[0]);
    }
  }, [externalPath]);

  // 봇 시뮬레이션 로직
  useEffect(() => {
    if (!externalPath || externalPath.length === 0) return;
    // 시뮬레이션 중지 시 진행 상태를 저장한 뒤 cleanup
    if (!isSimulating) {
      // 1) 현재 progressRef를 savedProgress에 저장
      setSavedProgress(progressRef.current);
      // 2) 애니메이션만 정리
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }

    // 일시정지 후 재개 시 저장된 진행 상태에서 시작
    let startIndex = 0;
    let startDistance = 0;
    if (savedProgress) {
      startIndex = savedProgress.startIndex;
      startDistance = savedProgress.distance;
    } else if (pausedPosition) {
      // 일시정지된 위치에서 재시작할 경우 가장 가까운 인덱스 찾기
      let minD = Infinity;
      externalPath.forEach((p, i) => {
        const d = Math.sqrt(
          Math.pow((p.latitude - pausedPosition.latitude) * 111000, 2) +
          Math.pow((p.longitude - pausedPosition.longitude) * 111000, 2)
        );
        if (d < minD) {
          minD = d;
          startIndex = i;
        }
      });
    }

    const simPath = externalPath.slice(startIndex);
    const tools = createPathTools(simPath);
    const speedMps = paceToKmh(botPace.minutes, botPace.seconds) / 3.6; // m/s

    // 진행 상태 복원
    let initialDistance = startDistance;
    setCurrentPosition(pausedPosition    // 1) pausedPosition이 있으면 그 지점에서
      ? pausedPosition 
      : savedProgress                // 2) savedProgress가 있으면 그 인덱스 근처에서
        ? tools.getCoordinateAt(savedProgress.distance)
        : simPath[0]                // 3) 둘 다 없으면 코스 시작점에서 시작
      );
    let startTime: number | null = null;
    animationFrameId.current = requestAnimationFrame(function animate(ts) {
      if (!startTime) startTime = ts;
      const elapsedSec = (ts - startTime) / 1000;
      const dist = initialDistance + elapsedSec * speedMps;

      progressRef.current = { distance: dist, startIndex };

      if (dist >= tools.totalDistance) {
        setCurrentPosition(tools.getCoordinateAt(tools.totalDistance));
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }
        return;
      }
      setCurrentPosition(tools.getCoordinateAt(dist));
      animationFrameId.current = requestAnimationFrame(animate);
    });

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [externalPath, botPace, isSimulating, pausedPosition, savedProgress]);

  // 일시정지 시 진행 상태 저장
  const pauseSimulation = useCallback(() => {
    setSavedProgress(progressRef.current);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);

  // 재개 시 진행 상태 복원
  const resumeSimulation = useCallback(() => {
    // savedProgress는 useEffect에서 자동으로 반영됨
    // 여기서는 별도 동작 필요 없음
  }, []);

  const stopSimulation = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    setCurrentPosition(null);
    setSavedProgress(null);
  }, []);

  const resetSimulation = useCallback(() => {
    stopSimulation();
    if (externalPath && externalPath.length > 0) {
      setCurrentPosition(externalPath[0]);
    }
    setSavedProgress(null);
  }, [externalPath, stopSimulation]);

  return {
    currentPosition,
    startCoursePosition,
    endCoursePosition,
    stopSimulation,
    resetSimulation,
    pauseSimulation,
    resumeSimulation,
  };
};
