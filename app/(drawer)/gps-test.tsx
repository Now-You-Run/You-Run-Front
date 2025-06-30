// app/(drawer)/gps-test.tsx
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import MapView, { Polyline, Region } from "react-native-maps";
import * as Location from "expo-location";
import KalmanFilter from "kalmanjs";

type LatLng = { latitude: number; longitude: number };

export default function GpsTest() {
  // 1) 초기 지도 중심 (한 번만 세팅)
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);

  // 2) Polyline에 찍을 raw 좌표
  const rawCoordsRef = useRef<LatLng[]>([]);

  // 3) Polyline ref (setNativeProps용)
  const polyRef = useRef<React.ElementRef<typeof Polyline> | null>(null);

  // 4) 칼만 필터 인스턴스 (초기 region 보정용)
  const latFilter = useRef(new KalmanFilter({ R: 0.001, Q: 10 })).current;
  const lngFilter = useRef(new KalmanFilter({ R: 0.001, Q: 10 })).current;

  useEffect(() => {
    (async () => {
      // 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted");
        return;
      }

      // 초기 위치 받아오기
      const { coords } = await Location.getCurrentPositionAsync({});
      // 최초 region은 칼만 필터 보정
      const fLat0 = latFilter.filter(coords.latitude);
      const fLng0 = lngFilter.filter(coords.longitude);

      setInitialRegion({
        latitude: fLat0,
        longitude: fLng0,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      // rawCoords 초기값 (filter 없이 그대로)
      rawCoordsRef.current = [
        { latitude: coords.latitude, longitude: coords.longitude },
      ];
    })();
  }, [latFilter, lngFilter]);

  if (!initialRegion) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation
      followsUserLocation
      onUserLocationChange={(e) => {
        const coord = e.nativeEvent.coordinate;
        if (!coord) return; // undefined guard

        const { latitude, longitude } = coord;
        // raw 좌표로 바로 polyline에 추가
        const next = [...rawCoordsRef.current, { latitude, longitude }];
        rawCoordsRef.current = next;
        polyRef.current?.setNativeProps({ coordinates: next });
      }}
    >
      <Polyline
        ref={polyRef}
        coordinates={rawCoordsRef.current}
        strokeWidth={4}
        strokeColor="red"
        lineJoin="round"
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
