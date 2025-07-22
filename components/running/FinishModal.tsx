import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FinishModalProps {
  visible: boolean;
  summaryData: any;
  onClose: () => void;
  onConfirm: () => void;
}

export const FinishModal: React.FC<FinishModalProps> = ({
  visible,
  summaryData,
  onClose,
  onConfirm
}) => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SERVER_API_URL}/api/user?userId=1`
        );
        if (!response.ok) {
          throw new Error('네트워크 오류');
        }
        const json = await response.json();
        setUserName(json.data.name);
      } catch (e) {
        console.error('유저 이름 로드 실패:', e);
      }
    };

    if (visible) {
      fetchUserName();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>러닝 종료</Text>
          <Text style={styles.modalText}>
            수고하셨어요 {userName}님!{'\n'}러닝이 안전하게 종료되었습니다.
          </Text>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>결과 확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22
  },
  confirmButton: {
    backgroundColor: 'rgba(184, 182, 182, 0.65)',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
