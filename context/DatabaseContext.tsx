// /context/DatabaseContext.tsx

import { LocalTrackRepository } from '@/storage/LocalTrackRepository';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// 컨텍스트가 제공할 값의 타입을 정의합니다.
interface DatabaseContextType {
  repository: LocalTrackRepository | null;
}

// 컨텍스트 생성
const DatabaseContext = createContext<DatabaseContextType>({ repository: null });

// 다른 컴포넌트에서 쉽게 컨텍스트를 사용하기 위한 커스텀 훅
export function useDatabase(): DatabaseContextType {
  return useContext(DatabaseContext);
}

// 앱을 감싸줄 Provider 컴포넌트
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [repository, setRepository] = useState<LocalTrackRepository | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        const repo = LocalTrackRepository.getInstance();
        // 1단계에서 만든 비동기 초기화 함수를 호출합니다.
        await repo.initialize();
        // 성공적으로 초기화되면 상태에 저장합니다.
        setRepository(repo);
      } catch (e) {
        console.error("Fatal: Failed to initialize database", e);
        // 여기에 데이터베이스 초기화 실패 시 사용자에게 보여줄 에러 처리 로직 추가 가능
      } finally {
        // 성공하든 실패하든 로딩 상태를 종료합니다.
        setIsLoading(false);
      }
    };
    setupDatabase();
  }, []);

  // 로딩 중일 때는 앱 전체를 덮는 로딩 화면을 보여줍니다.
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>앱을 준비하고 있습니다...</Text>
      </View>
    );
  }

  // 로딩이 끝나면, 컨텍스트에 repository를 담아 앱의 나머지 부분을 렌더링합니다.
  return (
    <DatabaseContext.Provider value={{ repository }}>
      {children}
    </DatabaseContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 20, fontSize: 16, color: '#666' },
});
