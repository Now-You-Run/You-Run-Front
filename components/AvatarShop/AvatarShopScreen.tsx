import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Vibration, View } from 'react-native';
import { fetchAvatars, fetchCurrentAvatar, getUserById, purchaseAvatar, selectAvatar } from '../../api/user';
import AvatarActionModal from './AvatarActionModal';
import AvatarCarousel from './AvatarCarousel';

export default function AvatarShopScreen() {
  console.log('=== AvatarShopScreen 렌더링됨 ===');
  const [avatars, setAvatars] = useState([]); // AvatarWithOwnershipDto[]
  const [currentIdx, setCurrentIdx] = useState(0);
  const [modal, setModal] = useState<{ type: 'buy' | 'notEnough' | 'success' | null }>({ type: null });
  const [currentAvatarId, setCurrentAvatarId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [point, setPoint] = useState<number>(0);
  const [buyLoading, setBuyLoading] = useState(false);

  // 아바타 목록, 현재 선택 아바타, 포인트 동시 불러오기
  const loadAll = async () => {
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
      const idx = avatarsRes.findIndex((a: any) => a.id === currentRes.id);
      setCurrentIdx(idx >= 0 ? idx : 0);
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
      console.log('selectAvatar 호출 전');
      await selectAvatar(avatarId);
      console.log('selectAvatar 호출 후, loadAll 호출 전');
      await loadAll();
      console.log('loadAll 호출 후');
    } catch (e) {
      console.log('handleSelect 에러:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // 아바타 구매
  const handleBuy = async (avatarId: number) => {
    setBuyLoading(true);
    const prevIdx = currentIdx; // 구매 전 인덱스 기억
    try {
      await purchaseAvatar(avatarId);
      await loadAll();
      setCurrentIdx(prevIdx); // 구매한 아바타가 계속 보이도록 인덱스 유지
    } catch (e) {
      setModal({ type: 'notEnough' });
    } finally {
      setBuyLoading(false);
    }
  };

  // 구매 확인
  const confirmBuy = async () => {
    if (!currentAvatar) return;
    setActionLoading(true);
    try {
      await purchaseAvatar(currentAvatar.id);
      setModal({ type: 'success' });
      Vibration.vibrate(300);
      await loadAll(); // 포인트와 아바타 목록 모두 갱신
    } catch (e: any) {
      setModal({ type: 'notEnough' });
    } finally {
      setActionLoading(false);
    }
  };

  // 모달 닫기
  const closeModal = () => {
    setModal({ type: null });
  };

  return (
    <View style={styles.container}>
      <AvatarCarousel
        avatars={avatars}
        currentIdx={currentIdx}
        setCurrentIdx={setCurrentIdx}
        currentAvatarId={currentAvatarId}
        onSelectAvatar={handleSelect}
        onBuyAvatar={handleBuy}
        buyLoading={buyLoading}
      />
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
}); 