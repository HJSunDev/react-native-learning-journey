# 015. 导航进阶：Modal、Bottom Sheet、动态路由与 Deep Linking

## 1. 核心问题与概念

### 解决什么问题

基础导航（Chapter 5 的 Stack、Chapter 7 的 Tabs）能覆盖大部分页面切换需求，但实际 App 还需要：

- **Modal 弹窗**：在不离开当前上下文的情况下展示临时内容（设置面板、确认对话框、登录/注册）
- **Bottom Sheet**：从底部弹出的交互面板（分享菜单、筛选器、评论输入），支持手势拖拽和多档位停靠
- **动态路由**：用 `[id].tsx` 匹配不确定的 URL 段（文章详情、用户主页），一个文件服务无限数量的页面
- **Deep Linking**：外部 URL（推送通知、浏览器链接）直接打开 App 内指定页面
- **页面传参**：不同场景下的参数传递策略选择

### 核心概念与依赖

| 概念 | 技术实现 | 角色 |
|---|---|---|
| Modal 呈现 | Expo Router `presentation: 'modal'` | 在根 Stack 上以模态方式弹出页面，iOS 呈现原生卡片式动画 |
| Bottom Sheet | `@gorhom/bottom-sheet` | 基于 Reanimated + Gesture Handler 在原生线程执行手势的底部面板 |
| 动态路由 | `[param].tsx` 文件命名 | Expo Router 将 URL 中的动态段映射到 `useLocalSearchParams` |
| Deep Linking | URL Scheme + Universal Links | 通过 `rnjourney://` scheme 或 HTTPS 链接打开 App 内路由 |
| 参数获取 | `useLocalSearchParams` / `useGlobalSearchParams` | 分别用于当前页面参数和全局跨页面参数 |

### 依赖解析

```
@gorhom/bottom-sheet
├── react-native-reanimated   (动画引擎，在原生 UI 线程执行动画)
└── react-native-gesture-handler (手势识别，在原生线程拦截触摸事件)
```

`@gorhom/bottom-sheet` 是 React Native 生态中 Bottom Sheet 的事实标准（GitHub 6k+ stars）。它不使用 RN 内置的 `Modal` 组件，而是直接在视图树中渲染一个可拖拽的绝对定位 View，通过 Reanimated 的 SharedValue 控制位置，通过 Gesture Handler 的 PanGesture 响应拖拽。

## 2. 核心用法 / 方案设计

### 场景 A: Modal 弹窗 — 呈现临时页面

Modal 是覆盖在当前页面之上的临时屏幕。在 Expo Router 中，它本质上仍是一个 Stack.Screen，只是 `presentation` 属性改变了它的过渡动画和呈现方式。

**配置：在根 Stack 中声明 Modal 路由**

```typescript
// app/_layout.tsx — 根 Stack
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="(auth)" />
  <Stack.Screen name="(screens)" />
  <Stack.Screen
    name="settings-modal"
    options={{
      presentation: 'modal',  // iOS: 卡片式底部滑入; Android: 全屏覆盖
      headerShown: false,      // 自定义 Header UI
    }}
  />
</Stack>
```

**触发：像普通导航一样 push**

```typescript
// 任何页面中
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/settings-modal');
```

**关闭**
- iOS: 用户下拉手势自动关闭（原生行为，无需代码）
- 代码: `router.back()` 或 `router.dismiss()`

**presentation 属性对比**

| 值 | iOS 表现 | Android 表现 | 适用场景 |
|---|---|---|---|
| `card` (默认) | 从右向左推入 | 从右向左推入 | 常规页面跳转 |
| `modal` | 从底部滑入，卡片式圆角 | 从底部滑入全屏 | 设置面板、表单填写 |
| `transparentModal` | 透明背景 + 底部滑入 | 透明背景 + 底部滑入 | 自定义遮罩弹窗 |
| `fullScreenModal` | 全屏覆盖（无卡片圆角） | 全屏覆盖 | 图片查看器、视频播放 |

### 场景 B: Bottom Sheet — 手势驱动的底部面板

Bottom Sheet 与 Modal 的核心区别：

| 对比维度 | RN Modal | @gorhom/bottom-sheet |
|---|---|---|
| 渲染方式 | 原生 Modal 窗口（脱离 React 视图树） | React 视图树内的绝对定位 View |
| 手势支持 | 无（需自己实现） | 原生线程 PanGesture 拖拽 |
| 多档位停靠 | 不支持 | `snapPoints` 控制多个停靠高度 |
| 键盘适配 | 手动处理 | 内置 `keyboardBehavior` |
| 性能 | JS 线程控制动画 | 原生 UI 线程执行动画 |

**基础使用：BottomSheetModal**

```typescript
import { useRef, useCallback, useMemo } from 'react';
import BottomSheet, {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

// 1. 根布局添加 Provider
// app/_layout.tsx
<BottomSheetModalProvider>
  <AuthGuard />
</BottomSheetModalProvider>

// 2. 使用 BottomSheetModal
function MyScreen() {
  const sheetRef = useRef<BottomSheetModal>(null);

  // snapPoints 定义停靠位置，支持百分比和固定像素
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}  // 完全关闭时遮罩消失
        appearsOnIndex={0}       // 第一个 snap point 时遮罩出现
        opacity={0.4}
      />
    ),
    [],
  );

  return (
    <>
      <Button onPress={() => sheetRef.current?.present()} />

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 36 }}
      >
        <BottomSheetView>
          {/* 面板内容 */}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
```

**BottomSheet vs BottomSheetModal 的选择**

| 组件 | 特点 | 适用场景 |
|---|---|---|
| `BottomSheet` | 始终渲染在页面内，不需要 Provider | 地图底部面板、始终可见的控件 |
| `BottomSheetModal` | 按需弹出/关闭，需要 Provider | 分享菜单、筛选器、临时交互面板 |

### 场景 C: 动态路由 — [id] 参数匹配

动态路由通过方括号 `[]` 定义 URL 中的可变段。一个 `[id].tsx` 文件可以匹配任意 ID 值。

**文件结构**

```
app/
  (screens)/
    post/
      [id].tsx    → 匹配 /post/123, /post/abc, /post/any-slug
```

**获取参数：useLocalSearchParams**

```typescript
// app/(screens)/post/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function PostDetail() {
  // 泛型约束声明参数类型
  const { id } = useLocalSearchParams<{ id: string }>();

  // id 就是 URL 中的动态段：
  // /post/123  → id = "123"
  // /post/abc  → id = "abc"
}
```

**导航传参**

```typescript
// 方式 1: 字符串拼接（简洁）
router.push(`/(screens)/post/${post.id}`);

// 方式 2: 对象形式（类型安全，推荐）
router.push({
  pathname: '/(screens)/post/[id]',
  params: { id: post.id },
});

// 方式 3: 附带查询参数
router.push({
  pathname: '/(screens)/post/[id]',
  params: { id: post.id, from: 'feed', highlight: 'true' },
});
// URL: /post/123?from=feed&highlight=true
// useLocalSearchParams() → { id: "123", from: "feed", highlight: "true" }
```

### 场景 D: Deep Linking — 外部系统打开 App 指定页面

Deep Linking 的核心价值不是"自己打开自己"，而是让**外部系统**（推送通知、短信、浏览器、其他 App）能够直接将用户送达 App 内的指定页面。

**真实业务场景**

| 触发源 | 发生了什么 | Deep Link 的作用 |
|---|---|---|
| 推送通知 | 用户收到"你的订单已发货"通知，点击 | 打开 App 并直接跳转到订单详情页 `/order/12345` |
| 短信/邮件 | "点击查看验证码" 或 "确认邮箱" | 打开 App 并跳转到验证页面 `/verify?token=xxx` |
| 社交分享 | 用户在微信/微博分享了一篇文章链接 | 其他用户点击链接 → 打开 App → 直达文章详情 `/post/42` |
| 二维码 | 线下海报/商品上的二维码 | 扫码 → 打开 App → 跳转到活动页/商品页 |
| 浏览器 | 网页上的"在 App 中打开"按钮 | 跳转到 App 内的对应页面，保持上下文 |
| 营销短链 | 广告投放链接 `https://example.com/promo/summer` | 已装 App → 直达活动页；未装 → 跳转 App Store |

**配置位置：app.json 第 8 行**

```json
// app.json
{
  "expo": {
    "scheme": "rnjourney"    // ← 这一行就是 Deep Linking 的全部配置
  }
}
```

Expo 在构建时会将此值写入：
- iOS → `Info.plist` 的 `CFBundleURLSchemes` 数组
- Android → `AndroidManifest.xml` 的 `<intent-filter>`

配置后，操作系统遇到 `rnjourney://` 开头的 URL 时，会将其路由到本 App。

**两种 Deep Link 协议对比**

| 类型 | 格式 | 需要服务器 | 未安装 App 时 | 适用阶段 |
|---|---|---|---|---|
| URL Scheme | `rnjourney:///post/42` | 不需要 | 无响应（无法降级） | 开发/内部测试 |
| Universal Links (iOS) / App Links (Android) | `https://example.com/post/42` | 需要（部署验证文件） | 自动降级到网页 | 生产环境 |

本项目当前使用 URL Scheme（足够学习和开发阶段使用）。生产环境推荐 Universal Links，需要在服务器部署 `apple-app-site-association`（iOS）和 `assetlinks.json`（Android）验证文件。

**Expo Router 的路由与 URL 映射关系**

Expo Router 的文件路由天然对应 URL 路径，无需额外映射配置：

| URL | 匹配的文件 | 参数 |
|---|---|---|
| `rnjourney:///` | `app/(tabs)/index.tsx` | 无 |
| `rnjourney:///(tabs)/profile` | `app/(tabs)/profile.tsx` | 无 |
| `rnjourney:///(screens)/post/42` | `app/(screens)/post/[id].tsx` | `{ id: "42" }` |
| `rnjourney:///settings-modal` | `app/settings-modal.tsx` | 无 |

**测试方法**

Demo 中的"尝试打开"按钮使用 `Linking.openURL()` 从 App 内部触发一个 Deep Link，模拟外部系统的行为。实际开发中可通过终端命令测试：

```bash
# iOS 模拟器（需要 dev build，Expo Go 不支持自定义 scheme）
npx uri-scheme open "rnjourney:///(screens)/post/post-1" --ios

# Android 模拟器
npx uri-scheme open "rnjourney:///(screens)/post/post-1" --android

# Expo Go 环境：使用 expo-linking 生成环境感知 URL
# ExpoLinking.createURL('/(screens)/post/post-1')
# → exp://192.168.x.x:8081/--/(screens)/post/post-1
```

### 场景 E: 页面传参方式对比

#### useLocalSearchParams — 当前页面的参数

读取「打开本页面时传入的参数」，只关心自己这个页面的 URL。

**真实场景：文章详情页**

用户在首页点击一篇文章 → 跳转到 `/post/42`，详情页需要知道文章 ID：

```typescript
// 首页点击卡片时
router.push('/(screens)/post/42');

// 详情页 app/(screens)/post/[id].tsx
const { id } = useLocalSearchParams<{ id: string }>();
// id = "42"  → 用这个 ID 去请求文章数据
```

即使此时导航栈中还有其他页面的参数（比如首页有 `?tab=hot`），详情页只能拿到属于自己的 `{ id: "42" }`，不会被其他页面的参数干扰。

#### useGlobalSearchParams — 导航栈最顶层页面的参数

读取「当前可见页面的参数」，无论在哪个组件中调用都返回同一份数据。当最顶层路由变化时，所有使用它的组件都会重新渲染。

**真实场景：底部 MiniPlayer 需要跟踪当前播放内容**

音乐 App 中，用户在不同 Tab 之间切换，底部始终有一个 MiniPlayer 悬浮组件。当用户在歌曲列表页点击一首歌（URL 变为 `/song/99`），MiniPlayer 需要感知到这个变化并更新显示：

```typescript
// MiniPlayer 组件（挂在根布局中，不属于任何具体页面）
function MiniPlayer() {
  const { songId } = useGlobalSearchParams<{ songId: string }>();
  // 用户从 /playlist 切到 /song/99 时，这里自动拿到 songId = "99"
  // 用户再切到 /profile 时，songId 变为 undefined
}
```

如果 MiniPlayer 用 `useLocalSearchParams`，它拿到的永远是根布局自己的参数（空的），因为 MiniPlayer 不是当前导航到的页面。

#### 核心区别总结

```
导航栈状态：首页(/feed?tab=hot) → 详情页(/post/42?from=feed)
                                        ↑ 当前可见页面

在详情页中调用：
  useLocalSearchParams()  → { id: "42", from: "feed" }  ← 只拿自己的
  useGlobalSearchParams() → { id: "42", from: "feed" }  ← 拿最顶层的（和上面一样）

在首页的某个持久化组件中调用（如 TabBar 徽章）：
  useLocalSearchParams()  → { tab: "hot" }               ← 只拿首页自己的
  useGlobalSearchParams() → { id: "42", from: "feed" }   ← 拿最顶层的（是详情页的参数）
```

**选择策略**：99% 的场景用 `useLocalSearchParams`。只有当一个**不属于当前页面**的组件（如全局悬浮组件、Tab 徽章）需要感知当前可见页面的参数变化时，才用 `useGlobalSearchParams`。

#### 全局状态传参 — 非 URL 数据

当需要传递的数据不适合放在 URL 中时（复杂对象、非序列化数据、敏感信息），使用 Zustand 等全局状态：

```typescript
// 场景：从列表页传递完整的 post 对象到详情页，避免详情页重复请求
// store
const usePostStore = create((set) => ({
  selectedPost: null,
  setSelectedPost: (post) => set({ selectedPost: post }),
}));

// 列表页：先存入 store，再跳转
usePostStore.getState().setSelectedPost(post);
router.push(`/(screens)/post/${post.id}`);

// 详情页：优先从 store 读取，不必等网络请求
const selectedPost = usePostStore((s) => s.selectedPost);
```

**三种方式对比**

| 方式 | API | 数据类型 | Deep Link 兼容 | 真实场景 |
|---|---|---|---|---|
| 当前页面参数 | `useLocalSearchParams` | 仅字符串 | ✅ | 详情页 ID、搜索关键词、筛选条件 |
| 全局顶层参数 | `useGlobalSearchParams` | 仅字符串 | ✅ | 全局悬浮组件跟踪当前页面状态 |
| 全局状态 | Zustand / Context | 任意类型 | ❌ | 传递完整对象、避免重复请求、敏感数据 |

## 3. 深度原理与机制

### Expo Router 的 Modal 实现机制

Expo Router 的 Modal 建立在 React Navigation 的 `createStackNavigator` 之上：

```
用户调用 router.push('/settings-modal')
         ↓
Expo Router 查找路由表，定位到 settings-modal 路由
         ↓
发现 presentation: 'modal'，使用模态过渡动画
         ↓
React Navigation 在 NavigationContainer 内创建新的 Screen 实例
         ↓
iOS: 原生 UIModalPresentationStyle.pageSheet（卡片式）
Android: 自定义 SlideFromBottom 动画
         ↓
新 Screen 覆盖在当前页面之上（前一页面仍在内存中）
```

关键点：Modal 页面并不是一个独立的窗口，而是 Stack 导航器中的一个新节点，只是过渡动画不同。因此它可以正常使用 `router.back()` 返回。

### GestureHandlerRootView 的作用

`GestureHandlerRootView` 是 `react-native-gesture-handler` 库的根容器组件，它在原生层完成两件事：

1. **初始化原生手势识别基础设施**：在 iOS 上创建一个特殊的 `UIView` 子类，在 Android 上创建一个自定义的 `ReactViewGroup`，这些原生 View 会拦截所有触摸事件，优先交给 `react-native-gesture-handler` 的原生手势识别器处理
2. **建立原生线程的手势分发通道**：React Native 内置的触摸系统（Responder System）运行在 JS 线程，而 `react-native-gesture-handler` 的手势识别运行在原生 UI 线程。`GestureHandlerRootView` 在原生层创建了这个独立的分发通道

```
触摸事件流（有 GestureHandlerRootView 时）

用户触摸屏幕
     ↓
原生触摸系统 (UIKit / Android MotionEvent)
     ↓
GestureHandlerRootView（原生层拦截）
     ├── react-native-gesture-handler 识别器（原生 UI 线程）
     │   → PanGesture, TapGesture, PinchGesture ...
     │   → @gorhom/bottom-sheet 的拖拽手势
     │   → Reanimated worklet 回调（不经过 JS 线程）
     │
     └── 未被识别的触摸事件 → 传递给 RN Responder System（JS 线程）
         → Pressable, TouchableOpacity, ScrollView ...
```

**在本项目中的依赖链**：

```
用户拖拽 ShareSheet 面板
     ↓
@gorhom/bottom-sheet 内部的 PanGestureHandler 捕获拖拽
     ↓
PanGestureHandler 需要原生手势识别器
     ↓
原生手势识别器由 GestureHandlerRootView 在启动时创建
     ↓
没有它 → 识别器不存在 → iOS 崩溃
```

项目中依赖 `GestureHandlerRootView` 的功能：

| 功能 | 依赖路径 |
|---|---|
| ShareSheet 拖拽关闭 | `ShareSheet` → `BottomSheetModal` → `PanGestureHandler` → 需要 `GestureHandlerRootView` |
| 未来的手势交互（滑动删除、拖拽排序、双指缩放等） | `GestureDetector` + `Gesture.Pan()` / `Gesture.Pinch()` → 需要 `GestureHandlerRootView` |

注意：以下功能**不依赖**它：
- `Pressable` 的点击/长按 — 使用 RN 内置 Responder System（JS 线程）
- Stack 导航的 iOS 右滑返回 — 由 `react-native-screens` 自带的原生手势处理
- `AnimatedTabBar` 的弹簧动画 — 纯 Reanimated 动画，不涉及手势识别

**使用规则**：
- 在 `app/_layout.tsx` 的最外层包裹一次，`style={{ flex: 1 }}` 确保占满全屏
- 整个 App 只需包裹一次，嵌套多层会导致手势冲突
- Web 端不需要（浏览器有自己的事件系统），但加上也不会出错

### @gorhom/bottom-sheet 的渲染架构

```
BottomSheetModalProvider (Context Provider)
│
├── 你的 App 正常视图树
│
└── Portal 渲染层（绝对定位在视图树最顶层）
    │
    ├── BottomSheetBackdrop (Animated.View)
    │   └── opacity 由 SharedValue 控制
    │
    └── BottomSheetModal (Animated.View)
        ├── Handle (拖拽手柄)
        ├── PanGestureHandler (手势捕获)
        │   └── translateY 映射到 SharedValue
        └── BottomSheetView (内容容器)
```

核心设计：
- **Portal 模式**：`BottomSheetModal` 通过 React Context 将自身"传送"到 Provider 所在层级渲染，这样它能覆盖所有子组件
- **原生线程手势**：拖拽由 `react-native-gesture-handler` 在原生线程处理，不经过 JS Bridge，所以即使 JS 线程繁忙，拖拽依然流畅
- **SharedValue 动画**：位移、透明度等动画值存储在原生端的 `SharedValue` 中，由 `react-native-reanimated` 直接驱动原生 View 属性，跳过 JS → Bridge → Native 的跨线程通信

### Deep Linking 的解析流程

```
外部触发: 用户点击 rnjourney:///post/42
                    ↓
操作系统: 识别 rnjourney scheme，唤起 App
                    ↓
Expo: expo-linking 捕获 URL
                    ↓
Expo Router: 解析 URL 路径 → /post/42
                    ↓
路由匹配: (screens)/post/[id].tsx
                    ↓
参数提取: { id: "42" }
                    ↓
导航执行: 按 Stack 层级依次 push 到目标路由
```

如果 App 处于后台，操作系统会先唤起 App，然后 `expo-linking` 的事件监听器捕获 URL。如果 App 是冷启动（未运行），Expo Router 会在初始化路由时直接导航到目标页面。

## 4. 最佳实践与坑

### ✅ 推荐做法

- **Modal 放在根 Stack 层级**：Modal 路由文件放在 `app/` 根目录（而非 `(screens)/` 内），因为 Modal 需要覆盖整个 Tab Bar。如果放在 `(screens)` 内部的 Stack 中，Modal 只会覆盖该 Stack 的区域，Tab Bar 仍然可见
- **BottomSheetModal 优先于 RN Modal**：RN 内置 Modal 在 Android 上有已知的手势冲突问题，且不支持多 Modal 堆叠。`@gorhom/bottom-sheet` 是纯 View 实现，没有这些限制
- **动态路由参数类型转换**：`useLocalSearchParams` 返回的参数始终是 `string` 类型，使用前需手动转换（`Number(id)`, `JSON.parse(data)`)
- **GestureHandlerRootView 必须手动包裹**：`@gorhom/bottom-sheet` 依赖 `GestureHandlerRootView` 作为祖先。虽然 Expo Router 在 Web 端可能自动提供，但 iOS/Android 原生端不会，必须在根布局中手动添加 `<GestureHandlerRootView style={{ flex: 1 }}>` 包裹整个 App

### ❌ 避免做法

- **不要在 Tab 内部的 Stack 中配置 Modal**：这会导致 Modal 弹出时 Tab Bar 仍然可见，而且 Modal 无法覆盖整个屏幕

  ```typescript
  // ❌ Modal 放在 (screens) Stack 内，Tab Bar 仍可见
  // app/(screens)/_layout.tsx
  <Stack>
    <Stack.Screen name="my-modal" options={{ presentation: 'modal' }} />
  </Stack>

  // ✅ Modal 放在根 Stack 层级，覆盖所有内容（包括 Tab Bar）
  // app/_layout.tsx
  <Stack>
    <Stack.Screen name="settings-modal" options={{ presentation: 'modal' }} />
  </Stack>
  ```

- **不要在子组件中再次添加 GestureHandlerRootView**：整个 App 只需在根布局中包裹一次，嵌套多层会导致手势冲突

- **不要在 BottomSheetModal 内使用普通 ScrollView/FlatList**：必须使用 `@gorhom/bottom-sheet` 导出的 `BottomSheetScrollView` / `BottomSheetFlatList`，否则滚动手势与拖拽手势会冲突

  ```typescript
  // ❌ 普通 FlatList 的滚动会与 Sheet 拖拽冲突
  import { FlatList } from 'react-native';
  <BottomSheetModal>
    <FlatList ... />
  </BottomSheetModal>

  // ✅ 使用 Bottom Sheet 专用的可滚动组件
  import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
  <BottomSheetModal>
    <BottomSheetFlatList ... />
  </BottomSheetModal>
  ```

- **不要在动态路由中依赖参数的存在性**：用户可能直接通过 Deep Link 访问，此时某些"你以为一定有"的查询参数可能不存在。必须做空值防御

## 5. 行动导向 (Action Guide)

### Step 1: 安装 @gorhom/bottom-sheet

**这一步在干什么**: 安装手势驱动的 Bottom Sheet 库。该库依赖的 `react-native-reanimated` 和 `react-native-gesture-handler` 项目中已存在，无需额外安装。

```bash
npx expo install @gorhom/bottom-sheet
```

### Step 2: 配置根布局 Provider

**这一步在干什么**: 在 App 最顶层注入 `BottomSheetModalProvider`，它通过 React Context + Portal 机制让任何子组件都能弹出 BottomSheetModal。同时在根 Stack 中声明 Modal 路由及其呈现模式。

```typescript
// app/_layout.tsx
import "../global.css";

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Href, Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/stores/authStore';

function AuthGuard() {
  const { token, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = (segments[0] as string) === '(auth)';
    if (token && inAuthGroup) {
      router.replace('/(tabs)' as Href);
    }
  }, [token, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(screens)" />
      {/* Modal 路由：iOS 卡片式底部滑入，Android 全屏覆盖 */}
      <Stack.Screen
        name="settings-modal"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, retry: 2 },
    },
  }));

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // @gorhom/bottom-sheet 在原生端要求 GestureHandlerRootView 作为祖先
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <AuthGuard />
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

### Step 3: 创建动态路由详情页

**这一步在干什么**: 创建 `app/(screens)/post/[id].tsx`，演示动态路由的参数获取。方括号命名告诉 Expo Router 这是一个动态段，URL 中对应位置的值会被捕获到 `useLocalSearchParams` 中。

```typescript
// app/(screens)/post/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ShareSheet } from '../../../src/components/ShareSheet';
import { MOCK_POSTS } from '../../../src/features/feed/mock';
import { formatRelativeTime } from '../../../src/utils/format';

export default function PostDetailScreen() {
  // 泛型参数约束 URL 段的类型
  const { id } = useLocalSearchParams<{ id: string }>();
  const shareSheetRef = useRef<BottomSheetModal>(null);

  const post = MOCK_POSTS.find((p) => p.id === id);

  const handleShare = useCallback(() => {
    shareSheetRef.current?.present();
  }, []);

  if (!post) {
    return (
      <>
        <Stack.Screen options={{ title: '文章详情' }} />
        <View className="flex-1 items-center justify-center bg-gray-50">
          <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
          <Text className="mt-3 text-base text-gray-400">
            文章不存在 (id: {id})
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      {/* 通过 Stack.Screen options 动态设置 Header */}
      <Stack.Screen
        options={{
          title: '文章详情',
          headerRight: () => (
            <Pressable onPress={handleShare} hitSlop={12}>
              <Ionicons name="share-outline" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />

      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        <Image
          source={post.coverImage}
          className="w-full aspect-video"
          contentFit="cover"
          transition={300}
        />

        <View className="px-5 py-5">
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {post.tags.map((tag) => (
              <View key={tag} className="rounded-full bg-indigo-50 px-3 py-1">
                <Text className="text-xs font-medium text-indigo-600">{tag}</Text>
              </View>
            ))}
          </View>

          <Text className="text-xl font-bold text-gray-900 leading-7">
            {post.title}
          </Text>

          <View className="flex-row items-center mt-4 pb-4 border-b border-gray-100">
            <Image
              source={post.author.avatar}
              className="w-10 h-10 rounded-full bg-gray-100"
              contentFit="cover"
            />
            <View className="ml-3">
              <Text className="text-sm font-medium text-gray-800">
                {post.author.name}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-base text-gray-700 leading-7">
            {post.summary}
          </Text>

          {/* Route Params 调试信息 */}
          <View className="mt-6 rounded-xl bg-gray-100 p-4">
            <Text className="text-xs font-mono text-gray-500">
              useLocalSearchParams() → {'{ id: "' + id + '" }'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <ShareSheet
        ref={shareSheetRef}
        title={post.title}
        url={`rnjourney://post/${post.id}`}
      />
    </>
  );
}
```

### Step 4: 创建 ShareSheet 组件 (BottomSheetModal)

**这一步在干什么**: 封装一个可复用的分享面板组件，基于 `BottomSheetModal` 实现。通过 `forwardRef` 暴露 `present()` / `dismiss()` 方法，让父组件控制面板的开关。

```typescript
// src/components/ShareSheet.tsx
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ShareOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const SHARE_OPTIONS: ShareOption[] = [
  { id: 'link', label: '复制链接', icon: 'link-outline', color: '#6366F1', bgColor: '#EEF2FF' },
  { id: 'wechat', label: '微信', icon: 'chatbubble-ellipses-outline', color: '#22C55E', bgColor: '#F0FDF4' },
  { id: 'weibo', label: '微博', icon: 'globe-outline', color: '#EF4444', bgColor: '#FEF2F2' },
  { id: 'save', label: '保存图片', icon: 'download-outline', color: '#F59E0B', bgColor: '#FFFBEB' },
  { id: 'more', label: '更多', icon: 'ellipsis-horizontal', color: '#6B7280', bgColor: '#F3F4F6' },
];

interface ShareSheetProps {
  title: string;
  url: string;
}

export const ShareSheet = forwardRef<BottomSheetModal, ShareSheetProps>(
  function ShareSheet({ title, url }, ref) {
    const insets = useSafeAreaInsets();

    // snapPoints 定义面板停靠高度
    const snapPoints = useMemo(() => ['35%'], []);

    // 半透明遮罩：index 为 -1（完全关闭）时消失，index 为 0（第一个 snap）时出现
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
        />
      ),
      [],
    );

    const handleOptionPress = useCallback(
      (option: ShareOption) => {
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
        Alert.alert(option.label, `分享「${title}」\n链接: ${url}`);
      },
      [ref, title, url],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 36 }}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <BottomSheetView style={{ flex: 1, paddingBottom: insets.bottom + 8 }}>
          <Text className="px-5 pb-3 text-base font-semibold text-gray-900">
            分享到
          </Text>

          <View className="flex-row flex-wrap px-5 gap-4">
            {SHARE_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                className="items-center active:opacity-60"
                style={{ width: 56 }}
                onPress={() => handleOptionPress(option)}
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: option.bgColor }}
                >
                  <Ionicons name={option.icon} size={22} color={option.color} />
                </View>
                <Text className="mt-1.5 text-xs text-gray-600">
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            className="mx-5 mt-5 items-center rounded-xl bg-gray-100 py-3 active:bg-gray-200"
            onPress={() =>
              (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()
            }
          >
            <Text className="text-sm font-medium text-gray-600">取消</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
```

### Step 5: 创建 Modal 路由页面

**这一步在干什么**: 创建 `app/settings-modal.tsx`，这个文件在 `app/` 根目录（不在任何路由组内），被根 Stack 以 `presentation: 'modal'` 模式呈现。iOS 上会以原生卡片式动画从底部滑入，用户可通过下拉手势关闭。

```typescript
// app/settings-modal.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SETTING_ITEMS = [
  { icon: 'notifications-outline', label: '推送通知', type: 'toggle', value: true },
  { icon: 'moon-outline', label: '深色模式', type: 'toggle', value: false },
  { icon: 'language-outline', label: '语言', type: 'link' },
  { icon: 'shield-checkmark-outline', label: '隐私设置', type: 'link' },
  { icon: 'help-circle-outline', label: '帮助与反馈', type: 'link' },
] as const;

export default function SettingsModalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: '#f9fafb' }}>
      {/* 拖拽指示条：暗示用户可下拉关闭 */}
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
    </View>
  );
}
```

### Step 6: 接线 — 从 Feed 卡片跳转到详情页

**这一步在干什么**: 为首页 Feed 中的 `PostCard` 绑定 `onPress` 回调，点击卡片后通过 `router.push` 跳转到动态路由详情页，传递文章 ID 作为 URL 路径参数。

```typescript
// app/(tabs)/index.tsx — 关键改动
import { type Href, useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  // ...

  const handlePostPress = useCallback(
    (post: Post) => {
      router.push(`/(screens)/post/${post.id}` as Href);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard post={item} onPress={handlePostPress} />
    ),
    [handlePostPress],
  );
  // ...
}
```

### Step 7: 配置 Deep Linking

**这一步在干什么**: Expo Router 的文件路由天然支持 Deep Linking，只需在 `app.json` 中配置 URL Scheme。项目已配置 `"scheme": "rnjourney"`。

```json
// app.json（已配置）
{
  "expo": {
    "scheme": "rnjourney"
  }
}
```

验证 Deep Linking：

```bash
# 在终端测试（需要 App 运行在模拟器中）
npx uri-scheme open "rnjourney:///(screens)/post/post-1" --ios
npx uri-scheme open "rnjourney:///(screens)/post/post-1" --android
```

如需 HTTPS Universal Links（生产环境推荐），还需在 `app.json` 中配置 `intentFilters`（Android）和 `associatedDomains`（iOS），并在服务器上部署验证文件。这属于发布阶段的配置，此处不展开。
