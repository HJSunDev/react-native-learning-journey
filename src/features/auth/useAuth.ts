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
      // AuthGuard 监听 token 变化后会自动跳转到主页，无需手动 router.replace
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
      // AuthGuard 监听 token 变为 null 后会自动跳转到登录页
      await signOut();
    },
    onError: (error: Error) => {
      Alert.alert('登出失败', error.message || '请稍后重试');
    },
  });
};