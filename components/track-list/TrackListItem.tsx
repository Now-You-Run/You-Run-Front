// /components/track-list/TrackListItem.tsx

import { useRepositories } from '@/context/RepositoryContext'; // [1. 추가] DB 접근을 위해
import { Track } from '@/types/response/RunningTrackResponse';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react'; // [2. 추가] useEffect와 useState
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // [3. 추가] ActivityIndicator
import MapView, { Polyline } from 'react-native-maps';

interface Props {
  item: Track; // 이 item은 아직 path가 빈 문자열일 수 있습니다.
  sourceTab: 'server' | 'local';
}

export function TrackListItem({ item, sourceTab }: Props) {
  const router = useRouter();

  // [4. 추가] 각 아이템의 경로 데이터와 로딩 상태를 관리합니다.
  const { localTrackRepository } = useRepositories();
  const [coordinates, setCoordinates] = useState<any[]>([]);
  const [isPathLoading, setIsPathLoading] = useState<boolean>(true);

  // [5. 핵심] 이 컴포넌트가 화면에 나타날 때, 자신의 전체 데이터를 DB에서 가져옵니다.
  useEffect(() => {
    const fetchFullPath = async () => {
      // 로컬 트랙의 경우, path가 비어있으므로 DB에서 다시 조회해야 합니다.
      if (sourceTab === 'local' && localTrackRepository) {
        setIsPathLoading(true); // 로딩 시작
        try {
          // 'item.id'를 사용해 이 아이템의 전체 데이터를 조회합니다.
          const fullTrackData = await localTrackRepository.readById(parseInt(item.id, 10));
          if (fullTrackData?.path) {
            setCoordinates(JSON.parse(fullTrackData.path)); // 파싱하여 상태에 저장
          }
        } catch (error) {
          console.error(`Failed to fetch full path for item ${item.id}:`, error);
        } finally {
          setIsPathLoading(false); // 로딩 종료
        }
      } else if (typeof item.path === 'object') {
        // 서버 트랙은 이미 전체 경로(배열)를 가지고 있으므로, 바로 사용합니다.
        setCoordinates(item.path);
        setIsPathLoading(false);
      } else {
        // 그 외의 경우 (예: 로컬 데이터인데 path가 없는 경우)
        setIsPathLoading(false);
      }
    };

    fetchFullPath();
  }, [item.id, localTrackRepository, sourceTab]); // 컴포넌트가 재사용될 때를 대비해 item.id를 의존성 배열에 추가

  return (
    <View style={styles.trackItem}>
      <View style={styles.mapContainer}>
        {/* [6. 수정] 경로 로딩 중일 때는 로딩 스피너를, 로딩 완료 시 지도를 보여줍니다. */}
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

const styles = StyleSheet.create({
  trackItem: { width: '48%', aspectRatio: 1, marginBottom: 14, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f9f9f9', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3, elevation: 2, alignItems: 'center' },
  mapContainer: { position: 'relative', width: '100%', height: '78%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  mapThumbnail: { ...StyleSheet.absoluteFillObject, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  trackNameButton: { marginTop: -5, backgroundColor: '#4a90e2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'center' },
  trackNameButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  trackMeta: { fontSize: 12, color: '#666', marginTop: 4 },
});
