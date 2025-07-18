// /hooks/useTrackList.ts

import { useRepositories } from '@/context/RepositoryContext';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import { Coordinate } from '@/types/TrackDto';
import { Track } from '@/types/response/RunningTrackResponse';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 20;

export const DISTANCE_SORT_OPTIONS = [
  { label: '가까운 순', value: 'proximity' },
  { label: '트랙 거리 순', value: 'trackDistance' },
] as const;

export type DistanceSortType = (typeof DISTANCE_SORT_OPTIONS)[number]['value'];
export type SortOrder = 'asc' | 'desc';

// [수정] 반환 타입의 tab과 setTab 타입 변경
interface UseTrackListReturn {
  isLoading: boolean;
  isRefreshing: boolean;
  tracks: Track[];
  tab: 'my' | 'server';
  distanceSortOption: DistanceSortType;
  setTab: (tab: 'my' | 'server') => void;
  setDistanceSortOption: (option: DistanceSortType) => void;
  setSortOrder: (order: SortOrder) => void;
  sortOrder: SortOrder;
  handleRefresh: () => void;
  handleEndReached: () => void;
}

export function useTrackList(): UseTrackListReturn & {
  deleteTracks: (ids: number[]) => Promise<void>;
  deleteTrack: (id: number) => Promise<void>;
} {
  // [수정] localTrackRepository는 더 이상 사용하지 않으므로 제거
  const { trackRecordRepository } = useRepositories();

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [page, setPage] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(true);

  // [수정] tab의 타입과 초기값을 'my'로 변경
  const [tab, setTab] = useState<'my' | 'server'>('my');
  const [distanceSortOption, setDistanceSortOption] = useState<DistanceSortType>('proximity');
  const [myLocation, setMyLocation] = useState<Coordinate | undefined>();
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortTracks = (tracks: Track[], sortOrder: SortOrder) => {
    return [...tracks].sort((a, b) => {
      const aDist = a.distance ?? 0;
      const bDist = b.distance ?? 0;
      return sortOrder === 'asc' ? aDist - bDist : bDist - aDist;
    });
  };

  const MIN_LOADING_MS = 300;

  const finishLoading = (start: number) => {
    const elapsed = Date.now() - start;
    if (elapsed < MIN_LOADING_MS) {
      setTimeout(() => {
        setIsLoading(false);
        setIsPaginating(false);
      }, MIN_LOADING_MS - elapsed);
    } else {
      setIsLoading(false);
      setIsPaginating(false);
    }
  };

  // [추가] '내 트랙'을 서버에서 가져오는 함수
  const fetchMyTracksOrderByClose = useCallback(async (isRefresh: boolean) => {
    if (!trackRecordRepository || !myLocation || (isPaginating && !isRefresh)) return;
    const currentPage = isRefresh ? 0 : page;
    if (currentPage > 0 && !isRefresh) setIsPaginating(true);
    const userId = await AuthAsyncStorage.getUserId();
    const currentTab = tab;
    const currentSortOption = distanceSortOption;
    const start = Date.now();
    const { tracks: newMyTracks, totalPages } = await trackRecordRepository.fetchPaginatedUserTrackListOrderByClose(
      myLocation.longitude, myLocation.latitude, userId ?? 0, currentPage, PAGE_SIZE
    );
    if (tab !== currentTab || distanceSortOption !== currentSortOption) return;
    console.log('setTracks newTracks (my close):', newMyTracks.map(t => t.distance));
    const sortedTracks = distanceSortOption === 'trackDistance' ? sortTracks(newMyTracks, sortOrder) : newMyTracks;
    if (currentPage >= totalPages - 1) setCanLoadMore(false);
    setPage(currentPage + 1);
    setTracks(prev => (isRefresh ? sortedTracks : [...prev, ...sortedTracks]));
    finishLoading(start);
  }, [page, isPaginating, myLocation, trackRecordRepository, tab, distanceSortOption, sortOrder]);


  const fetchAllServerTracksOrderByClose = useCallback(async (isRefresh: boolean) => {
    if (!trackRecordRepository || !myLocation || (isPaginating && !isRefresh)) return;
    const currentPage = isRefresh ? 0 : page;
    if (currentPage > 0 && !isRefresh) setIsPaginating(true);
    const currentTab = tab;
    const currentSortOption = distanceSortOption;
    const start = Date.now();
    const { tracks: newServerTracks, totalPages } = await trackRecordRepository.fetchPaginatedTrackListOrderByClose(
      myLocation.longitude, myLocation.latitude, currentPage, PAGE_SIZE
    );
    if (tab !== currentTab || distanceSortOption !== currentSortOption) return;
    console.log('setTracks newTracks (server close):', newServerTracks.map(t => t.distance));
    const sortedTracks = distanceSortOption === 'trackDistance' ? sortTracks(newServerTracks, sortOrder) : newServerTracks;
    if (currentPage >= totalPages - 1) setCanLoadMore(false);
    setPage(currentPage + 1);
    setTracks(prev => (isRefresh ? sortedTracks : [...prev, ...sortedTracks]));
    finishLoading(start);
  }, [page, isPaginating, myLocation, trackRecordRepository, tab, distanceSortOption, sortOrder]);
  
  useEffect(() => {
    const loadLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setMyLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (e) {
        console.error("Failed to get location:", e);
      }
    };
    loadLocation();
  }, []);

  const fetchMyTracksOrderByDistance = useCallback(async (isRefresh: boolean) => {
    if (!trackRecordRepository || !myLocation || (isPaginating && !isRefresh)) return;
    const currentPage = isRefresh ? 0 : page;
    if (currentPage > 0 && !isRefresh) setIsPaginating(true);
    const userId = await AuthAsyncStorage.getUserId();
    const currentSortOrder = sortOrder;
    const currentTab = tab;
    const currentSortOption = distanceSortOption;
    const start = Date.now();
    const { tracks: newMyTracks, totalPages } = await trackRecordRepository.fetchPaginatedMyTrackListOrderByDistance(
      userId ?? 0, currentPage, PAGE_SIZE, currentSortOrder
    );
    if (
      sortOrder !== currentSortOrder ||
      tab !== currentTab ||
      distanceSortOption !== currentSortOption
    ) return;
    console.log('setTracks newTracks (my distance):', newMyTracks.map(t => t.distance));
    const sortedTracks = distanceSortOption === 'trackDistance' ? sortTracks(newMyTracks, sortOrder) : newMyTracks;
    if (currentPage >= totalPages - 1) setCanLoadMore(false);
    setPage(currentPage + 1);
    setTracks(prev => (isRefresh ? sortedTracks : [...prev, ...sortedTracks]));
    finishLoading(start);
  }, [page, isPaginating, myLocation, trackRecordRepository, sortOrder, tab, distanceSortOption]);

  const fetchAllServerTracksOrderByDistance = useCallback(async (isRefresh: boolean) => {
    if (!trackRecordRepository || !myLocation || (isPaginating && !isRefresh)) return;
    const currentPage = isRefresh ? 0 : page;
    if (currentPage > 0 && !isRefresh) setIsPaginating(true);
    const currentSortOrder = sortOrder;
    const currentTab = tab;
    const currentSortOption = distanceSortOption;
    const start = Date.now();
    const { tracks: newServerTracks, totalPages } = await trackRecordRepository.fetchPaginatedTrackListOrderByDistance(
      currentPage, PAGE_SIZE, currentSortOrder
    );
    if (
      sortOrder !== currentSortOrder ||
      tab !== currentTab ||
      distanceSortOption !== currentSortOption
    ) return;
    console.log('setTracks newTracks (server distance):', newServerTracks.map(t => t.distance));
    const sortedTracks = distanceSortOption === 'trackDistance' ? sortTracks(newServerTracks, sortOrder) : newServerTracks;
    if (currentPage >= totalPages - 1) setCanLoadMore(false);
    setPage(currentPage + 1);
    setTracks(prev => (isRefresh ? sortedTracks : [...prev, ...sortedTracks]));
    finishLoading(start);
  }, [page, isPaginating, myLocation, trackRecordRepository, sortOrder, tab, distanceSortOption]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // [수정] 탭에 따라 올바른 함수 호출
    if (tab === 'my') {
      fetchMyTracksOrderByClose(true).finally(() => setIsRefreshing(false));
    } else {
      fetchAllServerTracksOrderByClose(true).finally(() => setIsRefreshing(false));
    }
  }, [tab, fetchMyTracksOrderByClose, fetchAllServerTracksOrderByClose]);

  // --- [핵심 수정] 탭, 정렬 옵션 등이 변경될 때 실행되는 메인 로직 ---
  useEffect(() => {
    let isMounted = true;
    // 모든 상태를 완전히 초기화
    setIsPaginating(false);
    setIsLoading(true);
    setTracks([]);
    setPage(0);
    setCanLoadMore(true);

    const fetchData = async () => {
      if (!trackRecordRepository) {
        setIsLoading(false);
        return;
      }
      if (distanceSortOption === 'proximity' && !myLocation) {
        setIsLoading(false);
        return;
      }
      if (distanceSortOption === 'trackDistance') {
        if (tab === 'my') {
          await fetchMyTracksOrderByDistance(true);
        } else {
          await fetchAllServerTracksOrderByDistance(true);
        }
      } else {
        if (tab === 'my') {
          await fetchMyTracksOrderByClose(true);
        } else if (tab === 'server') {
          await fetchAllServerTracksOrderByClose(true);
        }
      }
      // setIsLoading(false)는 fetch 함수 내부에서만 호출
    };
    fetchData();
    return () => { isMounted = false; };
  }, [tab, distanceSortOption, sortOrder, myLocation, trackRecordRepository]); 

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );
  
  const handleEndReached = useCallback(() => {
    if (canLoadMore && !isPaginating) {
      // [수정] 탭에 따라 올바른 함수 호출
      if (tab === 'my') {
        fetchMyTracksOrderByClose(false);
      } else {
        fetchAllServerTracksOrderByClose(false);
      }
    }
  }, [canLoadMore, isPaginating, tab, fetchMyTracksOrderByClose, fetchAllServerTracksOrderByClose]);

  // 여러 트랙 삭제
  const deleteTracks = async (ids: number[]) => {
    if (!trackRecordRepository) return;
    for (const id of ids) {
      try {
        await trackRecordRepository.deleteMyTrack(id);
      } catch (e) {
        // 실패 안내(필요시)
      }
    }
    setTracks(prev => prev.filter(track => !ids.includes(Number(track.id))));
    setPage(0);
    setCanLoadMore(true);
    handleRefresh();
  };

  // 단일 트랙 삭제
  const deleteTrack = async (id: number) => {
    await deleteTracks([id]);
  };

  return {
    isLoading,
    isRefreshing,
    tracks,
    tab,
    distanceSortOption,
    setTab,
    setDistanceSortOption,
    setSortOrder, // 추가
    sortOrder,    // 추가
    handleRefresh,
    handleEndReached,
    deleteTracks,
    deleteTrack,
  };
}
