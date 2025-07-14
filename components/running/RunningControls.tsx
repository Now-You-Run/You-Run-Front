import * as Haptics from 'expo-haptics';
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface RunningControlsProps {
  isActive: boolean;
  isPaused: boolean;
  elapsedTime: number;
  isFinishPressed: boolean;
  finishProgress: number;
  progressAnimation: Animated.Value;
  scaleAnimation: Animated.Value;
  onMainPress: () => void;
  onFinishPressIn: () => void;
  onFinishPressOut: () => void;
  isReady?: boolean;
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
  isReady = true 
}) => {
  const mainLabel = isActive ? '정지' : isPaused ? '재개' : '시작';

  return (
    <View style={styles.buttonRow}>
      {(isPaused || (!isActive && elapsedTime > 0)) && (
        <Animated.View 
          style={[
            { flex: 1, marginHorizontal: 5 },
            { transform: [{ scale: scaleAnimation }] }
          ]}
        >
          <Pressable
            style={[
              styles.controlButton, 
              { 
                backgroundColor: isFinishPressed ? '#ff6b6b' : '#333',
                position: 'relative',
                overflow: 'hidden',
              }
            ]}
            onPressIn={() => {
              console.log('🔴 종료 버튼 눌림 시작');
              // ✅ 즉시 진동 피드백
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onFinishPressIn();
            }}
            onPressOut={() => {
              console.log('🔴 종료 버튼 눌림 종료');
              onFinishPressOut();
            }}
          >
            {/* 배경 프로그레스 바 */}
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                backgroundColor: '#ff4444',
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                opacity: isFinishPressed ? 0.3 : 0,
              }}
            />
            
            {/* 원형 프로그레스 인디케이터 */}
            {isFinishPressed && (
              <View style={styles.progressContainer}>
                <View style={styles.progressCircle}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        transform: [{
                          rotate: progressAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        }],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.controlText, { fontSize: 12 }]}>
                  {Math.round(finishProgress)}%
                </Text>
              </View>
            )}
            
            {/* 버튼 텍스트 */}
            <Text style={[
              styles.controlText,
              { 
                opacity: isFinishPressed ? 0.8 : 1,
                fontSize: isFinishPressed ? 14 : 18,
              }
            ]}>
              {isFinishPressed ? '종료 중...' : '종료'}
            </Text>
          </Pressable>
        </Animated.View>
      )}
      
      <Pressable
        onPress={onMainPress}
        style={[
          styles.controlButton, 
          { 
            backgroundColor: isActive ? '#ff4d4d' : '#007aff',
            // ✅ 준비되지 않았을 때 스타일 변경
            opacity: (!isActive && !isPaused && !isReady) ? 0.6 : 1
          }
        ]}
      >
        <Text style={styles.controlText}>
          {/* ✅ 준비되지 않았을 때 텍스트 변경 */}
          {(!isActive && !isPaused && !isReady) ? '준비 중...' : mainLabel}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around'
  },
  controlButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    position: 'relative',
  },
  controlText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  progressContainer: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
});
