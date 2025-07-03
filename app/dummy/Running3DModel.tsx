import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export interface Running3DModelProps {
  heading: number;
  botPosition: { latitude: number; longitude: number } | null;
  origin: { latitude: number; longitude: number };
  path: { latitude: number; longitude: number }[]; // ✅ 추가
}

// GPS -> Three.js 로컬 좌표 변환 함수 예시
function convertLatLngToLocal(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number
) {
  const R = 6371000; // radius of Earth in meters
  const dLat = ((lat - originLat) * Math.PI) / 180;
  const dLng = ((lng - originLng) * Math.PI) / 180;
  const x = dLng * R * Math.cos((originLat * Math.PI) / 180);
  const z = dLat * R;
  return { x, z };
}

export default function Running3DModel({
  heading,
  botPosition,
  origin,
}: Running3DModelProps) {
  const modelRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const requestRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    if (!modelRef.current || !cameraRef.current || !origin || !botPosition)
      return;

    const pos = convertLatLngToLocal(
      botPosition.latitude,
      botPosition.longitude,
      origin.latitude,
      origin.longitude
    );

    modelRef.current.position.set(pos.x, 0, pos.z);
    modelRef.current.rotation.y = (-heading * Math.PI) / 180;

    cameraRef.current.position.set(pos.x, 5, pos.z + 10);
    cameraRef.current.lookAt(pos.x, 0, pos.z);
  }, [botPosition, heading, origin]);

  const onContextCreate = async (gl: any) => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3);
    cameraRef.current = camera;

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
    model.scale.set(2, 2, 2);
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
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      mixerRef.current?.stopAllAction();
    };
  }, []);

  return <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />;
}
