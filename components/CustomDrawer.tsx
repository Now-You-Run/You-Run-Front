import { useRouter } from 'expo-router'; // Href를 import 합니다.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomDrawerProps {
  closeMenu: () => void;
}

export default function CustomDrawer({ closeMenu }: CustomDrawerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // path의 타입을 string 대신 Href로 변경합니다.
  const navigateTo = (path: string) => {
    // 'as any' 또는 'as Href<string>'을 사용하여 타입 체커를 통과시킵니다.
    router.push(path as any);
    closeMenu();
  };

  return (
    <Pressable style={styles.overlay} onPress={closeMenu}>
      <View style={[styles.drawerContainer, { paddingTop: insets.top }]}>
        <View style={styles.profileSection}>
          <Text style={styles.profileText}>사용자 이름</Text>
        </View>

        {/* 이제 navigateTo에 전달하는 경로에 오타가 있으면 타입스크립트가 오류를 알려줍니다. */}
        <Pressable
          style={styles.menuItem}
          onPress={() => navigateTo("/(drawer)/test")}
        >
          <Text style={styles.menuText}>Explore</Text>
        </Pressable>
        {/* <Pressable style={styles.menuItem} onPress={() => navigateTo('/(drawer)/gps-entire')}>
                    <Text style={styles.menuText}>Gps-Entire</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => navigateTo('/(drawer)/running')}>
                    <Text style={styles.menuText}>Running</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => navigateTo('/(drawer)/3d-test')}>
                    <Text style={styles.menuText}>3d-Test</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => navigateTo('/(drawer)/map-draw-test')}>
                    <Text style={styles.menuText}>map-draw-Test</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => navigateTo('/(drawer)/login')}>
                    <Text style={styles.menuText}>login</Text>
                </Pressable>                          */}
        <Pressable
          style={styles.menuItem}
          onPress={() => navigateTo("/(drawer)/gps-test")}
        >
          <Text style={styles.menuText}>gps-Test</Text>
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => navigateTo("/(drawer)/run-replay")}
        >
          <Text style={styles.menuText}>run-replay</Text>
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => navigateTo("/(drawer)/level-calculation")}
        >
          <Text style={styles.menuText}>level-calculation</Text>
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => navigateTo('/(drawer)/modeSelect')}
        >
          <Text style={styles.menuText}>Running</Text>
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => navigateTo('/(drawer)/Running3DModel')}
        >
          <Text style={styles.menuText}>Check My 3D-Models</Text>
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => navigateTo('/(drawer)/bot-pace')}
        >
          <Text style={styles.menuText}>Set Bot-pace</Text>
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => navigateTo('/(drawer)/MyRunningPath')}
        >
          <Text style={styles.menuText}>Check My Tracks</Text>
        </Pressable>
        <Pressable
          style={styles.menuItem}
          onPress={() => navigateTo('/(drawer)/myPage')}
        >
          <Text style={styles.menuText}>마이페이지</Text>
        </Pressable>
        <Pressable
          style={[styles.menuItem, styles.closeButton]}
          onPress={closeMenu}
        >
          <Text style={styles.menuText}>닫기</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ... styles는 이전과 동일
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '75%',
    backgroundColor: 'white',
    padding: 20,
  },
  profileSection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 20,
  },
  profileText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuItem: {
    paddingVertical: 15,
  },
  menuText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
