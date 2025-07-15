import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function areEqual(prev: AvatarOverlayProps, next: AvatarOverlayProps) {
  // Only re-render if screenPos, isRunning, or avatarId change
  return (
    prev.isRunning === next.isRunning &&
    prev.avatarId === next.avatarId &&
    prev.screenPos?.x === next.screenPos?.x &&
    prev.screenPos?.y === next.screenPos?.y
  );
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

  // 최적화: style 객체를 useMemo로 캐싱
  const containerStyle = useMemo(() => ({
    position: "absolute" as const,
    left: screenPos ? screenPos.x - 35 : -100,
    top: screenPos ? screenPos.y - 70 : -100,
    width: 70,
    height: 80,
    zIndex: 999,
    opacity: screenPos ? 1 : 0,
    pointerEvents: "none" as const,
  }), [screenPos]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'avatarReady') {
        setAvatarLoaded(true);
        onAvatarReady();
      }
    } catch (e) {
      // 메시지 파싱 오류 무시
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
    <View style={containerStyle}>
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
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        cacheEnabled={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        onError={() => {}}
        onLoadStart={() => {}}
        onLoadEnd={() => {}}
      />
    </View>
  );
}, areEqual);
