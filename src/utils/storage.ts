import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ============================================================
// 安全存储层 (Secure Storage) —— 基于 expo-secure-store
// ============================================================
// 底层实现:
//   iOS  → Keychain Services (硬件级加密)
//   Android → Keystore + EncryptedSharedPreferences
// 适用范围: JWT Token、Refresh Token 等凭证类敏感数据

const TOKEN_KEY = 'auth_token';

export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error('Error getting token from secure storage', e);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
      console.error('Error setting token in secure storage', e);
    }
  },

  async clearToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error('Error clearing token from secure storage', e);
    }
  },
};

// ============================================================
// 通用存储层 (General Storage) —— 基于 AsyncStorage
// ============================================================
// 底层实现:
//   Android → SQLite 数据库 (未加密)
//   iOS     → 沙盒目录序列化文件 (未加密)
// 适用范围: 用户偏好设置、缓存数据等非敏感信息

/**
 * 泛型存储实例接口。
 *
 * 通过 createStorage<T>(key) 工厂函数创建，
 * 各 Store 自行持有实例，storage 模块无需感知业务领域。
 */
export interface StorageInstance<T> {
  get(): Promise<T | null>;
  set(value: T): Promise<void>;
  remove(): Promise<void>;
}

/**
 * 创建一个类型安全的 AsyncStorage 存储实例。
 *
 * 序列化/反序列化默认使用 JSON，覆盖所有常见类型
 * （string、number、boolean、object）。
 *
 * @param key - AsyncStorage 中的存储键名
 *
 * @example
 * // 在各 Store 中就地创建，存储关注点不外泄
 * const themeStorage = createStorage<string>('theme_mode');
 * await themeStorage.set('dark');
 * const mode = await themeStorage.get(); // 'dark'
 */
export function createStorage<T>(key: string): StorageInstance<T> {
  return {
    async get(): Promise<T | null> {
      try {
        const raw = await AsyncStorage.getItem(key);
        return raw != null ? (JSON.parse(raw) as T) : null;
      } catch (e) {
        console.error(`[Storage] Failed to read key "${key}"`, e);
        return null;
      }
    },

    async set(value: T): Promise<void> {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`[Storage] Failed to write key "${key}"`, e);
      }
    },

    async remove(): Promise<void> {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.error(`[Storage] Failed to remove key "${key}"`, e);
      }
    },
  };
}
