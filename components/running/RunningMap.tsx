import { Coordinate } from '@/types/TrackDto';
import { bearing } from '@/utils/PathTools';
import { haversineDistance } from '@/utils/RunningUtils';
import LottieView from 'lottie-react-native';
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RunningMapProps {
  // 필수 지도 데이터
  path: Coordinate[];
  isActive: boolean;
  userLocation: Coordinate | null;
  initialRegion?: Region;
  region?: Region;

  // 지도 위 오버레이 및 마커 데이터
  externalPath?: Coordinate[];
  opponentLivePath?: Coordinate[]; // <-- 이거 추가!
  botPosition?: Coordinate | null;
  startPosition?: Coordinate | null;
  endPosition?: Coordinate | null;
  isSimulating?: boolean;
  opponentGhost?: Coordinate | null;
  isControlsVisible?: boolean; // 컨트롤 표시 여부 prop 추가
  
  // 상위 컴포넌트와 통신하기 위한 콜백 함수
  onAvatarPositionUpdate: (coord: Coordinate, force?: boolean) => void;
  onMapReady?: (mapRef: MapView | null) => void;
  onPress?: () => void;  // 지도 클릭 이벤트 핸들러 추가
}



export const RunningMap = forwardRef<MapView, RunningMapProps>(({
  path,
  isActive,
  initialRegion,
  region,
  onAvatarPositionUpdate,
  onMapReady,
  externalPath,
  botPosition,
  startPosition,
  endPosition,
  isSimulating,
  userLocation,
  opponentLivePath,
  opponentGhost,
  onPress,
  isControlsVisible = true
}, ref) => {
  const insets = useSafeAreaInsets();
  const lastUpdateRef = useRef<number>(0);

  // ✅ 카메라 자동 추적 제어
  const [autoCenter, setAutoCenter] = useState(true);
  const CAMERA_UPDATE_THRESHOLD_M = 20;  // 20m 이상 이동 시만 카메라 이동
  const CAMERA_UPDATE_INTERVAL = 3000;   // 3초에 한 번만 업데이트

  const lastCameraUpdateRef = useRef(Date.now());
  const lastCameraCoordRef = useRef<Coordinate | null>(null);
  const lastHeadingRef = useRef<number | undefined>(undefined);

  // 경로 메모이제이션 (좌표 값이 실제로 바뀔 때만)
  // const memoizedPath = useMemo(() => {
  //   return path.length > 0 ? [...path] : [];
  // }, [JSON.stringify(path)]);

  const memoizedExternalPath = useMemo(() => {
    return externalPath && externalPath.length > 0 ? [...externalPath] : [];
  }, [externalPath ? JSON.stringify(externalPath) : '']);

  // 그라데이션 색상 배열 (파랑-보라-핑크)
  const gradientStops = [
    { color: '#00D4FF', pos: 0 },   // 파랑
    { color: '#8A2BE2', pos: 0.5 }, // 보라
    { color: '#FF1493', pos: 1 }    // 핑크
  ];

  // 색상 보간 함수
  function lerpColor(a: string, b: string, t: number) {
    const ah = parseInt(a.replace('#', ''), 16);
    const bh = parseInt(b.replace('#', ''), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `#${((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1)}`;
  }

  // 트랙 경로(외부 경로) 그라데이션 Polyline 분할 (더 부드럽게)
  const gradientPolylines = useMemo(() => {
    if (!memoizedExternalPath || memoizedExternalPath.length < 2) return null;
    const n = 30; // 구간 수를 30개로 늘림
    const polylines = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      // 보간 구간 찾기
      let c1, c2, t2;
      if (t < 0.5) {
        c1 = gradientStops[0].color;
        c2 = gradientStops[1].color;
        t2 = t / 0.5;
      } else {
        c1 = gradientStops[1].color;
        c2 = gradientStops[2].color;
        t2 = (t - 0.5) / 0.5;
      }
      const color = lerpColor(c1, c2, t2);
      // 좌표 구간
      const startIdx = Math.floor(i * (memoizedExternalPath.length - 1) / n);
      const endIdx = Math.floor((i + 1) * (memoizedExternalPath.length - 1) / n) + 1;
      const coords = memoizedExternalPath.slice(startIdx, endIdx);
      if (coords.length >= 2) {
        polylines.push(
          <Polyline
            key={`gradient-track-${i}`}
            coordinates={coords}
            strokeColor={color}
            strokeWidth={8}
            zIndex={2}
          />
        );
      }
    }
    return polylines;
  }, [memoizedExternalPath]);

  // ✅ 조건부 카메라 업데이트 함수 (방향 포함, 보간 및 임계값 적용)
  const updateCameraIfNeeded = useCallback((coord: Coordinate) => {
    if (!autoCenter || !ref || !('current' in ref)) return;
    
    const now = Date.now();
    const prev = lastCameraCoordRef.current;
    const moved = !prev ? Infinity :
      haversineDistance(
        prev.latitude, prev.longitude,
        coord.latitude, coord.longitude
      ) * 1000;

    let heading = lastHeadingRef.current;
    if (path.length >= 2) {
      const prevCoord = path[path.length - 2];
      const dist = haversineDistance(
        prevCoord.latitude, prevCoord.longitude,
        coord.latitude, coord.longitude
      ) * 1000;
      if (dist > 2) {
        let newHeading = bearing(prevCoord, coord);
        // === 180도 보정 필요시 아래 한 줄 활성화 ===
        // newHeading = (newHeading + 180) % 360;
        heading = newHeading;
        lastHeadingRef.current = heading;
      }
    }

    if (
      moved > CAMERA_UPDATE_THRESHOLD_M ||
      now - lastCameraUpdateRef.current > CAMERA_UPDATE_INTERVAL
    ) {
      if (typeof heading === 'number' && !isNaN(heading)) {
        ref.current?.animateCamera({
          center: coord,
          heading: heading,
        }, { duration: 500 });
      } else {
        ref.current?.animateCamera({
          center: coord,
        }, { duration: 500 });
      }
      lastCameraUpdateRef.current = now;
      lastCameraCoordRef.current = coord;
    }
  }, [autoCenter, path, ref]);

  // ✅ 실시간 위치 업데이트 (카메라 추적 제한)
  useEffect(() => {
    if (path.length > 0) {
      const lastCoord = path[path.length - 1];
      updateCameraIfNeeded(lastCoord);
      onAvatarPositionUpdate(lastCoord, true);
    } else if (userLocation) {
      updateCameraIfNeeded(userLocation);
      onAvatarPositionUpdate(userLocation, true);
    }
  }, [path.length, path[path.length - 1]?.latitude, path[path.length - 1]?.longitude, userLocation, updateCameraIfNeeded, onAvatarPositionUpdate]);

  // 내 위치 버튼 핸들러
  const handleMyLocationPress = useCallback(() => {
    if (path.length === 0) return;

    const lastCoord = path[path.length - 1];
    (ref as React.RefObject<MapView>).current?.animateCamera({
      center: lastCoord,
      zoom: 17,
    }, { duration: 500 });

    // 아바타 위치 강제 업데이트
    setTimeout(() => {
      onAvatarPositionUpdate(lastCoord, true);
    }, 600);
  }, [path, onAvatarPositionUpdate, ref]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        region={region || initialRegion}
        showsUserLocation={false}
        followsUserLocation={false}
        showsMyLocationButton={false}
        rotateEnabled={true}
        pitchEnabled={false}
        zoomEnabled={true}
        scrollEnabled={true}
        onPress={onPress}  // 지도 클릭 이벤트 핸들러 연결
        onMapReady={() => {
          console.log('🗺️ 지도 준비 완료');
          if (onMapReady && ref && 'current' in ref) {
            onMapReady(ref.current);
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
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <LottieView
                source={require('@/assets/lottie/marker.json')}
                autoPlay
                loop
                style={{
                  width: 28,
                  height: 28,
                  transform: [
                    { scaleX: 1.4 },   // 타원형
                    { scaleY: 0.7 },   // 타원형
                    { rotate: '15deg' } // 15도 회전
                  ]
                }}
              />
            </View>
          </Marker>
        )}

        {/* ✅ 사용자 경로 (아주 연한 회색) */}
        {path.length > 0 && (
          <Polyline
            coordinates={path}
            strokeColor="#6fffa4ff"
            strokeWidth={10}
            zIndex={3}
          />
        )}

        {/* ✅ 트랙 경로 (부드러운 그라데이션) */}
        {gradientPolylines}

        {/* 3. **상대 경로(빨간 실선)** */}
        {opponentLivePath && opponentLivePath.length > 0 && (
          <Polyline
            coordinates={opponentLivePath}
            strokeColor="#ff4444"
            strokeWidth={4}
            zIndex={8}
          />
        )}

        {/* ✅ 상대방 고스트(마커) */}
        {opponentGhost && (
          <Marker coordinate={opponentGhost} anchor={{ x: 0.5, y: 1 }} zIndex={11}>
            <View style={{ alignItems: 'center' }}>
              <View style={{
                width: 16, height: 16,
                backgroundColor: '#ff4444',
                borderRadius: 8, borderWidth: 2, borderColor: '#fff'
              }} />
              <Text style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 12, marginTop: 2 }}>상대</Text>
            </View>
          </Marker>
        )}

        {opponentGhost && (
          <Marker coordinate={opponentGhost} anchor={{ x: 0.5, y: 1 }} zIndex={11}>
            <View style={{ alignItems: 'center' }}>
              <View style={{
                width: 16, height: 16,
                backgroundColor: '#ff4444',
                borderRadius: 8, borderWidth: 2, borderColor: '#fff'
              }} />
              <Text style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 12, marginTop: 2 }}>상대</Text>
            </View>
          </Marker>
        )}

        {/* ✅ 시작점 마커 (투명 회색 + 이미지) */}
        {startPosition && (
          <>
            <Circle
              center={startPosition}
              radius={10}
              strokeColor="rgba(160,160,160,0.7)"
              fillColor="rgba(160,160,160,0.3)"
              zIndex={4}
            />
            <Marker
              coordinate={startPosition}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={5}
            >
              <Image
                source={require('@/assets/images/start.png')}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
            </Marker>
          </>
        )}

        {/* ✅ 도착점 마커 (투명 핑크 + 이미지) */}
        {endPosition && (
          <>
            <Circle
              center={endPosition}
              radius={10}
              strokeColor="rgba(255,20,147,0.7)"
              fillColor="rgba(255,20,147,0.3)"
              zIndex={4}
            />
            <Marker
              coordinate={endPosition}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={5}
            >
              <Image
                source={require('@/assets/images/end.png')}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
            </Marker>
          </>
        )}

        {/* ✅ 봇 마커 */}
        {botPosition && (
          <Marker
            coordinate={botPosition}
            anchor={{ x: 0.5, y: 1.0 }}
            zIndex={999}
          >
            <View
              style={{
                width: 30,
                height: 43,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'visible',
              }}
            >
              <LottieView
                source={require('@/assets/lottie/bot1.json')}
                autoPlay
                loop
                renderMode="HARDWARE"
                style={{ width: 65, height: 60 }}
              />
            </View>
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

      {/* ✅ 내 위치 버튼 */}
      <TouchableOpacity
        style={[
          styles.myLocationButton,
          { bottom: isControlsVisible ? 20 + insets.bottom : 20 + insets.bottom, marginRight: 15
            , }
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
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 80,
    zIndex: 1100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
