import { create } from 'zustand';

// 사용자 프로필 데이터의 형태 정의
interface UserProfile {
  level: number;
  totalDistance: number; // m 단위
  point: number;
  grade: string; // 'IRON', 'BRONZE' 등 영어 이름
  username: string;
}

// 스토어의 전체 상태 및 액션 정의
interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  // 나중에 달리기가 동기화된 후 프로필을 업데이트하는 액션 추가 가능
  updateProfileStats: (stats: Partial<UserProfile>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null, // 앱 시작 시 초기값은 null
  setProfile: (profile) => set({ profile }),
  updateProfileStats: (stats) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...stats } : null,
    })),
}));
