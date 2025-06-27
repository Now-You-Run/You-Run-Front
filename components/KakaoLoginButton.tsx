import { login } from "@react-native-kakao/user";
import { Pressable, StyleSheet, Text } from "react-native";

const onKakaoLogin = async () => {
  try {
    const res = await login();
    console.log(res.accessToken);
  } catch (error) {
    console.error(error);
  }
};

export default function KakaoLoginButton() { 
    return (
        <Pressable onPress={onKakaoLogin} style={styles.loginButton}>
            <Text style={styles.buttonText}>카카오 로그인</Text>
        </Pressable>
    );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // Or your desired background color
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginButton: {
    backgroundColor: '#FEE500', // Kakao yellow
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
