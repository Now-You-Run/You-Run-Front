import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import AvatarCard from './AvatarCard';

interface Avatar {
  id: number;
  name: string;
  imageUrl: string;
  owned: boolean;
  selected: boolean;
  price: number;
  showSuccess?: boolean;
}

interface Props {
  avatars: Avatar[];
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
  currentAvatarId: number | null;
  onSelectAvatar?: (avatarId: number) => void;
  onBuyAvatar?: (avatarId: number) => void;
  buyLoading?: boolean;
}

export default function AvatarCarousel({ avatars, currentIdx, setCurrentIdx, currentAvatarId, onSelectAvatar, onBuyAvatar, buyLoading }: Props) {
  const prev = () => setCurrentIdx((currentIdx - 1 + avatars.length) % avatars.length);
  const next = () => setCurrentIdx((currentIdx + 1) % avatars.length);

  const currentAvatar = avatars[currentIdx];

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={prev} style={styles.arrowBtn}>
        <Image source={require('@/assets/icons/arrow_left.png')} style={styles.arrowIcon} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <AvatarCard 
          avatar={{ ...currentAvatar, selected: currentAvatar.id === currentAvatarId }}
          onSelect={currentAvatar.owned && currentAvatar.id !== currentAvatarId && onSelectAvatar ? () => onSelectAvatar(currentAvatar.id) : undefined}
          onBuy={!currentAvatar.owned && onBuyAvatar ? () => onBuyAvatar(currentAvatar.id) : undefined}
          buyLoading={buyLoading}
        />
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