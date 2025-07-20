import { create } from 'zustand';

// 아바타 타입 정의
interface Avatar {
  id: number;
  url: string;
}

// 사용자 프로필 데이터의 형태 정의
interface UserProfile {
  level: number;
  totalDistance: number; // m 단위
  point: number;
  grade: string; // 'IRON', 'BRONZE' 등 영어 이름
  username: string;
  selectedAvatar?: Avatar;  // 선택된 아바타 정보 추가
}

// 스토어의 전체 상태 및 액션 정의
interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateProfileStats: (stats: Partial<UserProfile>) => void;
  updateSelectedAvatar: (avatar: Avatar) => void;  // 아바타 업데이트 액션 추가
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => {
    console.log('setProfile called with:', profile);
    set({ profile });
  },
  updateProfileStats: (stats) => {
    console.log('updateProfileStats called with:', stats);
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...stats } : null,
    }));
  },
  updateSelectedAvatar: (avatar) => {
    console.log('updateSelectedAvatar called with:', avatar);
    set((state) => ({
      profile: state.profile ? {
        ...state.profile,
        selectedAvatar: avatar
      } : null
    }));
  },
}));
