import { LocalRunningRecordRepository } from '@/repositories/LocalRunningRecordRepository';
import { LocalTrackRepository } from '@/repositories/LocalTrackRepository';
import { TrackRecordRepository } from '@/repositories/TrackRecordRepository';
import { CreateRunningRecordDto } from '@/types/LocalRunningRecordDto';
import { CreateTrackDto } from '@/types/LocalTrackDto';
import * as SQLite from 'expo-sqlite';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const DATABASE_NAME = 'running.db';

// 1. 컨텍스트가 제공할 모든 값의 타입을 정의합니다. (이전과 동일)
interface RepositoryContextType {
  localTrackRepository: LocalTrackRepository | null;
  localRunningRecordRepository: LocalRunningRecordRepository | null;
  trackRecordRepository: TrackRecordRepository | null;
  addTrack: (trackData: CreateTrackDto) => Promise<number | undefined>;
  addRunningRecord: (recordData: CreateRunningRecordDto) => Promise<void>;
}

// 컨텍스트 생성 (초기값 설정)
const RepositoryContext = createContext<RepositoryContextType>({
  localTrackRepository: null,
  localRunningRecordRepository: null,
  trackRecordRepository: null,
  addTrack: async () => undefined,
  addRunningRecord: async () => {},
});

export function useRepositories(): RepositoryContextType {
  return useContext(RepositoryContext);
}

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  // [1. 수정] Omit 타입에 addRunningRecord를 추가합니다.
  const [repos, setRepos] = useState<Omit<RepositoryContextType, 'addTrack' | 'addRunningRecord'>>({
    localTrackRepository: null,
    localRunningRecordRepository: null,
    trackRecordRepository: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setupRepositories = async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
        await db.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS local_track (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            totalDistance INTEGER NOT NULL,
            rate REAL,
            path TEXT,
            startLatitude REAL,
            startLongitude REAL,
            address TEXT,
            createdAt TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS running_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trackId INTEGER,
            name TEXT,
            path TEXT NOT NULL,
            distance INTEGER NOT NULL,
            duration INTEGER NOT NULL,
            avgPace INTEGER,
            calories REAL,
            startedAt TEXT NOT NULL,
            endedAt TEXT NOT NULL,
            FOREIGN KEY (trackId) REFERENCES local_track(id)
          );
        `);

        const localTrackRepo = new LocalTrackRepository(db);
        const localRunningRecordRepo = new LocalRunningRecordRepository(db);
        const trackRecordRepo = new TrackRecordRepository();

        setRepos({
          localTrackRepository: localTrackRepo,
          localRunningRecordRepository: localRunningRecordRepo,
          trackRecordRepository: trackRecordRepo,
        });
      } catch (e) {
        console.error("Fatal: Failed to initialize repositories", e);
      } finally {
        setIsLoading(false);
      }
    };
    setupRepositories();
  }, []);

  // 데이터 추가 함수 (이제 캐시를 업데이트할 필요가 없습니다)
  const addTrack = async (trackData: CreateTrackDto): Promise<number | undefined> => {
    const result = await repos.localTrackRepository?.create(trackData);
    return result?.lastInsertRowId;
  };


  // [2. 추가] addRunningRecord 함수를 정의합니다.
  const addRunningRecord = async (recordData: CreateRunningRecordDto) => {
    await repos.localRunningRecordRepository?.create(recordData);
  };

  

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>앱을 준비하고 있습니다...</Text>
      </View>
    );
  }

  // [3. 수정] value에 addRunningRecord 함수를 추가합니다.
  return (
    <RepositoryContext.Provider value={{ ...repos, addTrack, addRunningRecord }}>
      {children}
    </RepositoryContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 20, fontSize: 16, color: '#666' },
});
