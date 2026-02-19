# 005. Expo Router 路由与基础组件

## 1. 核心概念 (Concept)

### 1.1 文件即路由 (File-based Routing)

在 Expo Router 中，**文件系统的结构直接定义了应用的 URL 结构**。不需要像传统 React Navigation 那样在一个中心化的配置文件中声明所有路由。

* **页面**: `app/` 目录下的 `.tsx` 文件自动成为一个页面。例如 `app/login.tsx` 对应路由 `/login`。
* **布局 (`_layout.tsx`)**: 这是一个特殊文件，用于在多个页面之间共享 UI（如导航栏、底部 Tab）。它充当“包装器”，将被包裹的页面内容渲染在 `<Slot />` 或导航器（如 `<Stack>`, `<Tabs>`）中。

### 1.2 Stack 导航器

在 Expo Router 中，**`<Stack>` 是一种导航器（Navigator）**，用于实现"栈式导航"（Stack Navigation）。它是构建页面层级关系的核心组件。

#### 1.2.1 核心概念

**栈式导航的工作原理：**

* **导航栈（Navigation Stack）**：类似于 iOS/Android 原生应用的页面堆栈，是一个后进先出（LIFO）的数据结构
* **压栈（Push）**：跳转到新页面时，新页面被压入栈顶，成为当前可见页面
* **出栈（Pop）**：返回时，当前页面从栈顶弹出，露出下层页面
* **栈深度**：栈中页面数量决定了返回层级，可以连续返回到任意层级

**表现形态：**

`<Stack>` 默认会为每个页面添加**顶部导航栏（Header）**，包含：

- 左侧返回按钮（根页面除外）
- 中间页面标题
- 右侧可操作区域（可选）

#### 1.2.2 Stack vs Tabs 对比

| 维度               | Stack                | Tabs                |
| ------------------ | -------------------- | ------------------- |
| **导航模式** | 层级递进（父→子）   | 同级切换            |
| **用户认知** | 进入新页面，可返回   | 切换不同模块        |
| **视觉表现** | 页面推入/推出动画    | 底部标签高亮切换    |
| **典型场景** | 列表→详情、表单流程 | 首页/发现/我的      |
| **栈管理**   | 维护独立导航栈       | 每个 Tab 可有独立栈 |

#### 1.2.3 Stack.Screen 配置详解

`<Stack.Screen>` 用于声明和配置单个页面，必须作为 `<Stack>` 的子元素。

**基础属性：**

```tsx
<Stack.Screen
  name="profile"           // 路由名称（对应文件路径）
  options={{
    title: "个人中心",      // 页面标题（显示在导航栏中央）
    headerShown: true,      // 是否显示导航栏（默认 true）
  }}
/>
```

**完整的 Options 配置：**

```tsx
<Stack.Screen
  name="detail"
  options={{
    // === 标题配置 ===
    title: "商品详情",
    headerTitle: "自定义标题组件",  // 可传入 React 元素
    headerTitleAlign: "center",      // 标题对齐：left / center
    headerTitleStyle: {
      fontSize: 18,
      fontWeight: "600",
      color: "#333",
    },

    // === 导航栏显示控制 ===
    headerShown: true,               // 是否显示导航栏
    headerTransparent: false,        // 导航栏是否透明
    headerBlurEffect: "light",       // iOS 模糊效果（需透明）

    // === 返回按钮配置 ===
    headerBackTitle: "返回",         // 返回按钮文字（iOS 默认显示）
    headerBackTitleVisible: false,   // 是否显示返回文字
    headerBackButtonMenuEnabled: true, // iOS 长按返回按钮显示历史

    // === 左右按钮自定义 ===
    headerLeft: () => <CustomBackButton />,
    headerRight: () => <ShareButton />,

    // === 导航栏样式 ===
    headerStyle: {
      backgroundColor: "#fff",
      elevation: 0,                  // Android 阴影
      shadowOpacity: 0,              // iOS 阴影
    },
    headerTintColor: "#007AFF",      // 返回按钮和标题颜色

    // === 动画与交互 ===
    animation: "slide_from_right",   // 动画类型
    gestureEnabled: true,            // 是否启用手势返回（iOS 默认 true）
    gestureDirection: "horizontal",  // 手势方向
    fullScreenGestureEnabled: true,  // 全屏手势返回（iOS）

    // === 特殊呈现模式 ===
    presentation: "card",            // card / modal / transparentModal / fullScreenModal
    contentStyle: {                  // 页面内容容器样式
      backgroundColor: "#f5f5f5",
    },
  }}
/>
```

**presentation 模式说明：**

| 模式                 | 效果                   | 适用场景       |
| -------------------- | ---------------------- | -------------- |
| `card`             | 默认卡片式推入         | 普通页面跳转   |
| `modal`            | 从底部弹出，带遮罩     | 表单、选择器   |
| `transparentModal` | 透明背景模态           | 弹窗、底部抽屉 |
| `fullScreenModal`  | 全屏模态（无返回按钮） | 全屏预览、相机 |
| `containedModal`   | 在容器内弹出           | 嵌套导航场景   |

#### 1.2.4 Stack 全局配置（screenOptions）

通过 `screenOptions` 可统一配置所有子页面的默认行为：

```tsx
export default function Layout() {
  return (
    <Stack
      screenOptions={{
        // 全局标题样式
        headerTitleStyle: { fontWeight: "600" },
        headerTintColor: "#333",
    
        // 全局导航栏样式
        headerStyle: { backgroundColor: "#fff" },
    
        // 全局动画
        animation: "slide_from_right",
    
        // 全局手势
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
    
        // 自定义返回按钮（全局）
        headerLeft: () => <CustomBackIcon />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "首页" }} />
      <Stack.Screen 
        name="detail" 
        options={{ 
          title: "详情",
          // 单独覆盖全局配置
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
```

### 1.3 路由分组 (Group Syntax)

使用圆括号 `()` 包裹的目录名称（例如 `app/(tabs)/`）称为**分组**。

* **作用**：它用于组织代码逻辑，但**不会出现在 URL 路径中**。
* **示例**：`app/(tabs)/index.tsx` 的路由依然是 `/`，而不是 `/tabs`。这允许我们在不改变 URL 结构的情况下，将相关页面（如 Tab 页）组织在一起，并为它们应用单独的 `_layout.tsx`。

---

## 2. 核心用法 (Usage)

### 2.1 嵌套布局结构 (Nested Layouts)

React Native 应用通常采用层级化的布局结构。结合本项目代码：

**Level 1: 根布局 (`app/_layout.tsx`)**
通常使用 `<Stack>` 作为最外层容器，类似于“原生应用的导航栈”。

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* 隐藏 Stack 自身的头部，因为子页面(Tabs)会有自己的导航栏 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
```

**Level 2: Tab 布局 (`app/(tabs)/_layout.tsx`)**
在 `(tabs)` 分组内，使用 `<Tabs>` 组件实现底部导航栏。

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; // Expo 内置图标库

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#6366F1" }}>
      {/* 首页 Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: "首页",
          // 动态设置图标：根据 focused 状态切换实心/空心图标
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      {/* 登录页 Tab */}
      <Tabs.Screen
        name="login"
        options={{
          title: "登录",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### 2.2 基础组件与样式 (Basic Components)

React Native 不使用 HTML 标签（如 `div`, `p`），而是使用原生组件。

* **`<View>`**: 相当于 `<div>`，用于布局和容器。默认采用 Flexbox 布局（方向默认为 `column`）。
* **`<Text>`**: 相当于 `<span>` 或 `<p>`，是显示文本的唯一方式。文本必须包裹在 `<Text>` 中，不能直接写在 `<View>` 里。

**样式设置 (`StyleSheet`)**：

```tsx
// app/(tabs)/index.tsx
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    // style 属性可以接受对象或 StyleSheet ID
    <View style={styles.container}>
      <Text style={styles.text}>Edit app/index.tsx</Text>
    </View>
  );
}

// 使用 StyleSheet.create 定义样式
const styles = StyleSheet.create({
  container: {
    flex: 1, // 占满可用空间
    justifyContent: "center", // 主轴居中
    alignItems: "center",     // 交叉轴居中
  },
  text: {
    fontSize: 16,
    color: "#333",
  }
});
```

### 2.3 Stack 实战：导航操作与动态配置

#### 编程式导航（useRouter）

在页面组件中使用 `useRouter` 进行命令式导航操作：

```tsx
import { useRouter } from "expo-router";

export default function ProductList() {
  const router = useRouter();

  const handleNavigate = () => {
    // 基础跳转（压栈）
    router.push("/detail/123");
  
    // 携带参数跳转
    router.push({
      pathname: "/detail/[id]",
      params: { id: "123", from: "list" }
    });
  
    // 替换当前页面（不压栈，替换栈顶）
    router.replace("/home");
  
    // 返回上一页
    router.back();
  
    // 若目标已在栈中则回退到该页（并弹出其上的页面），否则压栈跳转
    router.navigate("/home");
  
    // 重置导航栈：可用 router.replace("/(tabs)") 回到主 Tab 并清空栈顶；更细粒度控制需使用 navigation.dispatch(CommonActions.reset(...))
  };

  return <Button title="查看详情" onPress={handleNavigate} />;
}
```

#### 声明式导航（Link 组件）

`Link` 组件提供了类似 Web `<a>` 标签的声明式导航方式，适用于按钮、列表项等可点击元素。

**基础用法：**

```tsx
import { Link } from "expo-router";

// 基本跳转（默认 push，等同于 router.push）
<Link href="/detail/123">查看详情</Link>

// 携带参数
<Link 
  href={{
    pathname: "/detail/[id]",
    params: { id: "123", from: "list" }
  }}
>
  查看详情
</Link>
```

**Link vs push 的关系：**

| 特性               | `Link` 组件    | `router.push`          |
| ------------------ | ---------------- | ------------------------ |
| **导航方式** | 声明式（JSX）    | 命令式（函数调用）       |
| **默认行为** | push（压栈）     | push（压栈）             |
| **使用场景** | 可点击的 UI 元素 | 条件判断、异步操作后跳转 |
| **样式传递** | 支持 `asChild` | 不适用                   |

**Link 的常用属性：**

```tsx
<Link
  href="/profile"              // 目标路由（string 或对象）
  replace                       // 为 true 时替换当前页（等同 router.replace），否则默认 push
  asChild                       // 将样式和行为传递给子元素
  onPress={(e) => {            // 点击事件拦截
    if (!isLogin) {
      e.preventDefault();       // 阻止默认跳转
      router.push("/login");
    }
  }}
>
  <TouchableOpacity style={styles.button}>
    <Text>个人中心</Text>
  </TouchableOpacity>
</Link>
```

**asChild 模式（样式传递）：**

当需要给 Link 添加复杂样式或包裹自定义组件时，使用 `asChild`：

```tsx
// ✅ 使用 asChild，Link 的样式由子元素控制
<Link href="/detail" asChild>
  <TouchableOpacity style={styles.card} activeOpacity={0.8}>
    <Image source={product.image} />
    <Text>{product.name}</Text>
  </TouchableOpacity>
</Link>

// ❌ 不使用 asChild，Link 会包裹一层默认样式
<Link href="/detail" style={styles.card}>
  <Text>{product.name}</Text>
</Link>
```

**如何选择：**

- **使用 `Link`**：列表项、卡片、按钮等可点击元素，需要用户主动点击触发
- **使用 `router.push`**：表单提交后跳转、条件判断后跳转、定时器跳转等命令式场景

#### 动态头部配置

使用 `useNavigation` 在运行时动态修改导航栏：

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "expo-router";
import { useEffect } from "react";

export default function DynamicHeaderPage() {
  const navigation = useNavigation();

  const handleSave = () => {
    // 保存逻辑，如调用 API 后 router.back()
  };

  useEffect(() => {
    navigation.setOptions({
      title: "动态标题",
      headerRight: () => (
        <TouchableOpacity onPress={handleSave}>
          <Text style={{ color: "#007AFF", marginRight: 16 }}>保存</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return <View />;
}
```

#### 接收导航参数

```tsx
import { useLocalSearchParams } from "expo-router";

export default function DetailPage() {
  // 路径参数（如 [id]）为 string；查询参数可能为 string | string[]，使用时需做类型处理
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  
  return (
    <View>
      <Text>商品 ID: {id}</Text>
      <Text>来源: {from}</Text>
    </View>
  );
}
```

### 2.4 使用图标库

Expo 预装了 `@expo/vector-icons`，包含主流图标集（Ionicons, FontAwesome, MaterialIcons 等）。

```tsx
import { Ionicons } from "@expo/vector-icons";

// 使用方式
<Ionicons name="home" size={24} color="black" />
```

### 2.5 安全区域 (Safe Area)

#### 2.5.1 核心概念

现代手机屏幕有刘海（Notch）、圆角、状态栏、底部 Home Indicator 等非矩形区域。如果 UI 内容延伸到这些区域，就会被遮挡或截断。

**安全区域（Safe Area）** 是操作系统告知应用的"可安全渲染内容"的矩形区域。`react-native-safe-area-context` 提供了获取这些边距值的能力。

```
┌──────────────────────────┐
│       状态栏 (insets.top) │
├──────────────────────────┤
│                          │
│      Safe Area           │
│    （可安全渲染区域）      │
│                          │
├──────────────────────────┤
│  Home Indicator (bottom) │
└──────────────────────────┘
```

#### 2.5.2 Provider 的来源

使用 `useSafeAreaInsets` 前需要外层有 `SafeAreaProvider`。在 Expo Router 项目中，**框架已在内部自动注入了 `SafeAreaProvider`**，无需手动包裹。可以在任何路由组件中直接调用 hook。

#### 2.5.3 两种使用方式对比

**方式一：`<SafeAreaView>` 组件（简单场景）**

自动应用所有方向的安全区域 padding，适合不需要精细控制的页面：

```tsx
import { SafeAreaView } from "react-native-safe-area-context";

export default function SimpleScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text>内容不会被状态栏或 Home Indicator 遮挡</Text>
    </SafeAreaView>
  );
}
```

**方式二：`useSafeAreaInsets()` Hook（精细控制）**

返回四个方向的像素值 `{ top, bottom, left, right }`，可按需选择性使用：

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CustomScreen() {
  const insets = useSafeAreaInsets();

  // 只需要顶部避让状态栏，底部有 TabBar 自行处理
  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Text>精确控制顶部安全区域</Text>
    </View>
  );
}
```

#### 2.5.4 如何选择

| 场景                     | 推荐方式              | 原因                                                    |
| ------------------------ | --------------------- | ------------------------------------------------------- |
| 简单全屏页面             | `SafeAreaView`      | 四个方向一键处理，代码最少                              |
| 只需部分方向避让         | `useSafeAreaInsets` | 如 Tab 页面只需 `paddingTop`，底部由 TabBar 覆盖      |
| 背景色需延伸到状态栏     | `useSafeAreaInsets` | `SafeAreaView` 会在状态栏区域留白，无法实现沉浸式背景 |
| 自定义 Header / 吸顶元素 | `useSafeAreaInsets` | 需要将 `insets.top` 加到自定义 Header 的高度中        |

#### 2.5.5 典型模式

**沉浸式背景 + 内容安全区域**（如 Profile Tab、Login 页）：

```tsx
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  // 外层容器用 style 控制安全区域偏移和背景色
  // 内层子组件仅用 className 控制展示样式
  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: "#f9fafb" }}>
      <ScrollView className="flex-1">
        {/* 页面内容 */}
      </ScrollView>
    </View>
  );
}
```

这里不使用 `SafeAreaView`，是因为需要背景色从屏幕顶部边缘开始渲染（沉浸式），同时只有内容区域需要避让状态栏。Tab 页面的底部由 TabBar 占据，无需额外处理 `insets.bottom`。

---

## 3. 最佳实践 (Best Practices)

### 3.1 样式分离 (StyleSheet vs Inline)

* **✅ 推荐**: 使用 `StyleSheet.create`。
  * **性能**: 样式对象会被“注册”并生成 ID，通过 Bridge 传输更高效。
  * **校验**: 它可以验证样式属性的拼写错误。
  * **维护**: 将样式与业务逻辑分离，代码更清晰。
* **❌ 避免**: 大量使用内联样式 `style={{ width: 100, ... }}`，除非是动态计算的值。

### 3.2 Stack 导航架构设计

* **根 Stack + 内部 Tabs 模式（推荐）**

```
app/
├── _layout.tsx          # Root Stack：处理全局导航、模态框
├── (tabs)/
│   ├── _layout.tsx      # Tabs 布局：底部导航
│   ├── index.tsx        # 首页
│   └── profile.tsx      # 个人中心
├── product/
│   ├── [id].tsx         # 商品详情（Stack 页面）
│   └── _layout.tsx      # Product Stack（可选）
└── settings/
    └── index.tsx        # 设置页（全屏 Modal）
```

```tsx
// app/_layout.tsx
export default function RootLayout() {
  return (
    <Stack>
      {/* 主界面：Tabs，隐藏 Stack 头部 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  
      {/* 普通页面：继承 Stack 头部 */}
      <Stack.Screen name="product/[id]" options={{ title: "商品详情" }} />
  
      {/* 模态框：从底部弹出 */}
      <Stack.Screen 
        name="settings/index" 
        options={{ presentation: "modal", title: "设置" }} 
      />
  
      {/* 全屏页面：用于图片预览等 */}
      <Stack.Screen 
        name="image-viewer" 
        options={{ presentation: "fullScreenModal", headerShown: false }} 
      />
    </Stack>
  );
}
```

* **Stack 嵌套 Stack（复杂场景）**

当某个 Tab 内部需要复杂的多级页面时，可将该 Tab 做成目录并在其下放 `_layout.tsx` 使用 Stack，对应文件结构为 `app/(tabs)/product/`（product 为 Tab 名）：

```tsx
// app/(tabs)/product/_layout.tsx
export default function ProductStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "商品列表" }} />
      <Stack.Screen name="detail/[id]" options={{ title: "商品详情" }} />
      <Stack.Screen name="reviews" options={{ title: "用户评价" }} />
    </Stack>
  );
}
```

* **保持 `_layout.tsx` 纯净**

只负责导航结构定义，不编写业务逻辑：

```tsx
// ✅ 好的做法：_layout.tsx 只配置导航
export default function Layout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

// ✅ 在页面组件中设置动态标题
// app/index.tsx
import { useEffect } from "react";
import { useNavigation } from "expo-router";

export default function Index() {
  const navigation = useNavigation();
  const { data } = useQuery({...});  // 获取数据
  
  useEffect(() => {
    navigation.setOptions({ title: data?.name });
  }, [navigation, data]);
  
  return <View />;
}
```

### 3.3 性能优化建议

* **避免深层嵌套 Stack**

超过 3 层嵌套的 Stack 会导致导航状态难以追踪，考虑使用 `navigate` 替代多层 `push`：

```tsx
// ❌ 不推荐：深层嵌套跳转
router.push("/a");
router.push("/a/b");
router.push("/a/b/c");

// ✅ 推荐：直接跳转到目标，或使用 navigate
router.navigate("/a/b/c");  // 如果栈中存在则复用
```

* **懒加载大页面**

Expo Router 已按路由做代码分割，进入某路由时才会加载对应页面文件，无需对路由页面再包一层 `lazy`。`React.lazy` 适用于**非路由**的重型组件（如弹窗内容、条件渲染的大模块），或非 Expo Router 管理的屏幕：

```tsx
import { lazy, Suspense } from "react";

const HeavyNonRouteComponent = lazy(() => import("./HeavyWidget"));
// 在需要时用 <Suspense fallback={...}><HeavyNonRouteComponent /></Suspense> 渲染
```

* **合理使用 `replace` 替代 `push`**

在登录成功、提交表单后的跳转场景，使用 `replace` 避免用户返回到中间状态页：

```tsx
// 登录成功后，替换登录页，用户按返回不会回到登录页
router.replace("/home");
```

### 3.4 图标与样式管理

* **统一图标风格**：在一个 Stack 内保持图标风格一致（如全是 Outline 或全是 Filled）
* **提取公共配置**：将常用的 `headerStyle`、`headerTitleStyle` 提取到 `screenOptions`
* **颜色变量集中管理**：在 `constants/Colors.ts` 中定义导航栏颜色

```tsx
// constants/Navigation.ts
export const StackScreenOptions = {
  headerTitleStyle: { fontWeight: "600", fontSize: 17 },
  headerStyle: { backgroundColor: "#fff" },
  headerTintColor: "#007AFF",
  headerShadowVisible: false,  // 隐藏底部分割线
};

// app/_layout.tsx
import { StackScreenOptions } from "@/constants/Navigation";

<Stack screenOptions={StackScreenOptions}>
```

## 4. 关联知识

- [Expo Router 官方文档](https://docs.expo.dev/router/introduction/)
- [Stack Navigator 详细配置](https://docs.expo.dev/router/advanced/stack/)
- [React Navigation Stack 文档](https://reactnavigation.org/docs/stack-navigator/)
- [React Native 核心组件](https://reactnative.dev/docs/components-and-apis)
- [Ionicons 图标目录](https://icons.expo.fyi/Index)
- [react-native-safe-area-context 文档](https://docs.expo.dev/versions/latest/sdk/safe-area-context/)
