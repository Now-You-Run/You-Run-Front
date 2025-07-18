import BackButton from '@/components/button/BackButton';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import { formatTime } from '@/utils/RunningUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import MapView, { LatLng, Marker, Polyline } from 'react-native-maps';

interface RecordDetail {
  id: number;
  mode: 'BOT' | 'MATCH' | 'FREE';
  trackId: number;
  trackName?: string;
  trackPath: LatLng[];
  userPath: Array<{ latitude: number; longitude: number; timestamp: number }>;
  distance: number;      // meters
  duration: number;      // seconds
  avgPace: number;       // sec/km
  calories: number;
  startedAt: string;
  finishedAt: string;
}

export default function RecordDetailScreen() {
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 시뮬레이션 state 추가
  const [simStep, setSimStep] = useState(0);
  const [running, setRunning] = useState(false);

  const [markerPos, setMarkerPos] = useState<LatLng | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const id = Number(recordId);
        // 2) 서버 기록이라면 /api/record?userId=… 호출 후 필터
        const userId = await AuthAsyncStorage.getUserId();
        const res = await fetch(`https://yourun.shop/api/record?userId=${userId}`);
        const { data } = await res.json() as any;
        const hit = data
          .map((item: any) => ({
            ...item.record,
            trackName: item.trackInfoDto ? item.trackInfoDto.name : null,
            trackPath: item.trackInfoDto ? item.trackInfoDto.path : [],
            userPath: item.userPath,
          }))
          .find((r: any) => r.id === id);

        if (!hit) throw new Error('해당 기록을 찾을 수 없습니다.');

        setDetail({
          id: hit.id,
          mode: hit.mode,
          trackId: hit.trackId,
          trackName: hit.trackName,
          trackPath: hit.trackPath,
          userPath: hit.userPath,
          distance: hit.distance,
          duration: hit.resultTime,
          avgPace: hit.averagePace,
          calories: Math.round(hit.distance/1000 * 60),
          startedAt: hit.startedAt,
          finishedAt: hit.finishedAt,
        });
      } catch (e: any) {
        Alert.alert('불러오기 실패', e.message);
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [recordId]);

  useEffect(()=>{
    if(!detail) return;
    setMarkerPos(detail.userPath[0]);
    setSimStep(0);
  },[detail]);

  // 시뮬레이션 useEffect
  useEffect(() => {
    if (!detail || !running) return;
    const userPath = detail.userPath;
    if (simStep >= userPath.length - 1) {
      setRunning(false);
      return;
    }
    const cur = userPath[simStep];
    const next = userPath[simStep + 1];
    const duration = Math.max(200, next.timestamp - cur.timestamp);
    const steps = 20;
    let frame = 0;

    function animateStep() {
      frame++;
      const t = frame / steps;
      if (t >= 1) {
        setMarkerPos(next);
        setSimStep(s => s + 1);
        return;
      }
      setMarkerPos(interpolatePosition(cur, next, t));
      setTimeout(animateStep, duration / steps);
    }

    animateStep();
    // eslint-disable-next-line
  }, [simStep, running, detail]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!detail) return null;

  const { width } = Dimensions.get('window');
  const mapHeight = width * 0.6;
  const {
    mode, trackName,
    trackPath, userPath,
    distance, duration, avgPace, calories
  } = detail;

  // 경로 보이게 하는 state
  const polyPath = running && markerPos
    ? [...userPath.slice(0, simStep + 1), markerPos]
    : userPath;


  // 버튼 조건
  const isAtStart = simStep === 0;
  const isAtEnd = simStep >= userPath.length - 1;
  const isMid = simStep > 0 && simStep < userPath.length - 1;

  return (
    <>
    <BackButton onPress={() => router.back()} />
    <ScrollView style={styles.container}>
      <Text style={styles.header}>기록 상세</Text>
      <MapView
        style={{ width, height: mapHeight }}
        initialRegion={{
          latitude: trackPath[0]?.latitude ?? userPath[0].latitude,
          longitude: trackPath[0]?.longitude ?? userPath[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Polyline coordinates={trackPath} strokeColor="#999" strokeWidth={4} />
        <Polyline coordinates={polyPath} strokeColor="#007aff" strokeWidth={4} />
        {markerPos && (
          <Marker coordinate={markerPos} />
        )}
      </MapView>

      {/* 시뮬레이션 컨트롤 UI */}
      <View style={styles.buttonRow}>
        {/* 진행중일 때: 정지 */}
        {running && (
          <Pressable
            onPress={() => setRunning(false)}
            style={styles.btnStop}
          >
            <Text style={styles.btnText}>정지</Text>
          </Pressable>
        )}

        {/* 아직 아무것도 안함(최초) */}
        {!running && isAtStart && (
          <Pressable
            onPress={() => {
              setSimStep(1);
              setRunning(true);
            }}
            style={styles.btnMain}
          >
            <Text style={styles.btnTextBold}>시뮬레이션 시작</Text>
          </Pressable>
        )}

        {/* 정지+중간: 이어재생/초기화 */}
        {!running && isMid && (
          <>
            <Pressable
              onPress={() => setRunning(true)}
              style={styles.btnMain}
            >
              <Text style={styles.btnTextBold}>이어 재생</Text>
            </Pressable>
            <Pressable
              onPress={() => { setSimStep(0); setMarkerPos(userPath[0]); setRunning(false); }}
              style={styles.btnReset}
            >
              <Text style={styles.btnTextReset}>초기화</Text>
            </Pressable>
          </>
        )}

        {/* 정지+끝: 초기화만 */}
        {!running && isAtEnd && (
          <Pressable
            onPress={() => { setSimStep(0); setMarkerPos(userPath[0]); setRunning(false); }}
            style={styles.btnReset}
          >
            <Text style={styles.btnTextReset}>초기화</Text>
          </Pressable>
        )}
      </View>

      {/* 기록 상세 카드 */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>
          {trackName ? `🏁 ${trackName}` : `🏃 러닝 기록`}
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>모드</Text>
          <Text style={styles.value}>{mode}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>거리</Text>
          <Text style={styles.value}>{(distance / 1000).toFixed(2)} km</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>시간</Text>
          <Text style={styles.value}>{formatTime(duration)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>평균 페이스</Text>
          <Text style={styles.value}>
            {(() => {
                const min = Math.floor(avgPace);                 // 분
                const sec = Math.round((avgPace - min) * 60);     // 초
                return (
                  <Text style={styles.value}>
                    {min}′{String(sec).padStart(2, '0')}″/km
                  </Text>
                );
              })()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>칼로리</Text>
          <Text style={styles.value}>{calories} kcal</Text>
        </View>
      </View>
    </ScrollView>
    </>
  );
}
// 보간 함수 추가!
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function interpolatePosition(start: LatLng, end: LatLng, t: number): LatLng {
  return {
    latitude: lerp(start.latitude, end.latitude, t),
    longitude: lerp(start.longitude, end.longitude, t),
  };
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', margin: 18, textAlign: 'center', color: '#222' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', margin: 16 },
  btnMain: {
    padding: 10,
    backgroundColor: '#007aff',
    borderRadius: 8,
    marginHorizontal: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  btnStop: {
    padding: 10,
    backgroundColor: '#ff4f4f',
    borderRadius: 8,
    marginHorizontal: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  btnReset: {
    padding: 10,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    marginHorizontal: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  btnText: { color: 'white', fontWeight: '500', fontSize: 15 },
  btnTextBold: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnTextReset: { color: '#007aff', fontWeight: 'bold', fontSize: 16 },
  infoCard: {
    margin: 18,
    borderRadius: 16,
    backgroundColor: '#f9f9fb',
    shadowColor: '#333',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 2,
    padding: 22,
  },
  infoTitle: { fontSize: 19, fontWeight: 'bold', marginBottom: 10, color: '#222' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  label: { color: '#888', fontSize: 15 },
  value: { color: '#222', fontWeight: 'bold', fontSize: 15 },
});
