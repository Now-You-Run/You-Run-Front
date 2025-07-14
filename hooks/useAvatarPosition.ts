import { Coordinate } from '@/types/TrackDto';
import { useCallback, useRef, useState } from 'react';
import MapView from 'react-native-maps';

export const useAvatarPosition = () => {
  const [avatarScreenPos, setAvatarScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [avatarReady, setAvatarReady] = useState<boolean>(false);
  
  // ref로 상태 관리하여 의존성 문제 해결
  const lastAvatarUpdateRef = useRef<number>(0);
  const avatarUpdateIntervalRef = useRef<number>(2000);
  const pendingAvatarUpdateRef = useRef<Coordinate | null>(null);
  const currentMapRef = useRef<MapView | null>(null);

  // mapRef를 외부에서 설정하는 함수
  const setMapRef = useCallback((ref: MapView | null) => {
    currentMapRef.current = ref;
    console.log('🗺️ mapRef 연결됨:', !!ref);
    
    // 대기 중인 업데이트가 있으면 처리
    if (ref && pendingAvatarUpdateRef.current) {
      updateAvatarPosition(pendingAvatarUpdateRef.current, true);
    }
  }, []);

  const updateAvatarPosition = useCallback((coord: Coordinate, force: boolean = false) => {
    console.log('🎭 아바타 위치 업데이트 시도:', coord, 'force:', force);
    
    if (!currentMapRef.current) {
      console.log('❌ mapRef가 아직 준비되지 않음');
      pendingAvatarUpdateRef.current = coord;
      return;
    }

    const now = Date.now();

    // 거리 기반 업데이트 체크
    if (!force && pendingAvatarUpdateRef.current) {
      const distance = Math.sqrt(
        Math.pow((coord.latitude - pendingAvatarUpdateRef.current.latitude) * 111000, 2) +
        Math.pow((coord.longitude - pendingAvatarUpdateRef.current.longitude) * 111000, 2)
      );

      if (distance < 10 && now - lastAvatarUpdateRef.current < avatarUpdateIntervalRef.current) {
        pendingAvatarUpdateRef.current = coord;
        return;
      }
    }

    try {
      currentMapRef.current
        .pointForCoordinate(coord)
        .then(({ x, y }: { x: number; y: number }) => {
          console.log('✅ 아바타 스크린 위치 계산 성공:', { x, y });
          setAvatarScreenPos({ x, y });
          lastAvatarUpdateRef.current = now;
          pendingAvatarUpdateRef.current = null;
        })
        .catch((error: any) => {
          console.error('❌ 아바타 위치 업데이트 실패:', error);
          setAvatarScreenPos(null);
        });
    } catch (error) {
      console.error('❌ 아바타 위치 계산 오류:', error);
    }
  }, []);

  const handleAvatarReady = useCallback(() => {
    console.log('🎭 아바타 준비 완료');
    setAvatarReady(true);
    
    // 아바타가 준비되면 대기 중인 업데이트 처리
    if (pendingAvatarUpdateRef.current && currentMapRef.current) {
      updateAvatarPosition(pendingAvatarUpdateRef.current, true);
    }
  }, [updateAvatarPosition]);

  return {
    avatarScreenPos,
    avatarReady,
    updateAvatarPosition,
    handleAvatarReady,
    setMapRef,
  };
};
