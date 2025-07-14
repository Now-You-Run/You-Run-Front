import { Coordinate } from "../TrackDto";

export interface TrackInfoDto {
  path: Coordinate[];
  totalDistance: number;
  name: string;
  rate: number;
}

export interface TrackRecordDto {
  userId: number;
  username: string;
  duration: number;
  grade : string,
  level: number,
}

export interface TrackRecordData {
  trackInfoDto: TrackInfoDto;
  trackRecordDto: TrackRecordDto[];
}

export interface TrackRecordApiResponse {
  statuscode: string;
  message: string;
  data: TrackRecordData;
}

export interface TrackListItem {
  id: number;
  name: string;
  path: Coordinate[];
}

export interface TrackListApiResponse {
  statuscode: string;
  message: string;
  data: {
    tracks: TrackListItem[];
  };
}

export type Track = {
  id: string;
  name: string;
  path: string | { latitude: number; longitude: number }[];
  thumbnailUrl?: string | null;
  distance?: number;
  date: string;
  duration?: number;
  _sortKey?: number;
};

export interface MyTrackRecordDto {
  recordId: number;
  resultTime: number;
  finishedAt: string;
}

export interface MyTrackRecordData {
  trackInfoDto: TrackInfoDto;
  trackRecordDto: MyTrackRecordDto[];
}

export interface MyTrackRecordApiResponse {
  statuscode: string;
  message: string;
  data: MyTrackRecordData;
}