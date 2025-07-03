// app/modeSelect.tsx

import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ModeSelect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        <Pressable
          style={styles.button}
          onPress={() =>
            router.push({ pathname: '/running', params: { mode: 'normal' } })
          }
        >
          <Text style={styles.buttonText}>일반 모드</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() =>
            router.push({ pathname: '/trackSetup', params: { mode: 'track' } })
          }
        >
          <Text style={styles.buttonText}>트랙 모드</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center', // 중앙 정렬
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    marginVertical: 8,
    backgroundColor: '#007aff',
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
