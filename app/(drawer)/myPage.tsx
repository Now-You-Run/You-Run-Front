// app/(drawer)/MyPage.tsx

import { loadPaths, RunningTrack } from '@/storage/RunningStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAfter, parseISO, subDays } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type Stat = { label: string; value: string };
type RecentRun = { 
  id: string; 
  date: string; 
  distanceKm: number; 
  paceSec: number; 
};

export default function MyPageScreen() {
  const [runs, setRuns] = useState<RunningTrack[]>([]);

    // 0) 저장소에서 불러오는 함수로 묶어두기
    const refreshRuns = () => {
        loadPaths().then(setRuns);
    };

    // 1) 저장된 트랙 불러오기
    useEffect(() => {
        loadPaths().then(setRuns);
    }, []);
    useEffect(() => {
        refreshRuns();
    }, []);

    // 📌 기록 초기화 함수
    const clearHistory = async () => {
        await AsyncStorage.removeItem('@running_paths');  // 기존 기록 삭제
        refreshRuns();                                   // 다시 불러와 빈 배열 적용
    };


    // 2) 이번 주 기록만 골라서 통계 계산
    const weekRuns = runs.filter(r => isAfter(parseISO(r.date), subDays(new Date(),7)));

    const weeklyDistance = weekRuns.reduce((sum, r) =>
        sum + ((r.distance ?? 0) / 1000), 0
    );

    const runCount = weekRuns.length;

    // 페이스(sec/km) = duration(sec) / (distance(m)/1000)
    const avgPaceSec = runCount > 0 && weeklyDistance > 0 ? 
                        weekRuns.reduce((sum, r) => sum + ((r.duration ?? 0) / ((r.distance ?? 0) / 1000)),0) / runCount: 0;

    const stats: Stat[] = [
        { label: '평균 페이스', value:  runCount > 0
            ? `${Math.floor(avgPaceSec / 60)}'${String( Math.round(avgPaceSec % 60)).padStart(2, '0')}"` 
            : '-',
        },
        { label: '달린 거리',   value: `${weeklyDistance.toFixed(1)}km` },
        { label: '횟수',       value: `${runCount}회` },
    ];

    // 전체를 최근 리스트로 (
    const recent : RecentRun[]= weekRuns.map(r => ({
    id: r.id,
    date: new Date(r.date).toLocaleDateString(),
    distanceKm: (r.distance ?? 0) / 1000,
    paceSec: (r.distance ?? 0) > 0 ? (r.duration ?? 0) / ((r.distance ?? 0) / 1000): 0,
    }));

    // layout 계산
    const windowWidth = Dimensions.get('window').width;
    const statItemWidth = (windowWidth - 32 - 16) / 3;

    const renderRecent = ({ item }: { item: RecentRun }) => {
        const m = Math.floor(item.paceSec / 60);
        const s = String(Math.round(item.paceSec % 60)).padStart(2,'0');
        return (
        <View style={styles.matchRow}>
            <Text style={styles.matchText}>
            {item.date} · {item.distanceKm.toFixed(1)}km
            </Text>
            <Text style={styles.matchResult}>{m}'{s}"</Text>
        </View>
        );
    };

  return (
    <SafeAreaView style={styles.flex}>
        {/* ———— 여기에 초기화 버튼 넣기 ———— */}
        <View style={{ alignItems: 'flex-end', padding: 16 }}>
        <Pressable onPress={clearHistory} style={{
            backgroundColor: '#eee', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6
            }}>
            <Text style={{ color: '#444' }}>기록 초기화</Text>
        </Pressable>
      </View>
      <FlatList
        data={recent}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={() => (
          <>
            <View style={styles.header}>
              <Text style={styles.userName}>나롱이님</Text>
              {/* TODO: 실제 유저 레벨/EXP/P는 API 연동 후 바인딩 */}
              <Text style={styles.userMeta}>Lv.4 · EXP 120 · P 500</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>이번 주</Text>
              <View style={styles.statRow}>
                {stats.map(s => (
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
            <Text style={[styles.sectionTitle, { marginBottom:8 }]}>
              최근 달리기 기록
            </Text>
          </>
        )}
        // 6) 기록이 없으면 메시지
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>최근 달리기 기록이 없습니다.</Text>
          </View>
        )}

        renderItem={renderRecent}
        ItemSeparatorComponent={() => <View style={styles.separator}/>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    flex:{ flex:1, backgroundColor:'#fff' },
    container:{ padding:16 },
    header:{ marginBottom:24, alignItems:'center' },
    userName:{ fontSize:24, fontWeight:'bold' },
    userMeta:{ marginTop:4, fontSize:14, color:'#555' },
    section:{ marginBottom:24 },
    sectionTitle:{ fontSize:18, fontWeight:'600', marginBottom:12 },
    statRow:{ flexDirection:'row', justifyContent:'space-between' },
    statItem:{ alignItems:'center' },
    statValue:{ fontSize:20, fontWeight:'bold' },
    statLabel:{ marginTop:4, fontSize:12, color:'#666' },
    matchRow:{ flexDirection:'row', justifyContent:'space-between', paddingVertical:12 },
    matchText:{ fontSize:16 },
    matchResult:{ fontSize:16, fontWeight:'600' },
    separator:{ height:1, backgroundColor:'#eee' },
    emptyContainer: { paddingVertical: 40, alignItems: 'center',},
  emptyText: { fontSize: 16, color: '#888',},
});
