// repositories/TrackRecordRepository.ts

import type { Track, TrackRecordApiResponse, TrackRecordData } from '../types/response/RunningTrackResponse';

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL; // 실제 서버 주소로 변경

export class TrackRecordRepository {
  /**
   * 트랙 기록 상세 조회
   * @param trackId 트랙 ID
   * @returns TrackRecordData | null
   */
  static async fetchTrackRecord(trackId: number | string): Promise<TrackRecordData | null> {
    try {
      const response = await fetch(`${SERVER_API_URL}/api/track?trackId=${trackId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Track record fetch failed:', response.status, await response.text());
        return null;
      }

      const json: TrackRecordApiResponse = await response.json();

      // 응답 구조 검증 (필요시)
      if (
        json &&
        json.statuscode === '200' &&
        json.data &&
        json.data.trackInfoDto &&
        Array.isArray(json.data.trackInfoDto.path) &&
        typeof json.data.trackInfoDto.totalDistance === 'number'
      ) {
        console.log(json.data)
        return json.data;
      } else {
        console.error('Invalid response structure:', json);
        return null;
      }
    } catch (error) {
      console.error('Error fetching track record:', error);
      return null;
    }
  }
  static async fetchTrackList(): Promise<Track[]> {
    try {
      const response = await fetch(`${SERVER_API_URL}/api/track/list`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('Track list fetch failed:', response.status, await response.text());
        return [];
      }

      const json = await response.json();
      if (
        json &&
        json.statuscode === '200' &&
        json.data &&
        Array.isArray(json.data.tracks)
      ) {
        return json.data.tracks;
      } else {
        console.error('Invalid track list response structure:', json);
        return [];
      }
    } catch (error) {
      console.error('Error fetching track list:', error);
      return [];
    }
  }

  static async fetchPaginatedTrackListOrderByClose(
  userLon: number,
  userLat: number,
  page: number,
  size: number
): Promise<{ tracks: Track[]; totalPages: number; totalElements: number }> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/api/track/list/order/close?userLon=${userLon}&userLat=${userLat}&page=${page}&size=${size}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      console.error('Paginated track list fetch failed:', response.status, await response.text());
      return { tracks: [], totalPages: 0, totalElements: 0 };
    }
    const json = await response.json();
    if (
      json &&
      json.statuscode === '200' &&
      json.data &&
      Array.isArray(json.data.tracks)
    ) {
      return {
        tracks: json.data.tracks,
        totalPages: json.data.totalPages,
        totalElements: json.data.totalElements,
      };
    } else {
      console.error('Invalid paginated track list response structure:', json);
      return { tracks: [], totalPages: 0, totalElements: 0 };
    }
  } catch (error) {
    console.error('Error fetching paginated track list:', error);
    return { tracks: [], totalPages: 0, totalElements: 0 };
  }
}
}
