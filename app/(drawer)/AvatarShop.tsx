import React from 'react';
import { View, StyleSheet } from 'react-native';
import AvatarShopScreen from '@/components/AvatarShop/AvatarShopScreen';

export default function AvatarShop() {
  return (
    <View style={styles.container}>
      <AvatarShopScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
}); 