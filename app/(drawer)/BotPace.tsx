import { usePace } from '@/context/PaceContext';
import { saveBotPace } from '@/repositories/appStorage';
import { Picker } from '@react-native-picker/picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SourceType } from './TrackDetailScreen';

export type RootStackParamList = {
  SelectTrack: undefined;
  BotPace: { trackId: string };
  RunningWithBot: { trackId: string; botMin: string; botSec: string;};
};

interface FacePaceScreenProps {}

const FacePaceScreen: React.FC<FacePaceScreenProps> = () => {
  const { trackId, source} = useLocalSearchParams<{
    trackId?: string;
    source: SourceType
  }>();
    
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [showMessage, setShowMessage] = useState<boolean>(true);
  const [isHelpMode, setIsHelpMode] = useState<boolean>(false);

  // Context 사용
  const { setBotPace } = usePace();

  // 컴포넌트 마운트 시 3초 후 메시지 자동 사라지기
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMessage(false);
    }, 3000); // 3초 후 사라짐

    return () => clearTimeout(timer);
  }, []);

  const formatTime = (time: number): string => {
    return time.toString().padStart(2, '0');
  };

  const handleHelpPress = () => {
    if (isHelpMode) {
      // 도움말 모드 끄기
      setIsHelpMode(false);
    } else {
      // 도움말 모드 켜기
      setIsHelpMode(true);
    }
  };

  const handleComplete = async () => {
    if (!trackId ) {
      console.warn('trackId가 없습니다. 이전 페이지 로직을 확인하세요.');
      return;
    }

    // Context에 페이스 설정 저장
    setBotPace({ minutes, seconds });
    // 추가: AsyncStorage에도 저장
    await saveBotPace({ minutes, seconds });
   
    console.log(`페이스 설정: ${minutes}분 ${seconds}초`);

    // running-with-bot.tsx로 이동
    // 트랙 아이디 넘겨주기 + 속도 데이터 -> running-with-bot.tsx
    router.push({
      pathname: '/RunningWithBot',
      params: {
        trackId,
        botMin: minutes.toString(),
        botSec: seconds.toString(),
        source: source,
      },
    });
  };

  const handleBackPress = () => {
    router.back();
  };
 
  const getInitialMessage = (): string => {
    return '봇의 페이스를\n 설정해주세요.';
  };

  const getHelpMessage = (): string => {
    return '설정하신 페이스대로\n 봇이 움직일 예정입니다. \n실력에 맞게 봇의 페이스를 설정하고, 따라가세요! ';
  };

  // 분과 초를 위한 배열 생성
  const minutesArray = Array.from({ length: 60 }, (_, i) => i);
  const secondsArray = Array.from({ length: 60 }, (_, i) => i);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Image
            source={require('@/assets/images/backButton.png')}
            style={styles.backButtonIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.helpButton} onPress={handleHelpPress}>
          <Text style={styles.helpButtonText}>?</Text>
        </TouchableOpacity>
      </View>
    
      <Image
        source={require('@/assets/images/bot.png')}
        style={styles.botImage}
        resizeMode="contain"
      />
      
      {/* Character and Message */}
      <View style={styles.messageContainer}>
        {/* 3초 후 사라지는 초기 메시지 */}
        {showMessage && !isHelpMode && (
          <View style={styles.initialMessageOverlay}>
            <Text style={styles.initialMessageText}>{getInitialMessage()}</Text>
          </View>
        )}
        
        {/* 도움말 메시지 */}
        {isHelpMode && (
          <View style={styles.helpMessageOverlay}>
            <Text style={styles.helpMessageText}>{getHelpMessage()}</Text>
          </View>
        )}
      </View>

      {/* Time Selector with Wheel Picker */}
      <View style={styles.timeContainer}>
        <View style={styles.pickerSection}>
          <Text style={styles.timeLabel}>분</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={minutes}
              style={styles.picker}
              onValueChange={(itemValue) => setMinutes(itemValue)}
              itemStyle={styles.pickerItem}
            >
              {minutesArray.map((minute) => (
                <Picker.Item
                  key={minute}
                  label={formatTime(minute)}
                  value={minute}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.pickerSection}>
          <Text style={styles.timeLabel}>초</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={seconds}
              style={styles.picker}
              onValueChange={(itemValue) => setSeconds(itemValue)}
              itemStyle={styles.pickerItem}
            >
              {secondsArray.map((second) => (
                <Picker.Item
                  key={second}
                  label={formatTime(second)}
                  value={second}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* 난이도 프리셋 버튼 */}
      <View style={styles.levelPresetContainer}>
        <TouchableOpacity
          style={[styles.levelButton, { backgroundColor: '#e0f7fa' }]}
          onPress={() => { setMinutes(10); setSeconds(0); }}
        >
          <Text style={styles.levelButtonText}>초급자 (10분)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.levelButton, { backgroundColor: '#ffe0b2' }]}
          onPress={() => { setMinutes(7); setSeconds(0); }}
        >
          <Text style={styles.levelButtonText}>중급자 (7분)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.levelButton, { backgroundColor: '#ffcdd2' }]}
          onPress={() => { setMinutes(5); setSeconds(0); }}
        >
          <Text style={styles.levelButtonText}>고급자 (5분)</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Time Display */}
      <View style={styles.selectedTimeContainer}>
        <Text style={styles.selectedTimeText}>
          봇의 페이스: {formatTime(minutes)}분 {formatTime(seconds)}초
        </Text>
      </View>

      {/* Complete Button */}
      <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
        <Text style={styles.completeButtonText}>달리기</Text>
      </TouchableOpacity>
    </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  backButtonIcon: {
    width: 32,
    height: 32,
  },
  helpButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#ffebee',
  },
  helpButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  botImage: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    marginVertical: 18,
  },
  messageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  initialMessageOverlay: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  initialMessageText: {
    fontSize: 20,
    color: '#1976d2',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  helpMessageOverlay: {
    backgroundColor: '#fffde7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  helpMessageText: {
    fontSize: 18,
    color: '#f57c00',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
    width: '100%',
  },
  pickerSection: {
    alignItems: 'center',
    marginHorizontal: 12,
    flex: 1,
  },
  timeLabel: {
    fontSize: 18,
    color: '#333',
    marginBottom: 6,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    overflow: 'hidden',
    width: 110,
    height: 60,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    width: 110,
    height: 60,
  },
  pickerItem: {
    fontSize: 22,
    textAlign: 'center',
  },
  levelPresetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
    width: '100%',
    paddingHorizontal: 0,
  },
  levelButton: {
    width: 110,
    paddingVertical: 16,
    borderRadius: 22,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
  },
  levelButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedTimeContainer: {
    marginTop: 12,
    marginBottom: 20,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'center',
  },
  selectedTimeText: {
    fontSize: 20,
    color: '#388e3c',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  completeButton: {
    marginTop: 18,
    backgroundColor: '#b9f6ca',
    borderRadius: 60,
    paddingVertical: 26,
    paddingHorizontal: 70,
    alignItems: 'center',
    alignSelf: 'center',
    elevation: 2,
    width: 220,
  },
  completeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
});

export default FacePaceScreen;