import { ApiResponse } from '@/types/ApiResponse';
import axios from 'axios'; // Or your preferred HTTP client
import { LatLng } from 'react-native-maps';
import { AuthAsyncStorage } from './AuthAsyncStorage';


const API_BASE_URL = process.env.EXPO_PUBLIC_SERVER_API_URL; // Replace with your server URL

export interface RunningTrackPayload {
  name: string;
  totalDistance: number;
  rate: number;
  path: LatLng[];
  userId?: number;
}

export interface RunningTrackResponse{
    trackId: number
}


export async function postRunningTrack(
  trackData: Omit<RunningTrackPayload, 'userId'>
): Promise<RunningTrackResponse> {
  try {
    // 1. Get the user's ID from async storage
    const userId = await AuthAsyncStorage.getUserId();
    if (!userId) {
      throw new Error('User not authenticated. Cannot save track.');
    }

    // 2. Construct the full payload with the user's ID
    const payload: RunningTrackPayload = {
      ...trackData,
      userId: Number(userId),
    };

    // 3. Send a POST request to the track creation endpoint
    // The endpoint is assumed to be '/api/tracks'. Please adjust if different.
    const response = await axios.post<ApiResponse<RunningTrackResponse>>(
      `${API_BASE_URL}/api/track`,
      payload
    );

    // 4. Check for a successful creation status (201 Created is standard for POST)
    if (response.status === 200 && response.data.statuscode === '200') {
      return response.data.data;
    } else {
      // Handle other server responses that indicate an error
      throw new Error(response.data.message || 'Failed to save the track.');
    }
  } catch (error) {
    // 5. Log the error and re-throw it for the UI to handle
    console.error("Error posting track data:", error);
    throw error;
  }
}