// @/hooks/useFinishDetection.ts

import { Coordinate } from '@/types/TrackDto';
import { TRACK_CONSTANTS } from '@/utils/Constants';
import { haversineDistance } from '@/utils/RunningUtils';
import * as Speech from 'expo-speech';
import { useEffect, useRef } from 'react';

// 결합된 훅의 Props 인터페이스
interface UseFinishDetectionProps {
  // ✅ 1. 진행률 계산의 기준이 되는 값들
  userProgressMeters: number;    // 트랙 경로에 투영된 사용자의 진행 거리 (미터)
  trackDistanceMeters: number;   // 트랙의 공식 총 거리 (미터)

  // ✅ 2. 물리적 위치 확인을 위한 값들
  userLocation: Coordinate | null; // 사용자의 현재 실시간 GPS 위치
  externalPath: Coordinate[];      // 트랙의 전체 경로 배열

  // ✅ 3. 훅의 동작을 제어하는 값들
  isActive: boolean;               // 현재 러닝이 활성화 상태인지 여부
  onFinish: () => void;            // 완주 시 호출될 콜백 함수
}

export const useFinishDetection = ({
  userProgressMeters,
  trackDistanceMeters,
  userLocation,
  externalPath,
  isActive,
  onFinish,
}: UseFinishDetectionProps) => {
  // 완주 상태를 저장하는 ref (리렌더링 방지)
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    // --- 완주 판정을 시작하기 위한 사전 조건 확인 ---
    if (
      !isActive ||              // 러닝 중이 아니면 실행 안함
      !userLocation ||          // 사용자 위치가 없으면 실행 안함
      !externalPath?.length ||  // 트랙 경로가 없으면 실행 안함
      trackDistanceMeters === 0 || // 트랙 총 거리가 0이면 실행 안함
      hasFinishedRef.current    // 이미 완주 처리가 되었으면 실행 안함
    ) {
      return;
    }

    // --- 완주 조건 로직 ---

    // 조건 1: 사용자의 진행률이 트랙 총 거리의 99% 이상인가?
    const isProgressSufficient = userProgressMeters >= trackDistanceMeters * 0.99;

    // 조건 2: 사용자의 실제 위치가 트랙의 도착점 반경 내에 있는가?
    const finishPoint = externalPath[externalPath.length - 1];
    const distanceToFinishMeters = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      finishPoint.latitude,
      finishPoint.longitude
    ) * 1000;
    const isNearFinishLine = distanceToFinishMeters <= TRACK_CONSTANTS.FINISH_RADIUS_METERS;

    // 최종 판정: 두 조건이 모두 참일 때 완주로 처리
    if (isProgressSufficient && isNearFinishLine) {
      console.log('🏁 완주 조건 충족! (진행률 및 도착점 근접)');
      hasFinishedRef.current = true; // 중복 호출 방지를 위해 플래그 설정
      Speech.speak('완주를 축하합니다!');
      onFinish(); // 부모 컴포넌트에 완주 사실 알림
    }
  }, [
    userProgressMeters,
    trackDistanceMeters,
    userLocation,
    externalPath,
    isActive,
    onFinish,
  ]);

  // (선택사항) 부모 컴포넌트에서 완주 상태를 초기화할 필요가 있을 경우를 대비한 함수
  const resetFinish = () => {
    hasFinishedRef.current = false;
  };

  return {
    hasFinished: hasFinishedRef.current,
    resetFinish,
  };
};
