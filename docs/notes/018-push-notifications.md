# 018. 推送通知

## 1. 核心问题与概念

### 解决什么问题

App 需要在用户没有主动使用时仍能触达用户——定时提醒、消息推送、订单状态更新等。通知系统是移动端与用户保持"异步连接"的核心能力。开发者面临三个工程挑战：

1. **本地 vs 远程的双轨调度** —— 本地通知由 App 自行调度（定时器、日历匹配），远程推送由服务端经 APNs / FCM 投递。两者的触发机制完全不同，但展示和交互逻辑需要统一。
2. **前台/后台/冷启动三种通知接收场景** —— App 在前台时，系统默认不展示 banner；在后台或被杀死后，通知点击需要恢复导航上下文。不同场景的处理代码完全不同。
3. **平台差异** —— Android 需要创建 Notification Channel（8.0+），iOS 的权限弹窗只弹一次，两端的角标行为、权限粒度也不一样。

### 核心概念与依赖

| 层级     | 技术                   | 角色                                                  |
| -------- | ---------------------- | ----------------------------------------------------- |
| 统一入口 | `expo-notifications` | 封装 APNs（iOS）和 FCM（Android）的通知 API           |
| 设备检测 | `expo-device`        | 判断物理设备 vs 模拟器（Push Token 仅物理设备可用）   |
| 项目标识 | `expo-constants`     | 获取 EAS projectId（生成 Expo Push Token 的必要参数） |
| 导航集成 | `expo-router`        | 通知点击后的页面跳转                                  |

### 通知系统的三个核心角色

```
1. Notification Handler（前台策略）
   → setNotificationHandler()
   → App 在前台时收到通知，决定是否展示 banner / 播放声音 / 设置角标

2. Notification Listener（事件监听）
   → addNotificationReceivedListener()     — 前台收到通知
   → addNotificationResponseReceivedListener() — 用户点击通知

3. Notification Scheduler（调度器）
   → scheduleNotificationAsync()  — 调度本地通知
   → 远程推送由服务端触发，不需要客户端主动调度
```

### 本地通知 vs 远程推送

两者在用户端看起来完全一样（都是系统通知栏弹出的消息），但触发方在不同的地方。

**本地通知 = App 自己定的闹钟**，触发时间在 App 安装时就能确定，不依赖外部事件：

| 场景                      | 原因                                 |
| ------------------------- | ------------------------------------ |
| 番茄钟：25 分钟后提醒休息 | 用户点击"开始"那一刻就能算出触发时间 |
| 喝水提醒：每小时提醒一次  | 固定间隔，客户端自行调度             |
| 待办到期：明天上午 9 点   | 用户创建待办时就确定了提醒时间       |
| 生日提醒：每年 3 月 15 日 | 日历匹配，完全本地                   |

**远程推送 = 服务端主动找你**，触发时机取决于 App 外部发生的事件，客户端无法提前知道：

| 场景                   | 原因                       |
| ---------------------- | -------------------------- |
| 微信：有人给你发了消息 | App 无法预知别人何时发消息 |
| 淘宝：你的快递已签收   | 物流状态是外部系统触发的   |
| 新闻：突发新闻推送     | 编辑发布时间不可预知       |
| 外卖：骑手已到楼下     | 骑手位置是实时的服务端数据 |

**一句话区分**：如果"什么时候通知"在 App 安装时就能算出来，用本地通知；如果取决于外部世界发生了什么，用远程推送。

|                        | 本地通知                               | 远程推送                                    |
| ---------------------- | -------------------------------------- | ------------------------------------------- |
| **触发方**       | App 客户端自行调度                     | 服务端通过推送服务（APNs / FCM / 厂商通道） |
| **网络依赖**     | 无需网络                               | 必须在线接收                                |
| **Token**        | 不需要                                 | 需要设备推送 Token                          |
| **App 被杀死**   | 已调度的通知照常触发（系统调度器管理） | 照常送达（系统级推送通道）                  |
| **Expo Go 支持** | 可用                                   | Android SDK 53+ 需 Development Build        |

## 2. 核心用法 / 方案设计

### 场景 A: 前台通知展示策略 — setNotificationHandler

App 在前台运行时收到通知，默认不会展示 banner。需要通过 `setNotificationHandler` 全局注册展示策略：

```typescript
// app/_layout.tsx（模块顶层，仅执行一次）
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,   // 展示顶部横幅
    shouldShowList: true,     // 展示在通知中心列表
    shouldPlaySound: true,    // 播放提示音
    shouldSetBadge: false,    // 不自动更新角标（由业务逻辑控制）
  }),
});
```

此函数必须在 App 加载的最早阶段调用（模块级别，而非组件内），且回调必须在 3 秒内返回，否则通知会被丢弃。

### 场景 B: 请求通知权限

iOS 的权限弹窗只弹一次，Android 13+ 需要先创建 Channel 才会触发权限弹窗：

```typescript
// src/features/notifications/notificationService.ts

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Android 13+ 要求至少创建一个 Channel 后，系统才会弹出通知权限弹窗
  await Notifications.setNotificationChannelAsync('default', {
    name: '默认通知',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  // iOS 拒绝后 canAskAgain 为 false，系统不会再弹权限弹窗
  if (!existing.canAskAgain) {
    Alert.alert('需要通知权限', '请在系统设置中允许通知', [
      { text: '取消', style: 'cancel' },
      { text: '打开设置', onPress: () => Linking.openSettings() },
    ]);
    return false;
  }

  const result = await Notifications.requestPermissionsAsync();

  if (result.granted) return true;

  if (!result.canAskAgain) {
    Alert.alert('需要通知权限', '请在系统设置中允许通知', [
      { text: '取消', style: 'cancel' },
      { text: '打开设置', onPress: () => Linking.openSettings() },
    ]);
  }

  return false;
}
```

### 场景 C: 调度本地通知

本地通知通过 `scheduleNotificationAsync` 调度，trigger 参数决定何时触发：

```typescript
// 立即触发
await Notifications.scheduleNotificationAsync({
  content: {
    title: '即时通知',
    body: '这条通知立即展示',
    data: { url: '/notification-lab' },
  },
  trigger: null,  // null = 立即触发
});

// 延迟 N 秒后触发
await Notifications.scheduleNotificationAsync({
  content: {
    title: '延时通知',
    body: '5 秒后到达',
    data: { url: '/notification-lab' },
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 5,
    repeats: false,  // true = 重复触发（最少 60 秒间隔）
  },
});

// 指定日期触发
await Notifications.scheduleNotificationAsync({
  content: { title: '日历通知', body: '整点提醒' },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: new Date(Date.now() + 3600 * 1000),  // 1 小时后
  },
});
```

`scheduleNotificationAsync` 返回 `string` 类型的通知 ID，可用于后续取消：

```typescript
const id = await Notifications.scheduleNotificationAsync({ ... });
await Notifications.cancelScheduledNotificationAsync(id);
```

### 场景 D: 获取 Expo Push Token（远程推送准备）

Expo Push Token 是 Expo Push Service 用来定位设备的唯一标识。获取流程：

```typescript
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export async function getExpoPushToken(): Promise<string> {
  // Push Token 仅物理设备可用
  if (!Device.isDevice) {
    throw new Error('Push Token 仅在物理设备上可用');
  }

  // EAS projectId 是 Expo Push Service 的项目标识
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    throw new Error('未找到 EAS projectId');
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;  // 格式: ExponentPushToken[xxxxxx]
}
```

获取到 Token 后，需要将其上报到你的服务端存储，服务端发送推送时使用此 Token。

### 场景 E: 通知点击 → 页面导航

通知的 `data` 字段携带导航目标，点击时由监听器解析并跳转：

```typescript
// src/features/notifications/useNotificationObserver.ts
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

export function useNotificationObserver() {
  useEffect(() => {
    function redirect(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url as never);
      }
    }

    // 冷启动：App 从被杀死状态因通知点击而启动
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      redirect(lastResponse.notification);
    }

    // 热启动 / 后台恢复
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        redirect(response.notification);
      });

    return () => subscription.remove();
  }, []);
}
```

此 Hook 在根布局（`app/_layout.tsx`）中调用，确保覆盖所有启动场景。

### 场景 F: 角标管理

角标是 App 图标右上角的数字标记：

```typescript
import * as Notifications from 'expo-notifications';

// 读取当前角标
const count = await Notifications.getBadgeCountAsync();

// 设置角标
await Notifications.setBadgeCountAsync(5);

// 清除角标
await Notifications.setBadgeCountAsync(0);
```

iOS 需要通知权限的 `allowBadge` 授权。并非所有 Android 启动器都支持角标。

### 场景 G: 清除通知中心

```typescript
// 清除通知中心（托盘）里所有已展示的通知
await Notifications.dismissAllNotificationsAsync();

// 清除单条
await Notifications.dismissNotificationAsync(notificationId);
```

注意区分：`dismiss` 移除的是已展示在通知中心的通知，`cancel` 取消的是已调度但尚未触发的通知。

## 3. 深度原理与机制

### 通知的完整生命周期

```
调度阶段
  scheduleNotificationAsync(content, trigger)
    ↓
    ├── trigger: null → 立即交给系统通知中心
    └── trigger: TIME_INTERVAL / DATE / CALENDAR
          → 由系统调度器在指定时间触发
              ↓
展示阶段
  ┌── App 在前台 ────────────────────────
  │ setNotificationHandler.handleNotification()  
  │   返回 shouldShowBanner: true → 展示  
  │   返回 shouldShowBanner: false → 静默   
  └────────────────────────────────────────
  ┌── App 在后台/被杀死 ──────────────────
  │ 系统直接展示通知，不经过 JS 代码  
  └────────────────────────────────────────
              ↓
交互阶段
  用户点击通知
    ↓
  ├── App 在前台/后台 → addNotificationResponseReceivedListener
  └── App 被杀死（冷启动）→ getLastNotificationResponse()
```

### Android Notification Channel 机制

Android 8.0 (API 26) 引入了 Notification Channel。每个通知必须关联到一个 Channel，用户可以在系统设置中独立控制每个 Channel 的行为（声音、振动、优先级、是否静音）。

```typescript
await Notifications.setNotificationChannelAsync('order_updates', {
  name: '订单更新',
  description: '订单状态变化的实时通知',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250],
  sound: 'default',
});
```

`importance` 等级决定通知的展示方式：

| 等级        | 行为                           |
| ----------- | ------------------------------ |
| `DEFAULT` | 通知栏显示 + 无声音            |
| `HIGH`    | 弹出悬浮通知（heads-up）+ 声音 |
| `MAX`     | 同 HIGH，用于紧急通知          |
| `LOW`     | 仅通知栏，无声音无振动         |
| `MIN`     | 折叠在通知栏底部               |

Channel 创建后，只能修改 `name` 和 `description`，其他属性（importance、sound 等）一旦创建就由用户在系统设置中控制。

### 远程推送的完整链路

```
你的服务端
  ↓ POST https://exp.host/--/api/v2/push/send
  ↓ Body: { to: "ExponentPushToken[xxx]", title: "...", body: "..." }
Expo Push Service
  ├── iOS 设备 → 转发到 APNs (Apple Push Notification service)
  │     ↓ APNs → iOS 设备
  └── Android 设备 → 转发到 FCM (Firebase Cloud Messaging)
        ↓ FCM → Android 设备
              ↓
设备收到推送 → 触发 NotificationReceived / Response listener
```

Expo Push Service 是一个中间代理层，它封装了 APNs 和 FCM 的复杂认证流程，你只需要发送 HTTP 请求到 Expo 的 API 即可。

### Expo Push Token vs Device Push Token

|                | Expo Push Token               | Device Push Token                       |
| -------------- | ----------------------------- | --------------------------------------- |
| **格式** | `ExponentPushToken[xxxxxx]` | APNs Token (hex) / FCM Token (长字符串) |
| **用途** | 通过 Expo Push Service 发送   | 直接与 APNs / FCM 通信                  |
| **获取** | `getExpoPushTokenAsync()`   | `getDevicePushTokenAsync()`           |
| **适用** | 使用 Expo 推送服务时          | 自建推送服务或第三方推送平台时          |

大多数 Expo 项目使用 Expo Push Token + Expo Push Service，简化了服务端实现。自建推送服务或需要高级控制时使用 Device Push Token。

### 三种通知接收场景的处理

| 场景       | 状态                 | 处理方式                                                                          |
| ---------- | -------------------- | --------------------------------------------------------------------------------- |
| 前台接收   | App 在屏幕上运行     | `setNotificationHandler` 决定是否展示；`addNotificationReceivedListener` 监听 |
| 后台点击   | App 在内存中但不可见 | `addNotificationResponseReceivedListener` 回调                                  |
| 冷启动点击 | App 已被系统回收     | `getLastNotificationResponse()` 同步获取启动通知                                |

### 为什么 WebSocket 不能替代系统推送

一个常见的想法是："服务端通过 WebSocket 给客户端发消息，客户端收到后弹本地通知"。技术上可行，但有致命缺陷：

| App 状态 | WebSocket 方案                           | 系统推送（APNs/FCM）           |
| -------- | ---------------------------------------- | ------------------------------ |
| 前台运行 | 连接正常，能收到                         | 能收到                         |
| 后台挂起 | iOS 约 30 秒后挂起连接，**收不到** | 系统级通道，**照常送达** |
| 被杀死   | 连接断开，**完全收不到**           | 系统级通道，**照常送达** |

iOS 对后台进程管控极严——App 进入后台后，WebSocket 连接会被系统在几十秒内强制挂起。Android 在 Doze 模式下也会限制网络活动。App 无法阻止被系统挂起或杀死，这是操作系统保护电池和内存的核心设计。

APNs / FCM 是操作系统的**系统级常驻进程**，不受这些限制，这是它们存在的根本原因。

**生产环境最佳实践是两者配合**：

```
App 在前台
  → WebSocket 实时通信，直接更新 UI，无需通知

App 在后台/被杀死
  → 服务端检测 WebSocket 断开
  → 转走系统推送通道（APNs / FCM / 厂商通道）
  → 用户点击通知 → App 启动 → 恢复上下文
```

### 生产环境推送架构（中国大陆）

#### Expo Push Service 的局限性

本章示例使用 Expo Push Service 作为推送代理（服务端 → Expo → APNs/FCM → 设备）。它的优势是零配置、免费，但在中国大陆生产环境存在两个问题：

1. **网络可达性风险** —— Expo 服务器在美国（AWS us-east），`exp.host` 域名在部分国内网络环境下不稳定
2. **Android 端无法使用** —— 国内 Android 手机没有 Google 服务（GMS），FCM 完全不可用。这不是延迟问题，是根本不通

#### 国内 Android 的特殊性

海外 Android 设备统一使用 Google 的 FCM 推送。但国内 Android 手机出厂不预装 Google 服务，各厂商各自维护私有推送通道：

| 厂商 | 推送服务   |
| ---- | ---------- |
| 小米 | MiPush     |
| 华为 | HMS Push   |
| OPPO | OPPO Push  |
| vivo | vivo Push  |
| 荣耀 | Honor Push |
| 魅族 | Flyme Push |

如果你的 App 要在所有国内 Android 设备上可靠推送，需要逐个对接这些厂商通道。

#### 推荐方案：第三方推送聚合平台

国内生产 App 的标准做法是使用推送聚合平台，它封装了所有厂商通道的差异：

| 平台                        | 特点                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| **极光推送（JPush）** | 国内市占率最高，React Native SDK 成熟（`jpush-react-native`），免费额度充足 |
| **个推（GeTui）**     | 同级竞品，功能相似                                                            |
| **友盟推送（Umeng）** | 阿里系，集成统计分析                                                          |

**推荐极光推送**，原因：社区活跃、React Native 官方 SDK 维护稳定、文档完善。

#### 生产环境完整推送链路

```
你的服务端
  ↓ 调用极光推送 REST API（发送通知 + 目标设备 Registration ID）
极光推送服务（国内基础设施）
  ├── iOS 设备 → 转发到 APNs → iPhone
  ├── 小米设备 → 转发到 MiPush → 小米手机
  ├── 华为设备 → 转发到 HMS Push → 华为手机
  ├── OPPO 设备 → 转发到 OPPO Push → OPPO 手机
  └── 其他 Android → 极光自有长连接通道 → 设备
        ↓
设备收到推送 → 系统通知栏展示
  → 用户点击 → App 启动
  → useNotificationObserver 捕获 → 页面导航
```

#### 客户端代码的变化

从 Expo Push Service 切换到极光推送，**客户端代码变化很小**：

| 层           | 替换内容                                                            | 保留内容                                                      |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Token 注册   | `getExpoPushTokenAsync()` → JPush SDK 的 `getRegistrationID()` | —                                                            |
| 消息接收     | Expo listener → JPush 的 `addReceiveNotificationListener`        | —                                                            |
| 前台展示策略 | —                                                                  | `setNotificationHandler`（本地通知仍用 expo-notifications） |
| 通知点击导航 | —                                                                  | `useNotificationObserver` 逻辑不变，仅数据源切换            |
| 本地通知     | —                                                                  | `scheduleNotificationAsync` 完全保留                        |
| 角标管理     | —                                                                  | `getBadgeCountAsync` / `setBadgeCountAsync` 完全保留      |

本章学到的客户端架构（Handler / Listener / Observer 三层、通知点击导航、权限管理、角标控制）是通用的，不会因为替换推送服务商而作废。

## 4. 最佳实践与坑

### ✅ 推荐做法

1. **`setNotificationHandler` 放在模块级顶层** —— 它必须在第一条通知到达前注册，放在组件的 `useEffect` 中可能太迟。在 `_layout.tsx` 的 import 区域下方、组件定义上方是最佳位置。
2. **冷启动 + 热启动双覆盖** —— `useNotificationObserver` 同时处理 `getLastNotificationResponse()`（冷启动）和 `addNotificationResponseReceivedListener`（热启动），确保通知导航在所有场景下都能工作。
3. **Android Channel 提前创建** —— 在请求权限之前创建 Channel，因为 Android 13+ 需要至少一个 Channel 存在才会弹出权限弹窗。
4. **通知数据传递导航路由** —— 在 `data` 字段中携带目标页面路由（如 `{ url: '/post/123' }`），配合 Expo Router 的 `router.push()` 实现通知点击导航。
5. **Push Token 获取加 try/catch** —— `getExpoPushTokenAsync` 依赖网络请求 Expo 服务器，设备离线、超时等情况会抛异常，应实现重试逻辑。

### ❌ 避免做法

1. **不要在模拟器上测试远程推送** —— `expo-device` 的 `Device.isDevice` 在模拟器上为 `false`，`getExpoPushTokenAsync` 会失败。本地通知可以在模拟器上测试。
2. **不要硬编码 projectId** —— 从 `Constants.expoConfig` 或 `Constants.easConfig` 动态获取，避免环境差异。
3. **不要忽略 `repeats` 的最小间隔** —— `TIME_INTERVAL` 触发器设置 `repeats: true` 时，`seconds` 最少为 60 秒，低于此值会抛异常。
4. **不要将 dismiss 和 cancel 混淆** —— `dismiss` 移除通知中心已展示的通知，`cancel` 取消已调度但未触发的定时通知。
5. **不要在 `handleNotification` 中做耗时操作** —— 回调必须在 3 秒内返回，超时则通知被丢弃。
6. **不要在 Channel 创建后试图修改 importance** —— Android 限制：Channel 一旦创建，importance / sound / vibration 等属性由用户在系统设置控制，代码无法覆盖。需要更改时只能创建新 Channel。

## 5. 行动导向 (Action Guide)

### Step 1: 安装依赖

**这一步在干什么**: 安装 `expo-notifications`（通知核心）、`expo-device`（物理设备检测）。`expo-constants` 已在项目中预装（Expo 默认依赖），用于获取 EAS projectId。

```bash
npx expo install expo-notifications expo-device
```

### Step 2: 配置 app.json

**这一步在干什么**: 在 `plugins` 中注册 `expo-notifications` 配置插件。Expo Prebuild 时会将配置写入原生项目（iOS 的 entitlements + Android 的 权限声明）。`icon` 用于 Android 通知栏小图标（需 96x96 全白色透明背景 PNG），`color` 是 Android 通知图标的着色。

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#6366F1"
        }
      ]
    ]
  }
}
```

### Step 3: 创建通知服务模块

**这一步在干什么**: 在 `src/features/notifications/` 下构建通知模块，遵循 Feature-First 架构。将 `expo-notifications` 的 API 封装为业务语义清晰的函数，上层组件不直接引用 expo-notifications。

```
src/features/notifications/
├── types.ts                  → 业务类型定义
├── notificationService.ts    → 通知 API 封装（权限、调度、角标）
├── useNotifications.ts       → 前台事件监听 Hook
├── useNotificationObserver.ts → 通知点击导航 Hook
└── index.ts                  → 模块导出
```

**types.ts** 完整代码：

```typescript
export interface LocalNotificationInput {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  delaySeconds?: number;
  repeats?: boolean;
}

export interface ScheduledNotificationInfo {
  id: string;
  title: string | null;
  body: string | null;
  trigger: string;
}
```

**notificationService.ts** 完整代码：

```typescript
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';

import type { LocalNotificationInput, ScheduledNotificationInfo } from './types';

const DEFAULT_CHANNEL_ID = 'default';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: '默认通知',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6366F1',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  if (!existing.canAskAgain) {
    Alert.alert('需要通知权限', '请在系统设置中允许通知', [
      { text: '取消', style: 'cancel' },
      { text: '打开设置', onPress: () => Linking.openSettings() },
    ]);
    return false;
  }

  const result = await Notifications.requestPermissionsAsync();

  if (result.granted) return true;

  if (!result.canAskAgain) {
    Alert.alert('需要通知权限', '请在系统设置中允许通知', [
      { text: '取消', style: 'cancel' },
      { text: '打开设置', onPress: () => Linking.openSettings() },
    ]);
  }

  return false;
}

export async function getExpoPushToken(): Promise<string> {
  if (!Device.isDevice) {
    throw new Error('Push Token 仅在物理设备上可用');
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      '未找到 EAS projectId，请运行 eas init 或在 app.json 中配置 extra.eas.projectId',
    );
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export async function scheduleLocalNotification(
  input: LocalNotificationInput,
): Promise<string> {
  await ensureAndroidChannel();

  const trigger =
    input.delaySeconds != null
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL as const,
          seconds: input.delaySeconds,
          repeats: input.repeats ?? false,
          channelId: DEFAULT_CHANNEL_ID,
        }
      : null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data,
      sound: true,
    },
    trigger,
  });
}

export async function cancelScheduledNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications(): Promise<ScheduledNotificationInfo[]> {
  const list = await Notifications.getAllScheduledNotificationsAsync();

  return list.map((n) => {
    const { title, body } = n.content;
    const trigger = n.trigger;

    let triggerDesc = '立即';
    if (trigger && 'seconds' in trigger) {
      triggerDesc = `${trigger.seconds}秒后`;
    } else if (trigger && 'dateComponents' in trigger) {
      triggerDesc = '日历触发';
    }

    return { id: n.identifier, title, body, trigger: triggerDesc };
  });
}

export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
```

**useNotifications.ts** 完整代码：

```typescript
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';

export function useNotificationListeners() {
  const [lastNotification, setLastNotification] =
    useState<Notifications.Notification | null>(null);
  const [lastResponse, setLastResponse] =
    useState<Notifications.NotificationResponse | null>(null);

  const notificationRef = useRef<Notifications.EventSubscription>(null);
  const responseRef = useRef<Notifications.EventSubscription>(null);

  useEffect(() => {
    notificationRef.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setLastNotification(notification);
      });

    responseRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        setLastResponse(response);
      });

    return () => {
      notificationRef.current?.remove();
      responseRef.current?.remove();
    };
  }, []);

  return { lastNotification, lastResponse };
}
```

**useNotificationObserver.ts** 完整代码：

```typescript
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

export function useNotificationObserver() {
  useEffect(() => {
    function redirect(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url as never);
      }
    }

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      redirect(lastResponse.notification);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        redirect(response.notification);
      });

    return () => subscription.remove();
  }, []);
}
```

**index.ts** 完整代码：

```typescript
export {
  requestNotificationPermission,
  getExpoPushToken,
  scheduleLocalNotification,
  cancelScheduledNotification,
  cancelAllScheduledNotifications,
  getScheduledNotifications,
  getBadgeCount,
  setBadgeCount,
  dismissAllNotifications,
} from './notificationService';

export { useNotificationListeners } from './useNotifications';
export { useNotificationObserver } from './useNotificationObserver';

export type {
  LocalNotificationInput,
  ScheduledNotificationInfo,
} from './types';
```

### Step 4: 注册全局通知 Handler 和导航 Observer

**这一步在干什么**: 在根布局（`app/_layout.tsx`）中完成两件事：（1）在模块级注册前台通知展示策略；（2）在组件内调用 `useNotificationObserver` 处理通知点击导航。

```typescript
// app/_layout.tsx

// 模块级注册（import 区域下方，组件定义上方）
import * as Notifications from 'expo-notifications';
import { useNotificationObserver } from '../src/features/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 在 RootLayout 组件内
export default function RootLayout() {
  useNotificationObserver();
  // ... 其他逻辑
}
```

### Step 5: 创建 Notification Lab 演示页面

**这一步在干什么**: 创建 `app/(screens)/notification-lab.tsx`，作为通知系统的交互式演示中心。包含权限请求、本地通知调度、已调度通知管理、角标控制、事件监听六个功能区。在 `(screens)` 路由组内，自动继承自定义 ScreenHeader。

页面结构：

```
notification-lab.tsx
├── PermissionSection       → 权限请求 + Push Token 获取
├── ArchitectureDiagram     → 通知系统数据流图
├── SchedulerSection        → 本地通知调度（立即/定时）
├── ScheduledListSection    → 已调度通知查看/取消
├── BadgeSection            → App 角标读写
├── EventMonitorSection     → 事件监听（实时显示收到的通知和交互）
└── UtilitySection          → 清除通知中心
```

完整代码见项目文件 `app/(screens)/notification-lab.tsx`。

### Step 6: 在发现页注册演示入口

**这一步在干什么**: 在 `app/(tabs)/explore.tsx` 的 `DEMO_SECTIONS` 数组中追加条目。

```typescript
{
  id: 'notifications',
  title: '推送通知',
  description: '本地通知调度、Push Token、角标管理',
  icon: 'notifications-outline',
  tags: ['expo-notifications', 'Push Token', 'Badge'],
  route: '/notification-lab' as Href,
},
```
