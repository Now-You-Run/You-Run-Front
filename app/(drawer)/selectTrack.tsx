import { loadPaths } from '@/storage/RunningStorage';
import { TrackRecordRepository } from '@/storage/TrackRecordRepository';
import { Coordinate } from '@/types/Coordinate';
import { Track } from '@/types/response/RunningTrackResponse';
import { getDistance } from '@/utils/PathTools';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

const DISTANCE_SORT_OPTIONS = [
  { label: '가까운 순', value: 'proximity' },
  { label: '트랙 거리 순', value: 'trackDistance' },
] as const;
type DistanceSortType = 'proximity' | 'trackDistance';

export default function TrackListScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'server' | 'local'>('local');
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [serverTracks, setServerTracks] = useState<Track[]>([]);
  const [myLocation, setMyLocation] = useState<Coordinate>();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [distanceSortOption, setDistanceSortOption] = useState<DistanceSortType>('proximity');

  // 위치 정보 요청
  const getMyLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({});
      setMyLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  };

  // 서버 트랙 불러오기
  useEffect(() => {
    setLoading(true);
    setServerError(false);
    TrackRecordRepository.fetchTrackList()
      .then((tracks) => setServerTracks(tracks))
      .catch(() => setServerError(true))
      .finally(() => setLoading(false));
  }, []);
  // 로컬 트랙 불러오기
  useEffect(() => {
    const fetchTracks = async () => {
      const loadedTracks = await loadPaths();
      if (loadedTracks.length > 0 && loadedTracks[0].path.length > 0) {
        setLocalTracks(loadedTracks);
      }
    };
    fetchTracks();
  }, []);

  // 정렬 함수
  const getSortedTracks = () => {
    const tracks = tab === 'server' ? serverTracks : localTracks;
    if (distanceSortOption === 'proximity' && myLocation) {
      return [...tracks].sort((a, b) => {
        const aDist = getDistance(myLocation.latitude, myLocation.longitude, a.path[0]?.latitude, a.path[0]?.longitude);
        const bDist = getDistance(myLocation.latitude, myLocation.longitude, b.path[0]?.latitude, b.path[0]?.longitude);
        return aDist - bDist;
      });
    }
    if (distanceSortOption === 'trackDistance') {
      return [...tracks].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    return tracks;
  };

  // 트랙 아이템 렌더러
  const renderItem = ({ item }: { item: Track }) => (
    <View style={styles.trackItem}>
      <View style={{ position: 'relative', width: '100%', height: '78%' }}>
        <MapView
          style={styles.mapThumbnail}
          initialRegion={{
            latitude: item.path[0]?.latitude || 37.5665,
            longitude: item.path[0]?.longitude || 126.978,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          toolbarEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          pointerEvents="none"
        >
          <Polyline
            coordinates={item.path}
            strokeColor="#4a90e2"
            strokeWidth={3}
          />
        </MapView>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() =>
            router.push({
              pathname: '/TrackDetailScreen',
              params: { trackId: item.id , source: tab},
            })
          }
        />
      </View>
      <View style={styles.trackNameButton}>
        <Text style={styles.trackNameButtonText}>
          {item.name}
        </Text>
        {item.distance != null && (
          <Text style={styles.trackMeta}>
            거리: {(item.distance / 1000).toFixed(2)} km
          </Text>
        )}
      </View>
    </View>
  );

  // 뒤로가기
  const handleBackPress = () => router.back();

  return (
    <View style={styles.container}>
      {/* 뒤로가기 버튼 */}
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 20,
          zIndex: 10,
          backgroundColor: 'rgba(255,255,255,0.8)',
          borderRadius: 20,
        }}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>
      {/* 탭 버튼 */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            tab === 'local' && styles.tabButtonActive,
            { marginRight: 10 }
          ]}
          onPress={() => setTab('local')}
        >
          <Text style={[styles.tabButtonText, tab === 'local' && styles.tabButtonTextActive]}>
            내 로컬 트랙
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            tab === 'server' && styles.tabButtonActive,
            { marginLeft: 10 }
          ]}
          onPress={() => setTab('server')}
        >
          <Text style={[styles.tabButtonText, tab === 'server' && styles.tabButtonTextActive]}>
            서버 트랙
          </Text>
        </TouchableOpacity>
      </View>
      {/* 정렬 드롭다운 */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
        <View style={{ borderWidth: 1, borderColor: '#4a90e2', borderRadius: 20, overflow: 'hidden', width: 170 }}>
          <Picker
            selectedValue={distanceSortOption}
            onValueChange={(value) => {
              setDistanceSortOption(value);
              if (value === 'proximity' && !myLocation) {
                getMyLocation();
              }
            }}
            mode="dropdown"
            style={{ height: 40, color: '#4a90e2' }}
            dropdownIconColor="#4a90e2"
          >
            {DISTANCE_SORT_OPTIONS.map(opt => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      </View>
      {/* 트랙 리스트 */}
      <FlatList
        data={getSortedTracks()}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 10 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  mapThumbnail: {
    width: '100%',
    height: '96%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  trackNameButton: {
    marginTop: -5,
    backgroundColor: '#4a90e2',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 8,
    alignSelf: 'center',
  },
  trackNameButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 70,
    backgroundColor: '#fff',
  },
  trackItem: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  trackMeta: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tabButtonActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
});