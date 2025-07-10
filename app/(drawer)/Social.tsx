// import { Ionicons } from '@expo/vector-icons';
// import { useNavigation } from '@react-navigation/native';
// import React, { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   Image,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   View,
// } from 'react-native';

// const { width, height } = Dimensions.get('window');

// interface Friend {
//   id: string;
//   friend_id: string;
//   name: string;
//   emoji: string;
//   image: any;
//   x: number;
//   y: number;
//   level?: number;
//   grade?: string;
// }

// const FRIEND_SIZE = 80;
// const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;
// const MY_USER_ID = 1; // 로그인 유저 ID로 교체 필요

// function CustomToggle({
//   value,
//   onValueChange,
// }: {
//   value: boolean;
//   onValueChange: (val: boolean) => void;
// }) {
//   return (
//     <TouchableWithoutFeedback onPress={() => onValueChange(!value)}>
//       <View style={styles.toggleContainer}>
//         <View
//           style={[
//             styles.toggleCircleWrapper,
//             value
//               ? { justifyContent: 'flex-end', paddingRight: 2 }
//               : { justifyContent: 'flex-start', paddingLeft: 2 },
//           ]}
//         >
//           <View
//             style={[
//               styles.toggleCircle,
//               value ? styles.circleOn : styles.circleOff,
//             ]}
//           />
//         </View>
//         <Text
//           style={[
//             styles.toggleText,
//             value ? styles.textOnLeft : styles.textOffRight,
//             styles.textBlack,
//           ]}
//         >
//           {value ? 'on' : 'off'}
//         </Text>
//       </View>
//     </TouchableWithoutFeedback>
//   );
// }

// export default function Social() {
//   const navigation = useNavigation();

//   const HEADER_HEIGHT = 60 + 20 + 20; // paddingTop + headerContainer marginBottom + 여유
//   const [myPosition] = useState<{ x: number; y: number }>(() => ({
//     x: (width - FRIEND_SIZE) / 2,
//     y: (height - HEADER_HEIGHT - FRIEND_SIZE) / 2,
//   }));

//   const [friends, setFriends] = useState<Friend[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [pendingRequests, setPendingRequests] = useState<number>(0);
//   const [showOnlyRealFriends, setShowOnlyRealFriends] = useState(false);
//   const [friendRequests, setFriendRequests] = useState<any[]>([]);
//   const [showRequests, setShowRequests] = useState(false);

//   useEffect(() => {
//     fetchFriends();
//     fetchFriendRequests();

//     //     setFriendRequests(mockRequests);
//     //     setPendingRequests(mockRequests.length);
//     const interval = setInterval(fetchFriendRequests, 10000);
//     return () => clearInterval(interval);
//   }, []);

//   const fetchFriendRequests = async () => {
//     try {
//       const response = await fetch(
//         `${SERVER_API_URL}/api/friend/list/receive?senderId=${MY_USER_ID}`
//       );
//       const json = await response.json();
//       const data = json.data ?? [];
//       setPendingRequests(data.length);
//       setFriendRequests(data);
//     } catch (e) {
//       console.error(e);
//     }
//   };

//   const fetchFriends = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(
//         `${SERVER_API_URL}/api/friend/list?senderId=${MY_USER_ID}`
//       );
//       if (!response.ok) throw new Error(`HTTP status ${response.status}`);

//       const json = await response.json();
//       const data = json.data;

//       if (!Array.isArray(data)) {
//         throw new Error('API returned non-array data');
//       }

//       const processedFriends: Friend[] = data.map(
//         (item: any, index: number) => ({
//           id: item.friendId.toString(),
//           friend_id: item.friendId.toString(),
//           name: item.name ?? `친구 ${index + 1}`,
//           emoji: '💛',
//           image: require('../../assets/avatar/avatar2.jpeg'),
//           x: Math.random() * (width - FRIEND_SIZE),
//           y: 80 + Math.random() * (height - 200),
//           level: item.level ?? 1,
//           grade: item.grade ?? '아이언',
//         })
//       );

//       const me: Friend = {
//         id: MY_USER_ID.toString(),
//         friend_id: MY_USER_ID.toString(),
//         name: '나',
//         emoji: '🏃',
//         image: require('../../assets/avatar/avatar1.jpeg'),
//         x: myPosition.x,
//         y: myPosition.y,
//       };

//       setFriends([me, ...processedFriends]);
//     } catch (error) {
//       console.error('fetchFriends error:', error);
//       Alert.alert('오류', '친구 목록을 불러오는 중 오류가 발생했습니다.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDeleteFriend = async (friend: Friend) => {
//     try {
//       const response = await fetch(
//         `${SERVER_API_URL}/api/friend/delete?senderId=${MY_USER_ID}&otherId=${friend.friend_id}`,
//         { method: 'DELETE' }
//       );

//       if (response.ok) {
//         Alert.alert('완료', `${friend.name}님이 삭제되었습니다.`);
//         fetchFriends();
//       } else {
//         const text = await response.text();
//         Alert.alert(
//           '오류',
//           `친구 삭제 중 문제가 발생했습니다.\n상태: ${response.status}\n메시지: ${text}`
//         );
//       }
//     } catch (error) {
//       console.error('handleDeleteFriend error:', error);
//       Alert.alert('오류', '친구 삭제 중 오류가 발생했습니다.');
//     }
//   };

//   // 친구 요청 수락
//   const acceptRequest = async (senderId: string) => {
//     try {
//       const response = await fetch(
//         `${SERVER_API_URL}/api/friend/accept?senderId=${MY_USER_ID}&otherId=${senderId}`
//         // GET 요청이라 method 옵션 제거해도 됩니다
//       );
//       if (response.ok) {
//         Alert.alert('친구 요청 수락', '친구 요청을 수락했습니다.');

//         fetchFriends();
//         fetchFriendRequests();
//       } else {
//         const text = await response.text();
//         Alert.alert('오류', `수락 중 오류 발생: ${text}`);
//       }
//     } catch (e) {
//       console.error(e);
//       Alert.alert('네트워크 오류', '친구 요청 수락 실패');
//     }
//   };

//   // 친구 요청 거절
//   const rejectRequest = async (senderId: string) => {
//     try {
//       const response = await fetch(
//         `${SERVER_API_URL}/api/friend/reject?senderId=${MY_USER_ID}&otherId=${senderId}`
//         // GET 요청이라 method 옵션 제거
//       );
//       if (response.ok) {
//         Alert.alert('친구 요청 거절', '친구 요청을 거절했습니다.');
//         fetchFriendRequests();
//       } else {
//         const text = await response.text();
//         Alert.alert('오류', `거절 중 오류 발생: ${text}`);
//       }
//     } catch (e) {
//       console.error(e);
//       Alert.alert('네트워크 오류', '친구 요청 거절 실패');
//     }
//   };

//   return (
//     <View style={styles.container}>
//       {/* 헤더 */}
//       <View style={styles.headerContainer}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <Text style={styles.backButton}>←</Text>
//         </TouchableOpacity>
//         <View>
//           <Text style={styles.title}>용인시 처인구</Text>
//           <Text style={styles.subTitle}>러너 그라운드</Text>
//         </View>

//         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//           <View style={{ alignItems: 'center', marginRight: 20 }}>
//             <Text style={{ fontSize: 12, marginBottom: 4 }}>실친만 보기</Text>
//             <CustomToggle
//               value={showOnlyRealFriends}
//               onValueChange={setShowOnlyRealFriends}
//             />
//           </View>

//           {/* 종 버튼 */}
//           <TouchableOpacity
//             style={styles.bellButton}
//             onPress={() => setShowRequests(!showRequests)}
//           >
//             <Ionicons name="notifications-outline" size={28} color="#333" />
//             {pendingRequests > 0 && (
//               <View style={styles.badge}>
//                 <Text style={styles.badgeText}>
//                   {pendingRequests > 99 ? '99+' : pendingRequests}
//                 </Text>
//               </View>
//             )}
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* 친구 요청 리스트 (종 버튼 눌렀을 때만 보이게) */}
//       {showRequests ? (
//         <View style={styles.friendRequestContainer}>
//           <Text style={styles.friendRequestTitle}>
//             친구 요청 ({friendRequests.length})
//           </Text>
//           {friendRequests.length === 0 ? (
//             <Text style={styles.noRequestsText}>
//               새로운 친구 요청이 없습니다.
//             </Text>
//           ) : (
//             <ScrollView
//               style={styles.friendRequestList}
//               contentContainerStyle={{ paddingVertical: 8 }}
//               nestedScrollEnabled
//             >
//               {friendRequests.map((req) => (
//                 <View key={req.id} style={styles.friendRequestItem}>
//                   <Text style={styles.requestName}>
//                     {req.name || '알 수 없음'}
//                   </Text>
//                   <View style={styles.requestButtons}>
//                     <TouchableOpacity
//                       style={[styles.requestButton, styles.acceptButton]}
//                       onPress={() => acceptRequest(req.friendId.toString())}
//                     >
//                       <Text style={styles.requestButtonText}>수락</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       style={[styles.requestButton, styles.rejectButton]}
//                       onPress={() => rejectRequest(req.friendId.toString())}
//                     >
//                       <Text style={styles.requestButtonText}>거절</Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               ))}
//             </ScrollView>
//           )}
//           {/* 닫기 버튼 */}
//           <TouchableOpacity
//             style={styles.closeButton}
//             onPress={() => setShowRequests(false)}
//           >
//             <Text style={styles.closeButtonText}>닫기</Text>
//           </TouchableOpacity>
//         </View>
//       ) : (
//         // 친구 목록 (요청 목록 숨겨져 있을 때)
//         <ScrollView
//           style={styles.mapContainer}
//           contentContainerStyle={{ minHeight: 600 }}
//         >
//           {loading ? (
//             <ActivityIndicator size="large" color="#32CD32" />
//           ) : friends.length === 0 ? (
//             <Text style={styles.noFriendsText}>등록된 친구가 없습니다.</Text>
//           ) : (
//             <View style={styles.mapInner}>
//               {friends.map((friend) => (
//                 <View
//                   key={friend.id}
//                   style={[
//                     styles.friendItem,
//                     { top: friend.y, left: friend.x },
//                     showOnlyRealFriends &&
//                     friend.friend_id !== MY_USER_ID.toString()
//                       ? { opacity: 0.3 }
//                       : { opacity: 1 },
//                   ]}
//                 >
//                   <Image source={friend.image} style={styles.friendImage} />
//                   <View style={styles.friendNameContainer}>
//                     <View style={{ alignItems: 'center' }}>
//                       <Text style={styles.friendName}>{friend.name}</Text>
//                       <Text style={styles.friendEmoji}>{friend.emoji}</Text>
//                       {friend.level && friend.grade && (
//                         <Text style={styles.friendLevelGrade}>
//                           Lv.{friend.level} | {friend.grade}
//                         </Text>
//                       )}
//                     </View>
//                   </View>
//                   {friend.friend_id !== MY_USER_ID.toString() && (
//                     <TouchableOpacity
//                       onPress={() =>
//                         Alert.alert(
//                           '친구 삭제',
//                           `${friend.name}님과 친구를 끊으시겠습니까?`,
//                           [
//                             { text: '취소', style: 'cancel' },
//                             {
//                               text: '확인',
//                               style: 'destructive',
//                               onPress: () => handleDeleteFriend(friend),
//                             },
//                           ]
//                         )
//                       }
//                       style={styles.deleteButton}
//                     >
//                       <Ionicons name="trash-outline" size={20} color="red" />
//                     </TouchableOpacity>
//                   )}
//                 </View>
//               ))}
//             </View>
//           )}
//         </ScrollView>
//       )}
//     </View>
//   );
// }

// const TOGGLE_WIDTH = 50;
// const TOGGLE_HEIGHT = 24;
// const CIRCLE_SIZE = 20;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     paddingTop: 60,
//     paddingHorizontal: 20,
//   },
//   headerContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: 20,
//   },
//   subTitle: { fontSize: 12 },
//   title: { fontSize: 20, fontWeight: 'bold', color: '#222' },
//   toggleContainer: {
//     width: TOGGLE_WIDTH,
//     height: TOGGLE_HEIGHT,
//     borderRadius: TOGGLE_HEIGHT / 2,
//     backgroundColor: '#ddd',
//     paddingHorizontal: 2,
//   },
//   toggleCircleWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     height: TOGGLE_HEIGHT,
//     width: TOGGLE_WIDTH - 4,
//   },
//   toggleCircle: {
//     width: CIRCLE_SIZE,
//     height: CIRCLE_SIZE,
//     borderRadius: CIRCLE_SIZE / 2,
//   },
//   circleOn: { backgroundColor: '#32CD32' },
//   circleOff: { backgroundColor: '#FF4C4C' },
//   toggleText: {
//     position: 'absolute',
//     top: TOGGLE_HEIGHT / 2 - 8,
//     fontWeight: 'bold',
//     fontSize: 10,
//   },
//   textOnLeft: { left: 6 },
//   textOffRight: { right: 6 },
//   textBlack: { color: '#000000' },
//   mapContainer: { flex: 1 },
//   mapInner: { flex: 1, minHeight: 600, position: 'relative' },
//   noFriendsText: { textAlign: 'center', marginTop: 50, color: '#555' },
//   friendItem: {
//     position: 'absolute',
//     width: FRIEND_SIZE,
//     height: FRIEND_SIZE + 30,
//     alignItems: 'center',
//   },
//   friendImage: {
//     width: FRIEND_SIZE,
//     height: FRIEND_SIZE,
//     borderRadius: FRIEND_SIZE / 2,
//     borderWidth: 2,
//     borderColor: '#4caf50',
//   },
//   friendNameContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 4,
//   },
//   friendName: { fontSize: 12, fontWeight: '600', color: '#333' },
//   friendEmoji: { marginLeft: 4, fontSize: 14 },
//   deleteButton: {
//     position: 'absolute',
//     top: 5,
//     right: 5,
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 2,
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.2,
//     shadowRadius: 1.41,
//   },
//   backButton: { fontSize: 24, color: '#333', marginRight: 12 },

//   // 아래부터 친구 요청 관련 스타일 추가
//   friendRequestContainer: {
//     backgroundColor: '#f9f9f9',
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 16,
//     maxHeight: 180,
//     borderWidth: 1,
//     borderColor: '#ddd',
//   },
//   friendRequestTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 8,
//     color: '#333',
//   },
//   noRequestsText: {
//     textAlign: 'center',
//     color: '#777',
//   },
//   friendRequestList: {
//     // ScrollView 스타일, 필요시 조정
//   },
//   friendRequestItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 6,
//     borderBottomWidth: 1,
//     borderColor: '#ddd',
//   },
//   requestName: {
//     fontSize: 14,
//     color: '#222',
//   },
//   requestButtons: {
//     flexDirection: 'row',
//   },
//   requestButton: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 4,
//     marginLeft: 8,
//   },
//   acceptButton: {
//     backgroundColor: '#32CD32',
//   },
//   rejectButton: {
//     backgroundColor: '#FF4C4C',
//   },
//   requestButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   bellButton: {
//     position: 'relative',
//     padding: 5,
//   },
//   badge: {
//     position: 'absolute',
//     top: -4,
//     right: -4,
//     minWidth: 18,
//     height: 18,
//     borderRadius: 9,
//     backgroundColor: '#FF4C4C',
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 4,
//     zIndex: 10,
//   },
//   badgeText: {
//     color: 'white',
//     fontSize: 11,
//     fontWeight: 'bold',
//   },
//   closeButton: {
//     marginTop: 10,
//     backgroundColor: '#32CD32',
//     borderRadius: 6,
//     paddingVertical: 8,
//     alignItems: 'center',
//   },
//   closeButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   friendLevelGrade: {
//     fontSize: 10,
//     color: '#555',
//     marginTop: 2,
//   },
// });
