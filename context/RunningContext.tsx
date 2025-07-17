// context/RunningContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

// 간단한 1D 칼만 필터 구현
class KalmanFilter1D {
  private R: number; // 프로세스 노이즈 공분산
  private Q: number; // 측정 노이즈 공분산
  private x: number; // 상태 추정값
  private P: number; // 오차 공분산
  private baseQ: number; // 기본 측정 노이즈

  constructor(R = 0.01, Q = 0.1) {
    this.R = R;
    this.baseQ = Q; // 기본값 저장
    this.Q = Q;
    this.x = NaN;
    this.P = NaN;
  }

  // GPS 정확성을 고려한 필터링
  filter(z: number, accuracy?: number): number {
    // GPS 정확성이 제공된 경우 측정 노이즈 동적 조정
    if (accuracy !== undefined) {
      // 정확성이 낮을수록 측정 노이즈 증가
      // accuracy가 5m일 때 기본값, 10m일 때 2배, 20m일 때 4배
      this.Q = this.baseQ * Math.max(1, accuracy / 5);

      // 정확성이 매우 낮은 경우 (50m 이상) 필터링 강화
      if (accuracy > 50) {
        this.Q = this.baseQ * 10;
      }
    } else {
      // 정확성 정보가 없으면 기본값 사용
      this.Q = this.baseQ;
    }

    if (isNaN(this.x)) {
      // 초기 상태 설정
      this.x = z;
      this.P = this.Q;
    } else {
      // 예측 단계
      const xPred = this.x;
      const PPred = this.P + this.R;
      // 업데이트 단계 (동적 Q 값 사용)
      const K = PPred / (PPred + this.Q);
      this.x = xPred + K * (z - xPred);
      this.P = (1 - K) * PPred;
    }
    return this.x;
  }
}


// 경로 좌표 타입
export interface Coord {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// 컨텍스트에 제공될 상태 타입
interface RunningState {
  isActive: boolean;
  isPaused: boolean;      // 일시 정지 상태
  elapsedTime: number;
  path: Coord[];
  currentSpeed: number; // 필터링된 순간 속도 (km/h)
  totalDistance: number; // 필터링된 누적 거리 (km)
  startRunning: () => void;
  stopRunning: () => void;
  pauseRunning: () => void;
  resumeRunning: () => void;
  resetRunning: () => void;
  addToPath: (coords: Coord) => void;
  addStartPointIfNeeded: () => Promise<void>;
  userLocation: Coord | null;
  setUserLocation: (coord: Coord | null) => void;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => Promise<void>;
  setCurrentSpeed: (speed: number) => void; // <-- 추가
  clearPath: () => void; // <-- 추가
}


interface LocationTaskData {
  locations: Location.LocationObject[];
}

interface TaskManagerTaskBody {
  data: LocationTaskData;
  error: TaskManager.TaskManagerError | null;
}

// AsyncStorage에 저장할 백그라운드 위치 타입
interface BackgroundLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number; // GPS 정확성 정보 추가
}



TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskManagerTaskBody): Promise<void> => {
    if (error) {
      console.error('Background location error:', error);
      return;
    }

    if (data && data.locations && data.locations.length > 0) {
      const location = data.locations[0];

      // ✅ 백그라운드에서도 정확성 필터링 적용
      const gpsAccuracy = location.coords.accuracy || 30; // 백그라운드는 기본값 30m

      // 매우 부정확한 백그라운드 위치 무시
      if (gpsAccuracy > 150) {
        console.warn(`백그라운드 GPS 정확성 너무 낮음: ${gpsAccuracy.toFixed(1)}m - 위치 무시`);
        return;
      }

      try {
        // 기존 백그라운드 위치 데이터 가져오기
        const backgroundLocationsJson = await AsyncStorage.getItem('backgroundLocations');
        const existingLocations: BackgroundLocation[] = backgroundLocationsJson
          ? JSON.parse(backgroundLocationsJson)
          : [];

        // 새 위치 데이터 생성 (정확성 정보 포함)
        const newLocation: BackgroundLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
          accuracy: gpsAccuracy // 정확성 정보 추가
        };

        // 배열에 추가 후 저장
        existingLocations.push(newLocation);
        await AsyncStorage.setItem('backgroundLocations', JSON.stringify(existingLocations));

        console.log(`백그라운드 위치 저장 (정확성: ${gpsAccuracy.toFixed(1)}m):`, newLocation);
      } catch (storageError) {
        console.error('Error saving background location:', storageError);
      }
    }
  }
);



const RunningContext = createContext<RunningState | undefined>(undefined);


interface RunningProviderProps {
  children: React.ReactNode;
  isTestMode?: boolean;
}

export const RunningProvider: React.FC<RunningProviderProps> = ({
  children,
  isTestMode = false,
}) => {
  // 기존 상태들...
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [path, setPath] = useState<Coord[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<Coord | null>(null);

  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastCoordRef = useRef<Coord | null>(null);

  // 상태 동기화를 위한 Ref
  const isActiveRef = useRef<boolean>(isActive);
  const isPausedRef = useRef<boolean>(isPaused);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // 칼만 필터 인스턴스들
  const speedFilter = useRef<KalmanFilter1D>(new KalmanFilter1D(0.01, 0.1));
  const distFilter = useRef<KalmanFilter1D>(new KalmanFilter1D(0.01, 0.1));
  const latFilter = useRef<KalmanFilter1D>(new KalmanFilter1D(0.01, 0.1));
  const lngFilter = useRef<KalmanFilter1D>(new KalmanFilter1D(0.01, 0.1));

  const backgroundTaskStarted = useRef<boolean>(false);

  // 앱 상태 변경 감지 및 백그라운드 데이터 동기화
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
      if (nextAppState === 'active') {
        await syncBackgroundLocations();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isActive]);

  // 백그라운드 위치 데이터 동기화 함수
  // 백그라운드 위치 데이터 동기화 함수 수정
  const syncBackgroundLocations = async (): Promise<void> => {
    if (!isActive) return;

    try {
      const backgroundLocationsJson = await AsyncStorage.getItem('backgroundLocations');

      if (backgroundLocationsJson) {
        const backgroundLocations: BackgroundLocation[] = JSON.parse(backgroundLocationsJson);

        if (backgroundLocations.length > 0) {
          // ✅ 정확성 기반 필터링 적용
          const filteredLocations = backgroundLocations.filter(loc => {
            const accuracy = loc.accuracy || 50; // 기본값 50m
            if (accuracy > 200) {
              console.warn(`부정확한 백그라운드 위치 제외: ${accuracy.toFixed(1)}m`);
              return false;
            }
            return true;
          });

          if (filteredLocations.length > 0) {
            // 백그라운드 위치들을 Coord 타입으로 변환
            const coordsToAdd: Coord[] = filteredLocations.map(loc => ({
              latitude: loc.latitude,
              longitude: loc.longitude,
              timestamp: loc.timestamp
            }));

            // 경로에 추가
            setPath(prev => [...prev, ...coordsToAdd]);

            // 거리 계산 업데이트
            if (lastCoordRef.current && coordsToAdd.length > 0) {
              let additionalDistance = 0;
              let prevCoord = lastCoordRef.current;

              coordsToAdd.forEach(coord => {
                const rawDist = haversineDistance(
                  prevCoord.latitude,
                  prevCoord.longitude,
                  coord.latitude,
                  coord.longitude
                );
                // 백그라운드 데이터는 평균 정확성으로 필터링
                const avgAccuracy = 30;
                const filtDist = distFilter.current.filter(rawDist, avgAccuracy);
                additionalDistance += filtDist;
                prevCoord = coord;
              });

              setTotalDistance(prev => prev + additionalDistance);
              lastCoordRef.current = coordsToAdd[coordsToAdd.length - 1];
            }

            console.log(`${filteredLocations.length}개 백그라운드 위치 동기화 완료`);
          }

          // 저장된 백그라운드 위치 데이터 삭제
          await AsyncStorage.removeItem('backgroundLocations');
        }
      }
    } catch (error) {
      console.error('Error syncing background locations:', error);
    }
  };


  // 위치 구독 시작 (타입 안전성 강화)
  const startLocationTracking = async (): Promise<void> => {
    if (locationSubscription.current) return;

    try {
      // Foreground 권한 요청
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        console.warn('Foreground permission not granted!');
        return;
      }

      // Foreground 위치 구독
locationSubscription.current = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000, // 2초마다 업데이트
    distanceInterval: 3, // 3m 이상 이동 시만 업데이트
  },
  (location: Location.LocationObject) => {
    const { latitude, longitude, speed, accuracy } = location.coords;

    // GPS 정확성 기반 필터링
    const gpsAccuracy = accuracy || 20;
    if (gpsAccuracy > 100) {
      console.warn(`GPS 정확성 너무 낮음: ${gpsAccuracy.toFixed(1)}m - 위치 무시`);
      return;
    }

    // 칼만 필터 적용
    const fLat = latFilter.current.filter(latitude, gpsAccuracy);
    const fLng = lngFilter.current.filter(longitude, gpsAccuracy);
    const timestamp = Date.now();
    const coord: Coord = {
      latitude: fLat,
      longitude: fLng,
      timestamp: timestamp
    };

    // ✅ 항상 최신 위치는 갱신 (아바타 표시용)
    setUserLocation(coord);

    // ✅ 중요: 러닝이 활성 상태이고 일시정지가 아닐 때만 경로 기록
    if (isActiveRef.current && !isPausedRef.current) {
      // 거리 계산 및 누적
      if (lastCoordRef.current) {
        const rawDist = haversineDistance(
          lastCoordRef.current.latitude,
          lastCoordRef.current.longitude,
          fLat,
          fLng
        );
        const filtDist = distFilter.current.filter(rawDist, gpsAccuracy);
        setTotalDistance(d => d + filtDist);
      }

      // 경로에 추가 (최적화: 3m 이상 또는 2초 이상 차이날 때만)
      setPath(p => {
        if (p.length === 0) return [coord];
        const last = p[p.length - 1];
        const dist = haversineDistance(last.latitude, last.longitude, coord.latitude, coord.longitude) * 1000;
        const timeDiff = coord.timestamp - last.timestamp;
        if (dist < 3 && timeDiff < 2000) return p;
        return [...p, coord];
      });

      // 속도 계산
      const rawSp = speed != null ? speed * 3.6 : 0;
      const filtSp = speedFilter.current.filter(rawSp, gpsAccuracy);
      setCurrentSpeed(filtSp > 0.5 ? filtSp : 0);
    }
    // 마지막 좌표는 항상 업데이트
    lastCoordRef.current = coord;
  }
);

      // Background 권한 요청 및 설정
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

      if (bgStatus === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
          deferredUpdatesInterval: 60000,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: '러닝 추적 중',
            notificationBody: '백그라운드에서 위치를 추적하고 있습니다.',
          },
        });
        backgroundTaskStarted.current = true;
      } else {
        console.warn('Background permission not granted, continuing foreground only.');
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  // 위치 구독 정지 (타입 안전성 강화)
  const stopLocationTracking = async (): Promise<void> => {
    // 포어그라운드 구독 해제 (항상 안전)
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    // 백그라운드 작업 중지 시도 (오류를 예상하고 처리)
    try {
      const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isTaskRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        // console.log('✅ 백그라운드 작업이 실행 중이었으며, 성공적으로 중지했습니다.');
      }
    } catch (error: any) {
      // 'TaskNotFoundException' 오류가 발생하면, 이는 이미 작업이 없다는 의미이므로 성공으로 간주합니다.
      // 오류 메시지에 특정 문자열이 포함되어 있는지 확인하여 더 확실하게 처리합니다.
      const errorMessage = error.message || '';
      if (errorMessage.includes("Task 'background-location-task' not found")) {
        console.log("🟡 'Task Not Found' 오류를 감지했습니다. 이미 중지된 상태이므로 안전하게 무시합니다.");
      } else {
        // 그 외의 다른 예상치 못한 오류는 여전히 콘솔에 기록합니다.
        console.error("위치 추적 중지 중 예상치 못한 오류 발생:", error);
      }
    }
  };


  // 스톱워치 로직 (타입 안전성 강화)
  useEffect(() => {
    if (isActive && !isPaused) {
      timerInterval.current = setInterval(() => {
        setElapsedTime((t: number) => t + 1);
      }, 1000);
    } else if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [isActive, isPaused]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopLocationTracking();
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  // 나머지 함수들은 기존과 동일하되 타입 명시
  const addStartPointIfNeeded = async (): Promise<void> => {
    if (path.length === 0) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('위치 권한이 필요합니다.');
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync();
        const startCoord: Coord = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: Date.now()
        };
        // path에는 추가하지 않고 userLocation만 세팅
        setUserLocation(startCoord);
        lastCoordRef.current = startCoord;
      } catch (error) {
        console.error('Error getting current position:', error);
      }
    }
  };

  const addToPath = (coords: Coord): void => {
    setPath((prev: Coord[]) => {
      const newPath = [...prev, coords];
      
      // 거리 계산 추가 (테스트 모드용)
      if (isActiveRef.current && !isPausedRef.current && prev.length > 0) {
        const lastCoord = prev[prev.length - 1];
        const distance = haversineDistance(
          lastCoord.latitude,
          lastCoord.longitude,
          coords.latitude,
          coords.longitude
        );
        setTotalDistance(d => {
          const newTotal = d + distance;
          console.log('🧪 테스트 모드 거리 계산:', distance.toFixed(3), 'km, 총 거리:', newTotal.toFixed(3), 'km');
          return newTotal;
        });
      }
      
      return newPath;
    });
  };

  // path를 완전히 비우는 함수 (테스트 모드 등에서 사용)
  const clearPath = () => setPath([]);

const startRunning = (): void => {
  // 완전한 상태 초기화
  if (!isTestMode) setPath([]); // 테스트 모드면 path를 비우지 않음
  setElapsedTime(0);
  setCurrentSpeed(0);
  setTotalDistance(0);
  if (!isTestMode) setUserLocation(null); // 테스트 모드면 null로 만들지 않음
  setIsPaused(false);
  // 칼만 필터 초기화
  speedFilter.current = new KalmanFilter1D(0.01, 0.1);
  distFilter.current = new KalmanFilter1D(0.01, 0.1);
  latFilter.current = new KalmanFilter1D(0.01, 0.1);
  lngFilter.current = new KalmanFilter1D(0.01, 0.1);
  // 마지막 좌표 초기화
  lastCoordRef.current = null;
  // 활성 상태로 변경 (이 시점부터 위치 기록 시작)
  setIsActive(true);
  if (!isTestMode) startLocationTracking();
};


  const pauseRunning = (): void => {
    if (!isActiveRef.current) return;

    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    setIsPaused(true);
    setIsActive(false);
  };

  const resumeRunning = (): void => {
    setIsPaused(false);
    setIsActive(true);
  };

  const stopRunning = (): void => {
    setIsPaused(false);
    setIsActive(false);
    stopLocationTracking();
  };

  const resetRunning = (): void => {
    stopLocationTracking();
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    setIsPaused(false);
    setIsActive(false);
    setElapsedTime(0);
    setPath([]);
    setCurrentSpeed(0);
    setTotalDistance(0);
    if (!isTestMode) setUserLocation(null); // 테스트 모드면 null로 만들지 않음
  };

  // 하버사인 거리 계산 함수 (타입 명시)
  const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (
    <RunningContext.Provider
      value={{
        isActive,
        isPaused,
        elapsedTime,
        path,
        addToPath,
        currentSpeed,
        addStartPointIfNeeded,
        totalDistance,
        startRunning,
        pauseRunning,
        stopRunning,
        resumeRunning,
        resetRunning,
        userLocation,
        setUserLocation, // 추가
        startLocationTracking, // 추가
        stopLocationTracking, // 추가
        setCurrentSpeed, // <-- 추가
        clearPath, // <-- 추가
      }}
    >
      {children}
    </RunningContext.Provider>
  );
};



export const useRunning = () => {
  const context = useContext(RunningContext);
  if (!context) {
    throw new Error('useRunning must be used within RunningProvider');
  }
  return context;
};
