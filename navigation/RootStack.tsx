// navigation/RootStack.tsx (새로 만들기 추천)
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatUser from '../app/(drawer)/ChatUser';
import Social from '../app/(drawer)/Social';

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Social" component={Social} />
      <Stack.Screen name="ChatUser" component={ChatUser} />
    </Stack.Navigator>
  );
}
