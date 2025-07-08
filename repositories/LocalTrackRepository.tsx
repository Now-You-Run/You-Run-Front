// /repositories/LocalTrackRepository.ts

import { Coordinate } from '@/types/LocalTrackDto';
import * as SQLite from 'expo-sqlite';
import { CreateTrackDto, LocalTrack } from '../types/LocalTrackDto';

export class LocalTrackRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  public async create(track: CreateTrackDto): Promise<SQLite.SQLiteRunResult | undefined> {
    const now = new Date().toISOString();
    try {
      return await this.db.runAsync(
        `INSERT INTO local_track (name, totalDistance, rate, path, startLatitude, startLongitude, address, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [track.name, track.totalDistance, track.rate, track.path, track.startLatitude, track.startLongitude, track.address, now]
      );
    } catch (error) {
      console.error("Error creating track:", error);
    }
  }

  public async readById(id: number): Promise<LocalTrack | null | undefined> {
    try {
      return await this.db.getFirstAsync<LocalTrack>('SELECT * FROM local_track WHERE id = ?;', [id]);
    } catch (error) {
      console.error(`Error reading track with id ${id}:`, error);
    }
  }

  public async update(id: number, name: string, rate: number): Promise<SQLite.SQLiteRunResult | undefined> {
    try {
      return await this.db.runAsync('UPDATE local_track SET name = ?, rate = ? WHERE id = ?;', [name, rate, id]);
    } catch (error) {
      console.error(`Error updating track with id ${id}:`, error);
    }
  }

  public async delete(id: number): Promise<SQLite.SQLiteRunResult | undefined> {
    try {
      return await this.db.runAsync('DELETE FROM local_track WHERE id = ?;', [id]);
    } catch (error) {
      console.error(`Error deleting track with id ${id}:`, error);
    }
  }

  public async readAllSummary(): Promise<Omit<LocalTrack, 'path'>[] | undefined> {
    try {
      return await this.db.getAllAsync<Omit<LocalTrack, 'path'>>(
        'SELECT id, name, totalDistance, rate, startLatitude, startLongitude, address, createdAt FROM local_track ORDER BY createdAt DESC;'
      );
    } catch (error) {
      console.error("Error reading all track summaries:", error);
    }
  }

  public async readPaginatedSummaries({
    sortOption,
    myLocation,
    page,
    pageSize,
  }: {
    sortOption: 'proximity' | 'trackDistance';
    myLocation?: Coordinate;
    page: number;
    pageSize: number;
  }): Promise<Omit<LocalTrack, 'path'>[]> {
    let orderByClause = '';
    const params: (string | number)[] = [];

    if (sortOption === 'proximity' && myLocation) {
      orderByClause = `ORDER BY ((startLatitude - ?) * (startLatitude - ?) + (startLongitude - ?) * (startLongitude - ?)) ASC`;
      params.push(myLocation.latitude, myLocation.latitude, myLocation.longitude, myLocation.longitude);
    } else {
      orderByClause = `ORDER BY totalDistance DESC`;
    }

    const limitClause = `LIMIT ? OFFSET ?`;
    params.push(pageSize, page * pageSize);

    const query = `SELECT id, name, totalDistance, rate, startLatitude, startLongitude, address, createdAt FROM local_track ${orderByClause} ${limitClause}`;

    try {
      return await this.db.getAllAsync<Omit<LocalTrack, 'path'>>(query, params);
    } catch (error) {
      console.error("Error reading paginated track summaries:", error);
      return [];
    }
  }
}
