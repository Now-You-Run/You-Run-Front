import { formatTime } from '@/utils/RunningUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RunningStatsProps {
  totalDistance: number;
  displaySpeed: number;
  elapsedTime: number;
}

// 평균 페이스 계산 함수 (5'00 형식)
function calculateAveragePace(elapsedTime: number, totalDistance: number): string {
  if (totalDistance <= 0 || elapsedTime <= 0) return '-';
  const paceSecPerKm = elapsedTime / totalDistance;
  const min = Math.floor(paceSecPerKm / 60);
  const sec = Math.round(paceSecPerKm % 60);
  return `${min}'${sec.toString().padStart(2, '0')}`;
}

export const RunningStats = React.memo(function RunningStats({
  totalDistance,
  displaySpeed,
  elapsedTime
}: RunningStatsProps) {
  // const instantPace = calculateInstantPace(displaySpeed);
  const avgPace = calculateAveragePace(elapsedTime, totalDistance);
  return (
    <View style={styles.container}>
      <Text style={styles.distance}>{totalDistance.toFixed(2)} km</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>평균 페이스</Text>
          <Text style={styles.statValue}>{avgPace}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>경과 시간</Text>
          <Text style={styles.statValue}>{formatTime(elapsedTime)}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  distance: {
    fontSize: 60,
    fontWeight: '800',
    color: '#1c1c1e'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  statBlock: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
});
