
export const READY_PLAYER_ME_CONFIG = {

  SUBDOMAIN: 'you-run', 
  

  API_BASE_URL: 'https://api.readyplayer.me',
  MODELS_BASE_URL: 'https://models.readyplayer.me',
  


  DEFAULT_BODY_TYPE: 'fullbody', 
  DEFAULT_LANGUAGE: 'ko',        

  AVATAR_QUALITY: {

    THUMBNAIL: {
      textureQuality: 'low',
      lod: '2',
      textureFormat: 'jpg'
    },

    STANDARD: {
      textureQuality: 'medium',
      lod: '1',
      textureFormat: 'png'
    },

    HIGH_QUALITY: {
      textureQuality: 'high',
      lod: '0',
      textureFormat: 'png'
    }
  },
  

  CREATOR_CONFIG: {

    features: {
      bodyType: true,
      hair: true,
      eyes: true,
      eyebrows: true,
      nose: true,
      mouth: true,
      skin: true,
      outfit: true,
      glasses: true,
      headwear: true
    },
    

    ui: {
      backgroundColor: '#ffffff',
      primaryColor: '#007AFF',
      fontFamily: 'Arial, sans-serif'
    }
  },
  

  ERROR_CONFIG: {
    retryAttempts: 3,
    timeoutMs: 30000, 
    fallbackToCache: true
  }
};


export const getEnvironmentConfig = () => {
  const isDevelopment = __DEV__;
  
  if (isDevelopment) {
    return {
      ...READY_PLAYER_ME_CONFIG,
    
      DEBUG: true,
      LOG_LEVEL: 'verbose'
    };
  }
  
  return {
    ...READY_PLAYER_ME_CONFIG,
  
    DEBUG: false,
    LOG_LEVEL: 'error'
  };
};


export class ReadyPlayerMeUtils {
  

  static getCreatorUrl(options: {
    bodyType?: string;
    language?: string;
    clearCache?: boolean;
    customization?: any;
  } = {}) {
    const {
      bodyType = READY_PLAYER_ME_CONFIG.DEFAULT_BODY_TYPE,
      language = READY_PLAYER_ME_CONFIG.DEFAULT_LANGUAGE,
      clearCache = false,
      customization
    } = options;
    
    const params = new URLSearchParams();
    params.append('frameApi', 'true');
    params.append('bodyType', bodyType);
    params.append('language', language);
    
    if (clearCache) {
      params.append('clearCache', 'true');
    }
    
    if (customization) {
      params.append('customization', JSON.stringify(customization));
    }
    
    return `https://${READY_PLAYER_ME_CONFIG.SUBDOMAIN}.readyplayer.me?${params.toString()}`;
  }
  
 
  static getAvatarModelUrl(avatarId: string, options: {
    quality?: 'thumbnail' | 'standard' | 'high_quality';
    format?: 'glb' | 'png' | 'jpg';
    morphTargets?: string;
    pose?: string;
  } = {}) {
    const {
      quality = 'standard',
      format = 'glb',
      morphTargets,
      pose
    } = options;
    
    const qualityConfig = READY_PLAYER_ME_CONFIG.AVATAR_QUALITY[quality.toUpperCase() as keyof typeof READY_PLAYER_ME_CONFIG.AVATAR_QUALITY];
    
    let url = `${READY_PLAYER_ME_CONFIG.MODELS_BASE_URL}/${avatarId}.${format}`;
    
    const params = new URLSearchParams();
    
    if (qualityConfig) {
      Object.entries(qualityConfig).forEach(([key, value]) => {
        params.append(key, value);
      });
    }
    
    if (morphTargets) {
      params.append('morphTargets', morphTargets);
    }
    
    if (pose) {
      params.append('pose', pose);
    }
    
    const paramString = params.toString();
    if (paramString) {
      url += `?${paramString}`;
    }
    
    return url;
  }
  

  static getAvatar2DUrl(avatarId: string, options: {
    scene?: 'bust-portrait' | 'fullbody-portrait-v1' | 'fullbody-posture-v1';
    width?: number;
    height?: number;
    background?: string;
    expression?: string;
  } = {}) {
    const {
      scene = 'bust-portrait',
      width = 400,
      height = 400,
      background,
      expression
    } = options;
    
    let url = `${READY_PLAYER_ME_CONFIG.MODELS_BASE_URL}/${avatarId}.png`;
    
    const params = new URLSearchParams();
    params.append('scene', scene);
    params.append('width', width.toString());
    params.append('height', height.toString());
    
    if (background) {
      params.append('background', background);
    }
    
    if (expression) {
      params.append('expression', expression);
    }
    
    return `${url}?${params.toString()}`;
  }
  

  static getApiHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
   
    
    return headers;
  }
}


export interface ReadyPlayerMeAvatar {
  id: string;
  url: string;
  partner?: string;
  gender?: 'male' | 'female';
  bodyType?: 'fullbody' | 'halfbody';
  assets?: {
    [key: string]: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadyPlayerMeAsset {
  id: string;
  name: string;
  type: string;
  gender?: 'male' | 'female' | 'neutral';
  iconUrl?: string;
  modelUrl?: string;
  price?: number;
  locked?: boolean;
}

export interface ReadyPlayerMeEvent {
  eventName: string;
  source: string;
  data?: any;
}