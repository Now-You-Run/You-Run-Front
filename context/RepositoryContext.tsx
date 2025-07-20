import { TrackRecordRepository } from '@/repositories/TrackRecordRepository';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// 1. 컨텍스트가 제공할 모든 값의 타입을 정의합니다. (이전과 동일)
interface RepositoryContextType {
  trackRecordRepository: TrackRecordRepository | null;
}

// 컨텍스트 생성 (초기값 설정)
const RepositoryContext = createContext<RepositoryContextType>({
  trackRecordRepository: null,
});

export function useRepositories(): RepositoryContextType {
  return useContext(RepositoryContext);
}

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const [trackRecordRepository, setTrackRecordRepository] = useState<TrackRecordRepository | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setupRepository = async () => {
      try {
        const trackRecordRepo = new TrackRecordRepository();
        setTrackRecordRepository(trackRecordRepo);
      } catch (e) {
        console.error("Fatal: Failed to initialize repository", e);
      } finally {
        setIsLoading(false);
      }
    };
    setupRepository();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>앱을 준비하고 있습니다...</Text>
      </View>
    );
  }

  return (
    <RepositoryContext.Provider value={{ trackRecordRepository }}>
      {children}
    </RepositoryContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 20, fontSize: 16, color: '#666' },
});
