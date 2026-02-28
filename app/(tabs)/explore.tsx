import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DemoSection {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tags: string[];
  /** 存在 route 的条目可点击跳转，否则显示"即将推出" */
  route?: Href;
}

/**
 * 功能演示索引，每个章节在此注册入口。
 * 新增章节时只需追加条目，无需修改组件逻辑。
 */
const DEMO_SECTIONS: DemoSection[] = [
  {
    id: 'forms',
    title: '表单体系',
    description: '表单校验、选择器、标签选择、焦点管理',
    icon: 'create-outline',
    tags: ['react-hook-form', 'Zod'],
    route: '/create-post' as Href,
  },
  {
    id: 'media',
    title: '图片与媒体',
    description: '图片选择、裁剪压缩、上传进度',
    icon: 'image-outline',
    tags: ['expo-image', 'expo-image-picker'],
    route: '/media-lab' as Href,
  },
  {
    id: 'navigation',
    title: '导航进阶',
    description: 'Modal、Bottom Sheet、Deep Linking',
    icon: 'navigate-outline',
    tags: ['expo-router', 'Bottom Sheet'],
    route: '/navigation-lab' as Href,
  },
  {
    id: 'theming',
    title: '主题系统',
    description: '暗色模式、主题切换、Design Token',
    icon: 'color-palette-outline',
    tags: ['NativeWind', 'useColorScheme'],
    route: '/theme-lab' as Href,
  },
  {
    id: 'device',
    title: '权限与设备 API',
    description: '相机、定位、剪贴板、系统分享',
    icon: 'hardware-chip-outline',
    tags: ['expo-camera', 'expo-location', 'Permissions'],
    route: '/device-lab' as Href,
  },
  {
    id: 'notifications',
    title: '推送通知',
    description: '本地通知调度、Push Token、角标管理',
    icon: 'notifications-outline',
    tags: ['expo-notifications', 'Push Token', 'Badge'],
    route: '/notification-lab' as Href,
  },
  {
    id: 'biometric',
    title: '生物认证与安全',
    description: '指纹/Face ID、App 锁、安全存储架构',
    icon: 'finger-print',
    tags: ['expo-local-authentication', 'App Lock', 'SecureStore'],
    route: '/biometric-lab' as Href,
  },
];

function DemoCard({ section }: { section: DemoSection }) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const isAvailable = !!section.route;

  return (
    <Pressable
      className={`mb-3 rounded-2xl bg-white dark:bg-gray-800 p-4 ${
        isAvailable ? 'active:bg-gray-50 dark:active:bg-gray-700' : 'opacity-50'
      }`}
      onPress={() => isAvailable && router.push(section.route!)}
      disabled={!isAvailable}
    >
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
          <Ionicons name={section.icon} size={22} color={isDark ? '#818CF8' : '#6366F1'} />
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {section.title}
            </Text>
            {!isAvailable && (
              <View className="ml-2 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                <Text className="text-xs text-gray-400 dark:text-gray-500">
                  即将推出
                </Text>
              </View>
            )}
          </View>
          <Text
            className="mt-0.5 text-sm text-gray-500 dark:text-gray-400"
            numberOfLines={1}
          >
            {section.description}
          </Text>
        </View>

        {isAvailable && (
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
        )}
      </View>

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {section.tags.map((tag) => (
          <View
            key={tag}
            className="rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5"
          >
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        backgroundColor: isDark ? '#030712' : '#f9fafb',
      }}
    >
      <View className="px-5 pb-2 pt-3">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          发现
        </Text>
        <Text className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          功能演示与学习示例
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {DEMO_SECTIONS.map((section) => (
          <DemoCard key={section.id} section={section} />
        ))}
      </ScrollView>
    </View>
  );
}
