import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
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

export const RunningControls = React.memo(function RunningControls({
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
}: RunningControlsProps) {
  const lottieRef = useRef<LottieView>(null);
  const progress = finishProgress / 100; // 0-1 사이 값으로 변환

  useEffect(() => {
    if (lottieRef.current) {
      if (isFinishPressed) {
        lottieRef.current.play();
      } else {
        lottieRef.current.reset();
      }
    }
  }, [isFinishPressed]);

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
                overflow: 'hidden',
                backgroundColor: isFinishPressed ? 'transparent' : '#333'
              }
            ]}
            onPressIn={() => {
              console.log('🔴 종료 버튼 누름 시작');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onFinishPressIn();
            }}
            onPressOut={() => {
              console.log('🔴 종료 버튼 누름 종료');
              onFinishPressOut();
            }}
          >
            {isFinishPressed && (
              <LinearGradient
                colors={['#00D4FF', '#8A2BE2', '#FF1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                opacity: isFinishPressed ? 0.3 : 0,
              }}
            />
            
            {isFinishPressed && (
              <View style={styles.progressContainer}>
                <LottieView
                  ref={lottieRef}
                  source={require('../../assets/lottie/progress.json')}
                  style={styles.lottieProgress}
                  progress={progress}
                  autoPlay={false}
                  loop={false}
                />
                <Text style={[styles.controlText, { fontSize: 12 }]}>
                  {Math.round(finishProgress)}%
                </Text>
              </View>
            )}
            <Text style={[
              styles.controlText,
              { 
                fontSize: 18,
                color: '#ffffff'
              }
            ]}>
              {isFinishPressed ? '종료 중...' : '종료'}
            </Text>
          </Pressable>
        </Animated.View>
      )}
      <Pressable
        onPress={onMainPress}
        style={[styles.controlButton, { backgroundColor: isActive ? 'black' : '#5EFFAE' }]}
      >
        <Text style={[styles.controlText, {color: isActive ? '#5EFFAE' : 'black'}]}>{mainLabel}</Text>
      </Pressable>
    </View>
  );
});

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
  lottieProgress: {
    width: 30,
    height: 30
  }
});
