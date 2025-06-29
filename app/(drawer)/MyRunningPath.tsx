import { deletePath, loadPaths, RunningTrack } from '@/storage/RunningStorage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';

export default function MyRunningPath() {
  const [tracks, setTracks] = useState<RunningTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<RunningTrack | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchTracks = async () => {
      const loadedTracks = await loadPaths();
      if (loadedTracks.length > 0) {
        setTracks(loadedTracks);
        setSelectedTrack(loadedTracks[0]);
        setRegion({
          latitude: loadedTracks[0].path[0].latitude,
          longitude: loadedTracks[0].path[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    };
    fetchTracks();
  }, []);

  const handleSelectTrack = (track: RunningTrack) => {
    setSelectedTrack(track);
    setRegion({
      latitude: track.path[0].latitude,
      longitude: track.path[0].longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  // 새로 추가하는 삭제 함수
  const handleDeleteTrack = (id: string) => {
    Alert.alert(
      '삭제 확인',
      '이 기록을 정말 삭제하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deletePath(id);
            const updatedTracks = tracks.filter((t) => t.id !== id);
            setTracks(updatedTracks);

            // 삭제한 기록이 현재 선택된 기록일 경우 처리
            if (selectedTrack?.id === id) {
              if (updatedTracks.length > 0) {
                setSelectedTrack(updatedTracks[0]);
                setRegion({
                  latitude: updatedTracks[0].path[0].latitude,
                  longitude: updatedTracks[0].path[0].longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              } else {
                setSelectedTrack(null);
                setRegion(null);
              }
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (tracks.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.noDataText}>아직 저장한 러닝 경로가 없습니다.</Text>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.navigate('index' as never)}
        >
          <Text style={styles.backButtonText}>메뉴로 돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {region && selectedTrack && (
        <MapView style={{ flex: 1 }} initialRegion={region} region={region}>
          <Polyline
            coordinates={selectedTrack.path}
            strokeColor="#007aff"
            strokeWidth={5}
          />
          {selectedTrack.path.length > 0 && (
            <Marker
              coordinate={selectedTrack.path[selectedTrack.path.length - 1]}
            >
              <View style={styles.marker} />
            </Marker>
          )}
        </MapView>
      )}

      {tracks.length > 0 && (
        <FlatList
          data={tracks}
          keyExtractor={(item, index) => item.id ?? index.toString()}
          horizontal
          style={styles.trackList}
          contentContainerStyle={{ paddingHorizontal: 10 }}
          renderItem={({ item }) => (
            <View style={{ marginHorizontal: 5, alignItems: 'center' }}>
              <Pressable
                style={[
                  styles.trackItem,
                  item.id === selectedTrack?.id && styles.trackItemSelected,
                ]}
                onPress={() => handleSelectTrack(item)}
              >
                <Text style={styles.trackItemText}>
                  {new Date(item.date).toLocaleDateString()}{' '}
                  {new Date(item.date).toLocaleTimeString().slice(0, 5)}
                </Text>
                {item.distance && item.duration && (
                  <Text style={styles.trackItemTextSmall}>
                    {(item.distance / 1000).toFixed(2)}km |{' '}
                    {Math.floor(item.duration / 60)}분
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => handleDeleteTrack(item.id!)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable
        style={styles.backButton}
        onPress={() => navigation.navigate('index' as never)}
      >
        <Text style={styles.backButtonText}>메뉴로 돌아가기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  marker: {
    width: 12,
    height: 12,
    backgroundColor: 'red',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    zIndex: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trackList: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
  trackItem: {
    backgroundColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackItemSelected: {
    backgroundColor: '#007aff',
  },
  trackItemText: {
    color: '#000',
    fontWeight: 'bold',
  },
  trackItemTextSmall: {
    color: '#333',
    fontSize: 12,
  },
  deleteButton: {
    marginTop: 4,
    backgroundColor: '#ff3b30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
