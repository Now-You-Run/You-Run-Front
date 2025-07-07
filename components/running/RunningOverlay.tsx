// /components/running/RunningOverlay.tsx

import { calculateInstantPace, formatTime } from '@/utils/RunningUtils'; // 1단계에서 만든 util 사용
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// 컴포넌트가 받을 props 타입 정의
interface Props {
  totalDistance: number;
  currentSpeed: number;
  elapsedTime: number;
  isActive: boolean;
  isPaused: boolean;
  onMainPress: () => void;
  onFinishPress: () => void;
}

export function RunningOverlay({ totalDistance, currentSpeed, elapsedTime, isActive, isPaused, onMainPress, onFinishPress }: Props) {
  const displaySpeed = currentSpeed > 0.1 ? currentSpeed : 0;
  const instantPace = calculateInstantPace(displaySpeed);
  const mainLabel = isActive ? '정지' : isPaused ? '재개' : '시작';

  return (
    <View style={styles.overlay}>
      <Text style={styles.distance}>{totalDistance.toFixed(2)} km</Text>
      <View style={styles.statsContainer}>
        <Text style={styles.stat}>{displaySpeed.toFixed(1)} km/h</Text>
        <Text style={styles.stat}>{formatTime(elapsedTime)} 시간</Text>
        <Text style={styles.stat}>{instantPace} 페이스</Text>
      </View>
      <View style={styles.buttonRow}>
        {(isPaused || (!isActive && elapsedTime > 0)) && (
          <Pressable style={[styles.controlButton, { backgroundColor: '#333' }]} onPress={onFinishPress}>
            <Text style={styles.controlText}>종료</Text>
          </Pressable>
        )}
        <Pressable onPress={onMainPress} style={[styles.controlButton, { backgroundColor: isActive ? '#ff4d4d' : '#007aff' }]}>
          <Text style={styles.controlText}>{mainLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// 여기에 RunningScreen의 styles 객체에서 필요한 부분만 복사
const styles = StyleSheet.create({
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  overlay: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  distance: {
    fontSize: 60,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
    marginBottom: 20,
  },
  stat: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  controlButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  controlText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    width: 220,
    marginTop: 10,
    fontSize: 16,
  },
});

