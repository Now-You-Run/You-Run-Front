import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Coordinate } from '../../types/Coordinate';
import { createPathTools } from '../../utils/PathTools';
import { TrackSimulationMapProps } from './TrackSimulationMap.props';


const TrackSimulationMap: React.FC<TrackSimulationMapProps> = ({ path }) => {
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // 시뮬레이션 로직
  useEffect(() => {
    if (!path || path.length === 0) return;

    const tools = createPathTools(path);
    const speed = 20; // 초당 20미터
    let startTime: number | null = null;

    setCurrentPosition(path[0]);
    console.log('시뮬레이션 시작. 총 거리:', tools.totalDistance.toFixed(2), 'm');

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTimeInSeconds = (timestamp - startTime) / 1000;
      const distanceCovered = elapsedTimeInSeconds * speed;

      if (distanceCovered >= tools.totalDistance) {
        setCurrentPosition(tools.getCoordinateAt(tools.totalDistance));
        console.log('시뮬레이션 완료!');
        return;
      }

      const newPosition = tools.getCoordinateAt(distanceCovered);
      setCurrentPosition(newPosition);

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [path]);

  // 에러 또는 빈 경로 처리
  if (!path || path.length === 0) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>경로 정보가 없습니다.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: path[0].latitude,
          longitude: path[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Polyline coordinates={path} strokeColor="blue" strokeWidth={4} />
        {currentPosition && (
          <Marker coordinate={currentPosition} title="Bot" pinColor="red" />
        )}
      </MapView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333'
  },
});

export default TrackSimulationMap;
