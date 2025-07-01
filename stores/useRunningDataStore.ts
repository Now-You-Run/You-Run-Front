// stores/useRunningDataStore.ts
import { create } from 'zustand';

interface RunningDataStore {
  avgPaceMinutes: string;
  avgPaceSeconds: string;
  setPace: (minutes: string, seconds: string) => void;
}

export const useRunningDataStore = create<RunningDataStore>((set) => ({
  avgPaceMinutes: '',
  avgPaceSeconds: '',
  setPace: (minutes, seconds) =>
    set({ avgPaceMinutes: minutes, avgPaceSeconds: seconds }),
}));
