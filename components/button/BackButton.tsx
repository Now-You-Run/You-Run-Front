import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BackButtonProps = {
  onPress: () => void;
};

export default function BackButton({ onPress }: BackButtonProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <Text style={styles.text}>←</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  button: {
    width: 40,
    height: 40,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  text: {
    fontSize: 24,
    color: '#333',
  },
});
