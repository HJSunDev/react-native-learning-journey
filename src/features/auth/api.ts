import { client } from '../../api/client';
import { LoginParams, UserResponse } from './types';

// 模拟延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock 开关（开发阶段开启，对接时关闭）
const IS_MOCK = true;

export const authApi = {
  login: async (params: LoginParams): Promise<UserResponse> => {
    // 策略模式：如果是 Mock，直接返回假数据
    if (IS_MOCK) {
      await delay(1000); // 模拟网络延迟
      
      // 模拟简单的验证逻辑 (仅用于测试错误处理)
      if (params.code === '0000') throw new Error('验证码错误');

      return {
        id: '1001',
        username: 'RN Developer',
        avatar: 'https://via.placeholder.com/150',
        token: 'mock-jwt-token-' + Date.now(),
      };
    }

    // 真实请求
    // 注意：这里的返回值类型需要根据实际后端响应结构进行调整
    // 如果后端包裹了 { data: UserResponse }，client 拦截器如果解包了，这里直接返回 UserResponse
    return client.post('/auth/login', params);
  },

  logout: async () => {
    if (IS_MOCK) {
        await delay(500);
        return true;
    }
    return client.post('/auth/logout');
  }
};

