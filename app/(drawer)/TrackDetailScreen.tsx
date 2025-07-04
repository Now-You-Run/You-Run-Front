import { saveTrackInfo, TrackInfo } from '@/storage/appStorage';
import { loadPaths } from '@/storage/RunningStorage';
import { TrackRecordRepository } from '@/storage/TrackRecordRepository';
import type { Track, TrackRecordData } from '@/types/response/RunningTrackResponse';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

type SourceType = 'local' | 'server';

export default function TrackDetailScreen() {
  const router = useRouter();
  const { trackId, source } = useLocalSearchParams<{ trackId: string; source: SourceType }>();
  const [trackData, setTrackData] = useState<TrackRecordData | Track | null>(null);

  useEffect(() => {
    if (!trackId) return;
    if (source === 'server') {
      TrackRecordRepository.fetchTrackRecord(trackId)
        .then(setTrackData);
    } else {
      // Local track: load from AsyncStorage
      loadPaths().then((tracks) => {
        const found = tracks.find((t) => t.id === trackId);
        setTrackData(found || null);
      });
    }
  }, [trackId, source]);

  if (!trackData) {
    return <Text>Loading...</Text>;
  }

  // Server track
  if (source === 'server') {
    const { trackInfoDto, trackRecordDto } = trackData as TrackRecordData;
    const path = trackInfoDto.path;
    const origin = path[0];
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <MapView
          style={{ width: '100%', height: 300 }}
          initialRegion={{
            latitude: path[0]?.latitude || 37.5665,
            longitude: path[0]?.longitude || 126.978,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Polyline coordinates={path} strokeWidth={4} strokeColor="#4a90e2" />
        </MapView>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{trackInfoDto.name}</Text>
          <Text>총 거리: {(trackInfoDto.totalDistance / 1000).toFixed(2)} km</Text>
          <Text>평점: {trackInfoDto.rate}</Text>
        </View>
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
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.botButton}
            onPress={async () => {
              const info: TrackInfo = {
                id: trackId,
                path,
                origin,
                distanceMeters: trackInfoDto.totalDistance,
              };
              await saveTrackInfo(info);
              router.push({
                pathname: './bot-pace',
                params: { trackId },
              });
            }}
          >
            <Text style={styles.botButtonText}>코칭 봇과의 대결</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Local track
  const track = trackData as Track;
  const path = track.path;
  const origin = path[0];
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapView
        style={{ width: '100%', height: 300 }}
        initialRegion={{
          latitude: path[0]?.latitude || 37.5665,
          longitude: path[0]?.longitude || 126.978,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Polyline coordinates={path} strokeWidth={4} strokeColor="#4a90e2" />
      </MapView>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{track.name}</Text>
        <Text>총 거리: {(track.distance ?? 0 / 1000).toFixed(2)} km</Text>
      </View>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>랭킹</Text>
        <Text>로컬 트랙에는 기록이 없습니다.</Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.botButton}
          onPress={async () => {
            const info: TrackInfo = {
              id: trackId,
              path,
              origin,
              distanceMeters: track.distance ?? 0,
            };
            await saveTrackInfo(info);
            router.push({
              pathname: './bot-pace',
              params: { trackId },
            });
          }}
        >
          <Text style={styles.botButtonText}>코칭 봇과의 대결</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: { padding: 16 },
  botButton: {
    backgroundColor: '#ff6666',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  botButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
