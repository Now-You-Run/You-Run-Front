/*

    import 앱의 UI, 지도, GLView, 3D 모델 렌더링, GPS, 경로 기록 상태관리용 모듈

*/

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MapView, { Polyline, Region, Marker } from 'react-native-maps';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useRunning } from '@/context/RunningContext';
import * as Location from 'expo-location';

// 두 GPS 좌표 간 거리 (km) 게산
const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 거리, 페이스, 시간 계산 로직 - (path 배열의 좌표들 사이 거리 합산하여) 총 이동 거리 계산(km)
const calculateTotalDistance = (
  path: { latitude: number; longitude: number }[]
) => {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineDistance(
      path[i - 1].latitude,
      path[i - 1].longitude,
      path[i].latitude,
      path[i].longitude
    );
  }
  return total;
};

// 거리와 경과 시간으로 평균 페이스 계산(1km당 걸린시간)
const calculatePace = (distanceKm: number, elapsedSeconds: number): string => {
  if (!distanceKm || !elapsedSeconds) return '0\'00"';
  const pace = elapsedSeconds / distanceKm;
  const min = Math.floor(pace / 60);
  const sec = Math.round(pace % 60);
  return `${min}'${String(sec).padStart(2, '0')}"`;
};

// 초 단위를 MM:SS 형태로 변환하여 표시
const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// GPS 좌표 -> Three.js 씬 상의 로컬 좌표로 변환
const convertLatLngToLocal = (
  lat: number,
  lng: number,
  originLat: number,
  originLng: number
): { x: number; z: number } => {
  const dx = haversineDistance(originLat, originLng, originLat, lng);
  const dz = haversineDistance(originLat, originLng, lat, originLng);
  return {
    x: (lng < originLng ? -dx : dx) * 1000,
    z: (lat < originLat ? -dz : dz) * 1000,
  };
};

// 이전-현재 좌표 간의 방향(라디안) 계산
const calculateRotationAngle = (
  prev: { x: number; z: number },
  curr: { x: number; z: number }
) => {
  return Math.atan2(curr.x - prev.x, curr.z - prev.z);
};

export default function RunningScreen() {
  /* 
    
        heading: 기기 방향
        useRunning(): 러닝 상태, 경로, 경과시간 등 관리
        locationSubscription: GPS 구독 관리
        origin: 시작 기준점
        mapRegion: 지도 중심
        modelRef: 3D 모델 참조
        mixerRef: 애니메이션 믹서
        requestRef: 애니메이션 루프 관리

    */
  const [heading, setHeading] = useState(0); // 🔥 여기에 추가
  const { isActive, elapsedTime, path, startRunning, stopRunning, addToPath } =
    useRunning();
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );
  const [origin, setOrigin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null); // ✅ 변경됨
  const [mapRegion, setMapRegion] = useState<Region | undefined>();
  const modelRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const requestRef = useRef<number | null>(null);

  // path 또는 elapsedTime이 변경될 때만 재계산하여 렌더링 효율 최적화
  const distance = useMemo(() => calculateTotalDistance(path), [path]);
  const pace = useMemo(
    () => calculatePace(distance, elapsedTime),
    [distance, elapsedTime]
  );

  /*
    
    위치 권한 요청 및 시작 위치(origin) 설정
    역할: 사용자의 현재 GPS 위치를 받아서 앱의 기준점=origin과 초기 지고 중심(mapRegion)을 설정함.

  */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('위치 권한이 거부되었습니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setOrigin({ latitude, longitude });
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    })();
  }, []);

  // path가 바뀔 때마다 지도 중심 이동 -> 최신 경로의 좌표로 지도 중심(mapRegion) 자동 이동
  useEffect(() => {
    if (path.length > 0) {
      const latest = path[path.length - 1];
      setMapRegion({
        latitude: latest.latitude,
        longitude: latest.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [path]);

  /*
  
    실시간 위치 추적 및 러닝 경로 기록
    역할:
      - isActive가 true면 러닝 시작
      - 사용자가 이동할 떄마다 경로 좌표를 저장 (addToPath)
      - 방향(heading)도 함께 저장하여 나중에 모델 회전에 활용가능

  */
  useEffect(() => {
    if (isActive) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('위치 권한이 거부되었습니다.');
          return;
        }

        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000, // 1초마다 위치 업데이트
            distanceInterval: 10, // 1미터 이상 이동 시
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            addToPath(location.coords); // 경로에 좌표 추가
            if (location.coords.heading != null) {
              setHeading(location.coords.heading); // ✅ 여기서 heading 저장
            }
          }
        );
      })();
    } else {
      locationSubscription.current?.remove();
      locationSubscription.current = null;
    }

    return () => {
      locationSubscription.current?.remove();
      locationSubscription.current = null;
    };
  }, [isActive]);

  /*
  
    GLView + Thre e.js를 이요한 3D 모델 생성 및 애니메이션
    역할:
      - 3D 모델(GLB)을 로드하고, 씬에 추가
      - 애니네이션 실행
  
  */
  const onContextCreate = async (gl: any) => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);

    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    scene.add(new THREE.AmbientLight(0xffffff));

    const modelAsset = Asset.fromModule(
      require('../../assets/models/Standard_RunC.glb')
    );
    await modelAsset.downloadAsync();
    const loader = new GLTFLoader();

    const resourcePath = modelAsset.localUri
      ? modelAsset.localUri.replace('Standard_RunC.glb', '')
      : modelAsset.uri.replace('Standard_RunC.glb', '');

    loader.setResourcePath(resourcePath);

    const gltf = await loader.loadAsync(modelAsset.localUri || modelAsset.uri);
    const model = gltf.scene;
    model.scale.set(1, 1, 1); // 10배 확대
    scene.add(model);
    modelRef.current = model;

    if (gltf.animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(model);
      const action = mixerRef.current.clipAction(gltf.animations[0]);
      action.play();
    }

    const clock = new THREE.Clock();

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      mixerRef.current?.update(clock.getDelta());

      /*
      
        모델 위치 이동 및 회전 처리
        역할:
          - 모델 위치를 GPS 기반 위치에 맞춰 이동
          - 사용자의 heading 값을 바탕으로 모델을 회전
          - 개선점: 현재 prev->curr 방향으로 회전하는 로직이 덮어쓰여져 있기때문에,
                  실제 heading 기반 회전은 반영되지 않음.
      
      */
      if (modelRef.current && origin) {
        let curr = { x: 0, z: 0 };

        if (path.length >= 1) {
          const prev = convertLatLngToLocal(
            path[path.length - 1].latitude,
            path[path.length - 1].longitude,
            origin.latitude,
            origin.longitude
          );
          curr = convertLatLngToLocal(
            path[path.length - 1].latitude,
            path[path.length - 1].longitude,
            origin.latitude,
            origin.longitude
          );
          modelRef.current.rotation.y = calculateRotationAngle(prev, curr);
        } else if (path.length === 1) {
          curr = convertLatLngToLocal(
            path[0].latitude,
            path[0].longitude,
            origin.latitude,
            origin.longitude
          );
        }

        modelRef.current.position.set(curr.x, 0, curr.z);

        // 👉 heading 값 사용해서 모델 회전
        modelRef.current.rotation.y = (-heading * Math.PI) / 180;

        /* 
        
            카메라 동작
            역할:
              - 3D 씬에서 모델을 따라가는 시점으로 카메라 설치
              - 모델 방향이나 위치에 따라 시점이 자연스럽게 이동함

        */
        camera.position.set(curr.x, 5, curr.z + 10);
        camera.lookAt(curr.x, 0, curr.z);
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

  /*

    애니메이션 루프 해제
    역할:
      컴포넌트 언마운트 시 애니메이션 루프 해제 및 자원 정리

  */
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      mixerRef.current?.stopAllAction();
    };
  }, []);

  // 로딩 하면 처리
  if (!origin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>위치를 가져오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        region={mapRegion}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        showsUserLocation={true}
      >
        <Polyline coordinates={path} strokeColor="#007aff" strokeWidth={5} />

        {path.length > 0 && (
          <Marker
            coordinate={path[path.length - 1]}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 20,
                borderRightWidth: 20,
                borderBottomWidth: 30,
                borderStyle: 'solid',
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: 'rgba(0, 122, 255, 0.6)',
                transform: [{ rotate: `${heading * (Math.PI / 180)}rad` }],
              }}
            ></View>
          </Marker>
        )}
      </MapView>

      {origin && (
        <GLView
          style={StyleSheet.absoluteFill}
          onContextCreate={onContextCreate}
        />
      )}

      <View style={styles.overlay}>
        <Text style={styles.distance}>{distance.toFixed(2)} km</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>{formatTime(elapsedTime)} 분:초</Text>
          <Text style={styles.stat}>{pace} 페이스</Text>
        </View>
        <Pressable
          onPress={!isActive ? startRunning : stopRunning}
          style={({ pressed }) => [
            styles.runButton,
            { backgroundColor: isActive ? '#ff4d4d' : '#007aff' },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.runButtonText}>
            {!isActive ? '시작' : '정지'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* <View style={{ flex: 1 }}>
      <MapView 부분

  역할:
    - 현재 지도 및 경로 시각화
    - Polyline으로 경로 표시
    - Marker로 현재    위치 + heading 기반 회전 표시
    
*/

/* <GLView onContextCreate={onContextCreate} /> 부분

    3D 모델 및 카메라 애니메이션을 앱에 오버레이

*/

/* <View style={styles.overlay}> 부분

  오버레이 UI(거리, 시간, 페이스, 버튼)
  역할:
    - 사용자에게 실시간 거리, 시간, 페이스 보여줌
    - 러닝 시작 / 정지 버튼 제공

*/

// 스타일 정의
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  distance: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  stat: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  runButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 5,
  },
  runButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
