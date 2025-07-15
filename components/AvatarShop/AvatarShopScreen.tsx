import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import AvatarCarousel from './AvatarCarousel';
import AvatarActionModal from './AvatarActionModal';

const dummyAvatars = [
  {
    id: 1,
    name: '기본 남자',
    image: require('@/assets/avatars/avatar1.png'),
    owned: true,
    selected: true,
    price: 0,
  },
  {
    id: 2,
    name: '기본 여자',
    image: require('@/assets/avatars/avatar2.png'),
    owned: true,
    selected: false,
    price: 0,
  },
  {
    id: 3,
    name: '노란 후드',
    image: require('@/assets/avatars/avatar3.png'),
    owned: false,
    selected: false,
    price: 3000,
  },
];

export default function AvatarShopScreen() {
  const [avatars, setAvatars] = useState(dummyAvatars);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [modal, setModal] = useState<{ type: 'buy' | 'notEnough' | 'success' | null }>({ type: null });

  const currentAvatar = avatars[currentIdx];

  // 아바타 선택
  const handleSelect = () => {
    setAvatars(avatars.map((a, i) => ({ ...a, selected: i === currentIdx })));
  };

  // 구매 버튼 클릭
  const handleBuy = () => {
    // 예시: 포인트 충분하다고 가정
    setModal({ type: 'buy' });
  };

  // 구매 확인
  const confirmBuy = () => {
    // 실제 포인트 체크/차감 로직은 생략
    setAvatars(
      avatars.map((a, i) =>
        i === currentIdx ? { ...a, owned: true, selected: true } : { ...a, selected: false }
      )
    );
    setModal({ type: 'success' });
    Vibration.vibrate(300);
  };

  // 모달 닫기
  const closeModal = () => {
    setModal({ type: null });
  };

  // 하단 버튼 렌더링
  let bottomButton = null;
  if (currentAvatar.owned) {
    bottomButton = (
      <TouchableOpacity style={styles.selectBtn} onPress={handleSelect}>
        <Text style={styles.selectBtnText}>{currentAvatar.selected ? '선택됨' : '선택'}</Text>
      </TouchableOpacity>
    );
  } else {
    bottomButton = (
      <TouchableOpacity style={styles.buyBtn} onPress={handleBuy}>
        <Text style={styles.buyBtnText}>{currentAvatar.price} 구매</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <AvatarCarousel
        avatars={avatars}
        currentIdx={currentIdx}
        setCurrentIdx={setCurrentIdx}
      />
      <View style={styles.bottomArea}>{bottomButton}</View>
      <AvatarActionModal
        visible={modal.type !== null}
        type={modal.type}
        onClose={closeModal}
        onConfirm={confirmBuy}
        price={currentAvatar.price}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  bottomArea: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  selectBtn: { backgroundColor: '#007AFF', paddingHorizontal: 40, paddingVertical: 18, borderRadius: 32 },
  selectBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  buyBtn: { backgroundColor: '#FFD600', paddingHorizontal: 40, paddingVertical: 18, borderRadius: 32 },
  buyBtnText: { color: '#333', fontSize: 20, fontWeight: 'bold' },
}); 