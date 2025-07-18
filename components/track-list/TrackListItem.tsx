// /components/track-list/TrackListItem.tsx

import { Track } from '@/types/response/RunningTrackResponse';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

  // 카드 전체를 탭하면 선택/해제 (삭제 모드일 때만)
  const handlePress = () => {
    if (deleteMode && onCheckChange) {
      onCheckChange(!checked);
    } else if (!deleteMode) {
      router.push({
        pathname: '/TrackDetailScreen',
        params: { trackId: item.id, source: sourceTab },
      });
    }
  };

  return (
    <View key={item.id} style={{ width: '48%', marginBottom: 14 }}>
      <TouchableOpacity
        style={[
          styles.card,
          checked && deleteMode ? styles.cardSelected : null,
          deleteMode && styles.cardDeleteMode,
        ]}
        activeOpacity={0.85}
        onPress={handlePress}
        disabled={false}
      >
        {/* 삭제 모드일 때 좌상단 원형 인디케이터 */}
        {deleteMode && (
          <View style={styles.selectCircleWrapper}>
            <View style={[styles.selectCircle, checked && styles.selectCircleChecked]}>
              {checked && <Text style={styles.selectCircleCheck}>✔️</Text>}
            </View>
          </View>
        )}
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
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ececec',
    overflow: 'hidden',
    elevation: 1,
  },
  cardSelected: {
    borderColor: '#4a90e2',
    backgroundColor: 'rgba(74,144,226,0.08)',
  },
  cardDeleteMode: {
    borderColor: '#bbb',
    backgroundColor: '#f8f8fa',
  },
  selectCircleWrapper: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 20,
  },
  selectCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#bbb',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleChecked: {
    borderColor: '#4a90e2',
    backgroundColor: '#4a90e2',
  },
  selectCircleCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(74,144,226,0.85)',
    borderRadius: 16,
    padding: 2,
    zIndex: 10,
  },
  checkIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
