import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, Image } from 'react-native';
import AvatarCarousel from '@/components/AvatarShop/AvatarCarousel';
import AvatarActionModal from '@/components/AvatarShop/AvatarActionModal';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

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

export default function AvatarShop() {
  const router = useRouter();
  const [avatars, setAvatars] = useState(dummyAvatars);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [modal, setModal] = useState<{ type: 'buy' | 'notEnough' | 'success' | null }>({ type: null });
  const [successIdx, setSuccessIdx] = useState<number | null>(null);
  const [userPoint, setUserPoint] = useState(10000); // 예시 보유 포인트
  const [loading, setLoading] = useState(false); // 로딩 상태

  const currentAvatar = avatars[currentIdx];

  // 아바타 선택
  const handleSelect = () => {
    setLoading(true);
    // 네트워크 요청 시뮬레이션 (1초)
    setTimeout(() => {
      setAvatars(avatars.map((a, i) => ({ ...a, selected: i === currentIdx })));
      setLoading(false);
    }, 1000);
  };

  // 구매 버튼 클릭
  const handleBuy = () => {
    if (userPoint < currentAvatar.price) {
      setModal({ type: 'notEnough' });
      setTimeout(() => {
        setModal({ type: null });
      }, 1500);
      return;
    }
    setModal({ type: 'buy' });
  };

  // 구매 확인
  const confirmBuy = () => {
    if (userPoint < currentAvatar.price) {
      setModal({ type: 'notEnough' });
      setTimeout(() => {
        setModal({ type: null });
      }, 1500);
      return;
    }
    setLoading(true);
    // 네트워크 요청 시뮬레이션 (1초)
    setTimeout(() => {
      setUserPoint(userPoint - currentAvatar.price); // 포인트 차감
      setAvatars(
        avatars.map((a, i) =>
          i === currentIdx ? { ...a, owned: true } : a
        )
      );
      setModal({ type: 'success' });
      Vibration.vibrate(300);
      setTimeout(() => {
        setSuccessIdx(currentIdx); // 0.7초 후 success 애니메이션 시작
      }, 700);
      setTimeout(() => {
        setModal({ type: null }); // 1초 후 모달 닫힘
        setTimeout(() => {
          setSuccessIdx(null);
        }, 1500);
      }, 1000);
      setLoading(false);
    }, 1000);
  };

  // 모달 닫기
  const closeModal = () => {
    setModal({ type: null });
  };

  // 하단 버튼 렌더링
  let bottomButton = null;
  if (currentAvatar.owned) {
    if (currentAvatar.selected) {
      // 선택된 경우: check.png 이미지를 버튼 크기로, 위치도 다른 버튼과 동일하게
      bottomButton = (
        <View style={[styles.circleBtn, styles.selectedBtn]}>
          <Image source={require('@/assets/icons/check.png')} style={styles.checkBigIcon} />
        </View>
      );
    } else {
      // 소유했지만 선택 안된 경우: 파란색 원 + '선택' 텍스트
      bottomButton = (
        <TouchableOpacity
          style={[styles.circleBtn, styles.selectBtn]}
          activeOpacity={0.6}
          onPress={handleSelect}
        >
          <Text style={styles.selectBtnText}>선택</Text>
        </TouchableOpacity>
      );
    }
  } else {
    // 소유하지 않은 경우: 회색 원 + lock.png
    bottomButton = (
      <TouchableOpacity
        style={[styles.circleBtn, styles.lockBtn]}
        activeOpacity={0.6}
        onPress={handleBuy}
      >
        <Image source={require('@/assets/icons/lock.png')} style={styles.lockIcon} />
      </TouchableOpacity>
    );
  }

  // AvatarCarousel에 showSuccess 전달
  const avatarCardsWithSuccess = avatars.map((a, i) => ({ ...a, showSuccess: i === successIdx }));

  const handleBackPress = () => {
    router.replace('/'); // 홈화면으로 이동
  };

  // 로딩 오버레이
  const renderLoading = () => (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingBox}>
        <LottieView
          source={require('@/assets/lottie/loading.json')}
          autoPlay
          loop
          style={{ width: 120, height: 100 }}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && renderLoading()}
      <View style={styles.headerBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>상점</Text>
        </View>
      </View>
      <View style={{ position: 'relative', width: '100%', alignItems: 'center' }}>
        <AvatarCarousel
          avatars={avatarCardsWithSuccess}
          currentIdx={currentIdx}
          setCurrentIdx={setCurrentIdx}
        />
        <View style={styles.userPointBox}>
          <Text style={styles.userPointLabel}>보유:</Text>
          <Text style={styles.userPointValue}>{userPoint.toLocaleString()}P</Text>
        </View>
      </View>
      <View style={styles.bottomArea}>{bottomButton}</View>
      <AvatarActionModal
        visible={modal.type !== null}
        type={modal.type}
        onClose={closeModal}
        onConfirm={confirmBuy}
        price={currentAvatar.price}
        userPoint={userPoint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  bottomArea: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  circleBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedBtn: {
    // backgroundColor: '#007AFF', // 배경 없음
    // circleBtn 스타일과 동일하게 위치/크기 통일
  },
  selectBtn: {
    backgroundColor: '#5EFFAE',
  },
  selectBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lockBtn: {
    backgroundColor: '#5EFFAE',
  },
  checkIcon: {
    width: 48,
    height: 48,
  },
  lockIcon: {
    width: 40,
    height: 40,
    tintColor: '#000',
  },
  checkBigIcon: {
    width: 90,
    height: 90,
  },
  headerBar: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 4, color: '#222' },
  userPointBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 4,
    right: 24,
    height: 22,
    backgroundColor: '#F3F4F6',
    borderRadius: 15,
    zIndex: 30,
    paddingHorizontal: 12,
  },
  userPointLabel: {
    fontSize: 13,
    color: '#222',
    fontWeight: '500',
    marginRight: 3,
    letterSpacing: -0.5,
  },
  userPointValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 