import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
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
  return `${m}'${s}″`.replace(/\s/g, '');  // 모든 공백 제거
}

export default function CharacterSection({ userName, averagePace, selectedAvatar }: CharacterSectionProps) {
  const formattedPace = formatPace(averagePace);

  const renderPaceText = () => {
    // 바닥 그림자 레이어 추가
    const groundShadows = Array.from({ length: 12 }, (_, index) => {  // 레이어 수 증가
      // 투명도를 지수 함수적으로 감소시켜 더 부드러운 변화 생성
      const opacity = 0.08 * Math.pow(0.85, index);
      const scale = 1.1 + (index * 0.1);  // 크기 증가율 감소
      return (
        <View
          key={`ground-shadow-${index}`}
          style={{
            position: 'absolute',
            width: 180,
            height: 8 + (index * 1.8),  // 높이 증가율 감소
            backgroundColor: '#000',
            opacity: opacity,
            bottom: -5 - (index * 1.5),  // 간격 감소
            right: 30 + (index * 1.5),   // 간격 감소
            transform: [
              { rotateY: '25deg' },
              { scaleX: scale },
              { translateX: -20 }
            ],
            borderRadius: 100,
            zIndex: -26,
          }}
        />
      );
    });

    const shadowLayers = Array.from({ length: 25 }, (_, index) => {
      const offset = index * 0.8;
      return (
        <Text
          key={`shadow-${index}`}
          style={[
            styles.main,
            {
              position: 'absolute',
              transform: [
                { translateX: offset },
                { translateY: offset * 0.15 },
                { scaleY: 2.5 },
                { scaleX: 0.9 }
              ],
              color: `rgba(180, 180, 180, ${1 - (index * 0.03)})`,
              zIndex: -25 + index,
            }
          ]}
        >
          {formattedPace}
        </Text>
      );
    });

    return (
      <View style={styles.paceTextContainer}>
        {groundShadows}
        {shadowLayers}
        <Text style={[styles.main, {
          position: 'absolute',
          transform: [
            { scaleY: 2.5 },
            { scaleX: 0.9 }
          ],
          zIndex: 31,
          color: '#ffffff'
        }]}>
          {formattedPace}
        </Text>
      </View>
    );
  };

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
        <View style={[styles.paceContainer, {
          transform: [
            { translateX: 100 },   // 60에서 100으로 수정하여 더 오른쪽으로
            { translateY: 50 }    // 0에서 50으로 수정하여 더 아래로
          ]
        }]}>
          {renderPaceText()}
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
    marginBottom: 20,
    marginTop: 30,
  },
  characterContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 350,
    height: 600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -80,  // -50에서 -80으로 수정하여 위로 올림
    marginLeft: -120,
    zIndex: 2,
  },
  characterImage: {
    width: 350,
    height: 600,
    resizeMode: 'contain',
    marginLeft: -120,
    marginTop: -30,  // 새로 추가하여 기본 이미지도 위로 올림
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
    right: '25%',    // -20%에서 25%로 수정
    bottom: '15%',
    zIndex: -1,
  },
  paceTextContainer: {
    position: 'relative',
    width: 300,     // 400에서 300으로 수정
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [
      { rotateZ: '0deg' },
      { rotateY: '25deg' }
    ],
    flexDirection: 'row',
  },
  main: {
    fontSize: 90,    // 100에서 90으로 수정
    fontWeight: '900',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
    width: 300,     // 400에서 300으로 수정
    textAlign: 'center',
    lineHeight: 90,  // fontSize와 맞춤
    flexShrink: 1,
    letterSpacing: -1,
  },
});