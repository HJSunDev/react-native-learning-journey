# 009. 全局认证状态管理与安全存储

## 1. 核心问题与概念

### 解决什么问题

在 008 中搭建的客户端架构有两个关键的生产级缺口：

1. **认证状态孤岛**: Token 存在 AsyncStorage 中，但 React 组件树无法响应式地感知"用户是否已登录"。导致无法实现受保护路由（未登录自动跳 login）、也无法在 401 发生时通知 UI 更新。
2. **Token 存储不安全**: AsyncStorage 底层是未加密的 SQLite / 序列化文件。JWT Token 属于凭证类敏感数据，需要使用操作系统级加密存储。
3. **登录页放在 Tabs 中**: login 作为 Tab 页出现在底部导航栏不符合常规 UX——认证流应该是一个独立的路由组，未登录时无法访问受保护页面。

### 核心概念与依赖

| 包                          | 角色                   | 为什么选它                                                                                                               |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **zustand**           | 轻量级全局状态管理     | 无 Provider 包裹、极简 API、天然支持 selector 避免不必要的 re-render，是 2025-2026 年 RN 社区最主流的客户端状态方案      |
| **expo-secure-store** | 加密持久化存储         | iOS 基于 Keychain Services（硬件级加密），Android 基于 Keystore + EncryptedSharedPreferences。专为 Token、密钥等凭证设计 |
| **AsyncStorage**      | 通用持久化存储（保留） | 继续用于非敏感数据（用户偏好、缓存信息等）                                                                               |

### 存储分层原则

```text
┌─────────────────────────────────────────────────┐
│  expo-secure-store (加密)                       │
│  → JWT Token, Refresh Token, API Keys           │
├─────────────────────────────────────────────────┤
│  AsyncStorage (未加密)                           │
│  → 用户信息缓存, 主题偏好, 引导页状态              │
└─────────────────────────────────────────────────┘
```

## 2. 核心用法 / 方案设计 (Usage / Design)

### 场景 A: Zustand Auth Store — 全局认证状态

Zustand 的核心思想是：用一个函数创建 store，返回状态 + 修改函数，组件通过 selector 订阅所需字段。

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { secureStorage, storage } from '../utils/storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;     // 应用启动时的 hydrate 加载态
  hydrate: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  // 应用启动时从持久化存储中恢复登录态
  hydrate: async () => {
    const [token, user] = await Promise.all([
      secureStorage.getToken(),
      storage.getUserInfo(),
    ]);
    set({
      token: token && user ? token : null,
      user: token && user ? user : null,
      isLoading: false,
    });
  },

  // 登录：同时写入内存(Zustand) + 持久化(SecureStore/AsyncStorage)
  signIn: async (token, user) => {
    await Promise.all([
      secureStorage.setToken(token),
      storage.setUserInfo(user),
    ]);
    set({ token, user });
  },

  signOut: async () => {
    await Promise.all([
      secureStorage.clearToken(),
      storage.clearUserInfo(),
    ]);
    set({ token: null, user: null });
  },
}));
```

**关键设计决策**：`hydrate` + `isLoading` 组合解决了"应用冷启动时异步读取存储 → 路由闪烁"的经典问题。

### 场景 B: 存储层分离 — SecureStore vs AsyncStorage

```typescript
// src/utils/storage.ts
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 凭证类数据 → 加密存储
export const secureStorage = {
  getToken:   () => SecureStore.getItemAsync('auth_token'),
  setToken:   (t: string) => SecureStore.setItemAsync('auth_token', t),
  clearToken: () => SecureStore.deleteItemAsync('auth_token'),
};

// 非敏感数据 → 通用存储
export const storage = {
  setUserInfo:   (info: User) => AsyncStorage.setItem('user_info', JSON.stringify(info)),
  getUserInfo:   async (): Promise<User | null> => { /* parse JSON */ },
  clearUserInfo: () => AsyncStorage.removeItem('user_info'),
};
```

### 场景 C: 认证守卫 — 基于 Expo Router 的路由保护

Expo Router 利用 `useSegments()` 获取当前路由段，结合 Zustand token 状态实现自动重定向。

```typescript
// app/_layout.tsx
function AuthGuard() {
  const { token, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      // 未登录 + 不在认证页 → 跳转登录
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      // 已登录 + 还在认证页 → 跳转主页
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments]);

  if (isLoading) return <ActivityIndicator />;
  return <Slot />;
}
```

### 场景 D: Hook 层集成 — useLogin 不再直接操作 storage

```typescript
// src/features/auth/useAuth.ts
export const useLogin = () => {
  const signIn = useAuthStore((s) => s.signIn);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      const { token, ...user } = data;
      // signIn 同时完成：内存状态更新 + 持久化写入
      // AuthGuard 监听 token 变化后自动跳转，无需手动 router.replace
      await signIn(token, user);
    },
  });
};
```

## 3. 深度原理与机制 (Under the Hood)

### 数据流向

```text
用户点击登录
    │
    ▼
useLogin().mutate({ phone, code })
    │
    ▼
authApi.login() ──── Mock / 真实请求
    │
    ▼ onSuccess
useAuthStore.signIn(token, user)
    ├── SecureStore.setItemAsync(token)    ← 加密持久化
    ├── AsyncStorage.setItem(userInfo)     ← 通用持久化
    └── set({ token, user })              ← Zustand 内存状态更新
         │
         ▼ 触发订阅者 re-render
    AuthGuard 检测到 token 非 null
         │
         ▼
    router.replace('/(tabs)')             ← 自动跳转主页
```

### 路由结构

```text
app/
├── _layout.tsx          # QueryClientProvider + AuthGuard
├── (auth)/              # 认证路由组（未登录可见）
│   ├── _layout.tsx      # Stack 导航，无 header
│   └── login.tsx        # 登录页
└── (tabs)/              # 主应用路由组（需登录才可见）
    ├── _layout.tsx      # Tab 导航
    └── index.tsx        # 首页
```

### useSegments 深度解析

#### 它是什么

`useSegments()` 是 Expo Router 提供的 Hook，返回当前 URL 路径拆分后的**路由段数组 (segments)**。它本质上是对当前路由路径做 `/` 分割后的结构化表示。

```text
当前 URL 路径                     useSegments() 返回值
─────────────────────────────────────────────────────────
/                                 []
/(tabs)                           ['(tabs)']
/(tabs)/profile                   ['(tabs)', 'profile']
/(auth)/login                     ['(auth)', 'login']
/(tabs)/chat/123                  ['(tabs)', 'chat', '123']
```

每一段对应文件系统中的一级目录或文件名。圆括号的路由组 `(tabs)`、`(auth)` 也会作为 segment 出现，但它们不影响用户可见的 URL。

#### 为什么需要它

在传统的 React Navigation 中，判断"用户当前在哪个页面"需要从 navigation state 中递归解析嵌套结构，代码复杂且脆弱。`useSegments` 将这个过程简化为数组下标访问：

```typescript
const segments = useSegments();

// segments[0] 就是第一级路由组，直接判断用户处于哪个"区域"
const inAuthGroup = (segments[0] as string) === '(auth)';
const inTabsGroup = (segments[0] as string) === '(tabs)';

// segments[1] 可以进一步判断具体页面
const isOnProfile = segments[1] === 'profile';
```

这使得 AuthGuard、权限控制、页面埋点等需要"感知当前路由位置"的场景变得极其简洁。

#### 响应式特性

`useSegments` 是响应式的——每次路由变化时，它会触发组件 re-render 并返回新的 segments 数组。这正是 AuthGuard 能"监听"路由变化的原因：

```typescript
// token 或 segments 任一变化，useEffect 都会重新执行
useEffect(() => {
  const inAuthGroup = (segments[0] as string) === '(auth)';

  if (!token && !inAuthGroup) {
    router.replace('/(auth)/login');   // 未登录 → 踢到登录页
  } else if (token && inAuthGroup) {
    router.replace('/(tabs)');         // 已登录 → 跳转主页
  }
}, [token, isLoading, segments]);
```

#### Typed Routes 与类型断言

当项目启用了 `typedRoutes: true` 时，`useSegments()` 的返回类型是一个严格的字符串字面量联合类型，由 Expo 根据 `app/` 目录结构自动生成到 `.expo/types/router.d.ts`。

**类型只在 dev server 运行时才会重新生成。** 如果新建了路由目录（如 `(auth)/`）但未启动 dev server，TypeScript 会报"类型不匹配"。此时需要用类型断言临时绕过：

```typescript
// segments[0] 的自动生成类型可能还不包含 '(auth)'
const inAuthGroup = (segments[0] as string) === '(auth)';

// router.replace 的参数同理，Href 是 Expo Router 的路径类型
router.replace('/(auth)/login' as Href);
```

启动 `npx expo start` 后类型会自动更新，届时可以移除这些断言。

#### 使用场景总结

| 场景 | 用法 |
|---|---|
| 认证守卫 | `segments[0] === '(auth)'` 判断是否在认证区域 |
| 条件渲染 Header | 根据 `segments[0]` 切换不同的 Header 样式 |
| 页面埋点 / 分析 | `segments.join('/')` 作为页面路径上报 |
| 深层页面权限控制 | `segments[1]` / `segments[2]` 判断具体子页面 |

### Zustand 为什么不需要 Provider

Zustand 的 store 是模块级单例（基于闭包），不依赖 React Context。`create()` 返回的 Hook 内部直接 `useSyncExternalStore` 订阅变更，任何组件 import 即可使用，无需在组件树顶层包裹 Provider。这也是它比 Context 方案更轻量的核心原因。

## 4. 最佳实践与坑 (Best Practices & Pitfalls)

- ✅ **存储分层**: 凭证类数据用 SecureStore，非敏感数据用 AsyncStorage。
- ✅ **状态与持久化同步**: `signIn` / `signOut` 函数内同时更新内存和存储，避免不一致。
- ✅ **hydrate + isLoading**: 冷启动时先显示 Loading，等存储读取完成再决定路由，避免闪烁。
- ✅ **Selector 订阅**: `useAuthStore((s) => s.token)` 只订阅 token 字段，token 不变时组件不会 re-render。
- ❌ **避免在组件中直接操作 storage**: 所有持久化操作应通过 Zustand store 的 action 完成，保持单一数据源。
- ❌ **避免把路由跳转写在 Hook 中**: 认证相关的路由跳转统一由 AuthGuard 根据状态驱动，而非散落在 `onSuccess` 回调里。

## 5. 行动导向 (Action Guide)

### Step 1: 安装依赖

**这一步在干什么**: 引入 Zustand (全局状态管理) 和 expo-secure-store (加密存储)。

```bash
npm install zustand expo-secure-store
```

### Step 2: 创建存储层 (`src/utils/storage.ts`)

**这一步在干什么**: 将存储拆分为两个模块 — `secureStorage` 处理加密的 Token 存取，`storage` 处理非敏感的用户信息。

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../stores/authStore';

const TOKEN_KEY = 'auth_token';
const USER_INFO_KEY = 'user_info';

export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error('Error getting token from secure storage', e);
      return null;
    }
  },
  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
      console.error('Error setting token in secure storage', e);
    }
  },
  async clearToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error('Error clearing token from secure storage', e);
    }
  },
};

export const storage = {
  async setUserInfo(info: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
    } catch (e) {
      console.error('Error setting user info', e);
    }
  },
  async getUserInfo(): Promise<User | null> {
    try {
      const json = await AsyncStorage.getItem(USER_INFO_KEY);
      return json ? JSON.parse(json) : null;
    } catch (e) {
      console.error('Error getting user info', e);
      return null;
    }
  },
  async clearUserInfo(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_INFO_KEY);
    } catch (e) {
      console.error('Error clearing user info', e);
    }
  },
};
```

### Step 3: 创建 Zustand Auth Store (`src/stores/authStore.ts`)

**这一步在干什么**: 建立全局认证状态的单一数据源。`hydrate` 恢复登录态，`signIn/signOut` 同步更新内存与持久化存储。

```typescript
import { create } from 'zustand';
import { secureStorage, storage } from '../utils/storage';

export interface User {
  id: string;
  username: string;
  avatar: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  hydrate: async () => {
    try {
      const [token, user] = await Promise.all([
        secureStorage.getToken(),
        storage.getUserInfo(),
      ]);
      if (token && user) {
        set({ token, user, isLoading: false });
      } else {
        set({ token: null, user: null, isLoading: false });
      }
    } catch (e) {
      console.error('Failed to hydrate auth state', e);
      set({ token: null, user: null, isLoading: false });
    }
  },

  signIn: async (token: string, user: User) => {
    await Promise.all([
      secureStorage.setToken(token),
      storage.setUserInfo(user),
    ]);
    set({ token, user });
  },

  signOut: async () => {
    await Promise.all([
      secureStorage.clearToken(),
      storage.clearUserInfo(),
    ]);
    set({ token: null, user: null });
  },
}));
```

### Step 4: 重构路由结构

**这一步在干什么**: 将 login 从 `(tabs)` 移到独立的 `(auth)` 路由组，并在根布局中实现 AuthGuard 自动重定向。

**4a. 创建 `app/(auth)/_layout.tsx`**

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**4b. 将 `app/(tabs)/login.tsx` 移动到 `app/(auth)/login.tsx`**（内容不变）

**4c. 更新 `app/(tabs)/_layout.tsx`** — 移除 login Tab

```typescript
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#6366F1" }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "首页",
          tabBarIcon: ({ color, size, focused }) =>
            focused
              ? <Ionicons name="home" size={size} color={color} />
              : <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**4d. 更新 `app/_layout.tsx`** — 添加 AuthGuard

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';

function AuthGuard() {
  const { token, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 2 } },
  }));

  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
    </QueryClientProvider>
  );
}
```

### Step 5: 更新 useAuth Hook (`src/features/auth/useAuth.ts`)

**这一步在干什么**: 让 Hook 通过 Zustand store 管理认证状态，不再直接操作 storage，也不再手动跳转路由。

```typescript
import { useMutation } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from './api';
import { LoginParams } from './types';

export const useLogin = () => {
  const signIn = useAuthStore((s) => s.signIn);

  return useMutation({
    mutationFn: (data: LoginParams) => authApi.login(data),
    onSuccess: async (data) => {
      const { token, ...user } = data;
      await signIn(token, user);
    },
    onError: (error: Error) => {
      Alert.alert('登录失败', error.message || '请稍后重试');
    },
  });
};

export const useLogout = () => {
  const signOut = useAuthStore((s) => s.signOut);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: async () => {
      await signOut();
    },
    onError: (error: Error) => {
      Alert.alert('登出失败', error.message || '请稍后重试');
    },
  });
};
```
