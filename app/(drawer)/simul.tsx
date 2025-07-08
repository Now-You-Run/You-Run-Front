import TrackSimulationMap from '@/components/running/simul/TrackSimutionMap';
import { useRepositories } from '@/context/RepositoryContext'; // [1. 추가]
import { TrackRecordData } from "@/types/response/RunningTrackResponse";
import { useLocalSearchParams } from 'expo-router'; // [2. 수정] useRoute 대신 expo-router 훅 사용
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function SimulationScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const { trackRecordRepository } = useRepositories(); // [3. 추가]

  const [track, setTrack] = useState<TrackRecordData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // trackId나 repository가 준비되지 않았으면 실행하지 않습니다.
    if (!trackId || !trackRecordRepository) return;

    const fetchTrack = async () => {
      setIsLoading(true);
      try {
        // [4. 수정] static 메서드 대신, 주입받은 인스턴스의 메서드를 호출합니다.
        const trackData = await trackRecordRepository.fetchTrackRecord(trackId);
        setTrack(trackData);
      } catch (error) {
        console.error("Failed to fetch track for simulation:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrack();
  }, [trackId, trackRecordRepository]); // 의존성 배열에 추가

  return (
    <View style={styles.container}>
      <Text style={styles.header}>러닝 경로 시뮬레이션</Text>
      <Text style={styles.subHeader}>Track ID: {trackId}</Text>
      
      <View style={styles.mapContainer}>
        {/* [5. 추가] 로딩 중일 때는 스피너를, 로딩 완료 시 지도를 보여줍니다. */}
        {isLoading ? (
          <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="#4a90e2" />
        ) : (
          <TrackSimulationMap path={track?.trackInfoDto.path ?? []} />
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
});
