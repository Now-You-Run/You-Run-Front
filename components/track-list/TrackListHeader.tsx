// /components/track-list/TrackListHeader.tsx

import { DISTANCE_SORT_OPTIONS, DistanceSortType, SortOrder } from '@/hooks/useTrackList';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BackButton from '../button/BackButton';

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
  // onDeleteSelected: () => void; // 삭제
}

export function TrackListHeader({ tab, distanceSortOption, sortOrder, onTabChange, onSortChange, onOrderChange, deleteMode, onDeleteModeToggle, selectedCount }: Props) {
  const router = useRouter();

  return (
    <>
      {/* ─────────── 1. 헤더바에 Back + Delete 아이콘 */}
      <View style={styles.headerRow}>
       <BackButton onPress={() => router.back()} />
      </View>      
      <View style={styles.tabContainer}>
        {/* [수정] '내 트랙' 탭의 활성화 조건과 이벤트 핸들러 값 변경 */}
        <TouchableOpacity style={[styles.tabButton, tab === 'my' && styles.tabButtonActive]} onPress={() => onTabChange('my')}>
          <Text style={[styles.tabButtonText, tab === 'my' && styles.tabButtonTextActive]}>내 트랙</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, tab === 'server' && styles.tabButtonActive]} onPress={() => onTabChange('server')}>
          <Text style={[styles.tabButtonText, tab === 'server' && styles.tabButtonTextActive]}>전국 트랙</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.pickerContainer}>
        {/* 삭제 모드 진입/해제 버튼을 가장 왼쪽에 배치 (내 트랙일 때만)
        {tab === 'my' && (
          <TouchableOpacity style={styles.deleteModeButton} onPress={onDeleteModeToggle}>
            <Text style={styles.deleteModeButtonText}>{deleteMode ? '취소' : '삭제 모드'}</Text>
          </TouchableOpacity>
        )} */}
        {/* 선택 삭제 버튼 제거 */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          {/* <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={distanceSortOption}
              onValueChange={onSortChange}
              mode="dropdown"
              style={[styles.picker,styles.pickerSmallText]}
              itemStyle={styles.pickerItem} 
              dropdownIconColor="#4a90e2"
            >
              {DISTANCE_SORT_OPTIONS.map(opt => (
                <Picker.Item key={opt.value} label={opt.label} value={opt.value} style={styles.pickerItem} />
              ))}
            </Picker>
          </View> */}
          {Platform.OS === 'ios' ? (
           // ─── iOS: 우리가 디자인한 동그란 박스에 넣기 ───
           <View style={styles.pickerWrapper}>
             <Picker
               selectedValue={distanceSortOption}
               onValueChange={onSortChange}
               mode="dropdown"
               style={styles.pickerIOS}
               itemStyle={styles.pickerItemIOS}
               dropdownIconColor="#4a90e2"
             >
               {DISTANCE_SORT_OPTIONS.map(opt => (
                 <Picker.Item
                   key={opt.value}
                   label={opt.label}
                   value={opt.value}
                   style={styles.pickerItemIOS}
                 />
               ))}
             </Picker>
           </View>
         ) : (
           // ─── Android: 네이티브 Spinner 형태 ───
           <Picker
             selectedValue={distanceSortOption}
             onValueChange={onSortChange}
             mode="dropdown"
             style={styles.pickerAndroid}
           >
             {DISTANCE_SORT_OPTIONS.map(opt => (
               <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
             ))}
           </Picker>
         )}
          <View style={styles.toggleRow}>
            {distanceSortOption === 'trackDistance' ? (
              <TouchableOpacity
                style={styles.orderToggle}
                onPress={() => onOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <Text style={styles.orderToggleText}>
                  {sortOrder === 'asc' ? '⬆️ 오름차순' : '⬇️ 내림차순'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.orderTogglePlaceholder} />
            )}

            {/* 삭제 모드 아이콘 */}
            {tab === 'my' && (
              <TouchableOpacity style={styles.iconButton} onPress={onDeleteModeToggle}>
                {deleteMode
                  ? <MaterialIcons name="close" size={24} color="#e74c3c" />
                  : <MaterialIcons name="delete-outline" size={24} color="#e74c3c" />
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </>
  );
}

// 스타일 코드는 동일하게 유지합니다.
const styles = StyleSheet.create({
  // header: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  // backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  // backButtonText: { fontSize: 24, color: '#333' },
   headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight, 
  },
  iconButton: {
    padding: 8,
  },
  deleteModeButton: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f0f0f0', borderRadius: 16 },
  deleteModeButtonText: { color: '#e74c3c', fontWeight: '600', fontSize: 14 },
  deleteSelectedButton: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#e74c3c', borderRadius: 16 },
  deleteSelectedButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabContainer: {  position: 'absolute',   // ← 절대 위치
    top: 20,                // ← BackButton.top(10) + button.height(40)
    left: 0, 
    right: 0,
    flexDirection: 'row', 
    justifyContent: 'center', 
    zIndex: 5,   },
  tabButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 17, backgroundColor: '#f0f0f0', borderWidth: 0, borderColor: '#e0e0e0', marginHorizontal: 5 },
  tabButtonActive: { backgroundColor: '#5EFFAE', borderColor: '#4a90e2' },
  tabButtonText: { fontSize: 16, fontWeight: '600', color: '#333' },
  tabButtonTextActive: { color: '#fff' },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 10,
    marginRight: 10,
  },
  pickerWrapper: { borderWidth: 1, borderColor: '#4a90e2', borderRadius: 12, overflow: 'hidden', width: 125,height:40 },
  // picker: {
  //   height: 50,
  //   width: 140,
  //   bottom:90,
  //   fontSize:15,
  //   right: 8
  // },
  pickerIOS: {
    width: 140,
    height: 40,
    bottom: 90,
    right : 8
  },
  pickerItemIOS: {
    color: '#4a90e2',
    fontSize: 13,
    fontWeight: '600',
  },
  pickerAndroid: {
    width: 160,
    color: '#4a90e2',
    fontSize: 13,
  },
  pickerItem: {
    color: '#4a90e2',
    fontSize: 13,
    fontWeight:'bold'
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
  inlineDeleteButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    alignSelf: 'flex-start',
  },
  inlineDeleteButtonDisabled: {
    backgroundColor: '#ccc',
  },
  inlineDeleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // “가까운 순”일 때 빈 공간을 차지할 플레이스홀더
 orderTogglePlaceholder: {
   marginTop: 6,
   // orderToggle의 paddingVertical(8*2) + fontSize(14) 정도 높이 합산
   height: 8 + 14 + 8,
 },
 toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
});
