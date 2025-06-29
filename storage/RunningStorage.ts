import AsyncStorage from '@react-native-async-storage/async-storage';
const PATH_KEY = '@running_paths'; // 저장 Key

/**
 * 러닝 트랙 타입
 */
export interface RunningTrack {
  id: string; // 고유 ID (Date.now().toString())
  date: string; // '2025-06-29 19:32'
  distance?: number; // 선택: 거리 (meters)
  duration?: number; // 선택: 소요시간 (seconds)
  path: { latitude: number; longitude: number }[];
}

/**
 * 러닝 트랙 저장
 */
export async function savePath(
  path: { latitude: number; longitude: number }[],
  distance?: number,
  duration?: number
) {
  try {
    const jsonValue = await AsyncStorage.getItem(PATH_KEY);
    const tracks: RunningTrack[] = jsonValue ? JSON.parse(jsonValue) : [];

    const now = new Date();
    const track: RunningTrack = {
      id: now.getTime().toString(),
      date: now.toISOString(),
      distance,
      duration,
      path,
    };

    tracks.unshift(track); // 최신 기록을 스택처럼 맨 앞에 추가

    await AsyncStorage.setItem(PATH_KEY, JSON.stringify(tracks));
    console.log('경로 스택 저장 완료');
  } catch (e) {
    console.error('경로 저장 실패:', e);
  }
}

// 모든 경로를 저장하는 함수
export async function saveAllPaths(tracks: RunningTrack[]) {
  try {
    await AsyncStorage.setItem(PATH_KEY, JSON.stringify(tracks));
  } catch (e) {
    console.error('전체 경로 저장 실패:', e);
  }
}

/**
 * 저장된 러닝 트랙 전체 불러오기
 */
export async function loadPaths(): Promise<RunningTrack[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(PATH_KEY);
    if (jsonValue != null) {
      const parsed = JSON.parse(jsonValue);
      if (Array.isArray(parsed)) {
        return parsed;
      } else {
        console.warn(
          '경고: PATH_KEY에 저장된 데이터가 배열이 아닙니다. 데이터를 초기화합니다.'
        );
        await AsyncStorage.removeItem(PATH_KEY);
        return [];
      }
    }
    return [];
  } catch (e) {
    console.error('경로 불러오기 실패:', e);
    return [];
  }
}

/**
 * 저장된 모든 러닝 트랙 삭제
 */
// RunningStorage.ts
export async function deletePath(id: string): Promise<void> {
  const all = await loadPaths();
  const filtered = all.filter((item) => item.id !== id);
  await saveAllPaths(filtered); // 전체 목록을 통째로 저장
}
