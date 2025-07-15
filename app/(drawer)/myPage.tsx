// app/(drawer)/MyPage.tsx

import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage'
import { fetchUserProfile } from '@/repositories/UserRepository'
import { useUserStore } from '@/stores/userStore'
import { isAfter, parseISO, subDays } from 'date-fns'
import { SplashScreen, useFocusEffect, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_SERVER_API_URL

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

  const [records, setRecords] = useState<ScreenRecord[]>([]);
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
      if (!res.ok) throw new Error(`status ${res.status}`)

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

      if (mode === 'track') {
        serverRecs = serverRecs.filter(
          (r) => r.mode === 'BOT' || r.mode === 'MATCH'
        );
      } else {
        serverRecs = serverRecs.filter((r) => r.mode === 'FREE');
      }

      setRecords(
        serverRecs.sort(
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
    isAfter(parseISO(r.finishedAt), subDays(new Date(), 7))
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
          ? `${Math.floor(avgPaceSec / 60)}'${String(
              Math.round(avgPaceSec % 60)
            ).padStart(2, '0')}"`
          : '-',
    },
    { label: '달린 거리', value: `${weeklyDistance.toFixed(2)}km` },
    { label: '횟수', value: `${runCount}회` },
  ];

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
              <View>
                {/* 👇 실제 유저 정보로 표시 */}
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
                      총 거리: {(user.totalDistance/1000).toFixed(3)}km
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* ─── 이번 주 통계 ─────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>이번 주</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
});
