import { Track } from '@/types/response/RunningTrackResponse';
import AsyncStorage from '@react-native-async-storage/async-storage';
const PATH_KEY = '@running_paths'; // Storage key

export async function savePath(track: Track) {
  try {
    const jsonValue = await AsyncStorage.getItem(PATH_KEY);
    const tracks: Track[] = jsonValue ? JSON.parse(jsonValue) : [];
    tracks.unshift(track);
    await AsyncStorage.setItem(PATH_KEY, JSON.stringify(tracks));
    console.log('Track saved!');
  } catch (e) {
    console.error('Failed to save track:', e);
  }
}

export async function saveAllPaths(tracks: Track[]) {
  try {
    await AsyncStorage.setItem(PATH_KEY, JSON.stringify(tracks));
  } catch (e) {
    console.error('전체 경로 저장 실패:', e);
  }
}

export async function loadPaths(): Promise<Track[]> {
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

export async function deletePath(id: string): Promise<void> {
  const all = await loadPaths();
  const filtered = all.filter((item) => item.id !== id);
  await saveAllPaths(filtered);
}
