import AsyncStorage from '@react-native-async-storage/async-storage';

// 注意：AsyncStorage 是非加密的持久化存储
// 1. Android: 存储在 SQLite 数据库中
// 2. iOS: 存储在沙盒目录的序列化文件中
// 
// 安全警告：
// 严禁存储明文密码、支付密码等高敏感信息！
// 对于普通的 Session Token 或用户偏好设置，使用 AsyncStorage 是通用的做法。
// 如果需要存储高敏感数据，请改用 expo-secure-store (基于 Keychain/Keystore)。

const TOKEN_KEY = 'auth_token';
const USER_INFO_KEY = 'user_info';

export const storage = {
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error('Error getting token', e);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Error setting token', e);
    }
  },

  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Error clearing token', e);
    }
  },

  async setUserInfo(info: any): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
    } catch (e) {
      console.error('Error setting user info', e);
    }
  },

  async getUserInfo(): Promise<any | null> {
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
  }
};

