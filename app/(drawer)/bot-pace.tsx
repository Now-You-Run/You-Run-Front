import { usePace } from '@/context/PaceContext';
import { saveBotPace } from '@/storage/appStorage';
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

export type RootStackParamList = {
  SelectTrack: undefined;
  BotPace: { trackId: string };
  RunningWithBot: { trackId: string };
};

interface FacePaceScreenProps {}

const FacePaceScreen: React.FC<FacePaceScreenProps> = () => {
  // RankingPage.tsx에서 속도 데이터 받기
  const { trackId, avgPaceMinutes, avgPaceSeconds } = useLocalSearchParams<{
    trackId?: string;
    avgPaceMinutes?: string;
    avgPaceSeconds?: string;
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
    if (!trackId) {
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
        avgPaceMinutes,
        avgPaceSeconds,
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
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  backButtonIcon: {
    width: 24,
    height: 24,
  },
  helpButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  initialMessageOverlay: {
   position: 'absolute',
    bottom: 100,
    backgroundColor: '#E9E9E9', 
    opacity: 0.9,
    paddingTop: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: 320,
    height: 180,
    zIndex: 10,
    alignSelf: 'center',
  },
  initialMessageText: {
    fontFamily: 'System',
    fontSize: 27,
    color: '#333', // 진한 분홍색 텍스트
    textAlign: 'center',
    lineHeight: 40,
    fontWeight: 'bold',
    paddingTop:35,
  },
  // 🎨 도움말 메시지 스타일
  helpMessageOverlay: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: '#E9E9E9', 
    opacity: 0.9,
    paddingTop: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: 320,
    height: 180,
    zIndex: 10,
    alignSelf: 'center',
  },
  helpMessageText: {
    fontFamily: 'System',
    fontSize: 19,
    color: '#333', 
    textAlign: 'center',
    lineHeight: 28,
    paddingTop: 18,
    fontWeight: '500',
  },
  botImage: {
    width: 400,
    height: 300,
    marginBottom: -50,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
  },
  pickerSection: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    width: 120,
  },
  picker: {
    height: 120,
    width: '100%',
  },
  pickerItem: {
    fontSize: 18,
    height: 120,
  },
  selectedTimeContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
  },
  selectedTimeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#5EFFAE',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  completeButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default FacePaceScreen;