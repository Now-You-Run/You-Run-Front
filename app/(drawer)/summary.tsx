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
import { SafeAreaView } from 'react-native-safe-area-context';

// --- 필요한 모든 모듈들을 가져옵니다 ---
import GradeBadge from '@/components/GradeBadge';
import { useRepositories } from '@/context/RepositoryContext';
import { Coord } from '@/context/RunningContext';
import { postRunningTrack, RunningTrackPayload } from '@/repositories/TrackRepository';
import { useUserStore } from '@/stores/userStore';
import { UserGrades } from '@/types/Grades';
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
  didGradeDown: boolean;
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

  // 등급 랭크(순서) 비교 함수
  function getGradeRank(gradeName: string) {
    return UserGrades.findIndex(g => g.displayName === gradeName);
  }

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
  const mode = parsed.mode;
  const opponentId = parsed.opponentId ?? 0;
  const botPace = parsed.botPace;

  // 경고 메시지 조건
  const isPathTooShort = !userPath || userPath.length < 2 || totalDistanceKm <= 0;

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
        didGradeDown: false,
      });
      setIsCalculating(false);
      return; // 이후 계산을 중단
    }

    // 기존 등급/레벨
    const prevLevel = userProfile.level;
    const prevGrade = calculationService.grade.getGradeByLevel(prevLevel);
    // 누적 거리 반영 후 등급/레벨
    const newLevel = calculationService.level.calculateNewLevel(userProfile.totalDistance + distanceMeters, distanceMeters);
    const newGrade = calculationService.grade.getGradeByLevel(newLevel);
    const gainedPoints = calculationService.point.calculatePoint(distanceMeters);

    const prevRank = getGradeRank(prevGrade);
    const newRank = getGradeRank(newGrade);
    const didGradeUp = newRank > prevRank;
    const didGradeDown = newRank < prevRank;

    // 🔧 추가 안전장치: 음수 rank 처리
    const safePrevRank = prevRank >= 0 ? prevRank : 0;
    const safeNewRank = newRank >= 0 ? newRank : 0;
    const safeDidGradeUp = safeNewRank > safePrevRank;
    const safeDidGradeDown = safeNewRank < safePrevRank;

    console.log('==== 등급업/레벨업 계산 결과 ====');
    console.log('userProfile.level:', prevLevel);
    console.log('userProfile.totalDistance:', userProfile.totalDistance);
    console.log('이번 러닝 거리:', distanceMeters);
    console.log('prevGrade:', prevGrade, 'newGrade:', newGrade);
    console.log('prevRank:', prevRank, 'newRank:', newRank);
    console.log('didLevelUp:', newLevel > prevLevel);
    console.log('didGradeUp:', didGradeUp);
    console.log('===========================');

    // 🚨 잠재적 위험 테스트
    console.log('🚨 잠재적 위험 테스트 시작 🚨');
    
    // 1. userProfile.grade와 prevGrade 불일치 테스트
    console.log('1. Grade 불일치 테스트:');
    console.log('  userProfile.grade:', userProfile.grade);
    console.log('  prevGrade (계산된):', prevGrade);
    console.log('  일치 여부:', userProfile.grade === prevGrade);
    
    // 2. getGradeRank 함수 테스트
    console.log('2. getGradeRank 함수 테스트:');
    console.log('  UserGrades 배열:', UserGrades.map(g => g.displayName));
    console.log('  userProfile.grade의 rank:', getGradeRank(userProfile.grade));
    console.log('  prevGrade의 rank:', prevRank);
    console.log('  newGrade의 rank:', newRank);
    
    // 3. 경계값 테스트
    console.log('3. 경계값 테스트:');
    console.log('  아이언 마지막 레벨(9) 등급:', calculationService.grade.getGradeByLevel(9));
    console.log('  브론즈 첫 레벨(10) 등급:', calculationService.grade.getGradeByLevel(10));
    console.log('  브론즈 마지막 레벨(19) 등급:', calculationService.grade.getGradeByLevel(19));
    console.log('  실버 첫 레벨(20) 등급:', calculationService.grade.getGradeByLevel(20));
    
    // 4. 레벨업 조건 테스트
    console.log('4. 레벨업 조건 테스트:');
    console.log('  prevLevel:', prevLevel, 'newLevel:', newLevel);
    console.log('  레벨업 조건 (newLevel > prevLevel):', newLevel > prevLevel);
    console.log('  레벨업 조건 (newLevel !== prevLevel):', newLevel !== prevLevel);
    
    // 5. 등급업 조건 테스트
    console.log('5. 등급업 조건 테스트:');
    console.log('  prevRank:', prevRank, 'newRank:', newRank);
    console.log('  등급업 조건 (newRank > prevRank):', newRank > prevRank);
    console.log('  등급업 조건 (newRank !== prevRank):', newRank !== prevRank);
    
    // 6. 음수 rank 테스트
    console.log('6. 음수 rank 테스트:');
    console.log('  prevRank가 -1인지:', prevRank === -1);
    console.log('  newRank가 -1인지:', newRank === -1);
    console.log('  안전한 등급업 판정:', safeDidGradeUp);
    
    console.log('🚨 잠재적 위험 테스트 완료 🚨');

    setResults({
      newLevel,
      newGrade,
      gainedPoints,
      didLevelUp: newLevel > prevLevel,
      didGradeUp: safeDidGradeUp, // 안전한 판정 사용
      didGradeDown: safeDidGradeDown, // 안전한 판정 사용
    });
    setIsCalculating(false);
  }, [userProfile, totalDistanceKm]);

  // 🧪 테스트용 임시 코드 (실제 테스트 후 제거 예정)
  const setProfile = useUserStore((state) => state.setProfile);
  
  useEffect(() => {
    // 🧪 테스트 시나리오 (하나씩 테스트)
    const testScenario :number = 2; // 1, 2, 3, 4, 0(비활성화)
    
    if (testScenario === 1) {
      // 아이언 → 브론즈 등급업 테스트
      setProfile({
        username: '테스트유저1',
        level: 9, // 아이언 마지막 레벨
        grade: '아이언',
        point: 0,
        totalDistance: 17999, // 1m만 더 달리면 브론즈
      });
    } else if (testScenario === 2) {
      // 브론즈 → 실버 등급업 테스트
      setProfile({
        username: '테스트유저2',
        level: 19, // 브론즈 마지막 레벨
        grade: '브론즈',
        point: 0,
        totalDistance: 39999, // 1m만 더 달리면 실버
      });
    } else if (testScenario === 3) {
      // 레벨업만 테스트 (같은 등급 내)
      setProfile({
        username: '테스트유저3',
        level: 5, // 아이언 중간 레벨
        grade: '아이언',
        point: 0,
        totalDistance: 9999, // 1m만 더 달리면 레벨 6
      });
    } else if (testScenario === 4) {
      // 등급 불일치 테스트 (userProfile.grade와 계산된 grade가 다른 경우)
      setProfile({
        username: '테스트유저4',
        level: 10, // 브론즈 레벨이지만
        grade: '아이언', // 잘못된 등급으로 설정
        point: 0,
        totalDistance: 20000,
      });
    }
    // testScenario === 0이면 테스트 비활성화
  }, []); // 한 번만 실행

  // --- 기존 저장 관련 핸들러들 (변경 없음) ---
  // 트랙모드(봇) OR 자유모드에 따라 저장 분기
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
      
      let isWinner = false;
      
      let record: SaveRecordDto;
      if(mode === 'MATCH'){
        record = {
          mode: 'MATCH',
          trackId: parseInt(trackId, 10),
          opponentId: parsed.opponentId,
          isWinner: parsed.isWinner ?? false,
          averagePace: parseFloat(calculateAveragePace(totalDistanceKm, elapsedTime).replace("'", ".")),
          distance: Math.round(totalDistanceKm * 1000),
          startedAt: startedAt.toISOString(),
          finishedAt: now.toISOString(),
          userPath: userPath
        }
      }
      else if(isTrackMode){
        if(botPace){
          const botExpectedTime = botPace * totalDistanceKm;
          isWinner = elapsedTime < botExpectedTime;
        }
        record = {
          mode: 'BOT',
          trackId: parseInt(trackId, 10),
          opponentId: 0,
          isWinner: isWinner,
          averagePace: parseFloat(calculateAveragePace(totalDistanceKm, elapsedTime).replace("'", ".")),
          distance: Math.round(totalDistanceKm * 1000),
          startedAt: startedAt.toISOString(),
          finishedAt: now.toISOString(),
          userPath: userPath
        };
      }else{
        record = {
          mode: 'FREE',
          isWinner: false,
          averagePace: parseFloat(calculateAveragePace(totalDistanceKm, elapsedTime).replace("'", ".")),
          distance: Math.round(totalDistanceKm * 1000),
          startedAt: startedAt.toISOString(),
          finishedAt: now.toISOString(),
          userPath: userPath
        };
      }
      const success = await trackRecordRepository.saveRunningRecord(record);
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
        mode: 'FREE',
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
    <SafeAreaView style={styles.container} edges={["bottom","left","right"]}>
      {/* 상단 안내 메시지 */}
      {isPathTooShort && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>경로가 짧아 기록하지 못했습니다.</Text>
        </View>
      )}
      {/* --- 애니메이션 효과 섹션 --- */}
      {results && userProfile && (
        <View style={styles.resultsContainer}>
          <Animated.Text entering={FadeIn.duration(800)} style={styles.title}>
            러닝 완료!
          </Animated.Text>

          {parsed.mode === 'MATCH' && (
            <Animated.View entering={FadeIn.delay(100)}>
              <Text style={{ fontSize: 20, fontWeight: '600', color: parsed.isWinner ? '#4caf50' : '#d32f2f', marginTop: 4 }}>
                {parsed.isWinner ? "🎉 상대와의 대결에서 승리!" : "아쉽게도 패배하였습니다."}
              </Text>
            </Animated.View>
          )}

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

      {/* 저장 버튼을 summaryContainer 아래로 이동 */}
      <Pressable style={styles.completeButton} onPress={handleCompletePress}>
        <Text style={styles.completeIcon}>🏁</Text>
        <Text style={styles.completeButtonText}>저장하고 완료</Text>
      </Pressable>

      {/* 하단 안내 메시지 */}
      {isPathTooShort && (
        <View style={styles.warningBannerBottom}>
          <Text style={styles.warningText}>경로가 짧아 기록하지 못했습니다.</Text>
        </View>
      )}
      {/* --- 모달들은 기존과 동일 --- */}
      <Modal visible={modalType === 'saveNewTrack'} transparent animationType="fade" onRequestClose={() => setModalType(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새로운 트랙 저장</Text>
            <Text style={styles.modalText}>방금 달린 경로를 새로운 트랙으로 저장합니다. 트랙의 이름을 입력해주세요.</Text>
            <TextInput style={styles.input} placeholder="예: 우리집 산책로" value={newTrackName} onChangeText={setNewTrackName} />
            <View style={styles.modalButtonContainer}>
              <Pressable style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={handleSaveRecordOnly} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>기록만 저장</Text>}
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
    </SafeAreaView>
  );
}

// 스타일 시트
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingBottom: 140 },
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
  summaryContainer: { alignItems: 'center', paddingTop: 10, marginBottom: 140, width: '100%' },
  distance: { fontSize: 56, fontWeight: '800', marginVertical: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '90%', marginBottom: 0 },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 14, color: '#888' },
  statValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
  completeButton: { 
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    paddingVertical: 10, 
    borderRadius: 15, 
    backgroundColor: '#007aff', 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center',
  },
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
  warningBanner: {
    width: '100%',
    backgroundColor: '#ffe0e0',
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffbdbd',
    zIndex: 10,
  },
  warningBannerBottom: {
    width: '100%',
    backgroundColor: '#ffe0e0',
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ffbdbd',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  warningText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
