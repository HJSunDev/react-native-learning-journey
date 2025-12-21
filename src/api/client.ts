import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from '../utils/storage';
import { config } from './config';

// 1. 创建实例
export const client = axios.create({
  baseURL: config.apiUrl,
  timeout: 5000, // 5秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. 请求拦截器：自动注入 Token
client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. 响应拦截器：统一错误处理与数据剥离
client.interceptors.response.use(
  (response) => {
    // 假设后端标准格式为 { code: 200, data: {...}, message: "ok" }
    // 如果后端直接返回数据，则直接返回 response.data
    return response.data;
  },
  async (error: AxiosError) => {
    // 统一错误处理
    if (error.response) {
      const { status } = error.response;
      
      switch (status) {
        case 401:
          // Token 过期，跳转登录或刷新 Token
          // await storage.clearToken();
          // 这里可以使用事件发射器通知 App 跳转登录页
          console.error('未授权，请重新登录');
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

