// @/components/running/RunningControls.tsx

import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface RunningControlsProps {
  isActive: boolean;
  isPaused: boolean;
  elapsedTime: number;
  isFinishPressed: boolean;
  finishProgress: number; // This is now used for the progress text
  progressAnimation: Animated.Value;
  scaleAnimation: Animated.Value;
  onMainPress: () => void;
  onFinishPressIn: () => void;
  onFinishPressOut: () => void;
  isReady?: boolean; // GPS, 지도, 아바타 준비 상태
}

export const RunningControls: React.FC<RunningControlsProps> = ({
  isActive,
  isPaused,
  elapsedTime,
  isFinishPressed,
  finishProgress,
  progressAnimation,
  scaleAnimation,
  onMainPress,
  onFinishPressIn,
  onFinishPressOut,
  isReady = true,
}) => {
  const mainLabel = isActive ? '정지' : isPaused ? '재개' : '시작';

  // ✅ 1. 러닝 시작 전 상태: '시작' 버튼 하나만 크게 표시
  if (!isActive && elapsedTime === 0) {
    return (
      <View style={styles.buttonRow}>
        <Pressable
          onPress={onMainPress}
          style={({ pressed }) => [
            styles.singleButton,
            { backgroundColor: isReady ? '#007aff' : '#a9a9a9' },
            pressed && { opacity: 0.8 },
          ]}
          disabled={!isReady}
        >
          <Text style={styles.controlText}>{isReady ? mainLabel : '준비 중...'}</Text>
        </Pressable>
      </View>
    );
  }

  // ✅ 2. 러닝 진행 중 또는 일시정지 상태
  return (
    <View style={styles.buttonRow}>
      {/* '종료' 버튼: 일시정지 상태에서만 보임 */}
      {isPaused && (
        <Animated.View style={[{ flex: 1, marginHorizontal: 5 }, { transform: [{ scale: scaleAnimation }] }]}>
          <Pressable
            style={[
              styles.controlButton,
              { backgroundColor: '#333', overflow: 'hidden' }, // isFinishPressed에 따른 색상 변경 제거
            ]}
            onPressIn={onFinishPressIn}
            onPressOut={onFinishPressOut}
          >
            {/* 배경 프로그레스 바 */}
            <Animated.View
              style={[
                styles.progressFillBackground,
                {
                  width: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <Text style={styles.controlText}>
              {isFinishPressed ? '종료 중...' : '3초간 눌러 종료'}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* '정지' 또는 '재개' 버튼 */}
      <Pressable
        onPress={onMainPress}
        style={[
          styles.controlButton,
          { backgroundColor: isActive ? '#ff4d4d' : '#007aff' },
          // '정지' 버튼일 경우 (isPaused가 아닐 때) 전체 너비를 차지하도록 설정
          !isPaused && { flex: 1, width: '90%' },
        ]}
      >
        <Text style={styles.controlText}>{mainLabel}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center', // 중앙 정렬로 변경
    alignItems: 'center',
    marginTop: 20,
  },
  // ✅ 추가: 시작 전 단일 버튼 스타일
  singleButton: {
    flex: 1,
    maxWidth: '80%',
    paddingVertical: 18,
    borderRadius: 30, // 원형에 가깝게
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 18,
    borderRadius: 30, // 원형에 가깝게
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  controlText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    // 텍스트에 그림자 추가하여 가독성 향상
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // ✅ 수정: 배경 프로그레스 바 스타일
  progressFillBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 68, 68, 0.7)', // 반투명한 빨간색
  },
  // 불필요한 원형 프로그레스 스타일은 삭제
});
