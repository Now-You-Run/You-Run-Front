import BackButton from '@/components/button/BackButton';
import GradeBadge from '@/components/GradeBadge';
import { useRepositories } from '@/context/RepositoryContext';
import { saveTrackInfo, TrackInfo } from '@/repositories/appStorage';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import type { MyTrackRecordDto } from '@/types/response/RunningTrackResponse';
import { ServerRankingRecord } from '@/types/ServerRecordDto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
export type SourceType = 'my' | 'server';

// 화면 표시에 사용할 통일된 데이터 구조 정의
interface DisplayableTrackDetail {
  id: string;
  name: string;
  path: { latitude: number; longitude: number }[];
  distance: number;
  rate?: number;
  ranking?: (ServerRankingRecord | MyTrackRecordDto)[];
}

function toKSTLocaleString(utcString: string) {
  const date = new Date(utcString);
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toLocaleString('ko-KR', { hour12: false });
}

export default function TrackDetailScreen() {
  const router = useRouter();
  const { trackId, source } = useLocalSearchParams<{
    trackId: string;
    source: SourceType;
  }>();
  const [myServerRecord, setMyServerRecord] = useState<ServerRankingRecord | null>(null);

  // [2. 수정] localRunningRecordRepository도 가져옵니다.
  const { trackRecordRepository } = useRepositories();

  const [track, setTrack] = useState<DisplayableTrackDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatDuration = (duration: number) => {
    return `${Math.floor(duration / 60)}분 ${duration % 60}초`;
  };

  const mapRef = useRef<MapView>(null);

  const { width } = Dimensions.get('window');
  const mapHeight = width * 0.6;

  useEffect(() => {
    if (!track || !mapRef.current) return;

    const coordinates = track.path;
    if (coordinates.length === 0) return;

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }, 300);
  }, [track]);

  useEffect(() => {
    if (!trackId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        let fetchedData: DisplayableTrackDetail | null = null;

        // ✅ [핵심 수정] 'source' 값에 따라 분기 처리
        if (trackRecordRepository) {
          if (source === 'my') {
            // 'my'일 경우: 나의 트랙 기록을 가져오는 새로운 API 호출
            const myData = await trackRecordRepository.fetchMyTrackRecord(
              trackId
            );
            if (myData) {
              fetchedData = {
                id: trackId,
                name: myData.trackInfoDto.name,
                path: myData.trackInfoDto.path,
                distance: myData.trackInfoDto.totalDistance,
                rate: myData.trackInfoDto.rate,
                // 'my' 기록 DTO를 랭킹으로 설정합니다. (DTO 프로퍼티 이름은 실제 응답에 맞게 조정)
                ranking: myData.trackRecordDto,
              };
            }
          } else {
            // 서버 랭킹 + 내 레코드 추출
          const serverData = await trackRecordRepository.fetchTrackRecord(trackId);
          if (serverData) {
            const ranking = serverData.trackRecordDto as ServerRankingRecord[];
            // 로그인된 유저 ID 가져오기
            const userId = Number(await AuthAsyncStorage.getUserId());
            // 전체 랭킹 중 내 레코드를 찾고
            const me = ranking.find(r => r.userId === userId) ?? null;
            setMyServerRecord(me);

            fetchedData = {
              id: trackId,
              name: serverData.trackInfoDto.name,
              path: serverData.trackInfoDto.path,
              distance: serverData.trackInfoDto.totalDistance,
              rate: serverData.trackInfoDto.rate,
              ranking,
            };
          }
        }
      }
        setTrack(fetchedData);
      } catch (err) {
        console.error('Failed to load track detail:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [trackId, source, trackRecordRepository]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!track) {
    return (
      <View style={styles.centerContainer}>
        <Text>트랙 정보를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ① 맨 위에 BackButton */}
      <BackButton onPress={() => router.back()} />
      {/* ② 여기부터 본문 */}
      <View style={styles.inner}>
        <MapView
          ref={mapRef}
          style={{ width, height: mapHeight }}
          initialRegion={{
            latitude: track.path[0]?.latitude ?? 37.5665, // fallback: 서울 시청
            longitude: track.path[0]?.longitude ?? 126.978, // fallback: 서울 시청
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
          }}
        >
          <Polyline
            coordinates={track.path}
            strokeWidth={4}
            strokeColor="#4a90e2"
          />
        </MapView>

        <View style={styles.content}>
          <Text style={styles.title}>{track.name}</Text>
          <Text>총 거리: {(track.distance / 1000).toFixed(2)} km</Text>
          {/* {track.rate != null && <Text>평점: {track.rate}</Text>} */}
        </View>
         {/* ── 내 기록 (서버 랭킹에서 뽑아온 내 레코드) ── */}
        {source === 'server' && myServerRecord && (
          <View style={styles.content}>
            <Text style={styles.subtitle}>내 기록</Text>
            <View style={styles.rankItem}>
              {/* 등수 · 이름 · 등급 */}
              <View style={styles.rankUserInfo}>
                <Text style={styles.rankUsername}>
                  { /* 내 위치(1-based) */ }
                  {(track.ranking as ServerRankingRecord[]).findIndex(
                    r => r.userId === myServerRecord.userId
                  ) + 1}
                  . {myServerRecord.username}
                </Text>
                <GradeBadge grade={myServerRecord.grade} level={myServerRecord.level} />
              </View>
              {/* 시간 */}
              <Text style={styles.rankDuration}>
                {formatDuration(myServerRecord.duration)}
              </Text>
              {/* 도전하기 */}
              <TouchableOpacity
                style={styles.challengeButton}
                onPress={() =>
                  router.push({
                    pathname: './MatchRunningScreen',
                    params: {
                      recordId: myServerRecord.recordId,
                      trackId: track.id,
                      trackInfo: JSON.stringify({
                        id: track.id,
                        path: track.path,
                        origin: track.path[0],
                        distance: track.distance,
                      }),
                    },
                  })
                }
              >
                <Text style={styles.challengeText}>도전하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            {source === 'server' ? '전체 랭킹' : '나의 기록'}
          </Text>

          {track.ranking && track.ranking.length > 0 ? (
            <>
              {/* [핵심 수정] 서버 랭킹 UI */}
              {source === 'server' &&
                (track.ranking as ServerRankingRecord[]).map((record, idx) => (
                  <View key={idx} style={styles.rankItem}>
                    <View style={styles.rankUserInfo}>
                      <Text style={styles.rankUsername}>
                        {idx + 1}. {record.username}
                      </Text>
                      <GradeBadge grade={record.grade} level={record.level} />
                    </View>
                    <Text style={styles.rankDuration}>
                      {formatDuration(record.duration)}
                    </Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#007aff',
                        borderRadius: 8,
                        paddingVertical: 6,
                        paddingHorizontal: 14,
                        marginLeft: 10,
                      }}
                      onPress={() => {
                        // 트랙 정보, 상대 기록을 모두 넘김
                        router.push({
                          pathname: './MatchRunningScreen', // "대결"용 새로운 화면(파일)
                          params: {
                            recordId: record.recordId,
                            trackId: track.id,
                            trackInfo: JSON.stringify({
                              id: track.id,
                              path: track.path,
                              origin: track.path[0],
                              distance: track.distance,
                            }),
                          },
                        });
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>
                        도전하기
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

              {/* 로컬 기록 UI (기존과 동일) */}
              {source === 'my' &&
                (track.ranking as MyTrackRecordDto[]).map((record, idx) => (
                  <View key={record.recordId || idx} style={styles.rankItem}>
                    {/* ✅ 3. '나의 기록'에서는 유저 이름 대신 날짜를 보여주도록 수정 (예시) */}
                    <Text style={styles.rankUsername}>
                      {toKSTLocaleString(record.finishedAt)}
                    </Text>
                    <Text style={styles.rankDuration}>
                      {formatDuration(record.resultTime)}
                    </Text>
                  </View>
                ))}
            </>
          ) : (
            <Text>기록이 없습니다.</Text>
          )}
        </View>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.botButton}
            onPress={async () => {
              const firstCoordinate = track.path?.[0];
              const isPathValid =
                firstCoordinate &&
                typeof firstCoordinate.latitude === 'number' &&
                typeof firstCoordinate.longitude === 'number';

              if (!isPathValid) {
                console.error(
                  '경로 정보가 비어있거나 유효하지 않아 대결을 시작할 수 없습니다.'
                );
                alert('유효한 경로 데이터가 없어 대결을 시작할 수 없습니다.');
                return; // 함수 실행을 여기서 중단
              }
              const info: TrackInfo = {
                id: track.id,
                path: track.path,
                origin: track.path[0],
                distanceMeters: track.distance,
              };
              await saveTrackInfo(info);
              router.push({
                pathname: './BotPace',
                params: { trackId: track.id, source: source },
              });
            }}
          >
            <Text style={styles.botButtonText}>코칭 봇과 함께 달리기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { width: '100%', height: 300 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  footer: { padding: 16, marginTop: 'auto' },
  botButton: {
    backgroundColor: '#FF9CF8',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  botButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  rankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // Added a bit more vertical padding
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rankUserInfo: {
    flex: 1,
    flexDirection: 'row', // [1. 수정] 세로(column) 정렬을 가로(row) 정렬로 변경
    alignItems: 'center', // [2. 수정] 닉네임과 뱃지를 세로축 중앙에 정렬
    marginRight: 16,
  },
  rankUsername: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8, // [3. 수정] 아래쪽 여백(marginBottom)을 오른쪽 여백(marginRight)으로 변경
  },
  rankDuration: {
    fontSize: 16,
    fontWeight: '500',
    // No changes are needed here. It will now stay aligned to the right.
  },
  challengeButton: {
    backgroundColor: '#007aff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  challengeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
