// /repositories/RunningRecordRepository.ts

import * as SQLite from 'expo-sqlite';
import { CreateRunningRecordDto, RunningRecord } from '../types/LocalRunningRecordDto';

const DATABASE_NAME = 'running.db'; // 기존 데이터베이스 파일을 함께 사용

export class LocalRunningRecordRepository {
    private db: SQLite.SQLiteDatabase;

    // [수정] 생성자에서 DB 연결 객체를 직접 주입받습니다.
    constructor(database: SQLite.SQLiteDatabase) {
        this.db = database;
    }

    private async _initialize(): Promise<void> {
        try {
            this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
            await this.db.execAsync(`
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
            console.log("'running_records' table initialized successfully.");
        } catch (error) {
            console.error("Failed to initialize 'running_records' table:", error);
            throw error;
        }
    }

    // C: 새로운 달리기 기록 생성
    public async create(record: CreateRunningRecordDto): Promise<SQLite.SQLiteRunResult | undefined> {
        if (!this.db) throw new Error("Database is not initialized for RunningRecordRepository.");
        try {
            return await this.db.runAsync(
                `INSERT INTO running_records (name, path, distance, duration, avgPace, calories, startedAt, endedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    record.name ?? "",
                    record.path,
                    record.distance,
                    record.duration,
                    record.avgPace,
                    record.calories,
                    record.startedAt,
                    record.endedAt,
                ]
            );
        } catch (error) {
            console.error("Error creating running record:", error);
        }
    }

    // R: 모든 달리기 기록 조회 (최신순)
    public async readAll(): Promise<RunningRecord[] | undefined> {
        if (!this.db) throw new Error("Database is not initialized for RunningRecordRepository.");
        try {
            return await this.db.getAllAsync<RunningRecord>('SELECT * FROM running_records ORDER BY startedAt DESC;');
        } catch (error) {
            console.error("Error reading all running records:", error);
        }
    }

    // R: ID로 특정 기록 조회
    public async readById(id: number): Promise<RunningRecord | null | undefined> {
        if (!this.db) throw new Error("Database is not initialized for RunningRecordRepository.");
        try {
            return await this.db.getFirstAsync<RunningRecord>('SELECT * FROM running_records WHERE id = ?;', [id]);
        } catch (error) {
            console.error(`Error reading running record with id ${id}:`, error);
        }
    }

    // U: 기록 이름 수정
    public async updateName(id: number, newName: string): Promise<SQLite.SQLiteRunResult | undefined> {
        if (!this.db) throw new Error("Database is not initialized for RunningRecordRepository.");
        try {
            return await this.db.runAsync(
                'UPDATE running_records SET name = ? WHERE id = ?;',
                [newName, id]
            );
        } catch (error) {
            console.error(`Error updating running record name with id ${id}:`, error);
        }
    }

    // D: 기록 삭제
    public async delete(id: number): Promise<SQLite.SQLiteRunResult | undefined> {
        if (!this.db) throw new Error("Database is not initialized for RunningRecordRepository.");
        try {
            return await this.db.runAsync('DELETE FROM running_records WHERE id = ?;', [id]);
        } catch (error) {
            console.error(`Error deleting running record with id ${id}:`, error);
        }
    }
}
