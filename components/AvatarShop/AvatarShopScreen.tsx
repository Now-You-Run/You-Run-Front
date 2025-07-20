import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchAvatars, fetchCurrentAvatar, getUserById, purchaseAvatar, selectAvatar } from '../../api/user';
import BackButton from '../button/BackButton';
import { useUserStore } from '../../stores/userStore';
import AvatarActionModal from './AvatarActionModal';
import AvatarCarousel from './AvatarCarousel';

export default function AvatarShopScreen() {
  console.log('=== AvatarShopScreen 렌더링됨 ===');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [avatars, setAvatars] = useState<any[]>([]); // AvatarWithOwnershipDto[]
  const [currentIdx, setCurrentIdx] = useState(0);
  const [modal, setModal] = useState<{ type: 'buy' | 'notEnough' | 'success' | null }>({ type: null });
  const [currentAvatarId, setCurrentAvatarId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [point, setPoint] = useState<number>(0);
  const [buyLoading, setBuyLoading] = useState(false);
  const [pendingBuyId, setPendingBuyId] = useState<number | null>(null);
  const [successAvatarId, setSuccessAvatarId] = useState<number | null>(null);
  const [shouldShowSuccess, setShouldShowSuccess] = useState(false);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);

  const handleBackPress = () => navigation.goBack();

  // 아바타 목록, 현재 선택 아바타, 포인트 동시 불러오기
  const loadAll = async (keepIdx = false) => {
    console.log('loadAll 진입');
    setLoading(true);
    try {
      const [avatarsRes, currentRes, userRes] = await Promise.all([
        fetchAvatars(),
        fetchCurrentAvatar(),
        getUserById(1),
      ]);
      setAvatars(avatarsRes);
      console.log('avatars:', avatarsRes);
      setCurrentAvatarId(currentRes.id);
      console.log('currentAvatar:', currentRes);  
      setPoint(userRes.point);
      if (keepIdx && pendingIdx !== null) {
        setCurrentIdx(pendingIdx);
        setPendingIdx(null);
      } else {
        const idx = avatarsRes.findIndex((a: any) => a.id === currentRes.id);
        setCurrentIdx(idx >= 0 ? idx : 0);
      }
      console.log('user:', userRes);
    } catch (e) {
      console.log('loadAll 에러:', e);
    } finally {
      setLoading(false); 
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const currentAvatar = avatars.length > 0 ? avatars[currentIdx] as any : undefined;

  // currentAvatar가 undefined면 안전하게 로딩만 표시
  if (!currentAvatar) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 아바타 선택
  const handleSelect = async (avatarId: number) => {
    console.log('handleSelect 진입, avatarId:', avatarId);
    setActionLoading(true);
    try {
      await selectAvatar(avatarId);
      
      // 현재 선택된 아바타 정보 가져오기
      const selectedAvatar = avatars.find(a => a.id === avatarId);
      if (selectedAvatar) {
        // 전역 상태 업데이트
        useUserStore.setState(state => ({
          profile: state.profile ? {
            ...state.profile,
            selectedAvatar: {
              id: avatarId,
              url: selectedAvatar.imageUrl
            }
          } : null
        }));
      }
      
      await loadAll();
    } catch (e) {
      console.error('handleSelect 에러:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // 아바타 구매
  const handleBuy = (avatarId: number) => {
    const avatar = avatars.find(a => a.id === avatarId);
    if (avatar && point < avatar.price) {
      setModal({ type: 'notEnough' });
      setTimeout(() => {
        setModal({ type: null });
      }, 1500);
      return;
    }
    setPendingBuyId(avatarId);
    setPendingIdx(currentIdx); // 현재 인덱스 기억
    setModal({ type: 'buy' });
  };

  // 구매 확인
  const confirmBuy = async () => {
    if (pendingBuyId == null) return;
    setActionLoading(true);
    try {
      await purchaseAvatar(pendingBuyId);
      setModal({ type: 'success' });
      Vibration.vibrate(300);
      
      // 구매 후 자동 선택 시 전역 상태도 업데이트
      const purchasedAvatar = avatars.find(a => a.id === pendingBuyId);
      if (purchasedAvatar) {
        useUserStore.setState(state => ({
          profile: state.profile ? {
            ...state.profile,
            selectedAvatar: {
              id: pendingBuyId,
              url: purchasedAvatar.imageUrl
            }
          } : null
        }));
      }
      
      setTimeout(() => {
        setModal({ type: null });
        setShouldShowSuccess(true);
      }, 700);
      setTimeout(() => {
        setSuccessAvatarId(pendingBuyId); // 모달 닫힌 후 success 애니메이션 실행
      }, 750);
      setTimeout(async () => {
        await loadAll(true); // 1.2초 후 avatars 갱신
        setTimeout(() => {
          setShouldShowSuccess(false);
          setSuccessAvatarId(null);
        }, 700); // fadeout 시간만큼 더 기다림
      }, 1950);
    } catch (e: any) {
      setModal({ type: 'notEnough' });
    } finally {
      setActionLoading(false);
    }
  };

  // 모달 닫기
  const closeModal = () => {
    setModal({ type: null });
    if (successAvatarId) {
      setTimeout(() => setSuccessAvatarId(null), 1200); // 애니메이션 시간 후 해제
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backButton}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={{ fontSize: 22, fontWeight: '400', marginLeft: 145,marginTop:12  }}>상점</Text>
      </View>
      <AvatarCarousel
        avatars={avatars.map(a => (shouldShowSuccess && successAvatarId && a.id === successAvatarId) ? { ...a, showSuccess: true } : a)}
        currentIdx={currentIdx}
        setCurrentIdx={setCurrentIdx}
        currentAvatarId={currentAvatarId}
        onSelectAvatar={handleSelect}
        onBuyAvatar={handleBuy}
        buyLoading={buyLoading}
      />
      {/* 보유 포인트 표시 */}
      <View style={styles.pointBox}>
        <Text style={styles.pointText}>보유: {point.toLocaleString()}P</Text>
      </View>
      <AvatarActionModal
        visible={modal.type !== null}
        type={modal.type}
        onClose={closeModal}
        onConfirm={confirmBuy}
        price={currentAvatar?.price ?? 0}
        userPoint={point}
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
  backButton: {
    position: 'absolute',
    top: 4,
    left: 16,
    zIndex: 10,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 32,
  },
  pointBox: {
    position: 'absolute',
    top: 80,
    right: 24,
    backgroundColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 20,
    alignSelf: 'flex-end',
  },
  pointText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#333',
  },
}); 