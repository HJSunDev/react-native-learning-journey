import "../global.css";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Href, Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';

/**
 * 认证守卫（单向门禁模式）：
 * 仅阻止已登录用户重复进入认证页面，游客可自由浏览所有 Tab。
 * 登录入口由 Profile Tab 的"登录"按钮主动触发，不做强制跳转。
 */
function AuthGuard() {
  const { token, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Typed Routes 在 dev server 重新启动前可能不包含新建的路由组，此处用 string 断言
    const inAuthGroup = (segments[0] as string) === '(auth)';

    if (token && inAuthGroup) {
      // 已登录但还在认证页面 → 重定向到主页
      router.replace('/(tabs)' as Href);
    }
  }, [token, isLoading, segments, router]);

  // 应用启动时从持久化存储恢复登录态，期间显示加载指示器
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(screens)" />
    </Stack>
  );
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
