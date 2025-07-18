import { getUserById } from '@/api/user';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// STOMP 클라이언트 임포트
import { Client, IMessage } from '@stomp/stompjs';

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
  const [myUserName, setMyUserName] = useState<string>('');
  const router = useRouter();
  const navigation = useNavigation();
  const pendingRef = useRef<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [disabledFriendTimestamps, setDisabledFriendTimestamps] = useState<
    Map<string, number>
  >(new Map());
  const [friendPointHistories, setFriendPointHistories] = useState<
    Map<string, number>
  >(new Map());

  const stompClientRef = useRef<Client | null>(null);

  const getWsUrl = (baseUrl: string | undefined): string | undefined => {
    if (!baseUrl) return undefined;

    let protocol: string;
    let cleanBaseUrl: string;

    // HTTPS -> WSS, HTTP -> WS 로 변경
    if (baseUrl.startsWith('https://')) {
      protocol = 'wss://'; // 보안 웹소켓 프로토콜
      cleanBaseUrl = baseUrl.substring(8); // 'https://' 제거
    } else if (baseUrl.startsWith('http://')) {
      protocol = 'ws://'; // 일반 웹소켓 프로토콜
      cleanBaseUrl = baseUrl.substring(7); // 'http://' 제거
    } else {
      // 프로토콜이 없는 경우 (예: localhost:3000)
      console.warn('SERVER_API_URL에 유효한 프로토콜이 없습니다:', baseUrl);
      protocol = 'ws://';
      cleanBaseUrl = baseUrl;
    }

    // cleanBaseUrl에서 잠재적인 끝 슬래시 제거
    if (cleanBaseUrl.endsWith('/')) {
      cleanBaseUrl = cleanBaseUrl.slice(0, -1);
    }

    return `${protocol}${cleanBaseUrl}/ws`;
  };

  // 친구 요청 소켓 (STOMP 클라이언트로 변경)
  useEffect(() => {
    fetchPendingRequestCount();
    fetchFriendRequests();
    fetchFriends();

    const wsUrl = getWsUrl(SERVER_API_URL);

    if (wsUrl) {
      const stompClient = new Client({
        webSocketFactory: () => new WebSocket(wsUrl),

        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,

        onConnect: () => {
          console.log('✅ STOMP WebSocket 연결 성공');

          stompClient.subscribe(
            `/topic/friend-requests/${MY_USER_ID}`,
            (message: IMessage) => {
              console.log('📨 STOMP 메시지 수신:', message.body);
              try {
                const notification = JSON.parse(message.body);
                if (notification.pendingCount !== undefined) {
                  if (notification.pendingCount > pendingRef.current) {
                    fetchFriendRequests();
                    Alert.alert('새 친구 요청', `새 친구 요청이 도착했습니다.`);
                  }
                  setPendingRequests(notification.pendingCount);
                  pendingRef.current = notification.pendingCount;
                }
              } catch (error) {
                console.error('메시지 파싱 오류', error);
              }
            }
          );
        },

        onStompError: (frame) => {
          console.error('❌ STOMP 에러:', frame.headers['message'], frame.body);
          Alert.alert(
            'STOMP 오류',
            `STOMP 연결 중 오류 발생: ${frame.headers['message']}`
          );
        },

        // onWebSocketError: (event) => {
        //   console.error('❌ Low-level WebSocket 에러:', event);
        // },

        onDisconnect: () => {
          console.log('🛑 STOMP WebSocket 연결 종료');
        },
      });

      stompClient.activate();
      stompClientRef.current = stompClient;

      return () => {
        if (stompClientRef.current && stompClientRef.current.active) {
          stompClientRef.current.deactivate();
        }
      };
    } else {
      console.error(
        'WebSocket URL을 생성할 수 없습니다. SERVER_API_URL을 확인하세요.'
      );
    }
  }, []);

  // 푸시 토큰
  useEffect(() => {
    const registerPushToken = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        let finalStatus = status;
        if (status !== 'granted') {
          const { status: askStatus } =
            await Notifications.requestPermissionsAsync();
          finalStatus = askStatus;
        }
        if (finalStatus !== 'granted') {
          Alert.alert(
            '알림 권한 필요',
            '알림 권한을 허용해야 푸시 알림을 받을 수 있습니다.'
          );
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const pushToken = tokenData.data;
        console.log('받은 푸시 토큰:', pushToken);

        const response = await fetch(
          `${SERVER_API_URL}/api/push-token/register`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: MY_USER_ID, pushToken }),
          }
        );

        const json = await response.json();
        if (!response.ok) {
          console.error('푸시 토큰 등록 실패:', json);
          Alert.alert('푸시 토큰 등록 실패', json.message ?? '알 수 없는 오류');
          return;
        }

        console.log('✅ 푸시 토큰 등록 완료', json);
      } catch (error) {
        console.error('푸시 토큰 등록 오류:', error);
        Alert.alert(
          '푸시 토큰 등록 오류',
          '푸시 토큰 등록 중 문제가 발생했습니다.'
        );
      }
    };

    registerPushToken();
  }, []);

  //알림 받기 기능 추가
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('알림 수신:', notification);
        Alert.alert(
          '알림 도착',
          notification.request.content.body ?? '새 알림이 도착했습니다.'
        );
      }
    );

    return () => subscription.remove();
  }, []);

  // 포인트 보내기
  const sendPoint = async (friend: Friend) => {
    const lastSentAt = friendPointHistories.get(friend.friend_id);
    if (lastSentAt) {
      const now = Date.now();
      if (now - lastSentAt < 60 * 1000) {
        Alert.alert('알림', '잠시 후에 다시 보내실 수 있습니다.');
        return;
      }
    }

    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/user/${friend.friend_id}/point?senderId=${MY_USER_ID}&point=5`,
        { method: 'PATCH' }
      );
      const json = await response.json();
      if (response.ok) {
        Alert.alert(
          '포인트 전송 완료',
          `${friend.name}님에게 5포인트를 보냈습니다.`
        );

        const sentAt = json.sentAt;
        if (sentAt) {
          const sentTimestamp = new Date(sentAt).getTime();
          setFriendPointHistories((prev) =>
            new Map(prev).set(friend.friend_id, sentTimestamp)
          );
        }
      } else {
        console.error(json);
        Alert.alert(
          '오류',
          `포인트 전송 실패: ${json.message ?? '알 수 없음'}`
        );
      }
    } catch (error) {
      console.error('sendPoint error:', error);
      Alert.alert('네트워크 오류', '포인트 전송에 실패했습니다.');
    }
  };

  // 만약 포인트를 보넀다면, 설정한 시간 동안 잠금
  useEffect(() => {
    const interval = setInterval(() => {
      setDisabledFriendTimestamps((prev) => {
        const now = Date.now();
        const updated = new Map(prev);
        for (const [friendId, sentAt] of prev.entries()) {
          // 12시간 잠금
          // if (now - sentAt >= 12 * 60 * 60 * 1000) {
          //   updated.delete(friendId);
          // }

          // 테스트용 -> 1분
          if (now - sentAt >= 60 * 1000) {
            updated.delete(friendId);
          }
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 응원하기 알림 보내기
  const sendCheer = async (friend: Friend) => {
    try {
      const response = await fetch(
        `${SERVER_API_URL}/api/push-token/${friend.friend_id}/cheer?senderId=${MY_USER_ID}`,
        { method: 'PATCH' }
      );

      const json = await response.json();

      if (response.ok) {
        Alert.alert('응원 완료', `${friend.name}님에게 응원을 보냈습니다!`);
      } else {
        console.error(json);
        Alert.alert('오류', `응원 실패: ${json.message ?? '알 수 없음'}`);
      }
    } catch (error) {
      console.error('sendCheer error:', error);
      Alert.alert('네트워크 오류', '응원 전송에 실패했습니다.');
    }
  };

  // 친구 요청 카운트
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

  // 내 정보 가져오기
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

  // 친구 목록 확인하기
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

  // 포인트 보낸 시간 조회
  const fetchFriends = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${SERVER_API_URL}/api/user/${MY_USER_ID}/point-history`
      );
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const json = await response.json();

      const pointHistoryMap = new Map<string, number>();
      (json.data ?? []).forEach((item: any) => {
        if (item.receiverId && item.sentAt) {
          pointHistoryMap.set(
            item.receiverId.toString(),
            new Date(item.sentAt).getTime()
          );
        }
      });
      setFriendPointHistories(pointHistoryMap);

      // 기존 친구 리스트도 같이 fetch
      const friendListResponse = await fetch(
        `${SERVER_API_URL}/api/friend/list?senderId=${MY_USER_ID}`
      );
      if (!friendListResponse.ok)
        throw new Error(`HTTP status ${friendListResponse.status}`);
      const friendJson = await friendListResponse.json();

      const data = friendJson.data;
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

  // 친구 목록에서 삭제하기
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

  // 친구 요청 수락하기
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

  // 친구 요청 거절하기
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
    // 전체적인 틀 UI
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
          style={styles.iconButton}
          onPress={() => router.push('/SocialAdd')}
        >
          <Image
            source={require('@/assets/images/profile-icon.png')}
            style={styles.iconImage}
          />
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

      {/* 친구 수락 / 거절 창 */}
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
              {friendRequests.map((req, index) => (
                <View
                  key={`${req.id}_${index}`}
                  style={styles.friendRequestItem}
                >
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
        // 친구 목록 페이지 => 친구 정보, 응원하기 and 포인트 보내기 버튼
        <View style={styles.mapContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#32CD32" />
          ) : friends.length === 0 ? (
            <Text style={styles.noFriendsText}>등록된 친구가 없습니다.</Text>
          ) : (
            <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
              {friends.map((friend, index) => (
                <View key={`${friend.id}_${index}`} style={styles.friendItem}>
                  <Image source={friend.image} style={styles.friendImage} />
                  <View style={styles.friendNameContainer}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    {friend.level && friend.grade && (
                      <Text style={styles.friendLevelGrade}>
                        Lv.{friend.level} | {friend.grade}
                      </Text>
                    )}
                  </View>

                  {/* 응원하기 / 포인트 보내기 버튼 */}
                  {!isEditing && (
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity
                        onPress={() => sendCheer(friend)}
                        style={styles.actionButton}
                      >
                        <Ionicons
                          name="heart-outline"
                          size={20}
                          color="#FF4081"
                        />
                        <Text style={styles.actionButtonText}>응원</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={(() => {
                          const lastSentAt = friendPointHistories.get(
                            friend.friend_id
                          );
                          if (!lastSentAt) return false;

                          // 테스트용 1분
                          return Date.now() - lastSentAt < 60 * 1000;

                          // 기본 12시간
                          //return Date.now() - lastSentAt < 43200 * 1000;
                        })()}
                        onPress={() => sendPoint(friend)}
                        style={[
                          styles.actionButton,
                          (() => {
                            const lastSentAt = friendPointHistories.get(
                              friend.friend_id
                            );
                            if (
                              lastSentAt &&
                              Date.now() - lastSentAt < 60 * 1000
                              //Date.now() - lastSentAt < 43200 * 1000
                            ) {
                              return { opacity: 0.5 };
                            }
                            return {};
                          })(),
                        ]}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={20}
                          color="#FFD700"
                        />
                        <Text style={styles.actionButtonText}>→</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 친구 요청 수락 버튼 */}
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
    right: -5,
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
    marginLeft: 'auto',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 8,
  },

  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  iconButton: {
    marginLeft: 8,
    padding: 4,
  },
  iconImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});
