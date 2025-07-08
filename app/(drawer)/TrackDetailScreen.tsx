import { useRepositories } from '@/context/RepositoryContext';
import { saveTrackInfo, TrackInfo } from '@/repositories/appStorage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

type SourceType = 'local' | 'server';

// 화면 표시에 사용할 통일된 데이터 구조 정의
interface DisplayableTrackDetail {
  id: string;
  name: string;
  path: { latitude: number; longitude: number }[];
  distance: number;
  rate?: number;
  ranking?: { username: string; duration: number }[];
}

export default function TrackDetailScreen() {
  const router = useRouter();
  const { trackId, source } = useLocalSearchParams<{ trackId: string; source: SourceType }>();
  
  const { localTrackRepository, trackRecordRepository } = useRepositories();

  const [track, setTrack] = useState<DisplayableTrackDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!trackId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        let fetchedData: DisplayableTrackDetail | null = null;
        
        if (source === 'server' && trackRecordRepository) {
          const serverData = await trackRecordRepository.fetchTrackRecord(trackId);
          if (serverData) {
            fetchedData = {
              // [핵심 수정] 존재하지 않는 trackInfoDto.id 대신,
              // 이미 알고 있는 trackId를 직접 사용합니다.
              id: trackId,
              name: serverData.trackInfoDto.name,
              path: serverData.trackInfoDto.path,
              distance: serverData.trackInfoDto.totalDistance,
              rate: serverData.trackInfoDto.rate,
              ranking: serverData.trackRecordDto,
            };
          }
        } else if (source === 'local' && localTrackRepository) {
          const localData = await localTrackRepository.readById(parseInt(trackId, 10));
          if (localData) {
            fetchedData = {
              id: localData.id.toString(),
              name: localData.name,
              path: JSON.parse(localData.path || '[]'),
              distance: localData.totalDistance,
              rate: localData.rate,
              ranking: [],
            };
          }
        }
        setTrack(fetchedData);
      } catch (error) {
        console.error(`Failed to load track detail for id ${trackId}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [trackId, source, localTrackRepository, trackRecordRepository]);

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" /></View>;
  }
  if (!track) {
    return <View style={styles.centerContainer}><Text>트랙 정보를 불러올 수 없습니다.</Text></View>;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: track.path[0]?.latitude || 37.5665,
          longitude: track.path[0]?.longitude || 126.978,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Polyline coordinates={track.path} strokeWidth={4} strokeColor="#4a90e2" />
      </MapView>
      
      <View style={styles.content}>
        <Text style={styles.title}>{track.name}</Text>
        <Text>총 거리: {(track.distance / 1000).toFixed(2)} km</Text>
        {track.rate != null && <Text>평점: {track.rate}</Text>}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>랭킹</Text>
        {track.ranking && track.ranking.length > 0 ? (
          track.ranking.map((record, idx) => (
            <View key={idx} style={styles.rankItem}>
              <Text>{record.username}</Text>
              <Text>{Math.floor(record.duration / 60)}분 {record.duration % 60}초</Text>
            </View>
          ))
        ) : (
          <Text>기록이 없습니다.</Text>
        )}
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.botButton}
          onPress={async () => {
            const info: TrackInfo = {
              id: track.id,
              path: track.path,
              origin: track.path[0],
              distanceMeters: track.distance,
            };
            await saveTrackInfo(info);
            router.push({ pathname: './bot-pace', params: { trackId: track.id } });
          }}
        >
          <Text style={styles.botButtonText}>코칭 봇과의 대결</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: '100%', height: 300 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  rankItem: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  footer: { padding: 16, marginTop: 'auto' },
  botButton: { backgroundColor: '#ff6666', padding: 14, borderRadius: 10, alignItems: 'center' },
  botButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
