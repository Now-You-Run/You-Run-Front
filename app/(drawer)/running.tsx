import { useRunning } from '@/context/RunningContext';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Polyline, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';


const avatarId = "686ece0ae610780c6c939703";

interface Coord {
  latitude: number;
  longitude: number;
}

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
  const webViewRef = useRef<WebView>(null);

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
              limitedValues[i] = 0;     
              limitedValues[i + 1] = 0;
              limitedValues[i + 2] = 0; 
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
      />
    </View>
  );
});

// ==================================================================
// 헬퍼 함수 (계산 로직)
// ==================================================================

const calculateInstantPace = (speedKmh: number): string => {
  if (speedKmh <= 0) return `0'00"`;
  const secPerKm = 3600 / speedKmh;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ==================================================================
// RunningScreen 컴포넌트
// ==================================================================

export default function RunningScreen() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [summaryData, setSummaryData] = useState<any>(null);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);
  const [avatarScreenPos, setAvatarScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [avatarReady, setAvatarReady] = useState(false);

    const [isFinishPressed, setIsFinishPressed] = useState(false);
  const [finishProgress, setFinishProgress] = useState(0);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const finishIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const enableAvatar = true;

  const { mode, trackDistance, trackId } = useLocalSearchParams<{
    mode?: string;
    trackDistance?: string;
    trackId?: string;
  }>();

  const trackKm = mode === 'track' && trackDistance ? parseFloat(trackDistance) : undefined;

  const {
    isActive,
    elapsedTime,
    path,
    currentSpeed,
    totalDistance,
    startRunning,
    stopRunning,
    pauseRunning,
    resumeRunning,
    resetRunning,
    addStartPointIfNeeded,
  } = useRunning();

  const displaySpeed = currentSpeed > 0.1 ? currentSpeed : 0;
  const instantPace = calculateInstantPace(displaySpeed);

  const sections = useMemo(() => {
    if (mode === 'track' && trackKm) {
      return [
        { name: '본격 구간', end: trackKm * 0.2 },
        { name: '마무리 구간', end: trackKm * 0.8 },
      ];
    }
    return [];
  }, [mode, trackKm]);

  const [sectionIndex, setSectionIndex] = useState(0);
  const [nextAnnounceKm, setNextAnnounceKm] = useState(0.1);

  const calculateDirection = useCallback((from: Coord, to: Coord): number | null => {
    const deltaLng = to.longitude - from.longitude;
    const deltaLat = to.latitude - from.latitude;

    const distance = Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat);
    if (distance < 0.00001) {
      return null;
    }

    let angle = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
    return angle;
  }, []);

  const [lastMapHeading, setLastMapHeading] = useState(0);

  // ✅ 아바타 업데이트를 적절한 빈도로 조절
  const [lastAvatarUpdate, setLastAvatarUpdate] = useState(0);
  const [avatarUpdateInterval, setAvatarUpdateInterval] = useState(2000);
  const [performanceMode, setPerformanceMode] = useState('normal');
  const [pendingAvatarUpdate, setPendingAvatarUpdate] = useState<Coord | null>(null);

  // ✅ 거리 기반 아바타 업데이트 (의존성 최소화)
  const updateAvatarPosition = useCallback((coord: Coord, force = false) => {
    if (!mapRef.current || !enableAvatar) return;

    const now = Date.now();

    // 거리 기반 업데이트: 최소 10m 이상 이동했을 때만 업데이트
    if (!force && pendingAvatarUpdate) {
      const distance = Math.sqrt(
        Math.pow((coord.latitude - pendingAvatarUpdate.latitude) * 111000, 2) +
        Math.pow((coord.longitude - pendingAvatarUpdate.longitude) * 111000, 2)
      );

      // 10m 미만 이동이고 시간도 충분히 지나지 않았다면 스킵
      if (distance < 10 && now - lastAvatarUpdate < avatarUpdateInterval) {
        setPendingAvatarUpdate(coord);
        return;
      }
    }

    try {
      mapRef.current
        .pointForCoordinate(coord)
        .then(({ x, y }) => {
          setAvatarScreenPos({ x, y });
          setLastAvatarUpdate(now);
          setPendingAvatarUpdate(null);
        })
        .catch((error) => {
          console.log('아바타 위치 업데이트 실패:', error);
          setAvatarScreenPos(null);
        });
    } catch (error) {
      console.log('아바타 위치 계산 오류:', error);
    }
  }, [enableAvatar, pendingAvatarUpdate]); // 의존성 최소화

  useEffect(() => {
    if (!isActive) return;
    if (mode === 'track' && sectionIndex < sections.length) {
      const sec = sections[sectionIndex];
      if (totalDistance >= sec.end) {
        Speech.speak(`${sec.name}입니다. 속도를 조절해주세요.`);
        setSectionIndex((i) => i + 1);
      }
    } else if (mode !== 'track' && totalDistance >= nextAnnounceKm) {
      const meters = Math.round(nextAnnounceKm * 1000);
      Speech.speak(`${meters}미터 지점에 도달했습니다.`);
      setNextAnnounceKm((km) => km + 0.1);
    }
  }, [totalDistance, isActive, mode, sections, sectionIndex, nextAnnounceKm]);

  const [mapRegion, setMapRegion] = useState<Region>();
  const [isPaused, setIsPaused] = useState(false);

  const startFinishPress = () => {
  setIsFinishPressed(true);
  setFinishProgress(0);
  
  // 즉시 진동 피드백
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  
  // 버튼 스케일 애니메이션
  Animated.spring(scaleAnimation, {
    toValue: 0.95,
    useNativeDriver: true,
    tension: 100,
    friction: 3,
  }).start();
  
  // 프로그레스 애니메이션
  Animated.timing(progressAnimation, {
    toValue: 1,
    duration: 3000,
    useNativeDriver: false,
  }).start();
  
  // 진행률 업데이트 및 중간 진동
  let progress = 0;
  finishIntervalRef.current = setInterval(() => {
    progress += 1;
    setFinishProgress(progress);
    
    // 33%, 66%에서 추가 진동
    if (progress === 33 || progress === 66) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (progress >= 100) {
      // 완료 시 강한 진동
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleFinish();
      clearInterval(finishIntervalRef.current!);
      finishIntervalRef.current = null;
    }
  }, 30); // 30ms마다 업데이트 (3초 / 100 = 30ms)
  
  // 3초 후 자동 완료
  timeoutRef.current = setTimeout(() => {
    if (finishIntervalRef.current) {
      clearInterval(finishIntervalRef.current);
      finishIntervalRef.current = null;
    }
    handleFinish();
    timeoutRef.current = null;
  }, 3000);
};

const cancelFinishPress = () => {
  setIsFinishPressed(false);
  setFinishProgress(0);
  
  // 취소 진동
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  
  // 애니메이션 리셋
  Animated.spring(scaleAnimation, {
    toValue: 1,
    useNativeDriver: true,
    tension: 100,
    friction: 3,
  }).start();
  
  progressAnimation.setValue(0);
  
  // 타이머 정리
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
  
  if (finishIntervalRef.current) {
    clearInterval(finishIntervalRef.current);
    finishIntervalRef.current = null;
  }
  
  // 안내 메시지
  Alert.alert('종료 취소', '러닝 종료가 취소되었습니다.', [{ text: '확인' }]);
};

  useEffect(() => {
    // 컴포넌트 마운트 시 무조건 초기화
    resetRunning();
    setIsPaused(false);
    setSummaryData(null);
    setAvatarScreenPos(null);
    setAvatarReady(false);
    setSectionIndex(0);
    setNextAnnounceKm(0.1);

    console.log('🔄 러닝 화면 진입 - 모든 상태 초기화 완료');
  }, []); // 마운트 시 한 번만 실행

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("위치 권한 필요", "러닝을 기록하려면 위치 권한이 필요합니다.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync();
      const initialRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(initialRegion);

      // ⚠️ 중요: 시작 버튼을 누르기 전까지는 아바타 위치만 설정
      // 경로 기록은 하지 않음
      console.log('📍 초기 위치 설정 완료 (경로 기록 시작 전)');
    };

    // 초기화 완료 후 권한 요청
    const timer = setTimeout(requestPermissions, 100);
    return () => clearTimeout(timer);
  }, []);

  // ✅ 성능 기반 동적 조절
  useEffect(() => {
    const performanceCheck = setInterval(() => {
      const memoryUsage = (performance as any)?.memory?.usedJSHeapSize || 0;
      const isHighMemory = memoryUsage > 80 * 1024 * 1024; // 80MB로 임계점 상향

      if (isHighMemory && performanceMode !== 'eco') {
        console.log('🔥 높은 메모리 사용 감지, ECO 모드로 전환');
        setPerformanceMode('eco');
        setAvatarUpdateInterval(5000); // 5초로 설정
      } else if (!isHighMemory && performanceMode !== 'normal') {
        console.log('✅ 메모리 사용량 정상, 일반 모드로 복귀');
        setPerformanceMode('normal');
        setAvatarUpdateInterval(2000); // 2초로 복귀
      }
    }, 20000); // 20초마다 체크로 빈도 감소

    return () => clearInterval(performanceCheck);
  }, [performanceMode]);

  // ✅ GPS 경로 따라 아바타 이동 - 성능 최적화
  useEffect(() => {
    if (path.length > 0) {
      const current = path[path.length - 1];

      // 지도 중심 이동 (GPS는 즉시 반영)
      if (path.length > 1) {
        const previous = path[path.length - 2];
        const direction = calculateDirection(previous, current);

        if (direction !== null) {
          const headingDiff = Math.abs(direction - lastMapHeading);
          const shouldRotate = headingDiff > 15 || headingDiff > 345;

          if (shouldRotate) {
            const animationDuration = performanceMode === 'eco' ? 1000 : 500;

            try {
              mapRef.current?.animateCamera({
                center: current,
                heading: direction,
              }, { duration: animationDuration });

              setLastMapHeading(direction);
            } catch (error) {
              console.log('지도 애니메이션 오류:', error);
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
        const newRegion = {
          latitude: current.latitude,
          longitude: current.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setMapRegion(newRegion);
      }

      // ✅ 아바타는 거리/시간 기반으로 선별적 업데이트
      updateAvatarPosition(current);
    }
  }, [path, performanceMode, lastMapHeading]); // updateAvatarPosition 의존성 제거

  const onMainPress = async () => {
    if (isActive) {
      pauseRunning();
      setIsPaused(true);
      Speech.speak('일시 정지 합니다.');
    } else if (isPaused) {
      resumeRunning();
      setIsPaused(false);
      Speech.speak('러닝을 재개합니다.');
    } else {
      resetRunning();
      startRunning();
      setIsPaused(false);
      setSectionIndex(0);
      setNextAnnounceKm(0.1);
      await addStartPointIfNeeded();
      Speech.speak('러닝을 시작합니다.');
      if (mode === 'track') {
        Speech.speak('웜업 구간입니다. 속도를 조절해주세요.');
      }
    }
  };

  const handleFinish = useCallback(() => {
    stopRunning();
    Speech.speak('러닝을 종료합니다.');
    const snapshot = {
      path: [...path],
      totalDistance,
      elapsedTime,
      trackId,
    };
    setSummaryData(snapshot);
    setIsFinishModalVisible(true);
  }, [stopRunning, path, totalDistance, elapsedTime, trackId]);

  useEffect(() => {
    if (isActive && mode === 'track' && trackKm && totalDistance >= trackKm) {
      handleFinish();
    }
  }, [totalDistance, isActive, mode, trackKm, handleFinish]);

  const handleBackPress = () => {
    if (elapsedTime > 0) {
      Alert.alert(
        "러닝 중단",
        "진행 중인 러닝 기록이 사라집니다. 정말로 나가시겠습니까?",
        [
          { text: "취소", style: "cancel" },
          { text: "나가기", style: "destructive", onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleAvatarReady = useCallback(() => {
    setAvatarReady(true);
    if (path.length > 0) {
      const coord = path[path.length - 1];
      updateAvatarPosition(coord, true); // 강제 업데이트
    }
  }, [path]); // updateAvatarPosition 의존성 제거

  const mainLabel = isActive ? '정지' : isPaused ? '재개' : '시작';

  useEffect(() => {
    return () => {
      resetRunning();
      setIsPaused(false);
      setSummaryData(null);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={mapRegion}
        region={mapRegion}
        showsUserLocation={false}
        followsUserLocation={false}
        showsMyLocationButton={false}
        rotateEnabled={true}
        pitchEnabled={false}
        zoomEnabled={true}
        scrollEnabled={true}
      >
        {/* ✅ 경로는 러닝이 시작되고 path에 데이터가 있을 때만 표시 */}
        {isActive && path.length > 0 && (
          <Polyline
            coordinates={path}
            strokeColor="#007aff"
            strokeWidth={6}
          />
        )}
      </MapView>

      {avatarScreenPos && (
        <AvatarOverlay
          screenPos={avatarScreenPos}
          isRunning={isActive}
          speed={displaySpeed}
          onAvatarReady={handleAvatarReady}
        />
      )}

      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 260 + insets.bottom,
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
          source={require('../../assets/images/MyLocation.png')}
          style={{ width: 20, height: 20, tintColor: 'black' }}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* 🔍 디버깅용: 마커와 아바타 위치 비교 */}
      {__DEV__ && avatarScreenPos && (
        <View>
          {/* GPS 위치 마커 (빨간 점) */}
          <View
            style={{
              position: 'absolute',
              left: avatarScreenPos.x - 5,
              top: avatarScreenPos.y - 5,
              width: 10,
              height: 10,
              backgroundColor: 'red',
              borderRadius: 5,
              zIndex: 1000,
            }}
          />
          {/* 아바타 발 위치 (초록 점) */}
          <View
            style={{
              position: 'absolute',
              left: avatarScreenPos.x - 35 + 35 - 3, // 아바타 발 위치
              top: avatarScreenPos.y - 70 + 70 - 3,  // 아바타 발 위치
              width: 6,
              height: 6,
              backgroundColor: 'green',
              borderRadius: 3,
              zIndex: 1001,
            }}
          />
        </View>
      )}

      <View style={[styles.overlay, , { paddingBottom: 40 + insets.bottom }]}>
        <Text style={styles.distance}>{totalDistance.toFixed(2)} km</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>{displaySpeed.toFixed(1)} km/h</Text>
          <Text style={styles.stat}>{formatTime(elapsedTime)}</Text>
          <Text style={styles.stat}>{instantPace}</Text>
        </View>

<View style={styles.buttonRow}>
  {(isPaused || (!isActive && elapsedTime > 0)) && (
    <Animated.View 
      style={[
        { flex: 1, marginHorizontal: 5 },
        { transform: [{ scale: scaleAnimation }] }
      ]}
    >
      <Pressable
        style={[
          styles.controlButton, 
          { 
            backgroundColor: isFinishPressed ? '#ff6b6b' : '#333',
            position: 'relative',
            overflow: 'hidden',
          }
        ]}
        onPressIn={startFinishPress}
        onPressOut={cancelFinishPress}
      >
        {/* 배경 프로그레스 바 */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: '#ff4444',
            width: progressAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
            opacity: isFinishPressed ? 0.3 : 0,
          }}
        />
        
        {/* 원형 프로그레스 인디케이터 */}
        {isFinishPressed && (
          <View style={styles.progressContainer}>
            <View style={styles.progressCircle}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    transform: [{
                      rotate: progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    }],
                  },
                ]}
              />
            </View>
            <Text style={[styles.controlText, { fontSize: 12 }]}>
              {Math.round(finishProgress)}%
            </Text>
          </View>
        )}
        
        {/* 버튼 텍스트 */}
        <Text style={[
          styles.controlText,
          { 
            opacity: isFinishPressed ? 0.8 : 1,
            fontSize: isFinishPressed ? 14 : 18,
          }
        ]}>
          {isFinishPressed ? '종료 중...' : '종료'}
        </Text>
      </Pressable>
    </Animated.View>
  )}
          <Pressable
            onPress={onMainPress}
            style={[styles.controlButton, { backgroundColor: isActive ? '#ff4d4d' : '#007aff' }]}
          >
            <Text style={styles.controlText}>{mainLabel}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        transparent
        visible={isFinishModalVisible}
        animationType="fade"
        onRequestClose={() => setIsFinishModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>러닝 종료</Text>
            <Text style={styles.modalText}>수고하셨습니다! 러닝이 안전하게 종료되었습니다.</Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                if (summaryData) {
                  router.replace({
                    pathname: '/Summary',
                    params: { data: JSON.stringify(summaryData) },
                  });
                }
                setIsFinishModalVisible(false);
              }}
            >
              <Text style={styles.confirmButtonText}>결과 확인하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  headerBar: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#333' },
  overlay: { width: '100%', backgroundColor: 'rgba(255,255,255,0.9)', padding: 20, paddingBottom: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center', zIndex: 1000 },
  distance: { fontSize: 60, fontWeight: '800', color: '#1c1c1e' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 15, marginBottom: 20 },
  stat: { fontSize: 24, fontWeight: '600', color: '#333', textAlign: 'center', flex: 1 },
  buttonRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  controlText: { color: 'white', fontSize: 18, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '80%', backgroundColor: 'white', paddingVertical: 30, paddingHorizontal: 20, borderRadius: 15, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  confirmButton: { backgroundColor: '#007aff', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8 },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    progressContainer: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
  controlButton: { 
    flex: 1, 
    marginHorizontal: 5, 
    paddingVertical: 15, 
    borderRadius: 10, 
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    position: 'relative', // 프로그레스 바를 위해 추가
  },
});