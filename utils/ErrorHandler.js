
import { Alert } from 'react-native';

export class ErrorHandler {
  
  static handleApiError(error, context = '') {
    console.error(`API Error ${context}:`, error);
    
    if (error.message.includes('network')) {
      Alert.alert(
        '네트워크 오류',
        '인터넷 연결을 확인해주세요.',
        [{ text: '확인' }]
      );
    } else if (error.message.includes('401')) {
      Alert.alert(
        '인증 오류',
        'API 키를 확인해주세요.',
        [{ text: '확인' }]
      );
    } else {
      Alert.alert(
        '오류',
        `${context} 중 오류가 발생했습니다. 다시 시도해주세요.`,
        [{ text: '확인' }]
      );
    }
  }

  static async withFallback(apiCall, fallbackFunction, context = '') {
    try {
      return await apiCall();
    } catch (error) {
      console.warn(`API call failed, using fallback for ${context}:`, error);
      return await fallbackFunction();
    }
  }
}