import { useRepositories } from '@/context/RepositoryContext';
import { saveTrackInfo, TrackInfo } from '@/repositories/appStorage';
import { RunningRecord } from '@/types/LocalRunningRecordDto'; // [1. 추가] 로컬 기록 타입을 가져옵니다.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

export type SourceType = 'local' | 'server';

// 화면 표시에 사용할 통일된 데이터 구조 정의
interface DisplayableTrackDetail {
  id: string;
  name: string;
  path: { latitude: number; longitude: number }[];
  distance: number;
  rate?: number;
  // [수정] 서버 랭킹과 로컬 랭킹의 타입을 모두 포함할 수 있도록 유니온 타입 사용
  ranking?: ({ username: string; duration: number } | RunningRecord)[];
}

export default function TrackDetailScreen() {
  const router = useRouter();
  const { trackId, source } = useLocalSearchParams<{ trackId: string; source: SourceType }>();

  // [2. 수정] localRunningRecordRepository도 가져옵니다.
  const { localTrackRepository, trackRecordRepository, localRunningRecordRepository } = useRepositories();

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
              id: trackId,
              name: serverData.trackInfoDto.name,
              path: serverData.trackInfoDto.path,
              distance: serverData.trackInfoDto.totalDistance,
              rate: serverData.trackInfoDto.rate,
              ranking: serverData.trackRecordDto,
            };
          }
        } else if (source === 'local' && localTrackRepository && localRunningRecordRepository) {
          // [3. 핵심 수정] 로컬 트랙 상세 정보와 함께, 해당 트랙의 러닝 기록(랭킹)도 불러옵니다.
          const localData = await localTrackRepository.readById(parseInt(trackId, 10));
          // `readByTrackId`는 LocalRunningRecordRepository에 구현되어 있어야 합니다.
          const rankingsData = await localRunningRecordRepository.readByTrackId(parseInt(trackId, 10));

          if (localData) {
            fetchedData = {
              id: localData.id.toString(),
              name: localData.name,
              path: JSON.parse(localData.path || '[]'),
              distance: localData.totalDistance,
              rate: localData.rate,
              // 불러온 랭킹 데이터를 할당합니다.
              ranking: rankingsData || [],
            };
            console.log(`track data ${localData.path}`)
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
  }, [trackId, source, localTrackRepository, trackRecordRepository, localRunningRecordRepository]);

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
        {/* [4. 수정] `ranking` 배열의 타입이 다르므로, 타입 가드를 사용하여 안전하게 렌더링합니다. */}
        {track.ranking && track.ranking.length > 0 ? (
          track.ranking.map((record, idx) => (
            <View key={idx} style={styles.rankItem}>
              {/* 서버 기록은 `username`, 로컬 기록은 `name` 속성을 가질 수 있으므로, 둘 다 확인합니다. */}
              <Text>{'username' in record ? record.username : record.name || '나의 기록'}</Text>
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
            const firstCoordinate = track.path?.[0];
            const isPathValid =
              firstCoordinate &&
              typeof firstCoordinate.latitude === 'number' &&
              typeof firstCoordinate.longitude === 'number';

            if (!isPathValid) {
              console.error("경로 정보가 비어있거나 유효하지 않아 대결을 시작할 수 없습니다.");
              alert("유효한 경로 데이터가 없어 대결을 시작할 수 없습니다.");
              return; // 함수 실행을 여기서 중단
            }
            const info: TrackInfo = {
              id: track.id,
              path: track.path,
              origin: track.path[0],
              distanceMeters: track.distance,
            };
            await saveTrackInfo(info);
            router.push({ pathname: './bot-pace', params: { trackId: track.id , source: source,} });
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
