import React from 'react';
import { DimensionValue, StyleSheet, Text, View } from 'react-native';

interface BotDistanceDisplayProps {
  distanceMeters: number;
  isAhead: boolean;
  userProgress: number;
  totalDistance: number;
  isOffCourse?: boolean;
}

export const BotDistanceDisplay: React.FC<BotDistanceDisplayProps> = ({
  distanceMeters,
  isAhead,
  userProgress,
  totalDistance,
  isOffCourse = false,
}) => {
  const progressPercentage = totalDistance > 0 ? (userProgress / totalDistance) * 100 : 0;
  
  // ✅ 타입 안전한 width 계산
  const progressWidth = `${Math.min(progressPercentage, 100)}%` as DimensionValue;

  return (
    <View style={styles.container}>
      {/* 경로 이탈 경고 */}
      {isOffCourse && (
        <View style={styles.offCourseBanner}>
          <Text style={styles.offCourseText}>트랙 이탈! 복귀 후 러닝이 재개됩니다.</Text>
        </View>
      )}
      {/* 봇과의 거리 */}
      <View style={styles.botDistanceRow}>
        <Text style={styles.botDistanceLabel}>
          {isAhead ? '봇이 앞서고 있음' : '사용자가 앞서고 있음'}
        </Text>
        <Text style={[
          styles.botDistanceValue,
          { color: isAhead ? '#ff4444' : '#00C851' }
        ]}>
          {distanceMeters.toFixed(0)} m
        </Text>
      </View>

      {/* 진행률 표시 */}
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          진행률: {progressPercentage.toFixed(1)}%
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: progressWidth }  // ✅ 타입 안전한 width 사용
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  botDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  botDistanceLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  botDistanceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    minWidth: 80,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginLeft: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007aff',
    borderRadius: 3,
  },
  offCourseBanner: {
    backgroundColor: '#ff4444',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  offCourseText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});
