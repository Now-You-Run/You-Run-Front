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

async function migrateOldPathsIfNeeded() {
  const oldJson = await AsyncStorage.getItem('@running_paths');
  const idsJson = await AsyncStorage.getItem('@running_path_ids');
  if (oldJson && !idsJson) { // 아직 마이그레이션 안 했을 때만
    const oldTracks: Track[] = JSON.parse(oldJson);
    const ids: string[] = [];
    for (const track of oldTracks) {
      await AsyncStorage.setItem(`@running_path_${track.id}`, JSON.stringify(track));
      ids.push(track.id);
    }
    await AsyncStorage.setItem('@running_path_ids', JSON.stringify(ids));
    // 기존 데이터 삭제(선택)
    // await AsyncStorage.removeItem('@running_paths');
    console.log('로컬 트랙 데이터 마이그레이션 완료!');
  }
}

export async function deletePath(id: string): Promise<void> {
  const all = await loadPaths();
  const filtered = all.filter((item) => item.id !== id);
  await saveAllPaths(filtered);
}
