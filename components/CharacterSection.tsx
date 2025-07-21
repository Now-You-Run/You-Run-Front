import React, { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { HomeAvatarDisplay } from './HomeAvatarDisplay';

interface CharacterSectionProps {
  userName: string;
  /** 초 단위 평균 페이스 */
  averagePace: number;
  selectedAvatar?: { id: string; url: string; } | null;
  grade: string;
}

function formatPace(min: number): string {
  const totalSec = Math.round(min * 60);
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}'${s}″`.replace(/\s/g, '');  // 모든 공백 제거
}

// 등급별 이미지 매핑
const gradeImages: Record<string, any> = {
  "아이언": require('../assets/images/iron.png'),
  "브론즈": require('../assets/images/bronze.png'),
  "실버": require('../assets/images/silver.png'),
  "골드": require('../assets/images/gold.png'),
  "플래티넘": require('../assets/images/platinum.png'),
  "다이아": require('../assets/images/diamond.png'),
  "마스터": require('../assets/images/master.png'),
  "그랜드 마스터": require('../assets/images/grandmaster.png'),
  "레전드 러너": require('../assets/images/legend.png'),
};

export default function CharacterSection({ userName, averagePace, selectedAvatar, grade }: CharacterSectionProps) { 
  const formattedPace = formatPace(averagePace);
  const [avatarDimensions, setAvatarDimensions] = useState<{ width: number; height: number } | null>(null);
  console.log('Rendering CharacterSection:', { userName, averagePace, formattedPace });  // 디버그 로그 추가

  const renderPaceText = () => {
    console.log('Rendering pace text:', formattedPace);  // 디버그 로그 추가

    // 페이스가 0이면 렌더링하지 않음
    if (averagePace === 0) {
      console.log('Average pace is 0, not rendering pace text');  // 디버그 로그 추가
      return null;
    }

  // 바닥 그림자만 유지
  const groundShadows = Array.from({ length: 8 }, (_, index) => {
    const opacity = 0.07 * Math.pow(0.8, index);
    const scale = 1.3 + (index * 0.2);
    const width = 180 + (index * 20);
    
    return (
      <View
        key={`ground-shadow-${index}`}
        style={{
          position: 'absolute',
          width: 90 + (index * 2),
          height: 8 + (index * 1.8),
          backgroundColor: '#000',
          opacity: opacity,
          bottom: 5 - (index * 1.8),
          right: 30 + (index * 1.6),
          transform: [
            { rotateY: '25deg' },
            { scaleX: scale },
            { translateX: -50 }
          ],
          borderRadius: 100,
          zIndex: -26,
        }}
      />
    );
  });

  const shadowLayers = Array.from({ length: 5 }, (_, index) => {
    const offset = index * 1.0;
    return (
      <Text
        key={`shadow-${index}`}
        style={[
          styles.main,
          {
            position: 'absolute',
            transform: Platform.select({
              ios: [
                { translateX: offset },
                { translateY: offset * 0.1 },
                { scaleY: 4.0 },
                { scaleX: 0.6 }
              ],
              android: [
                { translateX: offset },
                { translateY: offset * 0.1 }
              ]
            }),
            color: `rgba(180, 180, 180, ${0.8 - (index * 0.15)})`,
            zIndex: 30 - index,
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
      
      {/* 단일 뒷면 그림자 */}
      <Text style={[styles.main, {
        position: 'absolute',
        transform: Platform.select({
          ios: [
            { translateX: 4 },
            { translateY: 4 }
          ],
          android: [
            { translateX: 2 },
            { translateY: 2 }
          ]
        }),
        zIndex: 29,
        color: 'rgba(120, 120, 120, 0.7)',
      }]}>
        {formattedPace}
      </Text>

      {/* 메인 텍스트 */}
      <Text style={[styles.main, {
        position: 'absolute',
        transform: Platform.select({
          ios: [],
          android: []
        }),
        zIndex: 31,
        color: '#e7e4e4fd',
        ...Platform.select({
          ios: {
            textShadowColor: 'rgba(100, 100, 100, 0.6)',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 1,
            elevation: 8,
            shadowOpacity: 0.6,
            shadowRadius: 2,
            shadowOffset: { width: 2, height: 2 },
          },
          android: {
            elevation: 5,
          }
        })
      }]}>
        {formattedPace}
      </Text>
    </View>
  );
};

  return (
    <View style={styles.characterSection}>
      <View style={styles.characterContainer}>
        <View style={[
          styles.nameContainer,
          {
            position: 'absolute',
            top: Platform.select({
              ios: 20,
              android: 20
            }),
            alignSelf: 'center',
            marginRight:100,
            zIndex: 6
          }
        ]}>
          <Image
            source={gradeImages[grade] || gradeImages["아이언"]}
            style={styles.GradeIcon}
          />
          <Text style={styles.characterName}> {userName} </Text>
        </View>
        <View style={[styles.paceContainer]}>
          {renderPaceText()}
        </View>
        {selectedAvatar ? (
          <View style={styles.avatarContainer}>
            <HomeAvatarDisplay 
              avatarUrl={selectedAvatar.url}
            />
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
    justifyContent: 'center',
    zIndex: 6,
    marginLeft:-25,
  },
  characterContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  avatarContainer: {
    width: 350,
    height: 600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -5,
    marginLeft: -120,  // -120에서 0으로 수정
    ...Platform.select({
      ios: {
        zIndex: 2,
      }
    })
  },
  characterImage: {
    width: 350,
    height: 600,
    resizeMode: 'contain',
    marginLeft: -120,  // -120에서 0으로 수정
    marginTop: -30,
    ...Platform.select({
      ios: {
        zIndex: 2,
      }
    })
  },
  characterName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  
  paceContainer: {
    position: 'absolute',
    right: '-20%',    // -40%에서 -20%로 수정
    bottom: '18%',
    width: 350,      
    height: 200,     
    alignItems: 'center',    
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        zIndex: -1,
      },
      android: {
        elevation: 10,
      }
    })
  },
  paceTextContainer: {
    position: 'relative',
    width: 350,      
    height: 200,     
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        transform: [
          { rotateZ: '1deg' },
          { rotateY: '35deg' },
          { rotateX: '-20deg'},
        ],
      },
      android: {
        transform: [],
        elevation: 10,
      }
    })
  },
  main: {
    position: 'absolute',
    fontSize: 100,
    fontWeight: Platform.select({
      ios: '900',
      android: 'bold'
    }),
    fontFamily: Platform.select({
      ios: 'HelveticaNeue-CondensedBlack',
      android: 'sans-serif-black'
    }),
    width: '100%',
    textAlign: 'center',
    lineHeight: Platform.select({
      ios: 288,
      android: 100
    }),
    color: '#e7e4e4fd',
    ...Platform.select({
      ios: {},
      android: {
        elevation: 10,
        letterSpacing: -6,  // 안드로이드에서 글자 간격 줄이기
      }
    })
  },
  shadowLayer: {
    position: 'absolute',
  },
  frontLayer: {
    zIndex: 31,
    color: '#e7e4e4fd',
  },
  GradeIcon: {
    width: 24,
    height: 24,
    marginRight: 5,
    resizeMode: 'contain',
  },
});