import { create } from 'zustand';
import type { User } from '../features/auth/types';
import { secureStorage, storage } from '../utils/storage';

// 从 features/auth/types.ts 统一导入 User 类型，避免重复定义和循环依赖
export type { User };

interface AuthState {
  /** 当前用户信息，null 表示未登录 */
  user: User | null;
  /** 访问令牌，null 表示未登录 */
  token: string | null;
  /** 应用启动时的初始化加载状态 */
  isLoading: boolean;

  /**
   * 应用启动时从持久化存储中恢复登录态。
   * 在根布局中调用一次，决定初始路由方向。
   */
  hydrate: () => Promise<void>;

  /**
   * 登录成功后，将 Token 和用户信息同时写入内存状态与持久化存储。
   */
  signIn: (token: string, user: User) => Promise<void>;

  /**
   * 登出：清除内存状态和持久化存储。
   */
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  hydrate: async () => {
    try {
      const [token, user] = await Promise.all([
        secureStorage.getToken(),
        storage.getUserInfo(),
      ]);

      if (token && user) {
        set({ token, user, isLoading: false });
      } else {
        // Token 或用户信息缺失，视为未登录
        set({ token: null, user: null, isLoading: false });
      }
    } catch (e) {
      console.error('Failed to hydrate auth state', e);
      set({ token: null, user: null, isLoading: false });
    }
  },

  signIn: async (token: string, user: User) => {
    await Promise.all([
      secureStorage.setToken(token),
      storage.setUserInfo(user),
    ]);
    set({ token, user });
  },

  signOut: async () => {
    await Promise.all([
      secureStorage.clearToken(),
      storage.clearUserInfo(),
    ]);
    set({ token: null, user: null });
  },
}));
