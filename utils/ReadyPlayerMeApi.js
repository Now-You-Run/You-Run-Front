
import { READY_PLAYER_ME_CONFIG } from '../config/readyPlayerMe';

export class ReadyPlayerMeAPI {
  
 
  static async getAvatar(avatarId) {
    try {
      const response = await fetch(`${READY_PLAYER_ME_CONFIG.API_BASE_URL}/v2/avatars/${avatarId}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.data;
      } else {
        throw new Error(`Failed to get avatar: ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting avatar:', error);
      throw error;
    }
  }


  static async updateAvatar(avatarId, assets) {
    try {
      const response = await fetch(`${READY_PLAYER_ME_CONFIG.API_BASE_URL}/v2/avatars/${avatarId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(READY_PLAYER_ME_CONFIG.API_KEY && {
            'Authorization': `Bearer ${READY_PLAYER_ME_CONFIG.API_KEY}`
          })
        },
        body: JSON.stringify({ assets })
      });

      if (response.ok) {
        const data = await response.json();
        return data.data;
      } else {
        throw new Error(`Failed to update avatar: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      throw error;
    }
  }


  static async getAssets(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${READY_PLAYER_ME_CONFIG.API_BASE_URL}/v1/assets?${params}`, {
        headers: {
          ...(READY_PLAYER_ME_CONFIG.API_KEY && {
            'Authorization': `Bearer ${READY_PLAYER_ME_CONFIG.API_KEY}`
          }),
          ...(READY_PLAYER_ME_CONFIG.APP_ID && {
            'X-App-Id': READY_PLAYER_ME_CONFIG.APP_ID
          })
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      } else {
        throw new Error(`Failed to get assets: ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting assets:', error);
      throw error;
    }
  }


  static getAvatarUrl(avatarId, options = {}) {
    const {
      format = 'glb',
      morphTargets,
      pose,
      textureAtlas,
      textureFormat,
      textureQuality,
      lod
    } = options;

    let url = `${READY_PLAYER_ME_CONFIG.MODELS_BASE_URL}/${avatarId}.${format}`;
    const params = new URLSearchParams();

    if (morphTargets) params.append('morphTargets', morphTargets);
    if (pose) params.append('pose', pose);
    if (textureAtlas) params.append('textureAtlas', textureAtlas);
    if (textureFormat) params.append('textureFormat', textureFormat);
    if (textureQuality) params.append('textureQuality', textureQuality);
    if (lod) params.append('lod', lod);

    const paramString = params.toString();
    if (paramString) {
      url += `?${paramString}`;
    }

    return url;
  }
}