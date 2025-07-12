export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface LocalTrack {
  id: number;
  name: string;
  totalDistance: number;
  rate: number;
  /** 데이터베이스에는 좌표 배열이 JSON 문자열 형태로 저장됩니다. */
  path: string;
  startLatitude: number;
  startLongitude: number;
  address: string;
  /** ISO 8601 형식의 날짜 문자열 (예: "2025-07-08T12:34:56.789Z") */
  createdAt: string;
}

export type CreateTrackDto = Omit<LocalTrack, 'id' | 'createdAt'>;