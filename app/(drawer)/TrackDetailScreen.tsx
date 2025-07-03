import { TrackRecordRepository } from '@/storage/TrackRecordRepository';
import type { TrackRecordData } from '@/types/response/RunningTrackResponse';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

export default function TrackDetailScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const [trackData, setTrackData] = useState<TrackRecordData | null>(null);

  useEffect(() => {
    if (!trackId) return;
    TrackRecordRepository.fetchTrackRecord(trackId)
    .then(setTrackData);
  }, [trackId]);

  if (!trackData) {
    return <Text>Loading...</Text>;
  }

  const { trackInfoDto, trackRecordDto } = trackData;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* 지도에 경로 표시 */}
      <MapView
        style={{ width: '100%', height: 300 }}
        initialRegion={{
          latitude: trackInfoDto.path[0]?.latitude || 37.5665,
          longitude: trackInfoDto.path[0]?.longitude || 126.978,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Polyline coordinates={trackInfoDto.path} strokeWidth={4} strokeColor="#4a90e2" />
      </MapView>

      {/* 트랙 정보 표시 */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{trackInfoDto.name}</Text>
        <Text>총 거리: {(trackInfoDto.totalDistance / 1000).toFixed(2)} km</Text>
        <Text>평점: {trackInfoDto.rate}</Text>
      </View>

      {/* 랭킹 리스트 표시 */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>랭킹</Text>
        {trackRecordDto.length === 0 ? (
          <Text>아직 기록이 없습니다.</Text>
        ) : (
          trackRecordDto.map((record, idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
              <Text>{record.username}</Text>
              <Text>{Math.floor(record.duration / 60)}분 {record.duration % 60}초</Text>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}
