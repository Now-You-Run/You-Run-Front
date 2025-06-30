// RunReplayTmap.tsx
import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Button,
  Alert,
  Text,
  Pressable,
} from "react-native";
import MapView, {
  Polyline,
  Marker,
  PROVIDER_GOOGLE,
  AnimatedRegion,
} from "react-native-maps";
import { useRouter } from "expo-router";

// Tmap 앱키
const TMAP_APP_KEY = "EzfMTMu4gM21gAG6PkZzi58iap7I4qed8uUBpgiq";

type LatLng = { latitude: number; longitude: number };
const start: LatLng = { latitude: 37.4955, longitude: 127.0381 };
const end: LatLng = { latitude: 37.499, longitude: 127.043 };

// 두 점 사이 분할 헬퍼 (Haversine)
function densifyPath(path: LatLng[], segmentLenM = 5): LatLng[] {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dist = (p1: LatLng, p2: LatLng) => {
    const R = 6371000;
    const dLat = toRad(p2.latitude - p1.latitude);
    const dLng = toRad(p2.longitude - p1.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(p1.latitude)) *
        Math.cos(toRad(p2.latitude)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const out: LatLng[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i],
      p2 = path[i + 1];
    out.push(p1);
    const d = dist(p1, p2);
    const steps = Math.ceil(d / segmentLenM);
    for (let j = 1; j < steps; j++) {
      out.push({
        latitude: p1.latitude + ((p2.latitude - p1.latitude) * j) / steps,
        longitude: p1.longitude + ((p2.longitude - p1.longitude) * j) / steps,
      });
    }
  }
  out.push(path[path.length - 1]);
  return out;
}

export default function RunReplayTmap() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const polyRef = useRef<any>(null);

  const pathRef = useRef<LatLng[]>([]);
  const liveRef = useRef<LatLng[]>([start]);

  const markerRegionRef = useRef(
    new AnimatedRegion({ ...start, latitudeDelta: 0.01, longitudeDelta: 0.01 })
  );
  const markerRegion = markerRegionRef.current;

  const idxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const BASE_INTERVAL = 100;
  const [speed, setSpeed] = useState(1);

  // 경로 로드 및 초기화
  const fetchRoute = async () => {
    const url =
      "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json";
    const body = {
      startX: start.longitude.toString(),
      startY: start.latitude.toString(),
      endX: end.longitude.toString(),
      endY: end.latitude.toString(),
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
      startName: "출발",
      endName: "도착",
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { appKey: TMAP_APP_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const feats: any[] = Array.isArray(json.features) ? json.features : [];

      if (!feats.length) throw new Error("no route features");
      const raw: LatLng[] = [];
      feats.forEach((f: any) => {
        if (f.geometry?.type === "LineString") {
          (f.geometry.coordinates as [number, number][]).forEach(([lng, lat]) =>
            raw.push({ latitude: lat, longitude: lng })
          );
        }
      });

      pathRef.current = densifyPath(raw, 3);
      liveRef.current = [start];
      idxRef.current = 0;

      polyRef.current?.setNativeProps({ coordinates: liveRef.current });
      markerRegion.setValue({
        ...start,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      mapRef.current?.animateCamera({ center: start }, { duration: 0 });
    } catch (e: any) {
      Alert.alert("경로 로드 실패", e.message);
    }
  };

  // 한 점씩 그리는 함수
  const playStep = () => {
    const path = pathRef.current;
    if (idxRef.current >= path.length - 1) return;

    const next = path[++idxRef.current];
    liveRef.current.push(next);
    polyRef.current?.setNativeProps({ coordinates: liveRef.current });

    const interval = BASE_INTERVAL / speed;
    (markerRegion as any)
      .timing({
        toValue: { latitude: next.latitude, longitude: next.longitude },
        duration: interval,
        useNativeDriver: false,
      })
      .start();
    timerRef.current = setTimeout(playStep, interval);
  };

  // 재생
  const onStart = async () => {
    if (timerRef.current) return;
    if (!pathRef.current.length) await fetchRoute();
    playStep();
  };

  // 정지
  const onStop = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // 다시 보기: 초기화 후 자동 재생
  const onReplay = () => {
    onStop();
    liveRef.current = [start];
    idxRef.current = 0;
    polyRef.current?.setNativeProps({ coordinates: liveRef.current });
    markerRegion.setValue({
      ...start,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    playStep();
  };

  // 속도 조정, 재생 중 즉시 반영
  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      playStep();
    }
  };

  const increaseSpeed = () => changeSpeed(Math.min(speed + 0.5, 3));
  const decreaseSpeed = () => changeSpeed(Math.max(speed - 0.5, 0.5));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ ...start, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      >
        <Polyline
          ref={polyRef}
          coordinates={liveRef.current}
          strokeColor="green"
          strokeWidth={4}
          geodesic={false}
        />
        <Marker.Animated coordinate={markerRegion as any} />
      </MapView>

      {/* 홈 버튼 */}
      <Pressable style={styles.homeBtn} onPress={() => router.back()}>
        <Text style={styles.homeBtnText}>🏠 홈</Text>
      </Pressable>

      <View style={styles.controls}>
        <View style={styles.speedControls}>
          <Button title="-" onPress={decreaseSpeed} />
          <Text style={styles.speedText}>{speed.toFixed(1)}x</Text>
          <Button title="+" onPress={increaseSpeed} />
        </View>
        <View style={styles.actionControls}>
          <Button title="재생" onPress={onStart} />
          <Button title="중지" onPress={onStop} />
          <Button title="다시 보기" onPress={onReplay} />
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  homeBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "white",
    padding: 8,
    borderRadius: 20,
    elevation: 3,
  },
  homeBtnText: { fontSize: 16 },
  controls: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 8,
    borderRadius: 6,
  },
  speedControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  speedText: { marginHorizontal: 12, fontSize: 16 },
  actionControls: { flexDirection: "row", justifyContent: "space-between" },
});
