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
    if (!isSimulating) return;

    const pausedCoord = pausedPosition;

    // 일시정지된 위치에서 재시작할 경우 가장 가까운 인덱스 찾기
    let startIndex = 0;
    if (pausedCoord) {
      let minD = Infinity;
      externalPath.forEach((p, i) => {
        const d = Math.sqrt(
          Math.pow((p.latitude - pausedCoord.latitude) * 111000, 2) +
          Math.pow((p.longitude - pausedCoord.longitude) * 111000, 2)
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

    setCurrentPosition(pausedCoord ?? simPath[0]);

    let startTime: number | null = null;
    animationFrameId.current = requestAnimationFrame(function animate(ts) {
      if (!startTime) startTime = ts;
      const elapsedSec = (ts - startTime) / 1000;
      const dist = elapsedSec * speedMps;

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
  }, [externalPath, botPace, isSimulating, pausedPosition]);

  const stopSimulation = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    setCurrentPosition(null);
  }, []);

  const resetSimulation = useCallback(() => {
    stopSimulation();
    if (externalPath && externalPath.length > 0) {
      setCurrentPosition(externalPath[0]);
    }
  }, [externalPath, stopSimulation]);

  return {
    currentPosition,
    startCoursePosition,
    endCoursePosition,
    stopSimulation,
    resetSimulation,
  };
};
