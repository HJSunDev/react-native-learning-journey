import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from 'react-native';

// ─── 空状态 ───

interface ListEmptyProps {
  icon?: keyof typeof Ionicons.glyphMap;
  message?: string;
}

export function ListEmpty({
  icon = 'document-text-outline',
  message = '暂无内容',
}: ListEmptyProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View className="items-center justify-center py-20">
      <Ionicons name={icon} size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
      <Text className="mt-4 text-base text-gray-400 dark:text-gray-500">
        {message}
      </Text>
    </View>
  );
}

// ─── 错误状态 ───

interface ListErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function ListError({
  message = '加载失败',
  onRetry,
}: ListErrorProps) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Ionicons name="cloud-offline-outline" size={48} color="#F87171" />
      <Text className="mt-4 text-base text-gray-500 dark:text-gray-400">
        {message}
      </Text>
      {onRetry && (
        <Pressable
          className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 active:bg-indigo-700"
          onPress={onRetry}
        >
          <Text className="text-sm font-medium text-white">重试</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── 列表底部 (加载更多 / 到底提示) ───

interface ListFooterProps {
  isLoading: boolean;
  hasMore: boolean;
}

export function ListFooter({ isLoading, hasMore }: ListFooterProps) {
  if (isLoading) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    );
  }

  if (!hasMore) {
    return (
      <View className="items-center py-6">
        <Text className="text-sm text-gray-300 dark:text-gray-600">
          — 已经到底了 —
        </Text>
      </View>
    );
  }

  return null;
}

// ─── 首屏加载 ───

export function ListLoading() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  );
}
