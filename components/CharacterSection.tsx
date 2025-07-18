import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { HomeAvatarDisplay } from './HomeAvatarDisplay';

interface CharacterSectionProps {
  userName: string;
  /** 초 단위 평균 페이스 */
  averagePace: number;
  selectedAvatar?: { id: string; url: string; } | null;
}

function formatPace(min: number): string {
  const totalSec = Math.round(min * 60);
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}'${s}"`;
}

export default function CharacterSection({ userName, averagePace, selectedAvatar }: CharacterSectionProps) {
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
        {selectedAvatar ? (
          <View style={styles.avatarContainer}>
            <HomeAvatarDisplay avatarUrl={selectedAvatar.url} />
          </View>
        ) : (
          <Image
            source={require('@/assets/images/character.png')}
            style={styles.characterImage}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  characterSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
    maxHeight: '65%',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -10, // 0에서 -10으로 변경하여 간격 더 축소
    marginTop: 30,
  },
  characterContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
    position: 'relative',
    marginTop: -10, // 추가: 아바타 컨테이너를 위로
  },
  avatarContainer: {
    width: 350,
    height: 600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -100,
    zIndex: 2,
  },
  characterImage: {
    width: 350,
    height: 600, // 500에서 600으로 증가
    resizeMode: 'contain',
  },
  characterName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  diamondIcon: {
    width: 24,
    height: 24,
    marginRight: 5,
  },
  paceContainer: {
    position: 'absolute',
    right: '10%',
    top: '15%',
    zIndex: 1,
  },
  paceText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#000',
  },
});