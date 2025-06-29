// context/RunningContext.tsx

import * as Location from 'expo-location';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const LOCATION_TASK_NAME = 'background-location-task';

// 간단한 1D 칼만 필터 구현
class KalmanFilter1D {
  private R: number; // 프로세스 노이즈 공분산
  private Q: number; // 측정 노이즈 공분산
  private x: number; // 상태 추정값
  private P: number; // 오차 공분산

  constructor(R = 0.01, Q = 0.1) {
    this.R = R;
    this.Q = Q;
    this.x = NaN;
    this.P = NaN;
  }

  filter(z: number): number {
    if (isNaN(this.x)) {
      // 초기 상태 설정
      this.x = z;
      this.P = this.Q;
    } else {
      // 예측 단계
      const xPred = this.x;
      const PPred = this.P + this.R;
      // 업데이트 단계
      const K = PPred / (PPred + this.Q);
      this.x = xPred + K * (z - xPred);
      this.P = (1 - K) * PPred;
    }
    return this.x;
  }
}

// 경로 좌표 타입
interface Coord {
  latitude: number;
  longitude: number;
}

// 컨텍스트에 제공될 상태 타입
interface RunningState {
  isActive: boolean;
  elapsedTime: number;
  path: Coord[];
  currentSpeed: number; // 필터링된 순간 속도 (km/h)
  totalDistance: number; // 필터링된 누적 거리 (km)
  startRunning: () => void;
  stopRunning: () => void;
  resumeRunning: () => void;
  resetRunning: () => void;
  addToPath: (coords: Coord) => void;
}

const RunningContext = createContext<RunningState | undefined>(undefined);

export const RunningProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 상태 선언
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [path, setPath] = useState<Coord[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);

  const timerInterval = useRef<number | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );
  const lastCoordRef = useRef<Coord | null>(null);

  // 칼만 필터 인스턴스
  const speedFilter = useRef(new KalmanFilter1D(0.01, 0.1));
  const distFilter = useRef(new KalmanFilter1D(0.01, 0.1));

  // 하버사인 공식으로 두 좌표 간 거리 계산 (km)
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

  // 스톱워치 로직
  useEffect(() => {
    if (isActive) {
      timerInterval.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    } else if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isActive]);

  // 위치 구독 시작
  const startLocationTracking = async () => {
    // foreground 위치 구독 (권한 요청은 별도)
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (location) => {
        const { latitude, longitude, speed } = location.coords;

        const prev = lastCoordRef.current;

        if (prev) {
          const rawDist = haversineDistance(
            prev.latitude,
            prev.longitude,
            latitude,
            longitude
          );
          const filtDist = distFilter.current.filter(rawDist);
          setTotalDistance((d) => d + filtDist);
        }

        lastCoordRef.current = { latitude, longitude };

        // 경로에 좌표 추가
        addToPath({ latitude, longitude });

        // 속도 필터링
        const rawSpeedKmH = speed != null ? speed * 3.6 : 0;
        const filtSpeed = speedFilter.current.filter(rawSpeedKmH);

        const speedThreshold = 0.5; // 0.5km/h 이하인 건 0 처리
        const displaySpeed = filtSpeed > speedThreshold ? filtSpeed : 0;
        setCurrentSpeed(displaySpeed);
      }
    );

    // foreground 권한 요청
    const { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.warn('Foreground permission not granted!');
    }

    // background 권한 요청
    const { status: bgStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (bgStatus === 'granted') {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 1,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: '러닝 중',
          notificationBody: '백그라운드에서 위치를 추적 중입니다.',
        },
      });
    } else {
      console.warn(
        'Background permission not granted, continuing foreground only.'
      );
    }
  };

  // 위치 구독 정지
  const stopLocationTracking = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  };

  // 경로에 좌표 추가 함수 (내부에서 사용)
  const addToPath = (coords: Coord) => {
    setPath((prev) => [...prev, coords]);
  };

  const startRunning = () => {
    setPath([]);
    setElapsedTime(0);
    setCurrentSpeed(0);
    setTotalDistance(0);
    setIsActive(true);
    startLocationTracking();
  };

  const stopRunning = () => {
    setIsActive(false);
    stopLocationTracking();
    // 서버 저장 등 추가 로직 가능
  };

  const resumeRunning = () => {
    setIsActive(true);
    startLocationTracking();
  };

  const resetRunning = () => {
    stopLocationTracking();
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = null;

    setIsActive(false);
    setElapsedTime(0);
    setPath([]);
    setCurrentSpeed(0);
    setTotalDistance(0);
  };

  return (
    <RunningContext.Provider
      value={{
        isActive,
        elapsedTime,
        path,
        addToPath,
        currentSpeed,
        totalDistance,
        startRunning,
        stopRunning,
        resumeRunning,
        resetRunning,
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
