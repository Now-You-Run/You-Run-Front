// /components/track-list/TrackListHeader.tsx

import { DISTANCE_SORT_OPTIONS, DistanceSortType, SortOrder } from '@/hooks/useTrackList';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// [수정] Props의 tab 타입과 onTabChange 타입을 'my' | 'server'로 변경
interface Props {
  tab: 'my' | 'server';
  distanceSortOption: DistanceSortType;
  sortOrder: SortOrder;
  onTabChange: (tab: 'my' | 'server') => void;
  onSortChange: (sort: DistanceSortType) => void;
  onOrderChange: (order: SortOrder) => void;
  deleteMode: boolean;
  onDeleteModeToggle: () => void;
  selectedCount: number;
}

export function TrackListHeader({ tab, distanceSortOption, sortOrder, onTabChange, onSortChange, onOrderChange, deleteMode, onDeleteModeToggle, selectedCount }: Props) {
  const router = useRouter();

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteModeButton} onPress={onDeleteModeToggle}>
          <Text style={styles.deleteModeButtonText}>{deleteMode ? '취소' : '삭제 모드'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContainer}>
        {/* [수정] '내 트랙' 탭의 활성화 조건과 이벤트 핸들러 값 변경 */}
        <TouchableOpacity style={[styles.tabButton, tab === 'my' && styles.tabButtonActive]} onPress={() => onTabChange('my')}>
          <Text style={[styles.tabButtonText, tab === 'my' && styles.tabButtonTextActive]}>내 트랙</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, tab === 'server' && styles.tabButtonActive]} onPress={() => onTabChange('server')}>
          <Text style={[styles.tabButtonText, tab === 'server' && styles.tabButtonTextActive]}>서버 트랙</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.pickerContainer}>
        <View style={{ alignItems: 'flex-end', width: '100%' }}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={distanceSortOption}
              onValueChange={onSortChange}
              mode="dropdown"
              style={styles.picker}
              dropdownIconColor="#4a90e2"
            >
              {DISTANCE_SORT_OPTIONS.map(opt => (
                <Picker.Item key={opt.value} label={opt.label} value={opt.value} style={styles.pickerItem} />
              ))}
            </Picker>
          </View>
          {distanceSortOption === 'trackDistance' && (
            <TouchableOpacity
              style={styles.orderToggle}
              onPress={() => onOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <Text style={styles.orderToggleText}>
                {sortOrder === 'asc' ? '⬆️ 오름차순' : '⬇️ 내림차순'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

// 스타일 코드는 동일하게 유지합니다.
const styles = StyleSheet.create({
  header: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#333' },
  deleteModeButton: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f0f0f0', borderRadius: 16 },
  deleteModeButtonText: { color: '#e74c3c', fontWeight: '600', fontSize: 14 },
  deleteSelectedButton: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#e74c3c', borderRadius: 16 },
  deleteSelectedButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 20, marginTop: 60 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e0e0e0', marginHorizontal: 5 },
  tabButtonActive: { backgroundColor: '#4a90e2', borderColor: '#4a90e2' },
  tabButtonText: { fontSize: 16, fontWeight: '600', color: '#333' },
  tabButtonTextActive: { color: '#fff' },
  pickerContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: 10, marginRight: 10 },
  pickerWrapper: { borderWidth: 1, borderColor: '#4a90e2', borderRadius: 20, overflow: 'hidden', width: 170 },
  picker: {
    height: 50,
  },
  pickerItem: {
    color: '#4a90e2',
    fontSize: 16,
  },
  orderToggle: {
    marginTop: 6,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderToggleText: {
    color: '#4a90e2',
    fontWeight: '600',
    fontSize: 14,
  },
});
