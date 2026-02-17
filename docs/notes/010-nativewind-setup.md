# 010. NativeWind 样式引擎集成与最佳实践

## 1. 核心问题与概念

### 解决什么问题

React Native 内置的 `StyleSheet.create()` 虽然性能好，但在实际开发中存在严重的工程化缺陷：

- **Design Token 缺失**：颜色、间距、字体等硬编码散落在各个组件中（如 `#6366F1`, `#f5f5f5`），无法统一管理和替换。
- **样式与布局割裂**：样式定义在文件底部，阅读时需要在 JSX 和 StyleSheet 之间频繁跳转。
- **响应式能力为零**：内置 StyleSheet 不支持媒体查询、暗色模式等现代 UI 需求。
- **跨平台一致性差**：iOS 和 Android 的默认样式存在差异，需要大量 `Platform.select()` 手动处理。

NativeWind 通过将 Tailwind CSS 的 utility-first 工作流引入 React Native，在**编译时**将 Tailwind class 转换为优化后的 StyleSheet，同时提供完整的 Design Token 系统、暗色模式、响应式支持等现代能力。

### 核心概念与依赖

| 包名 | 角色 | 说明 |
|---|---|---|
| `nativewind` | **核心引擎** | Metro 插件 + import 重写系统，让 RN 组件支持 `className` 属性 |
| `react-native-css` | **CSS 运行时** | NativeWind 的底层依赖，处理 CSS 到 RN StyleSheet 的映射 |
| `tailwindcss` | **CSS 框架** | 提供 utility class 定义和 Design Token 系统（v4.1+） |
| `@tailwindcss/postcss` | **构建工具** | PostCSS 插件，编译时处理 Tailwind CSS |
| `postcss` | **CSS 处理器** | PostCSS 运行时，`@tailwindcss/postcss` 的基础依赖 |

**层级关系**：
```
你的代码 (className="bg-blue-500")
    ↓ import 重写
nativewind/metro (Metro 插件层)
    ↓ CSS 编译
@tailwindcss/postcss + tailwindcss (构建时编译)
    ↓ 运行时映射
react-native-css (className → StyleSheet)
    ↓
React Native StyleSheet (原生渲染)
```

### 为什么选择 NativeWind 而不是其他方案

**方案对比**：

| 方案 | 优势 | 劣势 | 适合场景 |
|---|---|---|---|
| **NativeWind** | Expo 官方推荐；Tailwind 生态复用；社区最大 | preview 阶段 | 绝大多数 Expo 项目 |
| **Tamagui** | 编译优化最强；自带组件库 | 学习曲线陡；配置复杂 | 对性能有极致要求的大型应用 |
| **Unistyles** | 原生 StyleSheet 增强；零学习成本 | 无 utility-first 体验 | 不想改变 StyleSheet 写法的团队 |
| **Gluestack UI** | 企业级组件库；基于 NativeWind | 组件库锁定 | 需要大量预制组件的企业项目 |

**选择 NativeWind 的决定性因素**：
1. **Expo 官方推荐**：Expo 文档明确推荐 NativeWind 作为跨平台样式方案
2. **Tailwind CSS 生态统一**：Web 端已有庞大的 Tailwind 生态，RN 端直接复用知识和 Token
3. **社区规模最大**：教程、插件、组件库（NativeWindUI, Gluestack, React Native Reusables）最多
4. **渐进式集成**：可以和现有 `StyleSheet.create()` 共存，逐步迁移

### 版本选型说明

本项目使用 **NativeWind v5 (preview)**，而非 v4。原因：

- **v5 是 Expo SDK 54 + RN 0.81 的官方推荐版本**
- v4 在 Expo SDK 54 上存在已知兼容性问题（Reanimated v4 peer dependency 冲突）
- v5 移除了 Babel 插件依赖，采用更轻量的 import 重写机制
- v5 基于 Tailwind CSS v4.1+（CSS-first 配置），而 v4 基于 Tailwind v3（JS 配置）

> 尽管标记为 preview，v5 已被大量生产应用采用（如 Wave, Folo, Swipey 等）。

## 2. 核心用法 / 方案设计 (Usage / Design)

### 场景 A: 基础布局与文本样式

```tsx
import { Text, View } from "react-native";

export default function WelcomeScreen() {
  return (
    // flex-1: 占满容器; items-center/justify-center: 水平垂直居中; bg-slate-50: 浅灰背景
    <View className="flex-1 items-center justify-center bg-slate-50 px-6">
      <Text className="text-3xl font-bold text-gray-900">
        欢迎回来
      </Text>
      <Text className="mt-2 text-base text-gray-500">
        请登录以继续
      </Text>
    </View>
  );
}
```

### 场景 B: 表单输入组件

```tsx
import { TextInput, View, Text, Pressable } from "react-native";

export default function LoginForm() {
  return (
    <View className="w-full max-w-sm gap-4">
      {/* 输入框：圆角 + 边框 + 内边距 + focus 状态 */}
      <TextInput
        className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-900 placeholder:text-gray-400"
        placeholder="手机号"
        keyboardType="phone-pad"
      />

      {/* 按钮：渐变色背景可用 bg-indigo-600 模拟，圆角 + 居中文本 */}
      <Pressable className="items-center rounded-xl bg-indigo-600 py-3.5 active:bg-indigo-700">
        <Text className="text-base font-semibold text-white">
          登录
        </Text>
      </Pressable>
    </View>
  );
}
```

### 场景 C: 暗色模式支持

```tsx
// dark: 前缀可自动适配系统暗色模式
<View className="flex-1 bg-white dark:bg-gray-950">
  <Text className="text-gray-900 dark:text-gray-100">
    自动适配暗色模式
  </Text>
</View>
```

### 场景 D: 平台条件样式

```tsx
// ios:/android: 前缀可针对平台设置不同样式
<View className="pt-12 ios:pt-16 android:pt-8">
  <Text className="font-semibold ios:font-medium">
    平台差异化样式
  </Text>
</View>
```

### 场景 E: 与现有 StyleSheet 混合使用

```tsx
import { View, Text, StyleSheet } from "react-native";

export default function MixedExample() {
  return (
    // className 和 style 可以共存，style 的优先级更高
    <View className="flex-1 bg-white" style={styles.shadow}>
      <Text className="text-lg font-bold">混合写法</Text>
    </View>
  );
}

// 一些复杂样式（如 shadow）保留 StyleSheet 写法
const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
```

## 3. 深度原理与机制 (Under the Hood)

### NativeWind v5 的工作流程

```
[ 编译时 ]
  global.css → @tailwindcss/postcss → 生成 CSS 规则
                                          ↓
  metro.config.js (withNativewind) → 拦截 CSS 文件 → 将 CSS 规则注入 JS bundle

[ 运行时 ]
  import 重写：import { View } from 'react-native'
          → import { View } from 'react-native-css/react-native'

  react-native-css 的 View 包装器：
    1. 读取 className 属性
    2. 从注入的 CSS 规则中查找匹配的 utility class
    3. 将 CSS 属性映射为 React Native StyleSheet 对象
    4. 通过 style 属性传递给原生 View
```

### v5 vs v4 的关键架构差异

| 机制 | v4 | v5 |
|---|---|---|
| **CSS 处理** | Tailwind v3 (JS 配置) | Tailwind v4.1+ (CSS-first 配置) |
| **组件拦截** | JSX Transform (Babel 插件) | Import Rewrite (Metro 插件) |
| **配置入口** | `tailwind.config.js` | `global.css` (CSS 原生 @theme) |
| **Babel 依赖** | 需要修改 `babel.config.js` | 无需 Babel 配置 |
| **CSS 运行时** | `react-native-css-interop` (内置) | `react-native-css` (独立 peer 依赖) |

### Design Token 自定义

NativeWind v5 使用 Tailwind CSS v4 的 CSS-first 配置方式，在 `global.css` 中通过 `@theme` 指令自定义 Design Token：

```css
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";

@import "nativewind/theme";

/* 自定义 Design Token */
@theme {
  --color-primary: #6366F1;
  --color-primary-dark: #4F46E5;
  --color-background: #F9FAFB;
  --color-surface: #FFFFFF;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;

  --font-size-heading: 1.5rem;
  --font-size-body: 1rem;

  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

使用自定义 Token：
```tsx
<View className="bg-background rounded-xl">
  <Text className="text-primary text-heading font-bold">
    使用自定义 Design Token
  </Text>
</View>
```

## 4. 最佳实践与坑 (Best Practices & Pitfalls)

### ✅ 推荐做法

1. **CSS import 必须在根布局文件的最顶部**
   ```tsx
   // app/_layout.tsx — 第一行
   import "../global.css";
   ```
   CSS 文件必须在应用最顶层组件中导入，且不能放在 `AppRegistry.registerComponent` 所在的文件中，否则 Fast Refresh 会失效。

2. **优先使用 `className`，复杂样式降级到 `style`**
   - 常规布局、颜色、字体 → `className`
   - 复杂阴影、transform 动画 → `StyleSheet.create()`
   - 两者可以在同一组件上共存

3. **使用 `@theme` 统一管理 Design Token**
   - 所有颜色、间距、字体大小等集中在 `global.css` 的 `@theme` 中定义
   - 组件中只使用 Token 名称（如 `bg-primary`），不直接写色值

4. **首次启动务必清除缓存**
   ```bash
   npx expo start --clear
   ```

5. **安装 Tailwind CSS IntelliSense 编辑器插件**
   - VS Code / Cursor 中安装 `Tailwind CSS IntelliSense` 插件
   - 提供 class 名自动补全、悬停预览、错误提示

### ❌ 避免做法

1. **不要修改 Babel 配置**
   NativeWind v5 不再需要 Babel 插件。如果你从 v4 迁移，确保移除 `nativewind/babel` 和 `jsxImportSource: "nativewind"`。

2. **不要删除 `lightningcss` 版本锁定**
   `package.json` 中的 `overrides.lightningcss` 用于防止反序列化错误，这是已知问题的临时修复。

3. **不要把 `nativewind-env.d.ts` 命名为 `nativewind.d.ts`**
   TypeScript 编译器不会正确识别与 `node_modules` 中同名的类型声明文件。

4. **不要在 `className` 中使用动态字符串拼接**
   ```tsx
   // ❌ 错误：Tailwind 无法在编译时解析动态值
   <View className={`bg-${color}-500`} />
   
   // ✅ 正确：使用完整的 class 名 + 条件判断
   <View className={isActive ? "bg-blue-500" : "bg-gray-300"} />
   ```

5. **不要忽略 `overrides` 中的 `lightningcss` 版本**
   未锁定版本会导致构建时 CSS 反序列化报错。

## 5. 行动导向 (Action Guide)

### Step 1: 安装依赖

**这一步在干什么**：安装 NativeWind 核心引擎及其 peer 依赖（react-native-css），以及 Tailwind CSS v4 的构建工具链（tailwindcss + PostCSS 插件）。

```bash
# 安装 NativeWind 核心 + CSS 运行时
npx expo install nativewind@preview react-native-css

# 安装 Tailwind CSS v4 构建工具（dev 依赖）
npx expo install --dev tailwindcss @tailwindcss/postcss postcss
```

> `react-native-reanimated` 和 `react-native-safe-area-context` 已在项目中存在，无需重复安装。

### Step 2: 创建 PostCSS 配置

**这一步在干什么**：告诉 PostCSS 使用 `@tailwindcss/postcss` 插件来编译 Tailwind CSS。NativeWind v5 基于 Tailwind CSS v4，后者使用 PostCSS 作为编译入口（而非 v3 时代的 JS 配置文件）。

```javascript
// postcss.config.mjs（项目根目录）
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### Step 3: 创建全局 CSS 文件

**这一步在干什么**：定义 Tailwind CSS 的入口文件。通过 `@import` 指令引入 Tailwind 的主题层、基础重置层和工具类层，再引入 NativeWind 的 RN 主题适配层。此文件也是未来定义自定义 Design Token 的地方。

```css
/* global.css（项目根目录） */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";

@import "nativewind/theme";
```

### Step 4: 配置 Metro 打包器

**这一步在干什么**：用 NativeWind 提供的 `withNativewind` 函数包装 Metro 默认配置，使 Metro 能识别和处理 `.css` 文件，并将编译后的 CSS 规则注入到 JS bundle 中。

```javascript
// metro.config.js（项目根目录）
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config);
```

### Step 5: 在根布局导入 CSS

**这一步在干什么**：在应用最顶层组件中导入 `global.css`，确保 CSS 规则在所有组件渲染前就已注入。导入语句必须在文件最顶部，早于其他任何 import。

```tsx
// app/_layout.tsx — 第一行
import "../global.css";

// ... 其余 import 和组件代码保持不变
```

### Step 6: 锁定 lightningcss 版本

**这一步在干什么**：在 `package.json` 中通过 `overrides` 锁定 `lightningcss` 到 `1.30.1`。未锁定版本时，不同版本的 lightningcss 之间存在序列化格式不兼容问题，会导致 CSS 编译报错。

```json
{
  "overrides": {
    "lightningcss": "1.30.1"
  }
}
```

然后运行 `npm install` 使 override 生效。

### Step 7: TypeScript 类型声明

**这一步在干什么**：创建类型声明文件，让 TypeScript 识别 `react-native-css` 对 React Native 组件的类型扩展（如 `className` 属性）。NativeWind 通过 declaration merging 扩展了 `View`、`Text` 等组件的 props 类型。

```typescript
// nativewind-env.d.ts（项目根目录）
/// <reference types="react-native-css/types" />
```

> 文件名不能是 `nativewind.d.ts`（与 node_modules 冲突）或与项目目录同名（如 `app.d.ts`）。

### Step 8: 清除缓存并启动

**这一步在干什么**：Metro 会缓存之前的编译结果。添加 NativeWind 后必须清除缓存，让 Metro 重新识别新的插件配置和 CSS 文件。

```bash
npx expo start --clear
```

## 6. 未来扩展路线

### 第二步：建立项目 Design Token 体系

在 `global.css` 中通过 `@theme` 定义统一的设计变量（颜色、间距、圆角、字体），替代所有硬编码值。

### 第三步：评估组件库引入

当基础组件（Button, Input, Modal 等）开始重复造轮子时，评估引入以下之一：
- **NativeWindUI**：NativeWind 官方 UI 组件库，追求原生外观
- **Gluestack UI v2**：企业级 headless 组件库，基于 NativeWind，类似 Web 端的 shadcn/ui
- **React Native Reusables**：copy-paste 组件库，完全可定制

### 企业级最终架构目标

```
Design Token (global.css @theme)
    ↓
NativeWind (样式引擎)
    ↓
组件库 (NativeWindUI / Gluestack / 自建)
    ↓
业务页面
```
