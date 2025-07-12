import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

// --- 필요한 모든 모듈들을 가져옵니다 ---
import GradeBadge from '@/components/GradeBadge';
import { useRepositories } from '@/context/RepositoryContext';
import { Coord } from '@/context/RunningContext';
import { postRunningTrack, RunningTrackPayload } from '@/repositories/TrackRepository';
import { useUserStore } from '@/stores/userStore';
import { SaveRecordDto } from '@/types/ServerRecordDto';
import { calculateAveragePace, formatTime } from '@/utils/RunningUtils';
import { calculationService } from '@/utils/UserDataCalculator';

// 예측된 결과의 형태 정의
interface RunResult {
  newLevel: number;
  newGrade: string;
  gainedPoints: number;
  didLevelUp: boolean;
  didGradeUp: boolean;
}

export default function SummaryScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();

  // --- 기존 상태 관리 로직 (Repository, Modal 등) ---
  const { trackRecordRepository } = useRepositories();
  const [modalType, setModalType] = useState<'saveNewTrack' | 'confirmSaveRecord' | null>(null);
  const [newTrackName, setNewTrackName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- 애니메이션을 위한 상태 ---
  const userProfile = useUserStore((state) => state.profile);
  const [results, setResults] = useState<RunResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  // --- 데이터 파싱 로직 ---
  if (!data) {
    return (
      <View style={styles.centeredContainer}>
        <Text>요약 정보를 불러올 수 없습니다.</Text>
      </View>
    );
  }
  const parsed = JSON.parse(data);
  const userPath: Coord[] = parsed.userPath ?? parsed.path ?? [];
  const totalDistanceKm = parsed.totalDistance;
  const elapsedTime = parsed.elapsedTime;
  const trackId = parsed.trackId;
  const isTrackMode = !!trackId;

  // --- 화면 로딩 시 낙관적 UI 계산을 수행 ---
  useEffect(() => {
    console.log('계산 시점의 userProfile:', JSON.stringify(userProfile, null, 2));
    if (!userProfile) return;

    const distanceMeters = totalDistanceKm * 1000;

    if (distanceMeters <= 0) {
      setResults({
        newLevel: userProfile.level,
        newGrade: userProfile.grade,
        gainedPoints: 0,
        didLevelUp: false,
        didGradeUp: false,
      });
      setIsCalculating(false);
      return; // 이후 계산을 중단
    }


    const newLevel = calculationService.level.calculateNewLevel(userProfile.totalDistance, distanceMeters);
    const newGrade = calculationService.grade.getGradeByLevel(newLevel);
    const gainedPoints = calculationService.point.calculatePoint(distanceMeters);

    setResults({
      newLevel,
      newGrade,
      gainedPoints,
      didLevelUp: newLevel > userProfile.level,
      didGradeUp: newGrade !== userProfile.grade,
    });
    setIsCalculating(false);
  }, [userProfile]);

  // --- 기존 저장 관련 핸들러들 (변경 없음) ---
  const handleSaveRecordOnly = async () => {
    setIsSaving(true);
    try {
      if (!trackRecordRepository) {
        Alert.alert("오류", "서버 통신 모듈을 찾을 수 없습니다.");
        setIsSaving(false);
        return;
      }

      const now = new Date();
      const startedAt = new Date(now.getTime() - elapsedTime * 1000);
      const newServerRecord: SaveRecordDto = {
        mode: 'BOT',
        trackId: parseInt(trackId, 10),
        opponentId: 0,
        isWinner: true,
        averagePace: parseFloat(calculateAveragePace(totalDistanceKm, elapsedTime).replace("'", ".")),
        distance: Math.round(totalDistanceKm * 1000),
        startedAt: startedAt.toISOString(),
        finishedAt: now.toISOString(),
        userPath: userPath
      };
      const success = await trackRecordRepository.saveRunningRecord(newServerRecord);
      if (success) {
        setModalType(null);
        Alert.alert('기록 전송 완료', '서버에 러닝 기록이 저장되었습니다.', [
          { text: '확인', onPress: () => router.replace('/') },
        ]);
      } else {
        Alert.alert('전송 실패', '서버에 기록을 저장하는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('기록 저장/전송 중 오류:', error);
      Alert.alert('오류', '데이터를 처리하는 중 문제가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNewTrackAndRecord = async () => {
    if (newTrackName.trim() === '') {
      Alert.alert('입력 필요', '저장할 트랙의 이름을 입력해주세요.');
      return;
    }
    if (!userPath || userPath.length < 2) {
      Alert.alert("오류", "경로가 너무 짧아 트랙으로 저장할 수 없습니다.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. 새로운 트랙 생성을 서버에 요청
      const newUserTrack: RunningTrackPayload = {
        name: newTrackName.trim(),
        totalDistance: Math.round(totalDistanceKm * 1000),
        path: userPath,
        rate: 0,
      };
      const savedTrack = await postRunningTrack(newUserTrack);
      
      // [수정 1] 서버 응답에서 trackId를 제대로 받았는지 확인
      const newTrackId = savedTrack?.trackId;
      if (!newTrackId) {
        // trackId를 못 받았다면, 여기서 중단하고 사용자에게 알림
        throw new Error('새로운 트랙을 생성했지만 서버로부터 ID를 받지 못했습니다.');
      }

      if (!trackRecordRepository) {
        throw new Error("서버 통신 모듈을 찾을 수 없습니다.");
      }

      // 2. 위에서 받은 새 트랙 ID로 러닝 기록 저장 요청
      const now = new Date();
      const startedAt = new Date(now.getTime() - elapsedTime * 1000);
      const newServerRecord: SaveRecordDto = {
        mode: 'BOT',
        trackId: newTrackId, // 새로 생성된 트랙의 ID를 사용
        opponentId: 0,
        isWinner: true,
        averagePace: parseFloat(calculateAveragePace(totalDistanceKm, elapsedTime).replace("'", ".")),
        distance: Math.round(totalDistanceKm * 1000),
        startedAt: startedAt.toISOString(),
        finishedAt: now.toISOString(),
        userPath: userPath
      };

      const success = await trackRecordRepository.saveRunningRecord(newServerRecord);

      if (success) {
        setModalType(null);
        // [수정 2] 사용자에게 트랙과 기록이 모두 저장되었음을 명확히 알려줌
        Alert.alert(
          '저장 완료', 
          '새로운 트랙과 러닝 기록이 모두 저장되었습니다.', 
          [{ text: '확인', onPress: () => router.replace('/') }]
        );
      } else {
        throw new Error('서버에 기록을 저장하는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('저장 중 오류 발생:', error);
      Alert.alert('오류', (error as Error).message || '데이터를 저장하는 중 문제가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompletePress = () => {
    if (totalDistanceKm <= 0) {
      Alert.alert(
        '저장 불가',
        '달린 거리가 없어 기록을 저장할 수 없습니다.',
        [{ text: '확인', onPress: () => router.replace('/') }] // 확인 시 홈으로 이동
      );
      return;
    }
    if (isTrackMode) {
      setModalType('confirmSaveRecord');
    } else {
      setModalType('saveNewTrack');
    }
  };

  if (!Array.isArray(userPath) || userPath.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text>경로 데이터가 올바르지 않습니다.</Text>
      </View>
    );
  }

  if (isCalculating) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={styles.loadingText}>러닝 결과 분석 중...</Text>
      </View>
    );
  }

  const { width } = Dimensions.get('window');
  const pace = calculateAveragePace(totalDistanceKm, elapsedTime);
  const calories = Math.round(totalDistanceKm * 60);

  return (
    <View style={styles.container}>
      {/* --- 애니메이션 효과 섹션 --- */}
      {results && userProfile && (
        <View style={styles.resultsContainer}>
          <Animated.Text entering={FadeIn.duration(800)} style={styles.title}>
            러닝 완료!
          </Animated.Text>


          {totalDistanceKm <= 0 ? (
            <Animated.View entering={FadeIn.delay(200)}>
              <Text style={styles.noRecordText}>기록할 만큼 충분히 달리지 못했어요.</Text>
            </Animated.View>
          ) : (
            <>
              {/* 기존 애니메이션 섹션 (거리가 0보다 클 때만 보임) */}
              <Animated.View entering={SlideInDown.delay(200).duration(600)}>
                <Text style={styles.label}>획득 포인트</Text>
                <Text style={styles.highlightText}>+{results.gainedPoints} P</Text>
              </Animated.View>
              {results.didLevelUp && (
                <Animated.View entering={SlideInDown.delay(600)} style={styles.resultBox}>
                  <Text style={styles.levelUpText}>🎉 레벨 업! 🎉</Text>
                  <Text style={styles.levelChangeText}>Lv. {userProfile.level} → Lv. {results.newLevel}</Text>
                </Animated.View>
              )}
              {results.didGradeUp && (
                <Animated.View entering={SlideInDown.delay(1000)} style={styles.resultBox}>
                  <Text style={styles.gradeUpText}>✨ 등급 상승! ✨</Text>
                  <View style={styles.gradeChangeContainer}>
                    <GradeBadge grade={userProfile.grade} level={userProfile.level} />
                    <Text style={styles.arrowText}>→</Text>
                    <GradeBadge grade={results.newGrade} level={results.newLevel} />
                  </View>
                </Animated.View>
              )}
            </>
          )}
        </View>
      )}

      {/* --- 기존 정보 표시 섹션 --- */}
      <View style={styles.summaryContainer}>
        <MapView
          style={{ width: width, height: 200 }}
          initialRegion={{
            latitude: userPath[0]?.latitude || 37.5665,
            longitude: userPath[0]?.longitude || 126.978,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Polyline coordinates={userPath} strokeColor="#007aff" strokeWidth={5} />
        </MapView>
        <Text style={styles.distance}>{totalDistanceKm.toFixed(2)} km</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>시간</Text>
            <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>페이스</Text>
            <Text style={styles.statValue}>{pace}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>칼로리</Text>
            <Text style={styles.statValue}>{calories}</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.completeButton} onPress={handleCompletePress}>
        <Text style={styles.completeIcon}>🏁</Text>
        <Text style={styles.completeButtonText}>저장하고 완료</Text>
      </Pressable>

      {/* --- 모달들은 기존과 동일 --- */}
      <Modal visible={modalType === 'saveNewTrack'} transparent animationType="fade" onRequestClose={() => setModalType(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새로운 트랙 저장</Text>
            <Text style={styles.modalText}>방금 달린 경로를 새로운 트랙으로 저장합니다. 트랙의 이름을 입력해주세요.</Text>
            <TextInput style={styles.input} placeholder="예: 우리집 산책로" value={newTrackName} onChangeText={setNewTrackName} />
            <View style={styles.modalButtonContainer}>
              <Pressable style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => { setModalType(null); router.replace('/'); }}>
                <Text style={styles.modalButtonText}>취소</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: '#007aff' }]} onPress={handleSaveNewTrackAndRecord} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>저장</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalType === 'confirmSaveRecord'} transparent animationType="fade" onRequestClose={() => setModalType(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>기록 저장</Text>
            <Text style={styles.modalText}>현재 러닝 기록을 저장하시겠습니까?</Text>
            <View style={styles.modalButtonContainer}>
              <Pressable style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => setModalType(null)}>
                <Text style={styles.modalButtonText}>취소</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: '#007aff' }]} onPress={handleSaveRecordOnly} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>저장</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// 스타일 시트
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultsContainer: { paddingVertical: 20, paddingHorizontal: 20, alignItems: 'center', backgroundColor: '#f0f8ff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
  label: { fontSize: 16, color: '#555', marginTop: 15 },
  highlightText: { fontSize: 42, fontWeight: 'bold', color: '#007aff', marginBottom: 15 },
  resultBox: { width: '90%', marginVertical: 8, padding: 15, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  levelUpText: { fontSize: 22, fontWeight: 'bold', color: '#4caf50' },
  levelChangeText: { fontSize: 18, color: '#333', marginTop: 5 },
  gradeUpText: { fontSize: 22, fontWeight: 'bold', color: '#ff9800' },
  gradeChangeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  arrowText: { fontSize: 20, marginHorizontal: 15 },
  summaryContainer: { flex: 1, alignItems: 'center', paddingTop: 10 },
  distance: { fontSize: 56, fontWeight: '800', marginVertical: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '90%', marginBottom: 20 },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 14, color: '#888' },
  statValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
  completeButton: { margin: 20, paddingVertical: 15, borderRadius: 15, backgroundColor: '#007aff', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  completeIcon: { fontSize: 24 },
  completeButtonText: { fontSize: 18, color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '90%', backgroundColor: 'white', padding: 25, borderRadius: 15, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  modalButton: { flex: 1, marginHorizontal: 5, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  noRecordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 40, // 공간 확보
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
});
