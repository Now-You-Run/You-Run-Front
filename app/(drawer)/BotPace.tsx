import { usePace } from '@/context/PaceContext';
import { saveBotPace } from '@/repositories/appStorage';
import { Picker } from '@react-native-picker/picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SourceType } from './TrackDetailScreen';


const { width, height } = Dimensions.get('window');
const PICKER_HEIGHT = Math.max(100, Math.min(height * 0.1, 110));

const FacePaceScreen: React.FC = () => {
  const { trackId, source } = useLocalSearchParams<{ trackId?: string; source: SourceType }>();
  const { setBotPace } = usePace();

  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showMessage, setShowMessage] = useState(true);
  const [isHelpMode, setIsHelpMode] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowMessage(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const fmt = (n: number) => n.toString().padStart(2, '0');
  const handleComplete = async () => {
    if (!trackId) return console.warn('Missing trackId');
    setBotPace({ minutes, seconds });
    await saveBotPace({ minutes, seconds });
    router.push({ pathname: '/RunningWithBot', params: { trackId, botMin: `${minutes}`, botSec: `${seconds}`, source } });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fafafa" />

      {/* ScrollView로 감싸기 */}
      <ScrollView
       contentContainerStyle={styles.scrollContainer}
       showsVerticalScrollIndicator={false}
      >
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Image source={require('@/assets/images/backButton.png')} style={styles.icon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsHelpMode(prev => !prev)} style={styles.iconBtn}>
          <Text style={styles.helpIcon}>?</Text>
        </TouchableOpacity>
      </View>

      {/* bot & message */}
      <View style={styles.botCard}>
        <Image source={require('@/assets/images/bot.png')} style={styles.botImg} resizeMode="contain" />
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

      {/* picker */}
      <View style={styles.pickerRow}>
        {['분', '초'].map((lbl, idx) => (
          <View key={lbl} style={styles.pickerBlock}>
            <Text style={styles.pickerLabel}>{lbl}</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={idx === 0 ? minutes : seconds}
                style={styles.picker}
                onValueChange={v => idx === 0 ? setMinutes(v) : setSeconds(v)}
                mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <Picker.Item key={i} label={fmt(i)} value={i} />
                ))}
              </Picker>
            </View>
          </View>
        ))}
      </View>

      {/* presets */}
      <View style={styles.presets}>
        {[{ m:10, s:0, label:'초급자\n(10분)' , bg:'#d0f0fc'},
          { m:7,  s:0, label:'중급자\n(7분)'  , bg:'#ffe7b3'},
          { m:5,  s:0, label:'고급자\n(5분)'  , bg:'#ffccd4'}].map(p => (
          <TouchableOpacity
            key={p.label}
            style={[styles.presetBtn, { backgroundColor: p.bg }]}
            onPress={() => { setMinutes(p.m); setSeconds(p.s); }}
          >
            <Text style={styles.presetText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* selected */}
      <View style={styles.selected}>
        <Text style={styles.selectedText}>
          봇의 페이스: {fmt(minutes)}분 {fmt(seconds)}초
        </Text>
      </View>

      {/* run */}
      <TouchableOpacity style={styles.runBtn} onPress={handleComplete}>
        <Text style={styles.runText}>달리기</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    // 필요에 따라 paddingBottom 추가
    paddingBottom: 40,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  icon: {
    width: 28,
    height: 28,
  },
  helpIcon: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#e91e63',
  },

  botCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 12,
  },
  botImg: {
    width: 180,
    height: 180,
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

  pickerRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  pickerBlock: {
    alignItems: 'center',
    flex: 1,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 6,
    fontWeight: '500',
  },
  pickerWrap: {
    width: width * 0.3,
    height: Platform.OS === 'android' ? 10 : PICKER_HEIGHT + 80,    // 카드 높이 좀 더
    backgroundColor: '#ffffff',
    borderRadius: 20,                // 좀 더 둥글게
    borderWidth: 1,
    borderColor: '#ececec',          // 은은한 테두리
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    paddingBottom: 50
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'android' ? 200 : '100%',
    marginTop: Platform.OS === 'android' ? 50 : 0, // 숫자가 중심에 오도록
    transform: Platform.OS === 'android' ? [] : [{ scaleY: 0.85 }],
  },

  presets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 32,
  },
  presetBtn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },

  selected: {
    marginTop: 28,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  selectedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#388e3c',
  },

  runBtn: {
    marginTop: 24,
    backgroundColor: '#a8e6cf',
    paddingVertical: 18,
    paddingHorizontal: 80,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  runText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22543d',
  },
});

export default FacePaceScreen;