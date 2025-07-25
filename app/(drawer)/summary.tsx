import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import Animated, { FadeOut, SlideInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- 필요한 모든 모듈들을 가져옵니다 ---
import GradeBadge from '@/components/GradeBadge';
import { useRepositories } from '@/context/RepositoryContext';
import { Coord } from '@/context/RunningContext';
import {
  postRunningTrack,
  RunningTrackPayload,
} from '@/repositories/TrackRepository';
import { useUserStore } from '@/stores/userStore';
import { UserGrades } from '@/types/Grades';
import { SaveRecordDto } from '@/types/ServerRecordDto';
import { calculateAveragePace, formatTime } from '@/utils/RunningUtils';
import { calculationService } from '@/utils/UserDataCalculator';
import LottieView from 'lottie-react-native';

// 예측된 결과의 형태 정의
interface RunResult {
  newLevel: number;
  newGrade: string;
  gainedPoints: number;
  didLevelUp: boolean;
  didGradeUp: boolean;
  didGradeDown: boolean;
}

// 실제 사용 가능한 화면 높이 계산
const SCREEN_HEIGHT = Dimensions.get('window').height;
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 0;
const SAFE_AREA_BOTTOM = Platform.OS === 'ios' ? 34 : 0;

const AVAILABLE_HEIGHT = SCREEN_HEIGHT - STATUS_BAR_HEIGHT - SAFE_AREA_BOTTOM;

export default function SummaryScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();

  // --- 기존 상태 관리 로직 (Repository, Modal 등) ---
  const { trackRecordRepository } = useRepositories();
  const [modalType, setModalType] = useState<
    'saveNewTrack' | 'confirmSaveRecord' | null
  >(null);
  const [newTrackName, setNewTrackName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTrackNameModal, setShowTrackNameModal] = useState(false);
  const [tempTrackName, setTempTrackName] = useState('');

  // 애니메이션 상태 관리
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showGradeUp, setShowGradeUp] = useState(false);
  const [showGradeBadge, setShowGradeBadge] = useState(false);
  const [showCoinPoint, setShowCoinPoint] = useState(false);

  // --- 애니메이션을 위한 상태 ---
  const userProfile = useUserStore((state) => state.profile);
  const [results, setResults] = useState<RunResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  // 애니메이션 타이밍 관리
  useEffect(() => {
    if (results?.didLevelUp) {
      setShowCoinPoint(true);
      setTimeout(() => {
        setShowCoinPoint(false);
        setTimeout(() => {
          setShowLevelUp(true);
          const levelUpHideTimer = setTimeout(() => {
            setShowLevelUp(false);
            if (results.didGradeUp) {
              setTimeout(() => {
                setShowGradeUp(true);
                setTimeout(() => {
                  setShowGradeUp(false);
                  setShowGradeBadge(false);
                }, 2000);
                setTimeout(() => {
                  setShowGradeBadge(true);
                }, 500);
              }, 700);
            }
          }, 2000);
          return () => {
            clearTimeout(levelUpHideTimer);
          };
        }, 700);
      }, 2000);
    } else if (results?.didGradeUp) {
      setShowGradeUp(true);
      setTimeout(() => {
        setShowGradeBadge(true);
      }, 500);
      const gradeUpHideTimer = setTimeout(() => {
        setShowGradeUp(false);
        setShowGradeBadge(false);
      }, 2000);
      return () => {
        clearTimeout(gradeUpHideTimer);
      };
    }
  }, [results]);

  // 등급 랭크(순서) 비교 함수
  function getGradeRank(gradeName: string) {
    return UserGrades.findIndex((g) => g.displayName === gradeName);
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

  // 중심 좌표 계산 함수 추가
  function getCenterOfPath(points: Coord[]) {
    let minLat: number | undefined, maxLat: number | undefined, minLng: number | undefined, maxLng: number | undefined;
    points.forEach(point => {
      minLat = minLat !== undefined ? Math.min(minLat, point.latitude) : point.latitude;
      maxLat = maxLat !== undefined ? Math.max(maxLat, point.latitude) : point.latitude;
      minLng = minLng !== undefined ? Math.min(minLng, point.longitude) : point.longitude;
      maxLng = maxLng !== undefined ? Math.max(maxLng, point.longitude) : point.longitude;
    });
    return {
      latitude: ((minLat ?? 0) + (maxLat ?? 0)) / 2,
      longitude: ((minLng ?? 0) + (maxLng ?? 0)) / 2,
    };
  }

  const center = userPath.length > 0 ? getCenterOfPath(userPath) : { latitude: 37.5665, longitude: 126.978 };
  const mapRegion = {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: 0.001, // 아주 작게 (확대)
    longitudeDelta: 0.001,
  };
  // 경고 메시지 조건
  const isPathTooShort =
    !userPath || userPath.length < 2 || totalDistanceKm <= 0;

  // --- 화면 로딩 시 낙관적 UI 계산을 수행 ---
  useEffect(() => {
    console.log(
      '계산 시점의 userProfile:',
      JSON.stringify(userProfile, null, 2)
    );
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
    const newLevel = calculationService.level.calculateNewLevel(
      userProfile.totalDistance + distanceMeters,
      distanceMeters
    );
    const newGrade = calculationService.grade.getGradeByLevel(newLevel);
    const gainedPoints =
      calculationService.point.calculatePoint(distanceMeters);

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
    console.log(
      '  UserGrades 배열:',
      UserGrades.map((g) => g.displayName)
    );
    console.log('  userProfile.grade의 rank:', getGradeRank(userProfile.grade));
    console.log('  prevGrade의 rank:', prevRank);
    console.log('  newGrade의 rank:', newRank);

    // 3. 경계값 테스트
    console.log('3. 경계값 테스트:');
    console.log(
      '  아이언 마지막 레벨(9) 등급:',
      calculationService.grade.getGradeByLevel(9)
    );
    console.log(
      '  브론즈 첫 레벨(10) 등급:',
      calculationService.grade.getGradeByLevel(10)
    );
    console.log(
      '  브론즈 마지막 레벨(19) 등급:',
      calculationService.grade.getGradeByLevel(19)
    );
    console.log(
      '  실버 첫 레벨(20) 등급:',
      calculationService.grade.getGradeByLevel(20)
    );

    // 4. 레벨업 조건 테스트
    console.log('4. 레벨업 조건 테스트:');
    console.log('  prevLevel:', prevLevel, 'newLevel:', newLevel);
    console.log('  레벨업 조건 (newLevel > prevLevel):', newLevel > prevLevel);
    console.log(
      '  레벨업 조건 (newLevel !== prevLevel):',
      newLevel !== prevLevel
    );

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
    const testScenario: number = 2; // 1, 2, 3, 4, 0(비활성화)

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
        Alert.alert('오류', '서버 통신 모듈을 찾을 수 없습니다.');
        setIsSaving(false);
        return;
      }

      const now = new Date();
      const startedAt = new Date(now.getTime() - elapsedTime * 1000);

      let isWinner = false;

      let record: SaveRecordDto;
      if (mode === 'MATCH') {
        record = {
          mode: 'MATCH',
          trackId: parseInt(trackId, 10),
          opponentId: parsed.opponentId,
          isWinner: parsed.isWinner ?? false,
          averagePace: parseFloat(
            calculateAveragePace(totalDistanceKm, elapsedTime).replace("'", '.')
          ),
          distance: Math.round(totalDistanceKm * 1000),
          startedAt: startedAt.toISOString(),
          finishedAt: now.toISOString(),
          userPath: userPath,
        };
      } else if (isTrackMode) {
        if (botPace) {
          const botExpectedTime = botPace * totalDistanceKm;
          isWinner = elapsedTime < botExpectedTime;
        }
        record = {
          mode: 'BOT',
          trackId: parseInt(trackId, 10),
          opponentId: 0,
          isWinner: isWinner,
          averagePace: parseFloat(
            calculateAveragePace(totalDistanceKm, elapsedTime).replace("'", '.')
          ),
          distance: Math.round(totalDistanceKm * 1000),
          startedAt: startedAt.toISOString(),
          finishedAt: now.toISOString(),
          userPath: userPath,
        };
      } else {
        record = {
          mode: 'FREE',
          isWinner: false,
          averagePace: parseFloat(
            calculateAveragePace(totalDistanceKm, elapsedTime).replace("'", '.')
          ),
          distance: Math.round(totalDistanceKm * 1000),
          startedAt: startedAt.toISOString(),
          finishedAt: now.toISOString(),
          userPath: userPath,
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

  const handleSaveNewTrackAndRecord = async (trackName?: string) => {
    const nameToUse = (trackName ?? newTrackName).trim();
    if (nameToUse === '') {
      Alert.alert('입력 필요', '저장할 트랙의 이름을 입력해주세요.');
      return;
    }
    if (!userPath || userPath.length < 2) {
      Alert.alert('오류', '경로가 너무 짧아 트랙으로 저장할 수 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. 새로운 트랙 생성을 서버에 요청
      const newUserTrack: RunningTrackPayload = {
        name: nameToUse,
        totalDistance: Math.round(totalDistanceKm * 1000),
        path: userPath,
        rate: 0,
      };
      const savedTrack = await postRunningTrack(newUserTrack);

      // [수정 1] 서버 응답에서 trackId를 제대로 받았는지 확인
      const newTrackId = savedTrack?.trackId;
      if (!newTrackId) {
        // trackId를 못 받았다면, 여기서 중단하고 사용자에게 알림
        throw new Error(
          '새로운 트랙을 생성했지만 서버로부터 ID를 받지 못했습니다.'
        );
      }

      if (!trackRecordRepository) {
        throw new Error('서버 통신 모듈을 찾을 수 없습니다.');
      }

      // 2. 위에서 받은 새 트랙 ID로 러닝 기록 저장 요청
      const now = new Date();
      const startedAt = new Date(now.getTime() - elapsedTime * 1000);
      const newServerRecord: SaveRecordDto = {
        mode: 'FREE',
        trackId: newTrackId, // 새로 생성된 트랙의 ID를 사용
        opponentId: 0,
        isWinner: true,
        averagePace: parseFloat(
          calculateAveragePace(totalDistanceKm, elapsedTime).replace("'", '.')
        ),
        distance: Math.round(totalDistanceKm * 1000),
        startedAt: startedAt.toISOString(),
        finishedAt: now.toISOString(),
        userPath: userPath,
      };

      const success = await trackRecordRepository.saveRunningRecord(
        newServerRecord
      );

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
      Alert.alert(
        '오류',
        (error as Error).message || '데이터를 저장하는 중 문제가 발생했습니다.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // 완료 버튼 핸들러
  const handleCompletePress = () => {
    if (isTrackMode) {
      setModalType('confirmSaveRecord');
    } else {
      setModalType('saveNewTrack');
    }
  };

  useEffect(() => {
    if (modalType === 'saveNewTrack') {
      // setTimeout으로 모달 오픈을 defer하여 race condition 방지
      setTimeout(() => setShowTrackNameModal(true), 0);
      setModalType(null);
    } else if (modalType === 'confirmSaveRecord') {
      Alert.alert(
        '기록 저장',
        '이 기록을 저장하시겠습니까?',
        [
          {
            text: '취소',
            style: 'cancel',
            onPress: () => router.replace('/'),
          },
          {
            text: '저장',
            onPress: handleSaveRecordOnly,
          },
        ],
        { cancelable: true }
      );
      setModalType(null);
    }
  }, [modalType]);

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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#fff' }}
      edges={['bottom', 'left', 'right']}
    >
      <View style={styles.container}>
        {isPathTooShort && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              경로가 짧아 기록하지 못했습니다.
            </Text>
          </View>
        )}
        
        <View style={[
          styles.mapContainer,
          isPathTooShort && { height: AVAILABLE_HEIGHT * 0.6 - styles.warningBanner.height }
        ]}>
          <MapView
            style={styles.map}
            region={mapRegion}
          >
            <Polyline
              coordinates={userPath}
              strokeColor="#007aff"
              strokeWidth={5}
            />
          </MapView>

          {results && userProfile && totalDistanceKm > 0 && (
            <View style={styles.overlayContainer}>
              {showCoinPoint && (
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  <LottieView
                    source={require('../../assets/lottie/coin.json')}
                    autoPlay
                    loop={false}
                    style={{ width: 80, height: 80, marginBottom: 0 }}
                    speed={1.2}
                  />
                  <Animated.Text
                    entering={SlideInDown.duration(600)}
                    style={styles.points}
                  >
                    +{results.gainedPoints}P
                  </Animated.Text>
                </View>
              )}
              {showLevelUp && results.didLevelUp && (
                <Animated.View
                  entering={SlideInDown.duration(500)}
                  exiting={FadeOut.duration(500)}
                  style={styles.resultBox}
                >
                  <Text style={styles.levelUpText}>LEVEL UP!</Text>
                  <LottieView
                    source={require('../../assets/lottie/levelup.json')}
                    autoPlay
                    loop={false}
                    style={{ width: 200, height: 200, position: 'absolute', top: -40, left: '50%', marginLeft: -90, zIndex: -1, transform: [{ scaleY: -1 }] }}
                    speed={1.2}
                  />
                  <Text style={styles.levelChangeText}>
                    Lv. {userProfile.level} → Lv. {results.newLevel}
                  </Text>
                </Animated.View>
              )}
              {showGradeUp && (
                <Animated.View
                  entering={SlideInDown.duration(500)}
                  exiting={FadeOut.duration(500)}
                  style={styles.resultBox}
                >
                  <Text style={styles.gradeUpText}> RANK UP </Text>
                  <LottieView
                    source={require('../../assets/lottie/grade.json')}
                    autoPlay
                    loop={false}
                    style={{ width: 320, height: 200, position: 'absolute', top: -40, left: '50%', marginLeft: -140, zIndex: -1 }}
                    speed={1.2}
                  />
                  {showGradeBadge && (
                    <View style={styles.gradeChangeContainer}>
                      <GradeBadge
                        grade={userProfile.grade}
                        level={userProfile.level}
                      />
                      <Text style={styles.arrowText}>→</Text>
                      <GradeBadge
                        grade={results.newGrade}
                        level={results.newLevel}
                      />
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          )}
        </View>

        <View style={[
          styles.statsContainer,
          isPathTooShort && { height: AVAILABLE_HEIGHT * 0.4 }
        ]}>
          <View style={styles.statsContent}>
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
          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.completeButton}
              onPress={() => {
                console.log('저장하고 완료 버튼 클릭됨');
                handleCompletePress();
              }}
            >
              <Text style={styles.completeIcon}>🏁</Text>
              <Text style={styles.completeButtonText}>저장하고 완료</Text>
            </Pressable>
          </View>
        </View>

        {showTrackNameModal && (
          <Modal transparent visible={showTrackNameModal} animationType="fade">
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              <View
                style={{
                  backgroundColor: 'white',
                  padding: 28,
                  borderRadius: 16,
                  width: '85%',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}
                >
                  트랙 이름 입력
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#666',
                    marginBottom: 16,
                    textAlign: 'center',
                  }}
                >
                  저장할 트랙의 이름을 입력해 주세요.
                </Text>
                <TextInput
                  value={tempTrackName}
                  onChangeText={setTempTrackName}
                  placeholder="예: 한강공원 5km"
                  style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 18,
                    width: '100%',
                    fontSize: 16,
                  }}
                  maxLength={30}
                  autoFocus
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    width: '100%',
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setShowTrackNameModal(false);
                      setTempTrackName('');
                      router.replace('/');
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                      borderRadius: 8,
                      backgroundColor: '#DDDDDD',
                      marginRight: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: '#555',
                        fontWeight: 'bold',
                        fontSize: 15,
                      }}
                    >
                      기록만 저장
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setNewTrackName(tempTrackName);
                      setShowTrackNameModal(false);
                      setTempTrackName('');
                      handleSaveNewTrackAndRecord(tempTrackName);
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                      borderRadius: 8,
                      backgroundColor: tempTrackName.trim()
                        ? '#5EFFAE'
                        : '#5effaf43',

                    }}
                    disabled={!tempTrackName.trim()}
                  >
                    <Text
                      style={{
                        color: 'black',
                        fontWeight: 'bold',
                        fontSize: 15,
                      }}
                    >
                      저장
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    height: AVAILABLE_HEIGHT * 0.6,
    width: '100%',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pointsOverlay: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  points: {
    fontSize: 40,
    fontWeight: '700',
    color: 'black',
    textAlign: 'center',
  },
  resultBox: {
    width: '90%',
    marginVertical: 8,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  levelUpText: { 
    fontSize: 60, 
    fontWeight: '900', 
    color: '#000000' 
  },
  levelChangeText: { 
    fontSize: 25, 
    color: 'black', 
    marginTop: 5 
  },
  gradeUpText: { 
    fontSize: 50, 
    fontWeight: '800', 
    color: '#00000-' 
  },
  gradeChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  arrowText: { 
    fontSize: 20, 
    marginHorizontal: 15 
  },
  statsContainer: {
    height: AVAILABLE_HEIGHT * 0.4,
    width: '100%',
    backgroundColor: '#fff',
    paddingTop: 20,
    justifyContent: 'flex-start',
  },
  statsContent: {
    paddingHorizontal: 20,
  },
  distance: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  completeButton: {
    backgroundColor: '#5EFFAE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 15,
    width: '100%',
  },
  completeIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  completeButtonText: {
    color: '#black',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningBanner: {
    width: '100%',
    height: 37, // paddingVertical: 10 + borderBottomWidth: 1 + text height
    backgroundColor: '#ffe0e0',
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 10,
  },
  warningText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
});
