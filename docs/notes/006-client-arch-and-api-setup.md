# 006. 客户端架构设计与 API 对接准备

## 1. 核心概念 (Concept)

在 React Native 应用中，构建一个健壮的“客户端-服务端”交互层至关重要。这不仅仅是发请求，还涉及到状态管理、类型安全和模块化设计。

**主要目标：**
1.  **解耦**: 界面 (UI) 不应直接包含复杂的请求逻辑。
2.  **类型安全**: 利用 TypeScript 确保发送和接收的数据符合预期。
3.  **用户体验**: 处理好加载中 (Loading)、错误 (Error) 和成功 (Success) 状态。

## 2. 核心技术栈 (Tech Stack)

### 2.1 TanStack Query (React Query)
> "Powerful asynchronous state management"

- **作用**: 管理服务端状态（Server State）。
- **为什么用它**: 自动处理缓存、去重、后台更新、重试逻辑以及 `isLoading`/`isError` 状态。避免了手动写大量的 `useEffect` 和 `useState`。

### 2.2 Axios
- **作用**: HTTP 客户端。
- **为什么用它**: 比原生 `fetch` 更强大，支持请求/响应拦截器（处理 Token、全局错误），自动转换 JSON 数据。

### 2.3 Async Storage (@react-native-async-storage/async-storage)
- **作用**: 移动端的本地持久化存储（类似于 Web 的 localStorage）。
- **为什么用它**:
  - 用于存储用户的登录态 (Token)、用户信息或应用配置。
  - **异步特性**: 所有操作（`getItem`, `setItem`）都是异步的（Promise），这是与 localStorage 最大的区别。
  - **注意**: Android 上通过 SQLite 实现，iOS 上通过原生字典实现，数据未加密，**不要存储敏感密码**。

## 3. 目录结构设计 (Architecture)

采用 **特性驱动 (Feature-First)** 的架构，让代码高度内聚。

```text
src/
├── api/                  # 1. 全局网络层
│   ├── client.ts         # Axios 实例 (拦截器配置)
│   └── config.ts         # 环境变量与常量
├── features/             # 2. 业务功能模块
│   └── auth/             # (示例：认证模块)
│       ├── api.ts        # 定义具体的 API 请求函数
│       ├── types.ts      # 请求/响应的 TypeScript 接口
│       ├── useAuth.ts    # 封装 React Query Hooks (useMutation/useQuery)
│       └── index.ts      # 对外暴露接口
└── utils/                
    └── storage.ts        # 本地存储 (Token 持久化)
```

## 4. 核心用法 (Usage)

### 4.1 全局 QueryClient 配置 (`app/_layout.tsx`)
React Query 需要在应用根组件包裹 `QueryClientProvider`。

```typescript
// 确保 QueryClient 单例，防止重渲染时丢失缓存
const [queryClient] = useState(() => new QueryClient());

return (
  <QueryClientProvider client={queryClient}>
    <Slot />
  </QueryClientProvider>
);
```

### 4.2 定义 API (`features/auth/api.ts`)
纯函数，只负责发请求，不涉及 UI 状态。

```typescript
export const authApi = {
  login: async (data: LoginParams): Promise<LoginResponse> => {
    const response = await client.post('/auth/login', data);
    return response.data;
  },
};
```

### 4.3 封装 Hook (`features/auth/useAuth.ts`)
将 API 请求转换为 React Hooks，注入业务逻辑（如登录成功后的跳转）。

```typescript
export const useLogin = () => {
  const router = useRouter();
  
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // 处理副作用：存储 Token，跳转页面
      router.replace('/(tabs)'); 
    },
  });
};
```

### 4.4 在 UI 中使用 (`app/(tabs)/login.tsx`)

```typescript
const loginMutation = useLogin();

// 触发请求
loginMutation.mutate({ phone, code });

// 获取状态
if (loginMutation.isPending) return <ActivityIndicator />;
```

## 5. 交互优化：键盘处理 (Keyboard Handling)

在移动端，输入框唤起的软键盘往往不会自动收起（特别是 iOS 数字键盘）。

### TouchableWithoutFeedback

- **作用**: 一个不渲染任何视觉元素（如背景色、边框）的组件，仅用于捕获点击事件。
- **最佳实践**: 用它包裹整个页面容器，点击空白处收起键盘。

```typescript
import { Keyboard, TouchableWithoutFeedback, View } from 'react-native';

export default function LoginScreen() {
  return (
    // onPress={Keyboard.dismiss} 是核心
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
        {/* 输入框区域 */}
      </View>
    </TouchableWithoutFeedback>
  );
}
```

## 6. 最佳实践 (Best Practices)

- ✅ **API 层与 UI 层分离**: 组件只调用 Hook，不直接导入 axios。
- ✅ **集中管理 Token**: 在 `src/utils/storage.ts` 中封装 AsyncStorage，不要散落在各处。
- ✅ **类型优先**: 先定义 `interface`，再写 API 函数。
- ❌ **避免在组件中处理复杂逻辑**: 尽量下沉到 Custom Hooks 中。
