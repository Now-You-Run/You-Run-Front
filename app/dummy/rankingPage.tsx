// screens/RankingScreen.tsx
import { loadPaths } from '@/repositories/RunningStorage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

type Track = {
  id: string;
  path: { latitude: number; longitude: number }[];
};

// 랭킹 데이터 샘플
const rankings = Array.from({ length: 51 }, (_, i) => ({
  rank: i + 1,
  time: `${15 + Math.floor(i / 2)}분 ${30 + (i % 2) * 30}초`,
}));


export default function RankingScreen() {
  const router = useRouter();
  const handleBackPress = () => {
    router.back();
  };

  // RankingPage.tsx에서 속도 데이터 받기
  const { trackId, avgPaceMinutes, avgPaceSeconds,distance } = useLocalSearchParams<{
  trackId?: string;
  avgPaceMinutes?: string;
  avgPaceSeconds?: string;
  distance?:string;
}>();

  // params 로 받은 거리(distance: string)를 km 단위 number 로 변환
  const distKm = distance ? Number(distance) / 1000 : undefined;
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    async function fetchTrack() {
      if (!trackId) return;
      const allTracks = await loadPaths();
      const selected = allTracks.find((t) => t.id === trackId);
      if (selected) setTrack(selected);
    }
    fetchTrack();
  }, [trackId]);

  const renderItem = ({ item }: { item: { rank: number; time: string } }) => (
    <View style={[styles.rankRow, item.rank === 51 && styles.myRankRow]}>
      <Text style={styles.rankText}>{item.rank}등</Text>
      <Text style={styles.timeText}>{item.time}</Text>
      {item.rank === 51 && (
        <View style={styles.meTag}>
          <Text style={styles.meTagText}>나</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ 뒤로가기 버튼 */}
      <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* 트랙 경로 지도 표시 */}
      {track ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: track.path[0]?.latitude || 37.5665,
            longitude: track.path[0]?.longitude || 126.978,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Polyline
            coordinates={track.path}
            strokeWidth={4}
            strokeColor="#4a90e2"
          />
        </MapView>
      ) : (
        <Text style={styles.loadingText}>트랙 정보를 불러오는 중입니다...</Text>
      )}


      {distKm != null && (
        <View style={styles.distanceWrapper}>
          <Text style={styles.distanceText}>
            총 거리: {distKm.toFixed(2)} km
          </Text>
        </View>
      )}

      {/* 상단 경로 및 버튼 */}
      <View style={styles.header}>
        <Text style={styles.startText}>시작 위치: 샛강역 3번출구</Text>
        <TouchableOpacity style={styles.findPathButton}>
          <Text style={styles.findPathButtonText}>길 찾기</Text>
        </TouchableOpacity>
      </View>

      {/* 랭킹 헤더 */}
      <View style={styles.rankHeader}>
        <Text style={styles.rankHeaderText}>랭킹</Text>
        <TouchableOpacity style={styles.breakRecordButton}>
          <Text style={styles.breakRecordButtonText}>도장깨기</Text>
        </TouchableOpacity>
      </View>

      {/* 랭킹 리스트 */}
      <FlatList
        data={rankings}
        renderItem={renderItem}
        keyExtractor={(item) => item.rank.toString()}
        contentContainerStyle={styles.listContent}
      />

      {/* VS 봇 버튼 */}
      <TouchableOpacity
        style={styles.vsBotButton}
        onPress={() =>
          // bot-pace.page에 트랙 아이디, 속도 넘기기
          router.push({
            pathname: './bot-pace',
            params: {
              trackId,
              avgPaceMinutes,
              avgPaceSeconds,
            },
          })
        }
      >
        <Text style={styles.vsBotButtonText}>VS 봇</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  map: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  startText: {
    fontSize: 16,
    color: '#333',
  },
  findPathButton: {
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  findPathButtonText: {
    fontSize: 14,
    color: '#333',
  },
  rankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  rankHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  breakRecordButton: {
    backgroundColor: '#f4e04d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  breakRecordButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 60,
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  myRankRow: {
    backgroundColor: '#e0f7ff',
  },
  rankText: {
    fontSize: 16,
    color: '#333',
  },
  timeText: {
    fontSize: 16,
    color: '#333',
  },
  meTag: {
    backgroundColor: '#ffeb3b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  meTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  vsBotButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ff6666',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  vsBotButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  distanceWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#eef',
    borderRadius: 8,
    marginBottom: 12,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
