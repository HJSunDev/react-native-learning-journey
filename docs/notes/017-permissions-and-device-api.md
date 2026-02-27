# 017. 权限与设备 API

## 1. 核心问题与概念

### 解决什么问题

App 需要访问设备硬件（相机、GPS、麦克风）和系统服务（剪贴板、分享、文件系统）来提供原生体验。但操作系统不会让 App 随意访问这些资源——每一项敏感能力都受 **运行时权限** (Runtime Permission) 保护。开发者面临三个工程挑战：

1. **权限 API 碎片化** —— 每个 Expo 模块暴露独立的 `getXxxPermissionsAsync()` / `requestXxxPermissionsAsync()` 方法，没有统一的调用范式，导致权限逻辑在各个页面中重复散落。
2. **权限被拒后的 UX 处理** —— 用户拒绝授权后，iOS 不会再弹系统弹窗（`canAskAgain = false`），必须引导用户跳转到系统设置。很多 App 忽略了这一步，导致功能"静默失效"。
3. **设备 API 的跨平台差异** —— iOS 和 Android 在权限弹窗时机、权限粒度（前台定位 vs 后台定位）、API 行为上存在差异。

### 核心概念与依赖

| 层级 | 技术 | 角色 |
|------|------|------|
| 抽象层 | `usePermission` Hook（自建） | 统一封装权限的检查、请求、拒绝处理，通过 Adapter 接口适配各模块 |
| 权限层 | 各 Expo 模块内置的 Permission API | 每个模块暴露 `getXxxPermissionsAsync` / `requestXxxPermissionsAsync` |
| 硬件层 | `expo-camera` | CameraView 组件 + 拍照 / 二维码扫描 |
| 硬件层 | `expo-location` | GPS 定位 + 反向地理编码（坐标 → 地址） |
| 系统层 | `expo-clipboard` | 系统剪贴板读写（无需权限） |
| 系统层 | React Native `Share` API | 唤起系统原生分享面板（无需权限） |
| 系统层 | `Linking.openSettings()` | 跳转到 App 的系统设置页（用于引导用户手动开启被拒绝的权限） |

### 依赖解析

```
设备 API 调用栈

App 组件
  └── usePermission(adapter, featureName)    ← 统一权限 Hook
        ├── adapter.get()                    ← 各模块的权限检查
        ├── adapter.request()                ← 各模块的权限请求
        └── Linking.openSettings()           ← 被拒后引导至系统设置

不同模块的 Adapter 实例：
  ├── Camera:   { get: getCameraPermissionsAsync, request: requestCameraPermissionsAsync }
  └── Location: { get: getForegroundPermissionsAsync, request: requestForegroundPermissionsAsync }
```

### 权限状态机

```
  ┌─────────────┐
  │   loading   │ ← mount 时检查当前状态
  └──────┬──────┘
         ↓ get() 返回
  ┌──────┴──────┐
  │ undetermined│ ← 从未请求过
  └──────┬──────┘
         ↓ request()
    ┌────┴────┐
    ↓         ↓
┌───────┐ ┌──────┐
│granted│ │denied│ ← 用户拒绝，但还能再问
└───────┘ └──┬───┘
             ↓ 再次 request() 被拒
         ┌───┴───┐
         │blocked│ ← canAskAgain = false，只能跳设置
         └───────┘
```


## 2. 核心用法 / 方案设计

### 场景 A: 统一权限管理 — usePermission Hook + Adapter Pattern

所有 Expo 模块的权限 API 都遵循相同的接口形状：`get()` 返回 `{ granted, canAskAgain }`，`request()` 返回同样的结构。利用这个共性，定义一个 `PermissionAdapter` 接口，将不同模块的权限操作统一为可互换的适配器。

**类型定义**

```typescript
// src/features/device/types.ts

export type PermissionState =
  | 'loading'       // mount 时正在检查
  | 'undetermined'  // 从未请求
  | 'granted'       // 已授权
  | 'denied'        // 拒绝但还能再问
  | 'blocked';      // 拒绝且不再询问（需跳设置）

export interface PermissionAdapter {
  get: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  request: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
}
```

**Hook 实现**

```typescript
// src/features/device/usePermission.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import type { PermissionAdapter, PermissionState } from './types';

export function usePermission(
  adapter: PermissionAdapter,
  featureName: string,
) {
  const [state, setState] = useState<PermissionState>('loading');
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  // mount 时自动检查当前权限状态
  useEffect(() => {
    let mounted = true;
    adapterRef.current
      .get()
      .then((res) => {
        if (!mounted) return;
        if (res.granted) setState('granted');
        else if (!res.canAskAgain) setState('blocked');
        else setState('undetermined');
      })
      .catch(() => {
        if (mounted) setState('undetermined');
      });
    return () => { mounted = false; };
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    const res = await adapterRef.current.request();
    if (res.granted) {
      setState('granted');
      return true;
    }
    if (!res.canAskAgain) {
      setState('blocked');
      Alert.alert(
        `需要${featureName}权限`,
        `请在系统设置中允许访问${featureName}`,
        [
          { text: '取消', style: 'cancel' },
          { text: '打开设置', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    setState('denied');
    return false;
  }, [featureName]);

  return {
    state,
    isGranted: state === 'granted',
    request,
    openSettings: useCallback(() => Linking.openSettings(), []),
  };
}
```

**使用方式：模块级常量 Adapter + Hook 调用**

```typescript
// app/(screens)/device-lab.tsx

// expo-camera 的权限函数不是模块顶级导出，
// 而是挂在 `export const Camera = { ... }` 命名导出对象上
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { usePermission, type PermissionAdapter } from '../../src/features/device';

// 模块级常量，引用天然稳定，无需 useMemo
const CAMERA_ADAPTER: PermissionAdapter = {
  get: Camera.getCameraPermissionsAsync,
  request: Camera.requestCameraPermissionsAsync,
};

const LOCATION_ADAPTER: PermissionAdapter = {
  get: Location.getForegroundPermissionsAsync,
  request: Location.requestForegroundPermissionsAsync,
};

function DeviceLabScreen() {
  const cameraPermission = usePermission(CAMERA_ADAPTER, '相机');
  const locationPermission = usePermission(LOCATION_ADAPTER, '定位');

  // cameraPermission.state    → 'loading' | 'undetermined' | 'granted' | ...
  // cameraPermission.isGranted → boolean
  // cameraPermission.request() → Promise<boolean>
}
```

### expo-image-picker vs expo-camera：两种"相机"的本质区别

Chapter 14（图片与媒体）使用的 `expo-image-picker` 和本章的 `expo-camera` 都涉及相机，但它们解决的是完全不同的问题：

| | expo-image-picker (Chapter 14) | expo-camera (Chapter 17) |
|---|---|---|
| **本质** | 调用**系统相机/相册 App**，拿回结果图片 | 在你的 App 内**嵌入实时相机视图** |
| **UI 控制权** | 零 —— 系统接管全部 UI | 完全自定义（按钮、覆盖层、扫码框） |
| **核心 API** | `launchCameraAsync()` 纯函数调用 | `<CameraView>` 原生视图组件 + ref 方法 |
| **权限处理** | 内部自动处理，调用时系统弹窗 | 需要自己管理权限生命周期 |
| **条码扫描** | 不支持 | 支持（`onBarcodeScanned`） |
| **实时预览** | 不支持（系统相机 UI） | 支持（嵌入 App 视图树） |
| **典型场景** | 用户上传头像、发帖选图 | 二维码扫描、自定义取景框、AR |

**选择依据**：如果你只需要"让用户拍张照或选张图"，用 `expo-image-picker`（简单、不需要自己管理权限）；如果你需要"在 App 内嵌入实时相机画面"（扫码、自定义拍照界面），用 `expo-camera`。

### 场景 B: 相机 — 拍照与二维码扫描

expo-camera 提供 `CameraView` 组件，在视图树中渲染实时相机预览。通过 ref 调用 `takePictureAsync()` 拍照，通过 `onBarcodeScanned` 回调实现扫码。

**拍照**

```tsx
import { CameraView } from 'expo-camera';
import { useRef, useState } from 'react';

function CameraDemo() {
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handleCapture = async () => {
    const result = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (result?.uri) setPhotoUri(result.uri);
  };

  return (
    <CameraView ref={cameraRef} style={{ height: 300 }} facing={facing}>
      <Pressable onPress={handleCapture}>
        {/* 拍照按钮 */}
      </Pressable>
      <Pressable onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
        {/* 翻转按钮 */}
      </Pressable>
    </CameraView>
  );
}
```

**二维码扫描**

```tsx
<CameraView
  onBarcodeScanned={({ data }) => {
    // data 是扫描到的内容（URL、文本等）
    Alert.alert('扫描结果', data);
  }}
  barcodeScannerSettings={{
    barcodeTypes: ['qr', 'ean13', 'code128'],
  }}
/>
```

`onBarcodeScanned` 会在每一帧检测到条码时持续触发。生产环境需要用 `scanned` 标志位防止重复响应：

```typescript
const [scanned, setScanned] = useState(false);

const handleBarcode = ({ data }: { data: string }) => {
  if (scanned) return;
  setScanned(true);
  Alert.alert('结果', data, [
    { text: '继续扫描', onPress: () => setScanned(false) },
  ]);
};
```

### 场景 C: 定位 — GPS 坐标与反向地理编码

expo-location 提供两层定位能力：

| API | 功能 | 权限要求 |
|-----|------|---------|
| `getCurrentPositionAsync()` | 获取一次性 GPS 坐标 | 前台定位权限 |
| `watchPositionAsync()` | 持续监听位置变化 | 前台定位权限 |
| `reverseGeocodeAsync()` | 坐标 → 可读地址 | 无额外权限 |
| `startLocationUpdatesAsync()` | 后台持续定位 | 后台定位权限（需额外配置） |

**获取当前位置 + 反向地理编码**

```typescript
import * as Location from 'expo-location';

async function getLocation() {
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = pos.coords;

  // 反向地理编码可能因网络或配额失败，应独立 try-catch
  try {
    const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const address = [geo.country, geo.region, geo.city, geo.street]
      .filter(Boolean)
      .join(' ');
  } catch {
    // 降级处理：仅显示坐标
  }
}
```

**定位精度等级**

```typescript
Location.Accuracy.Lowest       // ~3000m，最省电
Location.Accuracy.Low          // ~1000m
Location.Accuracy.Balanced     // ~100m，推荐默认值
Location.Accuracy.High         // ~10m
Location.Accuracy.Highest      // ~1m，最耗电
Location.Accuracy.BestForNavigation  // 导航级，持续高精度
```

### 场景 D: 剪贴板 — 读写系统剪贴板

expo-clipboard 的 API 极其简洁，且**不需要任何权限**。

```typescript
import * as Clipboard from 'expo-clipboard';

// 写入剪贴板
await Clipboard.setStringAsync('Hello!');

// 读取剪贴板
const text = await Clipboard.getStringAsync();
```

> iOS 14+ 在 App 读取剪贴板时会显示一个系统级横幅提示（"xxx pasted from yyy"），
> 这是系统行为，无法禁用，也不需要申请权限。

### 场景 E: 系统分享 — 原生分享面板

React Native 内置的 `Share` API 可以唤起系统原生分享面板，无需额外安装任何包。

```typescript
import { Share } from 'react-native';

async function handleShare() {
  try {
    const result = await Share.share({
      title: '分享标题',      // Android 分享对话框标题
      message: '分享内容文本\nhttps://example.com',
    });
    // result.action: 'sharedAction' | 'dismissedAction'
  } catch (e) {
    // 用户取消不算错误，但网络/系统异常需要捕获
  }
}
```

`Share.share()` 与 `expo-sharing` 的区别：

| | `Share` (RN 内置) | `expo-sharing` |
|---|---|---|
| 分享内容 | 文本 / URL | 本地文件 |
| 安装 | 无需安装 | 需安装 expo-sharing |
| 适用场景 | "分享这篇文章" | "导出 PDF / 发送图片文件" |


## 3. 深度原理与机制

### 权限模型的平台差异

**iOS 权限机制**

iOS 的权限弹窗由系统控制，每种权限**最多弹一次**。用户拒绝后，再次调用 `request()` **不会再弹窗**，而是直接返回 `{ granted: false, canAskAgain: false }`。唯一的恢复路径是引导用户到 `设置 → App名称 → 权限` 手动开启。

权限描述字符串（如 `cameraPermission: "允许 xxx 使用相机"`）配置在 `app.json` 的 plugins 中，编译时写入 `Info.plist`。如果缺失描述字符串，App 提交到 App Store 会被拒绝。

**Android 权限机制**

Android 从 6.0 (API 23) 开始引入运行时权限。与 iOS 的关键区别：

1. 首次弹窗有"不再询问"复选框 —— 勾选后 `canAskAgain = false`
2. 部分权限会自动降级（如定位精度可以降为"大致位置"）
3. Android 11+ 如果用户多次拒绝，系统会自动变为"不再询问"

**统一处理策略**

`usePermission` Hook 通过 `canAskAgain` 字段抹平了平台差异：
- `canAskAgain = true` → 还能弹系统弹窗 → 调用 `request()`
- `canAskAgain = false` → 系统不再弹窗 → Alert 引导 + `Linking.openSettings()`

### Adapter Pattern 的架构意义

`PermissionAdapter` 接口看似简单（只有 `get` 和 `request` 两个方法），但它解决了一个关键的 **依赖倒置** 问题：

```
不用 Adapter:
  DeviceLabScreen → 直接依赖 expo-camera, expo-location 的权限 API
  SettingsScreen  → 再次重复权限检查/请求/拒绝处理逻辑

用 Adapter:
  DeviceLabScreen ─┐
                   ├──→ usePermission(adapter) ←── PermissionAdapter 接口
  SettingsScreen  ─┘                                      ↑
                                            expo-camera / expo-location 实现
```

上层组件只依赖 `usePermission` + `PermissionAdapter` 接口，不直接依赖具体的 Expo 模块。未来添加新权限时，只需提供新的 Adapter 常量：

```typescript
// 麦克风权限（expo-camera 同时导出了麦克风权限函数，用于录制视频时的音频采集）
const MICROPHONE_ADAPTER: PermissionAdapter = {
  get: Camera.getMicrophonePermissionsAsync,
  request: Camera.requestMicrophonePermissionsAsync,
};

// 通讯录、日历等未来扩展同理
```

### 麦克风权限：何时需要

`expo-camera` 模块同时管理了**相机权限**和**麦克风权限**，因为录制视频需要同时授权两者。它们是独立的两个权限，各自有独立的 get/request 方法：

| 权限 | 用途 | 方法 |
|------|------|------|
| 相机 | 拍照、实时预览、条码扫描 | `Camera.getCameraPermissionsAsync` / `Camera.requestCameraPermissionsAsync` |
| 麦克风 | 视频录制时的音频采集 | `Camera.getMicrophonePermissionsAsync` / `Camera.requestMicrophonePermissionsAsync` |

本章示例聚焦于拍照和扫码（不录制视频），因此只请求了相机权限。如果你的 App 需要录制视频，需要同时请求两个权限：

```typescript
const cameraPermission = usePermission(CAMERA_ADAPTER, '相机');
const micPermission = usePermission(MICROPHONE_ADAPTER, '麦克风');

// 录制视频前，两个都必须 granted
const canRecord = cameraPermission.isGranted && micPermission.isGranted;
```

### CameraView 的渲染机制

`CameraView` 不是 Web 风格的 `<video>` 标签，而是一个 **原生视图桥接组件**：

```
React 组件树
  └── <CameraView facing="back" />
        ↓ React Native Bridge
        ├── iOS:  AVCaptureSession → AVCaptureVideoPreviewLayer
        └── Android: Camera2 API → TextureView/SurfaceView
```

它在原生层启动相机会话，将实时画面渲染到一个原生 View 中，React 侧通过 ref 的 `takePictureAsync()` 方法向原生层发送拍照指令。因此：

1. `CameraView` 挂载时会启动相机硬件，卸载时自动释放 —— 不使用时应移除组件（而非隐藏）以释放资源
2. 相机预览的帧率和分辨率由原生层控制，不受 JS 线程性能影响
3. `onBarcodeScanned` 在原生层执行图像识别，仅将结果通过 bridge 回传 JS —— 扫描性能不受 JS 线程阻塞

### 定位精度与电量的权衡

`Location.Accuracy` 枚举控制 GPS 芯片的工作模式：

| 精度等级 | 原理 | 误差 | 耗电 |
|---------|------|------|------|
| Lowest / Low | Wi-Fi + 基站三角定位 | 1-3km | 极低 |
| Balanced | Wi-Fi + 基站 + 辅助 GPS | ~100m | 低 |
| High | GPS 卫星定位 | ~10m | 中 |
| Highest | GPS + GLONASS + Galileo 多星座 | ~1m | 高 |
| BestForNavigation | 持续高精度 + 惯性导航 | <1m | 极高 |

`getCurrentPositionAsync()` 是一次性获取（获取后 GPS 芯片回到低功耗），而 `watchPositionAsync()` 会持续占用 GPS。使用 `Balanced` 作为默认精度是大多数场景的最佳权衡。


## 4. 最佳实践与坑

### ✅ 推荐做法

1. **Just-in-Time 请求** —— 在用户主动触发功能时才请求权限（如点击"拍照"按钮），而非 App 启动时一次性弹出所有权限请求。前者的授权率远高于后者。
2. **Adapter 常量放在模块级** —— `PermissionAdapter` 对象作为模块级常量定义（组件外部），引用天然稳定，无需 `useMemo`。
3. **blocked 状态必须有 UX 出口** —— 当 `canAskAgain = false` 时，必须通过 Alert 或 UI 引导用户跳转到系统设置页。否则功能"静默死掉"，用户误以为 App 有 bug。
4. **CameraView 不用时及时卸载** —— 用 `{active && <CameraView />}` 条件渲染，而非 `display: none`。相机硬件持续运行会消耗电量和内存。
5. **反向地理编码独立 try-catch** —— `reverseGeocodeAsync` 依赖网络和 Apple/Google 地图服务配额，失败不应阻塞主定位流程。
6. **扫码用标志位防重复** —— `onBarcodeScanned` 在检测到条码的每一帧都会触发，必须用 `scanned` 状态变量做门控。

### ❌ 避免做法

1. **不要在 App 启动时请求所有权限** —— 用户看到连续弹窗会习惯性全部拒绝。
2. **不要忽略 `canAskAgain` 字段** —— 这是区分"可重试"和"需跳设置"的关键。
3. **不要把 Adapter 对象内联在组件中** —— `{ get: fn, request: fn }` 在每次渲染都会创建新对象，导致 `usePermission` 内部的 useEffect 依赖不稳定。
4. **不要在定位时使用 `Accuracy.Highest`** —— 除非场景确实需要亚米级精度（如导航），否则 `Balanced` 足够且省电。
5. **不要在 Web 端调用硬件 API 而不做平台检查** —— `expo-camera` 和 `expo-location` 在 Web 上的支持有限，需要 `Platform.OS !== 'web'` 守卫或 try-catch。
6. **不要忘记在 `app.json` 中配置权限描述** —— iOS 的 `Info.plist` 权限描述字符串是 App Store 审核的硬性要求。


## 5. 行动导向 (Action Guide)

### Step 1: 安装设备 API 依赖

**这一步在干什么**: 安装 expo-camera（相机）、expo-location（定位）、expo-clipboard（剪贴板）三个 Expo 模块。使用 `npx expo install` 而非 `npm install`，因为它会自动选择与当前 Expo SDK 版本兼容的包版本。

```bash
npx expo install expo-camera expo-location expo-clipboard
```

### Step 2: 配置 app.json 权限描述

**这一步在干什么**: 在 `app.json` 的 `plugins` 中声明权限描述字符串。Expo 在构建时将这些字符串写入 iOS 的 `Info.plist` 和 Android 的 `AndroidManifest.xml`。缺失描述会导致 iOS App Store 审核被拒。

```json
{
  "expo": {
    "plugins": [
      ["expo-camera", {
        "cameraPermission": "允许 rn-journey 使用相机拍照和扫描二维码"
      }],
      ["expo-location", {
        "locationWhenInUsePermission": "允许 rn-journey 获取您的位置信息"
      }]
    ]
  }
}
```

### Step 3: 创建统一权限模块

**这一步在干什么**: 在 `src/features/device/` 下创建 `types.ts`（权限状态类型 + Adapter 接口）、`usePermission.ts`（权限生命周期 Hook）、`index.ts`（模块导出）。这个模块是权限体系的核心抽象层。

```
src/features/device/
├── types.ts          → PermissionState 枚举 + PermissionAdapter 接口
├── usePermission.ts  → 统一权限 Hook（检查 → 请求 → 拒绝处理）
└── index.ts          → 模块对外导出
```

**types.ts** 完整代码：

```typescript
export type PermissionState =
  | 'loading'
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'blocked';

export interface PermissionAdapter {
  get: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  request: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
}
```

**usePermission.ts** 完整代码：

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import type { PermissionAdapter, PermissionState } from './types';

interface UsePermissionReturn {
  state: PermissionState;
  isGranted: boolean;
  request: () => Promise<boolean>;
  openSettings: () => void;
}

export function usePermission(
  adapter: PermissionAdapter,
  featureName: string,
): UsePermissionReturn {
  const [state, setState] = useState<PermissionState>('loading');
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  useEffect(() => {
    let mounted = true;
    adapterRef.current
      .get()
      .then((res) => {
        if (!mounted) return;
        if (res.granted) setState('granted');
        else if (!res.canAskAgain) setState('blocked');
        else setState('undetermined');
      })
      .catch(() => {
        if (mounted) setState('undetermined');
      });
    return () => { mounted = false; };
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    const res = await adapterRef.current.request();
    if (res.granted) {
      setState('granted');
      return true;
    }
    if (!res.canAskAgain) {
      setState('blocked');
      Alert.alert(
        `需要${featureName}权限`,
        `请在系统设置中允许访问${featureName}`,
        [
          { text: '取消', style: 'cancel' },
          { text: '打开设置', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    setState('denied');
    return false;
  }, [featureName]);

  return {
    state,
    isGranted: state === 'granted',
    request,
    openSettings: useCallback(() => Linking.openSettings(), []),
  };
}
```

**index.ts** 完整代码：

```typescript
export { usePermission } from './usePermission';
export type { PermissionAdapter, PermissionState } from './types';
```

### Step 4: 创建 Device Lab 演示页面

**这一步在干什么**: 创建 `app/(screens)/device-lab.tsx`，作为设备 API 的交互式演示中心。包含权限状态总览、相机拍照/扫码、GPS 定位、剪贴板读写、系统分享五个功能区。在 `(screens)` 路由组内，自动继承自定义 ScreenHeader。

页面结构：
```
device-lab.tsx
├── PermissionDashboard   → 权限状态一览（相机 + 定位）
├── ArchitectureDiagram   → 权限生命周期流程图
├── CameraSection         → 拍照 / 扫码（需权限）
├── LocationSection       → GPS + 反向地理编码（需权限）
├── ClipboardSection      → 读写剪贴板（无需权限）
└── ShareSection          → 系统分享面板（无需权限）
```

Adapter 常量定义在模块级（组件外部），确保引用稳定：

```typescript
// expo-camera 的权限函数挂在命名导出 Camera 对象上（见 rn-platform-pitfalls 规则 #5）
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { usePermission, type PermissionAdapter } from '../../src/features/device';

const CAMERA_ADAPTER: PermissionAdapter = {
  get: Camera.getCameraPermissionsAsync,
  request: Camera.requestCameraPermissionsAsync,
};

const LOCATION_ADAPTER: PermissionAdapter = {
  get: Location.getForegroundPermissionsAsync,
  request: Location.requestForegroundPermissionsAsync,
};
```

完整代码见项目文件 `app/(screens)/device-lab.tsx`。

### Step 5: 在发现页注册演示入口

**这一步在干什么**: 在 `app/(tabs)/explore.tsx` 的 `DEMO_SECTIONS` 数组中追加一个条目，使 Device Lab 出现在"发现"Tab 的功能列表中。

```typescript
// app/(tabs)/explore.tsx — DEMO_SECTIONS 追加：
{
  id: 'device',
  title: '权限与设备 API',
  description: '相机、定位、剪贴板、系统分享',
  icon: 'hardware-chip-outline',
  tags: ['expo-camera', 'expo-location', 'Permissions'],
  route: '/device-lab' as Href,
},
```
