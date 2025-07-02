// 러닝 요약

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { LatLng, Polyline } from 'react-native-maps';

// 시간(mm:ss) 포맷 - 재사용할 헬퍼들 (복붙 혹은 별도 utils 파일로 분리)
const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// 평균 페이스(분'초") 계산
const calculateAveragePace = (km: number, sec: number): string => {
  if (km < 0.01 || sec === 0) return `0'00"`;
  const paceSec = sec / km;
  const m = Math.floor(paceSec / 60);
  const s = Math.round(paceSec % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};

export default function SummaryScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const { path, totalDistance, elapsedTime } = JSON.parse(data);

  // 화면 크기 기반으로 지도 크기 계산
  const { width } = Dimensions.get('window');
  const mapSize = width * 0.9;

  // 오늘 날짜 문자열
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const pace = calculateAveragePace(totalDistance, elapsedTime);
  // (칼로리는 따로 계산 로직을 넣으셔도 되고, 우선 예시로 고정)
  const calories = Math.round(totalDistance * 60);

  // useEffect(() => {
  //   const save = async () => {
  //     const track: RunningTrackStoreRequest = {
  //       userId: 1,
  //       date: new Date().toString(),
  //       distance: totalDistance,
  //       path: path,
  //     };
  //     const success = await RunningTrackRepository.saveTrack(track);
  //     if (success) {
  //       console.log('Track saved successfully!');
  //     } else {
  //       console.log('Track save failed!');
  //     }
  //   };
  //   save();
  // }, []); // 의존성 배열이 빈 배열이므로 최초 1회만 실행


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finish</Text>

      <MapView
        style={{ width: mapSize, height: mapSize, borderRadius: 10 }}
        initialRegion={{
          latitude: path[0].latitude,
          longitude: path[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Polyline
          coordinates={path as LatLng[]}
          strokeColor="#ff4d4d"
          strokeWidth={4}
        />
      </MapView>

      <Text style={styles.date}>{dateStr}</Text>
      <Text style={styles.distance}>{totalDistance.toFixed(2)} km</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>시간</Text>
          <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>페이스</Text>
          <Text style={styles.statValue}>{pace}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>칼로리</Text>
          <Text style={styles.statValue}>{calories}</Text>
        </View>
      </View>

      <Pressable style={styles.homeButton} onPress={() => router.replace('/')}>
        <Text style={styles.homeIcon}>🏠</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 20 },
  date: { marginTop: 10, fontSize: 16, color: '#666' },
  distance: { fontSize: 64, fontWeight: '800', marginVertical: 10 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
  },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 14, color: '#888' },
  statValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
  homeButton: {
    marginTop: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007aff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIcon: { fontSize: 28, color: '#fff' },
});
