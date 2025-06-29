import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// GPS 좌표 → Three.js 로컬 좌표 변환 (RunningScreen과 동일)
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

const calculateRotationAngle = (
  prev: { x: number; z: number },
  curr: { x: number; z: number }
) => {
  return Math.atan2(curr.x - prev.x, curr.z - prev.z);
};

interface Running3DModelProps {
  path: { latitude: number; longitude: number }[];
  origin: { latitude: number; longitude: number };
  heading: number;
}

export default function Running3DModel({
  path,
  origin,
  heading,
}: Running3DModelProps) {
  const modelRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const requestRef = useRef<number | null>(null);

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
    model.scale.set(1, 1, 1);
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

        // heading 기반 회전
        modelRef.current.rotation.y = (-heading * Math.PI) / 180;

        // 카메라 따라가기
        camera.position.set(curr.x, 5, curr.z + 10);
        camera.lookAt(curr.x, 0, curr.z);
      }

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
