import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import jsQR from 'jsqr';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;

export default function SocialAdd() {
  const navigation = useNavigation();
  const [friendCode, setFriendCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const qrRef = useRef<QRCode | null>(null);

  useEffect(() => {
    const initUserId = async () => {
      let savedId = await AsyncStorage.getItem('MY_USER_ID');
      if (!savedId) {
        savedId = '1';
        await AsyncStorage.setItem('MY_USER_ID', savedId);
      }
      setMyUserId(savedId);
    };
    initUserId();
  }, []);

  // ✅ QR 생성 보장
  useEffect(() => {
    if (myUserId) {
      generateNewCode();
    }
  }, [myUserId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          generateNewCode();
          return 30;
        } else {
          return prev - 1;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [myUserId]); // ✅ myUserId 의존성 추가해 안전하게 QR 재생성

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          generateNewCode();
          return 30;
        } else {
          return prev - 1;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const generateNewCode = () => {
    if (myUserId) {
      const timestamp = Date.now().toString();
      setMyCode(`${myUserId}_${timestamp}`); // 예: "1_1720450192593"
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(myCode);
    Alert.alert('복사 완료', '내 코드를 클립보드에 복사했습니다.');
  };

  const shareQRCode = async () => {
    if (qrRef.current) {
      (qrRef.current as any).toDataURL(async (dataURL: string) => {
        try {
          const filename = FileSystem.cacheDirectory + 'my_qr_code.png';
          await FileSystem.writeAsStringAsync(filename, dataURL, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (!(await Sharing.isAvailableAsync())) {
            Alert.alert(
              '공유 불가',
              '이 기기에서 공유 기능을 사용할 수 없습니다.'
            );
            return;
          }

          await Sharing.shareAsync(filename, {
            dialogTitle: '내 QR 코드 공유하기',
          });
          await Clipboard.setStringAsync(`${myCode}`);
          Alert.alert('안내', '친구에게 QR을 공유하고 함께 달려보세요!');
        } catch (error) {
          console.error(error);
          Alert.alert('오류', 'QR 코드 공유 중 오류가 발생했습니다.');
        }
      });
    }
  };

  const sendFriendRequest = async () => {
    if (!friendCode) {
      Alert.alert('오류', '친구 코드를 입력하거나 QR 코드를 스캔해주세요.');
      return;
    }

    try {
      const senderId = 1; // 고정
      const otherId = friendCode;

      const response = await fetch(
        `${SERVER_API_URL}/api/friend?senderId=${senderId}&otherId=${otherId}`,
        { method: 'POST' }
      );

      const text = await response.text();

      if (response.ok) {
        Alert.alert('친구 요청 완료', '상대방에게 친구 요청을 보냈습니다.');
        setFriendCode('');
      } else {
        Alert.alert(
          '오류',
          `친구 요청 중 문제가 발생했습니다.\n상태: ${response.status}\n메시지: ${text}`
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('네트워크 오류', '친구 요청 실패');
    }
  };

  const openCameraAndScanQR = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('권한 필요', '카메라 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64 = result.assets[0].base64;
        const rawData = Uint8ClampedArray.from(atob(base64), (c) =>
          c.charCodeAt(0)
        );
        const size = Math.sqrt(rawData.length / 4);
        const imageData = { data: rawData, width: size, height: size };

        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
        if (qrCode && qrCode.data) {
          setFriendCode(qrCode.data);
          Alert.alert(
            'QR 스캔 완료',
            `코드를 자동으로 입력했습니다: ${qrCode.data}`
          );
          await sendFriendRequest();
        } else {
          Alert.alert('QR 인식 실패', 'QR 코드를 인식하지 못했습니다.');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('오류', 'QR 스캔 중 오류가 발생했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>←</Text>
      </TouchableOpacity>

      <View style={styles.qrWrapper}>
        <View style={styles.qrBackground}>
          {myCode !== '' && (
            <QRCode
              value={myCode}
              size={150}
              color="black"
              backgroundColor="white"
              getRef={(c) => {
                qrRef.current = c;
              }}
            />
          )}
        </View>
        <Text style={styles.timerText}>⏱️ {remainingSeconds}s 후 갱신</Text>
      </View>

      <View style={styles.myCodeWrapper}>
        <Text style={styles.label}>내 코드 :</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{myCode}</Text>
          <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={20} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareQRCode} style={styles.copyButton}>
            <Ionicons name="share-social-outline" size={20} color="#555" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.friendCodeWrapper}>
        <TouchableOpacity
          onPress={openCameraAndScanQR}
          style={styles.cameraButton}
        >
          <Ionicons name="camera" size={30} color="black" />
        </TouchableOpacity>

        <TextInput
          style={styles.friendCodeInput}
          placeholder="친구 코드:"
          value={friendCode}
          onChangeText={setFriendCode}
          keyboardType="numeric"
          maxLength={3}
        />

        <TouchableOpacity onPress={sendFriendRequest} style={styles.copyButton}>
          <Ionicons name="add-circle-outline" size={30} color="#32CD32" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ================= 스타일 =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  backButton: { fontSize: 24, color: '#333', marginBottom: 10 },
  userIdText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  qrWrapper: { alignItems: 'center', marginBottom: 10 },
  qrBackground: {
    backgroundColor: '#CDA9FF',
    padding: 15,
    borderRadius: 20,
    borderWidth: 2,
  },
  timerText: { marginTop: 6, fontSize: 12, color: '#666' },
  myCodeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    justifyContent: 'center',
  },
  label: { fontSize: 18, marginRight: 10 },
  codeBox: {
    flexDirection: 'row',
    backgroundColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  codeText: { fontWeight: 'bold', fontSize: 18, letterSpacing: 2 },
  copyButton: { marginLeft: 10 },
  friendCodeWrapper: { flexDirection: 'row', alignItems: 'center' },
  cameraButton: {
    backgroundColor: '#eee',
    padding: 15,
    borderRadius: 40,
    marginRight: 15,
  },
  friendCodeInput: {
    flex: 1,
    fontSize: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 5,
    textAlign: 'center',
  },
});
