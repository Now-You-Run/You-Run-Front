import { useRepositories } from '@/context/RepositoryContext';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import { formatTime } from '@/utils/RunningUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { LatLng, Polyline } from 'react-native-maps';

interface RecordDetail {
  id: number;
  mode: 'BOT' | 'MATCH' | 'LOCAL';
  trackId: number;
  trackName?: string;
  // --- 새로 추가 ---
  trackPath: LatLng[];
  userPath: LatLng[];
  // ------------
  distance: number;      // meters
  duration: number;      // seconds
  avgPace: number;       // sec/km
  calories: number;
  startedAt: string;
  finishedAt: string;
}

export default function RecordDetailScreen() {
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const router = useRouter();
  const { 
    localRunningRecordRepository, 
    localTrackRepository 
  } = useRepositories();

  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const id = Number(recordId);

        // 1) 로컬 DB에서 먼저 찾기
        const allLocal = await localRunningRecordRepository!.readAll();
        const local = allLocal?.find(r => r.id === id);
        if (local) {
          // 로컬 레코드가 trackId가 있으면 트랙 모드
          const track = local.trackId
            ? await localTrackRepository!.readById(local.trackId)
            : null;

          setDetail({
            id,
            mode: 'LOCAL',
            trackId: local.trackId ?? 0,
            trackName: track?.name,
            trackPath: track ? JSON.parse(track.path) : [],
            userPath: JSON.parse(local.path),
            distance: local.distance,
            duration: local.duration,
            avgPace: local.avgPace,
            calories: local.calories,
            startedAt: local.startedAt,
            finishedAt: local.endedAt,
          });
          return;
        }

        // 2) 서버 기록이라면 /api/record?userId=… 호출 후 필터
        const userId = await AuthAsyncStorage.getUserId();
        const res = await fetch(`https://yourun.shop/api/record?userId=${userId}`);
        const { data } = await res.json() as any;
        const hit = data
          .map((item: any) => ({
            ...item.record,
            trackName: item.trackInfoDto.name,
            trackPath: item.trackInfoDto.path,
            userPath: item.userPath,
          }))
          .find((r: any) => r.id === id);

        if (!hit) throw new Error('해당 기록을 찾을 수 없습니다.');

        setDetail({
          id: hit.id,
          mode: hit.mode,
          trackId: hit.trackId,
          trackName: hit.trackName,
          trackPath: hit.trackPath,
          userPath: hit.userPath,
          distance: hit.distance,
          duration: hit.resultTime,
          avgPace: hit.averagePace,
          calories: Math.round(hit.distance/1000 * 60),
          startedAt: hit.startedAt,
          finishedAt: hit.finishedAt,
        });
      } catch (e: any) {
        Alert.alert('불러오기 실패', e.message);
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [recordId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!detail) return null;

  const { width } = Dimensions.get('window');
  const mapHeight = width * 0.6;
  const {
    mode, trackName,
    trackPath, userPath,
    distance, duration, avgPace, calories
  } = detail;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>기록 상세</Text>
      <MapView
        style={{ width, height: mapHeight }}
        initialRegion={{
          latitude: trackPath[0]?.latitude  ?? userPath[0].latitude,
          longitude: trackPath[0]?.longitude ?? userPath[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* 트랙 경로 (회색) */}
        <Polyline coordinates={trackPath} strokeColor="#999" strokeWidth={4} />
        {/* 실제 달린 경로 (파랑) */}
        <Polyline coordinates={userPath} strokeColor="#007aff" strokeWidth={4} />
      </MapView>

      <View style={styles.info}>
        <Text>모드: {mode}</Text>
        {trackName && <Text>트랙명: {trackName}</Text>}
        <Text>거리: {(distance/1000).toFixed(2)} km</Text>
        <Text>시간: {formatTime(duration)}</Text>
        <Text>
          페이스: {Math.floor(avgPace/60)}′{String(Math.round(avgPace%60)).padStart(2,'0')}″
        </Text>
        <Text>칼로리: {calories} kcal</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:    { fontSize: 24, fontWeight: 'bold', margin: 16 },
  info:      { padding: 16, lineHeight: 28 },
});
