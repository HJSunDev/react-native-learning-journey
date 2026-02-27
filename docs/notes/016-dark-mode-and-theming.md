# 016. 暗色模式与主题系统

## 1. 核心问题与概念

### 解决什么问题

硬编码颜色散布在组件的 `style` 和 `className` 中，带来三个工程问题：

1. **无法跟随系统暗色模式** —— 用户在系统设置切换暗色模式后，App 依然是白色背景，体验断裂。
2. **用户无法手动控制主题** —— 没有"强制浅色 / 深色 / 跟随系统"的偏好设置。
3. **颜色分散在 20+ 文件中** —— 修改品牌色需要全局搜索替换，违反 DRY 原则。

### 核心概念与依赖

| 层级 | 技术 | 角色 |
|------|------|------|
| 系统层 | `Appearance` API (React Native) | 读取/设置当前系统 Color Scheme |
| 状态层 | `useThemeStore` (Zustand) | 管理用户偏好（system / light / dark）并持久化 |
| 持久层 | `AsyncStorage` | 将用户偏好存储到本地 |
| 样式层 | NativeWind `dark:` 前缀 | CSS 类级别的条件样式切换 |
| 表现层 | `useColorScheme()` (React Native) | 组件内读取解析后的 scheme，用于 style 属性中的条件颜色 |

**关键区分**：
- `ThemeMode`（`system | light | dark`）—— 用户的**偏好设置**，存储在 AsyncStorage
- `ColorScheme`（`light | dark`）—— 当前**实际解析结果**，由 Appearance API 决定

当 ThemeMode = `system` 时，ColorScheme 跟随设备设置；
当 ThemeMode = `light` 或 `dark` 时，ColorScheme 被强制覆盖。


## 2. 核心用法 / 方案设计

### 场景 A: className 中使用 dark: 前缀（最常用）

NativeWind 的 `dark:` 前缀是 Tailwind CSS 的暗色模式方案在 React Native 上的实现。当系统 / 手动设置为 dark 时，所有带 `dark:` 前缀的类自动生效。

```tsx
<View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
  <Text className="text-gray-900 dark:text-gray-100">标题</Text>
  <Text className="text-gray-500 dark:text-gray-400">描述文字</Text>
</View>

<Pressable className="bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600">
  <Text className="text-gray-700 dark:text-gray-300">次要按钮</Text>
</Pressable>
```

**常用颜色映射**：

| 用途 | Light | Dark |
|------|-------|------|
| 页面背景 | `bg-gray-50` | `dark:bg-gray-950` |
| 卡片背景 | `bg-white` | `dark:bg-gray-800` |
| 主文字 | `text-gray-900` | `dark:text-gray-100` |
| 次要文字 | `text-gray-500` | `dark:text-gray-400` |
| 强调背景 | `bg-indigo-50` | `dark:bg-indigo-950` |
| 强调文字 | `text-indigo-600` | `dark:text-indigo-400` |
| 分隔线 | `border-gray-100` | `dark:border-gray-700` |
| 输入框边框 | `border-gray-200` | `dark:border-gray-600` |

### 场景 B: style 中使用 useColorScheme 条件判断

`rn-platform-pitfalls` 规则要求不能在同一元素上混用 `style` 和 `className`。当元素必须使用 `style`（如 Safe Area padding、动画值、Ionicons color prop）时，用 `useColorScheme()` 读取当前 scheme 做条件判断。

```tsx
import { useColorScheme } from 'react-native';

function ProfileScreen() {
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
      {/* 子元素使用 className + dark: */}
      <Text className="text-gray-900 dark:text-gray-100">标题</Text>
    </View>
  );
}
```

`Ionicons` 的 `color` prop 同理：

```tsx
<Ionicons
  name="chevron-forward"
  size={18}
  color={isDark ? '#4B5563' : '#D1D5DB'}
/>
```

### 场景 C: Appearance.setColorScheme 控制全局主题

React Native 0.72+ 提供 `Appearance.setColorScheme()` 方法，可以在 JS 层强制覆盖系统颜色方案。

```tsx
import { Appearance } from 'react-native';

// 强制深色
Appearance.setColorScheme('dark');

// 强制浅色
Appearance.setColorScheme('light');

// 跟随系统（重置为系统默认）
Appearance.setColorScheme(null);
```

调用后：
1. React Native 的 `useColorScheme()` 返回值立即更新
2. NativeWind 的 `dark:` 前缀类自动响应
3. `StatusBar` 组件根据新 scheme 调整样式

### 场景 D: StatusBar 联动

`expo-status-bar` 的 `StatusBar` 组件的 `style` prop 控制状态栏文字颜色：
- `'dark'` → 深色文字（浅色背景时使用）
- `'light'` → 浅色文字（深色背景时使用）

```tsx
import { StatusBar } from 'expo-status-bar';

// 在根布局中，根据解析后的 colorScheme 自动切换
<StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
```


## 3. 深度原理与机制

### 数据流：从用户操作到 UI 渲染

```
用户在 theme-lab 或 settings 中切换主题
  ↓
themeStore.setMode('dark')
  ├── 1. Zustand 内存状态更新 → 触发订阅组件重渲染
  └── 2. AsyncStorage.setItem('theme_mode', 'dark') → 持久化
  ↓
app/_layout.tsx 中的 useEffect 监听 themeMode 变化
  ↓
Appearance.setColorScheme('dark')
  ↓
React Native Appearance API 广播 colorScheme 变更事件
  ↓
┌──────────────────────────────────┐
│ 两条并行的响应路径               │
│                                  │
│ 路径 A: useColorScheme() Hook    │
│   → isDark 变量更新              │
│   → style 中的条件颜色切换       │
│   → StatusBar style 切换         │
│                                  │
│ 路径 B: NativeWind CSS Runtime   │
│   → react-native-css 检测到      │
│     color scheme 变化            │
│   → 所有 dark: 前缀类激活/失活   │
│   → className 样式自动切换       │
└──────────────────────────────────┘
```

### NativeWind v5 的暗色模式工作机制

NativeWind v5 使用 `react-native-css` 作为运行时引擎。在 Metro 构建阶段，Tailwind CSS v4 的 PostCSS 插件将 `dark:bg-gray-800` 编译为带有 `@media (prefers-color-scheme: dark)` 条件的 CSS 规则。

`react-native-css` 运行时通过 `Appearance.getColorScheme()` 获取当前 scheme，决定是否激活这些条件规则。当 `Appearance.setColorScheme()` 被调用时，运行时重新评估所有条件规则，触发 StyleSheet 更新。

### 持久化与 Hydration 时序

```
App 启动
  ↓
RootLayout 渲染
  ├── themeStore.hydrate() → AsyncStorage 读取 theme_mode
  └── authStore.hydrate() → SecureStore/AsyncStorage 读取 token
  ↓
两个 store 同时 hydrate（Promise.all 效果）
  ↓
themeStore hydrate 完成
  → themeMode 从 'system' 更新为用户保存的值
  → useEffect 调用 Appearance.setColorScheme(...)
  ↓
authStore hydrate 完成
  → isLoading = false
  → 路由守卫放行，渲染主界面
  ↓
此时 colorScheme 已经是正确的值，主界面一开始就是正确的主题
```

加载屏同时等待 `authStore.isLoading` 和 `themeStore.isLoading`，确保主界面显示时主题已正确应用，避免闪白/闪黑。

### 对比：两种适配模式的选择依据

| | className `dark:` | `useColorScheme()` + style |
|---|---|---|
| **适用场景** | 纯展示元素（Text、View 背景、边框） | 需要 `style` 的元素（SafeArea padding、动画值、第三方组件 props） |
| **代码量** | 少（一行 className 搞定） | 多（需声明 isDark、写三元表达式） |
| **维护性** | Tailwind 语义化，改主题只需调色板 | 需手动维护颜色常量映射 |
| **性能** | CSS 运行时批量处理，高效 | 每个三元表达式是独立的 JS 计算 |
| **限制** | 不能与 `style` 在同一元素上混用 | 无限制 |


## 4. 最佳实践与坑

### ✅ 推荐做法

1. **className 优先**：能用 `dark:` 前缀解决的，不要引入 `useColorScheme`。
2. **颜色映射成对出现**：写 `bg-white` 时立即补上 `dark:bg-gray-800`，不要事后补。
3. **分层隔离**：结构容器（需要 insets/动画值的）仅用 `style`，展示子元素仅用 `className`。
4. **品牌色保持一致**：主操作按钮 `bg-indigo-600` 在浅色和深色下保持不变（足够显眼）。
5. **TabBar / Header 集中管理颜色**：用颜色映射对象（如 `THEME.light` / `THEME.dark`），避免在每个三元表达式中重复 hex 值。
6. **加载屏适配暗色**：等待 themeStore hydrate 完成后再显示主界面，并让加载屏本身也响应 colorScheme。

### ❌ 避免做法

1. **不要用 Context 管理主题** —— NativeWind 的暗色模式绑定的是 `Appearance` API，不是 React Context。使用 Context Provider 会导致 NativeWind 和你的状态不同步。
2. **不要在同一元素上混用 style 和 className** —— NativeWind v5 在原生端 style 会覆盖 className（而非合并），导致 className 的样式全部丢失。
3. **不要忘记 Ionicons / Switch 等第三方组件的颜色** —— 它们的 `color` / `trackColor` 不接受 className，必须用 isDark 条件。
4. **不要硬编码 `Appearance.setColorScheme('dark')` 在组件内** —— 所有主题切换应通过 themeStore.setMode 统一管理，Appearance 同步由根布局负责。
5. **不要假设系统一定是浅色** —— 初始渲染时 `useColorScheme()` 可能返回 `'dark'`，你的默认颜色必须在两个 scheme 下都正确。


## 5. 行动导向 (Action Guide)

### Step 1: 扩展 storage 工具层

**这一步在干什么**: 在已有的 AsyncStorage 封装中添加主题偏好的读写方法。主题偏好属于非敏感用户设置，存储在 AsyncStorage（而非 SecureStore）。

```typescript
// src/utils/storage.ts — 在 storage 对象中追加：

const THEME_MODE_KEY = 'theme_mode';

export const storage = {
  // ... 已有方法 ...

  async getThemeMode(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(THEME_MODE_KEY);
    } catch (e) {
      console.error('Error getting theme mode', e);
      return null;
    }
  },

  async setThemeMode(mode: string): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (e) {
      console.error('Error setting theme mode', e);
    }
  },
};
```

### Step 2: 创建 themeStore

**这一步在干什么**: 创建 Zustand Store 管理主题偏好。它的职责与 authStore 平行 —— 管理一个需要持久化的全局状态。初始值为 `system`（跟随设备），hydrate 后从 AsyncStorage 恢复用户上次的选择。

```typescript
// src/stores/themeStore.ts

import { create } from 'zustand';
import { storage } from '../utils/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

const VALID_MODES: readonly string[] = ['system', 'light', 'dark'];

interface ThemeState {
  mode: ThemeMode;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  isLoading: true,

  hydrate: async () => {
    try {
      const saved = await storage.getThemeMode();
      const mode: ThemeMode =
        saved && VALID_MODES.includes(saved)
          ? (saved as ThemeMode)
          : 'system';
      set({ mode, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setMode: async (mode: ThemeMode) => {
    set({ mode });
    await storage.setThemeMode(mode);
  },
}));
```

### Step 3: 根布局中 Hydrate + Appearance 同步 + StatusBar

**这一步在干什么**: 在 App 的根入口完成三件事：(1) 启动时 hydrate 主题偏好；(2) 将偏好同步到 Appearance API；(3) 根据当前 scheme 设置 StatusBar 样式。这是整个主题系统的"指挥中心"。

```tsx
// app/_layout.tsx

import { StatusBar } from 'expo-status-bar';
import { Appearance, useColorScheme } from 'react-native';
import { useThemeStore } from '../src/stores/themeStore';

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const themeMode = useThemeStore((s) => s.mode);
  const colorScheme = useColorScheme();

  useEffect(() => {
    hydrate();
    hydrateTheme();
  }, [hydrate, hydrateTheme]);

  // 将持久化的主题偏好同步到 Appearance API
  useEffect(() => {
    Appearance.setColorScheme(
      themeMode === 'system' ? null : themeMode
    );
  }, [themeMode]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
      />
      {/* ... providers + AuthGuard ... */}
    </GestureHandlerRootView>
  );
}
```

AuthGuard 中同时等待两个 store 的 loading 状态，加载屏本身也适配暗色：

```tsx
function AuthGuard() {
  const { isLoading } = useAuthStore();
  const themeLoading = useThemeStore((s) => s.isLoading);
  const colorScheme = useColorScheme();

  if (isLoading || themeLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colorScheme === 'dark'
          ? '#030712' : '#ffffff',
      }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: {
        backgroundColor: colorScheme === 'dark'
          ? '#030712' : '#f9fafb',
      },
    }}>
      {/* screens */}
    </Stack>
  );
}
```

### Step 4: 为 className 组件添加 dark: 前缀

**这一步在干什么**: 这是工作量最大的步骤。遍历所有使用 `className` 的组件，为每个颜色类追加对应的 `dark:` 变体。关键是保持成对出现的纪律。

原始代码：
```tsx
<View className="bg-white rounded-2xl p-4">
  <Text className="text-gray-900">标题</Text>
  <Text className="text-gray-500">描述</Text>
</View>
```

适配后：
```tsx
<View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
  <Text className="text-gray-900 dark:text-gray-100">标题</Text>
  <Text className="text-gray-500 dark:text-gray-400">描述</Text>
</View>
```

### Step 5: 为 StyleSheet / style 组件使用 useColorScheme

**这一步在干什么**: 对于使用 `StyleSheet.create` 或内联 `style` 的组件（如 AnimatedTabBar、ScreenHeader），通过 `useColorScheme()` 获取当前 scheme，创建颜色映射对象集中管理。

```tsx
// AnimatedTabBar 的颜色映射对象模式
const THEME = {
  light: {
    activeColor: '#374151',
    inactiveColor: '#9CA3AF',
    blurTint: 'light' as const,
    barOverlay: 'rgba(255, 255, 255, 0.80)',
  },
  dark: {
    activeColor: '#F3F4F6',
    inactiveColor: '#6B7280',
    blurTint: 'dark' as const,
    barOverlay: 'rgba(15, 15, 20, 0.82)',
  },
};

export default function AnimatedTabBar(props: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const theme = THEME[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <BlurView tint={theme.blurTint}>
      <Text style={{ color: theme.activeColor }}>Tab</Text>
    </BlurView>
  );
}
```

### Step 6: 在设置页中接入主题切换

**这一步在干什么**: 将 settings-modal 中原本静态的深色模式 Switch 接入 themeStore，实现真正的主题切换功能。

```tsx
// app/settings-modal.tsx

const isDark = useColorScheme() === 'dark';
const setMode = useThemeStore((s) => s.setMode);

<Switch
  value={isDark}
  onValueChange={(v) => setMode(v ? 'dark' : 'light')}
  trackColor={{
    true: '#818CF8',
    false: isDark ? '#374151' : '#E5E7EB',
  }}
  thumbColor="#FFFFFF"
/>
```

### Step 7: 创建主题实验室 Demo 页

**这一步在干什么**: 创建 `app/(screens)/theme-lab.tsx` 作为主题系统的交互式演示页面。包含三路主题切换器（跟随系统 / 浅色 / 深色）、颜色映射表、组件预览和架构数据流图。在 explore.tsx 的 `DEMO_SECTIONS` 中注册入口路由。

```tsx
// explore.tsx DEMO_SECTIONS 中追加路由
{
  id: 'theming',
  title: '主题系统',
  description: '暗色模式、主题切换、Design Token',
  icon: 'color-palette-outline',
  tags: ['NativeWind', 'useColorScheme'],
  route: '/theme-lab' as Href,  // 原来没有 route，现在添加
},
```
