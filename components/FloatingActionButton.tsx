import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDrawer } from '../context/DrawerContext';

export default function FloatingMenuButton() {
  const { openMenu } = useDrawer();
  const insets = useSafeAreaInsets(); // 상태바/노치 영역을 피하기 위해 여전히 필요합니다.

  return (
    // Pressable 컴포넌트에 직접 스타일을 적용하여 위치를 지정합니다.
    <Pressable
      onPress={openMenu}
      // style에 top, left, zIndex를 추가합니다.
      style={[styles.buttonContainer, { top: insets.top - 32, left: 15 }]}
    >
      <Ionicons name="menu" size={32} color="black" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute', // 💥 핵심! 화면의 다른 요소와 상관없이 독립적으로 위치합니다.
    zIndex: 50, // 💥 z-index를 낮춰서 달리기 버튼이 눌릴 수 있도록 함
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
