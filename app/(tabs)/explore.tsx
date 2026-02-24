import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#f9fafb' }}>
      <View className="px-5 pb-4 pt-3">
        <Text className="text-2xl font-bold text-gray-900">发现</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Ionicons name="compass-outline" size={56} color="#D1D5DB" />
        <Text className="mt-4 text-lg font-semibold text-gray-300">
          即将推出
        </Text>
        <Text className="mt-2 text-sm text-gray-300">
          搜索、分类与筛选
        </Text>
      </View>
    </View>
  );
}
