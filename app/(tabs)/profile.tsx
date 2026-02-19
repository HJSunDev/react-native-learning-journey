import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/stores/authStore";

/** 菜单项配置 */
interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}

/**
 * 通用菜单列表：游客和已登录用户共用的功能入口。
 * 抽取为独立组件，避免在两个条件分支中重复渲染逻辑。
 */
function MenuSection({ items }: { items: MenuItem[] }) {
  return (
    <View className="mx-5 overflow-hidden rounded-2xl bg-white">
      {items.map((item, index) => (
        <Pressable
          key={item.label}
          className={`flex-row items-center px-4 py-4 active:bg-gray-50 ${
            index < items.length - 1 ? "border-b border-gray-100" : ""
          }`}
          onPress={item.onPress}
        >
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
            <Ionicons name={item.icon} size={20} color="#6366F1" />
          </View>
          <Text className="flex-1 text-base text-gray-800">{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </Pressable>
      ))}
    </View>
  );
}

/** 游客视图：引导用户登录 */
function GuestView() {
  const router = useRouter();

  const menuItems: MenuItem[] = [
    { icon: "settings-outline", label: "设置" },
    { icon: "information-circle-outline", label: "关于" },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* 头部引导区域 */}
      <View className="items-center px-8 pb-8 pt-12">
        <View className="mb-5 h-24 w-24 items-center justify-center rounded-full bg-gray-200">
          <Ionicons name="person-outline" size={48} color="#9CA3AF" />
        </View>
        <Text className="text-xl font-bold text-gray-800">
          登录后体验更多功能
        </Text>
        <Text className="mt-2 text-sm text-gray-400">
          收藏、历史记录、个性化推荐…
        </Text>

        <Pressable
          className="mt-6 w-full items-center rounded-2xl bg-indigo-600 py-3.5 active:bg-indigo-700"
          onPress={() => router.push("/(auth)/login" as Href)}
        >
          <Text className="text-base font-semibold text-white">
            登录 / 注册
          </Text>
        </Pressable>
      </View>

      {/* 公共菜单 */}
      <MenuSection items={menuItems} />
    </ScrollView>
  );
}

/** 已登录视图：展示用户信息和操作菜单 */
function AuthenticatedView() {
  const { user, signOut } = useAuthStore();

  const menuItems: MenuItem[] = [
    { icon: "heart-outline", label: "我的收藏" },
    { icon: "time-outline", label: "浏览历史" },
    { icon: "settings-outline", label: "设置" },
    { icon: "information-circle-outline", label: "关于" },
  ];

  const handleLogout = () => {
    Alert.alert("确认退出", "退出后需要重新登录", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  // 用户名首字符作为头像占位符
  const avatarLetter = user?.username?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* 用户信息卡片 */}
      <View className="items-center px-8 pb-8 pt-12">
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-indigo-100">
          <Text className="text-3xl font-bold text-indigo-600">
            {avatarLetter}
          </Text>
        </View>
        <Text className="text-xl font-bold text-gray-800">
          {user?.username ?? "用户"}
        </Text>
        <Text className="mt-1 text-sm text-gray-400">
          ID: {user?.id ?? "-"}
        </Text>
      </View>

      {/* 功能菜单 */}
      <MenuSection items={menuItems} />

      {/* 退出登录 */}
      <Pressable
        className="mx-5 mt-6 items-center rounded-2xl bg-white py-4 active:bg-gray-50"
        onPress={handleLogout}
      >
        <Text className="text-base font-medium text-red-500">退出登录</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: "#f9fafb" }}>
      {token ? <AuthenticatedView /> : <GuestView />}
    </View>
  );
}
