
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { READY_PLAYER_ME_CONFIG } from '@/config/ReadyPlayerMe';

interface Asset {
  id: string;
  name: string;
  iconUrl?: string;
  type: string;
}

interface OutfitChangerProps {
  avatarId: string;
  onOutfitChanged?: (outfitData: any) => void;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const OutfitChanger: React.FC<OutfitChangerProps> = ({ avatarId, onOutfitChanged }) => {
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [currentAvatar, setCurrentAvatar] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('outfit');
  const [assetsLoading, setAssetsLoading] = useState(true);

  const categories: Category[] = [
    { id: 'outfit', name: '옷', icon: '👔' },
    { id: 'hair', name: '헤어', icon: '💇' },
    { id: 'glasses', name: '안경', icon: '👓' },
    { id: 'headwear', name: '모자', icon: '🧢' },
    { id: 'facewear', name: '얼굴', icon: '😊' }
  ];

  useEffect(() => {
    if (avatarId) {
      loadCurrentAvatar();
      loadAvailableAssets();
    }
  }, [avatarId, selectedCategory]);

  
  const loadCurrentAvatar = async () => {
    try {
     
      const response = await fetch(`${READY_PLAYER_ME_CONFIG.API_BASE_URL}/v2/avatars/${avatarId}`);
      
      if (response.ok) {
        const data = await response.json();
        setCurrentAvatar(data.data);
      } else {
        console.error('Failed to load current avatar');
      }
    } catch (error) {
      console.error('Error loading current avatar:', error);
    
      loadAvatarFromLocal();
    }
  };

  const loadAvatarFromLocal = async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const avatarsJson = await AsyncStorage.getItem('@avatars');
      const avatars = avatarsJson ? JSON.parse(avatarsJson) : [];
      const avatar = avatars.find((a: any) => a.id === avatarId);
      if (avatar) {
        setCurrentAvatar({
          id: avatar.id,
          assets: avatar.assets || {} 
        });
      }
    } catch (error) {
      console.error('Error loading avatar from local:', error);
    }
  };

  
  const loadAvailableAssets = async () => {
    try {
      setAssetsLoading(true);
      
    
      const url = `${READY_PLAYER_ME_CONFIG.API_BASE_URL}/v1/assets`;
      const params = new URLSearchParams();
      
    
      if (selectedCategory === 'hair') {
        params.append('type', 'hair');
      } else if (selectedCategory === 'outfit') {
        params.append('type', 'outfit');
      } else if (selectedCategory === 'glasses') {
        params.append('type', 'eyewear');
      } else if (selectedCategory === 'headwear') {
        params.append('type', 'headwear');
      } else if (selectedCategory === 'facewear') {
        params.append('type', 'facewear');
      }

      const response = await fetch(`${url}?${params}`, {
        headers: {
          
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableAssets(data.data || []);
      } else {
        console.error('Failed to load assets:', response.status);
        
        setAvailableAssets(getDummyAssets(selectedCategory));
      }
    } catch (error) {
      console.error('Error loading assets:', error);
     
      setAvailableAssets(getDummyAssets(selectedCategory));
    } finally {
      setAssetsLoading(false);
    }
  };

  
  const getDummyAssets = (category: string): Asset[] => {
    const dummyAssets: Record<string, Asset[]> = {
      outfit: [
        { id: 'outfit_1', name: '캐주얼 셔츠', iconUrl: '', type: 'outfit' },
        { id: 'outfit_2', name: '정장', iconUrl: '', type: 'outfit' },
        { id: 'outfit_3', name: '후디', iconUrl: '', type: 'outfit' }
      ],
      hair: [
        { id: 'hair_1', name: '짧은 머리', iconUrl: '', type: 'hair' },
        { id: 'hair_2', name: '긴 머리', iconUrl: '', type: 'hair' },
        { id: 'hair_3', name: '곱슬머리', iconUrl: '', type: 'hair' }
      ],
      glasses: [
        { id: 'glasses_1', name: '검은테 안경', iconUrl: '', type: 'glasses' },
        { id: 'glasses_2', name: '선글라스', iconUrl: '', type: 'glasses' }
      ],
      headwear: [
        { id: 'headwear_1', name: '야구모자', iconUrl: '', type: 'headwear' },
        { id: 'headwear_2', name: '비니', iconUrl: '', type: 'headwear' }
      ],
      facewear: [
        { id: 'facewear_1', name: '미소', iconUrl: '', type: 'facewear' },
        { id: 'facewear_2', name: '찡그림', iconUrl: '', type: 'facewear' }
      ]
    };
    
    return dummyAssets[category] || [];
  };

  
  const changeOutfit = async (assetId: string) => {
    try {
      setLoading(true);
      
      
      const updatedAssets = {
        ...currentAvatar?.assets,
        [selectedCategory]: assetId
      };

     
      const response = await fetch(`${READY_PLAYER_ME_CONFIG.API_BASE_URL}/v2/avatars/${avatarId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify({
          assets: updatedAssets
        })
      });

      if (response.ok) {
        const updatedAvatar = await response.json();
        setCurrentAvatar(updatedAvatar.data);
        
 
        await updateLocalAvatar(avatarId, updatedAssets);
        
     
        if (onOutfitChanged) {
          onOutfitChanged({
            avatarId: avatarId,
            url: `${READY_PLAYER_ME_CONFIG.MODELS_BASE_URL}/${avatarId}.glb`,
            updatedAt: new Date().toISOString(),
            newAsset: { category: selectedCategory, assetId }
          });
        }
        
        Alert.alert('성공', `${categories.find(c => c.id === selectedCategory)?.name}이(가) 변경되었습니다!`);
      } else {
        throw new Error('Failed to update outfit');
      }
    } catch (error) {
      console.error('Error changing outfit:', error);
      Alert.alert('오류', '옷 변경에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };


  const updateLocalAvatar = async (avatarId: string, newAssets: any) => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const avatarsJson = await AsyncStorage.getItem('@avatars');
      const avatars = avatarsJson ? JSON.parse(avatarsJson) : [];
      const updatedAvatars = avatars.map((avatar: any) => 
        avatar.id === avatarId 
          ? { ...avatar, assets: newAssets, updatedAt: new Date().toISOString() }
          : avatar
      );
      
      await AsyncStorage.setItem('@avatars', JSON.stringify(updatedAvatars));
    } catch (error) {
      console.error('Error updating local avatar:', error);
    }
  };

  const renderCategoryTab = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        selectedCategory === item.id && styles.selectedCategoryTab
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.selectedCategoryText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderAssetItem = ({ item }: { item: Asset }) => {
    const isCurrentlyEquipped = currentAvatar?.assets?.[selectedCategory] === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.assetItem,
          isCurrentlyEquipped && styles.equippedAssetItem
        ]}
        onPress={() => !loading && changeOutfit(item.id)}
        disabled={loading}
      >
        {item.iconUrl ? (
          <Image source={{ uri: item.iconUrl }} style={styles.assetIcon} />
        ) : (
          <View style={styles.placeholderIcon}>
            <Text style={styles.placeholderText}>{item.name?.charAt(0) || '?'}</Text>
          </View>
        )}
        <Text style={styles.assetName} numberOfLines={2}>{item.name}</Text>
        {isCurrentlyEquipped && (
          <View style={styles.equippedBadge}>
            <Text style={styles.equippedText}>착용중</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!avatarId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>아바타를 선택해주세요</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>옷 갈아입히기</Text>
      <Text style={styles.subtitle}>Avatar ID: {avatarId}</Text>
      
      {/* 카테고리 탭 */}
      <FlatList
        data={categories}
        renderItem={renderCategoryTab}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryListContent}
      />
      
      {/* Assets 목록 */}
      {assetsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Assets 로딩 중...</Text>
        </View>
      ) : (
        <FlatList
          data={availableAssets}
          renderItem={renderAssetItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={styles.assetsList}
          contentContainerStyle={styles.assetsListContent}
        />
      )}
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingOverlayText}>적용 중...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  categoryList: {
    maxHeight: 80,
  },
  categoryListContent: {
    paddingHorizontal: 16,
  },
  categoryTab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    minWidth: 70,
  },
  selectedCategoryTab: {
    backgroundColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  assetsList: {
    flex: 1,
    marginTop: 16,
  },
  assetsListContent: {
    paddingHorizontal: 16,
  },
  assetItem: {
    flex: 1,
    margin: 8,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  equippedAssetItem: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  assetIcon: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  assetName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 36,
  },
  equippedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  equippedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default OutfitChanger;