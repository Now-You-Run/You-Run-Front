import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { READY_PLAYER_ME_CONFIG } from '@/config/ReadyPlayerMe';

interface Avatar {
  id: string;
  url: string;
  createdAt: string;
  bodyType?: string;
  isDefault?: boolean;
}

interface AvatarCreatorProps {
  visible: boolean;
  onClose: () => void;
  onAvatarCreated?: (avatarData: Avatar) => void;
  bodyType?: 'fullbody' | 'halfbody';
  language?: string;
}

const AvatarCreator: React.FC<AvatarCreatorProps> = ({ 
  visible, 
  onClose, 
  onAvatarCreated,
  bodyType = 'fullbody',
  language = 'korean'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  
   const createOptimizedUrl = () => {
  const params = new URLSearchParams({
    frameApi: 'true',
    bodyType: bodyType,
    language: language,
    
    // 🎯 기존 파라미터들
    quickStart: 'true',
    skipIntro: 'true',
    selectBodyType: 'false',
    clearCache: 'false',
    
    // 🎯 추가 파라미터들
    anonymous: 'true',          // 로그인 없이 바로 생성
    hideUI: 'false',           // UI 숨기지 않음
    optimize: 'true',          // 최적화 모드
    autoStart: 'true',         // 자동 시작
    flow: 'create'             // 바로 생성 플로우로
  });

  return `https://${READY_PLAYER_ME_CONFIG.SUBDOMAIN}.readyplayer.me?${params.toString()}`;
};

  const avatarCreatorUrl = createOptimizedUrl();

  // 디버깅용 로그
  console.log('🔗 최적화된 URL:', avatarCreatorUrl);


  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('ReadyPlayerMe Event:', message);
      
      switch (message.eventName) {
        case 'v1.frame.ready':
          console.log('ReadyPlayerMe frame is ready');
          setIsLoading(false);
          break;
          
        case 'v1.avatar.exported':
          console.log('Avatar exported:', message.data);
          handleAvatarCreated(message.data);
          break;
          
        case 'v1.user.set':
          console.log('User set:', message.data);
          break;
          
        default:
          console.log('Unknown event:', message.eventName);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  const handleAvatarCreated = async (data: { url: string; id: string }) => {
    const { url, id } = data;
    
    try {
      
      const avatarData: Avatar = {
        id,
        url,
        createdAt: new Date().toISOString(),
        bodyType,
        isDefault: true 
      };

      await saveAvatarToLocal(avatarData);
      
     
      if (onAvatarCreated) {
        onAvatarCreated(avatarData);
      }
      
      Alert.alert(
        '아바타 생성 완료',
        '아바타가 성공적으로 생성되었습니다!',
        [
          { 
            text: '확인', 
            onPress: () => {
              onClose();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error handling avatar creation:', error);
      Alert.alert('오류', '아바타 저장 중 오류가 발생했습니다.');
    }
  };

  const saveAvatarToLocal = async (avatarData: Avatar) => {
    try {
    
      const existingAvatarsJson = await AsyncStorage.getItem('@avatars');
      const existingAvatars: Avatar[] = existingAvatarsJson ? JSON.parse(existingAvatarsJson) : [];
      
    
      const updatedAvatars = [...existingAvatars, avatarData];
      

      await AsyncStorage.setItem('@avatars', JSON.stringify(updatedAvatars));
      

      await AsyncStorage.setItem('@defaultAvatar', JSON.stringify(avatarData));
      
    } catch (error) {
      console.error('Error saving avatar to local storage:', error);
      throw error;
    }
  };

  const injectedJavaScript = `
    (function() {
      window.addEventListener('message', function(event) {
        if (event.data && event.data.eventName) {
          window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
        }
      });
    })();
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
          <Text style={styles.title}>아바타 생성</Text>
          <View style={styles.placeholder} />
        </View>
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>아바타 생성기 로딩 중...</Text>
          </View>
        )}
        
        <WebView
          ref={webViewRef}
          source={{ uri: avatarCreatorUrl }}
          style={styles.webView}
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 60,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
});

export default AvatarCreator;