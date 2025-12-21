import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from "expo-router";
import { useState } from 'react';

export default function RootLayout() {
  // 创建 QueryClient 实例
  // 使用 useState 确保 Client 在组件重新渲染时保持单例
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 全局查询配置
        staleTime: 1000 * 60 * 5, // 数据 5 分钟不过期
        retry: 2, // 失败重试 2 次
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
