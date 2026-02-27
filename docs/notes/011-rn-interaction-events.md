# 011. React Native 交互事件体系

## 1. 核心问题与概念

### 解决什么问题

移动端交互与 Web 存在根本差异：没有鼠标 hover，触控面积受限，存在复杂的手势冲突（滑动 vs 点击），键盘会遮挡内容，且 iOS/Android 的原生行为不一致。React Native 需要一套事件系统来桥接 JS 层与原生触控引擎，同时处理这些平台差异。

### 核心概念与依赖

- **Responder System**：RN 内置的底层触控协商机制，决定"谁来处理这个触摸"。每个时刻只有一个组件可以成为 Responder。这是所有交互的基石。
- **Pressable**：RN 0.63+ 推出的统一按压组件，取代 `Touchable*` 系列，提供更精细的按压生命周期控制。
- **Keyboard API**：RN 提供的键盘监听与控制接口，用于处理软键盘弹出/收起对布局的影响。
- **react-native-gesture-handler**：Expo/RN 生态的标准手势库。它绕过 RN 的 JS 线程，直接在原生 UI 线程处理手势，性能远超内置的 `PanResponder`。
- **expo-haptics**：Expo 提供的触觉反馈 API，通过设备振动马达为交互提供物理反馈。

### 事件体系分层架构

```
┌───────────────────────────────────────────────────┐
│               应用业务层 (Your App)                │
│   Pressable · TextInput · ScrollView · FlatList   │
├───────────────────────────────────────────────────┤
│           高级手势层 (Gesture Handler)             │
│   Tap · Pan · Pinch · Rotation · Fling · LongPress│
├───────────────────────────────────────────────────┤
│         底层协商层 (Responder System)              │
│   onStartShouldSetResponder                       │
│   onMoveShouldSetResponder                        │
│   onResponderGrant / Release / Terminate          │
├───────────────────────────────────────────────────┤
│              原生触控引擎                          │
│       iOS: UIKit Touch System                     │
│       Android: MotionEvent System                 │
└───────────────────────────────────────────────────┘
```

日常开发中 95% 的交互都在最上层完成（Pressable / TextInput / ScrollView），只有复杂手势才需要下沉到 Gesture Handler 层。Responder System 极少需要直接使用。

---

## 2. 核心用法 / 方案设计

### 场景 A: 按钮与点击交互 (Pressable)

#### A1. Pressable 完整生命周期

Pressable 提供了 4 个按压阶段事件，按触发顺序：

```
手指按下 ──→ onPressIn ──→ (持续按住)
                              │
                  ├── 短按松开 ──→ onPress ──→ onPressOut
                  │
                  └── 长按触发 ──→ onLongPress ──→ (松开) ──→ onPressOut
```

```tsx
import { Pressable, Text } from "react-native";

<Pressable
  onPressIn={() => console.log("手指触碰")}
  onPress={() => console.log("短按完成")}
  onLongPress={() => console.log("长按触发")}
  onPressOut={() => console.log("手指离开")}
  delayLongPress={500} // 长按触发阈值，默认 500ms
>
  <Text>按钮</Text>
</Pressable>;
```

常见组合用途：

- `onPressIn` / `onPressOut`：驱动按压动画（缩放、变色）
- `onPress`：执行核心业务逻辑（导航、提交）
- `onLongPress`：触发上下文菜单、批量选择模式

#### A2. 视觉反馈：NativeWind active 状态

项目已集成 NativeWind v5，推荐使用 `active:` 前缀实现按压反馈，无需手动管理状态：

```tsx
// 颜色变化反馈
<Pressable className="rounded-2xl bg-indigo-600 py-4 active:bg-indigo-700">
  <Text className="text-base font-semibold text-white">登录</Text>
</Pressable>

// 透明度反馈
<Pressable className="rounded-xl bg-white p-4 active:opacity-70">
  <Text>列表项</Text>
</Pressable>

// 缩放反馈（需 reanimated 支持更流畅，此处为 NativeWind 方案）
<Pressable className="active:scale-95">
  <Text>缩放按钮</Text>
</Pressable>
```

#### A3. hitSlop：扩大触控热区

移动端 HIG (Human Interface Guidelines) 建议最小触控目标 44×44pt。当视觉元素小于此尺寸时，用 `hitSlop` 扩大可点击区域而不影响布局：

```tsx
// 一个 24×24 的小图标按钮，触控区域扩大到 44×44
<Pressable
  onPress={handleClose}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  // 或简写：hitSlop={10}  四边各扩 10
>
  <Ionicons name="close" size={24} />
</Pressable>
```

#### A4. android_ripple：Android 原生水波纹

Android 用户期望 Material Design 的水波纹反馈。Pressable 通过 `android_ripple` 直接调用原生 RippleDrawable：

```tsx
<Pressable
  className="rounded-2xl bg-indigo-600 py-4"
  android_ripple={{
    color: "rgba(255, 255, 255, 0.3)", // 水波纹颜色
    borderless: false, // 是否溢出边界
    foreground: true, // API 23+，水波纹在前景层
  }}
  onPress={handleSubmit}
>
  <Text className="text-center text-base font-semibold text-white">提交</Text>
</Pressable>
```

> `android_ripple` 仅在 Android 生效，iOS 自动忽略。可同时配合 `active:` 类让 iOS 也有反馈。

#### A5. disabled 状态与防重复点击

```tsx
const [submitting, setSubmitting] = useState(false);

<Pressable
  className={`rounded-2xl py-4 ${submitting ? "bg-gray-300" : "bg-indigo-600 active:bg-indigo-700"}`}
  onPress={handleSubmit}
  disabled={submitting}
>
  {submitting ? (
    <ActivityIndicator size="small" color="white" />
  ) : (
    <Text className="text-center text-base font-semibold text-white">提交</Text>
  )}
</Pressable>;
```

对于非 mutation 场景（如导航），可以用 debounce 防止快速连点：

```tsx
import { useRef } from "react";

function useDebouncedPress(handler: () => void, delay = 300) {
  const lastPress = useRef(0);

  return () => {
    const now = Date.now();
    if (now - lastPress.current < delay) return;
    lastPress.current = now;
    handler();
  };
}

// 使用
const handleNav = useDebouncedPress(() => router.push("/detail"));
<Pressable onPress={handleNav}>...</Pressable>;
```

#### A6. Pressable vs 旧版 Touchable 系列

| 组件                       | 状态         | 说明                                          |
| -------------------------- | ------------ | --------------------------------------------- |
| `Pressable`                | **推荐**     | 统一 API，精细生命周期，支持 `android_ripple` |
| `TouchableOpacity`         | 可用但不推荐 | 按压时降低透明度，API 较粗糙                  |
| `TouchableHighlight`       | 可用但不推荐 | 按压时显示底色，必须有且只有一个子元素        |
| `TouchableWithoutFeedback` | 避免使用     | 无视觉反馈，违反无障碍原则                    |
| `TouchableNativeFeedback`  | 避免使用     | 仅 Android，已被 `android_ripple` 取代        |

**迁移原则**：新代码一律使用 `Pressable`，旧代码遇到再迁移。

---

### 场景 B: 表单输入交互 (TextInput)

#### B1. TextInput 核心事件

```tsx
import { TextInput, View, Text } from "react-native";
import { useRef, useState } from "react";

function FormExample() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  return (
    <View>
      <TextInput
        ref={inputRef}
        className={`rounded-xl border px-4 py-3 text-[16px] ${
          focused ? "border-indigo-500" : "border-gray-200"
        }`}
        value={value}
        // 文本变化 —— 最常用，参数直接是 string
        onChangeText={(text) => setValue(text)}
        // 聚焦/失焦 —— 驱动边框高亮、标签动画
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // 提交 —— 用户按下键盘的"完成/换行/搜索"键
        onSubmitEditing={() => console.log("提交:", value)}
        // 键盘右下角按钮的文字/类型
        returnKeyType="done"
        placeholder="请输入内容"
        placeholderTextColor="#D1D5DB"
      />
    </View>
  );
}
```

#### B2. 多输入框焦点跳转

表单中常见"填完一项自动跳到下一项"的体验：

```tsx
function LoginForm() {
  const codeRef = useRef<TextInput>(null);

  return (
    <View className="gap-4">
      <TextInput
        className="rounded-xl border border-gray-200 px-4 py-3 text-[16px]"
        placeholder="手机号"
        keyboardType="phone-pad"
        maxLength={11}
        // 填完手机号按"下一步"，焦点跳到验证码
        returnKeyType="next"
        onSubmitEditing={() => codeRef.current?.focus()}
        blurOnSubmit={false} // 阻止键盘收起
      />
      <TextInput
        ref={codeRef}
        className="rounded-xl border border-gray-200 px-4 py-3 text-[16px]"
        placeholder="验证码"
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />
    </View>
  );
}
```

#### B3. onChangeText vs onChange

```tsx
// onChangeText: 直接拿到 string，99% 的场景用这个
<TextInput onChangeText={(text: string) => setValue(text)} />

// onChange: 拿到原生事件对象，仅在需要 nativeEvent 元数据时使用
<TextInput
  onChange={(e) => {
    const text = e.nativeEvent.text;
    const eventCount = e.nativeEvent.eventCount; // Android 用于同步
  }}
/>
```

#### B4. 其他实用事件

```tsx
<TextInput
  // 选区变化 —— 实现富文本编辑器时的光标追踪
  onSelectionChange={(e) => {
    const { start, end } = e.nativeEvent.selection;
  }}
  // 内容尺寸变化 —— 自动增高的 TextInput
  multiline
  onContentSizeChange={(e) => {
    const { height } = e.nativeEvent.contentSize;
    setInputHeight(Math.min(height, 120)); // 限制最大高度
  }}
  // 按键事件 —— 检测退格键（如验证码输入框的自动退位）
  onKeyPress={(e) => {
    if (e.nativeEvent.key === "Backspace") {
      // 当前格为空时跳到前一个输入框
    }
  }}
/>
```

#### B5. keyboardType 对照

| keyboardType    | 用途          | 示例         |
| :-------------- | :------------ | :----------- |
| `default`       | 通用文本      | 用户名、备注 |
| `email-address` | 邮箱（含 @.） | 邮箱输入     |
| `numeric`       | 纯数字        | 金额         |
| `phone-pad`     | 电话键盘      | 手机号       |
| `number-pad`    | 数字面板      | 验证码       |
| `decimal-pad`   | 数字+小数点   | 价格         |
| `url`           | URL（含 /.:） | 网址输入     |

---

### 场景 C: 键盘交互管理

键盘管理是移动端表单开发的核心难题。键盘弹出会遮挡输入框，且 iOS/Android 行为差异巨大。

#### C1. Keyboard API：监听与控制

```tsx
import { Keyboard, Platform } from "react-native";
import { useEffect } from "react";

function useKeyboardStatus() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // iOS 用 Will 事件（动画开始前触发），Android 用 Did 事件
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { keyboardVisible, keyboardHeight };
}
```

#### C2. 收起键盘的三种方式

```tsx
import { Keyboard, TouchableWithoutFeedback, ScrollView } from "react-native";

// 方式 1：程序式调用（最常用）
Keyboard.dismiss();

// 方式 2：点击空白区域收起
// 注意：TouchableWithoutFeedback 此处是合理的，因为不需要视觉反馈
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <View className="flex-1">
    {/* 表单内容 */}
  </View>
</TouchableWithoutFeedback>

// 方式 3：ScrollView 的 keyboardDismissMode
<ScrollView
  keyboardDismissMode="on-drag"     // 滑动时收起
  // keyboardDismissMode="interactive" // iOS 独占：跟随手指下滑收起
>
  {/* 表单内容 */}
</ScrollView>
```

#### C3. KeyboardAvoidingView：防遮挡

```tsx
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function FormScreen() {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, paddingTop: insets.top }}
      // iOS 用 padding 模式上推内容，Android 系统自带 adjustResize 通常够用
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      // 微调偏移量（导航栏高度等）
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        // 键盘弹出时点击按钮仍可响应，而非先收起键盘
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* 表单内容 */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

**`behavior` 三种模式对比**：

| 模式       | 行为                        | 推荐场景         |
| :--------- | :-------------------------- | :--------------- |
| `padding`  | 底部加 padding 推高内容     | iOS 表单         |
| `height`   | 缩小组件高度                | 固定高度的模态框 |
| `position` | 整体上移（类似 translateY） | 简单布局         |

#### C4. keyboardShouldPersistTaps 详解

这个属性控制键盘弹出时，点击 ScrollView 内其他区域的行为：

| 值             | 行为                                                    | 场景                   |
| :------------- | :------------------------------------------------------ | :--------------------- |
| `never` (默认) | 点击非输入区域先收起键盘，不触发点击                    | 纯展示页面             |
| `handled`      | **如果点击的是按钮/Pressable 则响应点击，否则收起键盘** | **表单页面（推荐）**   |
| `always`       | 键盘永不自动收起                                        | 搜索页（保持键盘常驻） |

---

### 场景 D: 滚动与列表交互

#### D1. ScrollView 核心事件

```tsx
import {
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";

<ScrollView
  // 滚动进行中（高频触发，注意性能）
  onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const scrollY = contentOffset.y;
    const isBottom =
      layoutMeasurement.height + scrollY >= contentSize.height - 20;
  }}
  // 控制 onScroll 触发频率（每滚动 16 逻辑像素触发一次）
  scrollEventThrottle={16}
  // 手指开始拖拽
  onScrollBeginDrag={() => console.log("开始拖拽")}
  // 手指离开后的惯性滚动开始
  onMomentumScrollBegin={() => console.log("惯性开始")}
  // 滚动完全停止（含惯性）
  onMomentumScrollEnd={() => console.log("滚动停止")}
/>;
```

> **scrollEventThrottle**：iOS 默认不触发 onScroll。设为 16（≈60fps）才能持续收到事件。Android 则始终触发。

#### D2. FlatList 交互事件

```tsx
import { FlatList, RefreshControl } from "react-native";

<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  // 下拉刷新
  refreshControl={
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      colors={["#4f46e5"]} // Android 加载指示器颜色
      tintColor="#4f46e5" // iOS 加载指示器颜色
    />
  }
  // 触底加载更多
  onEndReached={handleLoadMore}
  onEndReachedThreshold={0.5} // 距底部 50% 时触发
  // 可见项变化（曝光埋点）
  onViewableItemsChanged={({ viewableItems }) => {
    viewableItems.forEach((item) => trackExposure(item.key));
  }}
  viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}

  // 滚动到顶部
  // listRef.current?.scrollToOffset({ offset: 0, animated: true })
/>;
```

#### D3. 下拉刷新完整示例

```tsx
import { useState, useCallback } from "react";
import { FlatList, RefreshControl } from "react-native";

function FeedScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchLatestData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#4f46e5"
          colors={["#4f46e5"]}
        />
      }
    />
  );
}
```

---

### 场景 E: 手势交互 (react-native-gesture-handler)

项目已安装 `react-native-gesture-handler`。当内置的 Pressable 无法满足需求时（如滑动删除、双指缩放、拖拽排序），使用此库。

#### E1. 基础架构

```tsx
// app/_layout.tsx 中需要包裹 GestureHandlerRootView
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 其余布局 */}
    </GestureHandlerRootView>
  );
}
```

> ⚠️ Expo Router 在 Web 端可能自动提供 `GestureHandlerRootView`，但 **iOS/Android 原生端不会自动包裹**。必须在 `app/_layout.tsx` 中手动添加，否则所有 `GestureDetector` 和依赖手势的第三方库（如 `@gorhom/bottom-sheet`）会在原生端报错。详见 [015. 导航进阶](015-advanced-navigation.md) 中的 GestureHandlerRootView 原理说明。

#### E2. 手势类型一览

| 手势 | 类                    | 典型用途           |
| :--- | :-------------------- | :----------------- |
| 点击 | `Gesture.Tap()`       | 单击/双击          |
| 长按 | `Gesture.LongPress()` | 上下文菜单         |
| 拖拽 | `Gesture.Pan()`       | 滑动删除、拖拽排序 |
| 捏合 | `Gesture.Pinch()`     | 图片缩放           |
| 旋转 | `Gesture.Rotation()`  | 图片旋转           |
| 快划 | `Gesture.Fling()`     | 快速切换页面       |

#### E3. 实用示例：双击点赞

```tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function DoubleTapLike() {
  const scale = useSharedValue(0);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 300 }),
      );
      // 调用点赞 API（需 runOnJS）
    });

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <GestureDetector gesture={doubleTap}>
      <Animated.View className="relative">
        {/* 图片内容 */}
        <Animated.View
          style={[heartStyle, { position: "absolute", alignSelf: "center" }]}
        >
          <Ionicons name="heart" size={80} color="red" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
```

#### E4. 手势组合

当多个手势作用于同一区域时，需要声明它们的关系：

```tsx
const pan = Gesture.Pan().onUpdate((e) => {
  translateX.value = e.translationX;
});

const pinch = Gesture.Pinch().onUpdate((e) => {
  scale.value = e.scale;
});

// 同时识别：拖拽和缩放可同时进行
const composed = Gesture.Simultaneous(pan, pinch);

// 互斥：只识别其中一个
const exclusive = Gesture.Exclusive(longPress, tap);

// 竞争：第一个满足条件的胜出
const race = Gesture.Race(pan, fling);

<GestureDetector gesture={composed}>
  <Animated.View>{/* 内容 */}</Animated.View>
</GestureDetector>;
```

---

### 场景 F: 触觉反馈 (expo-haptics)

项目已安装 `expo-haptics`。触觉反馈让用户在关键操作（切换、删除、成功/失败）时获得物理确认感。

```tsx
import * as Haptics from "expo-haptics";

// 轻触反馈 —— 切换开关、选中选项
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// 中等反馈 —— 滑动到位、吸附
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// 重度反馈 —— 拖拽放置
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// 通知反馈 —— 操作结果
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // 成功
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // 警告
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); // 失败

// 选择反馈 —— 滚动选择器的档位感
Haptics.selectionAsync();
```

实际应用：

```tsx
<Pressable
  onPress={() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite();
  }}
  className="active:scale-95"
>
  <Ionicons name={isFav ? "heart" : "heart-outline"} size={24} />
</Pressable>
```

> 触觉反馈仅在真机有效，模拟器无感。且 Android 的振动马达品质参差不齐，应保守使用。

---

## 3. 深度原理与机制 (Under the Hood)

### 3.1 Responder System 工作流

RN 的 Responder System 是一个基于"协商"的触控分发机制。当用户触摸屏幕时，系统需要决定哪个组件"接管"这次触摸：

```
触摸开始
  │
  ▼
遍历组件树（从叶到根）
  │
  ├── onStartShouldSetResponder? ──→ return true ──→ 成为候选
  │
  ▼
父组件是否抢夺？
  │
  ├── onStartShouldSetResponderCapture? ──→ return true ──→ 父组件截获
  │
  ▼
onResponderGrant（获得 Responder 权）
  │
  ├── 触摸移动 ──→ onResponderMove
  │
  ├── 其他组件想抢 ──→ onResponderTerminationRequest
  │     ├── return true ──→ 让出 ──→ onResponderTerminate
  │     └── return false ──→ 拒绝让出
  │
  └── 触摸结束 ──→ onResponderRelease
```

**为什么日常开发不直接用它**：Pressable、ScrollView 等组件已经封装了 Responder 逻辑。直接使用 Responder API 意味着你要自己处理所有的触摸状态机，包括与 ScrollView 的冲突协商。

### 3.2 Gesture Handler 的原生线程优势

RN 内置的事件系统在 JS 线程处理触摸，存在帧延迟：

```
原生触摸 → Bridge/JSI → JS 线程处理 → Bridge/JSI → 原生更新 UI
         ↑                                        ↑
         约 1 帧延迟                               约 1 帧延迟
```

react-native-gesture-handler 直接在原生 UI 线程识别手势，配合 react-native-reanimated 的 worklet 在 UI 线程更新动画：

```
原生触摸 → 原生手势识别器 → UI 线程 worklet → 原生更新 UI
                     ↑
                     零帧延迟，60/120fps
```

这就是为什么滑动删除、图片缩放等高频交互必须用 Gesture Handler + Reanimated 组合。

### 3.3 键盘事件的平台差异

| 特性       | iOS                                      | Android                                       |
| :--------- | :--------------------------------------- | :-------------------------------------------- |
| 事件时机   | `keyboardWillShow/Hide`（动画前）        | `keyboardDidShow/Hide`（动画后）              |
| 默认避让   | 无（需手动处理）                         | `windowSoftInputMode="adjustResize"` 自动调整 |
| 键盘高度   | 包含 SafeArea 底部                       | 不包含导航栏                                  |
| 交互式收起 | `keyboardDismissMode="interactive"` 跟手 | 不支持                                        |
| 键盘类型   | 系统级统一                               | 各厂商定制，外观差异大                        |

---

## 4. 最佳实践与坑 (Best Practices & Pitfalls)

### ✅ 推荐做法

1. **一律使用 Pressable**，弃用 `Touchable*` 系列
2. **触控目标 ≥ 44pt**，不够就用 `hitSlop` 补
3. **所有可点击元素必须有视觉反馈**（NativeWind `active:` / `android_ripple`）
4. **表单页 ScrollView 设置 `keyboardShouldPersistTaps="handled"`**
5. **多输入框实现焦点跳转**（`returnKeyType` + `onSubmitEditing` + `ref.focus()`）
6. **TextInput 使用 `text-[16px]` 而非 `text-base`**，避免 iOS lineHeight 渲染 bug
7. **高频手势（拖拽/缩放）用 Gesture Handler + Reanimated**，不要用 PanResponder
8. **关键操作添加触觉反馈**（expo-haptics），增强操作确认感
9. **防重复提交**：mutation 类操作用 `disabled` + loading 状态，导航类操作用 debounce
10. **键盘监听事件按平台选择**：iOS 用 `Will`，Android 用 `Did`

### ❌ 避免做法

1. **不要在 Pressable 上混用 `style` 和 `className`**（NativeWind v5 原生端 style 覆盖 className）
2. **不要用 `TouchableWithoutFeedback` 做按钮**（无视觉反馈，无障碍不友好）
3. **不要忘记 `scrollEventThrottle={16}`**（iOS 上不设置则 onScroll 几乎不触发）
4. **不要在 onScroll 回调中做重计算**（高频触发，会卡 JS 线程；用 Reanimated 的 `useAnimatedScrollHandler` 替代）
5. **不要在 Android 上依赖 `keyboardWillShow`**（Android 不支持 Will 事件）
6. **不要直接使用 PanResponder**（API 复杂且在 JS 线程，用 Gesture Handler 替代）
7. **不要在 TextInput 上使用预设文字尺寸类**（如 `text-base`），会引入 `lineHeight` 导致 iOS 渲染异常
8. **不要假设所有设备都支持触觉反馈**（低端 Android 可能无振动马达，expo-haptics 会静默失败）

---

## 5. 行动导向 (Action Guide)

### Step 1: 创建可复用的 PressableButton 组件

**这一步在干什么**：封装一个统一的按钮组件，内置视觉反馈、disabled 状态、loading 状态和触觉反馈，避免每个页面重复编写 Pressable 配置。

```tsx
// src/components/ui/PressableButton.tsx
import {
  ActivityIndicator,
  Pressable,
  Text,
  PressableProps,
} from "react-native";
import * as Haptics from "expo-haptics";

interface PressableButtonProps extends PressableProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  haptic?: boolean;
}

const variantStyles = {
  primary: "bg-indigo-600 active:bg-indigo-700",
  secondary: "bg-gray-100 active:bg-gray-200",
  danger: "bg-red-500 active:bg-red-600",
} as const;

const textStyles = {
  primary: "text-white",
  secondary: "text-gray-900",
  danger: "text-white",
} as const;

export function PressableButton({
  title,
  loading = false,
  variant = "primary",
  haptic = true,
  onPress,
  disabled,
  ...rest
}: PressableButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = (e: any) => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  return (
    <Pressable
      className={`items-center rounded-2xl py-4 ${
        isDisabled ? "bg-gray-300" : variantStyles[variant]
      }`}
      android_ripple={
        isDisabled
          ? undefined
          : { color: "rgba(255,255,255,0.3)", foreground: true }
      }
      onPress={handlePress}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text
          className={`text-base font-semibold ${isDisabled ? "text-gray-500" : textStyles[variant]}`}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
```

### Step 2: 创建键盘感知表单容器

**这一步在干什么**：封装 `KeyboardAvoidingView` + `ScrollView` 的组合模式，统一处理平台差异、键盘收起、SafeArea 等问题，所有表单页面直接使用。

```tsx
// src/components/ui/KeyboardAwareContainer.tsx
import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface KeyboardAwareContainerProps {
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
}

export function KeyboardAwareContainer({
  children,
  contentContainerStyle,
}: KeyboardAwareContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

### Step 3: 实现防重复点击 Hook

**这一步在干什么**：提供一个通用的 debounce hook，防止用户快速连点导航类按钮触发多次路由跳转。

```tsx
// src/hooks/useDebouncedPress.ts
import { useRef, useCallback } from "react";

/**
 * @param handler 按压回调
 * @param delay 防抖间隔（ms），默认 300
 */
export function useDebouncedPress(handler: () => void, delay = 300) {
  const lastPress = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastPress.current < delay) return;
    lastPress.current = now;
    handler();
  }, [handler, delay]);
}
```

### Step 4: 实现键盘状态 Hook

**这一步在干什么**：封装跨平台的键盘监听逻辑，提供键盘可见性和高度信息，供需要根据键盘状态调整 UI 的页面使用。

```tsx
// src/hooks/useKeyboardStatus.ts
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardStatus() {
  const [visible, setVisible] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setVisible(true);
      setHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setVisible(false);
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { keyboardVisible: visible, keyboardHeight: height };
}
```
