
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Avatar {
  id: string;
  url: string;
  createdAt: string;
  updatedAt?: string;
  bodyType?: string;
  isDefault?: boolean;
  assets?: any;
}

export class AvatarService {
  static STORAGE_KEYS = {
    AVATARS: '@avatars',
    DEFAULT_AVATAR: '@defaultAvatar',
    CURRENT_OUTFIT: '@currentOutfit'
  };

  
  static async getStoredAvatars(): Promise<Avatar[]> {
    try {
      const avatarsJson = await AsyncStorage.getItem(this.STORAGE_KEYS.AVATARS);
      return avatarsJson ? JSON.parse(avatarsJson) : [];
    } catch (error) {
      console.error('Error getting stored avatars:', error);
      return [];
    }
  }

  
  static async getDefaultAvatar(): Promise<Avatar | null> {
    try {
      const avatarJson = await AsyncStorage.getItem(this.STORAGE_KEYS.DEFAULT_AVATAR);
      return avatarJson ? JSON.parse(avatarJson) : null;
    } catch (error) {
      console.error('Error getting default avatar:', error);
      return null;
    }
  }

  
  static async setDefaultAvatar(avatar: Avatar): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.DEFAULT_AVATAR, JSON.stringify(avatar));
      return true;
    } catch (error) {
      console.error('Error setting default avatar:', error);
      return false;
    }
  }


  static async deleteAvatar(avatarId: string): Promise<boolean> {
    try {
      const avatars = await this.getStoredAvatars();
      const filteredAvatars = avatars.filter(avatar => avatar.id !== avatarId);
      await AsyncStorage.setItem(this.STORAGE_KEYS.AVATARS, JSON.stringify(filteredAvatars));
      

      const defaultAvatar = await this.getDefaultAvatar();
      if (defaultAvatar && defaultAvatar.id === avatarId) {
        await AsyncStorage.removeItem(this.STORAGE_KEYS.DEFAULT_AVATAR);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting avatar:', error);
      return false;
    }
  }

  
  static async saveAvatar(avatarData: Avatar): Promise<boolean> {
    try {
      const existingAvatars = await this.getStoredAvatars();
      
     
      const avatarIndex = existingAvatars.findIndex(avatar => avatar.id === avatarData.id);
      
      if (avatarIndex >= 0) {
       
        existingAvatars[avatarIndex] = {
          ...existingAvatars[avatarIndex],
          ...avatarData,
          updatedAt: new Date().toISOString()
        };
      } else {
    
        existingAvatars.push({
          ...avatarData,
          createdAt: avatarData.createdAt || new Date().toISOString()
        });
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.AVATARS, JSON.stringify(existingAvatars));
      return true;
    } catch (error) {
      console.error('Error saving avatar:', error);
      return false;
    }
  }


  static async getAvatar(avatarId: string): Promise<Avatar | null> {
    try {
      const avatars = await this.getStoredAvatars();
      return avatars.find(avatar => avatar.id === avatarId) || null;
    } catch (error) {
      console.error('Error getting avatar:', error);
      return null;
    }
  }

  
  static async updateAvatarMetadata(avatarId: string, updates: Partial<Avatar>): Promise<Avatar | null> {
    try {
      const existingAvatars = await this.getStoredAvatars();
      const avatarIndex = existingAvatars.findIndex(avatar => avatar.id === avatarId);
      
      if (avatarIndex >= 0) {
        existingAvatars[avatarIndex] = {
          ...existingAvatars[avatarIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        await AsyncStorage.setItem(this.STORAGE_KEYS.AVATARS, JSON.stringify(existingAvatars));
        return existingAvatars[avatarIndex];
      } else {
        throw new Error('Avatar not found');
      }
    } catch (error) {
      console.error('Error updating avatar metadata:', error);
      throw error;
    }
  }

    static getAvatarThumbnailUrl(avatarUrl: string): string {
    if (!avatarUrl) {
      return 'https://via.placeholder.com/200x200/E0E0E0/666666?text=Avatar';
    }
    
    const baseUrl = avatarUrl.replace('.glb', '.png');
    return `${baseUrl}?scene=bust-portrait&width=200&height=200`;
  }

  
 static getAvatarFullBodyUrl(avatarUrl: string): string {
    if (!avatarUrl) {
      return 'https://via.placeholder.com/400x600/E0E0E0/666666?text=Avatar';
    }
    
    const baseUrl = avatarUrl.replace('.glb', '.png');
    return `${baseUrl}?scene=fullbody-portrait-v1&width=400&height=600`;
  }


  static generateAvatarUrl(baseUrl: string, options: {
    morphTargets?: string;
    pose?: string;
    textureAtlas?: string;
    textureFormat?: string;
    textureQuality?: string;
    lod?: string;
  } = {}): string {
    const {
      morphTargets = 'ARKit,Oculus Visemes',
      pose = 'T',
      textureAtlas = 'none',
      textureFormat = 'png',
      textureQuality = 'medium',
      lod = '0' // Level of Detail: 0(highest) - 2(lowest)
    } = options;
    
    const params = new URLSearchParams({
      morphTargets,
      pose,
      textureAtlas,
      textureFormat,
      textureQuality,
      lod
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  
  static getThumbnailUrl(avatarUrl: string): string {
    if (!avatarUrl) {
      return 'https://via.placeholder.com/200x200/E0E0E0/666666?text=Avatar';
    }
    
    const baseUrl = avatarUrl.split('?')[0];
    return this.generateAvatarUrl(baseUrl, {
      textureFormat: 'png',
      textureQuality: 'medium',
      lod: '2'
    });
  }


  
  static async avatarExists(avatarId: string): Promise<boolean> {
    try {
      const avatar = await this.getAvatar(avatarId);
      return avatar !== null;
    } catch (error) {
      console.error('Error checking avatar existence:', error);
      return false;
    }
  }


  static async clearAllAvatars(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.AVATARS);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.DEFAULT_AVATAR);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.CURRENT_OUTFIT);
      return true;
    } catch (error) {
      console.error('Error clearing all avatars:', error);
      return false;
    }
  }


  static async getAvatarStats(): Promise<{
    totalAvatars: number;
    hasDefaultAvatar: boolean;
    latestAvatarDate?: string;
  }> {
    try {
      const avatars = await this.getStoredAvatars();
      const defaultAvatar = await this.getDefaultAvatar();
      
      const latestAvatar = avatars.reduce((latest, current) => {
        const currentDate = new Date(current.createdAt);
        const latestDate = new Date(latest?.createdAt || 0);
        return currentDate > latestDate ? current : latest;
      }, avatars[0]);

      return {
        totalAvatars: avatars.length,
        hasDefaultAvatar: defaultAvatar !== null,
        latestAvatarDate: latestAvatar?.createdAt
      };
    } catch (error) {
      console.error('Error getting avatar stats:', error);
      return {
        totalAvatars: 0,
        hasDefaultAvatar: false
      };
    }
  }
}