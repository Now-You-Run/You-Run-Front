import { RouteProp, useRoute } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TrackSimulationMap from '../../components/TrackSimputionMap';

// 라우트 파라미터 타입 정의
type RouteParams = {
  Simulation: {
    trackId: number;
  };
};

const SimulationScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'Simulation'>>();
  const trackId = route.params?.trackId || 2; // 기본값 1
    // const trackId = 2

  return (
    <View style={styles.container}>
      <Text style={styles.header}>러닝 경로 시뮬레이션</Text>
      <Text style={styles.subHeader}>Track ID: {trackId}</Text>
      
      <View style={styles.mapContainer}>
        <TrackSimulationMap trackId={trackId} />
      </View>
      
      <View style={styles.controls}>
        <Text>속도 조절, 일시정지 등 컨트롤 추가 가능</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  subHeader: {
    fontSize: 16,
    textAlign: 'center',
    paddingBottom: 10,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  controls: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
});

export default SimulationScreen;
