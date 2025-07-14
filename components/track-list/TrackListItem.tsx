// /components/track-list/TrackListItem.tsx

import { Track } from '@/types/response/RunningTrackResponse';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  item: Track;
  sourceTab: 'my' | 'server';
}

export function TrackListItem({ item, sourceTab }: Props) {
  const router = useRouter();
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setImageError(true);
  };

  return (
    <View style={styles.trackItem}>
      <View style={styles.mapContainer}>
        {isImageLoading && (
          <ActivityIndicator style={StyleSheet.absoluteFill} color="#4a90e2" />
        )}
        
        {item.thumbnailUrl && !imageError ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.mapThumbnail}
            onLoad={handleImageLoad}
            onError={handleImageError}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>
              {imageError ? '이미지 로드 실패' : '이미지 없음'}
            </Text>
          </View>
        )}
        
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
  trackItem: { 
    width: '48%', 
    aspectRatio: 1, 
    marginBottom: 14, 
    borderRadius: 12, 
    overflow: 'hidden', 
    backgroundColor: '#f9f9f9', 
    shadowColor: '#000', 
    shadowOpacity: 0.07, 
    shadowRadius: 3, 
    elevation: 2, 
    alignItems: 'center' 
  },
  mapContainer: { 
    position: 'relative', 
    width: '100%', 
    height: '78%', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0f0f0' 
  },
  mapThumbnail: { 
    ...StyleSheet.absoluteFillObject, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12 
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  trackNameButton: { 
    marginTop: -5, 
    backgroundColor: '#4a90e2', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    alignSelf: 'center' 
  },
  trackNameButtonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 14 
  },
  trackMeta: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 4 
  },
});
