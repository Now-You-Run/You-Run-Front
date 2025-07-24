import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import WebView from 'react-native-webview';
import { getAvatarHtml } from './AvatarHtml';

interface AvatarOverlayProps {
  screenPos: { x: number; y: number } | null;
  isRunning: boolean;
  speed: number;
  avatarUrl: string; // avatarId에서 avatarUrl로 변경
  onAvatarReady: () => void;
}

function areEqual(prev: AvatarOverlayProps, next: AvatarOverlayProps) {
  return (
    prev.isRunning === next.isRunning &&
    prev.avatarUrl === next.avatarUrl &&
    prev.screenPos?.x === next.screenPos?.x &&
    prev.screenPos?.y === next.screenPos?.y
  );
}

export const AvatarOverlay = React.memo(({
  screenPos,
  isRunning,
  speed,
  avatarUrl,
  onAvatarReady
}: AvatarOverlayProps) => {
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // 최적화: style 객체를 useMemo로 캐싱
  const containerStyle = useMemo(() => ({
    position: "absolute" as const,
    left: screenPos ? screenPos.x - 60 : -100,
    top: screenPos ? screenPos.y - 200 : -100, // -70에서 -90으로 수정
    width: 120,
    height: 250, // 80에서 100으로 증가
    zIndex: 900, // RunningControls의 zIndex(1500)보다 낮게 설정
    opacity: screenPos ? 1 : 0,
    pointerEvents: "none" as const,
  }), [screenPos]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'log') {
        console.log('[WebView]', ...data.log);
        return;
      }
      if (data.type === 'avatarReady') {
        console.log('Avatar is ready');
        setAvatarLoaded(true);
        onAvatarReady();
      } else if (data.type === 'error') {
        console.error('Error from WebView:', data.error);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  }, [onAvatarReady]);

  useEffect(() => {
    if (avatarLoaded && webViewRef.current) {
      console.log('[AvatarOverlay] postMessage setAnimation', isRunning);
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setAnimation',
        isRunning: isRunning,
      }));
    }
  }, [isRunning, avatarLoaded]);

  return (
    <View style={containerStyle}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: getAvatarHtml(avatarUrl) }}
        style={{
          flex: 1,
          backgroundColor: "transparent",
        }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error:', nativeEvent);
        }}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        cacheEnabled={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        onLoadStart={() => {}}
        onLoadEnd={() => {}}
      />
    </View>
  );
}, areEqual);
