import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Client } from '@stomp/stompjs';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
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

interface ReadReceiptDto {
  roomId: string;
  userId: number;
}

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;
const DEFAULT_AVATAR = require('../../assets/profile/유저_기본_프로필.jpeg');

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
  const [loading, setLoading] = useState(true);

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
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `${SERVER_API_URL}/api/chat/rooms/${roomId}/messages`
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          console.warn('🚨 Server returned invalid message format');
          setMessages([]);
        }
      } catch (error) {
        console.error('🚨 Failed to fetch messages:', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [roomId]);

  const publishSafe = (destination: string, body: string) => {
    if (client.current && client.current.connected) {
      client.current.publish({ destination, body });
    } else {
      console.warn(
        `⚠️ Tried to publish to ${destination} but STOMP not connected yet`
      );
    }
  };

  useEffect(() => {
    const socket = new SockJS(`${SERVER_API_URL}/ws`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log('[STOMP DEBUG]', str),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('✅ Connected to WebSocket');

        stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
          const received = JSON.parse(message.body);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

          if (Array.isArray(received)) {
            setMessages(received);
          } else {
            setMessages((prev) => {
              const exists = prev.some(
                (msg) =>
                  msg.senderId === received.senderId &&
                  msg.content === received.content &&
                  msg.createdAt === received.createdAt
              );
              if (exists) {
                return prev.map((msg) =>
                  msg.senderId === received.senderId &&
                  msg.content === received.content &&
                  msg.createdAt === received.createdAt
                    ? { ...msg, ...received }
                    : msg
                );
              } else {
                return [...prev, received];
              }
            });
          }

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });

        stompClient.subscribe(`/topic/room/${roomId}/typing`, (msg) => {
          const { userId: typingUserId, typing } = JSON.parse(msg.body);
          if (typingUserId !== Number(myUserId)) {
            setIsTyping(typing);
          }
        });

        stompClient.subscribe(`/topic/room/${roomId}/read-receipt`, (msg) => {
          const receipt: ReadReceiptDto = JSON.parse(msg.body);
          if (receipt.userId !== Number(myUserId)) {
            console.log(
              `👁️‍🗨️ Received read receipt from userId=${receipt.userId}`
            );
            publishSafe(
              '/app/chat.read',
              JSON.stringify({ roomId, userId: Number(myUserId) })
            );
          }
        });

        publishSafe(
          '/app/chat.read',
          JSON.stringify({ roomId, userId: Number(myUserId) })
        );
      },
      onStompError: (frame) => {
        console.error('❌ Broker error:', frame);
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
    publishSafe(
      '/app/chat.typing',
      JSON.stringify({ userId: Number(myUserId), typing: true, roomId })
    );
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      publishSafe(
        '/app/chat.typing',
        JSON.stringify({ userId: Number(myUserId), typing: false, roomId })
      );
    }, 2000);
  };

  const sendMessage = () => {
    if (message.trim() === '') return;
    const chatMessage: ChatMessage = {
      sender: myUsername,
      senderId: Number(myUserId),
      content: message.trim(),
      type: 'TALK',
      roomId,
      createdAt: new Date().toISOString(),
      readBy: [Number(myUserId)],
    };
    publishSafe('/app/chat.sendMessage', JSON.stringify(chatMessage));
    setMessage('');
    Keyboard.dismiss();
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
            style={{ width: 36, height: 36, borderRadius: 18, marginRight: 6 }}
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
              {hasOpponentRead ? '읽음' : '미확인'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 0,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderColor: '#ccc',
            marginBottom: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>
            {username} 님과의 채팅
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#32CD32"
            style={{ marginTop: 20 }}
          />
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => `${item.createdAt}-${item.senderId}`}
              renderItem={renderItem}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'flex-end',
              }}
            />

            {isTyping && (
              <Text
                style={{
                  fontStyle: 'italic',
                  color: '#666',
                  marginBottom: 6,
                  textAlign: 'center',
                }}
              >
                {username} 님이 입력 중입니다...
              </Text>
            )}

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
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  보내기
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatUser;
