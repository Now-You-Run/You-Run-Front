// /app/track-list.tsx

import { TrackListHeader } from '@/components/track-list/TrackListHeader';
import { TrackListItem } from '@/components/track-list/TrackListItem';
import { useTrackList } from '@/hooks/useTrackList';
import { Track } from '@/types/response/RunningTrackResponse';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

export default function TrackListScreen() {
  const {
    isInitialLoading,
    tab,
    distanceSortOption,
    sortedTracks,
    serverLoading,
    serverRefreshing,
    setTab,
    setDistanceSortOption,
    handleRefresh,
    handleEndReached,
  } = useTrackList();

  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>트랙 정보를 불러오는 중...</Text>
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
        data={sortedTracks}
        renderItem={({ item }: { item: Track }) => (
          <TrackListItem item={item} sourceTab={tab} />
        )}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 10 }}
        showsVerticalScrollIndicator={false}
        onEndReached={tab === 'server' ? handleEndReached : undefined}
        onEndReachedThreshold={0.5}
        refreshing={tab === 'server' ? serverRefreshing : false}
        onRefresh={tab === 'server' ? handleRefresh : undefined}
        ListFooterComponent={serverLoading && tab === 'server' ? <ActivityIndicator /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
});
