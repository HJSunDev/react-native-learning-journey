import { useMutation } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from './api';
import type { LoginParams } from './types';

export const useLogin = () => {
  const signIn = useAuthStore((s) => s.signIn);

  return useMutation({
    mutationFn: (data: LoginParams) => authApi.login(data),
    onSuccess: async (data) => {
      const { token, ...user } = data;

      // 写入 Zustand 内存状态 + 持久化存储（Token → SecureStore, 用户信息 → AsyncStorage）
      // 若当前处于 (auth) 路由组，AuthGuard 检测到 token 后会自动 replace 回 (tabs)
      await signIn(token, user);

      console.log('登录成功', data);
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
      // 清除内存状态 + 持久化存储
      // 游客模式下无强制跳转，用户停留在当前页面（Profile Tab 自动渲染游客视图）
      await signOut();
    },
    onError: (error: Error) => {
      Alert.alert('登出失败', error.message || '请稍后重试');
    },
  });
};