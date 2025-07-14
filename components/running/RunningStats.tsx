import { calculateInstantPace, formatTime } from '@/utils/RunningUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RunningStatsProps {
  totalDistance: number;
  displaySpeed: number;
  elapsedTime: number;
}

export const RunningStats: React.FC<RunningStatsProps> = ({
  totalDistance,
  displaySpeed,
  elapsedTime
}) => {
  const instantPace = calculateInstantPace(displaySpeed);

  return (
    <View style={styles.container}>
      <Text style={styles.distance}>{totalDistance.toFixed(2)} km</Text>
      <View style={styles.statsContainer}>
        <Text style={styles.stat}>{displaySpeed.toFixed(1)} km/h</Text>
        <Text style={styles.stat}>{formatTime(elapsedTime)}</Text>
        <Text style={styles.stat}>{instantPace}</Text>
      </View>
    </View>
  );
};

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
