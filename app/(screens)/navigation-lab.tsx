import { Ionicons } from '@expo/vector-icons';
import { type Href, Stack, useRouter } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { useCallback, useRef } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ShareSheet } from '../../src/components/ShareSheet';

// ---------------------------------------------------------------------------
// Demo Config
// ---------------------------------------------------------------------------

interface DemoItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: string;
}

const DEMOS: DemoItem[] = [
  {
    id: 'dynamic-route',
    title: '动态路由详情页',
    description: '通过 useLocalSearchParams 获取 URL 中的 [id] 参数，加载对应数据',
    icon: 'link-outline',
    category: '动态路由',
  },
  {
    id: 'modal',
    title: 'Modal 弹窗',
    description: 'iOS 原生卡片式 Modal，通过 presentation: "modal" 配置',
    icon: 'albums-outline',
    category: 'Modal',
  },
  {
    id: 'bottom-sheet',
    title: 'Bottom Sheet 底部面板',
    description: '@gorhom/bottom-sheet 手势驱动的底部面板，支持多档位停靠',
    icon: 'chevron-up-outline',
    category: 'Bottom Sheet',
  },
  {
    id: 'deep-link',
    title: 'Deep Linking 测试',
    description: '模拟推送通知/短信等外部系统通过 URL 打开 App 内指定页面',
    icon: 'open-outline',
    category: 'Deep Linking',
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function SectionCard({
  demo,
  onPress,
}: {
  demo: DemoItem;
  onPress: () => void;
}) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Pressable
      className="mb-3 rounded-2xl bg-white dark:bg-gray-800 p-4 active:bg-gray-50 dark:active:bg-gray-700"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
          <Ionicons name={demo.icon} size={22} color={isDark ? '#818CF8' : '#6366F1'} />
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {demo.title}
            </Text>
            <View className="ml-2 rounded-full bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5">
              <Text className="text-xs text-indigo-500 dark:text-indigo-400">
                {demo.category}
              </Text>
            </View>
          </View>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {demo.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function NavigationLabScreen() {
  const router = useRouter();
  const shareSheetRef = useRef<BottomSheetModal>(null);
  const isDark = useColorScheme() === 'dark';

  const handleDeepLinkDemo = useCallback(() => {
    // createURL 根据运行环境自动生成正确格式的 URL：
    // Expo Go:    exp://192.168.x.x:8081/--/(screens)/post/post-1
    // Dev Build:  rnjourney:///(screens)/post/post-1
    // Production: rnjourney:///(screens)/post/post-1
    const deepLinkPath = '/(screens)/post/post-1';
    const envAwareUrl = ExpoLinking.createURL(deepLinkPath);
    const prodUrl = `rnjourney://${deepLinkPath}`;

    Alert.alert(
      'Deep Linking 测试',
      `当前环境 URL:\n${envAwareUrl}\n\n` +
        `生产环境 URL:\n${prodUrl}\n\n` +
        `点击"尝试打开"将通过系统路由跳转到文章详情页。`,
      [
        { text: '好的', style: 'cancel' },
        {
          text: '尝试打开',
          onPress: () => Linking.openURL(envAwareUrl).catch(() => {}),
        },
      ],
    );
  }, []);

  const handleDemoPress = useCallback(
    (id: string) => {
      switch (id) {
        case 'dynamic-route':
          router.push('/(screens)/post/post-3' as Href);
          break;

        case 'modal':
          router.push('/settings-modal' as Href);
          break;

        case 'bottom-sheet':
          shareSheetRef.current?.present();
          break;

        case 'deep-link':
          handleDeepLinkDemo();
          break;
      }
    },
    [router, handleDeepLinkDemo],
  );

  return (
    <>
      <Stack.Screen options={{ title: '导航进阶' }} />

      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 导航架构图 */}
        <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            当前导航架构
          </Text>
          <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
            <Text className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-5">
              {'Root Stack (app/_layout.tsx)\n'}
              {'├── (tabs)        → Tab 导航\n'}
              {'│   ├── index     → 首页 Feed\n'}
              {'│   ├── explore   → 发现\n'}
              {'│   └── profile   → 个人中心\n'}
              {'├── (auth)        → 认证路由组\n'}
              {'│   └── login     → 登录页\n'}
              {'├── (screens)     → Push 进入的页面\n'}
              {'│   ├── post/[id] → 动态路由详情\n'}
              {'│   ├── create-post\n'}
              {'│   ├── media-lab\n'}
              {'│   ├── theme-lab → 主题系统\n'}
              {'│   └── navigation-lab (当前)\n'}
              {'└── settings-modal → Modal 呈现'}
            </Text>
          </View>
        </View>

        {/* 参数传递方式对比 */}
        <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            页面传参方式对比
          </Text>
          {[
            {
              method: 'useLocalSearchParams',
              desc: 'URL 路径/查询参数（推荐，支持 Deep Link）',
              example: 'router.push("/post/123")',
            },
            {
              method: 'useGlobalSearchParams',
              desc: '全局共享查询参数（跨页面监听同一参数变化）',
              example: 'router.push("/?filter=hot")',
            },
            {
              method: 'Zustand / Context',
              desc: '全局状态传递（复杂对象、非序列化数据）',
              example: 'store.setSelected(post)',
            },
          ].map((item) => (
            <View key={item.method} className="mb-3 last:mb-0">
              <Text className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                {item.method}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {item.desc}
              </Text>
              <View className="mt-1 rounded-lg bg-gray-50 dark:bg-gray-700 px-2.5 py-1.5">
                <Text className="text-xs font-mono text-gray-600 dark:text-gray-400">
                  {item.example}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Demo 列表 */}
        <Text className="mb-2 mt-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          交互演示
        </Text>

        {DEMOS.map((demo) => (
          <SectionCard
            key={demo.id}
            demo={demo}
            onPress={() => handleDemoPress(demo.id)}
          />
        ))}
      </ScrollView>

      <ShareSheet
        ref={shareSheetRef}
        title="导航进阶 Demo"
        url="rnjourney:///navigation-lab"
      />
    </>
  );
}
