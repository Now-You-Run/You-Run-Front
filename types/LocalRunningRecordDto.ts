export interface RunningRecord {
  id: number;
  /** 사용자가 지정한 기록의 이름 (옵션) */
  name?: string;
  /** 달리기 경로 좌표 배열의 JSON 문자열 */
  path: string;
  /** 총 달린 거리 (미터 단위) */
  distance: number;
  /** 총 달린 시간 (초 단위) */
  duration: number;
  /** 평균 페이스 (1km당 초 단위) */
  avgPace: number;
  /** 소모 칼로리 */
  calories: number;
  /** 달리기 시작 시각 (ISO 8601 형식) */
  startedAt: string;
  /** 달리기 종료 시각 (ISO 8601 형식) */
  endedAt: string;
}

export type CreateRunningRecordDto = Omit<RunningRecord, 'id'>;