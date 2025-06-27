import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
// Correct import for the floating button component
import FloatingActionButton from '@/components/FloatingActionButton';
import KakaoLoginButton from '@/components/KakaoLoginButton';


export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Render the floating button */}
      <FloatingActionButton />

      <View style={styles.content}>
        <Text>홈 화면 콘텐츠</Text>
        <Text>화면 왼쪽 상단에 햄버거 버튼만 보입니다.   </Text>
        <KakaoLoginButton/>
      </View>
    

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
