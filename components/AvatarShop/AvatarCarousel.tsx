import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import AvatarCard from './AvatarCard';

interface Avatar {
  id: number;
  name: string;
  image: any;
  owned: boolean;
  selected: boolean;
  price: number;
}

interface Props {
  avatars: Avatar[];
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
}

export default function AvatarCarousel({ avatars, currentIdx, setCurrentIdx }: Props) {
  const prev = () => setCurrentIdx((currentIdx - 1 + avatars.length) % avatars.length);
  const next = () => setCurrentIdx((currentIdx + 1) % avatars.length);

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={prev} style={styles.arrowBtn}>
        <Image source={require('@/assets/icons/arrow_left.png')} style={styles.arrowIcon} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <AvatarCard avatar={avatars[currentIdx]} />
      </View>
      <TouchableOpacity onPress={next} style={styles.arrowBtn}>
        <Image source={require('@/assets/icons/arrow_right.png')} style={styles.arrowIcon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 40 },
  arrowBtn: { padding: 16 },
  arrowIcon: { width: 36, height: 36 },
}); 