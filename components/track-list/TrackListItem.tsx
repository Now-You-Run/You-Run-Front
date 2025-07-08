// /components/track-list/TrackListItem.tsx

import { Track } from '@/types/response/RunningTrackResponse';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

interface Props {
  item: Track;
  sourceTab: 'server' | 'local';
}

export function TrackListItem({ item, sourceTab }: Props) {
  const router = useRouter();

  return (
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
          scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false} toolbarEnabled={false} showsUserLocation={false} showsMyLocationButton={false} pointerEvents="none"
        >
          <Polyline coordinates={item.path} strokeColor="#4a90e2" strokeWidth={3} />
        </MapView>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() =>
            router.push({
              pathname: '/TrackDetailScreen',
              params: { trackId: item.id, source: sourceTab },
            })
          }
        />
      </View>
      <View style={styles.trackNameButton}>
        <Text style={styles.trackNameButtonText}>{item.name}</Text>
        {item.distance != null && (
          <Text style={styles.trackMeta}>
            거리: {(item.distance / 1000).toFixed(2)} km
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trackItem: { width: '48%', aspectRatio: 1, marginBottom: 14, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f9f9f9', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3, elevation: 2, alignItems: 'center' },
  mapThumbnail: { width: '100%', height: '96%', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  trackNameButton: { marginTop: -5, backgroundColor: '#4a90e2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'center' },
  trackNameButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  trackMeta: { fontSize: 12, color: '#666', marginTop: 4 },
});
