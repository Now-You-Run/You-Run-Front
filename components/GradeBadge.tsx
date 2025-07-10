import { gradeStylesMap } from '@/styles/gradeStyles';
import { LinearGradient } from 'expo-linear-gradient'; // [1. Import] The new gradient component
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface GradeBadgeProps {
  grade: string;
  level: number;
}

const gradeDisplayNames: Record<string, string> = {
  IRON: '아이언',
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  DIAMOND: '다이아',
  MASTER: '마스터',
  GRAND_MASTER: '그랜드 마스터',
  LEGEND_RUNNER: '레전드 러너',
};

export default function GradeBadge({ grade, level }: GradeBadgeProps) {
  const style = gradeStylesMap[grade] || gradeStylesMap.DEFAULT;
  const displayName = grade

  return (
    // We wrap the component in a View to apply the shadow effect correctly
    <View
      style={[
        styles.badgeShadow,
        {
          shadowColor: style.shadowColor,
        },
      ]}
    >
      {/* [2. Replace] The View with LinearGradient for the background effect */}
      <LinearGradient
        colors={style.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.badgeContainer,
          {
            // Apply optional border
            borderColor: style.borderColor || 'transparent',
            borderWidth: style.borderColor ? 1.5 : 0,
          },
        ]}
      >
        {/* [3. Separate] The grade and level into two different Text components */}
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

