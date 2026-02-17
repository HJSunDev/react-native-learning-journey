import { Pressable, Text, View } from "react-native";
import { useAuthStore } from "../../src/stores/authStore";

export default function Index() {
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-gray-50">
      <Text className="text-base text-gray-500">
        Edit app/index.tsx to edit this screen.
      </Text>

      {/* TODO: 临时登出按钮，用于测试登录页 UI，后续移除 */}
      <Pressable
        className="rounded-xl bg-red-500 px-6 py-3 active:bg-red-600"
        onPress={signOut}
      >
        <Text className="text-sm font-semibold text-white">退出登录（临时测试）</Text>
      </Pressable>
    </View>
  );
}