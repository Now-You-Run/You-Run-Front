import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';
import * as Location from 'expo-location';

const LOCATION_TASK_NAME = 'background-location-task';

interface RunningState {
  isActive: boolean;
  elapsedTime: number;
  path: Location.LocationObjectCoords[];
  startRunning: () => void;
  stopRunning: () => void;
  addToPath: (coords: Location.LocationObjectCoords) => void; // ✅ 추가
}

const RunningContext = createContext<RunningState | undefined>(undefined);

export const RunningProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [path, setPath] = useState<Location.LocationObjectCoords[]>([]);

  const timerInterval = useRef<number | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );

  // 스톱워치 로직
  useEffect(() => {
    if (isActive) {
      timerInterval.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isActive]);

  // ✅ 외부에서 경로 추가할 수 있도록 함수 정의
  const addToPath = (coords: Location.LocationObjectCoords) => {
    setPath((prevPath) => [...prevPath, coords]);
  };

  // GPS 시작
  const startLocationTracking = async () => {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Foreground permission not granted!');
      return;
    }

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Background permission not granted!');
      return;
    }

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 10,
      },
      (location) => {
        setPath((prevPath) => [...prevPath, location.coords]);
      }
    );

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: '러닝 중',
        notificationBody: '앱이 백그라운드에서 위치를 추적하고 있습니다.',
      },
    });
  };

  const stopLocationTracking = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  };

  const startRunning = () => {
    setPath([]);
    setElapsedTime(0);
    setIsActive(true);
    startLocationTracking();
  };

  const stopRunning = () => {
    setIsActive(false);
    stopLocationTracking();
    // 서버 저장 로직 위치
  };

  return (
    <RunningContext.Provider
      value={{
        isActive,
        elapsedTime,
        path,
        startRunning,
        stopRunning,
        addToPath, // ✅ context에 포함
      }}
    >
      {children}
    </RunningContext.Provider>
  );
};

export const useRunning = () => {
  const context = useContext(RunningContext);
  if (!context) {
    throw new Error('useRunning must be used within a RunningProvider');
  }
  return context;
};
