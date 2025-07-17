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
    sortOrder,
    setSortOrder,
  } = useTrackList();

  return (
    <View style={styles.container}>
      <TrackListHeader
        tab={tab}
        distanceSortOption={distanceSortOption}
        onTabChange={setTab}
        onSortChange={setDistanceSortOption}
        sortOrder={sortOrder}
        onOrderChange={setSortOrder}
      />
      
      <FlatList
        data={tracks}
        renderItem={({ item }: { item: Track }) => (
          <TrackListItem item={item} sourceTab={tab} />
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={isLoading && tracks.length > 0 ? <ActivityIndicator style={{ margin: 20 }} /> : null}
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
