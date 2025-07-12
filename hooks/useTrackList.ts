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

// [수정] 반환 타입의 tab과 setTab 타입 변경
interface UseTrackListReturn {
  isLoading: boolean;
  isRefreshing: boolean;
  tracks: Track[];
  tab: 'my' | 'server';
  distanceSortOption: DistanceSortType;
  setTab: (tab: 'my' | 'server') => void;
  setDistanceSortOption: (option: DistanceSortType) => void;
  handleRefresh: () => void;
  handleEndReached: () => void;
}

export function useTrackList(): UseTrackListReturn {
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

  // [추가] '내 트랙'을 서버에서 가져오는 함수
  const fetchMyTracks = useCallback(async (isRefresh: boolean) => {
    // trackRecordRepository가 준비되지 않았거나, 위치 정보가 없거나, 이미 페이지네이션 중이면 실행하지 않음
    if (!trackRecordRepository || !myLocation || (isPaginating && !isRefresh)) return;

    const currentPage = isRefresh ? 0 : page;
    if (currentPage > 0 && !isRefresh) setIsPaginating(true);

    const userId = await AuthAsyncStorage.getUserId();
    const { tracks: newMyTracks, totalPages } = await trackRecordRepository.fetchPaginatedUserTrackListOrderByClose(
      myLocation.longitude, myLocation.latitude,userId ?? 0, currentPage, PAGE_SIZE
    );
    
    if (currentPage >= totalPages - 1) setCanLoadMore(false);
    
    setPage(currentPage + 1);
    setTracks(prev => (isRefresh ? newMyTracks : [...prev, ...newMyTracks]));
    
    setIsLoading(false);
    setIsPaginating(false);
  }, [page, isPaginating, myLocation, trackRecordRepository]);


  // [이름 변경] 명확성을 위해 fetchServerTracks -> fetchAllServerTracks로 변경
  const fetchAllServerTracks = useCallback(async (isRefresh: boolean) => {
    if (!trackRecordRepository || !myLocation || (isPaginating && !isRefresh)) return;

    const currentPage = isRefresh ? 0 : page;
    if (currentPage > 0 && !isRefresh) setIsPaginating(true);

    const { tracks: newServerTracks, totalPages } = await trackRecordRepository.fetchPaginatedTrackListOrderByClose(
      myLocation.longitude, myLocation.latitude, currentPage, PAGE_SIZE
    );
    
    if (currentPage >= totalPages - 1) setCanLoadMore(false);
    
    setPage(currentPage + 1);
    setTracks(prev => (isRefresh ? newServerTracks : [...prev, ...newServerTracks]));
    
    setIsLoading(false);
    setIsPaginating(false);
  }, [page, isPaginating, myLocation, trackRecordRepository]);
  
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

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // [수정] 탭에 따라 올바른 함수 호출
    if (tab === 'my') {
      fetchMyTracks(true).finally(() => setIsRefreshing(false));
    } else {
      fetchAllServerTracks(true).finally(() => setIsRefreshing(false));
    }
  }, [tab, fetchMyTracks, fetchAllServerTracks]);

  // --- [핵심 수정] 탭, 정렬 옵션 등이 변경될 때 실행되는 메인 로직 ---
  useEffect(() => {
    // [수정] localTrackRepository 의존성 제거
    if (!trackRecordRepository) return;
    if (distanceSortOption === 'proximity' && !myLocation) {
      setIsLoading(true);
      setTracks([]);
      return;
    }

    setIsLoading(true);
    setTracks([]);
    setPage(0);
    setCanLoadMore(true);

    // [수정] 탭에 따라 올바른 함수를 호출
    if (tab === 'my') {
      fetchMyTracks(true);
    } else if (tab === 'server') {
      fetchAllServerTracks(true);
    }
  }, [tab, distanceSortOption, myLocation, trackRecordRepository]); // fetch 함수들을 의존성 배열에서 제거하여 무한 루프 방지

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );
  
  const handleEndReached = useCallback(() => {
    if (canLoadMore && !isPaginating) {
      // [수정] 탭에 따라 올바른 함수 호출
      if (tab === 'my') {
        fetchMyTracks(false);
      } else {
        fetchAllServerTracks(false);
      }
    }
  }, [canLoadMore, isPaginating, tab, fetchMyTracks, fetchAllServerTracks]);

  return {
    isLoading,
    isRefreshing,
    tracks,
    tab,
    distanceSortOption,
    setTab,
    setDistanceSortOption,
    handleRefresh,
    handleEndReached,
  };
}
