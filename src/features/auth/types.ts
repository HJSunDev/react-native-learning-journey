// src/features/auth/types.ts

/**
 * 用户基础信息（不含凭证）。
 * 在 Zustand Store、Storage、UI 中通用的用户数据结构。
 */
export interface User {
  id: string;
  username: string;
  avatar: string;
}

/** 登录请求参数 */
export interface LoginParams {
  phone: string;
  code: string;
}

/** 登录响应数据 = 用户信息 + Token */
export interface LoginResponse extends User {
  token: string;
}
