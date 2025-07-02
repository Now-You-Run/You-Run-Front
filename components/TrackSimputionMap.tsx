import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Coordinate } from '../types/Coordinate';
import { createPathTools } from '../utils/PathTools';

interface TrackSimulationMapProps {
  trackId: number;
}

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL

const TrackSimulationMap: React.FC<TrackSimulationMapProps> = ({ trackId }) => {
  const [path, setPath] = useState<Coordinate[]>([]);
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<string>('loading');
  const animationFrameId = useRef<number | null>(null);

  // 경로 데이터 로드
  useEffect(() => {
    const fetchPathData = async () => {
      try {
        setSimulationStatus('loading');
        // 실제 API 주소로 변경하세요.
        const response = await fetch(`${SERVER_API_URL}/api/gps/track?trackId=${trackId}`); 
        const data = await response.json();
        
        // 서버 응답 구조에 맞게 수정: data.data.path
        if (data && data.data && data.data.path) {
          const coordinates: Coordinate[] = data.data.path;
          setPath(coordinates);
          setCurrentPosition(coordinates[0]);
          setSimulationStatus('loaded');
          console.log('경로 데이터 로드 완료. 포인트 수:', coordinates.length);
        } else {
          throw new Error("Invalid data structure from server");
        }
      } catch (error) {
        console.error('경로 데이터 로드 실패:', error);
        setSimulationStatus('error');
      }
    };
    
    fetchPathData();
    
    // 컴포넌트가 사라질 때 애니메이션 정리
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [trackId]);

  // 시뮬레이션 로직
  useEffect(() => {
    // 경로 데이터가 없으면 애니메이션을 시작하지 않음
    if (path.length === 0) return;

    const tools = createPathTools(path);
    const speed = 20; // 초당 10미터
    let startTime: number | null = null;

    console.log('시뮬레이션 시작. 총 거리:', tools.totalDistance.toFixed(2), 'm');

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTimeInSeconds = (timestamp - startTime) / 1000;
      const distanceCovered = elapsedTimeInSeconds * speed;

      if (distanceCovered >= tools.totalDistance) {
        setCurrentPosition(tools.getCoordinateAt(tools.totalDistance));
        console.log('시뮬레이션 완료!');
        return; // 애니메이션 루프 종료
      }

      const newPosition = tools.getCoordinateAt(distanceCovered);
      setCurrentPosition(newPosition);
      
      animationFrameId.current = requestAnimationFrame(animate);
    };

    // 애니메이션 시작
    animationFrameId.current = requestAnimationFrame(animate);

    // 이 effect가 다시 실행되거나 컴포넌트가 언마운트될 때 현재 진행중인 애니메이션을 정리
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [path]); // ★★★ 핵심 수정: 의존성 배열에서 currentPosition 제거 ★★★

  // 로딩 및 에러 상태 UI
  if (simulationStatus === 'loading') {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.statusText}>경로 데이터 로드 중...</Text>
      </View>
    );
  }

  if (simulationStatus === 'error' || path.length === 0) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>경로를 불러오는 데 실패했습니다.</Text>
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
          latitudeDelta: 0.01, // 더 넓은 시야를 위해 값 조정
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