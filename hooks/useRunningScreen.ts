// // /hooks/useRunningScreen.ts

// import { useRunning } from '@/context/RunningContext';
// import { LocalTrackRepository } from '@/storage/LocalTrackRepository';
// import { CreateTrackDto } from '@/types/LocalTrackDto';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import * as Speech from 'expo-speech';
// import { useCallback, useEffect, useRef, useState } from 'react';
// import { Alert } from 'react-native';
// import { Region } from 'react-native-maps';

// export function useRunningScreen() {
//   const router = useRouter();
//   const { mode, trackDistance } = useLocalSearchParams<{ mode?: string; trackDistance?: string }>();

//   // 상태 관리
//   const [repo, setRepo] = useState<LocalTrackRepository | null>(null);
//   const [isPaused, setIsPaused] = useState(false);
//   const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
//   const [trackName, setTrackName] = useState('');
//   const [summaryData, setSummaryData] = useState<{ path: any[], totalDistance: number, elapsedTime: number } | null>(null);
//   const [mapRegion, setMapRegion] = useState<Region>();
//   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

//   // 전역 상태 (Context)
//   const { path, totalDistance, elapsedTime, currentSpeed, isActive, startRunning, stopRunning, resumeRunning, resetRunning, addStartPointIfNeeded } = useRunning();

//   // 레포지토리 초기화
//   useEffect(() => {
//     LocalTrackRepository.getInstance().then(setRepo);
//   }, []);
  
//   // 지도 위치 추적
//   useEffect(() => {
//     if (path.length > 0) {
//       const last = path[path.length - 1];
//       setMapRegion({ latitude: last.latitude, longitude: last.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
//     }
//   }, [path]);

//   // 핸들러 함수들
//   const handleSaveTrack = async () => {
//     if (!repo || !summaryData || summaryData.path.length === 0) return;
    
//     const newTrackForDb: CreateTrackDto = {
//       name: trackName.trim() || `나의 러닝 ${new Date().toLocaleDateString()}`,
//       totalDistance: Math.round(summaryData.totalDistance * 1000),
//       rate: 0,
//       path: JSON.stringify(summaryData.path),
//       startLatitude: summaryData.path[0].latitude,
//       startLongitude: summaryData.path[0].longitude,
//       address: '주소 정보 없음',
//     };
    
//     const result = await repo.create(newTrackForDb);
//     if (result?.lastInsertRowId) {
//       router.replace({ pathname: '/summary', params: { data: JSON.stringify(summaryData) } });
//     } else {
//       Alert.alert('저장 실패');
//     }
//   };

//   const onMainPress = async () => {
//     if (isActive) {
//       stopRunning(); setIsPaused(true); Speech.speak('일시 정지 합니다.');
//     } else if (isPaused) {
//       resumeRunning(); setIsPaused(false); Speech.speak('러닝을 재개합니다.');
//     } else {
//       startRunning(); setIsPaused(false); await addStartPointIfNeeded(); Speech.speak('러닝을 시작합니다.');
//     }
//   };
  
//   const handleFinish = useCallback(() => {
//     stopRunning();
//     Speech.speak('러닝을 종료합니다.');
//     setSummaryData({ path: [...path], totalDistance, elapsedTime });
//     setIsSaveModalVisible(true);
//   }, [stopRunning, path, totalDistance, elapsedTime]);

//   // 컴포넌트에 전달할 값들
//   return {
//     // 상태 및 데이터
//     path,
//     totalDistance,
//     elapsedTime,
//     currentSpeed,
//     isActive,
//     isPaused,
//     mapRegion,
//     isSaveModalVisible,
//     trackName,
    
//     // 상태 변경 함수
//     setTrackName,
//     setIsSaveModalVisible,
    
//     // 핸들러 함수
//     onMainPress,
//     handleFinish,
//     handleSaveTrack,
//     handleBackPress: () => router.back(),
//   };
// }
