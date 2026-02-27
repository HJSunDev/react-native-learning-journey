import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Switch, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../src/stores/themeStore';

/**
 * 设置快捷面板 —— Modal 呈现模式示例。
 *
 * 通过根 Stack 的 presentation: 'modal' 配置，
 * iOS 上以原生卡片式 Modal 呈现（从底部滑入，上方露出父页面圆角），
 * Android 上表现为全屏覆盖。
 *
 * 关闭方式：
 * - iOS: 下拉手势自动关闭（系统原生行为）
 * - 点击关闭按钮: router.back()
 */
export default function SettingsModalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: insets.bottom,
        backgroundColor: isDark ? '#111827' : '#f9fafb',
      }}
    >
      {/* 顶部拖拽指示条 + 关闭按钮 */}
      <View className="items-center pt-3 pb-1">
        <View className="h-1 w-9 rounded-full bg-gray-300 dark:bg-gray-600" />
      </View>

      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
          快捷设置
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"
        >
          <Ionicons name="close" size={18} color={isDark ? '#D1D5DB' : '#6B7280'} />
        </Pressable>
      </View>

      {/* 设置列表 */}
      <View className="mx-5 mt-2 overflow-hidden rounded-2xl bg-white dark:bg-gray-800">
        {/* 推送通知 */}
        <View className="flex-row items-center px-4 py-4 border-b border-gray-100 dark:border-gray-700">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
            <Ionicons
              name="notifications-outline"
              size={20}
              color={isDark ? '#818CF8' : '#6366F1'}
            />
          </View>
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-200">
            推送通知
          </Text>
          <Switch
            value={true}
            trackColor={{ true: '#818CF8', false: isDark ? '#374151' : '#E5E7EB' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 深色模式 */}
        <View className="flex-row items-center px-4 py-4 border-b border-gray-100 dark:border-gray-700">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
            <Ionicons
              name="moon-outline"
              size={20}
              color={isDark ? '#818CF8' : '#6366F1'}
            />
          </View>
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-200">
            深色模式
          </Text>
          <Switch
            value={isDark}
            onValueChange={(v) => setMode(v ? 'dark' : 'light')}
            trackColor={{ true: '#818CF8', false: isDark ? '#374151' : '#E5E7EB' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 语言 */}
        <Pressable className="flex-row items-center px-4 py-4 active:bg-gray-50 dark:active:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
            <Ionicons
              name="language-outline"
              size={20}
              color={isDark ? '#818CF8' : '#6366F1'}
            />
          </View>
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-200">
            语言
          </Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
        </Pressable>

        {/* 隐私设置 */}
        <Pressable className="flex-row items-center px-4 py-4 active:bg-gray-50 dark:active:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={isDark ? '#818CF8' : '#6366F1'}
            />
          </View>
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-200">
            隐私设置
          </Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
        </Pressable>

        {/* 帮助与反馈 */}
        <Pressable className="flex-row items-center px-4 py-4 active:bg-gray-50 dark:active:bg-gray-700">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={isDark ? '#818CF8' : '#6366F1'}
            />
          </View>
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-200">
            帮助与反馈
          </Text>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
        </Pressable>
      </View>

      {/* 路由信息调试区 */}
      <View className="mx-5 mt-6 rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Modal 路由信息
        </Text>
        <Text className="text-xs font-mono text-gray-500 dark:text-gray-400">
          路由路径: /settings-modal{'\n'}
          呈现模式: presentation: &apos;modal&apos;{'\n'}
          所属 Stack: Root Stack (app/_layout.tsx){'\n'}
          关闭方式: iOS 下拉手势 / router.back()
        </Text>
      </View>
    </View>
  );
}
