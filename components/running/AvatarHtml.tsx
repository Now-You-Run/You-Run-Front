
export const getAvatarHtml = (avatarId:string) => `
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
`