import { create } from 'zustand';
import { createStorage } from '../utils/storage';

const biometricStorage = createStorage<boolean>('biometric_enabled');

interface BiometricState {
  /** 用户是否开启了生物认证锁屏 */
  isEnabled: boolean;
  /** App 当前是否处于锁定状态 */
  isLocked: boolean;
  /** 初始化加载中 */
  isLoading: boolean;

  /**
   * 应用启动时从 AsyncStorage 恢复生物认证偏好。
   * 如果用户开启了生物认证，启动时自动进入锁定状态，
   * 等待 BiometricLockScreen 完成认证后解锁。
   */
  hydrate: () => Promise<void>;

  /**
   * 切换生物认证开关。
   * 开启时立即持久化偏好但不锁定（避免刚开启就弹验证）；
   * 关闭时清除偏好并解锁。
   */
  setEnabled: (enabled: boolean) => Promise<void>;

  /** 进入锁定状态（App 从前台切换到后台时调用） */
  lock: () => void;

  /** 解除锁定（生物认证通过后调用） */
  unlock: () => void;
}

export const useBiometricStore = create<BiometricState>((set, get) => ({
  isEnabled: false,
  isLocked: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const enabled = await biometricStorage.get();
      set({
        isEnabled: !!enabled,
        // 开启了生物认证的用户，冷启动时进入锁定态
        isLocked: !!enabled,
        isLoading: false,
      });
    } catch (e) {
      console.error('Failed to hydrate biometric state', e);
      set({ isEnabled: false, isLocked: false, isLoading: false });
    }
  },

  setEnabled: async (enabled: boolean) => {
    await biometricStorage.set(enabled);
    set({
      isEnabled: enabled,
      // 关闭时解锁；开启时不锁定（下次切后台再锁）
      isLocked: enabled ? get().isLocked : false,
    });
  },

  lock: () => {
    if (get().isEnabled) {
      set({ isLocked: true });
    }
  },

  unlock: () => {
    set({ isLocked: false });
  },
}));
