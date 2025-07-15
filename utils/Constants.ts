export const TRACK_CONSTANTS = {
  OFFCOURSE_THRESHOLD_M: 20,    // 코스 이탈 기준 거리 (미터)
  START_RADIUS_METERS: 10,      // 시작 가능 반경 (미터)
  FINISH_RADIUS_METERS: 10,     // 완주 감지 반경 (미터)
  SECTION_WARMUP_RATIO: 0.2,   // 웜업 구간 비율 (20%)
  SECTION_FINISH_RATIO: 0.8,   // 마무리 구간 비율 (80%)
  ANNOUNCEMENT_INTERVAL_M: 100, // 음성 안내 간격 (미터)
  FINISH_MIN_DISTANCE: 10,       // 최소 완주 거리 여유
} as const;

export const AVATAR_CONSTANTS = {
  AVATAR_ID: "686ece0ae610780c6c939703",
  UPDATE_INTERVAL_MS: 2000,
  POSITION_OFFSET_X: 35,
  POSITION_OFFSET_Y: 70,
  SIZE_WIDTH: 70,
  SIZE_HEIGHT: 80,
} as const;

export const MAP_CONSTANTS = {
  INITIAL_DELTA: 0.01,
  RUNNING_DELTA: 0.005,
  ROTATION_THRESHOLD: 15,
  ROTATION_WRAP_THRESHOLD: 345,
  ANIMATION_DURATION_MS: 500,
  CAMERA_DURATION_MS: 300,
} as const;


export const SECTION_CONSTANTS = {
  WARMUP_RATIO: 0.2,            // 웜업 구간 비율
  FINISH_RATIO: 0.8,            // 마무리 구간 비율
  ANNOUNCE_INTERVAL: 100,       // 안내 간격 (미터)
} as const;
