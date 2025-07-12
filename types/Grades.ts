// 등급 정보의 타입을 명확히 정의합니다.
export interface GradeInfo {
  name: string; // 스타일 참조를 위한 영어 이름 (KEY)
  displayName: string; // 화면 표시 및 서버 데이터와 일치하는 한글 이름
  minLevel: number;
  maxLevel: number;
  levelMultiple: number;
}

// 앱 전체에서 사용할 등급 정보의 원본 데이터입니다.
export const UserGrades: GradeInfo[] = [
    { name: "IRON", displayName: "아이언", minLevel: 1, maxLevel: 9, levelMultiple: 2 },
    { name: "BRONZE", displayName: "브론즈", minLevel: 10, maxLevel: 19, levelMultiple: 2 },
    { name: "SILVER", displayName: "실버", minLevel: 20, maxLevel: 29, levelMultiple: 3 },
    { name: "GOLD", displayName: "골드", minLevel: 30, maxLevel: 39, levelMultiple: 3 },
    { name: "PLATINUM", displayName: "플래티넘", minLevel: 40, maxLevel: 54, levelMultiple: 6 },
    { name: "DIAMOND", displayName: "다이아", minLevel: 55, maxLevel: 79, levelMultiple: 6 },
    { name: "MASTER", displayName: "마스터", minLevel: 80, maxLevel: 119, levelMultiple: 10 },
    { name: "GRAND_MASTER", displayName: "그랜드 마스터", minLevel: 120, maxLevel: 179, levelMultiple: 10 },
    { name: "LEGEND_RUNNER", displayName: "레전드 러너", minLevel: 180, maxLevel: 300, levelMultiple: 100 },
];
