import { useRunning } from '@/context/RunningContext';
import { Section, useSectionAnnouncements } from '@/hooks/useSectionAnnouncements';
import { loadTrackInfo, TrackInfo } from '@/repositories/appStorage';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Image, Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Circle, Marker, Polyline, Region } from 'react-native-maps';
import WebView from 'react-native-webview';
import type { Coordinate } from '../../types/TrackDto';
import { createPathTools } from '../../utils/PathTools';
import { SourceType } from './TrackDetailScreen';

const avatarId = "686ece0ae610780c6c939703";

// ==================================================================
// 아바타 오버레이 컴포넌트
// ==================================================================
const AvatarOverlay = React.memo(({ 
  screenPos, 
  isRunning, 
  speed, 
  onAvatarReady 
}: {
  screenPos: { x: number; y: number } | null;
  isRunning: boolean;
  speed: number;
  onAvatarReady: () => void;
}) => {
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // ==================================================================
  // 3D 아바타 HTML/JavaScript 코드
  // ==================================================================
  const avatarHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
    canvas { display: block; background: transparent; }
  </style>
</head>
<body>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
  <script>
    const avatarUrl = "https://models.readyplayer.me/${avatarId}.glb";
    const animUrls = {
      idle: "https://euns0o.github.io/mixamo-animations/idle.glb",
      run: "https://euns0o.github.io/mixamo-animations/running.glb",
    };

    let scene, camera, renderer, avatar, mixer;
    let actions = {};
    let currentAction = null;
    let clock = new THREE.Clock();

    async function loadGLTF(url) {
      const loader = new THREE.GLTFLoader();
      return new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
    }

    // ==================================================================
    // 3D 장면 초기화 및 아바타 로딩
    // ==================================================================
    async function loadAvatar() {
      try {
        const gltf = await loadGLTF(avatarUrl);
        avatar = gltf.scene;
        avatar.scale.setScalar(1.2);
        // ✅ 초기 위치만 설정하고, 이후에는 고정하지 않음
        avatar.position.set(0, -0.9, 0);
        avatar.rotation.y = 0;
        scene.add(avatar);

        avatar.traverse((child) => {
          if (child.isMesh) {
            child.visible = true;
            child.frustumCulled = false;

            if (child.material && child.material.map) {
              child.material.map.minFilter = THREE.LinearFilter;
              child.material.map.magFilter = THREE.LinearFilter;
              child.material.map.generateMipmaps = false;
            }
          }
        });

        camera.position.set(0.5, -1.5, -1.5);
        camera.lookAt(0, 0, 0);
  
        mixer = new THREE.AnimationMixer(avatar);
        await loadAnimations();
        playAction("idle");
        animate();
        
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "avatarReady" }));
      } catch (e) {
        console.error("아바타 로딩 실패:", e);
      }
    }

    // ==================================================================
    // 애니메이션 로딩 및 본 리매핑
    // ==================================================================
    async function loadAnimations() {
      for (const [name, url] of Object.entries(animUrls)) {
        try {
          const gltf = await loadGLTF(url);
          if (gltf.animations && gltf.animations.length > 0) {
            const originalClip = gltf.animations[0];
            const remappedClip = RemapBones(originalClip, name);
            
            if (remappedClip) {
              const action = mixer.clipAction(remappedClip);
              action.setLoop(THREE.LoopRepeat);
              actions[name] = action;
            }
          }
        } catch (e) {
          console.error(\`\${name} 애니메이션 로딩 실패:\`, e);
        }
      }
    }

    function RemapBones(clip, animationName) {
      const coreBoneMapping = {
        'mixamorigHips': 'Hips',
        'mixamorigSpine': 'Spine',
        'mixamorigSpine1': 'Spine1',
        'mixamorigSpine2': 'Spine2',
        'mixamorigNeck': 'Neck',
        'mixamorigHead': 'Head',
        'mixamorigLeftShoulder': 'LeftShoulder',
        'mixamorigRightShoulder': 'RightShoulder',
        'mixamorigLeftArm': 'LeftArm',
        'mixamorigRightArm': 'RightArm',
        'mixamorigLeftForeArm': 'LeftForeArm',
        'mixamorigRightForeArm': 'RightForeArm',
        'mixamorigLeftHand': 'LeftHand',
        'mixamorigRightHand': 'RightHand',
        'mixamorigLeftUpLeg': 'LeftUpLeg',
        'mixamorigRightUpLeg': 'RightUpLeg',
        'mixamorigLeftLeg': 'LeftLeg',
        'mixamorigRightLeg': 'RightLeg',
        'mixamorigLeftFoot': 'LeftFoot',
        'mixamorigRightFoot': 'RightFoot'
      };
      
      const newTracks = [];
      
      clip.tracks.forEach(track => {
        const parts = track.name.split('.');
        const boneName = parts[0];
        const property = parts.slice(1).join('.');
        
        const mappedBoneName = coreBoneMapping[boneName];
        
        if (mappedBoneName) {
          if (boneName === 'mixamorigHips' && property === 'position') {         
            const limitedValues = track.values.slice();
            for (let i = 0; i < limitedValues.length; i += 3) {
              limitedValues[i] = 0;     // X축 고정
              limitedValues[i + 1] = 0; // Y축 고정  
              limitedValues[i + 2] = 0; // Z축 고정
            }
            const newTrack = new THREE.VectorKeyframeTrack(
              mappedBoneName + '.' + property, 
              track.times, 
              limitedValues
            );
            newTracks.push(newTrack);
          } else if (property === 'quaternion') {
            const newTrack = new THREE.QuaternionKeyframeTrack(
              mappedBoneName + '.' + property, 
              track.times, 
              track.values
            );
            newTracks.push(newTrack);
          } 
        }
      });

      return new THREE.AnimationClip(animationName + '_remapped', clip.duration, newTracks);
    }

    function playAction(animationName) {
      if (!actions[animationName]) return;
      
      if (currentAction) {
        currentAction.fadeOut(0.3);
      }
      
      const action = actions[animationName];
      action.reset().fadeIn(0.3).play();
      currentAction = action;
    }

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      // ✅ 아바타 위치 고정 코드를 완전히 제거
      // 아바타가 WebView 내에서 자유롭게 움직일 수 있도록 함
      renderer.render(scene, camera);
    }

    function init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.01, 1000);
      
      renderer = new THREE.WebGLRenderer({
       alpha: true, 
       antialias: true,
       powerPreference: "default",
       precision: "mediump" 
      });
      
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(pixelRatio); 
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      document.body.appendChild(renderer.domElement);
      
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
      dirLight.position.set(5, 10, 5);
      dirLight.castShadow = false;
      scene.add(dirLight);

      loadAvatar();
    }
   
    window.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "setAnimation") {
          const animName = data.isRunning ? "run" : "idle";
          playAction(animName);
        }
      } catch (e) {
        console.error("메시지 파싱 실패:", e);
      }
    });

    init();
  </script>
</body>
</html>
`;

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'avatarReady') {
        setAvatarLoaded(true);
        onAvatarReady();
      }
    } catch (e) {
      console.error('Message parsing error:', e);
    }
  }, [onAvatarReady]);

  useEffect(() => {
    if (avatarLoaded && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setAnimation',
        isRunning: isRunning,
      }));
    }
  }, [isRunning, avatarLoaded]);

  if (!screenPos) return null;
  if (hasError) return null; // 에러 발생 시 아바타 숨김

  // ==================================================================
  // 아바타 오버레이 렌더링
  // ==================================================================
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: screenPos.x - 35, // 아바타를 빨간 점 바로 위에 정확히 위치
        top: screenPos.y - 70,  // 아바타 발이 빨간 점에 오도록 조정
        width: 70,              // WebView 크기 축소로 성능 향상
        height: 80,
        zIndex: 999,
        // ✅ 떨림 방지를 위한 스타일 추가
        transform: [{ translateX: 0 }, { translateY: 0 }],
      }}
    >
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: avatarHtml }}
        style={{ 
          flex: 1, 
          backgroundColor: "transparent",
        }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        cacheEnabled={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          setHasError(true);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error: ', nativeEvent);
          setHasError(true);
        }}
      />
    </View>
  );
});

// km/h = 60 / (pace_minutes + pace_seconds / 60)
function paceToKmh(minutes: number, seconds: number): number {
  const totalMinutes = minutes + seconds / 60;
  return totalMinutes === 0 ? 0 : 60 / totalMinutes;
}

// 두 GPS 좌표 간 거리 (km) 계산
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

// 총 이동 거리 계산 (km)
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

/** 현재 속도(km/h) → 순간 페이스 문자열 (mm′ss″) */
function calculateInstantPace(speedKmh: number): string {
  if (speedKmh <= 0) return `0'00"`;
  const secPerKm = 3600 / speedKmh;           // 1km 당 걸리는 초
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

// 초를 MM:SS 형식으로 변환
const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// 경로 부드럽게 smoothing (옵션)
function smoothPath(
  path: { latitude: number; longitude: number }[],
  windowSize: number = 5
) {
  if (path.length < windowSize) return path;

  const smoothed: { latitude: number; longitude: number }[] = [];

  for (let i = 0; i < path.length; i++) {
    let latSum = 0;
    let lonSum = 0;
    let count = 0;
    for (
      let j = Math.max(0, i - Math.floor(windowSize / 2));
      j <= Math.min(path.length - 1, i + Math.floor(windowSize / 2));
      j++
    ) {
      latSum += path[j].latitude;
      lonSum += path[j].longitude;
      count++;
    }
    smoothed.push({
      latitude: latSum / count,
      longitude: lonSum / count,
    });
  }

  return smoothed;
}

export default function RunningScreen() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);
  const router = useRouter();

  // 아바타 관련 상태
  const [avatarScreenPos, setAvatarScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [avatarReady, setAvatarReady] = useState(false);
  const enableAvatar = true;
  
  // 회전 관련 상태
  const [lastMapHeading, setLastMapHeading] = useState(0);
  const [isRotationEnabled, setIsRotationEnabled] = useState(false);

  const handleBackPress = () => {
    if (!isActive) {
      router.back();
      return;
    }

    Alert.alert(
      "러닝 중단",
      "정말로 현재 러닝을 중단하고 나가시겠습니까? 기록은 저장되지 않습니다.",
      [
        { text: "계속 달리기", style: "cancel" },
        {
          text: "나가기",
          style: "destructive",
          onPress: () => {
            // 여기서 초기화를 하고 뒤로가도 좋지만, 위의 useEffect가 이미 처리해줍니다.
            router.back();
          },
        },
      ]
    );
  };
  const { trackId, botMin, botSec, source } = useLocalSearchParams<{
    trackId?: string;
    botMin?: string;
    botSec?: string;
    source: SourceType;
  }>();

  // 경로이탈을 위한 컴포넌트
  const OFFCOURSE_THRESHOLD_M = 20;   // 코스 이탈 기준 거리 (10m)
  const offCourseRef = useRef(false); // 안내 중복 방지 
  const forfeitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pausedPositionRef = useRef<Coordinate | null>(null);

  // 1) AsyncStorage에서 저장해둔 TrackInfo 불러오기
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  useEffect(() => {
    if (trackId) {
      loadTrackInfo(trackId).then(info => {
        setTrackInfo(info);
      });
    }
  }, [trackId]);

  // 2) 불러온 trackInfo로 외부 경로, 시작점, 지도 영역 설정
  const [externalPath, setExternalPath] = useState<Coordinate[] | null>(null);
  const [origin, setOrigin] = useState<Coordinate | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>();
  useEffect(() => {
    if (trackInfo) {
      setExternalPath(trackInfo.path);
      setOrigin(trackInfo.origin);
      setMapRegion({
        latitude: trackInfo.origin.latitude,
        longitude: trackInfo.origin.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [trackInfo]);

  // 3) 봇 페이스 계산
  const botPace = useMemo(() => ({
    minutes: botMin ? parseInt(botMin, 10) : 0,
    seconds: botSec ? parseInt(botSec, 10) : 0,
  }), [botMin, botSec]);

  // // 4) 총 거리 (meters)
  // const trackDistanceMeters = trackInfo?.distanceMeters ?? 0;

  // RunningContext
  const {
    isActive,
    elapsedTime,
    path,
    currentSpeed,
    startRunning,
    pauseRunning,
    resumeRunning,
    stopRunning,
    resetRunning,
    userLocation,
  } = useRunning();

  // 방향 계산 함수
  const calculateDirection = useCallback((from: Coordinate, to: Coordinate): number | null => {
    const deltaLng = to.longitude - from.longitude;
    const deltaLat = to.latitude - from.latitude;

    const distance = Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat);
    if (distance < 0.00001) {
      return null;
    }

    let angle = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
    return angle;
  }, []);

  // ✅ 아바타 위치 업데이트 함수 - 단순화
  const updateAvatarPosition = useCallback((coord: Coordinate, force = false) => {
    if (!mapRef.current || !enableAvatar) return;
    
    try {
      mapRef.current
        .pointForCoordinate(coord)
        .then(({ x, y }) => {
          setAvatarScreenPos({ x, y });
        })
        .catch((error) => {
          console.log('아바타 위치 업데이트 실패:', error);
          setAvatarScreenPos(null);
        });
    } catch (error) {
      console.log('아바타 위치 계산 오류:', error);
      setAvatarScreenPos(null);
    }
  }, [enableAvatar]);

  const handleAvatarReady = useCallback(() => {
    setAvatarReady(true);
    if (path.length > 0) {
      const coord = path[path.length - 1];
      updateAvatarPosition(coord, true); // 강제 업데이트
    }
  }, [path, updateAvatarPosition]);

  // 실시간 통계(거리, 페이스)
  const liveDistanceKm = useMemo(() => calculateTotalDistance(path), [path]);
  const instantPace = useMemo(() => calculateInstantPace(currentSpeed), [currentSpeed]);
  // 초/km 로 환산한 순간 페이스
  const currentPaceSec = currentSpeed > 0 ? 3600 / currentSpeed : undefined;

  // 저장된 전체 거리의 20%, 80% 지점으로 구간 정의 (meters 단위)
  const sections: Section[] = trackInfo ? [
    { name: '본격 구간', endMeters: trackInfo.distanceMeters * 0.2 },
    { name: '마무리 구간', endMeters: trackInfo.distanceMeters * 0.8 },
  ] : [];

  // 시뮬레이션 상태 & position
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null);
  const [startCoursePosition, setStartCoursePosition] = useState<Coordinate | null>(null);
  const [endCoursePosition, setEndCoursePosition] = useState<Coordinate | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // 봇(currentPosition)↔사용자(path 마지막) 거리 (km)
  const botDistanceKm = useMemo(() => {
    if (!currentPosition || path.length === 0) return 0;
    const userPos = path[path.length - 1];
    return haversineDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      userPos.latitude,
      userPos.longitude
    );
  }, [currentPosition, path]);

  useSectionAnnouncements(
     isActive ? liveDistanceKm * 1000 : 0,  // km → m
    isActive ? sections : [],
    100,                    // 100m 간격 안내
    botPace,                // 목표 페이스 { minutes, seconds }
    currentPaceSec,         // 현재 페이스 (초/km)
    botDistanceKm * 1000    // 봇과의 거리(m)
  );



  useEffect(() => {
    if (externalPath && externalPath.length > 0) {
      setStartCoursePosition(externalPath[0]);
      setEndCoursePosition(externalPath[externalPath.length - 1]);
      setCurrentPosition(externalPath[0])
    }
  }, [externalPath]);


  // simulation useEffect
  useEffect(() => {
    if (!externalPath || externalPath.length === 0) return;
    if (!isSimulating) return;

    const pausedCoord = pausedPositionRef.current;

    // ← 추가된 부분: 어디서부터 시작할지 정하기
    // pausedPositionRef.current 가 있으면, 그 위치에 가장 가까운 인덱스를 찾아 경로를 잘라냅니다.
    let startIndex = 0;
    if (pausedCoord) {
      let minD = Infinity;
      externalPath.forEach((p, i) => {
        const d = haversineDistance(
          p.latitude, p.longitude,
          pausedCoord.latitude, pausedCoord.longitude
        ) * 1000;
        if (d < minD) {
          minD = d;
          startIndex = i;
        }
      });
    }

    const simPath = externalPath.slice(startIndex);

    const tools = createPathTools(simPath);
    const speedMps = paceToKmh(botPace.minutes, botPace.seconds) / 3.6; // m/s

    // 3) 이 시점에만 pausedCoord 사용
    setCurrentPosition(pausedCoord ?? simPath[0]);
    pausedPositionRef.current = null;

    let startTime: number | null = null;
    animationFrameId.current = requestAnimationFrame(function animate(ts) {
      if (!startTime) startTime = ts;
      const elapsedSec = (ts - startTime) / 1000;
      const dist = elapsedSec * speedMps;

      if (dist >= tools.totalDistance) {
        // ② 끝 지점에서 한번 더 설정
        setCurrentPosition(tools.getCoordinateAt(tools.totalDistance));
        // ③ 남아있는 애니메이션 프레임 취소
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
  }, [externalPath, botPace, isSimulating]);


  // 실제 사용자가 달리는 경로(path)와 설계된 코스(externalPath)를 비교해서
  // 이탈 여부를 음성으로 안내합니다.
  useEffect(() => {
    if (!externalPath?.length || !userLocation) return;

    // 최신 사용자 위치
    const userPos = userLocation;
    // 코스 상의 모든 점과의 최소 거리 계산
    let minDistM = Infinity;
    for (const p of externalPath) {
      const dKm = haversineDistance(
        p.latitude, p.longitude,
        userPos.latitude, userPos.longitude
      );
      minDistM = Math.min(minDistM, dKm * 1000);
    }



    // 이탈 감지
    if (minDistM > OFFCOURSE_THRESHOLD_M && !offCourseRef.current) {
      // ← 추가된 부분: 이탈 시점에 봇 위치 저장
      pausedPositionRef.current = currentPosition;
      Speech.speak('트랙을 이탈했습니다. 복귀해주세요. 기록을 일시정지합니다.');
      offCourseRef.current = true;
      pauseRunning();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      setIsSimulating(false);
    }
    // 복귀 감지
    else if (minDistM <= OFFCOURSE_THRESHOLD_M && offCourseRef.current) {
      Speech.speak('트랙으로 돌아왔습니다. 러닝을 재개합니다.');
      offCourseRef.current = false;
      //pausedPositionRef.current = null;
      resumeRunning();
      setIsSimulating(true);
    }
  }, [userLocation, path, externalPath, pauseRunning, resumeRunning]);

  // **threshold**: 시작 가능 반경 (미터)
  const START_RADIUS_METERS = 10;
  const FINISH_RADIUS_METERS = 10;
  // 시작 버튼 누르면 botRunning 시작 (기존 startRunning 대체)
  const handleStart = async () => {
    try {
      hasFinishedRef.current = false;

      if (!externalPath || externalPath.length === 0) {
        Alert.alert('오류', '트랙 경로 정보가 없습니다.');
        return;
      }

      const startPoint = externalPath[0];
      
      // 위치 권한 확인
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한 필요', '러닝을 시작하려면 위치 권한이 필요합니다.');
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 1000,
        distanceInterval: 10,
      });
      
      const { latitude: curLat, longitude: curLon } = coords;

      const startDistKm = haversineDistance(
        startPoint.latitude,
        startPoint.longitude,
        curLat,
        curLon
      );
      const startDistM = startDistKm * 1000;

      if (startDistM > START_RADIUS_METERS) {
        Alert.alert(
          '시작 위치 오류',
          `지정된 시작점에서 ${Math.round(startDistM)}m 떨어져 있습니다.\n` +
          `시작점에서 ${START_RADIUS_METERS}m 이내로 이동한 뒤 다시 시도해 주세요.`
        );
        return;
      }

      Speech.speak('러닝을 시작합니다. 웜업구간입니다. 속도를 천천히 올려주세요');
      startRunning();
      setIsSimulating(true);
    } catch (error) {
      console.error('러닝 시작 중 오류:', error);
      Alert.alert('오류', '러닝을 시작하는 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  // 러닝 종료 처리
  const handleStopRunning = async () => {
    Speech.speak('러닝을 종료합니다.');

    // ① animationFrame 취소
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    // ② RunningContext 클린업
    stopRunning();
    resetRunning();

    // ③ 로컬 상태 클린업
    setIsSimulating(false);
    setCurrentPosition(null);
    offCourseRef.current = false;       // 이탈 알림 초기화


    // summary에 필요한 최소 데이터
    const summaryData = {
      trackPath: externalPath ?? [],  // 트랙 경로
      userPath: path,                 // 유저가 실제로 뛴 경로
      totalDistance: liveDistanceKm,  // km
      elapsedTime,                    // sec
      source: source, //서버인지 로컬인지
      trackId: trackId
    };

    router.replace({
      pathname: '/summary',
      params: { data: JSON.stringify(summaryData) },
    });

  };

  // 자동 종료용 useEffect 
  const FINISH_RADIUS_M = 10;
  const hasFinishedRef = useRef(false);

  // off-course 감지 useEffect 바로 아래쯤에 추가
  useEffect(() => {
    if (!externalPath?.length || !userLocation || hasFinishedRef.current || !trackInfo) return;

    const finishPoint = externalPath[externalPath.length - 1];
    // m 단위 거리 계산
    const distM =
      haversineDistance(
        finishPoint.latitude,
        finishPoint.longitude,
        userLocation.latitude,
        userLocation.longitude
      ) *
      1000;

    const TrackLengthM = trackInfo.distanceMeters;  // 트랙 길이
    const runLengthM = liveDistanceKm * 1000;       // 실제 달린 거리

    if (distM <= FINISH_RADIUS_M && runLengthM >= TrackLengthM - 10) {
      hasFinishedRef.current = true;
      Speech.speak('완주를 축하합니다!');
      // 봇 애니메이션, 러닝 기록 모두 종료
      handleStopRunning();
    }
  }, [userLocation, externalPath, trackInfo, liveDistanceKm]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('위치 권한이 거부되었습니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const initialCoord = { latitude, longitude };
      
      setOrigin(initialCoord);
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      
      // 초기 아바타 위치 설정
      updateAvatarPosition(initialCoord, true);
    })();
  }, [updateAvatarPosition]);

  // ✅ 성능 기반 동적 조절 - 러닝 최적화
  // 성능 모니터링 제거 - 단순화

  // ✅ 실시간 위치 업데이트 - 아바타와 마커 동기화
  useEffect(() => {
    if (path.length > 0) {
      const latest = path[path.length - 1];
      
      // 지도 영역과 아바타 위치를 동시에 업데이트
      const updateMapAndAvatar = async () => {
        try {
          if (path.length >= 2 && isRotationEnabled) {
            // 회전이 활성화된 경우: 방향 계산하여 지도 회전
            const previous = path[path.length - 2];
            const current = latest;
            const direction = calculateDirection(previous, current);
            
            if (direction !== null) {
              const headingDiff = Math.abs(direction - lastMapHeading);
              const shouldRotate = headingDiff > 15 || headingDiff > 345;
              
              if (shouldRotate) {
                try {
                  mapRef.current?.animateCamera({
                    center: current,
                    heading: direction,
                  }, { duration: 500 });
                  
                  setLastMapHeading(direction);
                } catch (error) {
                  console.log('지도 회전 애니메이션 오류:', error);
                }
              } else {
                try {
                  mapRef.current?.animateCamera({
                    center: current,
                  }, { duration: 300 });
                } catch (error) {
                  console.log('지도 중심 이동 오류:', error);
                }
              }
            }
          } else {
            // 회전이 비활성화된 경우: 일반적인 지도 업데이트
            setMapRegion({
              latitude: latest.latitude,
              longitude: latest.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            });
          }
          
          // 아바타 위치 즉시 업데이트 (동기화)
          await updateAvatarPosition(latest, true);
        } catch (error) {
          console.log('위치 업데이트 오류:', error);
        }
      };
      
      updateMapAndAvatar();
    }
  }, [path, updateAvatarPosition, isRotationEnabled, lastMapHeading, calculateDirection]);

   // ① 자동 포커스 토글 상태
  const [isFollowing, setIsFollowing] = useState(true);

  // ② 지도 터치 시 포커스 토글
  const handleMapPress = () => {
    if (isFollowing) {
      // 자유 이동 모드로
      setIsFollowing(false);
    } else {
      // 다시 사용자 위치로 포커스
      setIsFollowing(true);
      if (mapRef.current && mapRegion) {
        mapRef.current.animateToRegion(mapRegion, 500);
      }
    }
  };

  // 지도 줌 변경 감지 제거 - 단순화
  const handleMapRegionChange = useCallback((region: Region) => {
    // 줌 변경 시 아바타 위치 재계산
    if (path.length > 0) {
      const latestCoord = path[path.length - 1];
      updateAvatarPosition(latestCoord, true);
    }
  }, [path, updateAvatarPosition]);


  useEffect(() => {
    // 이 Effect는 화면이 처음 나타날 때 한 번만 실행됩니다.

    // return 안에 있는 함수는 컴포넌트가 사라지기 직전에 호출됩니다.
    return () => {
      // 이 화면을 벗어나는 모든 경우(뒤로가기, 포기, 완주 후 이동 등)에 실행됩니다.
      stopRunning();  // 진행 중이던 타이머나 위치 추적을 확실히 중지
      resetRunning(); // 컨텍스트의 모든 데이터(경로, 시간 등)를 초기화
      
      // 아바타 관련 cleanup
      setAvatarScreenPos(null);
      setAvatarReady(false);
    };
  }, []); // 의존성 배열을 비워두어야 컴포넌트가 사라질 때 딱 한 번만 실행됩니다.

  if (!origin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>위치를 가져오는 중...</Text>
      </View>
    );
  }



  return (
    <View style={{ flex: 1 }}>
      {/* ✅ 뒤로가기 버튼 */}
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 20,
          zIndex: 1100,
          backgroundColor: 'rgba(255,255,255,0.8)',
          borderRadius: 20,
        }}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        followsUserLocation={isFollowing}  
        onPress={handleMapPress}
        onRegionChangeComplete={handleMapRegionChange}
        //region={mapRegion}
        zoomEnabled
        scrollEnabled
        rotateEnabled
        pitchEnabled
        showsUserLocation={false}
      >
        {startCoursePosition && (
          <Marker coordinate={startCoursePosition} title="Start">
            <Image
              source={require('@/assets/images/start-line.png')}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </Marker>
        )}
        {!isSimulating ? (
          // --- 러닝 시작 전: 시작 지점에 초록색 원 표시 ---
          startCoursePosition && (
            <Circle
              center={startCoursePosition}
              radius={START_RADIUS_METERS}
              strokeColor="rgba(0, 200, 0, 0.7)"
              fillColor="rgba(0, 200, 0, 0.2)"
            />
          )
        ) : (
          // --- 러닝 시작 후: 도착 지점에 빨간색 원 표시 ---
          endCoursePosition && (
            <Circle
              center={endCoursePosition}
              radius={FINISH_RADIUS_METERS}
              strokeColor="rgba(255, 0, 0, 0.7)" // 빨간색 테두리
              fillColor="rgba(255, 0, 0, 0.2)"   // 투명한 빨간색 채우기
            />
          )
        )}

        {endCoursePosition && (
          <Marker coordinate={endCoursePosition} title="Finish">
            <Image
              source={require('@/assets/images/finish-line.png')}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </Marker>
        )}
        {externalPath && (
          <Polyline
            coordinates={externalPath}
            strokeColor="rgba(255, 0, 0, 0.5)"
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        )}

        <Polyline
          coordinates={smoothPath(path, 5)}
          strokeColor="#007aff"
          strokeWidth={5}
        />
        {/* 봇 마커 추가 */}
        {currentPosition && (
          <Marker coordinate={currentPosition} title="Bot" pinColor="red" />
        )}

      </MapView>


      
      {avatarScreenPos && (
        <AvatarOverlay
          screenPos={avatarScreenPos}
          isRunning={isActive}
          speed={currentSpeed}
          onAvatarReady={handleAvatarReady}
        />
      )}

      {/* 회전 토글 버튼 */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: 120,
          right: 20,
          backgroundColor: isRotationEnabled ? 'rgba(0, 122, 255, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          padding: 12,
          borderRadius: 25,
          zIndex: 1100,
          borderWidth: 1,
          borderColor: isRotationEnabled ? '#007aff' : '#ccc',
        }}
        onPress={() => setIsRotationEnabled(!isRotationEnabled)}
      >
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: isRotationEnabled ? 'white' : '#333',
        }}>
          {isRotationEnabled ? '회전 ON' : '회전 OFF'}
        </Text>
      </TouchableOpacity>

      {/* 사용자 위치로 이동 버튼 */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 260,
          right: 15,
          backgroundColor: 'rgba(246, 246, 246, 0.5)',
          padding: 10,
          borderRadius: 80,
          zIndex: 1100,
        }}
        onPress={() => {
          if (path.length === 0) return;
          const lastCoord = path[path.length - 1];
          mapRef.current?.animateCamera({
            center: lastCoord,
            zoom: 16,
          }, { duration: 500 });
          updateAvatarPosition(lastCoord, true);
        }}
      >
        <Image
          source={require('@/assets/images/MyLocation.png')}
          style={{ width: 20, height: 20, tintColor: 'black' }}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={styles.overlay}>
        {/* ——— 봇과의 거리 표시 추가 ——— */}
        <View style={styles.botDistanceRow}>
          <Text style={styles.botDistanceLabel}>봇과의 거리</Text>
          <Text style={styles.botDistanceValue}>
            {(botDistanceKm * 1000).toFixed(0)} m
          </Text>
        </View>
        <Text style={styles.distance}>{liveDistanceKm.toFixed(2)} km</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>{currentSpeed.toFixed(1)} km/h</Text>
          <Text style={styles.stat}>{formatTime(elapsedTime)} 분:초</Text>
          <Text style={styles.stat}>{instantPace} 페이스</Text>
        </View>

        <View style={styles.buttonRow}>
          {/* ───────── 이탈 중 “경기 포기” 버튼 ─────────*/}
          <Pressable
            style={styles.forfeitButton}
            onPressIn={() => {
              // 3초 롱프레스 타이머
              forfeitTimeout.current = setTimeout(() => {
                router.replace('/');         // 홈으로 이동
              }, 3000);
            }}
            onPressOut={() => {
              if (forfeitTimeout.current) {
                clearTimeout(forfeitTimeout.current);
                forfeitTimeout.current = null;
                Alert.alert(
                  '안내',
                  '3초간 꾹 눌러야 경기를 포기합니다.\n지금까지 뛴 기록은 사라집니다.',
                  [{ text: '알겠습니다' }]
                );
              }
            }}
          >
            <Text style={styles.forfeitText}>경기 포기</Text>
          </Pressable>
          {/* 시작 전일 때만 “시작” 버튼 */}
          {!isSimulating && (
            <Pressable
              onPress={handleStart}
              style={styles.startButton}
            >
              <Text style={styles.startButtonText}>시작</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    zIndex: 1000
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
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
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
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333'
  },
  botDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  botDistanceLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 6,
  },
  botDistanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007aff',
  },
  forfeitButton: {
    flex: 1,
    marginRight: 5,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#cc0000',
    alignItems: 'center',
  },
  forfeitText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  startButton: {
    flex: 1,
    marginLeft: 5,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#007aff',
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
