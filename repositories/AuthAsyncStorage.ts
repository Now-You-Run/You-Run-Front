import AsyncStorage from '@react-native-async-storage/async-storage';

// userId를 AsyncStorage에 저장하는 함수
export class AuthAsyncStorage {
    public static async saveUserId(userId: number): Promise<void> {
        try {
            await AsyncStorage.setItem('userId', String(userId));
            console.log('✅ userId가 성공적으로 저장되었습니다.');
        } catch (e) {
            console.error('🔥 userId 저장에 실패했습니다:', e);
            // 에러를 다시 던져서 호출한 쪽에서 에러 처리를 할 수 있도록 합니다.
            throw new Error('Failed to save userId.');
        }
    }

    // 반환 타입을 Promise<number | null>로 명확히 하여 사용하는 쪽에서 편리하게 만듭니다.
    public static async getUserId(): Promise<number | null> {
        try {
            const userIdString = await AsyncStorage.getItem('userId');
            if (userIdString) {
                // 저장된 문자열을 다시 숫자로 변환하여 반환합니다.
                const userId = parseInt(userIdString, 10);
                console.log('✅ 불러온 userId:', userId);
                return isNaN(userId) ? null : userId;
            }
            console.log('ℹ️ 저장된 userId가 없습니다.');
            return null;
        } catch (e) {
            console.error('🔥 userId를 불러오는 데 실패했습니다:', e);
            throw new Error('Failed to get userId.');
        }
    }

    public static async removeUserId(): Promise<void> {
        try {
            await AsyncStorage.removeItem('userId');
            console.log('✅ userId가 성공적으로 삭제되었습니다.');
        } catch (e) {
            console.error('🔥 userId 삭제에 실패했습니다:', e);
            throw new Error('Failed to remove userId.');
        }
    }


    // // --- 사용 예시 ---
    // // 로그인 성공 후
    // saveUserId(123);

    // // 앱의 다른 곳에서 userId가 필요할 때
    // const currentUserId = await getUserId();
    // if (currentUserId) {
    //   // userId를 사용하는 로직
    // }

    // // 로그아웃 시
    // removeUserId();

}

