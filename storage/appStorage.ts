// storage/AppStorage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BOT_PACE_KEY   = '@bot_pace';
export const LAST_TRACK_KEY = '@last_track_summary';

export interface BotPace {
  minutes: number;
  seconds: number;
}

export interface TrackSummary {
  distanceMeters: number;  // 총 이동 거리 (m 단위)
  durationSec:    number;  // 총 소요 시간 (초 단위)
}

/**
 * 봇 페이스 설정 저장
 */
export async function saveBotPace(pace: BotPace): Promise<void> {
  try {
    await AsyncStorage.setItem(BOT_PACE_KEY, JSON.stringify(pace));
  } catch (e) {
    console.error('봇 페이스 저장 실패:', e);
  }
}

/**
 * 봇 페이스 설정 불러오기
 */
export async function loadBotPace(): Promise<BotPace | null> {
  try {
    const raw = await AsyncStorage.getItem(BOT_PACE_KEY);
    return raw ? JSON.parse(raw) as BotPace : null;
  } catch (e) {
    console.error('봇 페이스 불러오기 실패:', e);
    return null;
  }
}

/**
 * 마지막 달리기 요약 저장
 */
export async function saveLastTrack(summary: TrackSummary): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_TRACK_KEY, JSON.stringify(summary));
  } catch (e) {
    console.error('마지막 달리기 요약 저장 실패:', e);
  }
}

/**
 * 마지막 달리기 요약 불러오기
 */
export async function loadLastTrack(): Promise<TrackSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_TRACK_KEY);
    return raw ? JSON.parse(raw) as TrackSummary : null;
  } catch (e) {
    console.error('마지막 달리기 요약 불러오기 실패:', e);
    return null;
  }
}
