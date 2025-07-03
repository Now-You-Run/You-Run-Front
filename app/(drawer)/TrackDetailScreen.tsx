import { saveTrackInfo, TrackInfo } from '@/storage/appStorage';
import { TrackRecordRepository } from '@/storage/TrackRecordRepository';
import type { TrackRecordData } from '@/types/response/RunningTrackResponse';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';


export default function TrackDetailScreen() {
  const router = useRouter();
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
    // 서버에서 받아온 trackInfoDto.path
  const path = trackData!.trackInfoDto.path;
  const origin = path[0];


  const onPressBotBattle = async () => {
    // // 1) 러닝-with-bot 화면에 path/origin 데이터 저장
    // await router.push({
    //   pathname: '/RunningWithBot',
    //   params: {
    //     trackPath: JSON.stringify(path),
    //     originLat: origin.latitude.toString(),
    //     originLng: origin.longitude.toString(),
    //   },
    // });

    // // 2) 바로 bot-pace 화면으로 전환
    // router.replace({ pathname: '/bot-pace' });

        // 1) AsyncStorage에 트랙 정보 저장
    const info: TrackInfo = {id: trackId , path, origin, distanceMeters: trackInfoDto.totalDistance,  // m 단위
    };
    await saveTrackInfo(info);

  // 2) 바로 bot-pace 화면으로 전환
  router.push({
    pathname: '/bot-pace',
    params: { trackId },  // bot-pace 에서는 trackId만 넘기면 됩니다
  });

  };


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
      {/* 코칭 봇과의 대결 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.botButton}
          onPress={onPressBotBattle}
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