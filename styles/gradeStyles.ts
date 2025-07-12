// [1. No changes to the type, but we will use the properties differently]
import { LinearGradientPoint } from 'expo-linear-gradient';
export interface GradeStyle {
  // We will now treat this as a fallback for the gradient
  backgroundColor: string;
  color: string;
  shadowColor: string;
  // [2. NEW] An array of colors to create a gradient effect
  gradientColors: [string, string, ...string[]];
  // [3. NEW] An optional border color for more definition
  borderColor?: string;
    gradientStart?: LinearGradientPoint;
  gradientEnd?: LinearGradientPoint;
}

// [4. Update] The map with new gradient and border styles
export const gradeStylesMap: Record<string, GradeStyle> = {
  'IRON': {
    backgroundColor: '#8d8d8d',
    gradientColors: ['#d1d1d1', '#7a7a7a', '#d1d1d1'],
    color: '#2e2e2e',
    shadowColor: '#000000',
    gradientStart: { x: 0.5, y: 0 },
    gradientEnd: { x: 0.5, y: 1 },
  },
  'BRONZE': {
    backgroundColor: '#cd7f32',
    gradientColors: ['#cd7f32', '#a06426'],
    color: '#ffffff',
    shadowColor: '#e69a53',
  },
  'SILVER': {
    backgroundColor: '#c0c0c0',
    gradientColors: ['#e0e0e0', '#a0a0a0'],
    color: '#2e2e2e',
    shadowColor: '#ffffff',
  },
  'GOLD': {
    backgroundColor: '#ffd700',
    gradientColors: ['#ffeb3b', '#ffd700'],
    color: '#4d3d00',
    shadowColor: '#ffec80',
    borderColor: '#ffc107',
  },
  'PLATINUM': {
    backgroundColor: '#e5e4e2',
    gradientColors: ['#f0f0f0', '#b0c4de'],
    color: '#3b5a6c',
    shadowColor: '#a8d5e5',
  },
  'DIAMOND': {
    backgroundColor: '#b9f2ff',
    gradientColors: ['#b9f2ff', '#00bfff'],
    color: '#005a7d',
    shadowColor: '#00d5ff',
    borderColor: '#87ceeb',
  },
  'MASTER': {
    backgroundColor: '#a368ff',
    gradientColors: ['#d6a8ff', '#8c3cff'],
    color: '#ffffff',
    shadowColor: '#d8b6ff',
    borderColor: '#c98aff',
  },
  'GRAND_MASTER': {
    backgroundColor: '#ff5c5c',
    gradientColors: ['#ff8a8a', '#ff4d4d'],
    color: '#ffffff',
    shadowColor: '#ff8a8a',
    borderColor: '#ff1a1a',
  },
  'LEGEND_RUNNER': {
    backgroundColor: '#a33e9f',
    gradientColors: ['#ff4d4d', '#ffa500', '#ffff00', '#00ff00', '#00bfff', '#a368ff'],
    color: '#ffffff',
    shadowColor: '#ffd700',
    borderColor: '#ffffff',
    gradientStart: { x: 0, y: 0.5 },
    gradientEnd: { x: 1, y: 0.5 },
  },
  'DEFAULT': { // 기본값은 코드를 위한 것이므로 영어로 유지하는 것이 좋습니다.
    backgroundColor: '#f0f0f0',
    gradientColors: ['#f5f5f5', '#e0e0e0'],
    color: '#333333',
    shadowColor: 'transparent',
  },
};
