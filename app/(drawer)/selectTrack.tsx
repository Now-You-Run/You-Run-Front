// /app/track-list.tsx

import { TrackListHeader } from '@/components/track-list/TrackListHeader';
import { TrackListItem } from '@/components/track-list/TrackListItem';
import { useTrackList } from '@/hooks/useTrackList';
import { Track } from '@/types/response/RunningTrackResponse';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

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

  // 삭제 모드 토글
  const handleDeleteModeToggle = () => {
    setDeleteMode((prev) => !prev);
    setSelectedTrackIds([]);
  };

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
        onDeleteSelected={handleDeleteSelected}
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
});
