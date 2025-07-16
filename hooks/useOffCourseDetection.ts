import { Coordinate } from '@/types/TrackDto';
import { TRACK_CONSTANTS } from '@/utils/Constants';
import { haversineDistance } from '@/utils/RunningUtils';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef } from 'react';

interface UseOffCourseDetectionProps {
  externalPath: Coordinate[];
  userLocation: Coordinate | null;
  isActive: boolean;
  onPause: () => void;
  onResume: () => void;
  onOffCourse: (position: Coordinate | null) => void;
  threshold?: number;
}

export const useOffCourseDetection = ({
  externalPath,
  userLocation,
  isActive,
  onPause,
  onResume,
  onOffCourse,
  threshold = TRACK_CONSTANTS.OFFCOURSE_THRESHOLD_M
}: UseOffCourseDetectionProps) => {
  const offCourseRef = useRef(false);

  useEffect(() => {
    if (!externalPath?.length || !userLocation) return;

    // 코스 상의 모든 점과의 최소 거리 계산
    let minDistM = Infinity;
    for (const p of externalPath) {
      const dKm = haversineDistance(
        p.latitude, p.longitude,
        userLocation.latitude, userLocation.longitude
      );
      minDistM = Math.min(minDistM, dKm * 1000);
    }

    // 이탈 감지
    if (minDistM > threshold && !offCourseRef.current) {
      Speech.speak('트랙을 이탈했습니다. 복귀해주세요. 기록을 일시정지합니다.');
      offCourseRef.current = true;
      onOffCourse(userLocation);
      onPause();
    }
    // 복귀 감지
    else if (minDistM <= threshold && offCourseRef.current) {
      Speech.speak('트랙으로 돌아왔습니다. 러닝을 재개합니다.');
      offCourseRef.current = false;
      onResume();
    }
  }, [userLocation, externalPath,threshold, onPause, onResume, onOffCourse]);

  const resetOffCourse = useCallback(() => {
    offCourseRef.current = false;
  }, []);

  return {
    isOffCourse: offCourseRef.current,
    resetOffCourse,
  };
};
