// /components/track-list/TrackListItem.tsx

import { Track } from '@/types/response/RunningTrackResponse';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  item: Track;
  sourceTab: 'my' | 'server';
  deleteMode?: boolean;
  checked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

export function TrackListItem({ item, sourceTab, deleteMode = false, checked = false, onCheckChange }: Props) {
  const router = useRouter();
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', width: '48%' }}>
      {deleteMode && (
        <Switch
          value={checked}
          onValueChange={onCheckChange}
          style={{ marginRight: 6 }}
        />
      )}
      <TouchableOpacity
        style={[styles.card, { flex: 1 }]}
        activeOpacity={0.85}
        onPress={() =>
          !deleteMode && router.push({
            pathname: '/TrackDetailScreen',
            params: { trackId: item.id, source: sourceTab },
          })
        }
        disabled={deleteMode}
      >
        <View style={styles.imageWrapper}>
          {item.thumbnailUrl && !imageError ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.image}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setIsImageLoading(false);
                setImageError(true);
              }}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>🏞️</Text>
            </View>
          )}
          {isImageLoading && (
            <ActivityIndicator style={StyleSheet.absoluteFill} color="#4a90e2" />
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.trackName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.distance != null && (
            <Text style={styles.distance}>
              {(item.distance / 1000).toFixed(2)} km
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ececec',
    overflow: 'hidden',
    elevation: 1,
  },
  imageWrapper: {
    width: '100%',
    height: '70%',
    backgroundColor: '#f5f6fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f1f3',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  placeholderText: {
    fontSize: 28,
    color: '#b0b0b0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  trackName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    flex: 1,
    marginRight: 8,
  },
  distance: {
    fontSize: 13,
    color: '#4a90e2',
    fontWeight: '500',
  },
});
