import BackButton from '@/components/button/BackButton';
import { usePace } from '@/context/PaceContext';
import { saveBotPace } from '@/repositories/appStorage';
import { router, useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
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
    const t = setTimeout(() => setShowMessage(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleComplete = async () => {
    if (!trackId) return console.warn('Missing trackId');
    setBotPace({ minutes, seconds });
    await saveBotPace({ minutes, seconds });
    router.push({ pathname: '/RunningWithBot', params: { trackId, botMin: `${minutes}`, botSec: `${seconds}`, source } });
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
          <View style={styles.backWrapper}>
            <BackButton onPress={() => router.back()} />
          </View>
          <TouchableOpacity
            style={styles.helpWrapper}
            onPress={() => setIsHelpMode(h => !h)}
          >
            <Text style={styles.helpIcon}>?</Text>
          </TouchableOpacity>
        </View>

        {/* bot animation */}
        <View style={styles.botContainer}>
          <LottieView
            source={require('@/assets/lottie/bot1.json')}
            autoPlay
            loop
            style={styles.botAnimation}
          />
          {(showMessage || isHelpMode) && (
            <View style={[styles.tooltip, isHelpMode ? styles.tooltipHelp : styles.tooltipInit]}>
              <Text style={[styles.tooltipText, isHelpMode && styles.tooltipTextHelp]}>
                {isHelpMode
                  ? '설정하신 페이스대로 \n봇이 움직일 예정입니다.\n실력에 맞게 설정하고, 따라가세요!'
                  : '봇의 페이스를 설정해주세요.'}
              </Text>
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
                  borderColor: '#007AFF',
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
                  borderColor: '#007AFF',
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
            style={[styles.presetBtn, { backgroundColor: '#D0F0FC' }]}
            onPress={() => { setMinutes(10); setSeconds(0); }}
          >
            <Text style={styles.presetText}>초</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: '#FFE7B3' }]}
            onPress={() => { setMinutes(7); setSeconds(0); }}
          >
            <Text style={styles.presetText}>중</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: '#FFCCD4' }]}
            onPress={() => { setMinutes(5); setSeconds(0); }}
          >
            <Text style={styles.presetText}>고</Text>
          </TouchableOpacity>
        </View>

        {/* run button */}
        <TouchableOpacity style={styles.runBtn} onPress={handleComplete}>
          <Text style={styles.runText}>달리기</Text>
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
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    width: '100%',
    height: 44,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  helpWrapper: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  helpIcon: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#e91e63',
    right: 0,
    top: 10
  },
  botContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  botAnimation: {
    width: 200,
    height: 200,
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
    backgroundColor: '#fff9c4',
  },
  tooltipText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
    lineHeight: 22,
  },
  tooltipTextHelp: {
    color: '#f57c00',
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
    color: '#333',
    textAlign: 'center',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
        elevation: 5,
      },
    }),
  },
  presetText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  runBtn: {
    height: 90,
    marginTop: 50,
    backgroundColor: '#5EFFAE',
    paddingVertical: 18,
    paddingHorizontal: 80,
    borderRadius: 50,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0.05, height: 0.05 },
        shadowOpacity: 0,
        shadowRadius: 3.0,
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
});

export default FacePaceScreen;