import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Client } from '@stomp/stompjs';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SockJS from 'sockjs-client';

interface ChatMessage {
  sender: string;
  senderId: number;
  content: string;
  type: string;
  roomId?: string;
}

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;

const ChatUser = () => {
  const route = useRoute<
    RouteProp<
      {
        params: {
          userId: string;
          username: string;
          myUserId: string; // ✅ 추가
          myUsername: string; // ✅ 추가
        };
      },
      'params'
    >
  >();

  const router = useRouter();
  const { userId, username, myUserId, myUsername } = route.params;

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const client = useRef<Client | null>(null);

  const roomId =
    Number(myUserId) < Number(userId)
      ? `room-${myUserId}-${userId}`
      : `room-${userId}-${myUserId}`;

  // ✅ WebSocket 연결
  useEffect(() => {
    const socket = new SockJS(`${SERVER_API_URL}/ws`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      onConnect: () => {
        console.log('✅ Connected to WebSocket');
        stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
          const received: ChatMessage = JSON.parse(message.body);
          console.log('📩 Received:', received);
          setMessages((prev) => [...prev, received]);
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

  const sendMessage = () => {
    if (client.current && client.current.connected && message.trim() !== '') {
      const chatMessage: ChatMessage = {
        sender: myUsername,
        senderId: Number(myUserId),
        content: message.trim(),
        type: 'TALK',
        roomId: roomId,
      };

      client.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage),
      });

      setMessage('');
    }
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

      {/* 메시지 리스트 */}
      <FlatList
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => {
          const isMe = item.senderId === Number(myUserId);

          return (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                marginVertical: 4,
                paddingHorizontal: 4,
              }}
            >
              <View
                style={{
                  backgroundColor: isMe ? '#E5E5EA' : '#DCF8C6', // ✅ 색상 반전
                  padding: 10,
                  borderRadius: 12,
                  maxWidth: '80%',
                }}
              >
                {!isMe && (
                  <Text
                    style={{ fontSize: 12, color: '#555', marginBottom: 2 }}
                  >
                    {item.sender}
                  </Text>
                )}
                <Text style={{ fontSize: 16 }}>{item.content}</Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
      />

      {/* 입력창 및 전송 버튼 */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          placeholder="메시지를 입력하세요"
          value={message}
          onChangeText={setMessage}
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
