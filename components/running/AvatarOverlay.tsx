import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import WebView from 'react-native-webview';
import { getAvatarHtml } from './AvatarHtml';

interface AvatarOverlayProps {
  screenPos: { x: number; y: number } | null;
  isRunning: boolean;
  speed: number;
  avatarId: string;
  onAvatarReady: () => void;
}

export const AvatarOverlay = React.memo(({
  screenPos,
  isRunning,
  speed,
  avatarId,
  onAvatarReady
}: AvatarOverlayProps) => {
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const webViewRef = useRef<WebView>(null);

  console.log('🎭 AvatarOverlay 렌더링:', { screenPos, isRunning, avatarLoaded });

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('🎭 WebView 메시지:', data);
      
      if (data.type === 'avatarReady') {
        setAvatarLoaded(true);
        onAvatarReady();
      }
    } catch (e) {
      console.error('❌ WebView 메시지 파싱 오류:', e);
    }
  }, [onAvatarReady]);

  useEffect(() => {
    if (avatarLoaded && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setAnimation',
        isRunning: isRunning,
      }));
    }
  }, [isRunning, avatarLoaded]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: screenPos ? screenPos.x - 35 : -100,
        top: screenPos ? screenPos.y - 70 : -100,
        width: 70,
        height: 80,
        zIndex: 999,
        opacity: screenPos ? 1 : 0,
      }}
    >
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: getAvatarHtml(avatarId) }}
        style={{
          flex: 1,
          backgroundColor: "transparent",
        }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        allowsInlineMediaPlayback={true}  // ✅ 올바른 속성명
        mediaPlaybackRequiresUserAction={false}
        cacheEnabled={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        onError={(error) => {
          console.error('❌ WebView 오류:', error);
        }}
        onLoadStart={() => {
          console.log('🎭 WebView 로딩 시작');
        }}
        onLoadEnd={() => {
          console.log('🎭 WebView 로딩 완료');
        }}
      />
    </View>
  );
});
