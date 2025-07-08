import { useDatabase } from '@/context/DatabaseContext';
import { LocalTrackRepository } from '@/storage/LocalTrackRepository';
import { TrackRecordRepository } from '@/storage/TrackRecordRepository';
import { Coordinate, LocalTrack } from '@/types/LocalTrackDto';
import { Track } from '@/types/response/RunningTrackResponse';
import { getDistance } from '@/utils/PathTools';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

const PAGE_SIZE = 10;
export type DistanceSortType = 'proximity' | 'trackDistance';

// 이 훅이 화면 컴포넌트에게 제공할 값들의 타입을 정의합니다.
// 이렇게 하면 훅의 반환값이 명확해집니다.
interface UseTrackListReturn {
  isInitialLoading: boolean;
  tab: 'server' | 'local';
  distanceSortOption: DistanceSortType;
  sortedTracks: Track[];
  serverLoading: boolean;
  serverRefreshing: boolean;
  setTab: React.Dispatch<React.SetStateAction<'server' | 'local'>>;
  setDistanceSortOption: React.Dispatch<React.SetStateAction<DistanceSortType>>;
  handleRefresh: () => void;
  handleEndReached: () => void;
}

export function useTrackList(): UseTrackListReturn {
  // --- 상태 관리 ---
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<'server' | 'local'>('local');
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [serverTracks, setServerTracks] = useState<Track[]>([]);
  const [serverPage, setServerPage] = useState<number>(0);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverRefreshing, setServerRefreshing] = useState<boolean>(false);
  const [myLocation, setMyLocation] = useState<Coordinate | undefined>();
  const [distanceSortOption, setDistanceSortOption] = useState<DistanceSortType>('proximity');

  const { repository } = useDatabase();

  // --- 데이터 로딩 로직 ---
  useEffect(() => {
    const initialLoad = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setMyLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } else {
          Alert.alert("위치 권한 필요", "서버 트랙을 보려면 위치 권한이 필요합니다.");
        }
      } catch (error) {
        console.error("Failed to get location:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    initialLoad();
  }, []);

  useEffect(() => {
    if (tab === 'server' && myLocation && serverTracks.length === 0 && !serverLoading) {
      fetchServerTracks(0, true, myLocation);
    }
  }, [tab, myLocation]);

  useFocusEffect(
    useCallback(() => {
      const loadLocalData = async () => {
        // [수정됨] repository가 null이 아닐 때만(즉, 준비되었을 때만) 실행합니다.
        if (repository) {
          await fetchLocalTracks(repository);
        }
      };
      loadLocalData();
    }, [repository]) // repository가 준비되면 이 effect가 다시 실행됩니다.
  );
  
  // --- 데이터 패칭 함수 ---
  const fetchServerTracks = async (page: number, refreshing: boolean, location: Coordinate): Promise<void> => {
    if (serverLoading || (!refreshing && page >= serverTotalPages)) return;
    setServerLoading(true);

    try {
      const { tracks, totalPages } = await TrackRecordRepository.fetchPaginatedTrackListOrderByClose(
        location.longitude, location.latitude, page, PAGE_SIZE
      );
      setServerTracks(prev => (refreshing ? tracks : [...prev, ...tracks]));
      setServerTotalPages(totalPages);
      setServerPage(page + 1);
    } catch (error) {
      console.error("Failed to fetch server tracks:", error);
    } finally {
      setServerLoading(false);
      setServerRefreshing(false);
    }
  };

  const fetchLocalTracks = async (repository: LocalTrackRepository): Promise<void> => {
    const dbTracks = await repository.readAll();
    if (dbTracks) {
      const mappedTracks: Track[] = dbTracks.map((track: LocalTrack): Track => ({
        id: track.id.toString(),
        name: track.name,
        path: JSON.parse(track.path || '[]'),
        distance: track.totalDistance,
        date: track.createdAt,
      }));
      setLocalTracks(mappedTracks);
    }
  };

  // --- 이벤트 핸들러 ---
  const handleRefresh = (): void => {
    if (myLocation) {
      setServerRefreshing(true);
      fetchServerTracks(0, true, myLocation);
    }
  };

  const handleEndReached = (): void => {
    if (!serverLoading && serverPage < serverTotalPages && myLocation) {
      fetchServerTracks(serverPage, false, myLocation);
    }
  };

  // --- 정렬된 데이터 계산 (useMemo로 최적화) ---
  const sortedTracks = useMemo((): Track[] => {
    const tracks = tab === 'server' ? serverTracks : localTracks;
    if (distanceSortOption === 'proximity' && myLocation) {
      return [...tracks].sort((a, b) => {
        const aDist = getDistance(myLocation.latitude, myLocation.longitude, a.path[0]?.latitude, a.path[0]?.longitude);
        const bDist = getDistance(myLocation.latitude, myLocation.longitude, b.path[0]?.latitude, b.path[0]?.longitude);
        return aDist - bDist;
      });
    }
    if (distanceSortOption === 'trackDistance') {
      return [...tracks].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    return tracks;
  }, [tab, serverTracks, localTracks, distanceSortOption, myLocation]);

  // --- 컴포넌트에 제공할 값들 반환 ---
  return {
    isInitialLoading,
    tab,
    distanceSortOption,
    sortedTracks,
    serverLoading,
    serverRefreshing,
    setTab,
    setDistanceSortOption,
    handleRefresh,
    handleEndReached,
  };
}
