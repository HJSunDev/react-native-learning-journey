import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  type: 'toggle' | 'link';
  value?: boolean;
}

const SETTING_ITEMS: SettingItem[] = [
  { icon: 'notifications-outline', label: '推送通知', type: 'toggle', value: true },
  { icon: 'moon-outline', label: '深色模式', type: 'toggle', value: false },
  { icon: 'language-outline', label: '语言', type: 'link' },
  { icon: 'shield-checkmark-outline', label: '隐私设置', type: 'link' },
  { icon: 'help-circle-outline', label: '帮助与反馈', type: 'link' },
];

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

  return (
    <View
      style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: '#f9fafb' }}
    >
      {/* 顶部拖拽指示条 + 关闭按钮 */}
      <View className="items-center pt-3 pb-1">
        <View className="h-1 w-9 rounded-full bg-gray-300" />
      </View>

      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-xl font-bold text-gray-900">快捷设置</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
        >
          <Ionicons name="close" size={18} color="#6B7280" />
        </Pressable>
      </View>

      {/* 设置列表 */}
      <View className="mx-5 mt-2 overflow-hidden rounded-2xl bg-white">
        {SETTING_ITEMS.map((item, index) => (
          <Pressable
            key={item.label}
            className={`flex-row items-center px-4 py-4 ${
              item.type === 'link' ? 'active:bg-gray-50' : ''
            } ${index < SETTING_ITEMS.length - 1 ? 'border-b border-gray-100' : ''}`}
            disabled={item.type === 'toggle'}
          >
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Ionicons name={item.icon} size={20} color="#6366F1" />
            </View>
            <Text className="flex-1 text-base text-gray-800">{item.label}</Text>
            {item.type === 'toggle' ? (
              <Switch
                value={item.value}
                trackColor={{ true: '#818CF8', false: '#E5E7EB' }}
                thumbColor="#FFFFFF"
              />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            )}
          </Pressable>
        ))}
      </View>

      {/* 路由信息调试区 */}
      <View className="mx-5 mt-6 rounded-xl bg-gray-100 p-4">
        <Text className="text-xs font-semibold text-gray-500 mb-2">
          Modal 路由信息
        </Text>
        <Text className="text-xs font-mono text-gray-500">
          路由路径: /settings-modal{'\n'}
          呈现模式: presentation: &apos;modal&apos;{'\n'}
          所属 Stack: Root Stack (app/_layout.tsx){'\n'}
          关闭方式: iOS 下拉手势 / router.back()
        </Text>
      </View>
    </View>
  );
}
