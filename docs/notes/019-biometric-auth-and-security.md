# 019. 生物认证与安全

## 1. 核心问题与概念

### 解决什么问题

用户的手机里存着登录态（JWT Token），任何拿到手机的人打开 App 就能直接操作。这在金融、医疗、企业场景中是不可接受的。App 需要一种**本地的、即时的身份验证**——不是验证"你是谁"（那是登录做的事），而是验证"正在操作手机的人是不是设备主人"。

生物认证（指纹 / Face ID）解决的就是这个问题：**App 层面的访问控制**。

开发者面临的三个工程挑战：

1. **硬件差异** —— 有的设备有指纹、有的有面容、有的有虹膜、有的什么都没有。代码必须适配所有情况。
2. **安全层级不清晰** —— 生物认证不是"登录凭证"，它不生成 Token，也不与服务端交互。它的角色是"门禁"，保护的是已存在 SecureStore 中的 Token。开发者容易混淆这两层的职责。
3. **App 生命周期与锁屏时机** —— 什么时候锁？切后台就锁？切换应用就锁？锁了之后怎么恢复？这涉及 AppState API 和状态管理的配合。

### 核心概念与依赖

| 层级     | 技术                         | 角色                                                     |
| -------- | ---------------------------- | -------------------------------------------------------- |
| 认证引擎 | `expo-local-authentication`  | 封装 iOS Face ID/Touch ID 和 Android Biometric Prompt    |
| 凭证存储 | `expo-secure-store`          | 加密存储 Token（iOS Keychain / Android Keystore）        |
| 偏好存储 | `AsyncStorage`               | 持久化"是否开启生物认证"等非敏感偏好                     |
| 状态管理 | `zustand`                    | 管理 `isEnabled` / `isLocked` 状态                       |
| 生命周期 | `AppState` (React Native)    | 监听前台/后台切换，触发锁定                              |

### 生物认证 ≠ 登录

这是最容易犯的架构错误。两者的区别：

|                | 登录 (Login)                           | 生物认证 (Biometric)                          |
| -------------- | -------------------------------------- | --------------------------------------------- |
| **验证什么**   | 用户身份（手机号+验证码 / 用户名+密码）| 操作者是否是设备主人                          |
| **与服务端交互** | 是，获取 JWT Token                    | 否，纯本地操作                                |
| **结果**       | 获得 Token，写入 SecureStore           | 允许/拒绝访问已存储的 Token                   |
| **频率**       | 偶尔（Token 过期时）                   | 每次 App 从后台恢复时                         |
| **角色定位**   | 钥匙（生成凭证）                       | 门禁（控制访问）                              |

正确的架构模型：

```
登录流程：
  用户输入凭证 → 服务端验证 → 返回 JWT Token
    → SecureStore.setItemAsync('auth_token', token)

生物认证流程：
  App 从后台恢复 → 检测 isEnabled → 弹出系统认证弹窗
    → 认证通过 → 解锁 UI → 用户可访问已存储的 Token
    → 认证失败 → 保持锁屏 → Token 仍在但不可访问
```

## 2. 核心用法 / 方案设计

### 场景 A: 检测设备能力

在展示认证相关 UI 之前，必须先检测设备是否支持生物认证。`expo-local-authentication` 提供四个独立的检测 API：

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

// 1. 设备是否有生物认证硬件（指纹传感器、面容识别模块）
const hasHardware = await LocalAuthentication.hasHardwareAsync();

// 2. 用户是否已录入生物信息（至少一个指纹或面容）
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

// 3. 设备支持哪些认证方式（可能同时支持多种）
const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
// 返回数组：[AuthenticationType.FINGERPRINT, AuthenticationType.FACIAL_RECOGNITION]

// 4. 已录入认证的安全等级
const level = await LocalAuthentication.getEnrolledLevelAsync();
// SecurityLevel.NONE = 0      → 无认证
// SecurityLevel.SECRET = 1    → PIN/Pattern（非生物）
// SecurityLevel.BIOMETRIC_WEAK = 2  → Class 2（如 2D 面部解锁）
// SecurityLevel.BIOMETRIC_STRONG = 3 → Class 3（如指纹、3D 面容）
```

这四个 API 是独立的原生调用，可以并行执行以减少等待时间：

```typescript
const [hasHardware, isEnrolled, types, level] = await Promise.all([
  LocalAuthentication.hasHardwareAsync(),
  LocalAuthentication.isEnrolledAsync(),
  LocalAuthentication.supportedAuthenticationTypesAsync(),
  LocalAuthentication.getEnrolledLevelAsync(),
]);
```

### 场景 B: 触发生物认证

核心方法 `authenticateAsync()` 弹出系统级生物认证弹窗：

```typescript
const result = await LocalAuthentication.authenticateAsync({
  // 弹窗上的提示文字
  promptMessage: '验证身份以解锁',

  // iOS: 生物认证失败后的回退按钮文字（空字符串隐藏按钮）
  fallbackLabel: '使用密码',

  // 取消按钮文字
  cancelLabel: '取消',

  // 是否禁止回退到设备密码/PIN
  // false（默认）: 生物认证失败多次后系统自动提供 PIN/密码输入
  // true: 只允许生物认证，失败就是失败
  disableDeviceFallback: false,
});
```

返回值是一个辨别联合类型（Discriminated Union）：

```typescript
// 成功
{ success: true }

// 失败
{
  success: false,
  error: 'user_cancel' | 'user_fallback' | 'lockout' | 'authentication_failed' | ...,
  warning?: string,
}
```

常见的 `error` 值：

| error                  | 含义                                                 |
| ---------------------- | ---------------------------------------------------- |
| `user_cancel`          | 用户主动取消                                         |
| `user_fallback`        | 用户点击了"使用密码"回退按钮                         |
| `authentication_failed`| 生物信息不匹配                                       |
| `lockout`              | 连续失败过多，系统临时锁定生物认证                   |
| `not_enrolled`         | 没有录入生物信息                                     |
| `not_available`        | 硬件不可用                                           |
| `passcode_not_set`     | 设备未设置解锁密码（生物认证前提是设备有密码）       |

### 场景 C: App Lock（应用锁）

完整的 App Lock 涉及三个层面的配合：

**1. 状态管理（Zustand Store）**

```typescript
interface BiometricState {
  isEnabled: boolean;   // 用户是否开启了生物认证锁
  isLocked: boolean;    // App 当前是否处于锁定态
  isLoading: boolean;   // hydrate 加载中

  hydrate: () => Promise<void>;     // 启动时恢复偏好
  setEnabled: (v: boolean) => Promise<void>;  // 切换开关
  lock: () => void;     // 锁定
  unlock: () => void;   // 解锁
}
```

关键状态转换：

```
冷启动：
  hydrate() → 读取 AsyncStorage
    → isEnabled: true → isLocked: true（启动即锁定）
    → isEnabled: false → isLocked: false（正常进入）

App 切后台：
  AppState → 'background' && isEnabled
    → lock()

App 回前台：
  BiometricLockScreen 检测 isLocked: true
    → 弹出认证 → 成功 → unlock()

用户开启：
  setEnabled(true) → 验证身份 → 持久化 → 不立即锁定

用户关闭：
  setEnabled(false) → 持久化 → 解锁
```

**2. AppState 监听**

React Native 的 `AppState` API 提供三个状态：

| 状态         | iOS                             | Android                          |
| ------------ | ------------------------------- | -------------------------------- |
| `active`     | App 在前台且可交互              | App 在前台                       |
| `inactive`   | 过渡态（如下拉通知中心）        | 极少触发                         |
| `background` | App 完全进入后台                | App 进入后台                     |

锁定时机选择 `active/inactive → background`，而非 `active → inactive`。`inactive` 在 iOS 上的触发场景太多（下拉通知栏、控制中心、系统弹窗），如果在 inactive 就锁定会导致体验极差。

```typescript
useEffect(() => {
  function handleChange(nextState: AppStateStatus) {
    const prev = appStateRef.current;
    // 从前台（active 或 inactive）切入后台时锁定
    if (isEnabled && (prev === 'active' || prev === 'inactive') && nextState === 'background') {
      lock();
    }
    appStateRef.current = nextState;
  }

  const sub = AppState.addEventListener('change', handleChange);
  return () => sub.remove();
}, [isEnabled, lock]);
```

**3. 锁屏遮罩**

锁屏组件渲染为全屏 `absoluteFill` 遮罩，`zIndex: 9999` 覆盖所有内容。在根布局中无条件挂载（组件内部判断 `isLocked` 决定是否渲染），确保无法通过导航操作绕过。

### 场景 D: 开启生物认证前的身份验证

开启 App Lock 时应该先验证身份，防止他人拿到已解锁的手机后开启锁屏（设置了自己的指纹 → 原主人打不开）：

```typescript
const handleToggle = async (value: boolean) => {
  if (value) {
    // 开启前先认证
    const result = await authenticate({ promptMessage: '验证身份以开启 App 锁' });
    if (!result.success) return;
  }
  await setEnabled(value);
};
```

## 3. 深度原理与机制

### authenticateAsync 的系统级调用链

```
JavaScript 层
  LocalAuthentication.authenticateAsync(options)
    ↓ JSI Bridge
原生模块层
  ├── iOS: LAContext.evaluatePolicy()
  │     ├── policy: .deviceOwnerAuthenticationWithBiometrics
  │     │     → 仅生物认证（disableDeviceFallback: true）
  │     └── policy: .deviceOwnerAuthentication
  │           → 生物认证 + 设备密码回退（disableDeviceFallback: false）
  │     ↓
  │   Secure Enclave（安全隔区）
  │     → 生物模板在硬件中匹配，不离开芯片
  │
  └── Android: BiometricPrompt.authenticate()
        ├── Class 3 (BIOMETRIC_STRONG): 指纹 / 3D 面容
        └── Class 2 (BIOMETRIC_WEAK): 2D 面部解锁
        ↓
      TEE (Trusted Execution Environment) / StrongBox
        → 生物模板在安全硬件中匹配
```

核心安全保证：**生物信息（指纹模板、面容数据）永远不离开安全硬件**。`authenticateAsync()` 只返回 `true/false`，不返回任何生物数据。App 和操作系统都无法读取原始生物信息。

### SecurityLevel 的实际意义

Android 将生物认证分为三个安全等级（CDD 定义）：

| 等级               | Android Class | 要求                                         | 示例                 |
| ------------------ | ------------- | -------------------------------------------- | -------------------- |
| BIOMETRIC_STRONG   | Class 3       | 基于硬件的认证，防伪攻击率 < 7%              | 电容指纹、结构光面容 |
| BIOMETRIC_WEAK     | Class 2       | 软件级认证，无严格防伪要求                   | 摄像头 2D 面部解锁   |
| SECRET             | —             | 非生物认证（PIN、图案、密码）                | 设备锁屏密码         |

对于金融场景，应设置 `biometricsSecurityLevel: 'strong'`，仅接受 Class 3 认证。

### Expo Go vs Development Build vs Production Build

Expo 项目有三种运行方式，决定了哪些原生能力可用：

| 运行方式 | 是什么 | 原生配置来源 | 热更新 | 构建方式 |
| --- | --- | --- | --- | --- |
| **Expo Go** | Expo 官方提供的通用沙盒 App（从 App Store 下载） | Expo Go 自带的 Info.plist / AndroidManifest（不含你的配置） | ✅ 连接 Metro | 无需构建 |
| **Development Build** | 包含你项目原生配置的调试版 App（安装到手机上替代 Expo Go） | 你的 app.json 中的 plugins 全部生效 | ✅ 连接 Metro | 本地或云端 |
| **Production Build** | 提交到 App Store / Google Play 的正式版 | 同 Development Build | ❌ 独立运行 | 云端 (EAS Build) |

**关键区别**：Expo Go 的原生层是固定的（Expo 团队预设），你在 `app.json` 中配置的 `plugins`（如 `expo-local-authentication` 的 `faceIDPermission`、`expo-camera` 的权限声明）**不会写入 Expo Go 的原生文件**。它们只在构建你自己的 App 二进制时才生效。

**Development Build 的构建方式**：

```bash
# 方式一：本地构建（需要 Xcode / Android Studio）
npx expo run:ios        # 本地编译 iOS 并安装到模拟器/真机
npx expo run:android    # 本地编译 Android 并安装到模拟器/真机

# 方式二：云端构建（无需本地环境，但需要 EAS 账号）
eas build --profile development --platform ios
# 构建完成后下载 .ipa 安装到真机
```

构建完成后，手机上会多出一个带你项目图标的独立 App。打开它后，它会连接你本地的 Metro dev server（和 Expo Go 一样），支持热更新和 Fast Refresh。**唯一的区别是原生层变成了你自己的配置**，所以 Face ID、自定义 URL Scheme、自定义通知图标等功能全部可用。

**哪些功能需要 Development Build**：

| 功能 | Expo Go | Development Build |
| --- | --- | --- |
| 基础 UI / 路由 / 状态管理 | ✅ | ✅ |
| Touch ID / Android 指纹 | ✅ | ✅ |
| Face ID | ❌ (缺少 NSFaceIDUsageDescription) | ✅ |
| 自定义 URL Scheme (Deep Link) | ❌ (使用 Expo Go 的 scheme) | ✅ |
| 自定义推送通知图标 (Android) | ❌ | ✅ |
| 原生模块 (自定义 Native Module) | ❌ | ✅ |

大多数 Expo SDK 功能在 Expo Go 中可用。需要 Development Build 的场景通常是：需要修改原生配置文件（Info.plist / AndroidManifest）或引入不在 Expo Go 预设中的原生库。

### iOS Face ID 的特殊限制

1. **Info.plist 必须声明** —— 使用 Face ID 必须在 `NSFaceIDUsageDescription` 中说明用途。未声明时 `authenticateAsync()` 会静默回退到设备密码，不弹 Face ID。
2. **Expo Go 不支持 Face ID** —— Expo Go 的 Info.plist 不含你的 `faceIDPermission` 配置，系统拒绝调用 Face ID 并返回 `missing_usage_description` 错误。创建 Development Build 后即可正常使用。Touch ID / Android 指纹不受此限制。
3. **权限弹窗只出现一次** —— 与通知权限类似，Face ID 权限弹窗只弹一次。拒绝后只能引导用户去系统设置手动开启。

### App Lock 的安全边界

生物认证 App Lock 保护的是"UI 访问"，不是"数据访问"。它的安全边界：

| 场景                     | 是否受保护 | 原因                                       |
| ------------------------ | ---------- | ------------------------------------------ |
| 打开 App 看到内容        | ✅ 受保护  | 锁屏遮罩覆盖 UI                           |
| 通过 ADB/调试工具读数据  | ❌ 不受保护| 生物认证是 UI 层面的，不加密存储            |
| 拔掉手机读取文件系统     | ❌ 不受保护| 需要设备级加密（FDE/FBE）保护              |
| 从其他 App 调用 Deep Link| ✅ 受保护  | 锁屏遮罩在根布局层，覆盖所有页面           |

对于需要更高安全性的场景（如金融 App），可以在读取 SecureStore 之前也加一层生物认证验证。

## 4. 最佳实践与坑

### ✅ 推荐做法

1. **认证前先做预检** —— 调用 `authenticateAsync()` 前先检查 `hasHardwareAsync()` + `isEnrolledAsync()`。直接调用也不会崩溃（API 内部有容错），但预检能让 UI 提前给出友好提示而非弹出系统错误弹窗。
2. **允许回退到设备密码** —— 生产 App 应将 `disableDeviceFallback` 设为 `false`（默认值）。指纹可能因手湿、受伤而失败，Face ID 可能因口罩而失败，用户需要备选方案。
3. **锁屏组件放在根布局** —— `BiometricLockScreen` 必须在导航栈之外渲染（绝对定位全屏遮罩），而非作为一个导航页面。导航页面可以被 `router.back()` 跳过，遮罩不行。
4. **开启前验证身份** —— 用户开启 App Lock 前先触发一次认证，防止他人在已解锁手机上开启锁屏。
5. **冷启动自动弹出认证** —— 不要等用户手动点击"解锁"按钮。`isLocked: true` 时自动调用 `authenticateAsync()`，减少操作步骤。

### ❌ 避免做法

1. **不要在 `inactive` 状态就锁定** —— iOS 上下拉通知中心、系统弹窗都会触发 `inactive`，频繁锁定体验极差。等 `background` 再锁。
2. **不要用生物认证替代登录** —— 生物认证验证的是"设备主人"，不是"用户身份"。它不生成 Token，不与服务端交互。登录态过期后必须重新登录，不能用指纹跳过。
3. **不要将生物认证结果持久化** —— `authenticateAsync()` 返回的 `success: true` 是一次性的。不要存到 AsyncStorage 里作为"已验证"标记——那等于把门禁变成了永久通行证。
4. **不要忘记 iOS Face ID 的 Info.plist 配置** —— 缺少 `NSFaceIDUsageDescription` 声明时，Face ID 不会报错，只是静默回退到密码。开发者可能误以为 Face ID 不可用。
5. **不要在 `handleNotification` 等 3 秒超时回调中做认证** —— `authenticateAsync()` 等待用户操作的时间不确定，放在有超时限制的回调中会导致回调超时被丢弃。

## 5. 行动导向 (Action Guide)

### Step 1: 安装依赖

**这一步在干什么**: 安装 `expo-local-authentication`，它封装了 iOS 的 LAContext（Local Authentication framework）和 Android 的 BiometricPrompt API，提供统一的跨平台生物认证接口。

```bash
npx expo install expo-local-authentication
```

### Step 2: 配置 app.json

**这一步在干什么**: 注册 `expo-local-authentication` 的 config plugin。Expo Prebuild 时会将 `faceIDPermission` 写入 iOS 的 `Info.plist` 中的 `NSFaceIDUsageDescription` 字段。Android 端的 `USE_BIOMETRIC` 权限由库自动声明，无需手动配置。

```json
{
  "expo": {
    "plugins": [
      ["expo-local-authentication", {
        "faceIDPermission": "允许 $(PRODUCT_NAME) 使用 Face ID 进行身份验证"
      }]
    ]
  }
}
```

### Step 3: 创建生物认证服务模块

**这一步在干什么**: 在 `src/features/biometric/` 下构建功能模块，遵循 Feature-First 架构。将 `expo-local-authentication` 的原始 API 封装为业务语义清晰的函数，上层组件不直接引用 expo-local-authentication。

```
src/features/biometric/
├── types.ts              → 类型定义（BiometricCapability, AuthResult, AuthOptions）
├── biometricService.ts   → API 封装（能力检测、认证触发、标签映射）
├── useBiometric.ts       → React Hook（状态管理 + 能力检测 + 认证触发）
└── index.ts              → 模块导出
```

**types.ts** 完整代码：

```typescript
import type * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'fingerprint' | 'facial' | 'iris';

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricTypes: BiometricType[];
  securityLevel: LocalAuthentication.SecurityLevel;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

export interface BiometricAuthOptions {
  promptMessage?: string;
  fallbackLabel?: string;
  cancelLabel?: string;
  disableDeviceFallback?: boolean;
}
```

**biometricService.ts** 完整代码：

```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import type {
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricCapability,
  BiometricType,
} from './types';

function mapAuthenticationType(
  type: LocalAuthentication.AuthenticationType,
): BiometricType {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'fingerprint';
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'facial';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'iris';
  }
}

export async function checkBiometricCapability(): Promise<BiometricCapability> {
  const [hasHardware, isEnrolled, supportedTypes, securityLevel] =
    await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);

  return {
    hasHardware,
    isEnrolled,
    biometricTypes: supportedTypes.map(mapAuthenticationType),
    securityLevel,
  };
}

export async function authenticate(
  options?: BiometricAuthOptions,
): Promise<BiometricAuthResult> {
  const capability = await checkBiometricCapability();

  if (!capability.hasHardware) {
    return { success: false, error: '设备不支持生物认证' };
  }

  if (!capability.isEnrolled) {
    return {
      success: false,
      error: '未录入生物信息，请在系统设置中添加指纹或面容',
    };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: options?.promptMessage ?? '验证身份',
    cancelLabel: options?.cancelLabel ?? '取消',
    fallbackLabel: options?.fallbackLabel ?? '使用密码',
    disableDeviceFallback: options?.disableDeviceFallback ?? false,
  });

  if (result.success) {
    return { success: true };
  }

  const silentErrors = new Set(['user_cancel', 'user_fallback']);

  return {
    success: false,
    error: silentErrors.has(result.error) ? undefined : result.error,
    warning: result.warning,
  };
}

export async function isBiometricAvailable(): Promise<boolean> {
  const capability = await checkBiometricCapability();
  return capability.hasHardware && capability.isEnrolled;
}

export function getSecurityLevelLabel(
  level: LocalAuthentication.SecurityLevel,
): string {
  switch (level) {
    case LocalAuthentication.SecurityLevel.NONE:
      return '无认证';
    case LocalAuthentication.SecurityLevel.SECRET:
      return 'SECRET (PIN/Pattern)';
    case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
      return 'BIOMETRIC_WEAK (Class 2)';
    case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
      return 'BIOMETRIC_STRONG (Class 3)';
    default:
      return '未知';
  }
}

export function getBiometricTypeLabel(type: BiometricType): string {
  switch (type) {
    case 'fingerprint':
      return '指纹识别';
    case 'facial':
      return '面容识别';
    case 'iris':
      return '虹膜识别';
  }
}
```

**useBiometric.ts** 完整代码：

```typescript
import { useCallback, useEffect, useState } from 'react';
import {
  authenticate,
  checkBiometricCapability,
  isBiometricAvailable,
} from './biometricService';
import type {
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricCapability,
} from './types';

export function useBiometric() {
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [lastResult, setLastResult] = useState<BiometricAuthResult | null>(null);

  useEffect(() => {
    async function detect() {
      const cap = await checkBiometricCapability();
      setCapability(cap);
      setIsAvailable(cap.hasHardware && cap.isEnrolled);
    }
    detect();
  }, []);

  const refreshCapability = useCallback(async () => {
    const cap = await checkBiometricCapability();
    setCapability(cap);
    const available = await isBiometricAvailable();
    setIsAvailable(available);
  }, []);

  const triggerAuth = useCallback(
    async (options?: BiometricAuthOptions): Promise<BiometricAuthResult> => {
      setIsAuthenticating(true);
      try {
        const result = await authenticate(options);
        setLastResult(result);
        return result;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [],
  );

  return {
    capability,
    isAvailable,
    isAuthenticating,
    lastResult,
    triggerAuth,
    refreshCapability,
  };
}
```

**index.ts** 完整代码：

```typescript
export {
  authenticate,
  checkBiometricCapability,
  getBiometricTypeLabel,
  getSecurityLevelLabel,
  isBiometricAvailable,
} from './biometricService';

export { useBiometric } from './useBiometric';

export type {
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricCapability,
  BiometricType,
} from './types';
```

### Step 4: 扩展存储层

**这一步在干什么**: 在 `src/utils/storage.ts` 的 `storage` 对象中添加生物认证偏好的读写方法。使用 AsyncStorage（非加密）存储是因为"是否开启生物认证"本身不是敏感数据，敏感的 Token 已由 SecureStore 保管。

```typescript
// src/utils/storage.ts 中新增
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export const storage = {
  // ...已有方法

  async getBiometricEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return value === 'true';
    } catch (e) {
      console.error('Error getting biometric preference', e);
      return false;
    }
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
    } catch (e) {
      console.error('Error setting biometric preference', e);
    }
  },
};
```

### Step 5: 创建 Biometric Store

**这一步在干什么**: 使用 Zustand 创建 `biometricStore`，管理 `isEnabled`（偏好开关）和 `isLocked`（运行时锁定态）。`hydrate()` 在应用启动时从 AsyncStorage 恢复偏好，如果用户开启了生物认证，冷启动时自动进入锁定状态。

```typescript
// src/stores/biometricStore.ts
import { create } from 'zustand';
import { storage } from '../utils/storage';

interface BiometricState {
  isEnabled: boolean;
  isLocked: boolean;
  isLoading: boolean;

  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  lock: () => void;
  unlock: () => void;
}

export const useBiometricStore = create<BiometricState>((set, get) => ({
  isEnabled: false,
  isLocked: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const enabled = await storage.getBiometricEnabled();
      set({
        isEnabled: enabled,
        isLocked: enabled,
        isLoading: false,
      });
    } catch (e) {
      console.error('Failed to hydrate biometric state', e);
      set({ isEnabled: false, isLocked: false, isLoading: false });
    }
  },

  setEnabled: async (enabled: boolean) => {
    await storage.setBiometricEnabled(enabled);
    set({
      isEnabled: enabled,
      isLocked: enabled ? get().isLocked : false,
    });
  },

  lock: () => {
    if (get().isEnabled) {
      set({ isLocked: true });
    }
  },

  unlock: () => {
    set({ isLocked: false });
  },
}));
```

### Step 6: 创建 BiometricLockScreen 组件

**这一步在干什么**: 创建全屏锁屏遮罩组件。它同时承担两个职责：（1）监听 AppState 变化触发锁定；（2）渲染不可穿透的遮罩并触发认证。在根布局中无条件挂载，组件内部根据 `isLocked` 决定是否渲染 UI。

```typescript
// src/components/BiometricLockScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import {
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { authenticate } from '../features/biometric';
import { useBiometricStore } from '../stores/biometricStore';

export function BiometricLockScreen() {
  const isEnabled = useBiometricStore((s) => s.isEnabled);
  const isLocked = useBiometricStore((s) => s.isLocked);
  const lock = useBiometricStore((s) => s.lock);
  const unlock = useBiometricStore((s) => s.unlock);
  const isDark = useColorScheme() === 'dark';

  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      const prev = appStateRef.current;
      if (
        isEnabled &&
        (prev === 'active' || prev === 'inactive') &&
        nextState === 'background'
      ) {
        lock();
      }
      appStateRef.current = nextState;
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isEnabled, lock]);

  // 冷启动自动弹出认证
  const hasTriggeredInitialAuth = useRef(false);
  useEffect(() => {
    if (isLocked && !hasTriggeredInitialAuth.current) {
      hasTriggeredInitialAuth.current = true;
      handleUnlock();
    }
  }, [isLocked]);

  const handleUnlock = useCallback(async () => {
    const result = await authenticate({ promptMessage: '解锁 App' });
    if (result.success) {
      unlock();
      hasTriggeredInitialAuth.current = false;
    }
  }, [unlock]);

  if (!isLocked) return null;

  return (
    <View style={[
      styles.overlay,
      { backgroundColor: isDark ? '#030712' : '#f9fafb' },
    ]}>
      {/* 锁定图标 + 提示文字 + 解锁按钮 */}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### Step 7: 集成到根布局

**这一步在干什么**: 在 `app/_layout.tsx` 中挂载 `BiometricLockScreen` 和 `hydrateBiometric`。锁屏组件放在 `AuthGuard` 之后、Provider 内部，确保它在最顶层渲染但仍能访问 Context。

```typescript
// app/_layout.tsx 新增
import { BiometricLockScreen } from '../src/components/BiometricLockScreen';
import { useBiometricStore } from '../src/stores/biometricStore';

export default function RootLayout() {
  const hydrateBiometric = useBiometricStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    hydrateTheme();
    hydrateBiometric();
  }, [hydrate, hydrateTheme, hydrateBiometric]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <AuthGuard />
          <BiometricLockScreen />
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

### Step 8: 创建演示页面并注册入口

**这一步在干什么**: 创建 `app/(screens)/biometric-lab.tsx` 作为交互式演示中心，包含五个功能区。在 `app/(tabs)/explore.tsx` 的 `DEMO_SECTIONS` 中注册入口卡片。

演示页面结构：

```
biometric-lab.tsx
├── CapabilitySection    → 设备硬件/录入/类型/安全等级检测
├── AuthDemoSection      → 触发认证（带回退 vs 仅生物），展示结果
├── AppLockSection       → App 锁开关（Switch + 验证前置）
├── SecurityArchSection  → 安全存储架构图（SecureStore / AsyncStorage / Biometric 三层）
└── ApiReferenceSection  → API 速查表
```

Explore 入口：

```typescript
{
  id: 'biometric',
  title: '生物认证与安全',
  description: '指纹/Face ID、App 锁、安全存储架构',
  icon: 'finger-print',
  tags: ['expo-local-authentication', 'App Lock', 'SecureStore'],
  route: '/biometric-lab' as Href,
},
```

完整代码见项目文件 `app/(screens)/biometric-lab.tsx`。
