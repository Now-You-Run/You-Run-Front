import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface CharacterSectionProps {
  userName: string;
  /** 초 단위 평균 페이스 */
  averagePace: number;
}

function formatPace(min: number): string {
  // 분 단위 실수 → 전체 초
  const totalSec = Math.round(min * 60);
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}'${s}"`;
}

export default function CharacterSection({ userName, averagePace, }:  CharacterSectionProps) {
  return (
    <View style={styles.characterSection}>
      <View style={styles.nameContainer}>
        <Image
          source={require('@/assets/images/diamond.png')}
          style={styles.diamondIcon}
        />
        <Text style={styles.characterName}> {userName} </Text>
      </View>
      <View style={styles.characterContainer}>
        <View style={styles.paceContainer}>
          <Text style={styles.paceText}>
            {formatPace(averagePace)}
          </Text>
        </View>
        <Image
          source={require('@/assets/images/character.png')}
          style={styles.characterImage}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
      characterSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10, // 50에서 20으로 줄여서 위쪽으로 이동
    marginTop: -120, // 위쪽으로 더 이동
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  characterName: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  diamondIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  characterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceContainer: {
    position: 'absolute',
    zIndex: 1,
    right: -35,
    top: 55,
  },
  paceText: {
    fontSize: 150,
    fontWeight: 'bold',
    fontFamily: 'Karantina-Regular',
    color: 'rgba(22, 22, 22, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 2, height: 9 },
    textShadowRadius: 5,
    transform: [{ scaleY: 1.3 }],
  },
  characterImage: {
    width: 350,
    height: 450,
    resizeMode: 'contain',
    zIndex: 2,
  },
}
)