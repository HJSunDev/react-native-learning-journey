import "../global.css";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Href, Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';

/**
 * 认证守卫：根据登录状态自动重定向。
 * - 已登录 + 在 auth 页面 → 跳转到主页
 * - 未登录 + 在受保护页面 → 跳转到登录页
 */
function AuthGuard() {
  const { token, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // 判断当前是否处于 (auth) 路由组内
    // Typed Routes 在 dev server 重新启动前可能不包含新建的路由组，此处用 string 断言
    const inAuthGroup = (segments[0] as string) === '(auth)';

    if (!token && !inAuthGroup) {
      // 未登录且不在认证页面 → 重定向到登录
      router.replace('/(auth)/login' as Href);
    } else if (token && inAuthGroup) {
      // 已登录但还在认证页面 → 重定向到主页
      router.replace('/(tabs)' as Href);
    }
  }, [token, isLoading, segments]);

  // 应用启动时从持久化存储恢复登录态，期间显示加载指示器
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

  // 确保 QueryClient 单例，防止重渲染时丢失缓存
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 2,
      },
    },
  }));

  // 应用挂载时执行一次 hydrate，从本地存储恢复登录态
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
    </QueryClientProvider>
  );
}
