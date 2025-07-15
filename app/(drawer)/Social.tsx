import { getUserById } from '@/api/user';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SockJS from 'sockjs-client';

const { PlatformConstants } = NativeModules;

interface FriendRequest {
  id: number | string;
  friendId: number | string;
  name?: string;
}

interface Friend {
  id: string;
  friend_id: string;
  name: string;
  image: any;
  level?: number | null;
  grade?: string | null;
  status?: string | null;
}

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;
const MY_USER_ID = 1;
const DEFAULT_AVATAR = require('../../assets/profile/유저_기본_프로필.jpeg');

export default function Social() {
  const [myUserName, setMyUserName] = useState<string>(''); // ✅ 내 이름 저장
  const navigation = useNavigation();
  const pendingRef = useRef<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [subscription, setSubscription] = useState<StompSubscription | null>(
    null
  );

  useEffect(() => {
    fetchPendingRequestCount();
    fetchFriendRequests();
    fetchFriends();

    const socket = new SockJS(`${SERVER_API_URL}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      debug: () => {},
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      const sub = client.subscribe(
        `/topic/friend/${MY_USER_ID}`,
        async (message: IMessage) => {
          if (message.body) {
            const notification = JSON.parse(message.body);
            console.log('📢 새 친구 요청/수락 알림 수신:', notification);

            if (notification.pendingCount !== undefined) {
              if (notification.pendingCount > pendingRef.current) {
                const response = await fetch(
                  `${SERVER_API_URL}/api/friend/list/receive?senderId=${MY_USER_ID}`
                );
                const json = await response.json();
                const newRequests = json.data ?? [];

                if (newRequests.length > 0) {
                  const names = newRequests.map(
                    (req: FriendRequest) => req.name ?? '알 수 없음'
                  );
                  Alert.alert(
                    '새 친구 요청',
                    `${names.join(', ')}님에게 친구 요청이 들어왔습니다.`
                  );
                }

                setPendingRequests(notification.pendingCount);
                pendingRef.current = notification.pendingCount;
                setFriendRequests(newRequests);
              } else {
                setPendingRequests(notification.pendingCount);
                pendingRef.current = notification.pendingCount;
                fetchFriendRequests();
              }
            } else {
              fetchFriendRequests();
            }
          }
        }
      );

      setSubscription(sub);
    };

    client.onStompError = (frame) => {
      console.error('❌ STOMP 에러:', frame.headers['message'], frame.body);
    };

    client.activate();
    setStompClient(client);

    return () => {
      console.log('🛑 소켓 및 구독 해제');
      subscription?.unsubscribe();
      client.deactivate();
    };
  }, []);

  const fetchPendingRequestCount = async () => {
    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/friend/pending?receiverId=${MY_USER_ID}`
      );
      const json = await response.json();
      const count = json.data?.pendingCount ?? 0;
      setPendingRequests(count);
    } catch (e) {
      console.error('fetchPendingRequestCount error:', e);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
    const interval = setInterval(fetchFriendRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMyInfo = async () => {
      try {
        const user = await getUserById(MY_USER_ID);
        setMyUserName(user.name);
      } catch (e) {
        console.error('내 정보 가져오기 실패', e);
      }
    };
    fetchMyInfo();
  }, []);

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/friend/list/receive?senderId=${MY_USER_ID}`
      );
      const json = await response.json();
      const data = json.data ?? [];
      setPendingRequests(data.length);
      setFriendRequests(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${SERVER_API_URL}/api/friend/list?senderId=${MY_USER_ID}`
      );
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);

      const json = await response.json();
      const data = json.data;

      if (!Array.isArray(data)) {
        throw new Error('API returned non-array data');
      }

      const processedFriends: Friend[] = data.map((item: any) => ({
        id: item.friendId?.toString() ?? '',
        friend_id: item.friendId?.toString() ?? '',
        name: item.name ?? '이름없음',
        image: item.profileImageUrl
          ? { uri: item.profileImageUrl }
          : DEFAULT_AVATAR,
        level: item.level ?? null,
        grade: item.grade ?? null,
        status: item.status ?? null,
      }));

      setFriends(processedFriends);
    } catch (error) {
      console.error('fetchFriends error:', error);
      Alert.alert('오류', '친구 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFriend = async (friend: Friend) => {
    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/friend/delete?senderId=${MY_USER_ID}&otherId=${friend.friend_id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        Alert.alert('완료', `${friend.name}님이 삭제되었습니다.`);
        setIsEditing(false);
        fetchFriends();
      } else {
        const text = await response.text();
        Alert.alert(
          '오류',
          `친구 삭제 중 문제가 발생했습니다.\n상태: ${response.status}\n메시지: ${text}`
        );
      }
    } catch (error) {
      console.error('handleDeleteFriend error:', error);
      Alert.alert('오류', '친구 삭제 중 오류가 발생했습니다.');
    }
  };

  const acceptRequest = async (senderId: string) => {
    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/friend/accept?senderId=${MY_USER_ID}&otherId=${senderId}`
      );
      if (response.ok) {
        Alert.alert('친구 요청 수락', '친구 요청을 수락했습니다.');
        await fetchFriends();
        await fetchFriendRequests();
      } else {
        const text = await response.text();
        Alert.alert('오류', `수락 중 오류 발생: ${text}`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('네트워크 오류', '친구 요청 수락 실패');
    }
  };

  const rejectRequest = async (senderId: string) => {
    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/friend/reject?senderId=${MY_USER_ID}&otherId=${senderId}`
      );
      if (response.ok) {
        Alert.alert('친구 요청 거절', '친구 요청을 거절했습니다.');
        fetchFriendRequests();
      } else {
        const text = await response.text();
        Alert.alert('오류', `거절 중 오류 발생: ${text}`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('네트워크 오류', '친구 요청 거절 실패');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>용인시 처인구</Text>
          <Text style={styles.subTitle}>러너 그라운드</Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => setShowRequests(!showRequests)}
        >
          <Ionicons name="notifications-outline" size={28} color="#333" />
          {pendingRequests > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {pendingRequests > 99 ? '99+' : pendingRequests}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={{ marginLeft: 12 }}
        >
          <Text style={{ color: '#32CD32', fontWeight: 'bold' }}>
            {isEditing ? '완료' : '편집'}
          </Text>
        </TouchableOpacity>
      </View>

      {showRequests ? (
        <View style={styles.friendRequestContainer}>
          <Text style={styles.friendRequestTitle}>
            친구 요청 ({friendRequests.length})
          </Text>
          {friendRequests.length === 0 ? (
            <Text style={styles.noRequestsText}>
              새로운 친구 요청이 없습니다.
            </Text>
          ) : (
            <ScrollView
              style={styles.friendRequestList}
              contentContainerStyle={{ paddingVertical: 8 }}
              nestedScrollEnabled
            >
              {friendRequests.map((req) => (
                <View key={req.id} style={styles.friendRequestItem}>
                  <Text style={styles.requestName}>
                    {req.name || '알 수 없음'}
                  </Text>
                  <View style={styles.requestButtons}>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.acceptButton]}
                      onPress={() => acceptRequest(req.friendId.toString())}
                    >
                      <Text style={styles.requestButtonText}>수락</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.requestButton, styles.rejectButton]}
                      onPress={() => rejectRequest(req.friendId.toString())}
                    >
                      <Text style={styles.requestButtonText}>거절</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowRequests(false)}
          >
            <Text style={styles.closeButtonText}>닫기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#32CD32" />
          ) : friends.length === 0 ? (
            <Text style={styles.noFriendsText}>등록된 친구가 없습니다.</Text>
          ) : (
            <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
              {friends.map((friend) => (
                <View key={friend.id} style={styles.friendItem}>
                  <Image source={friend.image} style={styles.friendImage} />
                  <View style={styles.friendNameContainer}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    {friend.level && friend.grade && (
                      <Text style={styles.friendLevelGrade}>
                        Lv.{friend.level} | {friend.grade}
                      </Text>
                    )}
                  </View>
                  {!isEditing && (
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() =>
                        router.push({
                          pathname: '/(drawer)/ChatUser',
                          params: {
                            userId: friend.friend_id,
                            username: friend.name,
                            myUserId: MY_USER_ID.toString(),
                            myUsername: myUserName, // ✅ 여기에 현재 내 이름 넘기기
                          },
                        })
                      }
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={24}
                        color="#32CD32"
                      />
                    </TouchableOpacity>
                  )}
                  {isEditing && (
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          '친구 삭제',
                          `${friend.name}님과 친구를 끊으시겠습니까?`,
                          [
                            { text: '취소', style: 'cancel' },
                            {
                              text: '확인',
                              style: 'destructive',
                              onPress: () => handleDeleteFriend(friend),
                            },
                          ]
                        )
                      }
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="red" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  subTitle: { fontSize: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  backButton: { fontSize: 24, color: '#333', marginRight: 12 },
  bellButton: { position: 'relative', padding: 5 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF4C4C',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  friendRequestContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  friendRequestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  noRequestsText: { textAlign: 'center', color: '#777' },
  friendRequestList: {},
  friendRequestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  requestName: { fontSize: 14, color: '#222' },
  requestButtons: { flexDirection: 'row' },
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  acceptButton: { backgroundColor: '#32CD32' },
  rejectButton: { backgroundColor: '#FF4C4C' },
  requestButtonText: { color: '#fff', fontWeight: 'bold' },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#32CD32',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold' },
  mapContainer: { flex: 1 },
  noFriendsText: { textAlign: 'center', marginTop: 50, color: '#555' },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  friendImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  friendNameContainer: { flexDirection: 'column', justifyContent: 'center' },
  friendName: { fontSize: 16, fontWeight: '600', color: '#333' },
  friendLevelGrade: { fontSize: 12, color: '#555', marginTop: 2 },
  deleteButton: {
    marginLeft: 190,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  chatButton: {
    marginLeft: 190,
    padding: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
});
