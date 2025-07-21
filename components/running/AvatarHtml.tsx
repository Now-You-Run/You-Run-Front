interface AvatarHtmlProps {
  avatarUrl: string;
}

export const getAvatarHtml = (avatarUrl: string) => `
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
        const avatarUrl = "${avatarUrl}"; // 이제 전체 URL을 직접 받음
        const animUrls = {
          idle: "https://euns0o.github.io/mixamo-animations/idle.glb",
          run: "https://euns0o.github.io/mixamo-animations/running.glb",
        };

        let scene, camera, renderer, avatar, mixer;
        let actions = {};
        let currentAction = null;
        let clock = new THREE.Clock();

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
            avatar.scale.setScalar(3.0); // 1.5에서 1.8로 크기 증가
            // ✅ 초기 위치만 설정하고, 이후에는 고정하지 않음
            avatar.position.set(0, -0.9, 0.2); // z 값을 0에서 0.2로 조정하여 앞으로 이동
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

            camera.position.set(0, -2.2, -2.5); // x 값을 0.5에서 0으로 조정하여 중앙으로 이동
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

        function animate() {
          requestAnimationFrame(animate);
          const delta = clock.getDelta();
          if (mixer) mixer.update(delta);
          renderer.render(scene, camera);
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
