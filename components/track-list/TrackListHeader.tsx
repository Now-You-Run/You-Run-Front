// /components/track-list/TrackListHeader.tsx

import { DistanceSortType } from '@/hooks/useTrackList';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DISTANCE_SORT_OPTIONS = [
  { label: '가까운 순', value: 'proximity' },
  { label: '트랙 거리 순', value: 'trackDistance' },
] as const;

interface Props {
  tab: 'server' | 'local';
  distanceSortOption: DistanceSortType;
  onTabChange: (tab: 'server' | 'local') => void;
  onSortChange: (sort: DistanceSortType) => void;
}

export function TrackListHeader({ tab, distanceSortOption, onTabChange, onSortChange }: Props) {
  const router = useRouter();

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabButton, tab === 'local' && styles.tabButtonActive]} onPress={() => onTabChange('local')}>
          <Text style={[styles.tabButtonText, tab === 'local' && styles.tabButtonTextActive]}>내 로컬 트랙</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, tab === 'server' && styles.tabButtonActive]} onPress={() => onTabChange('server')}>
          <Text style={[styles.tabButtonText, tab === 'server' && styles.tabButtonTextActive]}>서버 트랙</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.pickerContainer}>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={distanceSortOption}
            onValueChange={onSortChange}
            mode="dropdown"
            style={styles.picker}
            dropdownIconColor="#4a90e2"
          >
            {DISTANCE_SORT_OPTIONS.map(opt => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#333' },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 20, marginTop: 60 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e0e0e0', marginHorizontal: 5 },
  tabButtonActive: { backgroundColor: '#4a90e2', borderColor: '#4a90e2' },
  tabButtonText: { fontSize: 16, fontWeight: '600', color: '#333' },
  tabButtonTextActive: { color: '#fff' },
  pickerContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  pickerWrapper: { borderWidth: 1, borderColor: '#4a90e2', borderRadius: 20, overflow: 'hidden', width: 170 },
  picker: { height: 40, color: '#4a90e2' },
});
