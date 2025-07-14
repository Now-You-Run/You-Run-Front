import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Client } from '@stomp/stompjs';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import SockJS from 'sockjs-client';

interface ChatMessage {
  sender: string;
  senderId: number;
  content: string;
  type: string;
  roomId?: string;
  createdAt?: string;
  readBy?: number[];
}

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;
const DEFAULT_AVATAR = require('../../assets/avatar/avatar2.jpeg');

const ChatUser = () => {
  const route = useRoute<
    RouteProp<
      {
        params: {
          userId: string;
          username: string;
          myUserId: string;
          myUsername: string;
        };
      },
      'params'
    >
  >();

  const router = useRouter();
  const { userId, username, myUserId, myUsername } = route.params;
  const opponentUserId = Number(userId);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const client = useRef<Client | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const roomId =
    Number(myUserId) < Number(userId)
      ? `room-${myUserId}-${userId}`
      : `room-${userId}-${myUserId}`;

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const socket = new SockJS(`${SERVER_API_URL}/ws`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      onConnect: () => {
        console.log('✅ Connected to WebSocket');

        // 메시지 구독
        stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
          const received: ChatMessage = {
            ...JSON.parse(message.body),
            createdAt: new Date().toISOString(),
          };
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setMessages((prev) => [...prev, received]);

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });

        // 타이핑 상태 구독
        stompClient.subscribe(`/topic/room/${roomId}/typing`, (msg) => {
          const { userId: typingUserId, typing } = JSON.parse(msg.body);
          if (typingUserId !== Number(myUserId)) {
            setIsTyping(typing);
          }
        });

        // 입장 시 읽음 처리
        stompClient.publish({
          destination: '/app/chat.read',
          body: JSON.stringify({
            roomId,
            userId: Number(myUserId),
          }),
        });
      },
      onStompError: (frame) => {
        console.error('❌ Broker error: ', frame);
      },
    });

    stompClient.activate();
    client.current = stompClient;

    return () => {
      console.log('🛑 WebSocket disconnected');
      stompClient.deactivate();
    };
  }, [roomId]);

  const notifyTyping = () => {
    if (!client.current || !client.current.connected) return;

    client.current.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({ userId: Number(myUserId), typing: true, roomId }),
    });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      client.current?.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({
          userId: Number(myUserId),
          typing: false,
          roomId,
        }),
      });
    }, 2000);
  };

  const sendMessage = () => {
    if (client.current && client.current.connected && message.trim() !== '') {
      const chatMessage: ChatMessage = {
        sender: myUsername,
        senderId: Number(myUserId),
        content: message.trim(),
        type: 'TALK',
        roomId,
        createdAt: new Date().toISOString(),
        readBy: [Number(myUserId)],
      };

      client.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage),
      });

      setMessage('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === Number(myUserId);
    const hasOpponentRead = item.readBy?.includes(opponentUserId);

    return (
      <View
        style={{
          flexDirection: isMe ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          marginVertical: 4,
          paddingHorizontal: 8,
        }}
      >
        {!isMe && (
          <Image
            source={DEFAULT_AVATAR}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              marginRight: 6,
            }}
          />
        )}
        <View
          style={{
            backgroundColor: isMe ? '#DCF8C6' : '#E5E5EA',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 16,
            maxWidth: '75%',
          }}
        >
          {!isMe && (
            <Text
              style={{
                fontSize: 12,
                color: '#555',
                marginBottom: 4,
                fontWeight: '500',
              }}
            >
              {item.sender}
            </Text>
          )}
          <Text style={{ fontSize: 16, color: '#333' }}>{item.content}</Text>
          {isMe && (
            <Text
              style={{
                fontSize: 10,
                color: hasOpponentRead ? 'green' : 'gray',
                marginTop: 4,
                textAlign: 'right',
              }}
            >
              {hasOpponentRead ? '✓ 상대 읽음' : '✓ 미확인'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
      {/* 상단 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 20,
          borderBottomWidth: 1,
          borderColor: '#ccc',
          marginBottom: 8,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>
          {username} 님과의 채팅
        </Text>
      </View>

      {/* 타이핑 표시 */}
      {isTyping && (
        <Text style={{ fontStyle: 'italic', color: '#666', marginVertical: 4 }}>
          {username} 님이 입력 중입니다...
        </Text>
      )}

      {/* 메시지 리스트 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'flex-end',
          paddingBottom: 12,
        }}
      />

      {/* 입력창 및 전송 버튼 */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          placeholder="메시지를 입력하세요"
          value={message}
          onChangeText={(text) => {
            setMessage(text);
            notifyTyping();
          }}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginRight: 8,
          }}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={{
            backgroundColor: '#32CD32',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>보내기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatUser;
