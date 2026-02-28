import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../features/auth/types';

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

const USER_INFO_KEY = 'user_info';
const THEME_MODE_KEY = 'theme_mode';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export const storage = {
  async setUserInfo(info: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
    } catch (e) {
      console.error('Error setting user info', e);
    }
  },

  async getUserInfo(): Promise<User | null> {
    try {
      const json = await AsyncStorage.getItem(USER_INFO_KEY);
      return json ? JSON.parse(json) : null;
    } catch (e) {
      console.error('Error getting user info', e);
      return null;
    }
  },

  async clearUserInfo(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_INFO_KEY);
    } catch (e) {
      console.error('Error clearing user info', e);
    }
  },

  async getThemeMode(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(THEME_MODE_KEY);
    } catch (e) {
      console.error('Error getting theme mode', e);
      return null;
    }
  },

  async setThemeMode(mode: string): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (e) {
      console.error('Error setting theme mode', e);
    }
  },

  async getBiometricEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return value === 'true';
    } catch (e) {
      console.error('Error getting biometric preference', e);
      return false;
    }
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
    } catch (e) {
      console.error('Error setting biometric preference', e);
    }
  },
};
