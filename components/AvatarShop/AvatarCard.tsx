import React from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width * 0.85, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.25;

interface Avatar {
  id: number;
  name: string;
  image: any;
  owned: boolean;
  selected: boolean;
  price: number;
  showSuccess?: boolean;
}

function formatPrice(price: number) {
  return price.toLocaleString() + 'P';
}

export default function AvatarCard({ avatar }: { avatar: Avatar }) {
  return (
    <View style={styles.container}>
      <View style={[styles.lottieBgWrap, { width: CARD_WIDTH, height: CARD_HEIGHT }]}> 
        <LottieView
          source={avatar.owned ? require('@/assets/lottie/Owned.json') : require('@/assets/lottie/NotOwned.json')}
          autoPlay
          loop
          style={[styles.lottieBg, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
        />
        <Image source={avatar.image} style={[styles.avatarImg, { width: CARD_WIDTH, height: CARD_HEIGHT }]} />
        {avatar.showSuccess && (
          <LottieView
            source={require('@/assets/lottie/success.json')}
            autoPlay
            loop={false}
            speed={0.5}
            style={[
              styles.successLottie,
              {
                width: CARD_WIDTH * 1.5,
                height: CARD_HEIGHT * 1.5,
                position: 'absolute',
                top: -(CARD_HEIGHT * 0.25),
                left: -(CARD_WIDTH * 0.25),
              },
            ]}
          />
        )}
      </View>
      {/* 가격 표시/placeholder (카드 하단 중앙, 항상 공간 유지) */}
      {avatar.owned ? (
        <View style={styles.priceTagBottom}>
          <Text style={[styles.priceText, {opacity: 0}]}>0P</Text>
        </View>
      ) : (
        <View style={styles.priceTagBottom}>
          <Image source={require('@/assets/icons/coin.png')} style={styles.coinIcon} />
          <Text style={styles.priceText}>{formatPrice(avatar.price)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  lottieBgWrap: { justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  lottieBg: { position: 'absolute' },
  avatarImg: { resizeMode: 'contain' },
  successLottie: { zIndex: 10 },
  priceTagBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
    alignSelf: 'center',
    zIndex: 20,
    minHeight: 26,
  },
  coinIcon: { width: 18, height: 18, marginRight: 3 },
  priceText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});  