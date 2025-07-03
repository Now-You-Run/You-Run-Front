// 러닝 기능

import { useRunning } from '@/context/RunningContext';
import { savePath } from '@/storage/RunningStorage';
import { saveLastTrack } from '@/storage/appStorage';
import { useRunningDataStore } from '@/stores/useRunningDataStore';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
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
  const [isSavedModalVisible, setIsSavedModalVisible] = useState(false);
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
  const onMainPress = () => {
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

      Speech.speak('러닝을 시작합니다.');
      // 트랙모드라면 첫 구간 안내도 즉시
      if (mode === 'track') {
        Speech.speak('웜업 구간입니다. 속도를 조절해주세요.');
      }
    }
  };

  /** “종료” 클릭 → 요약 화면으로 이동 (path, 거리, 시간 전달) */
  const handleFinish = useCallback(async () => {
    stopRunning();
    Speech.speak('러닝을 종료합니다.');

    // 로컬 경로 저장(distance : m 단위, duration : 초 단위)
    await savePath(path, totalDistance * 1000, elapsedTime);

    // 추가: 마지막 달리기 요약 저장 (봇 모드에서 불러와 사용할 수 있도록)
    await saveLastTrack({
      distanceMeters:totalDistance * 1000,
      durationSec: elapsedTime,
    });

    // 평균 페이스 SelectTrack.tsx로 전달
    const avgPaceSecondsPerKm = elapsedTime / totalDistance; // 초/km
    const paceMin = Math.floor(avgPaceSecondsPerKm / 60);
    const paceSec = Math.round(avgPaceSecondsPerKm % 60);

    const snapshot = {
      path: [...path],
      totalDistance,
      elapsedTime,
      avgPace: { minutes: paceMin, seconds: paceSec },
    };

    // 속도 데이터 SelectTrack.tsx로 보내기
    useRunningDataStore
      .getState()
      .setPace(paceMin.toString(), paceSec.toString());

    setSummaryData(snapshot);
    setIsSavedModalVisible(true);
  }, [stopRunning, path, totalDistance, elapsedTime]);

  useEffect(() => {
    if (mode === 'track' && trackKm && totalDistance >= trackKm) {
      handleFinish();
    }
  }, [totalDistance, mode, trackKm, handleFinish]);

  // 버튼에 들어갈 텍스트 결정
  const mainLabel = isActive ? '정지' : isPaused ? '재개' : '시작';

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
          <Pressable
            onPress={onMainPress}
            style={[
              styles.controlButton,
              { backgroundColor: isActive ? '#ff4d4d' : '#007aff' },
            ]}
          >
            <Text style={styles.controlText}>{mainLabel}</Text>
          </Pressable>

          {/* 한 번이라도 실행 후 멈춘 상태일 때만 노출 */}
          {(isPaused || (!isActive && elapsedTime > 0)) && (
            <Pressable
              onPress={handleFinish}
              style={[styles.controlButton, { backgroundColor: '#333' }]}
            >
              <Text style={styles.controlText}>종료</Text>
            </Pressable>
          )}
        </View>
        {/* ✅ 저장 완료 모달 */}
        <Modal
          transparent
          visible={isSavedModalVisible}
          animationType="fade"
          onRequestClose={() => setIsSavedModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                넌! 런! 오늘도 잘 달렸습니다! 경로가 자동으로 저장됩니다!
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  setIsSavedModalVisible(false);
                  if (summaryData) {
                    await router.replace({
                      pathname: '/summary',
                      params: { data: JSON.stringify(summaryData) },
                    });
                    // 네비게이션 완료 후 초기화
                    resetRunning();
                    setSummaryData(null);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>확인</Text>
              </TouchableOpacity>
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
});
