import React from 'react';
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
            수고하셨습니다! 러닝이 안전하게 종료되었습니다.
          </Text>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>결과 확인하기</Text>
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
    backgroundColor: '#007aff',
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
