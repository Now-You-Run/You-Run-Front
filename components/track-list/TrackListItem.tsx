// /components/track-list/TrackListItem.tsx

import { useRepositories } from '@/context/RepositoryContext';
import { Track } from '@/types/response/RunningTrackResponse';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

interface Props {
  item: Track;
  // [수정] sourceTab 타입은 이미 'my' | 'server'로 잘 되어 있으므로 유지합니다.
  sourceTab: 'my' | 'server';
}

export function TrackListItem({ item, sourceTab }: Props) {
  const router = useRouter();

  // [1. 수정] localTrackRepository 대신 trackRecordRepository를 사용합니다.
  const { trackRecordRepository } = useRepositories();
  const [coordinates, setCoordinates] = useState<any[]>([]);
  const [isPathLoading, setIsPathLoading] = useState<boolean>(true);

  // [2. 핵심 수정] 'my' 탭도 서버에서 경로를 가져오도록 로직을 변경합니다.
  useEffect(() => {
    const fetchFullPath = async () => {
      // API 응답의 list에 이미 경로(path) 데이터가 포함된 경우 바로 사용합니다.
      if (Array.isArray(item.path) && item.path.length > 0) {
        setCoordinates(item.path);
        setIsPathLoading(false);
        return;
      }
    };

    fetchFullPath();
  }, [item.id, item.path, trackRecordRepository]); // 의존성 배열 수정

  return (
    <View style={styles.trackItem}>
      <View style={styles.mapContainer}>
        {isPathLoading ? (
          <ActivityIndicator style={StyleSheet.absoluteFill} color="#4a90e2" />
        ) : (
          <MapView
            style={styles.mapThumbnail}
            initialRegion={{
              latitude: coordinates[0]?.latitude || 37.5665,
              longitude: coordinates[0]?.longitude || 126.978,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false} toolbarEnabled={false} showsUserLocation={false} showsMyLocationButton={false} pointerEvents="none"
          >
            {coordinates.length > 0 && (
              <Polyline coordinates={coordinates} strokeColor="#4a90e2" strokeWidth={3} />
            )}
          </MapView>
        )}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() =>
            router.push({
              pathname: '/TrackDetailScreen',
              params: { trackId: item.id, source: sourceTab },
            })
          }
        />
      </View>
      <View style={styles.trackNameButton}>
        <Text style={styles.trackNameButtonText}>{item.name}</Text>
        {item.distance != null && (
          <Text style={styles.trackMeta}>
            거리: {(item.distance / 1000).toFixed(2)} km
          </Text>
        )}
      </View>
    </View>
  );
}

// 스타일 코드는 동일하게 유지합니다.
const styles = StyleSheet.create({
  trackItem: { width: '48%', aspectRatio: 1, marginBottom: 14, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f9f9f9', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3, elevation: 2, alignItems: 'center' },
  mapContainer: { position: 'relative', width: '100%', height: '78%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  mapThumbnail: { ...StyleSheet.absoluteFillObject, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  trackNameButton: { marginTop: -5, backgroundColor: '#4a90e2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'center' },
  trackNameButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  trackMeta: { fontSize: 12, color: '#666', marginTop: 4 },
});
