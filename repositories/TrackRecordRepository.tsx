// repositories/TrackRecordRepository.ts

import { SaveRecordDto } from '@/types/ServerRecordDto';
import type { MyTrackRecordApiResponse, MyTrackRecordData, Track, TrackRecordApiResponse, TrackRecordData } from '../types/response/RunningTrackResponse';
import { AuthAsyncStorage } from './AuthAsyncStorage';


const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL; // 실제 서버 주소로 변경

export class TrackRecordRepository {

  constructor() { }
  /**
   * 트랙 기록 상세 조회
   * @param trackId 트랙 ID
   * @returns TrackRecordData | null
   */
  public async fetchTrackRecord(trackId: number | string): Promise<TrackRecordData | null> {
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

    public async fetchMyTrackRecord(trackId: number | string): Promise<MyTrackRecordData | null> {
    try {
      const response = await fetch(`${SERVER_API_URL}/api/track/my?trackId=${trackId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Track record fetch failed:', response.status, await response.text());
        return null;
      }
      
      const json: MyTrackRecordApiResponse = await response.json();

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
  public async fetchTrackList(): Promise<Track[]> {
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

  public async fetchPaginatedTrackListOrderByClose(
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

  
  public async fetchPaginatedUserTrackListOrderByClose(
    userLon: number,
    userLat: number,
    userId: number,
    page: number,
    size: number
  ): Promise<{ tracks: Track[]; totalPages: number; totalElements: number }> {
    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/track/list/order/close?userLon=${userLon}&userLat=${userLat}&page=${page}&size=${size}&userId=${userId}`,
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
  public async saveRunningRecord(recordData: SaveRecordDto): Promise<boolean> {
    try {
      // 1. 저장된 userId를 가져옵니다.
      const userId = await AuthAsyncStorage.getUserId();
      if (!userId) {
        console.error('기록 저장 실패: 로그인된 사용자 ID를 찾을 수 없습니다.');
        return false;
      }

      // 2. 서버로 보낼 최종 데이터를 구성합니다.
      const payload = {
        userId,
        ...recordData,
        // DTO에 없는 필드지만 서버가 요구한다면 여기에 기본값을 설정할 수 있습니다.
        // 예: opponentId: recordData.opponentId || 0,
      };

      // 3. 서버 API를 호출합니다. (엔드포인트는 실제 API 경로에 맞게 수정해야 합니다)
      const response = await fetch(`${SERVER_API_URL}/api/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 만약 인증 토큰이 필요하다면 여기에 추가해야 합니다.
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      // 4. 응답을 처리합니다.
      if (!response.ok) {
        console.error('러닝 기록 저장 실패:', response.status, await response.text());
        return false;
      }

      const json = await response.json();

      // 서버의 성공 응답 형식에 맞춰 확인합니다. (예: statuscode가 '201' 등)
      if (json && (json.statuscode === '201' || json.statuscode === '200')) {
        console.log('서버에 러닝 기록이 성공적으로 저장되었습니다.');
        return true;
      } else {
        console.error('서버 응답 오류:', json);
        return false;
      }

    } catch (error) {
      console.error('러닝 기록 저장 중 네트워크 오류 발생:', error);
      return false;
    }
  }



}
