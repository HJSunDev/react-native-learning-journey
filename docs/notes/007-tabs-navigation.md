# 007. Tabs 导航与底部导航栏设计

## 1. 核心概念 (Concept)

### 1.1 Tabs 是什么

**`<Tabs>` 是 Expo Router 提供的底部导航栏组件**，用于实现应用的主导航结构。它允许用户在几个主要功能模块之间快速切换，每个模块（Tab）维护自己的导航状态。

**核心特性：**

* **同级导航**：所有 Tab 处于同一层级
* **状态保持**：切换 Tab 时，之前 Tab 的状态会被保留（Scroll 位置、输入内容等）
* **视觉反馈**：当前选中的 Tab 会高亮显示（图标、文字颜色变化）
* **无滑动切换**：Bottom Tabs 不支持左右滑动切换 Tab；若需滑动切换应使用 Material Top Tabs（需单独集成）

**典型应用场景：**

| 应用类型 | Tab 结构示例                 |
| -------- | ---------------------------- |
| 电商应用 | 首页 / 消息 / 购物车 / 我的 |
| 社交应用 | 微信 / 通讯录 / 发现 / 我    |
| 内容应用 | 首页 / 关注 / 上传 / 我的   |

### 1.2 Tabs vs Stack 对比

理解两者的本质区别，是设计导航架构的基础：

| 维度               | Tabs                      | Stack                      |
| ------------------ | ------------------------- | -------------------------- |
| **用户心智** | "我在不同模块间切换"      | "我进入了新页面，可以返回" |
| **导航栈**   | 每个 Tab 可有自己的独立栈 | 一个共享的栈（或嵌套栈）   |
| **状态管理** | 切换后状态保持            | 返回后页面可能被卸载       |
| **动画方向** | 水平/无动画               | 从右向左推入               |
| **返回行为** | 切换回之前的 Tab          | 从栈顶弹出页面             |
| **适用场景** | 主功能入口                | 详情页、表单流程           |

**协作关系：**

通常一个应用会同时使用两者：

- **Tabs** 作为最外层容器，组织主要功能模块
- **Stack** 嵌入每个 Tab 内部，处理模块内的页面层级

### 1.3 Tabs 的工作机制

**导航状态树：**

```
Root Tabs
├── Tab A: Home
│   └── Stack Navigator
│       ├── Home Index (首页)
│       └── Home Detail (详情页)
├── Tab B: Explore
│   └── Stack Navigator
│       ├── Explore Index
│       └── Search Result
└── Tab C: Profile
    └── Stack Navigator
        ├── Profile Index
        └── Settings
```

**关键点：**

* 每个 Tab 对应 `app/(tabs)/xxx` 目录或文件
* Tab 切换不会销毁组件，只是隐藏显示（`display: none`）
* 每个 Tab 内的 Stack 是独立的，A Tab 的 Detail 页不会影响 B Tab

---

## 2. 基础用法 (Basic Usage)

### 2.1 最简单的 Tabs 布局

创建 `app/(tabs)/_layout.tsx` 文件：

```tsx
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
```

对应文件结构：

```
app/
├── (tabs)/
│   ├── _layout.tsx      # Tabs 布局配置
│   ├── index.tsx        # 首页（对应 /）
│   ├── explore.tsx      # 发现页（对应 /explore）
│   └── profile.tsx      # 个人中心（对应 /profile）
└── _layout.tsx          # 根 Stack（包裹 Tabs）
```

**默认效果：**

- 底部显示三个 Tab 按钮
- 文字取自路由名称（index, explore, profile）
- 无图标，纯文字标签
- 选中项高亮显示

### 2.2 Tabs.Screen 配置详解

`<Tabs.Screen>` 用于配置单个 Tab 的显示属性：

```tsx
<Tabs.Screen
  name="index"                     // 路由名称（必填，对应文件名）
  options={{
    title: "首页",                  // Tab 标签文字
    tabBarLabel: "首页",            // 可单独覆盖 title
    tabBarLabelPosition: "below-icon", // 标签位置: below-icon / beside-icon
    tabBarBadge: "9",               // 徽章数字（购物车数量、消息数）
    tabBarBadgeStyle: {             // 徽章样式
      backgroundColor: "#FF3B30",
    },
    tabBarIcon: ({ color, size }) => (  // 图标渲染函数
      <Ionicons name="home" size={size} color={color} />
    ),
    tabBarButton: (props) => (      // 完全自定义按钮
      <TouchableOpacity {...props} />
    ),
  }}
/>
```

### 2.3 图标配置（tabBarIcon）

图标是 Tab 导航的灵魂，`tabBarIcon` 是一个函数，接收以下参数：

| 参数        | 类型    | 说明                        |
| ----------- | ------- | --------------------------- |
| `color`   | string  | 当前状态颜色（激活/未激活） |
| `size`    | number  | 图标尺寸（默认 24）         |
| `focused` | boolean | 是否处于选中状态            |

**基础用法：**

```tsx
import { Ionicons } from "@expo/vector-icons";

<Tabs.Screen
  name="home"
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="home" size={size} color={color} />
    ),
  }}
/>
```

**根据选中状态切换图标：**

```tsx
<Tabs.Screen
  name="home"
  options={{
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons 
        name={focused ? "home" : "home-outline"} 
        size={size} 
        color={color} 
      />
    ),
  }}
/>
```

**使用自定义图片：**

```tsx
import { Image } from "react-native";

<Tabs.Screen
  name="vip"
  options={{
    tabBarIcon: ({ focused }) => (
      <Image
        source={focused 
          ? require("@/assets/icons/vip-active.png")
          : require("@/assets/icons/vip-inactive.png")
        }
        style={{ width: 24, height: 24 }}
      />
    ),
  }}
/>
```

### 2.4 自定义标签文字（tabBarLabel）

```tsx
<Tabs.Screen
  name="index"
  options={{
    title: "Home",              // 同时影响 Header 标题和 Tab 标签
    tabBarLabel: "首页",        // 仅覆盖 Tab 标签
  }}
/>

// 或使用函数动态控制
<Tabs.Screen
  name="messages"
  options={{
    tabBarLabel: ({ focused, color }) => (
      <Text style={{ color, fontSize: 12, fontWeight: focused ? "600" : "400" }}>
        消息
      </Text>
    ),
  }}
/>
```

---

## 3. Tabs 全局样式配置

### 3.1 screenOptions 统一配置

通过 `screenOptions` 设置所有 Tab 的默认样式：

```tsx
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // Tab 栏整体样式
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#E5E5E5",
          height: 84,                    // iOS 适配底部安全区
          paddingBottom: 30,
        },
        tabBarActiveTintColor: "#007AFF",      // 激活状态颜色
        tabBarInactiveTintColor: "#999",       // 未激活状态颜色
        tabBarActiveBackgroundColor: "transparent", // 激活背景（通常不用）
        tabBarInactiveBackgroundColor: "transparent",
    
        // 标签文字样式
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
    
        // 图标样式
        tabBarIconStyle: {
          marginTop: 4,
        },
    
        // 是否显示标签
        tabBarShowLabel: true,
    
        // 标签位置
        tabBarLabelPosition: "below-icon",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen name="explore" options={{ title: "发现" }} />
      <Tabs.Screen name="profile" options={{ title: "我的" }} />
    </Tabs>
  );
}
```

### 3.2 TabBar 位置与外观

**顶部 / 侧边 Tabs：**

`tabBarPosition` 支持 `bottom`（默认）、`top`、`left`、`right`。

设为 `left` 或 `right` 时呈现为侧边栏，适合大屏适配。

`tabBarVariant` 可选 `uikit`（默认，iOS 风格）或 `material`（Material Design 风格）；`material` 仅在 `tabBarPosition` 为 `left` / `right` 时生效。

```tsx
<Tabs
  screenOptions={{
    tabBarPosition: "top",        // top / bottom（默认）/ left / right
    tabBarVariant: "uikit",       // uikit（默认）| material
  }}
>
```

**隐藏 TabBar（特定页面全屏）：**

```tsx
<Tabs.Screen
  name="fullscreen"
  options={{
    tabBarStyle: { display: "none" },  // 隐藏 TabBar
  }}
/>
```

### 3.3 徽章（Badge）显示

常用于消息、购物车数量提示：

```tsx
function useUnreadCount() {
  // 从全局状态或 API 获取未读数
  return 9;
}

export default function TabsLayout() {
  const unreadCount = useUnreadCount();

  return (
    <Tabs>
      <Tabs.Screen
        name="messages"
        options={{
          tabBarBadge: unreadCount > 0 ? String(unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#FF3B30",
            fontSize: 10,
          },
        }}
      />
    </Tabs>
  );
}
```

### 3.4 隐藏特定 Tab

某些路由（如详情页）需要存在于 (tabs) 下、参与导航，但不希望在 TabBar 显示。用 `href: null` 即可从 TabBar 隐藏该路由，**该路由仍是 (tabs) 下的独立同级路由**，并非「某个 Tab 内部的栈内页」。

若希望详情页属于某个 Tab 的栈内（例如从发现页进入详情再返回发现），应把详情放在该 Tab 目录下，如 `(tabs)/explore/detail/[id].tsx`。

```tsx
<Tabs.Screen
  name="detail/[id]"              // (tabs) 下的独立路由
  options={{
    href: null,                   // 不在 TabBar 显示
    // 或完全自定义按钮返回 null
    // tabBarButton: () => null,
  }}
/>
```

文件结构示例（detail 与 index、explore 同级，仅从 TabBar 隐藏）：

```
app/(tabs)/
├── _layout.tsx
├── index.tsx        # Tab 显示
├── explore.tsx      # Tab 显示
└── detail/
    └── [id].tsx     # (tabs) 下的路由，href: null 故不在 TabBar 显示
```

---

## 4. Tabs 与 Stack 组合架构

### 4.1 推荐架构：根 Stack + Tabs + 子 Stack

这是最经典、最清晰的 React Native 导航架构：

```
app/
├── _layout.tsx              # Root Stack：处理全局模态、全屏页面
├── (tabs)/                  # Tabs 分组
│   ├── _layout.tsx          # Tabs 配置
│   ├── index.tsx            # 首页（Tab 1）
│   ├── explore/
│   │   ├── _layout.tsx      # Explore Stack
│   │   ├── index.tsx        # 发现首页
│   │   └── search.tsx       # 搜索页
│   └── profile/
│       ├── _layout.tsx      # Profile Stack
│       ├── index.tsx        # 个人中心首页
│       ├── settings.tsx     # 设置页
│       └── edit.tsx         # 编辑资料
└── modal/
    └── camera.tsx           # 全屏相机（根 Stack 弹出）
```

**根 Stack 配置：**

```tsx
// app/_layout.tsx
export default function RootLayout() {
  return (
    <Stack>
      {/* Tabs 作为主界面，隐藏 Stack 头部 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  
      {/* 全局模态框 */}
      <Stack.Screen 
        name="modal/camera" 
        options={{ presentation: "fullScreenModal" }} 
      />
    </Stack>
  );
}
```

**Tabs 配置：**

```tsx
// app/(tabs)/_layout.tsx
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
```

**Explore Tab 内部 Stack：**

```tsx
// app/(tabs)/explore/_layout.tsx
export default function ExploreStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "发现" }} />
      <Stack.Screen name="search" options={{ title: "搜索" }} />
    </Stack>
  );
}
```

### 4.2 跨 Tab 跳转

从 Home Tab 跳转到 Profile Tab 的 Settings 页面：

```tsx
import { useRouter } from "expo-router";

export default function HomePage() {
  const router = useRouter();

  const goToProfileSettings = () => {
    // 直接跳转，Tabs 会自动切换到 Profile Tab
    router.push("/(tabs)/profile/settings");
  };

  return <Button title="去设置" onPress={goToProfileSettings} />;
}
```

### 4.3 Tab 内部的多级页面导航

```tsx
// app/(tabs)/explore/index.tsx
import { Link } from "expo-router";

export default function ExploreIndex() {
  return (
    <View>
      {/* 同 Tab 内的页面跳转 */}
      <Link href="/(tabs)/explore/search">去搜索</Link>
  
      {/* 跨 Tab 跳转 */}
      <Link href="/(tabs)/profile">去个人中心</Link>
    </View>
  );
}
```

---

## 5. 实战场景

### 5.1 动态 Tabs（根据权限/登录状态显示）

**推荐**：所有路由文件仍对应声明 `Tabs.Screen`，用 `href: null` 控制是否在 TabBar 显示。这样与文件系统一致，避免条件渲染导致 layout 报错或路由状态异常。

```tsx
import { useAuth } from "@/hooks/useAuth";

export default function TabsLayout() {
  const { isLogin, isVip } = useAuth();

  return (
    <Tabs>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
  
      {/* 仅登录时在 TabBar 显示；未登录时路由仍存在，仅隐藏入口 */}
      <Tabs.Screen
        name="messages"
        options={{ href: isLogin ? undefined : null }}
      />
  
      {/* 仅 VIP 在 TabBar 显示 */}
      <Tabs.Screen
        name="vip"
        options={{ href: isVip ? undefined : null }}
      />
  
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
```

若必须根据权限完全移除某个 Tab（不声明对应 Screen），可配合 `redirect` 使用条件渲染，但需注意与文件路由的一致性，并测试深层链接与返回行为。

### 5.2 自定义 TabBar 组件

完全接管底部导航栏的渲染：

```tsx
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Tabs } from "expo-router";

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
          >
            {options.tabBarIcon?.({ 
              color: isFocused ? "#007AFF" : "#999",
              size: 24,
              focused: isFocused 
            })}
            <Text style={{ color: isFocused ? "#007AFF" : "#999" }}>
              {options.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen name="profile" options={{ title: "我的" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eee", paddingBottom: 20 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
});
```

### 5.3 中间凸起按钮设计

常见的设计模式：中间一个突出的发布按钮

```tsx
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const isMiddle = index === 2;  // 第3个是中间按钮

        if (isMiddle) {
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.middleButton}
              onPress={() => navigation.navigate(route.name)}
            >
              <Ionicons name="add-circle" size={50} color="#007AFF" />
            </TouchableOpacity>
          );
        }

        // 普通 Tab：从 descriptors 取 options，渲染图标+文字，onPress 调用 navigation.navigate(route.name)
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={styles.tabItem}
          >
            {options.tabBarIcon?.({ color: isFocused ? "#007AFF" : "#999", size: 24, focused: isFocused })}
            <Text style={{ color: isFocused ? "#007AFF" : "#999", fontSize: 10 }}>{options.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eee", paddingBottom: 20 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  middleButton: {
    top: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});
```

### 5.4 沉浸式隐藏 TabBar（滚动时隐藏）

通过 Context 在 TabsLayout 与子页之间传递「是否显示 TabBar」的状态，
避免用 `initialParams` 传 setState（initialParams 仅对初始屏生效，且会造成强耦合与多余重渲染）。

```tsx
import { createContext, useContext, useState } from "react";
import { ScrollView } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Tabs } from "expo-router";
import { BottomTabBar } from "@react-navigation/bottom-tabs";

const TabBarVisibilityContext = createContext<{
  visible: boolean;
  setVisible: (v: boolean) => void;
} | null>(null);

export function useTabBarVisibility() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) throw new Error("useTabBarVisibility used outside provider");
  return ctx;
}

export default function TabsLayout() {
  const [visible, setVisible] = useState(true);

  const tabBarStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: withTiming(visible ? 0 : 100, { duration: 300 })
    }],
  }));

  return (
    <TabBarVisibilityContext.Provider value={{ visible, setVisible }}>
      <Tabs
        tabBar={(props) => (
          <Animated.View style={tabBarStyle}>
            <BottomTabBar {...props} />
          </Animated.View>
        )}
      >
        <Tabs.Screen name="home" />
      </Tabs>
    </TabBarVisibilityContext.Provider>
  );
}

// 在需要根据滚动控制 TabBar 的页面中使用
function HomePage() {
  const { setVisible } = useTabBarVisibility();

  const onScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = event.nativeEvent.contentOffset.y;
    setVisible(y < 100);
  };

  return (
    <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
      {/* 内容 */}
    </ScrollView>
  );
}
```

---

## 6. 最佳实践

### 6.1 Tab 数量控制

* **3-5 个最佳**：少于 3 个显得空旷，多于 5 个拥挤且难以记忆
* **优先级排序**：将最常用的 Tab 放在中间或左侧（阅读习惯）
* **"更多"模式**：超过 5 个时，最后一个是"更多"，点击进入二级菜单

### 6.2 图标设计规范

* **统一风格**：全用线性（outline）或全用填充（filled），不要混用
* **选中对比**：激活状态与未激活状态要有明显区分（颜色 + 图标形态）
* **避免文字图标**：不要只用文字作为 Tab 图标

### 6.3 性能优化

* **懒加载**：React Navigation Bottom Tabs 默认 `lazy: true`，仅在被首次聚焦时挂载该 Tab，有利于首屏与内存。若需预加载所有 Tab（例如保证切换无延迟），可在 `<Tabs>` 的 `screenOptions` 中设置 `lazy: false`。
* **避免重渲染**：Tab 内的列表数据使用状态管理，避免切换时重复请求
* **图片优化**：Tab 图标使用 PNG 或 SVG，控制尺寸

### 6.4 常见错误

* **错误：在 Tabs 内直接使用 Stack.Screen**

```tsx
// ❌ 错误
<Tabs>
  <Stack.Screen />  {/* Tabs 内不能直接用 Stack.Screen */}
</Tabs>

// ✅ 正确：通过文件结构嵌套
// app/(tabs)/tab-name/_layout.tsx 中使用 Stack
```

* **错误：Tab 名称与文件不匹配**

```tsx
// ❌ 错误：文件是 profile.tsx，但 name 写成了 user
<Tabs.Screen name="user" />

// ✅ 正确：name 必须与文件名一致
<Tabs.Screen name="profile" />
```

---

## 7. 关联知识

- [Expo Router Tabs 官方文档](https://docs.expo.dev/router/advanced/tabs/)
- [React Navigation Bottom Tabs](https://reactnavigation.org/docs/bottom-tab-navigator/)
- [005. Expo Router 路由与 Stack 导航](./005-expo-router-basics.md)
- [008. 客户端架构设计与 API 对接准备](./008-client-arch-and-api-setup.md)
