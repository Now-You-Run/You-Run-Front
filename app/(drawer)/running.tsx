// /screens/RunningScreen.tsx

import { useRepositories } from '@/context/RepositoryContext';
import { useRunning } from '@/context/RunningContext';
import { CreateTrackDto } from '@/types/LocalTrackDto';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  const { addTrack } = useRepositories();

  const [trackName, setTrackName] = useState('');
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    path: Coord[];
    totalDistance: number;
    elapsedTime: number;
  } | null>(null);


  const router = useRouter();

  const handleSaveTrack = async () => {
    if (!summaryData) {
      Alert.alert('오류', '데이터를 저장할 준비가 되지 않았습니다.');
      return;
    }
    if (summaryData.path.length === 0) {
      Alert.alert('오류', '저장할 경로 데이터가 없습니다.');
      return;
    }

    const newTrackForDb: CreateTrackDto = {
      name: trackName.trim() || `나의 러닝 ${new Date().toLocaleDateString()}`,
      totalDistance: Math.round(summaryData.totalDistance * 1000),
      rate: 0,
      path: JSON.stringify(summaryData.path),
      startLatitude: summaryData.path[0].latitude,
      startLongitude: summaryData.path[0].longitude,
      address: '주소 정보 없음',
    };

    try {
      await addTrack(newTrackForDb);
      console.log(`기록 저장 성공! ID: ${newTrackForDb.name}`);
      setIsSaveModalVisible(false);
      setTrackName('');
      router.replace({
        pathname: '/Summary',
        params: { data: JSON.stringify(summaryData) },
      });

    } catch (error) {
      console.error('트랙 저장 중 오류 발생:', error);
      Alert.alert('오류', '데이터를 저장하는 중 문제가 발생했습니다.');
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const { mode, trackDistance } = useLocalSearchParams<{
    mode?: string;
    trackDistance?: string;
  }>();
  const trackKm =
    mode === 'track' && trackDistance ? parseFloat(trackDistance) : undefined;

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
  }, [totalDistance, mode, sections, sectionIndex, nextAnnounceKm]);

  const [mapRegion, setMapRegion] = useState<Region>();
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync();
      setMapRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
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
      // 달리는 중 → 일시정지
      stopRunning();
      setIsPaused(true);
      Speech.speak('일시 정지 합니다.');
    } else if (isPaused) {
      resumeRunning();
      setIsPaused(false);
      Speech.speak('러닝을 재개합니다.');
    } else {
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
    };
    setSummaryData(snapshot);
    setIsSaveModalVisible(true);
  }, [stopRunning, path, totalDistance, elapsedTime]);

  useEffect(() => {
    if (mode === 'track' && trackKm && totalDistance >= trackKm) {
      handleFinish();
    }
  }, [totalDistance, mode, trackKm, handleFinish]);

  const mainLabel = isActive ? '정지' : isPaused ? '재개' : '시작';

  useEffect(() => {
    return () => {
      resetRunning();
      setIsPaused(false);
      setTrackName('');
      setIsSaveModalVisible(false);
      setSummaryData(null);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 20,
          zIndex: 10,
          backgroundColor: 'rgba(255,255,255,0.8)',
          borderRadius: 20,
        }}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: 37.5665,
          longitude: 126.978,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        {...(mapRegion && { region: mapRegion })}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton
      >
        <Polyline coordinates={path} strokeColor="#007aff" strokeWidth={6} />
      </MapView>

      <View style={styles.overlay}>
        <Text style={styles.distance}>{totalDistance.toFixed(2)} km</Text>

        <View style={styles.statsContainer}>
          <Text style={styles.stat}>{displaySpeed.toFixed(1)} km/h</Text>
          <Text style={styles.stat}>{formatTime(elapsedTime)} 시간</Text>
          <Text style={styles.stat}>{instantPace} 페이스</Text>
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
                  Alert.alert(
                    '종료 안내',
                    '버튼을 3초간 꾹 누르고 있으면 자동으로 종료됩니다.',
                    [{ text: '알겠습니다' }]
                  );
                }
              }}
            >
              <Text style={styles.controlText}>종료</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onMainPress}
            style={[
              styles.controlButton,
              { backgroundColor: isActive ? '#ff4d4d' : '#007aff' },
            ]}
          >
            <Text style={styles.controlText}>{mainLabel}</Text>
          </Pressable>
        </View>

        {/* 저장 확인 모달 */}
        <Modal
          transparent
          visible={isSaveModalVisible}
          animationType="fade"
          onRequestClose={() => setIsSaveModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>트랙을 저장하시겠습니까?</Text>
              <TextInput
                style={styles.input}
                placeholder="트랙 이름을 입력하세요"
                value={trackName}
                onChangeText={setTrackName}
              />
              <View style={{ flexDirection: 'row', marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#007aff', marginRight: 10 }]}
                  onPress={handleSaveTrack}
                >
                  <Text style={styles.modalButtonText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                  onPress={() => {
                    setIsSaveModalVisible(false);
                    setTrackName('');
                    if (summaryData) {
                      router.replace({
                        pathname: '/Summary',
                        params: { data: JSON.stringify(summaryData) },
                      });
                    }
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: '#333' }]}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

// ==================================================================
// 스타일
// ==================================================================
const styles = StyleSheet.create({
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  distance: {
    fontSize: 60,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
    marginBottom: 20,
  },
  stat: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  controlButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  controlText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    width: 220,
    marginTop: 10,
    fontSize: 16,
  },
});
