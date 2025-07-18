import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, StyleSheet, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  type: 'buy' | 'notEnough' | 'success' | null;
  onClose: () => void;
  onConfirm?: () => void;
  price?: number;
  userPoint?: number;
}

export default function AvatarActionModal({ visible, type, onClose, onConfirm, price, userPoint }: Props) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if ((type === 'success' || type === 'notEnough') && visible) {
      const timeout = setTimeout(() => {
        onClose();
      }, 1500); // 애니메이션+딜레이와 맞춰서
      return () => clearTimeout(timeout);
    }
  }, [type, visible, onClose]);

  if (!visible || !type) return null;

  let content = null;
  if (type === 'buy') {
    const afterPoint = (userPoint ?? 0) - (price ?? 0);
    content = (
      <>
        <Text style={styles.title}>구매할까요?</Text>
        <View style={styles.pointRow}>
          <Text style={styles.pointLabel}>구매 후 포인트: </Text>
          <Image source={require('@/assets/icons/coin.png')} style={styles.coinIcon} />
          <Text style={styles.pointValue}>{afterPoint.toLocaleString()}P</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.buyBtn} onTouchEnd={onConfirm}>
            <Text style={styles.buyBtnText}>구매</Text>
          </View>
          <View style={styles.cancelBtn} onTouchEnd={onClose}>
            <Text style={styles.cancelBtnText}>취소</Text>
          </View>
        </View>
      </>
    );
  } else if (type === 'notEnough') {
    content = (
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}> 
        <View style={styles.successModalBox}>
          <Text style={styles.successText}>앗, 포인트가 모자라요!</Text>
        </View>
      </Animated.View>
    );
  } else if (type === 'success') {
    content = (
      <Text style={styles.successText}>구매 완료!</Text>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {type === 'notEnough' ? content : (
        type === 'success' ? (
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}> 
            <View style={styles.successModalBox}>{content}</View>
          </Animated.View>
        ) : (
          <View style={styles.overlay}>
            <View style={styles.modalBox}>{content}</View>
          </View>
        )
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 32, minWidth: 220, alignItems: 'center' },
  successModalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 18, minWidth: 120, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  priceText: { fontSize: 18, color: '#FFD600', marginBottom: 24 },
  row: { flexDirection: 'row', gap: 20 },
  buyBtn: { backgroundColor: '#007AFF', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, marginRight: 10 },
  buyBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { backgroundColor: '#eee', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  cancelBtnText: { color: '#333', fontSize: 18 },
  okBtn: { backgroundColor: '#007AFF', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  okBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  successText: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', textAlign: 'center', paddingVertical: 10 },
  pointRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  pointLabel: { fontSize: 15, color: '#333' },
  coinIcon: { width: 16, height: 16, marginHorizontal: 2 },
  pointValue: { fontSize: 16, fontWeight: 'bold', color: '#000', marginLeft: 2 },
}); 