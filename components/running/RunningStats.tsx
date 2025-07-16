import { formatTime } from '@/utils/RunningUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RunningStatsProps {
  totalDistance: number;
  displaySpeed: number;
  elapsedTime: number;
}

// 평균 페이스 계산 함수 (min/km)
function calculateAveragePace(elapsedTime: number, totalDistance: number): string {
  if (totalDistance <= 0 || elapsedTime <= 0) return '-';
  const paceSecPerKm = elapsedTime / totalDistance;
  const min = Math.floor(paceSecPerKm / 60);
  const sec = Math.round(paceSecPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')} /km`;
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
      <View style={styles.statsContainer}>
        {/* <Text style={styles.stat}>{displaySpeed.toFixed(1)} km/h</Text> */}
        <Text style={styles.stat}>{formatTime(elapsedTime)}</Text>
        <Text style={styles.stat}>{avgPace}</Text>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
    marginBottom: 20
  },
  stat: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1
  }
});
