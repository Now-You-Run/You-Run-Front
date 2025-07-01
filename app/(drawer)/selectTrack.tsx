import { loadPaths } from '@/storage/RunningStorage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

// ✅ Track 타입 정의
type Track = {
  id: string;
  thumbnail: string | null;
  name: string;
  path: { latitude: number; longitude: number }[];
};

// ✅ RunningTrack 타입 정의
type RunningTrack = {
  id: string;
  path: { latitude: number; longitude: number }[];
};

// ✅ RootStackParamList 타입 정의
type RootStackParamList = {
  TrackList: undefined;
  TrackDetail: { trackId: string };
  RankingPage: { trackId: string };
};

// ✅ NavigationProp 타입 적용
type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TrackList'
>;

// 트랙 정렬 옵션
const SORT_OPTIONS = [
  { label: '최신순', value: 'latest' },
  { label: '오래된순', value: 'oldest' },
  { label: '이름순', value: 'name' },
];

// 지역 정보
const REGION_OPTIONS = [
  { label: '전체 지역', value: '전체 지역' },
  { label: '처인구', value: '처인구' },
  { label: '수지구', value: '수지구' },
  { label: '기흥구', value: '기흥구' },
];

// running.tsx에서 속도 데이터 받기
const { trackId, avgPaceMinutes, avgPaceSeconds } = useLocalSearchParams<{
  trackId?: string;
  avgPaceMinutes?: string;
  avgPaceSeconds?: string;
}>();

export default function TrackListScreen() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sortedTracks, setSortedTracks] = useState<Track[]>([]);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);

  // 새로 추가한 지역 선택 상태
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(REGION_OPTIONS[0]);

  const navigation = useNavigation<NavigationProp>();

  const fetchTracks = async () => {
    const loadedTracks: RunningTrack[] = await loadPaths();

    const convertedTracks: Track[] = loadedTracks.map((track, index) => ({
      id: track.id,
      path: track.path,
      thumbnail: null,
      name: `러닝 기록 ${track.id}`,
    }));

    setTracks((prevTracks) => {
      const existingIds = new Set(prevTracks.map((t) => t.id));
      const newUniqueTracks = convertedTracks.filter(
        (t) => !existingIds.has(t.id)
      );
      return [...prevTracks, ...newUniqueTracks];
    });
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  // 정렬 함수
  useEffect(() => {
    let sorted = [...tracks];
    if (selectedSort.value === 'latest') {
      sorted = sorted.sort((a, b) => Number(b.id) - Number(a.id));
    } else if (selectedSort.value === 'oldest') {
      sorted = sorted.sort((a, b) => Number(a.id) - Number(b.id));
    } else if (selectedSort.value === 'name') {
      sorted = sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    setSortedTracks(sorted);
  }, [tracks, selectedSort]);

  const renderItem = ({ item }: { item: Track }) => (
    <View style={styles.trackItem}>
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
      >
        <Polyline
          coordinates={item.path}
          strokeColor="#4a90e2"
          strokeWidth={3}
        />
      </MapView>

      <TouchableOpacity
        style={styles.trackNameButton}
        onPress={() =>
          // RankingPage.tsx에 트랙아이디, 속도 데이터 보내기
          router.push({
            pathname: '/rankingPage',
            params: { trackId: item.id, avgPaceMinutes, avgPaceSeconds },
          })
        }
      >
        <Text style={styles.trackNameButtonText}>{item.name}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 지역별 필터 버튼 (한 줄 전체 차지) */}
      <View style={{ marginBottom: -10, alignItems: 'center' }}>
        <TouchableOpacity
          style={[styles.sortButton, { alignSelf: 'center', width: 114 }]}
          onPress={() => setRegionModalVisible(true)}
        >
          <Text style={styles.regionButtonText}>{selectedRegion.label} ▼</Text>
        </TouchableOpacity>
      </View>

      {/* 정렬 버튼 (한 줄 전체 차지) */}
      <View style={{ marginBottom: 18, alignItems: 'flex-end' }}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortModalVisible(true)}
        >
          <Text style={styles.sortButtonText}>{selectedSort.label} ▼</Text>
        </TouchableOpacity>
      </View>

      {/* 정렬 옵션 모달 */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <ScrollView>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    option.value === selectedSort.value &&
                      styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedSort(option);
                    setSortModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      option.value === selectedSort.value &&
                        styles.modalOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* 지역별 필터 모달 */}
      <Modal
        visible={regionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRegionModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <ScrollView>
              {REGION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    option.value === selectedRegion.value &&
                      styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedRegion(option);
                    setRegionModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      option.value === selectedRegion.value &&
                        styles.modalOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* 트랙 리스트 */}
      <FlatList
        //data={sortedTracks.slice(0, 5)}
        data={sortedTracks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
      />
    </View>
  );
}

// 아이폰 12 사이즈
const styles = StyleSheet.create({
  mapThumbnail: {
    width: '100%',
    height: '78%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  trackNameButton: {
    marginTop: 6,
    backgroundColor: '#4a90e2',
    paddingVertical: 6,
    paddingHorizontal: 10,
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
    paddingTop: 70, // 상단 여유 조금 더 줌 (상태바 + 여백)
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  regionButton: {
    flex: 1,
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 20,
    borderColor: '#aaa',
    backgroundColor: '#fafafa',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  regionButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  sortButton: {
    alignSelf: 'flex-end',
    marginBottom: 17, // 버튼과 리스트 사이 간격 넉넉히
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderRadius: 20,
    borderColor: '#aaa',
    backgroundColor: '#fafafa',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sortButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    maxHeight: '50%',
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalOptionSelected: {
    backgroundColor: '#e0e0e0',
  },
  modalOptionText: {
    fontSize: 17,
    color: '#555',
  },
  modalOptionTextSelected: {
    fontWeight: '700',
    color: '#222',
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
  thumbnail: {
    width: '100%',
    height: '78%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  trackNameText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
  },
});
