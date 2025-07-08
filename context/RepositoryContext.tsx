// /context/RepositoryContext.tsx

import { LocalRunningRecordRepository } from '@/repositories/LocalRunningRecordRepository';
import { LocalTrackRepository } from '@/repositories/LocalTrackRepository';
import { TrackRecordRepository } from '@/repositories/TrackRecordRepository';
import { CreateTrackDto } from '@/types/LocalTrackDto';
import * as SQLite from 'expo-sqlite';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const DATABASE_NAME = 'running.db';

interface RepositoryContextType {
  localTrackRepository: LocalTrackRepository | null;
  localRunningRecordRepository: LocalRunningRecordRepository | null;
  trackRecordRepository: TrackRecordRepository | null;
  addTrack: (trackData: CreateTrackDto) => Promise<void>;
}

const RepositoryContext = createContext<RepositoryContextType>({
  localTrackRepository: null,
  localRunningRecordRepository: null,
  trackRecordRepository: null,
  addTrack: async () => {},
});

export function useRepositories(): RepositoryContextType {
  return useContext(RepositoryContext);
}

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const [repos, setRepos] = useState<Omit<RepositoryContextType, 'addTrack'>>({
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
            name TEXT,
            path TEXT NOT NULL,
            distance INTEGER NOT NULL,
            duration INTEGER NOT NULL,
            avgPace INTEGER,
            calories REAL,
            startedAt TEXT NOT NULL,
            endedAt TEXT NOT NULL
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
  
  const addTrack = async (trackData: CreateTrackDto) => {
    await repos.localTrackRepository?.create(trackData);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>앱을 준비하고 있습니다...</Text>
      </View>
    );
  }
  
  return (
    <RepositoryContext.Provider value={{ ...repos, addTrack }}>
      {children}
    </RepositoryContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 20, fontSize: 16, color: '#666' },
});
