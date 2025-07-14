import { Coordinate } from '@/types/TrackDto';
import { useCallback, useRef, useState } from 'react';
import MapView from 'react-native-maps';

export const useAvatarPosition = () => {
  const [avatarScreenPos, setAvatarScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [avatarReady, setAvatarReady] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const enableAvatar = true;

  const setMapRef = useCallback((ref: MapView | null) => {
    mapRef.current = ref;
    console.log('🗺️ MapRef 연결:', !!ref);
  }, []);

  // ✅ 아바타 위치 업데이트 (정확도 향상)
  const updateAvatarPosition = useCallback((coord: Coordinate, force = false) => {
    if (!mapRef.current || !enableAvatar) {
      console.log('❌ 아바타 위치 업데이트 실패: mapRef 또는 enableAvatar 없음');
      return;
    }
    
    try {
      // 지도가 완전히 로드된 후에만 좌표 변환 실행
      const delay = force ? 150 : 50; // force일 때 더 긴 지연
      
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current
            .pointForCoordinate(coord)
            .then(({ x, y }) => {
              console.log('✅ 아바타 화면 위치 계산 성공:', { 
                x: Math.round(x), 
                y: Math.round(y), 
                coord: `${coord.latitude.toFixed(6)}, ${coord.longitude.toFixed(6)}` 
              });
              setAvatarScreenPos({ x, y });
            })
            .catch((error) => {
              console.log('❌ 아바타 위치 변환 실패:', error);
              setAvatarScreenPos(null);
            });
        }
      }, delay);
    } catch (error) {
      console.log('❌ 아바타 위치 계산 오류:', error);
      setAvatarScreenPos(null);
    }
  }, [enableAvatar]);

  const handleAvatarReady = useCallback(() => {
    setAvatarReady(true);
    console.log('🎭 아바타 준비 완료');
  }, []);

  return {
    avatarScreenPos,
    avatarReady,
    handleAvatarReady,
    updateAvatarPosition,
    setMapRef,
  };
};
