import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
export default function ProfileIcons() {
  const router = useRouter();
  const navigateTo = (path: string) => {
    router.push(path as any);
  };
  return (
    <View style={styles.profileIcons}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigateTo('/(drawer)/SocialAdd')}
      >
        <Image
          source={require('@/assets/images/profile-icon.png')}
          style={styles.iconImage}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton}>
        <Image
          source={require('@/assets/images/settings-icon.png')}
          style={styles.iconImage}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  profileIcons: {
    position: 'absolute',
    top: 30,
    right: 20,
    zIndex: 100,
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 15,
  },
  iconImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
});
