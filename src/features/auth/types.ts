// src/features/auth/types.ts

// 定义请求参数类型
export interface LoginParams {
  phone: string;
  code: string;
}

// 定义响应数据类型
export interface UserResponse {
  id: string;
  username: string;
  avatar: string;
  token: string;
}

