// /repositories/LocalTrackRepository.ts

import * as SQLite from 'expo-sqlite';
import { CreateTrackDto, LocalTrack } from '../types/LocalTrackDto';

const DATABASE_NAME = 'running.db';

export class LocalTrackRepository {
    private static instance: LocalTrackRepository;
    private db: SQLite.SQLiteDatabase | null = null;

    private initializationPromise: Promise<void> | null = null;

    private constructor() { }
    public static getInstance(): LocalTrackRepository {
        if (!LocalTrackRepository.instance) {
            LocalTrackRepository.instance = new LocalTrackRepository();
        }
        return LocalTrackRepository.instance;
    }

    public initialize(): Promise<void> {
        // 이미 초기화가 진행 중이거나 완료되었다면, 기존 Promise를 반환하여 중복 실행을 막습니다.
        if (!this.initializationPromise) {
            this.initializationPromise = this._initialize();
        }
        return this.initializationPromise;
    }

    // [수정됨] 데이터베이스 및 테이블 초기화
    private async _initialize(): Promise<void> {
        try {
            this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
            await this.db.execAsync(`
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
      `);
            console.log("Database initialized successfully in the background.");
        } catch (error) {
            console.error("Database initialization failed:", error);
            throw error; // 에러를 다시 던져서 호출한 쪽에서 처리할 수 있게 합니다.
        }
    }
    // [수정됨] C: 새로운 기록 생성
    public async create(track: CreateTrackDto): Promise<SQLite.SQLiteRunResult | undefined> {
        if (!this.db) throw new Error("Database is not initialized. Call initialize() first.");
        try {
            const now = new Date().toISOString();
            // INSERT 문에서 updatedAt 컬럼과 값을 제거했습니다.
            return await this.db.runAsync(
                `INSERT INTO local_track (name, totalDistance, rate, path, startLatitude, startLongitude, address, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    track.name,
                    track.totalDistance,
                    track.rate,
                    track.path,
                    track.startLatitude,
                    track.startLongitude,
                    track.address,
                    now // updatedAt에 해당하던 두 번째 now 제거
                ]
            );
        } catch (error) {
            console.error("Error creating track:", error);
        }
    }

    // R: 모든 기록 조회 (변경 없음)
    public async readAll(): Promise<LocalTrack[] | undefined> {
        if (!this.db) throw new Error("Database is not initialized. Call initialize() first.");
        try {
            return await this.db.getAllAsync<LocalTrack>('SELECT * FROM local_track ORDER BY createdAt DESC;');
        } catch (error) {
            console.error("Error reading all tracks:", error);
        }
    }

    // R: ID로 특정 기록 조회 (변경 없음)
    public async readById(id: number): Promise<LocalTrack | null | undefined> {
        if (!this.db) throw new Error("Database is not initialized. Call initialize() first.");
        try {
            return await this.db.getFirstAsync<LocalTrack>('SELECT * FROM local_track WHERE id = ?;', [id]);
        } catch (error) {
            console.error(`Error reading track with id ${id}:`, error);
        }
    }

    // [수정됨] U: 기록 업데이트
    public async update(id: number, name: string, rate: number): Promise<SQLite.SQLiteRunResult | undefined> {
        if (!this.db) throw new Error("Database is not initialized. Call initialize() first.");
        try {
            // UPDATE 문에서 updatedAt 필드 관련 로직을 제거했습니다.
            return await this.db.runAsync(
                'UPDATE local_track SET name = ?, rate = ? WHERE id = ?;',
                [name, rate, id] // now 변수 및 파라미터 제거
            );
        } catch (error) {
            console.error(`Error updating track with id ${id}:`, error);
        }
    }

    // D: 기록 삭제 (변경 없음)
    public async delete(id: number): Promise<SQLite.SQLiteRunResult | undefined> {
        if (!this.db) throw new Error("Database is not initialized. Call initialize() first.");
        try {
            return await this.db.runAsync('DELETE FROM local_track WHERE id = ?;', [id]);
        } catch (error) {
            console.error(`Error deleting track with id ${id}:`, error);
        }
    }
}