import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { storage } from '../../utils/storage';
import { authApi } from './api';
import { LoginParams } from './types';

export const useLogin = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginParams) => authApi.login(data),
    onSuccess: async (data) => {
      // 1. 存储 Token 和用户信息
      await storage.setToken(data.token);
      await storage.setUserInfo(data);
      
      console.log('登录成功', data);

      // 2. 跳转页面 (假设首页是 tabs)
      router.replace('/(tabs)');
    },
    onError: (error: any) => {
      // 这里的 error 已经被 Axios 拦截器处理过一次，或者可以这里进行二次 UI 处理
      Alert.alert('登录失败', error.message || '请稍后重试');
    },
  });
};

