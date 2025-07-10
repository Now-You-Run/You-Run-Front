import { TrackRecordDto } from "./response/RunningTrackResponse";
export interface SaveRecordDto {
  mode: 'BOT' | 'MATCH'; // 'track' 또는 'free' 등 서버와 약속된 모드
  trackId?: number; // 트랙 모드일 때만 필요
  opponentId?: number; // 봇 또는 다른 사용자와의 대결일 때
  isWinner?: boolean; // 승리 여부
  averagePace: number;
  distance: number; // 미터(m) 단위
  startedAt: string; // ISO 8601 형식 문자열
  finishedAt: string; // ISO 8601 형식 문자열
}

export type ServerRankingRecord = TrackRecordDto;