// navigation/types.ts
export type RootStackParamList = {
  Home: undefined; // 예시: Home 화면은 파라미터 없음
  Profile: { userId: string }; // 예시: Profile은 userId 파라미터가 필요함
  Notifications: undefined; // 알림 화면은 파라미터 없음
  // 필요하면 다른 화면들도 여기에 추가
};
