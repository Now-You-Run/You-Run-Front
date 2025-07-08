import { useRepositories } from '@/context/RepositoryContext';
import { CreateRunningRecordDto } from '@/types/LocalRunningRecordDto';
import { CreateTrackDto } from '@/types/LocalTrackDto';
import { calculateAveragePace, formatDateTime, formatTime } from '@/utils/RunningUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { LatLng, Polyline } from 'react-native-maps';

export default function SummaryScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();

  const { addTrack, addRunningRecord } = useRepositories();

  // --- 상태 관리 ---
  const [modalType, setModalType] = useState<'saveNewTrack' | 'confirmSaveRecord' | null>(null);
  const [newTrackName, setNewTrackName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!data) {
    return (
      <View style={styles.container}>
        <Text>요약 정보를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const parsed = JSON.parse(data);
  const userPath = parsed.userPath ?? parsed.path ?? [];
  const totalDistance = parsed.totalDistance;
  const elapsedTime = parsed.elapsedTime;
  const trackId = parsed.trackId; // 트랙 모드일 때만 존재
  const isTrackMode = !!trackId; // 현재 모드를 명확히 하는 변수

  // 트랙 모드 전용 핸들러 (기록만 저장)
  const handleSaveRecordOnly = async () => {
    setIsSaving(true);
    try {
      const newRecord: CreateRunningRecordDto = {
        trackId: parseInt(trackId, 10),
        name: `${formatDateTime(new Date())} 기록`,
        path: JSON.stringify(userPath),
        distance: Math.round(totalDistance * 1000),
        duration: elapsedTime,
        avgPace: 0,
        calories: Math.round(totalDistance * 60),
        startedAt: new Date(Date.now() - elapsedTime * 1000).toISOString(),
        endedAt: new Date().toISOString(),
      };
      await addRunningRecord(newRecord);
      setModalType(null);
      Alert.alert('저장 완료', '러닝 기록이 저장되었습니다.', [
        { text: '확인', onPress: () => router.replace('/') },
      ]);
    } catch (error) {
      console.error('기록 저장 중 오류:', error);
      Alert.alert('오류', '기록을 저장하는 데 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 자유 모드 전용 핸들러 (트랙과 기록 모두 저장)
  const handleSaveNewTrackAndRecord = async () => {
    if (newTrackName.trim() === '') {
      Alert.alert('입력 필요', '저장할 트랙의 이름을 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const newTrack: CreateTrackDto = {
        name: newTrackName.trim(),
        totalDistance: Math.round(totalDistance * 1000),
        path: JSON.stringify(userPath),
        startLatitude: userPath[0]?.latitude,
        startLongitude: userPath[0]?.longitude,
        address: '주소 정보 없음', // 필요시 주소 변환 API 사용
        rate: 0,
      };
      const newlyCreatedTrackId = await addTrack(newTrack);

      if (newlyCreatedTrackId) {
        const date = new Date();
        const newRecord: CreateRunningRecordDto = {
          trackId: newlyCreatedTrackId,
          name: `${formatDateTime(date)} 기록`,
          path: JSON.stringify(userPath),
          distance: Math.round(totalDistance * 1000),
          duration: elapsedTime,
          avgPace: 0,
          calories: Math.round(totalDistance * 60),
          startedAt: new Date(date.getTime() - elapsedTime * 1000).toISOString(),
          endedAt: date.toISOString(),
        };
        await addRunningRecord(newRecord);
        setModalType(null);
        Alert.alert('저장 완료', '새로운 트랙과 러닝 기록이 모두 저장되었습니다.', [
          { text: '확인', onPress: () => router.replace('/') },
        ]);
      } else {
        Alert.alert('저장 실패', '새로운 트랙을 저장하는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('저장 중 오류 발생:', error);
      Alert.alert('오류', '데이터를 저장하는 중 문제가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompletePress = () => {
    console.log(isTrackMode)
    if (isTrackMode) {
      setModalType('confirmSaveRecord');
    } else {
      setModalType('saveNewTrack');
    }
  };

  if (!Array.isArray(userPath) || userPath.length === 0) {
    return (
      <View style={styles.container}>
        <Text>경로 데이터가 올바르지 않습니다.</Text>
      </View>
    );
  }

  const { width } = Dimensions.get('window');
  const mapSize = width * 0.9;
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const pace = calculateAveragePace(totalDistance, elapsedTime);
  const calories = Math.round(totalDistance * 60);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isTrackMode ? 'Track Run Finished' : 'Free Run Finished'}</Text>
      <MapView
        style={{ width: mapSize, height: mapSize, borderRadius: 10 }}
        initialRegion={{
          latitude: userPath[0]?.latitude || 37.5665,
          longitude: userPath[0]?.longitude || 126.978,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Polyline coordinates={userPath as LatLng[]} strokeColor="#007aff" strokeWidth={5} />
      </MapView>

      <Text style={styles.date}>{dateStr}</Text>
      <Text style={styles.distance}>{totalDistance.toFixed(2)} km</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>시간</Text>
          <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>페이스</Text>
          <Text style={styles.statValue}>{pace}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>칼로리</Text>
          <Text style={styles.statValue}>{calories}</Text>
        </View>
      </View>

      <Pressable style={styles.completeButton} onPress={handleCompletePress}>
        <Text style={styles.completeIcon}>🏁</Text>
        <Text style={styles.completeButtonText}>완료</Text>
      </Pressable>

      {/* 자유 러닝 모드용 모달 (새 트랙 이름 입력) */}
      <Modal
        visible={modalType === 'saveNewTrack'}
        transparent
        animationType="fade"
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새로운 트랙 저장</Text>
            <Text style={styles.modalText}>
              방금 달린 경로를 새로운 트랙으로 저장합니다. 트랙의 이름을 입력해주세요.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="예: 우리집 산책로"
              value={newTrackName}
              onChangeText={setNewTrackName}
            />
            <View style={styles.modalButtonContainer}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                onPress={() => setModalType(null)}
              >
                <Text style={styles.modalButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: '#007aff' }]}
                onPress={handleSaveNewTrackAndRecord}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>저장</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 트랙 따라가기 모드용 모달 (단순 기록 저장 확인) */}
      <Modal
        visible={modalType === 'confirmSaveRecord'}
        transparent
        animationType="fade"
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>기록 저장</Text>
            <Text style={styles.modalText}>현재 러닝 기록을 저장하시겠습니까?</Text>
            <View style={styles.modalButtonContainer}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                onPress={() => setModalType(null)}
              >
                <Text style={styles.modalButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: '#007aff' }]}
                onPress={handleSaveRecordOnly}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>저장</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 40, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 20 },
  date: { marginTop: 10, fontSize: 16, color: '#666' },
  distance: { fontSize: 64, fontWeight: '800', marginVertical: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '90%' },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 14, color: '#888' },
  statValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
  completeButton: {
    marginTop: 30,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    backgroundColor: '#007aff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 200,
  },
  completeIcon: {
    fontSize: 24,
  },
  completeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '90%', backgroundColor: 'white', padding: 25, borderRadius: 15, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  modalButton: { flex: 1, marginHorizontal: 5, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
