import "../global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Href, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Appearance,
  useColorScheme,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useNotificationObserver } from "../src/features/notifications";
import { useAuthStore } from "../src/stores/authStore";
import { useThemeStore } from "../src/stores/themeStore";

// App 在前台时收到通知的展示策略（模块级调用，仅执行一次）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // 展示顶部横幅
    shouldShowList: true, // 展示在通知中心列表
    shouldPlaySound: true, // 播放提示音
    shouldSetBadge: false, // 不自动更新角标（由业务逻辑控制）
  }),
});

/**
 * 认证守卫（单向门禁模式）：
 * 仅阻止已登录用户重复进入认证页面，游客可自由浏览所有 Tab。
 * 登录入口由 Profile Tab 的"登录"按钮主动触发，不做强制跳转。
 */
function AuthGuard() {
  const { token, isLoading } = useAuthStore();
  const themeLoading = useThemeStore((s) => s.isLoading);
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Typed Routes 在 dev server 重新启动前可能不包含新建的路由组，此处用 string 断言
    const inAuthGroup = (segments[0] as string) === "(auth)";

    if (token && inAuthGroup) {
      // 已登录但还在认证页面 → 重定向到主页
      router.replace("/(tabs)" as Href);
    }
  }, [token, isLoading, segments, router]);

  if (isLoading || themeLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colorScheme === "dark" ? "#030712" : "#ffffff",
        }}
      >
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colorScheme === "dark" ? "#030712" : "#f9fafb",
        },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(screens)" />
      <Stack.Screen
        name="settings-modal"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const themeMode = useThemeStore((s) => s.mode);
  const colorScheme = useColorScheme();

  // 确保 QueryClient 单例，防止重渲染时丢失缓存
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 2,
          },
        },
      }),
  );

  // 通知点击 → 页面导航
  useNotificationObserver();

  // 应用挂载时执行一次 hydrate，从本地存储恢复登录态
  useEffect(() => {
    hydrate();
    hydrateTheme();
  }, [hydrate, hydrateTheme]);

  // 将持久化的主题偏好同步到 React Native Appearance API，
  // NativeWind 的 dark: 前缀类会自动响应
  useEffect(() => {
    Appearance.setColorScheme(themeMode === "system" ? null : themeMode);
  }, [themeMode]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <QueryClientProvider client={queryClient}>
        <BottomSheetModalProvider>
          <AuthGuard />
        </BottomSheetModalProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
