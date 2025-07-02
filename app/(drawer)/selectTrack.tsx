import { useRouter } from 'expo-router';
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
import { TrackRecordRepository } from '../../storage/RunningTrackRepository';

// 타입 정의 (프로젝트에 이미 있다면 import해서 사용)
type Track = {
  id: string;
  name: string;
  path: { latitude: number; longitude: number }[];
  thumbnail?: string | null;
};

const SORT_OPTIONS = [
  { label: '최신순', value: 'latest' },
  { label: '오래된순', value: 'oldest' },
  { label: '이름순', value: 'name' },
];

const REGION_OPTIONS = [
  { label: '전체 지역', value: '전체 지역' },
  { label: '처인구', value: '처인구' },
  { label: '수지구', value: '수지구' },
  { label: '기흥구', value: '기흥구' },
];

function formatTrackIdToDateTime(id: string): string {
  if (/^\d+$/.test(id)) {
    const date = new Date(Number(id));
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `| ${year}-${month}-${day}|${hours}:${minutes}:${seconds}| `;
    }
  }
  return '날짜 알 수 없음';
}

export default function TrackListScreen() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sortedTracks, setSortedTracks] = useState<Track[]>([]);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS[0]);
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(REGION_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  // 서버에서 트랙 리스트 불러오기
  useEffect(() => {
    setLoading(true);
    TrackRecordRepository.fetchTrackList()
      .then((tracks) => setTracks(tracks))
      .finally(() => setLoading(false));
  }, []);

  // 정렬 옵션에 따라 정렬
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

  const handleBackPress = () => router.back();

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
              pathname: '/rankingPage',
              params: { trackId: item.id },
            })
          }
        />
      </View>
      <View style={styles.trackNameButton}>
        <Text style={styles.trackNameButtonText}>
          {formatTrackIdToDateTime(item.id)}
        </Text>
      </View>
    </View>
  );

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

      {/* 지역/정렬 모달 등은 기존 코드와 동일하게 유지 */}
      <View style={{ marginBottom: -10, alignItems: 'center' }}>
        <TouchableOpacity
          style={[styles.sortButton, { alignSelf: 'center', width: 114 }]}
          onPress={() => setRegionModalVisible(true)}
        >
          <Text style={styles.regionButtonText}>{selectedRegion.label} ▼</Text>
        </TouchableOpacity>
      </View>
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
      {loading ? (
        <Text style={{ textAlign: 'center', marginTop: 40 }}>로딩 중...</Text>
      ) : (
        <FlatList
          data={sortedTracks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
      )}
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
    marginBottom: 17,
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
