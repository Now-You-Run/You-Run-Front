// context/PaceContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PaceSettings {
  minutes: number;
  seconds: number;
}

interface PaceContextType {
  botPace: PaceSettings;
  setBotPace: (pace: PaceSettings) => void;
  getTotalSeconds: () => number;
  getFormattedTime: () => string;
}

const PaceContext = createContext<PaceContextType | undefined>(undefined);

interface PaceProviderProps {
  children: ReactNode;
}

export const PaceProvider: React.FC<PaceProviderProps> = ({ children }) => {
  const [botPace, setBotPace] = useState<PaceSettings>({
    minutes: 0,
    seconds: 0,
  });

  const getTotalSeconds = () => {
    return botPace.minutes * 60 + botPace.seconds;
  };

  const getFormattedTime = () => {
    const formatTime = (time: number): string => {
      return time.toString().padStart(2, '0');
    };
    return `${formatTime(botPace.minutes)}분 ${formatTime(botPace.seconds)}초`;
  };

  return (
    <PaceContext.Provider value={{
      botPace,
      setBotPace,
      getTotalSeconds,
      getFormattedTime,
    }}>
      {children}
    </PaceContext.Provider>
  );
};

export const usePace = () => {
  const context = useContext(PaceContext);
  if (context === undefined) {
    throw new Error('usePace must be used within a PaceProvider');
  }
  return context;
};