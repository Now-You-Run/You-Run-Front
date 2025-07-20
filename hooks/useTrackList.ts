// /hooks/useTrackList.ts

import { useRepositories } from '@/context/RepositoryContext';
import { useRunning } from '@/context/RunningContext';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import { Track } from '@/types/response/RunningTrackResponse';
import { Coordinate } from '@/types/TrackDto';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const { trackRecordRepository } = useRepositories();
  const { userLocation } = useRunning();

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [page, setPage] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(true);

  // [수정] tab의 타입과 초기값을 'my'로 변경
  const [tab, setTab] = useState<'my' | 'server'>('my');
  const [distanceSortOption, setDistanceSortOption] = useState<DistanceSortType>('proximity');
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
  // fetch 함수들: pageToFetch 인자를 받도록 변경
  const fetchMyTracksOrderByClose = useCallback(async (pageToFetch: number, isRefresh: boolean) => {
    if (!trackRecordRepository || !userLocation || (isPaginating && !isRefresh)) return;
    if (pageToFetch > 0 && !isRefresh) setIsPaginating(true);
    const userId = await AuthAsyncStorage.getUserId();
    const currentTab = tab;
    const currentSortOption = distanceSortOption;
    const start = Date.now();
    const { tracks: newMyTracks, totalPages } = await trackRecordRepository.fetchPaginatedUserTrackListOrderByClose(
      userLocation.longitude, userLocation.latitude, userId ?? 0, pageToFetch, PAGE_SIZE
    );
    console.log('내 트랙 응답 pageToFetch:', pageToFetch, 'tracks:', newMyTracks.map(t => t.id));
    if (tab !== currentTab || distanceSortOption !== currentSortOption) return;
    const sortedTracks = distanceSortOption === 'trackDistance' ? sortTracks(newMyTracks, sortOrder) : newMyTracks;
    if (pageToFetch >= totalPages - 1) setCanLoadMore(false);
    setTracks(prev => {
      const all = isRefresh ? sortedTracks : [...prev, ...sortedTracks];
      return Array.from(new Map(all.map(t => [t.id, t])).values());
    });
    finishLoading(start);
  }, [isPaginating, userLocation, trackRecordRepository, tab, distanceSortOption, sortOrder]);

  const fetchAllServerTracksOrderByClose = useCallback(async (pageToFetch: number, isRefresh: boolean) => {
    if (!trackRecordRepository || !userLocation || (isPaginating && !isRefresh)) return;
    if (pageToFetch > 0 && !isRefresh) setIsPaginating(true);
    const currentTab = tab;
    const currentSortOption = distanceSortOption;
    const start = Date.now();
    const { tracks: newServerTracks, totalPages } = await trackRecordRepository.fetchPaginatedTrackListOrderByClose(
      userLocation.longitude, userLocation.latitude, pageToFetch, PAGE_SIZE
    );
    console.log('서버 응답 pageToFetch:', pageToFetch, 'tracks:', newServerTracks.map(t => t.id));
    if (tab !== currentTab || distanceSortOption !== currentSortOption) return;
    const sortedTracks = distanceSortOption === 'trackDistance' ? sortTracks(newServerTracks, sortOrder) : newServerTracks;
    if (pageToFetch >= totalPages - 1) setCanLoadMore(false);
    setTracks(prev => {
      const all = isRefresh ? sortedTracks : [...prev, ...sortedTracks];
      return Array.from(new Map(all.map(t => [t.id, t])).values());
    });
    finishLoading(start);
  }, [isPaginating, userLocation, trackRecordRepository, tab, distanceSortOption, sortOrder]);
  
  // handleRefresh에서 page=0으로 fetch
  const handleRefresh = useCallback(() => {
    console.log('handleRefresh 실행', { tab });
    setIsRefreshing(true);
    // setPage(0); // 제거
    if (tab === 'my') {
      fetchMyTracksOrderByClose(0, true).finally(() => setIsRefreshing(false));
    } else {
      fetchAllServerTracksOrderByClose(0, true).finally(() => setIsRefreshing(false));
    }
  }, [tab, fetchMyTracksOrderByClose, fetchAllServerTracksOrderByClose]);

  // --- [핵심 수정] 탭, 정렬 옵션 등이 변경될 때 실행되는 메인 로직 ---
  useEffect(() => {
    console.log('초기화 useEffect 실행', { tab, distanceSortOption, sortOrder });
    setIsPaginating(false);
    setIsLoading(true);
    setTracks([]);
    setPage(0);
    setCanLoadMore(true);
    // 진짜 초기화 상황에서만 실행
    const fetchData = async () => {
      if (!trackRecordRepository) {
        setIsLoading(false);
        return;
      }
      if (distanceSortOption === 'proximity' && !userLocation) {
        // 위치가 없을 때는 로딩 상태를 유지하고 위치를 기다림
        console.log('위치 정보 대기 중...');
        return;
      }
      if (distanceSortOption === 'trackDistance') {
        if (tab === 'my') {
          await fetchMyTracksOrderByClose(0, true);
        } else {
          await fetchAllServerTracksOrderByClose(0, true);
        }
      } else {
        if (tab === 'my') {
          await fetchMyTracksOrderByClose(0, true);
        } else if (tab === 'server') {
          await fetchAllServerTracksOrderByClose(0, true);
        }
      }
    };
    fetchData();
  }, [tab, distanceSortOption, sortOrder, trackRecordRepository, userLocation]);

  // myLocation이 최초 할당될 때만 초기화 및 fetchData 실행
  const prevLocationRef = useRef<Coordinate | undefined>(undefined);
  useEffect(() => {
    if (!prevLocationRef.current && userLocation) {
      prevLocationRef.current = userLocation;
      console.log('myLocation 최초 할당 useEffect 실행', { userLocation });
      setIsPaginating(false);
      setIsLoading(true);
      setTracks([]);
      setPage(0);
      setCanLoadMore(true);
      // 진짜 최초 위치 할당에서만 실행
      if (!trackRecordRepository) {
        setIsLoading(false);
        return;
      }
      if (distanceSortOption === 'proximity' && !userLocation) {
        // 위치가 없을 때는 로딩 상태를 유지하고 위치를 기다림
        console.log('위치 정보 대기 중...');
        return;
      }
      if (distanceSortOption === 'trackDistance') {
        if (tab === 'my') {
          (async () => { await fetchMyTracksOrderByClose(0, true); })();
        } else {
          (async () => { await fetchAllServerTracksOrderByClose(0, true); })();
        }
      } else {
        if (tab === 'my') {
          (async () => { await fetchMyTracksOrderByClose(0, true); })();
        } else if (tab === 'server') {
          (async () => { await fetchAllServerTracksOrderByClose(0, true); })();
        }
      }
    }
  }, [userLocation]);

  // handleRefresh는 setPage(0) 호출 없이 fetch 함수에 pageToFetch=0만 넘김(이미 적용됨)

  // handleEndReached는 page 상태가 1, 2, 3...으로만 증가하도록 유지
  const handleEndReached = useCallback(() => {
    console.log('handleEndReached 호출', { canLoadMore, isPaginating, page, distanceSortOption });
    if (canLoadMore && !isPaginating) {
      const nextPage = page + 1;
      if (distanceSortOption === 'trackDistance') {
        if (tab === 'my') {
          fetchMyTracksOrderByClose(nextPage, false);
        } else {
          fetchAllServerTracksOrderByClose(nextPage, false);
        }
      } else {
        if (tab === 'my') {
          fetchMyTracksOrderByClose(nextPage, false);
        } else {
          fetchAllServerTracksOrderByClose(nextPage, false);
        }
      }
      setPage(nextPage);
    }
  }, [canLoadMore, isPaginating, tab, distanceSortOption, fetchMyTracksOrderByClose, fetchAllServerTracksOrderByClose, page]);

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

