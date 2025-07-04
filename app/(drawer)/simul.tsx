import TrackSimulationMap from '@/components/running/simul/TrackSimutionMap';
import { TrackRecordRepository } from '@/storage/TrackRecordRepository';
import { TrackRecordData } from "@/types/response/RunningTrackResponse";
import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';


// 라우트 파라미터 타입 정의
type RouteParams = {
  Simulation: {
    trackId: number;
  };
};

const SimulationScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'Simulation'>>();
  const trackId = route.params?.trackId || 6; // 기본값 1
    // const trackId = 2
  const [track, setTrack] = useState<TrackRecordData | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    TrackRecordRepository.fetchTrackRecord(trackId)
      .then((trackRecordData) => setTrack(trackRecordData))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>러닝 경로 시뮬레이션</Text>
      <Text style={styles.subHeader}>Track ID: {trackId}</Text>
      
      <View style={styles.mapContainer}>
       <TrackSimulationMap path={track?.trackInfoDto.path ?? []} />
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
