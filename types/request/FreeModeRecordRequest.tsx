export interface TrackRecordRequest {
  userId: number;
  mode: string;
  trackId: number;
  opponentId: number | null;
  isWinner: boolean | null;
  duration: number;
}