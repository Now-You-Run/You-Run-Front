import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
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
import ViewShot, { captureRef } from 'react-native-view-shot';
const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;

const MY_USER_ID = '1'; // ✅ 유저 아이디 고정

// ================= 스타일 =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  backButton: { fontSize: 24, color: '#333', marginBottom: 10 },
  qrWrapper: { alignItems: 'center', marginBottom: 10 },
  qrBackground: {
    backgroundColor: '#CDA9FF',
    padding: 15,
    borderRadius: 20,
    borderWidth: 2,
  },
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
  qrContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    position: 'absolute',
    top: -43,
    right: -40,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  refreshButton: {
    position: 'absolute',
    top: -43,
    right: 10,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
});

export default function SocialAdd() {
  const navigation = useNavigation();
  const screenRef = useRef(null);
  const [friendCode, setFriendCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const qrRef = useRef<QRCode | null>(null);

  // 서버에서 내 코드 가져오기
  useEffect(() => {
    const fetchMyCode = async () => {
      try {
        const response = await fetch(
          `${SERVER_API_URL}/api/user/${MY_USER_ID}/code`
        );
        if (!response.ok) {
          const text = await response.text();
          console.error('서버 응답 에러:', text);
          return;
        }
        const data = await response.json();
        console.log('내 코드 응답', data); // 디버깅용
        setMyCode(data.data); // 수정된 부분
      } catch (e) {
        console.error('코드 가져오기 실패:', e);
      }
    };
    fetchMyCode();
  }, []);

  // 서버에 QR코드 갱신 요청
  const refreshCodeFromServer = async () => {
    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/user/${MY_USER_ID}/qr-refresh`,
        { method: 'POST' }
      );
      if (!response.ok) {
        const text = await response.text();
        Alert.alert('갱신 실패', `코드 갱신에 실패했습니다: ${text}`);
        return;
      }
      const data = await response.json();
      setMyCode(data.data);
      Alert.alert('갱신 완료', '새로운 코드가 발급되었습니다.');
    } catch (error) {
      console.error(error);
      Alert.alert('오류', '코드 갱신 중 오류가 발생했습니다.');
    }
  };

  // 클립보드 복사
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(myCode);
    Alert.alert('복사 완료', '내 코드를 클립보드에 복사했습니다.');
  };

  // 화면 공유
  const shareFullScreen = async () => {
    try {
      const uri = await captureRef(screenRef, { format: 'png', quality: 0.9 });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('공유 불가', '이 기기에서 공유 기능을 사용할 수 없습니다.');
        return;
      }
      await Sharing.shareAsync(uri, { dialogTitle: '러닝 앱 QR 공유' });
    } catch (error) {
      console.error(error);
      Alert.alert('오류', '화면 공유 중 오류가 발생했습니다.');
    }
  };

  // 친구 요청 보내기 (코드로)
  const sendFriendRequest = async (codeParam?: string) => {
    const codeToSend = codeParam ?? friendCode;
    if (!codeToSend) {
      Alert.alert('오류', '친구 코드를 입력하거나 QR 코드를 스캔해주세요.');
      return;
    }

    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/friend/request-by-code?senderId=${MY_USER_ID}&code=${codeToSend}`,
        { method: 'POST' }
      );

      const text = await response.text();
      if (response.ok) {
        Alert.alert('친구 요청 완료', '상대방에게 친구 요청을 보냈습니다.');
        setFriendCode('');
      } else {
        Alert.alert('오류', `친구 요청 실패: ${text}`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('네트워크 오류', '친구 요청 실패');
    }
  };

  // 갤러리 접근 권한 체크
  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return false;
    }
    return true;
  };

  // 카메라 QR 스캔
  const uploadQRAndAddFriend = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const uri = result.assets[0].uri;

        // FormData 구성
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: 'qr_image.jpg',
          type: 'image/jpeg',
        } as any);

        const response = await fetch(`${SERVER_API_URL}/api/qrcode/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        const text = await response.text();
        console.log('서버 응답 원문:', text);

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          // JSON 파싱 실패 시, 응답이 순수 텍스트일 수도 있으니 그대로 data에 넣음
          data = { data: text.trim() };
        }

        if (response.ok) {
          Alert.alert('QR 인식 성공', `코드: ${data.data}`, [
            {
              text: '친구 요청 보내기',
              onPress: () => sendFriendRequest(data.data),
            },
            { text: '취소', style: 'cancel' },
          ]);
        } else {
          Alert.alert('QR 인식 실패', data.message || '인식 실패');
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('오류', 'QR 업로드/인식 중 오류가 발생했습니다.');
    }
  };

  return (
    <ViewShot
      ref={screenRef}
      options={{ format: 'png', quality: 0.9 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>

        <View style={styles.qrWrapper}>
          <View style={styles.qrContainer}>
            <View style={styles.qrBackground}>
              {myCode ? (
                <QRCode
                  value={myCode}
                  size={270}
                  color="black"
                  backgroundColor="white"
                  getRef={(c) => {
                    qrRef.current = c;
                  }}
                />
              ) : (
                <Text>코드가 없습니다</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={shareFullScreen}
              style={styles.shareButton}
            >
              <Ionicons name="share-social-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={refreshCodeFromServer}
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.myCodeWrapper}>
          <Text style={styles.label}>내 코드 :</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{myCode}</Text>
            <TouchableOpacity
              onPress={copyToClipboard}
              style={styles.copyButton}
            >
              <Ionicons name="copy-outline" size={20} color="#555" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.friendCodeWrapper}>
          <TouchableOpacity
            onPress={uploadQRAndAddFriend}
            style={styles.cameraButton}
          >
            <Ionicons name="camera" size={50} color="black" />
          </TouchableOpacity>
          <TextInput
            style={styles.friendCodeInput}
            placeholder="친구 코드 입력"
            value={friendCode}
            onChangeText={setFriendCode}
            keyboardType="default"
            maxLength={8}
          />
          <TouchableOpacity
            onPress={() => sendFriendRequest()}
            style={styles.copyButton}
          >
            <Ionicons name="add-circle-outline" size={30} color="#32CD32" />
          </TouchableOpacity>
        </View>
      </View>
    </ViewShot>
  );
}
