# React Native + Expo 生产级项目引导清单

> **本文件不是给当前项目使用的。**
> 它是一份 AI 可读的"项目引导清单"，供新项目的 AI 助手读取，从源项目（本项目）中提取、适配可复用的生产级代码。

## 使用方法

在新项目中告诉 助手：

```
读取 <本项目绝对路径>/BOOTSTRAP_MANIFEST.md，
按照清单从源项目中迁移我需要的模块到当前项目。
```

### 工作流程

1. `npx create-expo-app@latest <项目名>` 创建新项目（依赖永远最新）
2. 读取本清单，了解可复用模块的完整索引
3. 按【引导流程】的阶段顺序，逐步迁移所需模块
4. 对每个模块，AI 读取源文件的实际代码，根据【适配说明】调整后写入新项目

### 核心约定

- **源路径**：本文件中所有路径均相对于本项目根目录
- **新项目别名**：`@/*` 映射项目根目录（与源项目 tsconfig 一致）
- **代码来源**：本清单只是索引，实际代码以源文件为准，AI 必须读取源文件
- **依赖适配**：新项目使用最新依赖，如 API 有变更需做适配
- **按需迁移**：不必全盘迁移，根据新项目需求选择模块
- **中文适配**：源项目的用户提示文案为中文，迁移时根据新项目的语言需求调整

---

## 一、架构蓝图

### 1.1 目录结构

```
<项目根>/
├── app/                          # Expo Router 文件路由
│   ├── _layout.tsx               # 根布局：Provider 组合 + AuthGuard + 全局遮罩
│   ├── (auth)/                   # 认证路由组（未登录可见）
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/                   # Tab 路由组（主导航）
│   │   ├── _layout.tsx           # 自定义 AnimatedTabBar
│   │   ├── index.tsx
│   │   └── ...
│   └── (screens)/                # 非 Tab 推入屏幕
│       ├── _layout.tsx           # 自定义 ScreenHeader
│       └── ...
├── src/
│   ├── api/                      # 网络层（Axios 实例 + 拦截器）
│   ├── components/               # 跨业务可复用组件
│   │   └── form/                 # 表单控件体系
│   ├── features/                 # 业务功能模块（Feature-First）
│   │   ├── auth/                 # 每个 feature 包含：
│   │   │   ├── types.ts          #   类型定义
│   │   │   ├── api.ts            #   API 调用
│   │   │   ├── use*.ts           #   React Hook
│   │   │   └── index.ts          #   桶导出
│   │   └── .../
│   ├── stores/                   # Zustand 全局状态
│   └── utils/                    # 纯工具函数
├── global.css                    # Tailwind + NativeWind 入口
└── 配置文件...
```

### 1.2 分层原则

```
app/（路由层）
 └─ 引用 → src/components/（组件层）
              └─ 引用 → src/features/（业务层）
                           └─ 引用 → src/stores/（状态层）
                                       └─ 引用 → src/utils/（工具层）
                                       └─ 引用 → src/api/（网络层）
```

- 下层不得引用上层（utils 不引用 stores，stores 不引用 components）
- features 通过桶导出（index.ts）暴露公共 API，隐藏内部实现
- 路由层只做页面组装，业务逻辑下沉到 features 和 stores

### 1.3 Feature 模块规范

每个 feature 目录遵循固定结构：

```
features/<name>/
├── types.ts        # 类型定义（无运行时依赖，可被任意层引用）
├── api.ts          # API 调用（依赖 src/api/client）
├── <name>Service.ts  # 纯业务逻辑（不含 React，可被 Hook 和非 React 代码调用）
├── use<Name>.ts    # React Hook（组合 Service + Store + React 生命周期）
└── index.ts        # 桶导出：只导出上层需要的符号
```

---

## 二、引导流程（按依赖顺序）

迁移必须按阶段进行，后续阶段依赖前序阶段的产物。

### Phase 0：项目创建与工具链

1. `npx create-expo-app@latest <name>`
2. 安装并配置 NativeWind（Tailwind CSS for RN）
3. 配置 TypeScript 路径别名 `@/*`
4. 配置 ESLint

> 详见【3.0 工具链配置】

### Phase 1：存储与状态基础设施

1. 迁移 `src/utils/storage.ts`（存储抽象）
2. 迁移 `src/stores/themeStore.ts`（主题管理，最简单的 Store 模板）
3. 迁移 `src/stores/authStore.ts`（认证状态）

> 此阶段建立整个状态管理范式，后续所有 Store 遵循相同模式。

### Phase 2：网络层

1. 迁移 `src/api/` 整个目录
2. 配置环境变量

> 依赖 Phase 1（client.ts 引用 authStore 和 secureStorage）

### Phase 3：认证体系

1. 迁移 `src/features/auth/`
2. 构建根布局 `app/_layout.tsx`（AuthGuard + Provider 组合）
3. 创建认证路由组 `app/(auth)/`

> 依赖 Phase 1 + Phase 2

### Phase 4：UI 基础组件

1. 迁移通用组件（ScreenHeader、ListStates、ExpoImage）
2. 构建路由布局（tabs layout、screens layout）
3. 按需迁移 AnimatedTabBar

> 依赖 Phase 3（布局需要 AuthGuard 已就位）

### Phase 5：表单体系（按需）

1. 迁移 `src/utils/zodResolver.ts`
2. 迁移 `src/components/form/` 全套

> 依赖 Phase 4

### Phase 6：可选功能模块（按需，各模块独立）

- 权限管理：`src/features/device/`
- 生物认证：`src/features/biometric/` + `src/stores/biometricStore.ts` + `src/components/BiometricLockScreen.tsx`
- 媒体处理：`src/features/media/`
- 推送通知：`src/features/notifications/`
- 分享面板：`src/components/ShareSheet.tsx`

---

## 三、模块清单

每个模块标注以下属性：

- **类别**：`直接复制` | `模式复制` | `参考实现`
  - 直接复制 — 代码几乎可原样使用，仅改 import 路径
  - 模式复制 — 架构模式可复用，但依赖 API 可能随版本变化需适配
  - 参考实现 — 提供完整实现思路，新项目可能需要根据需求重构
- **源路径**：在本项目中的文件路径
- **外部依赖**：需要安装的 npm 包
- **内部依赖**：需要先迁移的其他模块
- **适配说明**：迁移时的注意事项

---

### 3.0 工具链配置

#### TypeScript 配置

- **源路径**: `tsconfig.json`
- **类别**: 直接复制
- **要点**: 继承 `expo/tsconfig.base`，启用 `strict`，配置 `@/*` 路径别名
- **适配说明**: `include` 中的类型声明文件按实际安装的库调整

#### Metro 配置

- **源路径**: `metro.config.js`
- **类别**: 模式复制
- **外部依赖**: `nativewind`
- **要点**:
  - `withNativewind()` 包裹默认配置
  - `unstable_enablePackageExports = true` — react-hook-form 等库需要通过 `exports` 字段解析多平台入口
- **适配说明**: 若不使用 NativeWind，去掉 `withNativewind` 包裹；`unstable_enablePackageExports` 建议始终启用

#### PostCSS + Tailwind v4 配置

- **源路径**: `postcss.config.mjs`, `global.css`
- **类别**: 直接复制
- **外部依赖**: `tailwindcss`, `@tailwindcss/postcss`（devDependencies）
- **要点**: Tailwind v4 不需要 `tailwind.config.js`，通过 `global.css` 中的 `@import` 引入
- **适配说明**: `global.css` 必须在根布局文件（`app/_layout.tsx`）的最顶部 `import "../global.css"`

#### ESLint 配置

- **源路径**: `eslint.config.js`
- **类别**: 直接复制
- **外部依赖**: `eslint`, `eslint-config-expo`（devDependencies）

#### app.json 配置模式

- **源路径**: `app.json`
- **类别**: 参考实现
- **要点**:
  - `newArchEnabled: true` — 启用新架构
  - `experiments.typedRoutes: true` — Expo Router 类型安全路由
  - `experiments.reactCompiler: true` — React Compiler 自动优化
  - 各 plugin 的权限描述文案模板可复用
  - `scheme` 字段配置 Deep Link URL Scheme
- **适配说明**: `name`、`slug`、`scheme`、icon 路径等项目特定字段需替换

---

### 3.1 存储抽象

- **源路径**: `src/utils/storage.ts`
- **类别**: 直接复制
- **外部依赖**: `@react-native-async-storage/async-storage`, `expo-secure-store`
- **内部依赖**: 无（基础设施最底层）

**设计要点**:

- 双层存储架构：`secureStorage`（Keychain/Keystore，存凭证）+ `createStorage<T>()`（AsyncStorage，存偏好）
- `createStorage` 是泛型工厂函数，各 Store 就地创建实例，storage 模块不感知业务领域
- 完整的 try-catch 错误处理，存储失败不会导致应用崩溃

**适配说明**:

- `secureStorage` 中的 `TOKEN_KEY` 常量名可根据新项目调整
- 如需存储多种凭证（access token + refresh token），扩展 `secureStorage` 对象即可
- `createStorage` 接口（get/set/remove）足够通用，无需修改

---

### 3.2 工具函数

#### format.ts

- **源路径**: `src/utils/format.ts`
- **类别**: 直接复制
- **外部依赖**: 无
- **内部依赖**: 无
- **适配说明**: `formatRelativeTime` 的时间描述为中文（"刚刚"、"分钟前"），按需替换为目标语言

#### zodResolver.ts

- **源路径**: `src/utils/zodResolver.ts`
- **类别**: 模式复制
- **外部依赖**: `react-hook-form`, `zod`
- **内部依赖**: 无
- **设计要点**: 官方 `@hookform/resolvers` 与 Zod v4 存在类型兼容问题，此 resolver 直接调用 `safeParse`，将 `ZodError.issues` 映射为 `FieldErrors`
- **适配说明**: 如迁移时 `@hookform/resolvers` 已修复 Zod v4 兼容性，可直接使用官方 resolver 替代此文件

---

### 3.3 状态管理（Zustand Stores）

三个 Store 共享相同的架构模式，迁移时以 themeStore 为最简模板理解范式。

#### 共享范式

```
createStorage<T>(key)  → 持久化实例（模块私有）
create<State>((set) => ({
  ...初始状态,
  isLoading: true,
  hydrate: async () => { 从 storage 恢复 → set() → isLoading=false },
  set操作: async () => { set() + storage.set() },
}))
```

核心思想：**内存状态（Zustand）与持久化存储（AsyncStorage/SecureStore）双写同步**，通过 `hydrate()` 在应用启动时恢复。

#### themeStore

- **源路径**: `src/stores/themeStore.ts`
- **类别**: 直接复制
- **外部依赖**: `zustand`
- **内部依赖**: `src/utils/storage.ts`
- **设计要点**: 三态主题（system/light/dark），hydrate 时校验存储值的合法性
- **适配说明**: 几乎可原样使用

#### authStore

- **源路径**: `src/stores/authStore.ts`
- **类别**: 模式复制
- **外部依赖**: `zustand`
- **内部依赖**: `src/utils/storage.ts`, `src/features/auth/types.ts`（User 类型）
- **设计要点**:
  - Token 存 SecureStore，User 信息存 AsyncStorage（双存储策略）
  - `hydrate` 并行读取 Token + User，两者都存在才视为已登录
  - `signIn`/`signOut` 同时操作内存和持久化存储
- **适配说明**: `User` 类型需根据新项目的用户模型重新定义

#### biometricStore

- **源路径**: `src/stores/biometricStore.ts`
- **类别**: 参考实现
- **外部依赖**: `zustand`
- **内部依赖**: `src/utils/storage.ts`
- **设计要点**:
  - 冷启动时若已启用生物认证则自动进入锁定态
  - 开启生物认证时不立即锁定（避免刚开启就弹验证），下次切后台再锁
- **适配说明**: 仅在需要生物认证功能时迁移

---

### 3.4 网络层（API Client）

需整体迁移 `src/api/` 目录（3 个文件）。

#### config.ts

- **源路径**: `src/api/config.ts`
- **类别**: 直接复制
- **设计要点**: 从 `EXPO_PUBLIC_*` 环境变量读取配置，缺失时 console.warn 而非静默失败
- **适配说明**: 环境变量名按新项目调整；新建 `.env` 文件配置实际值

#### types.ts

- **源路径**: `src/api/types.ts`
- **类别**: 直接复制
- **设计要点**: `ApiClient` 接口重新声明 axios 方法签名，使返回类型为 `Promise<T>` 而非 `Promise<AxiosResponse<T>>`

#### client.ts

- **源路径**: `src/api/client.ts`
- **类别**: 模式复制
- **外部依赖**: `axios`
- **内部依赖**: `src/stores/authStore.ts`, `src/utils/storage.ts`, `src/api/config.ts`, `src/api/types.ts`
- **设计要点**:
  - 请求拦截器：从 SecureStore 读取 Token 自动注入 Authorization header
  - 响应拦截器：解包 `response.data`（省去每次 `.data`），统一错误处理
  - 401 处理：通过 `useAuthStore.getState().signOut()` 在非 React 环境中触发登出
  - 类型断言：`axiosInstance as unknown as ApiClient` 修正解包后的返回类型
- **适配说明**: 错误提示文案（"没有权限访问"等）按需调整；如使用 fetch 替代 axios，保留拦截器的逻辑结构

---

### 3.5 认证体系

#### Feature 模块

- **源路径**: `src/features/auth/`
- **类别**: 模式复制
- **外部依赖**: `@tanstack/react-query`, `axios`
- **内部依赖**: `src/api/client.ts`, `src/stores/authStore.ts`
- **包含文件**:
  - `types.ts` — User、LoginParams、LoginResponse 类型定义
  - `api.ts` — 登录/登出 API，内置 Mock 开关（IS_MOCK），生产环境关闭后走真实请求
  - `useAuth.ts` — `useLogin()`、`useLogout()` mutation hooks
  - `index.ts` — 桶导出
- **适配说明**:
  - `User` 类型字段根据后端 API 重新定义
  - `LoginParams` 替换为实际登录方式（手机号/邮箱/OAuth）
  - Mock 数据按新项目需求调整
  - `useLogin` 的 `onSuccess` 中的路由跳转逻辑由 AuthGuard 驱动，无需手动导航

#### 根布局（Provider 组合 + AuthGuard）

- **源路径**: `app/_layout.tsx`
- **类别**: 参考实现
- **外部依赖**: `@tanstack/react-query`, `@gorhom/bottom-sheet`, `react-native-gesture-handler`, `expo-notifications`, `expo-status-bar`
- **设计要点**:
  - Provider 嵌套顺序：`GestureHandlerRootView` > `QueryClientProvider` > `BottomSheetModalProvider` > AuthGuard
  - `QueryClient` 用 `useState(() => new QueryClient(...))` 确保单例
  - 三个 Store 的 `hydrate()` 在 `useEffect` 中并行调用
  - `Appearance.setColorScheme()` 将 Zustand 主题同步到原生 API（NativeWind `dark:` 依赖此机制）
  - `Notifications.setNotificationHandler()` 在模块顶层调用（非组件内）
  - AuthGuard 采用"单向门禁"模式：只阻止已登录用户进入 (auth) 路由组
  - `BiometricLockScreen` 在根布局无条件挂载，不可被导航操作绕过
- **适配说明**:
  - 按新项目实际需要的 Provider 增减嵌套层
  - 不需要 BottomSheet 可去掉 `@gorhom/bottom-sheet` 相关
  - 不需要通知可去掉 `setNotificationHandler` 和 `useNotificationObserver`
  - 不需要生物认证可去掉 `BiometricLockScreen` 和 `hydrateBiometric`

#### 认证路由组

- **源路径**: `app/(auth)/_layout.tsx`
- **类别**: 直接复制
- **设计要点**: 极简 Stack 布局，`headerShown: false`

---

### 3.6 UI 基础组件

#### ScreenHeader（自定义导航头）

- **源路径**: `src/components/ScreenHeader.tsx`
- **类别**: 直接复制
- **外部依赖**: `expo-router`, `react-native-safe-area-context`, `@expo/vector-icons`
- **设计要点**:
  - 替代原生 UINavigationBar，规避 iOS 26 Liquid Glass 强制渲染
  - 通过 `useSafeAreaInsets()` 适配安全区
  - 三栏布局（左/标题/右），左右固定宽度保证标题居中
  - `fallbackRoute` prop 注入回退路由，组件不耦合具体路由结构
  - 纯 StyleSheet，不依赖 NativeWind（因为需要 `style` 动态样式控制安全区和暗色模式）
- **适配说明**: 颜色值可根据设计系统调整

#### Screens 路由组布局

- **源路径**: `app/(screens)/_layout.tsx`
- **类别**: 直接复制
- **内部依赖**: `src/components/ScreenHeader.tsx`
- **设计要点**: 通过 Stack 的 `header` prop 注入自定义 ScreenHeader，替换所有子页面的原生导航栏

#### ExpoImage（expo-image className 适配）

- **源路径**: `src/components/ExpoImage.tsx`
- **类别**: 直接复制
- **外部依赖**: `expo-image`
- **设计要点**: NativeWind 的 CSS interop 不覆盖 expo-image，用 View 承载 className，Image 100% 填充
- **适配说明**: 仅在使用 NativeWind + expo-image 时需要；若使用 RN 内置 Image 则不需要

#### ListStates（列表状态组件集）

- **源路径**: `src/components/ListStates.tsx`
- **类别**: 直接复制
- **外部依赖**: `@expo/vector-icons`
- **包含组件**: `ListEmpty`、`ListError`（带重试按钮）、`ListFooter`（加载更多/到底）、`ListLoading`
- **适配说明**: 文案为中文（"暂无内容"、"已经到底了"等），按需替换

#### AnimatedTabBar（动画底部 Tab 栏）

- **源路径**: `src/components/AnimatedTabBar.tsx`
- **类别**: 参考实现
- **外部依赖**: `@react-navigation/bottom-tabs`, `expo-blur`, `react-native-reanimated`
- **设计要点**:
  - 胶囊指示器以弹簧动画横向滑动，带过冲回弹
  - 胶囊内嵌毛玻璃效果，运动中纵向拉伸并变透
  - 浅色/深色主题通过 THEME 常量映射
  - `marginHorizontal` 代替 `left`/`right`（见平台陷阱 #3）
- **适配说明**: 此组件较复杂且视觉风格强烈，通常需要根据设计系统重新调整配色和动画参数

#### Tabs 路由组布局

- **源路径**: `app/(tabs)/_layout.tsx`
- **类别**: 模式复制
- **内部依赖**: `src/components/AnimatedTabBar.tsx`
- **设计要点**: 通过 `tabBar` prop 注入自定义 AnimatedTabBar
- **适配说明**: Tab 项（name、icon、title）按新项目的页面结构调整

---

### 3.7 表单体系

整体迁移 `src/components/form/` 目录 + `src/utils/zodResolver.ts`。

#### zodResolver

- 见【3.2 工具函数】

#### FormField（表单字段容器）

- **源路径**: `src/components/form/FormField.tsx`
- **类别**: 直接复制
- **设计要点**: 统一提供 label + 必填标记 + 错误信息展示，所有表单控件内部用此包裹

#### FormInput（单行文本输入）

- **源路径**: `src/components/form/FormInput.tsx`
- **类别**: 直接复制
- **外部依赖**: `react-hook-form`, `@expo/vector-icons`
- **设计要点**:
  - 内置 Controller 绑定，自动管理 value/onChange/onBlur
  - 使用 `text-[16px]` 而非 `text-base`，规避 iOS TextInput lineHeight 渲染 bug
  - 支持左侧 icon 和 inputRef（焦点跳转）

#### FormTextArea（多行文本输入）

- **源路径**: `src/components/form/FormTextArea.tsx`
- **类别**: 直接复制
- **外部依赖**: `react-hook-form`
- **设计要点**: 支持字符计数器和 maxLength 限制

#### FormSelect（模态选择器）

- **源路径**: `src/components/form/FormSelect.tsx`
- **类别**: 直接复制
- **外部依赖**: `react-hook-form`, `@expo/vector-icons`, `react-native-safe-area-context`
- **设计要点**: RN 无原生 `<select>`，通过底部 Modal + FlatList 实现，选中项带勾选标记

#### FormTagSelect（标签多选）

- **源路径**: `src/components/form/FormTagSelect.tsx`
- **类别**: 直接复制
- **外部依赖**: `react-hook-form`, `expo-haptics`
- **设计要点**: Chip 形式多选，达到上限时触发警告触觉反馈

#### FormImagePicker（图片选择器）

- **源路径**: `src/components/form/FormImagePicker.tsx`
- **类别**: 模式复制
- **外部依赖**: `react-hook-form`, `expo-image`, `@expo/vector-icons`
- **内部依赖**: `src/features/media/`（pickImages、takePhoto）
- **设计要点**: 网格展示已选图片 + 添加按钮，Alert 选择来源（相册/拍照）
- **适配说明**: 依赖 media feature 模块，需先迁移

#### 桶导出

- **源路径**: `src/components/form/index.ts`
- **类别**: 直接复制

---

### 3.8 可选功能模块

以下模块彼此独立，按需迁移。

#### 权限管理（device feature）

- **源路径**: `src/features/device/`
- **类别**: 直接复制
- **外部依赖**: 无额外依赖（仅 React Native 内置 API）
- **包含文件**:
  - `types.ts` — `PermissionState` 五态枚举 + `PermissionAdapter` 接口
  - `usePermission.ts` — 统一权限 Hook（检查 → 请求 → 引导设置）
  - `index.ts` — 桶导出
- **设计要点**:
  - 适配器模式：各 Expo 模块的权限 API 形状统一（get/request 返回 `{ granted, canAskAgain }`），通过 `PermissionAdapter` 接口抽象
  - 调用方只需传入模块级适配器常量，无需关心各模块差异
  - denied/blocked 两种拒绝态区分处理，blocked 态自动引导至系统设置
- **使用示例**:
  ```tsx
  import * as Location from 'expo-location';
  const locationAdapter: PermissionAdapter = {
    get: Location.getForegroundPermissionsAsync,
    request: Location.requestForegroundPermissionsAsync,
  };
  const { isGranted, request } = usePermission(locationAdapter, '位置');
  ```

#### 生物认证（biometric feature）

需迁移 3 个部分：feature 模块 + store + 锁屏组件。

**Feature 模块**:

- **源路径**: `src/features/biometric/`
- **类别**: 模式复制
- **外部依赖**: `expo-local-authentication`
- **包含文件**:
  - `types.ts` — BiometricType、BiometricCapability、BiometricAuthResult、BiometricAuthOptions
  - `biometricService.ts` — `checkBiometricCapability()`、`authenticate()`、`isBiometricAvailable()`
  - `useBiometric.ts` — 组合能力检测 + 认证触发 + 状态管理的 Hook
  - `index.ts` — 桶导出
- **设计要点**:
  - Service 层自动执行预检（硬件 + 录入），预检失败不弹系统弹窗
  - 用户取消（user_cancel/user_fallback）不视为错误
  - Expo Go 中 Face ID 不可用的友好提示

**Store**:

- 见【3.3 biometricStore】

**锁屏组件**:

- **源路径**: `src/components/BiometricLockScreen.tsx`
- **类别**: 参考实现
- **内部依赖**: `src/features/biometric/`、`src/stores/biometricStore.ts`
- **设计要点**:
  - AppState 监听：active/inactive → background 时锁定
  - 全屏不可穿透遮罩，zIndex: 9999
  - 冷启动自动弹出认证
  - 必须在根布局无条件挂载

#### 媒体处理（media feature）

- **源路径**: `src/features/media/`
- **类别**: 模式复制
- **外部依赖**: `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`
- **包含文件**:
  - `types.ts` — PickedImage、ProcessedImage、ProcessOptions、UploadProgress
  - `imageService.ts` — `pickImages()`、`takePhoto()`、`processImage()`、`mockUploadImage()`、`formatFileSize()`
  - `index.ts` — 桶导出
- **设计要点**:
  - `pickImages` 支持多选和数量限制（iOS 14+ PHPicker 无需完整相册权限）
  - `processImage` 使用 expo-image-manipulator 链式 API（SDK 54 风格）
  - `getFileSize` 使用 `new File(uri).size`（SDK 54 新 API，替代废弃的 `getInfoAsync`）
  - `mockUploadImage` 带进度回调和取消支持，注释中包含真实上传的代码模板
- **适配说明**: expo-image-manipulator 和 expo-file-system 的 API 在大版本间有变化，迁移时需核对当前版本的 API

#### 推送通知（notifications feature）

- **源路径**: `src/features/notifications/`
- **类别**: 模式复制
- **外部依赖**: `expo-notifications`, `expo-constants`, `expo-device`, `expo-router`
- **包含文件**:
  - `types.ts` — LocalNotificationInput、ScheduledNotificationInfo
  - `notificationService.ts` — 权限请求、Push Token 获取、本地通知调度/取消、Badge、清除通知
  - `useNotifications.ts` — `useNotificationListeners()` 前台通知监听 Hook
  - `useNotificationObserver.ts` — `useNotificationObserver()` 通知点击→路由导航 Hook
  - `index.ts` — 桶导出
- **设计要点**:
  - Android 必须先创建 Channel 再请求权限（Android 13+ 要求）
  - Push Token 仅物理设备可用，需要 EAS projectId
  - `useNotificationObserver` 处理冷启动 + 热启动两种通知点击场景
  - 通知 data 中携带 `url` 字段作为 Deep Link 目标路由
- **适配说明**: 通知导航的 `url` 字段约定需与新项目的路由结构匹配

#### 分享面板

- **源路径**: `src/components/ShareSheet.tsx`
- **类别**: 参考实现
- **外部依赖**: `@gorhom/bottom-sheet`, `@expo/vector-icons`, `react-native-safe-area-context`
- **设计要点**: 基于 BottomSheetModal 的手势拖拽分享面板
- **适配说明**: 分享选项（微信/微博等）需根据新项目的社交平台需求替换

---

## 四、平台陷阱速查

源项目中总结了 7 条经过验证的 React Native / NativeWind 平台陷阱，迁移后同样适用。

**完整内容请 AI 读取**: `.cursor/rules/rn-platform-pitfalls.mdc`

关键条目摘要：

1. **禁止混用 style 和 className** — NativeWind v5 原生端 style 覆盖 className
2. **TextInput 禁止 text-base 等带 lineHeight 的类** — iOS 文字偏下
3. **Tab Bar 用 marginHorizontal 代替 left/right** — iOS 原生端不生效
4. **iOS 26 Liquid Glass** — 自定义 Header 必须用 `header` prop 替换原生导航栏
5. **expo-camera 权限函数** — 必须从 `{ Camera }` 命名导出访问，非 `* as`
6. **expo-image 的 className** — 原生端被忽略，需用 ExpoImage 包装组件
7. **TextInput 禁止 text-center** — NativeWind v5 preview 会崩溃

---

## 五、依赖安装参考

以下是源项目的核心依赖分组，新项目按需安装（版本使用 latest，不要照搬源项目版本号）。

### 必装（核心框架）

```bash
# Expo Router + Navigation
npx expo install expo-router expo-linking expo-status-bar expo-splash-screen

# Navigation 底层
npx expo install react-native-screens react-native-safe-area-context @react-navigation/native @react-navigation/bottom-tabs

# NativeWind
npx expo install nativewind react-native-css
npm install -D tailwindcss @tailwindcss/postcss postcss

# 手势 + 动画
npx expo install react-native-gesture-handler react-native-reanimated
```

### 状态 + 网络 + 表单

```bash
# 状态管理
npm install zustand

# 持久化存储
npx expo install @react-native-async-storage/async-storage expo-secure-store

# 网络请求
npm install axios
npm install @tanstack/react-query

# 表单
npm install react-hook-form zod
```

### 可选功能

```bash
# 图标
npx expo install @expo/vector-icons

# 媒体
npx expo install expo-image expo-image-picker expo-image-manipulator expo-file-system

# 通知
npx expo install expo-notifications expo-constants expo-device

# 生物认证
npx expo install expo-local-authentication

# 触觉反馈
npx expo install expo-haptics

# 毛玻璃
npx expo install expo-blur

# Bottom Sheet
npm install @gorhom/bottom-sheet

# 高性能列表
npm install @shopify/flash-list
```

---

## 六、迁移检查清单

完成迁移后，逐项确认：

- [ ] `npx expo start` 能正常启动，无红屏错误
- [ ] `global.css` 在根布局最顶部 import
- [ ] TypeScript 路径别名 `@/*` 生效（import 无报错）
- [ ] 暗色模式切换正常（NativeWind `dark:` 前缀响应）
- [ ] AuthGuard 逻辑正确（已登录不进 auth 页，登出后状态清除）
- [ ] SecureStore 存取 Token 正常
- [ ] API Client 拦截器工作（Token 注入、401 登出）
- [ ] 表单校验和错误展示正常（如已迁移表单体系）
- [ ] iOS 和 Android 双平台测试（特别注意平台陷阱中的条目）
