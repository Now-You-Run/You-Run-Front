import { useRunning } from '@/context/RunningContext';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Polyline, Region } from 'react-native-maps';

interface Coord {
  latitude: number;
  longitude: number;
}

// ==================================================================
// 헬퍼 함수 (계산 로직)
// ==================================================================

const calculateInstantPace = (speedKmh: number): string => {
  if (speedKmh <= 0) return `0'00"`;
  const secPerKm = 3600 / speedKmh;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ==================================================================
// RunningScreen 컴포넌트
// ==================================================================

export default function RunningScreen() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const [summaryData, setSummaryData] = useState<any>(null);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);

  const { mode, trackDistance, trackId } = useLocalSearchParams<{
    mode?: string;
    trackDistance?: string;
    trackId?: string; // TrackList에서 전달받은 트랙 ID
  }>();

  const trackKm = mode === 'track' && trackDistance ? parseFloat(trackDistance) : undefined;

  const {
    isActive,
    elapsedTime,
    path,
    currentSpeed,
    totalDistance,
    startRunning,
    stopRunning,
    pauseRunning,
    resumeRunning,
    resetRunning,
    addStartPointIfNeeded,
  } = useRunning();

  const displaySpeed = currentSpeed > 0.1 ? currentSpeed : 0;
  const instantPace = calculateInstantPace(displaySpeed);

  const sections = useMemo(() => {
    if (mode === 'track' && trackKm) {
      return [
        { name: '본격 구간', end: trackKm * 0.2 },
        { name: '마무리 구간', end: trackKm * 0.8 },
      ];
    }
    return [];
  }, [mode, trackKm]);

  const [sectionIndex, setSectionIndex] = useState(0);
  const [nextAnnounceKm, setNextAnnounceKm] = useState(0.1);

  useEffect(() => {
    if (!isActive) return;
    if (mode === 'track' && sectionIndex < sections.length) {
      const sec = sections[sectionIndex];
      if (totalDistance >= sec.end) {
        Speech.speak(`${sec.name}입니다. 속도를 조절해주세요.`);
        setSectionIndex((i) => i + 1);
      }
    } else if (mode !== 'track' && totalDistance >= nextAnnounceKm) {
      const meters = Math.round(nextAnnounceKm * 1000);
      Speech.speak(`${meters}미터 지점에 도달했습니다.`);
      setNextAnnounceKm((km) => km + 0.1);
    }
  }, [totalDistance, isActive, mode, sections, sectionIndex, nextAnnounceKm]);

  const [mapRegion, setMapRegion] = useState<Region>();
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("위치 권한 필요", "러닝을 기록하려면 위치 권한이 필요합니다.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync();
      setMapRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    if (path.length > 0) {
      const last = path[path.length - 1];
      setMapRegion({
        latitude: last.latitude,
        longitude: last.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [path]);

  const onMainPress = async () => {
    if (isActive) {
      pauseRunning();
      setIsPaused(true);
      Speech.speak('일시 정지 합니다.');
    } else if (isPaused) {
      resumeRunning();
      setIsPaused(false);
      Speech.speak('러닝을 재개합니다.');
    } else {
      resetRunning(); // 새 러닝 시작 전 초기화
      startRunning();
      setIsPaused(false);
      setSectionIndex(0);
      setNextAnnounceKm(0.1);
      await addStartPointIfNeeded();
      Speech.speak('러닝을 시작합니다.');
      if (mode === 'track') {
        Speech.speak('웜업 구간입니다. 속도를 조절해주세요.');
      }
    }
  };

  const handleFinish = useCallback(() => {
    stopRunning();
    Speech.speak('러닝을 종료합니다.');
    const snapshot = {
      path: [...path],
      totalDistance,
      elapsedTime,
      trackId,
    };
    setSummaryData(snapshot);
    setIsFinishModalVisible(true);
  }, [stopRunning, path, totalDistance, elapsedTime, trackId]);

  useEffect(() => {
    if (isActive && mode === 'track' && trackKm && totalDistance >= trackKm) {
      handleFinish();
    }
  }, [totalDistance, isActive, mode, trackKm, handleFinish]);

  const handleBackPress = () => {
    if (elapsedTime > 0) {
      Alert.alert(
        "러닝 중단",
        "진행 중인 러닝 기록이 사라집니다. 정말로 나가시겠습니까?",
        [
          { text: "취소", style: "cancel" },
          { text: "나가기", style: "destructive", onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const mainLabel = isActive ? '정지' : isPaused ? '재개' : '시작';

  useEffect(() => {
    return () => {
      resetRunning();
      setIsPaused(false);
      setSummaryData(null);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={mapRegion}
        region={mapRegion}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton={false}
      >
        <Polyline coordinates={path} strokeColor="#007aff" strokeWidth={6} />
      </MapView>

      <View style={styles.overlay}>
        <Text style={styles.distance}>{totalDistance.toFixed(2)} km</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>{displaySpeed.toFixed(1)} km/h</Text>
          <Text style={styles.stat}>{formatTime(elapsedTime)}</Text>
          <Text style={styles.stat}>{instantPace}</Text>
        </View>

        <View style={styles.buttonRow}>
          {(isPaused || (!isActive && elapsedTime > 0)) && (
            <Pressable
              style={[styles.controlButton, { backgroundColor: '#333' }]}
              onPressIn={() => {
                timeoutRef.current = setTimeout(() => {
                  handleFinish();
                  timeoutRef.current = null;
                }, 3000);
              }}
              onPressOut={() => {
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                  Alert.alert('종료 안내', '버튼을 3초간 꾹 누르고 있으면 자동으로 종료됩니다.', [{ text: '알겠습니다' }]);
                }
              }}
            >
              <Text style={styles.controlText}>종료</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onMainPress}
            style={[styles.controlButton, { backgroundColor: isActive ? '#ff4d4d' : '#007aff' }]}
          >
            <Text style={styles.controlText}>{mainLabel}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        transparent
        visible={isFinishModalVisible}
        animationType="fade"
        onRequestClose={() => setIsFinishModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>러닝 종료</Text>
            <Text style={styles.modalText}>수고하셨습니다! 러닝이 안전하게 종료되었습니다.</Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                if (summaryData) {
                  router.replace({
                    pathname: '/summary',
                    params: { data: JSON.stringify(summaryData) },
                  });
                }
                setIsFinishModalVisible(false);
              }}
            >
              <Text style={styles.confirmButtonText}>결과 확인하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  headerBar: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#333' },
  overlay: { width: '100%', backgroundColor: 'rgba(255,255,255,0.9)', padding: 20, paddingBottom: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center' },
  distance: { fontSize: 60, fontWeight: '800', color: '#1c1c1e' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 15, marginBottom: 20 },
  stat: { fontSize: 24, fontWeight: '600', color: '#333', textAlign: 'center', flex: 1 },
  buttonRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  controlButton: { flex: 1, marginHorizontal: 5, paddingVertical: 15, borderRadius: 10, alignItems: 'center' },
  controlText: { color: 'white', fontSize: 18, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '80%', backgroundColor: 'white', paddingVertical: 30, paddingHorizontal: 20, borderRadius: 15, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  confirmButton: { backgroundColor: '#007aff', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8 },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
