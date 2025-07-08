// /app/track-list.tsx

import { TrackListHeader } from '@/components/track-list/TrackListHeader';
import { TrackListItem } from '@/components/track-list/TrackListItem';
import { useTrackList } from '@/hooks/useTrackList';
import { Track } from '@/types/response/RunningTrackResponse';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

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
  } = useTrackList();

  // [핵심] `isLoading`이 true이고 `tracks`가 비어있을 때만 전체 로딩 화면을 보여줍니다.
  // 이 조건은 이제 탭 전환 시 항상 만족됩니다.
  if (isLoading && tracks.length === 0) {
    return (
      <View style={styles.container}>
        <TrackListHeader
            tab={tab}
            distanceSortOption={distanceSortOption}
            onTabChange={setTab}
            onSortChange={setDistanceSortOption}
        />
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a90e2" />
            <Text style={styles.loadingText}>트랙 정보를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TrackListHeader
        tab={tab}
        distanceSortOption={distanceSortOption}
        onTabChange={setTab}
        onSortChange={setDistanceSortOption}
      />
      
      <FlatList
        data={tracks}
        renderItem={({ item }: { item: Track }) => (
          <TrackListItem item={item} sourceTab={tab} />
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 10 },
});
