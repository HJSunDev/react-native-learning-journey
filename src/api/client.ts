import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { secureStorage } from '../utils/storage';
import { config } from './config';
import type { ApiClient } from './types';

// 1. 创建 Axios 实例
const axiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 5000, // 5秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. 请求拦截器：自动注入 Token
axiosInstance.interceptors.request.use(
  async (reqConfig: InternalAxiosRequestConfig) => {
    const token = await secureStorage.getToken();
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

// 3. 响应拦截器：统一错误处理与数据剥离
axiosInstance.interceptors.response.use(
  (response) => {
    // 拦截器将 AxiosResponse 解包为 response.data
    // 下方通过 ApiClient 类型断言修正 TypeScript 的返回类型推断
    return response.data;
  },
  async (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;

      switch (status) {
        case 401:
          // 通过 Zustand getState() 在非 React 环境中访问 store
          // signOut 会清除内存 + 持久化存储，AuthGuard 监听到 token 变 null 后自动跳转登录页
          await useAuthStore.getState().signOut();
          break;
        case 403:
          console.error('没有权限访问');
          break;
        case 500:
          console.error('服务器内部错误');
          break;
        default:
          console.error(`网络错误: ${status}`);
      }
    } else if (error.request) {
      console.error('网络连接失败，请检查网络');
    }

    return Promise.reject(error);
  }
);

// 响应拦截器已将返回值从 AxiosResponse<T> 解包为 T
// 通过 ApiClient 接口重新声明方法签名，使 client.post<LoginResponse>() 直接返回 Promise<LoginResponse>
export const client = axiosInstance as unknown as ApiClient;