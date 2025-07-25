import { usePace } from '@/context/PaceContext';
import { saveBotPace } from '@/repositories/appStorage';
import { router, useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import WheelPicker from 'react-native-wheel-picker-expo';
import type { ItemType, RenderItemProps } from 'react-native-wheel-picker-expo/lib/typescript/types';
import { SourceType } from './TrackDetailScreen';

const { width } = Dimensions.get('window');

const FacePaceScreen: React.FC = () => {
  const { trackId, source } = useLocalSearchParams<{ trackId?: string; source: SourceType }>();
  const { setBotPace } = usePace();

  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showMessage, setShowMessage] = useState(true);
  const [isHelpMode, setIsHelpMode] = useState(false);
  const [minutesIndex, setMinutesIndex] = useState(0);
  const [secondsIndex, setSecondsIndex] = useState(0);
  const [showGuideMessage, setShowGuideMessage] = useState(false);
  const [currentBot, setCurrentBot] = useState('bot1');  // 현재 표시할 봇 애니메이션
  const [guideText, setGuideText] = useState('');  // 안내 메시지 텍스트
  const [showStar, setShowStar] = useState(false);
  const [userName, setUserName] = useState('');

  // 사용자 이름 가져오기
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SERVER_API_URL}/api/user?userId=1`
        );
        if (!response.ok) {
          throw new Error('네트워크 오류');
        }
        const json = await response.json();
        setUserName(json.data.name);
      } catch (e) {
        console.error('유저 이름 로드 실패:', e);
      }
    };

    fetchUserName();
  }, []);

  const minuteItems: ItemType[] = Array.from({ length: 60 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i
  }));

  const secondItems: ItemType[] = Array.from({ length: 60 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i
  }));

  useEffect(() => {
    // minutes가 변경될 때마다 해당 값의 인덱스를 찾아서 설정
    const index = minuteItems.findIndex(item => item.value === minutes);
    if (index !== -1) {
      setMinutesIndex(index);
    }
  }, [minutes, minuteItems]);

  useEffect(() => {
    // seconds가 변경될 때마다 해당 값의 인덱스를 찾아서 설정
    const index = secondItems.findIndex(item => item.value === seconds);
    if (index !== -1) {
      setSecondsIndex(index);
    }
  }, [seconds, secondItems]);

  useEffect(() => {
    const t = setTimeout(() => setShowMessage(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // 시간에 따른 봇 변경만 처리
  useEffect(() => {
    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds >= 600) { // 10분 00초 이상
      setCurrentBot('bot1');
      setShowStar(false);
    } else if (totalSeconds >= 420) { // 7분 00초 이상
      setCurrentBot('bot1');
      setShowStar(true);
    } else if (totalSeconds >= 300) { // 5분 00초 이상
      setCurrentBot('bot2');
      setShowStar(false);
    }
  }, [minutes, seconds]);

  const handleComplete = async () => {
    if (!trackId) return console.warn('Missing trackId');
    setBotPace({ minutes, seconds });
    await saveBotPace({ minutes, seconds });
    router.push({ pathname: '/RunningWithBot', params: { trackId, botMin: `${minutes}`, botSec: `${seconds}`, source } });
  };

  const handleBeginnerPress = () => {
    setMinutes(10);
    setSeconds(0);
    setCurrentBot('bot1');
    setShowStar(false);
    setGuideText('초급자 모드예요.\n10분에 1km를 달리는\n속도로 함께 달릴게요.');
    setShowGuideMessage(true);
    setTimeout(() => {
      setShowGuideMessage(false);
    }, 5000);  
  };

  const handleIntermediatePress = () => {
    setMinutes(7);
    setSeconds(0);
    setCurrentBot('bot1');
    setShowStar(true);
    setGuideText('중급자 모드예요.\n7분에 1km를 달리는\n속도로 함께 달릴게요.');
    setShowGuideMessage(true);
    setTimeout(() => {
      setShowGuideMessage(false);
    }, 5000);  
  };

  const handleAdvancedPress = () => {
    setMinutes(5);
    setSeconds(0);
    setCurrentBot('bot2');
    setShowStar(false);
    setGuideText('고급자 모드예요.\n5분에 1km를 달리는\n속도로 함께 달릴게요.');
    setShowGuideMessage(true);
    setTimeout(() => {
      setShowGuideMessage(false);
    }, 5000); 
  };


  const handleMinutesChange = ({ item }: { item: ItemType }) => {
    setMinutes(item.value);
    setShowGuideMessage(true);
    setTimeout(() => {
      setShowGuideMessage(false);
    }, 3000);
  };

  const handleSecondsChange = ({ item }: { item: ItemType }) => {
    setSeconds(item.value);
    setShowGuideMessage(true);
    setTimeout(() => {
      setShowGuideMessage(false);
    }, 3000);
  };

  const renderPickerItem = (props: RenderItemProps) => (
    <View style={styles.pickerItemContainer}>
      <Text style={styles.pickerItemText}>{props.label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <View style={styles.scrollContainer}>
        {/* header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Image source={require('@/assets/images/backButton.png')} style={styles.backButton} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpIconContainer}
            onPress={() => setIsHelpMode(!isHelpMode)}
          >
            <Image
              source={require('@/assets/images/helpbutton.png')}
              style={styles.helpIcon}
            />
          </TouchableOpacity>
        </View>

        {/* bot animation */}
        <View style={styles.botContainer}>
          <LottieView
            source={currentBot === 'bot1' 
              ? require('@/assets/lottie/bot1.json')
              : require('@/assets/lottie/bot2.json')}
            autoPlay
            loop
            style={styles.botAnimation}
          />
          {showStar && (
            <LottieView
              source={require('@/assets/lottie/star.json')}
              autoPlay
              loop
              style={styles.starAnimation}
            />
          )}
          {(showMessage || isHelpMode) && (
            <View style={[
              styles.messageBox,
              isHelpMode ? styles.helpMessageBox : styles.initialMessageBox
            ]}>
              <Text style={[
                styles.guideText,
                isHelpMode ? styles.helpGuideText : styles.initialGuideText
              ]}>
                {isHelpMode
                  ? `저는 ${userName}님의 옆에서 함께 달리며\n속도를 맞춰주는 페이스메이커예요.\n1km를 몇 분에 달리고 싶은지 설정하면 \n 제가 그 속도로 달릴게요.`
                  : `어떤 속도로 달려볼까요?`}
              </Text>
            </View>
          )}
          {showGuideMessage && (
            <View style={styles.guideMessage}>
              <Text style={styles.guideText}>{guideText}</Text>
            </View>
          )}
        </View>

        {/* wheel picker */}
        <View style={styles.pickerContainer}>
          <View style={styles.pickerWrapper}>
            <View style={styles.pickerWrap}>
              <WheelPicker
                items={minuteItems}
                onChange={({ item }) => setMinutes(item.value)}
                height={120}
                width={width * 0.3}
                backgroundColor="#FFFFFF"
                selectedStyle={{
                  borderColor: '#CCCCCC',
                  borderWidth: 1,
                }}
                renderItem={renderPickerItem}
                haptics={true}
                flatListProps={{
                  contentContainerStyle: {
                    paddingTop: 1,
                    paddingBottom: 120
                  }
                }}
                initialSelectedIndex={minutes}
                key={`minutes-${minutes}`}
              />
            </View>
            <Text style={styles.pickerLabel}>분</Text>
          </View>
          <View style={styles.pickerWrapper}>
            <View style={styles.pickerWrap}>
              <WheelPicker
                items={secondItems}
                onChange={({ item }) => setSeconds(item.value)}
                height={120}
                width={width * 0.3}
                backgroundColor="#FFFFFF"
                selectedStyle={{
                  borderColor: '#CCCCCC',
                  borderWidth: 1,
                }}
                renderItem={renderPickerItem}
                haptics={true}
                flatListProps={{
                  contentContainerStyle: {
                    paddingTop: 1,
                    paddingBottom: 120
                  }
                }}
                initialSelectedIndex={seconds}
                key={`seconds-${seconds}`}
              />
            </View>
            <Text style={styles.pickerLabel}>초</Text>
          </View>
        </View>

        {/* presets */}
        <View style={styles.presets}>
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: '#5EFFAE' }]}
            onPress={handleBeginnerPress}
          >
            <Text style={styles.presetText}>초</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: '#FFF79A' }]}
            onPress={handleIntermediatePress}
          >
            <Text style={styles.presetText}>중</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: '#FF9CF8' }]}
            onPress={handleAdvancedPress}
          >
            <Text style={styles.presetText}>고</Text>
          </TouchableOpacity>
        </View>

        {/* run button */}
        <TouchableOpacity style={styles.runBtn} onPress={handleComplete}>
          <Text style={styles.runText}>START</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    width: '100%',
    height: 56,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  helpIconContainer: {
    padding: 8,
  },
  helpIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  botContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    marginLeft: -180,  
  },
  botAnimation: {
    width: 200,
    height: 200,
  },
  starAnimation: {
    position: 'absolute',
    width: 250,  
    height: 250,  
    opacity: 0.8,
  },
  tooltip: {
    position: 'absolute',
    top: -10,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 12,
  },
  tooltipInit: {
    backgroundColor: '#e3f2fd',
  },
  tooltipHelp: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
    lineHeight: 22,
  },
  tooltipTextHelp: {
    color: '#000000',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  pickerWrapper: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  pickerWrap: {
    width: width * 0.3,
    height: 120,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
    overflow: 'hidden',
  },
  pickerItemContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 18,
    color: '#000000',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 8,
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 32,
    marginRight: 20,
    marginLeft: 25,
  },
  presetBtn: {
    width: 80,
    height: 80,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  presetText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  runBtn: {
    height: 90,
    marginTop: 40,
    backgroundColor: '#DDDDDD',
    paddingVertical: 18,
    paddingHorizontal: 80,
    borderRadius: 50,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  runText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 17,
  },
  guideMessage: {
    position: 'absolute',
    right: -170,
    top: '40%',
    transform: [{ translateY: -40 }],
    backgroundColor: 'rgba(248, 248, 248, 0.54)',
    padding: 20,
    paddingVertical: 25,
    borderRadius: 12,
    minWidth: 200,
    minHeight: 120,
    borderColor: '#DDDDDD',
    borderWidth: 1,
  },
  guideText: {
    fontSize: 18,
    color: '#000000',
    textAlign: 'center',
    fontWeight: 'semibold',
    lineHeight: 30,
  },
  initialGuideMessage: {
    position: 'absolute',
    right: -170,
    top: '40%',
    transform: [{ translateY: -40 }],
    backgroundColor: 'rgba(248, 248, 248, 0.54)',
    padding: 20,
    paddingVertical: 25,
    borderRadius: 12,
    minWidth: 200,
    minHeight: 80,
    borderColor: '#DDDDDD',
    borderWidth: 1,
  },
  messageBox: {
    position: 'absolute',
    right: -170,
    top: '40%',
    transform: [{ translateY: -40 }],
    padding: 20,
    paddingVertical: 25,
    borderRadius: 12,
    minWidth: 200,
  },
  initialMessageBox: {
    backgroundColor: 'rgba(248, 248, 248, 0.54)',
    minHeight: 80,
    borderColor: '#DDDDDD',
    borderWidth: 1,
  },
  helpMessageBox: {
    top: '10%',
    backgroundColor: '#FFFFFF',
    minHeight: 120,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  initialGuideText: {
    color: '#000000',
  },
  helpGuideText: {
    color: '#000000',
    fontSize: 18,
  },
});

export default FacePaceScreen;