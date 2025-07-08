import CharacterSection from '@/components/CharacterSection';
import FloatingActionButton from '@/components/FloatingActionButton';
import ProfileIcons from '@/components/ProfileIcons';
import { useDrawer } from '@/context/DrawerContext';
import {
  getTimeBasedColors,
  getWeatherAnimationKey,
  getWeatherData,
  WeatherAnimationKey
} from '@/utils/WeatherUtils';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// ReadyPlayerMe 관련 imports
import AvatarCreator from '@/components/ReadyPlayerMe/AvatarCreator';
import OutfitChanger from '@/components/ReadyPlayerMe/OutfitChanger';
import { AuthAsyncStorage } from '@/repositories/AuthAsyncStorage';
import { AvatarService } from '@/services/AvatarService';

// Splash screen for font loading
SplashScreen.preventAutoHideAsync();

interface Avatar {
  id: string;
  url: string;
  createdAt: string;
  updatedAt?: string;
  bodyType?: string;
  isDefault?: boolean;
}

export default function HomeScreen() {
  // Animation sources and styles
  const animationSources: Record<WeatherAnimationKey, any> = {
    rain: require('@/assets/animations/rain.json'),
    snow: require('@/assets/animations/snow.json'),
    cloud: require('@/assets/animations/cloud.json'),
    sunny: require('@/assets/animations/sunny.json'),
    moon: require('@/assets/animations/moon.json'),
  };

  const animationStyleObjects: Record<WeatherAnimationKey, object> = {
    rain: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none' },
    snow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none' },
    cloud: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', zIndex: 5, pointerEvents: 'none' },
    sunny: { position: 'absolute', top: 50, left: 20, width: 120, height: 120, zIndex: 5, pointerEvents: 'none' },
    moon: { position: 'absolute', top: 40, left: 10, width: 140, height: 140, zIndex: 5, pointerEvents: 'none' },
  };

  // Original state
  const [backgroundColors, setBackgroundColors] = useState<[string, string, string]>(['#E8E4F3', '#F8F9FA', '#FFFFFF']);
  const [currentWeather, setCurrentWeather] = useState('Clear');
  const [animationKey, setAnimationKey] = useState<WeatherAnimationKey>('sunny');
  const [weatherAnimation, setWeatherAnimation] = useState(animationSources.sunny);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userName] = useState('나롱이');

  // ReadyPlayerMe state
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [showOutfitChanger, setShowOutfitChanger] = useState(false);
  const [showAvatarManager, setShowAvatarManager] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [defaultAvatar, setDefaultAvatar] = useState<Avatar | null>(null);
  const [avatarsLoading, setAvatarsLoading] = useState(false);

  const { isMenuVisible, closeMenu } = useDrawer();
  const router = useRouter();

  // Font loading
  const [fontsLoaded] = useFonts({
    'Karantina-Light': require('@/assets/fonts/Karantina-Light.ttf'),
    'Karantina-Regular': require('@/assets/fonts/Karantina-Regular.ttf'),
    'Karantina-Bold': require('@/assets/fonts/Karantina-Bold.ttf'),
  });

  useEffect(() => {
    console.log('화면이 처음 나타났습니다!');
    AuthAsyncStorage.saveUserId(1);

  }, []);
  // Weather update logic
  const updateWeather = async () => {
    const { weatherMain, currentHour } = await getWeatherData();
    setBackgroundColors(getTimeBasedColors(currentHour, weatherMain));
    setCurrentWeather(weatherMain);

    const key = getWeatherAnimationKey(weatherMain, currentHour);
    setAnimationKey(key);
    setWeatherAnimation(animationSources[key]);
  };

  // ReadyPlayerMe functions
  const loadAvatars = async () => {
    try {
      setAvatarsLoading(true);
      const storedAvatars = await AvatarService.getStoredAvatars();
      setAvatars(storedAvatars);
    } catch (error) {
      console.error('Error loading avatars:', error);
    } finally {
      setAvatarsLoading(false);
    }
  };

  const loadDefaultAvatar = async () => {
    try {
      const avatar = await AvatarService.getDefaultAvatar();
      setDefaultAvatar(avatar);
      setSelectedAvatar(avatar);
    } catch (error) {
      console.error('Error loading default avatar:', error);
    }
  };

  const handleAvatarCreated = async (avatarData: Avatar) => {
    console.log('새 아바타 생성됨:', avatarData);

    await loadAvatars();
    setSelectedAvatar(avatarData);
    setDefaultAvatar(avatarData);
  };

  const handleOutfitChanged = (outfitData: any) => {
    console.log('옷 변경됨:', outfitData);

    if (selectedAvatar && selectedAvatar.id === outfitData.avatarId) {
      setSelectedAvatar({
        ...selectedAvatar,
        updatedAt: outfitData.updatedAt
      });
    }
  };

  const selectAvatar = async (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    await AvatarService.setDefaultAvatar(avatar);
    setDefaultAvatar(avatar);
  };

  const deleteAvatar = async (avatarId: string) => {
    Alert.alert(
      '아바타 삭제',
      '정말로 이 아바타를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const success = await AvatarService.deleteAvatar(avatarId);
            if (success) {
              await loadAvatars();

              if (selectedAvatar && selectedAvatar.id === avatarId) {
                setSelectedAvatar(null);
                setDefaultAvatar(null);
              }
            }
          }
        }
      ]
    );
  };

  const renderAvatarItem = ({ item }: { item: Avatar }) => (
    <TouchableOpacity
      style={[
        styles.avatarItem,
        selectedAvatar && selectedAvatar.id === item.id && styles.selectedAvatarItem
      ]}
      onPress={() => selectAvatar(item)}
    >
      <Image
        source={{ uri: AvatarService.getAvatarThumbnailUrl(item.url) }}
        style={styles.avatarThumbnail}
        defaultSource={require('@/assets/images/avatar-placeholder.png')}
      />
      <View style={styles.avatarInfo}>
        <Text style={styles.avatarId} numberOfLines={1}>ID: {item.id}</Text>
        <Text style={styles.avatarDate}>
          생성: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        {item.updatedAt && (
          <Text style={styles.avatarUpdated}>
            수정: {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteAvatar(item.id)}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
  useEffect(() => {

  })

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      updateWeather();
      loadAvatars();
      loadDefaultAvatar();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const interval = setInterval(updateWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FloatingActionButton />
      <LinearGradient
        colors={backgroundColors}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        locations={[0, 0.7, 1]}
      >
        {/* Weather animation */}
        {weatherAnimation && (
          <LottieView
            source={weatherAnimation}
            autoPlay
            loop
            style={animationStyleObjects[animationKey]}
          />
        )}

        {/* Weather info (debug) */}
        <View style={styles.weatherInfo}>
          <Text style={styles.weatherText}>현재 날씨: {currentWeather}</Text>
        </View>

        {/* Avatar quick access */}
        {defaultAvatar && (
          <TouchableOpacity
            style={styles.avatarQuickAccess}
            onPress={() => setShowAvatarManager(true)}
          >
            <Image
              source={{ uri: AvatarService.getAvatarThumbnailUrl(defaultAvatar.url) }}
              style={styles.quickAvatarImage}
              defaultSource={require('@/assets/images/avatar-placeholder.png')}
            />
            <Text style={styles.avatarQuickText}>아바타</Text>
          </TouchableOpacity>
        )}

        {/* Main content */}
        <View style={styles.content}>
          <ProfileIcons />
          <CharacterSection userName={userName} />
        </View>

        {/* Bottom buttons */}
        {!isModalVisible && (
          <View style={styles.bottomSection}>
            {/* Avatar buttons */}
            <View style={styles.avatarButtons}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={() => setShowAvatarCreator(true)}
              >
                <Text style={styles.avatarButtonText}>아바타 생성</Text>
              </TouchableOpacity>

              {selectedAvatar && (
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={() => setShowOutfitChanger(true)}
                >
                  <Text style={styles.avatarButtonText}>옷 갈아입히기</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Run button */}
            <TouchableOpacity
              style={styles.runButton}
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.runButtonText}>달리기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Run mode modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={() => { }}
            >
              <Text style={styles.modalText}>{userName}님, 달려볼까요?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modeButton, styles.freeButton]}
                  onPress={() => {
                    setIsModalVisible(false);
                    router.push('./(drawer)/Running');
                  }}
                >
                  <Text style={styles.modeButtonText}>자유</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, styles.trackButton]}
                  onPress={() => {
                    setIsModalVisible(false);
                    router.push('/(drawer)/SelectTrack');
                  }}
                >
                  <Text style={styles.modeButtonText}>트랙</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Avatar Manager Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showAvatarManager}
          onRequestClose={() => setShowAvatarManager(false)}
        >
          <View style={styles.avatarManagerOverlay}>
            <View style={styles.avatarManagerContent}>
              <View style={styles.avatarManagerHeader}>
                <Text style={styles.avatarManagerTitle}>내 아바타 ({avatars.length})</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowAvatarManager(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Current Avatar */}
              {selectedAvatar && (
                <View style={styles.currentAvatarSection}>
                  <Text style={styles.currentAvatarTitle}>현재 아바타</Text>
                  <View style={styles.currentAvatarCard}>
                    <Image
                      source={{ uri: AvatarService.getAvatarFullBodyUrl(selectedAvatar.url) }}
                      style={styles.currentAvatarImage}
                      defaultSource={require('@/assets/images/avatar-placeholder.png')}
                    />
                    <View style={styles.currentAvatarInfo}>
                      <Text style={styles.currentAvatarId}>ID: {selectedAvatar.id}</Text>
                      <TouchableOpacity
                        style={styles.customizeButton}
                        onPress={() => {
                          setShowAvatarManager(false);
                          setShowOutfitChanger(true);
                        }}
                      >
                        <Text style={styles.customizeButtonText}>옷 갈아입히기</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Avatar List */}
              <View style={styles.avatarListSection}>
                <Text style={styles.avatarListTitle}>모든 아바타</Text>
                {avatarsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                  </View>
                ) : avatars.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>아직 생성된 아바타가 없습니다</Text>
                    <TouchableOpacity
                      style={styles.createFirstAvatarButton}
                      onPress={() => {
                        setShowAvatarManager(false);
                        setShowAvatarCreator(true);
                      }}
                    >
                      <Text style={styles.createFirstAvatarText}>첫 아바타 만들기</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={avatars}
                    renderItem={renderAvatarItem}
                    keyExtractor={(item) => item.id}
                    style={styles.avatarList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Avatar Creator Modal */}
        <AvatarCreator
          visible={showAvatarCreator}
          onClose={() => setShowAvatarCreator(false)}
          onAvatarCreated={handleAvatarCreated}
        />

        {/* Outfit Changer Modal */}
        {selectedAvatar && (
          <Modal
            animationType="slide"
            transparent={false}
            visible={showOutfitChanger}
            onRequestClose={() => setShowOutfitChanger(false)}
          >
            <SafeAreaView style={styles.outfitChangerContainer}>
              <View style={styles.outfitChangerHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowOutfitChanger(false)}
                >
                  <Text style={styles.backButtonText}>← 뒤로</Text>
                </TouchableOpacity>
                <Text style={styles.outfitChangerTitle}>옷 갈아입히기</Text>
                <View style={styles.placeholder} />
              </View>

              <OutfitChanger
                avatarId={selectedAvatar.id}
                onOutfitChanged={handleOutfitChanged}
              />
            </SafeAreaView>
          </Modal>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
  },
  weatherInfo: {
    position: 'absolute',
    top: 100,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 5,
    zIndex: 15,
  },
  weatherText: {
    color: 'white',
    fontSize: 12,
  },
  avatarQuickAccess: {
    position: 'absolute',
    top: 100,
    right: 20,
    alignItems: 'center',
    zIndex: 15,
  },
  quickAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  avatarQuickText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  avatarButtons: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  avatarButton: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  runButton: {
    backgroundColor: '#5EFFAE',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 30,
    alignItems: 'center',
    height: '33%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 50,
  },
  modeButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  freeButton: {
    backgroundColor: '#FFF79A',
  },
  trackButton: {
    backgroundColor: '#FF9CF8',
  },
  modeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  // Avatar Manager Modal Styles
  avatarManagerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarManagerContent: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  avatarManagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarManagerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  currentAvatarSection: {
    marginBottom: 20,
  },
  currentAvatarTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#495057',
  },
  currentAvatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  currentAvatarImage: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#E9ECEF',
  },
  currentAvatarInfo: {
    flex: 1,
    marginLeft: 16,
  },
  currentAvatarId: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    color: '#495057',
  },
  customizeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  customizeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarListSection: {
    flex: 1,
  },
  avatarListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#495057',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 16,
  },
  createFirstAvatarButton: {
    backgroundColor: '#28A745',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createFirstAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarList: {
    flex: 1,
  },
  avatarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatarItem: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  avatarThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E9ECEF',
  },
  avatarInfo: {
    flex: 1,
    marginLeft: 12,
  },
  avatarId: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#495057',
  },
  avatarDate: {
    fontSize: 10,
    color: '#6C757D',
    marginBottom: 2,
  },
  avatarUpdated: {
    fontSize: 10,
    color: '#28A745',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Outfit Changer Modal Styles
  outfitChangerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  outfitChangerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outfitChangerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 80,
  },
});