// app/(drawer)/MyPage.tsx

import BackButton from '@/components/button/BackButton';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import { fetchUserProfile } from '@/repositories/UserRepository';
import { useUserStore } from '@/stores/userStore';
import { isAfter, parseISO, subDays } from 'date-fns';
import { SplashScreen, useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
const API_BASE = process.env.EXPO_PUBLIC_SERVER_API_URL;

// 마이페이지에서 프로필 올리는데만 사용되는 하드코디입니다.
const MY_USER_ID = 1;

/*

친구마다 특정 아바타 프로필로 설정해주기
- 원래는 DB에 각 유저마다 프로필 url을 넣는 테이블이 있지만, 현재 폴리싱 단계이기 때문에,
- 시간도 부족하지만 현재 기능에서 더 이상 버그를 발생 시키고 싶지 않아, 
- 하드코딩 방식을 선택하게 되었습니다.

*/
const PROFILE_IMAGE_MAP: { [key: string]: any } = {
  '1': require('../../assets/profile/1번_유저.png'),
  '2': require('../../assets/profile/2번_유저.png'),
  '3': require('../../assets/profile/3번_유저.png'),
  '4': require('../../assets/profile/4번_유저.png'),
};

const DEFAULT_AVATAR = require('../../assets/profile/유저_기본_프로필.jpeg');

// 화면 전용으로 사용하는 레코드 타입
interface ScreenRecord {
  id: number;
  userId: number;
  mode: 'BOT' | 'MATCH' | 'FREE';
  trackId: number;
  trackName?: string;
  opponentId: number | null;
  isWinner: boolean;
  startedAt: string;
  finishedAt: string;
  resultTime: number;
  distance: number;
  averagePace: number;
}

type Stat = { label: string; value: string };
type RecentRun = {
  recordId: string;
  date: string;
  trackName?: string;
  distanceKm: number;
  timeSec: number;
};

export default function MyPageScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const setProfile = useUserStore((state) => state.setProfile);
  useEffect(() => {
    async function loadDataAndSetup() {
      try {
        const userProfile = await fetchUserProfile();
        if (userProfile) {
          setProfile(userProfile);
        }
      } catch (e) {
        console.warn('Failed to load user data:', e);
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    }

    loadDataAndSetup();
  }, []);

  // user store에서 프로필 불러오기
  const user = useUserStore((state) => state.profile);

  // 'track' vs 'free' 모드
  type Mode = 'track' | 'free';
  const [mode, setMode] = useState<Mode>('track');

  const [rawRecords, setRawRecords] = useState<ScreenRecord[]>([]); // ← 전체 기록
  const [records, setRecords] = useState<ScreenRecord[]>([]); // ← 화면에 보이는 기록
  const [loading, setLoading] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const rawUserId = await AuthAsyncStorage.getUserId();
      if (!rawUserId) throw new Error('로그인 정보가 없습니다.');
      const userIdNum = rawUserId;

      const res = await fetch(`${API_BASE}/api/record?userId=${userIdNum}`, {
        headers: { 'Cache-Control': 'no-cache' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`status ${res.status}`);

      // ① 서버 응답 파싱
      const json = (await res.json()) as {
        data: Array<{
          trackInfoDto: { name: string };
          record: ScreenRecord;
        }>;
      };

      // ② record 객체만 꺼내서 BOT/MATCH 필터링
      let serverRecs = json.data.map((item) => ({
        ...item.record,
        trackName: item.trackInfoDto?.name,
      }));

      setRawRecords(serverRecs); // ← 전체 기록으로 보관

      // ② 화면에 보일 records 만 모드별로 필터
      const filtered =
        mode === 'track'
          ? serverRecs.filter((r) => r.mode === 'BOT' || r.mode === 'MATCH')
          : serverRecs.filter((r) => r.mode === 'FREE');

      setRecords(
        filtered.sort(
          (a, b) =>
            new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
        )
      );
    } catch (e: any) {
      console.warn(e);
      Alert.alert('불러오기 실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchRecords();
    }, [mode])
  );

  // ─── 이번 주 통계 ──────────────────────────────────────────
  const weekRecs = records.filter((r) =>
    isAfter(parseISO(r.finishedAt), subDays(new Date(), 30))
  );
  const weeklyDistance = weekRecs.reduce(
    (sum, r) => sum + r.distance / 1000,
    0
  );
  const runCount = weekRecs.length;
  const avgPaceSec =
    runCount > 0
      ? weekRecs.reduce((sum, r) => sum + r.averagePace, 0) / runCount
      : 0;

  const stats: Stat[] = [
    {
      label: '평균 페이스',
      value:
        runCount > 0
          ? (() => {
              const min = Math.floor(avgPaceSec);
              const sec = Math.round((avgPaceSec - min) * 60);
              return `${min}'${String(sec).padStart(2, '0')}"`;
            })()
          : '-',
    },
    { label: '달린 거리', value: `${weeklyDistance.toFixed(2)}km` },
    { label: '횟수', value: `${runCount}회` },
  ];

  // ─── 모드별 평균 페이스 계산 (rawRecords 기준) ────────────────────
  const trackRecsAll = rawRecords.filter(
    (r) => r.mode === 'BOT' || r.mode === 'MATCH'
  );
  const freeRecsAll = rawRecords.filter((r) => r.mode === 'FREE');

  const trackAvgPace = trackRecsAll.length
    ? trackRecsAll.reduce((sum, r) => sum + r.averagePace, 0) /
      trackRecsAll.length
    : 0;

  const freeAvgPace = freeRecsAll.length
    ? freeRecsAll.reduce((sum, r) => sum + r.averagePace, 0) /
      freeRecsAll.length
    : 0;

  // 두 모드 평균의 평균
  const userAvgPace = (trackAvgPace + freeAvgPace) / 2;

  // ─── 서버에 PATCH 요청하여 유저 평균 페이스 업데이트 ─────────────────────
  useEffect(() => {
    if (trackRecsAll.length + freeRecsAll.length === 0) return;

    (async () => {
      const userId = await AuthAsyncStorage.getUserId();
      if (!userId) return;
      const rounded = Math.round(userAvgPace * 100) / 100;
      await fetch(`${API_BASE}/api/user/average-pace?userId=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ averagePace: rounded }),
      });
      const updated = await fetchUserProfile();
      setProfile(updated);
    })();
  }, [trackAvgPace, freeAvgPace]);

  // ─── 최근 달리기 리스트 ────────────────────────────────────
  const recent: RecentRun[] = weekRecs.map((r) => ({
    recordId: String(r.id),
    date: new Date(r.finishedAt).toLocaleDateString(),
    trackName: r.trackName,
    distanceKm: r.distance / 1000,
    timeSec: r.resultTime,
  }));

  const windowWidth = Dimensions.get('window').width;
  const statItemWidth = (windowWidth - 32 - 16) / 3;

  const renderRecent = ({ item }: { item: RecentRun }) => {
    const m = Math.floor(item.timeSec / 60);
    const s = String(Math.round(item.timeSec % 60)).padStart(2, '0');
    return (
      <Pressable
        style={styles.matchRow}
        onPress={() => router.push(`/record/${item.recordId}`)}
      >
        <Text style={styles.matchText}>
          {item.date}
          {item.trackName ? ` · ${item.trackName}` : ''}
          {` · ${item.distanceKm.toFixed(2)}km`}
        </Text>
        <Text style={styles.matchResult}>
          {m}분{s}초
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.flex}>
      <BackButton onPress={() => router.back()} />
      {/* ─── 새로고침 버튼 ─────────────────────── */}
      <View style={{ alignItems: 'flex-end', padding: 16 }}>
        <Pressable onPress={fetchRecords} style={styles.refreshButton}>
          <Text style={styles.refreshText}>
            {loading ? '로딩 중…' : '다시 불러오기'}
          </Text>
        </Pressable>
      </View>

      {/* ─── 리스트 ─────────────────────────────── */}
      <FlatList
        data={recent}
        keyExtractor={(item) => `${item.recordId}-${item.date}-${item.timeSec}`}
        contentContainerStyle={styles.container}
        ListHeaderComponent={() => (
          <>
            {/* ─── 프로필 ─────────────── */}
            <View style={styles.headerRow}>
              {/* 프로필 이미지 */}
              <Image
                source={PROFILE_IMAGE_MAP[String(MY_USER_ID)] ?? DEFAULT_AVATAR}
                style={styles.profileImage}
              />

              {/* 유저 정보 */}
              <View style={{ marginLeft: 16 }}>
                {!user ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" />
                    <Text style={{ marginLeft: 10, color: '#aaa' }}>
                      유저 정보를 불러오는 중…
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.userName}>{user.username}님</Text>
                    <Text style={styles.userMeta}>
                      Lv.{user.level} · {user.grade} · {user.point}P
                    </Text>
                    <Text style={styles.userMeta}>
                      총 거리: {(user.totalDistance / 1000).toFixed(3)}km
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* ─── 이번 주 통계 ─────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>이번 달</Text>
              <View style={styles.statRow}>
                {stats.map((s) => (
                  <View
                    key={s.label}
                    style={[styles.statItem, { width: statItemWidth }]}
                  >
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ─── 리스트 제목 + 작은 탭 ──────────────────────────── */}
            <View style={styles.titleWithTabs}>
              <Text style={styles.sectionTitle}>
                {mode === 'track'
                  ? '최근 트랙 모드 기록'
                  : '최근 자유 모드 기록'}
              </Text>
              <View style={styles.smallTabRow}>
                <Pressable
                  style={[
                    styles.smallTabButton,
                    mode === 'track' && styles.smallTabButtonActive,
                  ]}
                  onPress={() => setMode('track')}
                >
                  <Text
                    style={[
                      styles.smallTabText,
                      mode === 'track' && styles.smallTabTextActive,
                    ]}
                  >
                    트랙
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.smallTabButton,
                    mode === 'free' && styles.smallTabButtonActive,
                  ]}
                  onPress={() => setMode('free')}
                >
                  <Text
                    style={[
                      styles.smallTabText,
                      mode === 'free' && styles.smallTabTextActive,
                    ]}
                  >
                    자유
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>최근 기록이 없습니다.</Text>
          </View>
        )}
        renderItem={renderRecent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },

  // 헤더 안 탭
  headerRow: {
    flexDirection: 'row',
    //justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  tabRow: {
    flexDirection: 'row',
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#eee',
    marginLeft: 8,
  },
  tabButtonActive: {
    backgroundColor: '#007aff',
  },
  tabText: {
    fontSize: 14,
    color: '#444',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  refreshButton: {
    backgroundColor: '#eee',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  refreshText: { color: '#444' },

  /* 기존 스타일 */
  container: { padding: 16 },
  userName: { fontSize: 24, fontWeight: 'bold' },
  userMeta: { marginTop: 4, fontSize: 14, color: '#555' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { marginTop: 4, fontSize: 12, color: '#666' },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  matchText: { fontSize: 16 },
  matchResult: { fontSize: 16, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#eee' },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
  titleWithTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16, // sectionTitle 과 동일한 패딩
  },
  smallTabRow: {
    flexDirection: 'row',
  },
  smallTabButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#eee',
    marginLeft: 6,
  },
  smallTabButtonActive: {
    backgroundColor: '#007aff',
  },
  smallTabText: {
    fontSize: 12,
    color: '#444',
  },
  smallTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ccc', // 로딩 중 배경
  },
});
