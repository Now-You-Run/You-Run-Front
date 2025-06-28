// app/trackSelect.tsx

import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DISTANCES = [
    { label: '400 m', value: 0.4 },
    { label: '1 km',   value: 1  },
    { label: '3 km',   value: 3   },
    { label: '5 km',   value: 5   },
    { label: '10 km',  value: 10  },
]; 

export default function TrackSelect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const go = (km: number) => {
    router.push({
      pathname: '/running',
      params: { mode: 'track', trackDistance: km.toString() },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        <Text style={styles.title}>트랙 거리 선택</Text>
        {DISTANCES.map(({label, value}) => (
          <Pressable
            key={value}
            style={styles.button}
            onPress={() => go(value)}
          >
            <Text style={styles.buttonText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24, fontWeight: '700', marginBottom: 24,
  },
  button: {
    width: '100%', paddingVertical: 14, marginVertical: 6,
    backgroundColor: '#28a745', borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff', fontSize: 18, fontWeight: '600',
  },
});
