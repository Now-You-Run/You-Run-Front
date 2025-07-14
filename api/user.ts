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
