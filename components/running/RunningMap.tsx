import { Coordinate } from '@/types/TrackDto';
import { haversineDistance } from '@/utils/RunningUtils';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RunningMapProps {
  // 필수 지도 데이터
  path: Coordinate[];
  isActive: boolean;
  userLocation: Coordinate | null;
  initialRegion?: Region;

  // 지도 위 오버레이 및 마커 데이터
  externalPath?: Coordinate[];
  botPosition?: Coordinate | null;
  startPosition?: Coordinate | null;
  endPosition?: Coordinate | null;
  isSimulating?: boolean;
  
  // 상위 컴포넌트와 통신하기 위한 콜백 함수
  onAvatarPositionUpdate: (coord: Coordinate, force?: boolean) => void;
  onMapReady?: (mapRef: MapView | null) => void;
}



export const RunningMap: React.FC<RunningMapProps> = React.memo(({
  path,
  isActive,
  initialRegion,
  onAvatarPositionUpdate,
  onMapReady,
  externalPath,
  botPosition,
  startPosition,
  endPosition,
  isSimulating,
  userLocation
}) => {
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();
  const lastUpdateRef = useRef<number>(0);
  
  // ✅ 카메라 자동 추적 제어
  const [autoCenter, setAutoCenter] = useState(true);
  const CAMERA_UPDATE_THRESHOLD_M = 20;  // 20m 이상 이동 시만 카메라 이동
  const CAMERA_UPDATE_INTERVAL = 3000;   // 3초에 한 번만 업데이트
  
  const lastCameraUpdateRef = useRef(Date.now());
  const lastCameraCoordRef = useRef<Coordinate | null>(null);

  // 경로 메모이제이션
  const memoizedPath = useMemo(() => path, [path.length]);

  // ✅ 조건부 카메라 업데이트 함수
  const updateCameraIfNeeded = useCallback((coord: Coordinate) => {
    if (!autoCenter) return;
    
    const now = Date.now();
    const prev = lastCameraCoordRef.current;

    const moved = !prev ? Infinity : 
      haversineDistance(
        prev.latitude, prev.longitude,
        coord.latitude, coord.longitude
      ) * 1000;

    if (
      moved > CAMERA_UPDATE_THRESHOLD_M ||
      now - lastCameraUpdateRef.current > CAMERA_UPDATE_INTERVAL
    ) {
      mapRef.current?.animateCamera({ 
        center: coord 
      }, { duration: 500 });
      
      lastCameraUpdateRef.current = now;
      lastCameraCoordRef.current = coord;
    }
  }, [autoCenter]);

  // ✅ 실시간 위치 업데이트 (카메라 추적 제한)
  useEffect(() => {
    if (path.length === 0) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 500) return;
    lastUpdateRef.current = now;

    const current = path[path.length - 1];

    // 조건부 카메라 업데이트
    updateCameraIfNeeded(current);

    // 아바타 위치는 항상 업데이트 (지연 추가로 정확도 향상)
    setTimeout(() => {
      onAvatarPositionUpdate(current, true);
    }, 100);

  }, [path.length, onAvatarPositionUpdate, updateCameraIfNeeded]);

  // 내 위치 버튼 핸들러
  const handleMyLocationPress = useCallback(() => {
    if (path.length === 0) return;
    
    const lastCoord = path[path.length - 1];
    mapRef.current?.animateCamera({
      center: lastCoord,
      zoom: 16,
    }, { duration: 500 });
    
    // 아바타 위치 강제 업데이트
    setTimeout(() => {
      onAvatarPositionUpdate(lastCoord, true);
    }, 600);
  }, [path, onAvatarPositionUpdate]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={false}
        followsUserLocation={false}
        showsMyLocationButton={false}
        rotateEnabled={true}
        pitchEnabled={false}
        zoomEnabled={true}
        scrollEnabled={true}
        onMapReady={() => {
          console.log('🗺️ 지도 준비 완료');
          if (onMapReady && mapRef.current) {
            onMapReady(mapRef.current);
          }
        }}
        onRegionChangeComplete={() => {
          // 지도 이동 시 아바타 위치 재계산
          if (path.length > 0) {
            const latestCoord = path[path.length - 1];
            setTimeout(() => {
              onAvatarPositionUpdate(latestCoord, true);
            }, 100);
          }
        }}
      >
        {/* ✅ 사용자 GPS 마커 (파란색 점) */}
        {userLocation && (
          <Marker 
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={10}
          >
            <View style={styles.userMarker} />
          </Marker>
        )}

        {/* ✅ 사용자 경로 (실선) */}
        {isActive && memoizedPath.length > 0 && (
          <Polyline
            coordinates={memoizedPath}
            strokeColor="#007aff"
            strokeWidth={6}
            zIndex={3}
          />
        )}

        {/* ✅ 트랙 경로 (점선) */}
        {externalPath && externalPath.length > 0 && (
          <Polyline
            coordinates={externalPath}
            strokeColor="rgba(255, 159, 28, 0.7)"
            strokeWidth={4}
            lineDashPattern={[8, 6]}
            zIndex={2}
          />
        )}

        {/* ✅ 시작점 마커 */}
        {startPosition && (
          <Marker
            coordinate={startPosition}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={4}
          >
            <Image
              source={require('@/assets/images/start-line.png')}
              style={styles.startMarker}
              resizeMode="contain"
            />
          </Marker>
        )}

        {/* ✅ 도착점 마커 */}
        {endPosition && (
          <Marker
            coordinate={endPosition}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={4}
          >
            <Image
              source={require('@/assets/images/finish-line.png')}
              style={styles.endMarker}
              resizeMode="contain"
            />
          </Marker>
        )}

        {/* ✅ 봇 마커 (빨간색 점) */}
        {botPosition && (
          <Marker 
            coordinate={botPosition}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={9}
          >
            <View style={styles.botMarker} />
          </Marker>
        )}

        {/* ✅ 시작 전 시작점 원형 표시 */}
        {!isSimulating && startPosition && (
          <Circle
            center={startPosition}
            radius={10}
            strokeColor="rgba(0, 200, 0, 0.7)"
            fillColor="rgba(0, 200, 0, 0.2)"
            zIndex={1}
          />
        )}

        {/* ✅ 러닝 중 도착점 원형 표시 */}
        {isSimulating && endPosition && (
          <Circle
            center={endPosition}
            radius={10}
            strokeColor="rgba(255, 0, 0, 0.7)"
            fillColor="rgba(255, 0, 0, 0.2)"
            zIndex={1}
          />
        )}
      </MapView>

      {/* ✅ 자동 추적 토글 버튼 */}
      <TouchableOpacity
        style={styles.autoCenterButton}
        onPress={() => setAutoCenter(!autoCenter)}
      >
        <Image
          source={require('@/assets/images/MyLocation.png')}
          style={[
            styles.buttonIcon,
            { tintColor: autoCenter ? '#007aff' : '#999' }
          ]}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* ✅ 내 위치 버튼 */}
      <TouchableOpacity
        style={[
          styles.myLocationButton,
          { bottom: 260 + insets.bottom }
        ]}
        onPress={handleMyLocationPress}
      >
        <Image
          source={require('@/assets/images/MyLocation.png')}
          style={styles.myLocationIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  myLocationButton: {
    position: 'absolute',
    right: 15,
    backgroundColor: 'rgba(246, 246, 246, 0.5)',
    padding: 10,
    borderRadius: 80,
    zIndex: 1100,
  },
  myLocationIcon: {
    width: 20,
    height: 20,
    tintColor: 'black'
  },
  autoCenterButton: {
    position: 'absolute',
    top: 120,
    right: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 25,
    zIndex: 1100,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonIcon: {
    width: 24,
    height: 24,
  },
  userMarker: {
    width: 12,
    height: 12,
    backgroundColor: '#007aff',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  botMarker: {
    width: 12,
    height: 12,
    backgroundColor: '#ff4444',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  startMarker: {
    width: 40,
    height: 40,
  },
  endMarker: {
    width: 40,
    height: 40,
  },
});
