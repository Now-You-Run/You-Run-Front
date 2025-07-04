// 러닝 기능
import { useRunning } from '@/context/RunningContext';
import { savePath } from '@/storage/RunningStorage';
import { Track } from '@/types/response/RunningTrackResponse';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

// 순간 페이스: 1km 달리는 데 걸리는 시간
const calculateInstantPace = (speedKmh: number): string => {
  if (speedKmh <= 0) return `0'00"`;
  const secPerKm = 3600 / speedKmh;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
};

/** 초를 mm:ss 형식 문자열로 변환 */
const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ==================================================================
// RunningScreen 컴포넌트
// ==================================================================

export default function RunningScreen() {

  // 타이머 ID 저장할 ref
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSavedModalVisible, setIsSavedModalVisible] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    path: Coord[];
    totalDistance: number;
    elapsedTime: number;
  } | null>(null);

  const router = useRouter();
  const handleBackPress = () => {
    router.back();
  };

  // mode : 'normal' | 'track', trackDistance : km 단위 문자열
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
    resumeRunning,
    resetRunning,
    addStartPointIfNeeded
  } = useRunning();

  // 화면용 속도/페이스
  const displaySpeed = currentSpeed > 0.1 ? currentSpeed : 0;
  const instantPace = calculateInstantPace(displaySpeed);

  // 트랙모드일 때 3구간 정의
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

  // 구간별/기본 100m마다 음성 안내
  useEffect(() => {
    if (mode === 'track' && sectionIndex < sections.length) {
      const sec = sections[sectionIndex];
      if (totalDistance >= sec.end) {
        Speech.speak(`${sec.name}입니다. 속도를 조절해주세요.`);
        setSectionIndex((i) => i + 1);
      }
    } else if (mode !== 'track' && totalDistance >= nextAnnounceKm) {
      // 일반 모드 100m마다
      const meters = Math.round(nextAnnounceKm * 1000);
      Speech.speak(`${meters}미터 지점에 도달했습니다.`);
      setNextAnnounceKm((km) => km + 0.1);
    }
  }, [totalDistance, mode, sections, sectionIndex, nextAnnounceKm]);
  // 지도를 중앙에 맞출 때 쓸 region 상태
  const [mapRegion, setMapRegion] = useState<Region>();

  // “일시정지” 상태 관리
  const [isPaused, setIsPaused] = useState(false);

  // —–– 마운트 시 위치 권한 요청 & 초기Region 설정
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

  // —–– path가 바뀔 때마다 지도를 최신 좌표로 이동
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

  /** 메인 버튼(시작/정지/재개) 눌렀을 때 */
  const onMainPress = async () => {
    if (isActive) {
      // 달리는 중 → 일시정지
      stopRunning();
      setIsPaused(true);
      Speech.speak('일시 정지 합니다.');
    } else if (isPaused) {
      // 일시정지 중 → 재개
      resumeRunning();
      setIsPaused(false);
      Speech.speak('러닝을 재개합니다.');
    } else {
      // 처음 (또는 완전 종료 후) → 새로 시작
      startRunning();
      setIsPaused(false);

      // 여기에서 트랙 모드용 상태를 초기화!
      setSectionIndex(0);
      setNextAnnounceKm(0.1);
      await addStartPointIfNeeded();
      Speech.speak('러닝을 시작합니다.');
      // 트랙모드라면 첫 구간 안내도 즉시
      if (mode === 'track') {
        Speech.speak('웜업 구간입니다. 속도를 조절해주세요.');
      }
    }
  };

  /** “종료” 클릭 → 요약 화면으로 이동 (path, 거리, 시간 전달) */
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

  // 버튼에 들어갈 텍스트 결정
  const mainLabel = isActive ? '정지' : isPaused ? '재개' : '시작';


  useEffect(() => {
    return () => {
      resetRunning();
      // Reset local UI state if needed
      setIsPaused(false);
      setTrackName('');
      setIsSaveModalVisible(false);
      setIsSavedModalVisible(false);
      setSummaryData(null);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* ✅ 뒤로가기 버튼 */}
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
      {/* 지도가 화면 전체 */}
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

      {/* 오버레이 정보 패널 */}
      <View style={styles.overlay}>
        {/* 누적 거리 */}
        <Text style={styles.distance}>{totalDistance.toFixed(2)} km</Text>
        {/* 현재 속도 / 경과 시간 / 페이스 */}
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>{displaySpeed.toFixed(1)} km/h</Text>
          <Text style={styles.stat}>{formatTime(elapsedTime)} 시간</Text>
          <Text style={styles.stat}>{instantPace} 페이스</Text>
        </View>

        {/* 버튼 행: 시작↔정지, (일시정지 후) 종료 */}
        <View style={styles.buttonRow}>
          {/* 한 번이라도 실행 후 멈춘 상태일 때만 노출 */}
          {(isPaused || (!isActive && elapsedTime > 0)) && (
            <Pressable
              style={[styles.controlButton, { backgroundColor: '#333' }]}
              onPressIn={() => {
                // 누르자마자 3초 타이머 시작
                timeoutRef.current = setTimeout(() => {
                  // 3초 지나면 바로 종료
                  handleFinish();
                  // 타이머 소진 후에 null 처리
                  timeoutRef.current = null;
                }, 3000);
              }}
              onPressOut={() => {
                if (timeoutRef.current) {
                  // 3초 안에 뗀 거면 타이머 취소하고 안내
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
        {/* ✅ 저장 완료 모달 */}
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
                  onPress={async () => {
                    // Save the track with the entered name
                    const now = new Date();
                    const track: Track = {
                      id: now.getTime().toString(),
                      name: trackName || `로컬${now.toISOString()}`,
                      path: [...path],
                      distance: totalDistance * 1000,
                      date: now.toISOString(),
                      duration: elapsedTime,
                      thumbnail: null,
                    };
                    await savePath(track);
                    setIsSaveModalVisible(false);
                    setTrackName('');
                    // You can show a confirmation modal or navigate
                    setIsSavedModalVisible(true); // If you want a "saved!" modal
                    if (summaryData) {
                      router.replace({
                        pathname: '/Summary',
                        params: { data: JSON.stringify(summaryData) },
                      });
                    }
                  }}
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
