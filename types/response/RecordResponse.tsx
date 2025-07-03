export interface TrackRecordData {
  id: number;
  userId: number;
  mode: string; // e.g., "FREE"
  trackId: number;
  opponentId: number | null;
  duration: number;
  winner: boolean | null; // or just boolean if always present
}

export interface TrackRecordApiResponse {
  statuscode: string; // e.g., "200"
  message: string;    // e.g., "ok"
  data: TrackRecordData;
}