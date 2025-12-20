# 005. Expo Router 路由与基础组件

## 1. 核心概念 (Concept)

### 1.1 文件即路由 (File-based Routing)

在 Expo Router 中，**文件系统的结构直接定义了应用的 URL 结构**。不需要像传统 React Navigation 那样在一个中心化的配置文件中声明所有路由。

* **页面**: `app/` 目录下的 `.tsx` 文件自动成为一个页面。例如 `app/login.tsx` 对应路由 `/login`。
* **布局 (`_layout.tsx`)**: 这是一个特殊文件，用于在多个页面之间共享 UI（如导航栏、底部 Tab）。它充当“包装器”，将被包裹的页面内容渲染在 `<Slot />` 或导航器（如 `<Stack>`, `<Tabs>`）中。

### 1.2 路由分组 (Group Syntax)

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

// 最佳实践：使用 StyleSheet.create 定义样式
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

### 2.3 使用图标库

Expo 预装了 `@expo/vector-icons`，包含主流图标集（Ionicons, FontAwesome, MaterialIcons 等）。

```tsx
import { Ionicons } from "@expo/vector-icons";

// 使用方式
<Ionicons name="home" size={24} color="black" />
```

---

## 3. 最佳实践 (Best Practices)

### 3.1 样式分离 (StyleSheet vs Inline)

* **✅ 推荐**: 使用 `StyleSheet.create`。
  * **性能**: 样式对象会被“注册”并生成 ID，通过 Bridge 传输更高效。
  * **校验**: 它可以验证样式属性的拼写错误。
  * **维护**: 将样式与业务逻辑分离，代码更清晰。
* **❌ 避免**: 大量使用内联样式 `style={{ width: 100, ... }}`，除非是动态计算的值。

### 3.2 布局层级管理

* **✅ 推荐**: 保持 `_layout.tsx` 纯净。只负责导航结构的定义，不要在其中编写复杂的业务逻辑或从服务器获取数据。
* **✅ 推荐**: 合理使用 `Stack` 和 `Tabs` 的组合。通常 App 的根是 `Stack`（用于处理模态框、全屏页面），内部包含一个 `Tabs`（作为主界面）。

### 3.3 图标管理

* **✅ 推荐**: 统一使用一种图标风格（如全是 Outline 或全是 Filled）。
* **✅ 推荐**: 可以在 `constants/Colors.ts` 中统一定义 `tabBarActiveTintColor` 等颜色变量，而不是硬编码颜色值。

## 4. 关联知识

- [Expo Router 官方文档](https://docs.expo.dev/router/introduction/)
- [React Native 核心组件](https://reactnative.dev/docs/components-and-apis)
- [Ionicons 图标目录](https://icons.expo.fyi/Index)
