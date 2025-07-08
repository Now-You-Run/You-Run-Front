// /hooks/useTrackList.ts

import { useRepositories } from '@/context/RepositoryContext';
import { Coordinate } from '@/types/LocalTrackDto';
import { Track } from '@/types/response/RunningTrackResponse';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 20;

interface UseTrackListReturn {
  isLoading: boolean;
  isRefreshing: boolean;
  tracks: Track[];
  tab: 'server' | 'local';
  distanceSortOption: 'proximity' | 'trackDistance';
  setTab: (tab: 'server' | 'local') => void;
  setDistanceSortOption: (option: 'proximity' | 'trackDistance') => void;
  handleRefresh: () => void;
  handleEndReached: () => void;
}

export function useTrackList(): UseTrackListReturn {
  const { localTrackRepository, trackRecordRepository } = useRepositories();

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [page, setPage] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(true);

  const [tab, setTab] = useState<'server' | 'local'>('local');
  const [distanceSortOption, setDistanceSortOption] = useState<'proximity' | 'trackDistance'>('proximity');
  const [myLocation, setMyLocation] = useState<Coordinate | undefined>();

  const fetchServerTracks = useCallback(async (isRefresh: boolean) => {
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

  const fetchLocalTracks = useCallback(async (isRefresh: boolean) => {
    if (!localTrackRepository || (isPaginating && !isRefresh)) return;

    const currentPage = isRefresh ? 0 : page;
    if (currentPage > 0 && !isRefresh) setIsPaginating(true);
    
    const newSummaries = await localTrackRepository.readPaginatedSummaries({
      sortOption: distanceSortOption, myLocation, page: currentPage, pageSize: PAGE_SIZE,
    });
    
    const newUiTracks: Track[] = newSummaries.map(t => ({
      id: t.id.toString(), name: t.name, path: [], distance: t.totalDistance, date: t.createdAt,
    }));

    if (newUiTracks.length < PAGE_SIZE) setCanLoadMore(false);
    
    setPage(currentPage + 1);
    setTracks(prev => (isRefresh ? newUiTracks : [...prev, ...newUiTracks]));

    setIsLoading(false);
    setIsPaginating(false);
  }, [page, isPaginating, distanceSortOption, myLocation, localTrackRepository]);
  
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
    if (tab === 'local') {
      fetchLocalTracks(true).finally(() => setIsRefreshing(false));
    } else {
      fetchServerTracks(true).finally(() => setIsRefreshing(false));
    }
  }, [tab, fetchLocalTracks, fetchServerTracks]);

  // --- [핵심 수정] 탭, 정렬 옵션 등이 변경될 때 실행되는 메인 로직 ---
  useEffect(() => {
    if (!localTrackRepository || !trackRecordRepository) return;
    if (distanceSortOption === 'proximity' && !myLocation) {
      setIsLoading(true);
      setTracks([]);
      return;
    }

    // 1. 상태가 변경되면, 로딩을 시작하고 목록을 비웁니다.
    setIsLoading(true);
    setTracks([]);
    setPage(0);
    setCanLoadMore(true);

    // 2. 탭에 따라 올바른 함수를 호출하여 데이터를 가져옵니다.
    if (tab === 'local') {
      fetchLocalTracks(true);
    } else if (tab === 'server') {
      fetchServerTracks(true);
    }
  }, [tab, distanceSortOption, myLocation, localTrackRepository, trackRecordRepository]);

  // 다른 화면에서 돌아왔을 때 새로고침
  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );
  
  const handleEndReached = useCallback(() => {
    if (canLoadMore && !isPaginating) {
      if (tab === 'local') {
        fetchLocalTracks(false);
      } else {
        fetchServerTracks(false);
      }
    }
  }, [canLoadMore, isPaginating, tab, fetchLocalTracks, fetchServerTracks]);

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
