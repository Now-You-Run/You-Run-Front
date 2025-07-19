// /app/track-list.tsx

import { TrackListHeader } from '@/components/track-list/TrackListHeader';
import { TrackListItem } from '@/components/track-list/TrackListItem';
import { useTrackList } from '@/hooks/useTrackList';
import { Track } from '@/types/response/RunningTrackResponse';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TrackListScreen() {
  const {
    isLoading,
    isRefreshing,
    tracks,
    tab,
    distanceSortOption,
    setTab,
    setDistanceSortOption,
    handleRefresh,
    handleEndReached,
    sortOrder,
    setSortOrder,
    deleteTracks,
  } = useTrackList();

  const [deleteMode, setDeleteMode] = React.useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = React.useState<number[]>([]);

  React.useEffect(() => {
    console.log('selectTrack 마운트');
    return () => console.log('selectTrack 언마운트');
  }, []);

  // 트랙 개수 로그
  console.log('트랙 개수:', tracks.length);

  // 삭제 모드 토글
  const handleDeleteModeToggle = () => {
    setDeleteMode((prev) => !prev);
    setSelectedTrackIds([]);
  };

  // 서버 트랙 탭일 때는 삭제 모드 강제 해제
  React.useEffect(() => {
    if (tab !== 'my' && deleteMode) {
      setDeleteMode(false);
      setSelectedTrackIds([]);
    }
  }, [tab]);

  // 트랙 선택/해제
  const handleSelectTrack = (trackId: number, selected: boolean) => {
    setSelectedTrackIds((prev) =>
      selected ? [...prev, trackId] : prev.filter((id) => id !== trackId)
    );
  };

  // 선택 삭제 실행
  const handleDeleteSelected = async () => {
    if (selectedTrackIds.length === 0) return;
    Alert.alert(
      '트랙 삭제',
      `정말로 ${selectedTrackIds.length}개의 트랙을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', style: 'destructive', onPress: async () => {
            await deleteTracks(selectedTrackIds);
            setSelectedTrackIds([]);
            setDeleteMode(false);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TrackListHeader
        tab={tab}
        distanceSortOption={distanceSortOption}
        onTabChange={setTab}
        onSortChange={setDistanceSortOption}
        sortOrder={sortOrder}
        onOrderChange={setSortOrder}
        deleteMode={deleteMode}
        onDeleteModeToggle={handleDeleteModeToggle}
        selectedCount={selectedTrackIds.length}
      />
      <FlatList
        data={tracks}
        renderItem={({ item }: { item: Track }) => (
          <TrackListItem
            item={item}
            sourceTab={tab}
            deleteMode={deleteMode}
            checked={selectedTrackIds.includes(Number(item.id))}
            onCheckChange={(checked: boolean) => handleSelectTrack(Number(item.id), checked)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={isLoading && tracks.length > 0 ? <ActivityIndicator style={{ margin: 20 }} /> : null}
        extraData={{ deleteMode, selectedTrackIds }}
      />
      {/* 삭제 모드일 때만 하단 플로팅 삭제 버튼 (내 트랙 탭에서만) */}
      {deleteMode && tab === 'my' && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, selectedTrackIds.length === 0 && styles.fabDisabled]}
            onPress={handleDeleteSelected}
            disabled={selectedTrackIds.length === 0}
          >
            <Text style={styles.fabText}>선택 삭제 ({selectedTrackIds.length})</Text>
          </TouchableOpacity>
        </View>
      )}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4a90e2" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 10 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: 'center',
    zIndex: 20,
  },
  fab: {
    backgroundColor: '#e74c3c',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    elevation: 3,
  },
  fabDisabled: {
    backgroundColor: '#ccc',
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
