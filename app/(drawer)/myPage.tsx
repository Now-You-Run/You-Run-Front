// app/(drawer)/MyPage.tsx

import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage'
import type { TrackRecordData as BaseRecord } from '@/types/response/RecordResponse'
import { isAfter, parseISO, subDays } from 'date-fns'
import React, { useEffect, useState } from 'react'
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native'

const API_BASE = 'https://yourun.shop'

// 기존 타입에 서버 응답 필드를 더해주는 로컬 타입 선언
type TrackRecordData = BaseRecord & {
  startedAt:   string
  finishedAt:  string
  resultTime:  number
  distance:    number
  averagePace: number
}

type Stat = { label: string; value: string }
type RecentRun = {
  recordId:  string
  date:      string
  distanceKm:number
  timeSec:   number
}

export default function MyPageScreen() {
  const [records, setRecords] = useState<TrackRecordData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const userId = await AuthAsyncStorage.getUserId()
      if (!userId) throw new Error('로그인 정보가 없습니다.')

      const res = await fetch(`${API_BASE}/api/record?userId=${userId}`)
      if (!res.ok) throw new Error(`status ${res.status}`)

      // swagger 대로 data 가 배열로 온다고 가정
      const json = (await res.json()) as { data: TrackRecordData[] }
      // BOT, MATCH 모드만 골라서 state 에 세팅
      setRecords(json.data.filter(r => r.mode === 'BOT' || r.mode === 'MATCH'))
    } catch (e: any) {
      console.warn(e)
      Alert.alert('불러오기 실패', e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecords() }, [])

  // ─── 이번 주 통계 ──────────────────────────────────────────
  const weekRecs = records.filter(r =>
    isAfter(parseISO(r.finishedAt), subDays(new Date(), 7)),
  )
  const weeklyDistance = weekRecs.reduce((sum, r) => sum + r.distance/1000, 0)
  const runCount       = weekRecs.length
  const avgPaceSec     = runCount>0
    ? weekRecs.reduce((sum,r)=>sum + r.averagePace, 0)/runCount
    : 0

  const stats: Stat[] = [
    {
      label: '평균 페이스',
      value: runCount>0
        ? `${Math.floor(avgPaceSec/60)}'${String(Math.round(avgPaceSec%60)).padStart(2,'0')}"`
        : '-',
    },
    { label: '달린 거리', value: `${weeklyDistance.toFixed(1)}km` },
    { label: '횟수',     value: `${runCount}회` },
  ]

  // ─── 최근 달리기 리스트 ────────────────────────────────────
  const recent: RecentRun[] = weekRecs.map(r => ({
    recordId:  String(r.id),
    date:      new Date(r.finishedAt).toLocaleDateString(),
    distanceKm:r.distance / 1000,
    timeSec:   r.resultTime,
  }))

  const windowWidth   = Dimensions.get('window').width
  const statItemWidth = (windowWidth - 32 - 16) / 3

  const renderRecent = ({ item }: { item: RecentRun }) => {
    const m = Math.floor(item.timeSec/60)
    const s = String(Math.round(item.timeSec%60)).padStart(2,'0')
    return (
      <View style={styles.matchRow}>
        <Text style={styles.matchText}>
          {item.date} · {item.distanceKm.toFixed(1)}km
        </Text>
        <Text style={styles.matchResult}>{m}분{s}초</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.flex}>
      <View style={{ alignItems:'flex-end', padding:16 }}>
        <Pressable
          onPress={fetchRecords}
          style={{ backgroundColor:'#eee', paddingVertical:6, paddingHorizontal:12, borderRadius:6 }}
        >
          <Text style={{ color:'#444' }}>{loading?'로딩 중…':'다시 불러오기'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={recent}
        keyExtractor={item=>item.recordId}
        contentContainerStyle={styles.container}
        ListHeaderComponent={() => (
          <>
            <View style={styles.header}>
              <Text style={styles.userName}>나롱이님</Text>
              <Text style={styles.userMeta}>Lv.4 · EXP 120 · P 500</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>이번 주</Text>
              <View style={styles.statRow}>
                {stats.map(s=>(
                  <View key={s.label} style={[styles.statItem,{width:statItemWidth}]}>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={[styles.sectionTitle,{marginBottom:8}]}>
              최근 트랙 모드 기록
            </Text>
          </>
        )}
        ListEmptyComponent={()=>(
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>최근 기록이 없습니다.</Text>
          </View>
        )}
        renderItem={renderRecent}
        ItemSeparatorComponent={()=> <View style={styles.separator}/>}
      />
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  flex: { flex:1, backgroundColor:'#fff' },
  container: { padding:16 },
  header: { marginBottom:24, alignItems:'center' },
  userName: { fontSize:24, fontWeight:'bold' },
  userMeta: { marginTop:4, fontSize:14, color:'#555' },
  section: { marginBottom:24 },
  sectionTitle: { fontSize:18, fontWeight:'600', marginBottom:12 },
  statRow: { flexDirection:'row', justifyContent:'space-between' },
  statItem: { alignItems:'center' },
  statValue: { fontSize:20, fontWeight:'bold' },
  statLabel: { marginTop:4, fontSize:12, color:'#666' },
  matchRow: {
    flexDirection:'row', justifyContent:'space-between', paddingVertical:12
  },
  matchText: { fontSize:16 },
  matchResult: { fontSize:16, fontWeight:'600' },
  separator: { height:1, backgroundColor:'#eee' },
  emptyContainer: { paddingVertical:40, alignItems:'center' },
  emptyText: { fontSize:16, color:'#888' },
})
