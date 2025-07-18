import axios from 'axios';

export const getUserById = async (userId: number) => {
  const response = await axios.get(
    `${process.env.EXPO_PUBLIC_SERVER_API_URL}/api/user`,
    {
      params: { userId }, // ✅ 쿼리로 userId 전달
    }
  );
  return response.data.data;
};

// 아바타 전체 목록 조회 (소유 여부 포함)
export const fetchAvatars = async () => {
  const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_API_URL}/avatars`);
  return response.data;
};

const SERVER_API_URL = process.env.EXPO_PUBLIC_SERVER_API_URL;

interface CurrentAvatar {
  id: string;
  name: string;
  imageUrl: string;
  glbUrl: string;
  price: number;
  gender: string;
}

export const fetchCurrentAvatar = async (): Promise<CurrentAvatar> => {
  try {
    const response = await fetch(`${SERVER_API_URL}/avatars/current`);
    if (!response.ok) {
      throw new Error('Failed to fetch current avatar');
    }
    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      imageUrl: data.imageUrl,
      glbUrl: data.glbUrl,
      price: data.price,
      gender: data.gender
    };
  } catch (error) {
    console.error('Error fetching current avatar:', error);
    throw error;
  }
};

// 아바타 구매
export const purchaseAvatar = async (avatarId: number) => {
  return axios.post(`${process.env.EXPO_PUBLIC_SERVER_API_URL}/avatars/${avatarId}/purchase`);
};

// 아바타 선택(장착)
export const selectAvatar = async (avatarId: number) => {
  const url = `${process.env.EXPO_PUBLIC_SERVER_API_URL}/avatars/${avatarId}/select`;
  console.log('selectAvatar 요청 URL:', url);
  return axios.post(url);
};
