import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import { useUserStore } from '../stores/userStore';

interface HomeAvatarDisplayProps {
  avatarUrl?: string;  // optional로 변경
}

export const HomeAvatarDisplay = ({ avatarUrl }: HomeAvatarDisplayProps) => {
  const webViewRef = useRef<WebView>(null);
  const CONTAINER_WIDTH = 350;
  const CONTAINER_HEIGHT = 600; // 500에서 600으로 증가

  // 전역 상태에서 선택된 아바타 URL 가져오기
  const selectedAvatar = useUserStore(state => state.profile?.selectedAvatar);
  const finalAvatarUrl = avatarUrl || selectedAvatar?.url;

  useEffect(() => {
    console.log('HomeAvatarDisplay - Selected Avatar Changed:', selectedAvatar);
    console.log('HomeAvatarDisplay - Final Avatar URL:', finalAvatarUrl);
  }, [selectedAvatar, finalAvatarUrl]);

  // 아바타 URL이 없으면 렌더링하지 않음
  if (!finalAvatarUrl) {
    console.log('HomeAvatarDisplay - No Avatar URL available');
    return <View style={styles.container} />;
  }

  const getAvatarHtml = (glbUrl: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box;
          }
          
          html, body { 
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background-color: transparent;
          }

          #canvas-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: transparent;
          }

          canvas {
            width: 100% !important;
            height: 100% !important;
            outline: none;
          }
        </style>
      </head>
      <body>
        <div id="canvas-container"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
        <script>
          const avatarUrl = "${glbUrl}";
          console.log('Loading avatar from URL:', avatarUrl);
          
          let scene, camera, renderer, avatar, mixer;
          let actions = {};
          let currentAction = null;
          let clock = new THREE.Clock();
          
          function initScene() {
            const container = document.getElementById('canvas-container');
            
            scene = new THREE.Scene();
            
            const fov = 35;
            const aspect = container.clientWidth / container.clientHeight;
            camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
            
            camera.position.set(0, 0.3, 7); // y값을 0.1에서 0.3으로 다시 높임
            camera.lookAt(0, 0, 0);
            
            renderer = new THREE.WebGLRenderer({
              alpha: true,
              antialias: true,
              powerPreference: "high-performance",
              precision: "highp"
            });
            
            renderer.setSize(container.clientWidth, container.clientHeight, true);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            
            container.innerHTML = '';
            container.appendChild(renderer.domElement);
            
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 5, 5);
            scene.add(directionalLight);
            
            window.addEventListener('resize', onWindowResize, false);
          }
          
          async function loadGLTF(url) {
            const loader = new THREE.GLTFLoader();
            return new Promise((resolve, reject) => {
              loader.load(url, resolve, undefined, reject);
            });
          }
          
          async function loadAnimations() {
            const animUrls = {
              stretch: "https://raw.githubusercontent.com/Now-You-Run/Animation/main/stretching.glb"
            };
            
            for (const [name, url] of Object.entries(animUrls)) {
              try {
                const gltf = await loadGLTF(url);
                if (gltf.animations && gltf.animations.length > 0) {
                  const clip = RemapBones(gltf.animations[0], name);
                  if (clip) {
                    const action = mixer.clipAction(clip);
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
            const boneMapping = {
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
            
            const tracks = [];
            
            clip.tracks.forEach(track => {
              const [boneName, ...propParts] = track.name.split('.');
              const property = propParts.join('.');
              
              const mappedBoneName = boneMapping[boneName];
              
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
                  tracks.push(newTrack);
                } else if (property === 'quaternion') {
                  const newTrack = new THREE.QuaternionKeyframeTrack(
                    mappedBoneName + '.' + property, 
                    track.times, 
                    track.values
                  );
                  tracks.push(newTrack);
                } 
              }
            });

            return new THREE.AnimationClip(animationName + '_remapped', clip.duration, tracks);
          }
          
          function playAction(name) {
            const action = actions[name];
            if (!action) return;
            
            if (currentAction) {
              currentAction.fadeOut(0.3);
            }
            
            action.reset().fadeIn(0.3).play();
            currentAction = action;
          }
          
          async function loadAvatar() {
            try {
              console.log('Starting avatar load...');
              const gltf = await loadGLTF(avatarUrl);
              console.log('Avatar loaded successfully');
              
              avatar = gltf.scene;
              
              avatar.scale.setScalar(1.6); // 1.4에서 1.6으로 크기 증가
              avatar.position.set(0, -0.2, 0);
              
              avatar.rotation.x = Math.PI / 2;
              avatar.rotation.y = 0;
              avatar.rotation.z = Math.PI * 2;
              
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
              
              mixer = new THREE.AnimationMixer(avatar);
              await loadAnimations();
              playAction("stretch");
              
              animate();
              
              window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "avatarReady" }));
            } catch (e) {
              console.error("아바타 로딩 실패:", e);
              window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "error", error: e.message }));
            }
          }
          
          function animate() {
            requestAnimationFrame(animate);
            
            if (mixer) {
              const delta = clock.getDelta();
              mixer.update(delta);
            }
            
            renderer.render(scene, camera);
          }
          
          function onWindowResize() {
            const container = document.getElementById('canvas-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            
            renderer.setSize(width, height, true);
          }
          
          initScene();
          loadAvatar();
        </script>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT }]}>
      <WebView
        ref={webViewRef}
        source={{ html: getAvatarHtml(finalAvatarUrl) }}
        style={styles.webview}
        scrollEnabled={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    // 컨테이너 크기는 props로 전달받은 값을 사용
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
}); 