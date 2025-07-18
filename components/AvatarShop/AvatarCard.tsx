import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width * 0.85 * 1.1, 340 * 1.1); // 10% 증가
const CARD_HEIGHT = CARD_WIDTH * 1.25;

interface Avatar {
  id: number;
  name: string;
  imageUrl: string; // 백엔드에서 받은 URL
  owned: boolean;
  selected: boolean;
  price: number;
  showSuccess?: boolean;
}

function formatPrice(price: number) {
  return price.toLocaleString() + 'P';
}

export default function AvatarCard({ avatar, onSelect, onBuy, buyLoading }: { avatar: Avatar; onSelect?: () => void; onBuy?: () => void; buyLoading?: boolean }) {
  const safeImageUrl = avatar.imageUrl ? avatar.imageUrl.trim() : '';
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (avatar.showSuccess) {
      fadeAnim.setValue(1);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }).start();
    }
  }, [avatar.showSuccess]);

  return (
    <View style={styles.container}>
      <View style={[styles.lottieBgWrap, { width: CARD_WIDTH, height: CARD_HEIGHT }]} pointerEvents="none"> 
        <LottieView
          source={avatar.owned ? require('@/assets/lottie/Owned.json') : require('@/assets/lottie/NotOwned.json')}
          autoPlay
          loop
          style={[styles.lottieBg, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
        />
        <Image source={{ uri: safeImageUrl }} style={[styles.avatarImg, { width: CARD_WIDTH, height: CARD_HEIGHT }]} />
        {avatar.showSuccess && (
          <Animated.View style={{
            opacity: fadeAnim,
            position: 'absolute',
            width: CARD_WIDTH * 1.5,
            height: CARD_HEIGHT * 1.5,
            top: -(CARD_HEIGHT * 0.25),
            left: -(CARD_WIDTH * 0.25),
          }}>
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
                  top: 0,
                  left: 0,
                },
              ]}
            />
          </Animated.View>
        )}
      </View>
      {/* 아바타 가격 표시 */}
      <View style={styles.priceTagBottom}>
        <Image source={require('@/assets/icons/coin.png')} style={styles.coinIcon} />
        <Text style={styles.priceText}>
          {formatPrice(avatar.price)}
        </Text>
      </View>
      <View style={styles.statusArea}>
        {avatar.owned ? (
          avatar.selected ? (
            <View style={styles.selectCircle}>
              <Image source={require('@/assets/icons/check.png')} style={{ width: 100, height: 100 }} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectCircle}
              onPress={() => {
                console.log('AvatarCard onSelect 클릭됨');
                if (onSelect) onSelect();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.selectText}>선택</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={styles.lockCircle}
            onPress={() => {
              console.log('AvatarCard onBuy(구매) 클릭됨');
              if (onBuy) onBuy();
            }}
            activeOpacity={0.7}
            disabled={buyLoading}
          >
            <Image source={require('@/assets/icons/lock.png')} style={styles.lockIcon} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  lottieBgWrap: { justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 24 },
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
    marginTop: 32,
    alignSelf: 'center',
    zIndex: 20,
    minHeight: 26,
  },
  statusArea: {
    alignItems: 'center',
    minHeight: 70,
    justifyContent: 'flex-end',
    paddingTop: 56, // 버튼만 아래로 내리기 위해 추가
  },
  selectedCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  checkIcon: {
    width: 36,
    height: 36,
    tintColor: '#fff',
  },
  selectedText: {
    color: '#888',
    fontSize: 16,
    marginTop: 2,
    fontWeight: '500',
  },
  selectCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16, // 기존 66 → 16
    zIndex: 1000,
  },
  selectText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectTextDim: {
    color: '#BDBDBD',
    fontSize: 16,
    marginTop: 2,
    fontWeight: '400',
  },
  lockCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16, // 기존 66 → 16
    zIndex: 1000,
  },
  lockIcon: {
    width: 32,
    height: 32,
    tintColor: '#888',
  },
  coinIcon: { width: 18, height: 18, marginRight: 3 },
  priceText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});  