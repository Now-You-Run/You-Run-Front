import type { TrackRecordRequest } from '../types/request/FreeModeRecordRequest';
import type { TrackRecordApiResponse, TrackRecordData } from '../types/response/RecordResponse';

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;

export class RecordRepository {
  static async storeRecord(record: TrackRecordRequest): Promise<TrackRecordData | null> {
    try {
      const response = await fetch(`${SERVER_API_URL}/api/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });

      if (!response.ok) {
        console.error('Track record save failed:', response.status, await response.text());
        return null;
      }

      const json: TrackRecordApiResponse = await response.json();

      // 응답 구조 검증
      if (
        json &&
        json.statuscode === '200' &&
        json.data &&
        typeof json.data.id === 'number'
      ) {
        return json.data;
      } else {
        console.error('Invalid response structure:', json);
        return null;
      }
    } catch (error) {
      console.error('Error saving track record:', error);
      return null;
    }
  }
}
