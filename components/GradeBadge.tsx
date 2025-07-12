import { gradeStylesMap } from '@/styles/gradeStyles';
import { UserGrades } from '@/types/Grades';
import { LinearGradient } from 'expo-linear-gradient'; // [1. Import] The new gradient component
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface GradeBadgeProps {
  grade: string;
  level: number;
}
export default function GradeBadge({ grade, level }: GradeBadgeProps) {
  // 1. 한글 이름(prop)으로 gradeInfo 객체 찾기
  const gradeInfo = UserGrades.find(g => g.displayName === grade);

  // 2. 찾은 객체의 영어 이름(name)으로 스타일 Key 결정
  const styleKey = gradeInfo ? gradeInfo.name : 'DEFAULT';

  // 3. 결정된 Key로 실제 스타일 조회
  const style = gradeStylesMap[styleKey] || gradeStylesMap.DEFAULT;

  // 4. 화면에는 prop으로 받은 한글 이름을 그대로 표시
  const displayName = grade;

  return (
    <View style={[styles.badgeShadow, { shadowColor: style.shadowColor }]}>
      <LinearGradient
        colors={style.gradientColors}
        start={style.gradientStart || { x: 0, y: 0 }}
        end={style.gradientEnd || { x: 1, y: 1 }}
        style={[styles.badgeContainer, { borderColor: style.borderColor || 'transparent', borderWidth: style.borderColor ? 1.5 : 0 }]}
      >
        <Text style={[styles.gradeText, { color: style.color }]}>{displayName}</Text>
        <Text style={[styles.levelText, { color: style.color }]}>Lv. {level}</Text>
      </LinearGradient>
    </View>
  );
}

// [4. Update] The styles for the new layout
const styles = StyleSheet.create({
  badgeShadow: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8, // for Android
     alignSelf: 'flex-start'
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline', // Aligns the bottom of the texts for a clean look
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  gradeText: {
    fontWeight: '800', // Make the grade name bolder
    fontSize: 14,
    marginRight: 6, // Add space between grade and level
  },
  levelText: {
    fontWeight: '500',
    fontSize: 12, // Make the level slightly smaller
    opacity: 0.9,
  },
});

