import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import type { ThemeMode } from '../../src/stores/themeStore';
import { useThemeStore } from '../../src/stores/themeStore';

// ---------------------------------------------------------------------------
// Theme Mode Selector
// ---------------------------------------------------------------------------

const MODE_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: '跟随系统', icon: 'phone-portrait-outline' },
  { mode: 'light', label: '浅色', icon: 'sunny-outline' },
  { mode: 'dark', label: '深色', icon: 'moon-outline' },
];

function ThemeModeSelector() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const isDark = useColorScheme() === 'dark';

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        主题模式
      </Text>
      <View className="flex-row gap-2">
        {MODE_OPTIONS.map((opt) => {
          const isSelected = mode === opt.mode;
          return (
            <Pressable
              key={opt.mode}
              onPress={() => setMode(opt.mode)}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
                isSelected
                  ? 'bg-indigo-600'
                  : 'bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
              }`}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={isSelected ? '#FFFFFF' : isDark ? '#D1D5DB' : '#374151'}
              />
              <Text
                className={`text-sm font-medium ${
                  isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          当前偏好: <Text className="font-medium text-indigo-600 dark:text-indigo-400">{mode}</Text>
          {'  →  '}
          解析结果: <Text className="font-medium text-indigo-600 dark:text-indigo-400">{isDark ? 'dark' : 'light'}</Text>
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Color Palette Preview
// ---------------------------------------------------------------------------

interface ColorSwatchProps {
  label: string;
  lightClass: string;
  darkClass: string;
  lightHex: string;
  darkHex: string;
}

const COLOR_PALETTE: ColorSwatchProps[] = [
  { label: '页面背景', lightClass: 'bg-gray-50', darkClass: 'bg-gray-950', lightHex: '#F9FAFB', darkHex: '#030712' },
  { label: '卡片背景', lightClass: 'bg-white', darkClass: 'bg-gray-800', lightHex: '#FFFFFF', darkHex: '#1F2937' },
  { label: '主文字', lightClass: 'bg-gray-900', darkClass: 'bg-gray-100', lightHex: '#111827', darkHex: '#F3F4F6' },
  { label: '次要文字', lightClass: 'bg-gray-500', darkClass: 'bg-gray-400', lightHex: '#6B7280', darkHex: '#9CA3AF' },
  { label: '主色调', lightClass: 'bg-indigo-600', darkClass: 'bg-indigo-600', lightHex: '#4F46E5', darkHex: '#4F46E5' },
  { label: '强调色', lightClass: 'bg-indigo-50', darkClass: 'bg-indigo-950', lightHex: '#EEF2FF', darkHex: '#1E1B4B' },
  { label: '边框', lightClass: 'bg-gray-200', darkClass: 'bg-gray-700', lightHex: '#E5E7EB', darkHex: '#374151' },
];

function ColorPalettePreview() {
  const isDark = useColorScheme() === 'dark';

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        颜色映射表
      </Text>
      <View className="gap-2">
        {COLOR_PALETTE.map((swatch) => (
          <View key={swatch.label} className="flex-row items-center">
            <View
              className={`h-8 w-8 rounded-lg ${isDark ? swatch.darkClass : swatch.lightClass}`}
              style={{ borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
            />
            <View className="ml-3 flex-1">
              <Text className="text-sm text-gray-800 dark:text-gray-200">
                {swatch.label}
              </Text>
            </View>
            <Text className="text-xs font-mono text-gray-400 dark:text-gray-500">
              {isDark ? swatch.darkHex : swatch.lightHex}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component Preview
// ---------------------------------------------------------------------------

function ComponentPreview() {
  const isDark = useColorScheme() === 'dark';

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        组件预览
      </Text>

      {/* 模拟卡片 */}
      <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-4 mb-3">
        <View className="flex-row items-center">
          <View className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950 items-center justify-center">
            <Text className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              A
            </Text>
          </View>
          <View className="ml-3">
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              示例用户
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              3 分钟前
            </Text>
          </View>
        </View>
        <Text className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          这是一个组件在当前主题下的实际渲染效果。所有颜色通过 Tailwind 的 dark: 前缀自动切换。
        </Text>
      </View>

      {/* 模拟按钮组 */}
      <View className="flex-row gap-2">
        <Pressable className="flex-1 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700">
          <Text className="text-sm font-semibold text-white">主要按钮</Text>
        </Pressable>
        <Pressable className="flex-1 items-center rounded-xl bg-gray-100 dark:bg-gray-700 py-3 active:bg-gray-200 dark:active:bg-gray-600">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            次要按钮
          </Text>
        </Pressable>
      </View>

      {/* 模拟标签 */}
      <View className="flex-row flex-wrap gap-1.5 mt-3">
        {['React Native', 'NativeWind', 'Dark Mode'].map((tag) => (
          <View
            key={tag}
            className="rounded-full bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1"
          >
            <Text className="text-xs text-indigo-600 dark:text-indigo-400">
              {tag}
            </Text>
          </View>
        ))}
      </View>

      {/* 模拟列表项 */}
      <View className="mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
        {['设置项 A', '设置项 B', '设置项 C'].map((item, i) => (
          <View
            key={item}
            className={`flex-row items-center px-4 py-3 ${
              i < 2 ? 'border-b border-gray-100 dark:border-gray-600' : ''
            }`}
          >
            <Ionicons
              name="ellipse"
              size={8}
              color={isDark ? '#818CF8' : '#6366F1'}
            />
            <Text className="ml-3 flex-1 text-sm text-gray-800 dark:text-gray-200">
              {item}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={isDark ? '#4B5563' : '#D1D5DB'}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Architecture Diagram
// ---------------------------------------------------------------------------

function ArchitectureDiagram() {
  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        主题架构数据流
      </Text>
      <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
        <Text className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-5">
          {'用户操作 (setMode)\n'}
          {'  ↓\n'}
          {'themeStore (Zustand)\n'}
          {'  ├── 持久化 → AsyncStorage\n'}
          {'  └── 同步 → Appearance.setColorScheme()\n'}
          {'              ↓\n'}
          {'        React Native Appearance API\n'}
          {'              ↓\n'}
          {'  ┌───────────┴───────────┐\n'}
          {'  ↓                       ↓\n'}
          {'useColorScheme()    NativeWind Runtime\n'}
          {'(style 条件渲染)    (dark: 类自动激活)\n'}
          {'  ↓                       ↓\n'}
          {'StatusBar 适配    className 样式切换'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Code Pattern Reference
// ---------------------------------------------------------------------------

function CodePatterns() {
  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        两种适配模式
      </Text>

      {/* Pattern 1 */}
      <View className="mb-3">
        <Text className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">
          模式 A: className dark: 前缀
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          适用于纯 NativeWind 元素，最简洁的方式
        </Text>
        <View className="rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
          <Text className="text-xs font-mono text-gray-600 dark:text-gray-400">
            {'<View className="bg-white dark:bg-gray-800">\n'}
            {'  <Text className="text-gray-900 dark:text-gray-100">\n'}
            {'    自动切换颜色\n'}
            {'  </Text>\n'}
            {'</View>'}
          </Text>
        </View>
      </View>

      {/* Pattern 2 */}
      <View>
        <Text className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">
          模式 B: useColorScheme + style 条件
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          适用于需要 style 的场景（Safe Area、动画值、Ionicons color）
        </Text>
        <View className="rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
          <Text className="text-xs font-mono text-gray-600 dark:text-gray-400">
            {'const isDark = useColorScheme() === "dark";\n\n'}
            {'<View style={{\n'}
            {'  paddingTop: insets.top,\n'}
            {'  backgroundColor: isDark\n'}
            {'    ? "#030712" : "#f9fafb",\n'}
            {'}}>'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ThemeLabScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '主题系统' }} />

      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ThemeModeSelector />
        <ComponentPreview />
        <ColorPalettePreview />
        <ArchitectureDiagram />
        <CodePatterns />
      </ScrollView>
    </>
  );
}
