// /repositories/LocalRunningRecordRepository.ts

import * as SQLite from 'expo-sqlite';
import { CreateRunningRecordDto, RunningRecord } from '../types/LocalRunningRecordDto';

export class LocalRunningRecordRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  // C: 새로운 러닝 기록 생성
  public async create(record: CreateRunningRecordDto): Promise<SQLite.SQLiteRunResult | undefined> {
    try {
      return await this.db.runAsync(
        `INSERT INTO running_records (trackId, name, path, distance, duration, avgPace, calories, startedAt, endedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          record.trackId,
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

  // R: 모든 러닝 기록 조회
  public async readAll(): Promise<RunningRecord[] | undefined> {
    try {
      return await this.db.getAllAsync<RunningRecord>('SELECT * FROM running_records ORDER BY endedAt DESC;');
    } catch (error) {
      console.error("Error reading all running records:", error);
    }
  }

  // R: 특정 트랙 ID에 해당하는 모든 러닝 기록 조회 (랭킹용)
  public async readByTrackId(trackId: number): Promise<RunningRecord[] | undefined> {
    try {
      // duration(걸린 시간)이 짧은 순서대로 정렬하여 랭킹을 만듭니다.
      return await this.db.getAllAsync<RunningRecord>(
        'SELECT * FROM running_records WHERE trackId = ? ORDER BY duration ASC;',
        [trackId]
      );
    } catch (error) {
      console.error(`Error reading records for track id ${trackId}:`, error);
    }
  }

  // D: ID로 특정 러닝 기록 삭제
  public async delete(id: number): Promise<SQLite.SQLiteRunResult | undefined> {
    try {
      return await this.db.runAsync('DELETE FROM running_records WHERE id = ?;', [id]);
    } catch (error) {
      console.error(`Error deleting running record with id ${id}:`, error);
    }
  }
}
