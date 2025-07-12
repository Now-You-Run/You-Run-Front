
import axios from 'axios'; // Or your preferred HTTP client
import { AuthAsyncStorage } from './AuthAsyncStorage';
import { ApiResponse } from '@/types/ApiResponse';


export interface UserProfileDto {
  level: number;
  grade: string; // e.g., "아이언", "브론즈"
  totalDistance: number; // in meters
  username: string;
  point: number;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_SERVER_API_URL; // Replace with your server URL

export async function fetchUserProfile(): Promise<UserProfileDto> {
  try {
    // Replace with your actual endpoint for fetching the user profile
    const userId = await AuthAsyncStorage.getUserId();
    const response = await axios.get<ApiResponse<UserProfileDto>>(`${API_BASE_URL}/api/user/grade?userId=${userId}`);

    if (response.status === 200 && response.data.statuscode === '200') {
      return response.data.data;
    } else {
      // Handle cases where the server returns a non-200 status in the JSON body
      throw new Error(response.data.message || 'Failed to fetch user profile');
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    // Re-throw the error so the calling function can handle it (e.g., show an error message)
    throw error;
  }
}
