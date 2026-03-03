import { create } from 'zustand';
import { createStorage } from '../utils/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

const VALID_MODES: readonly string[] = ['system', 'light', 'dark'];

const themeStorage = createStorage<string>('theme_mode');

interface ThemeState {
  /** 用户选择的主题模式：跟随系统 / 浅色 / 深色 */
  mode: ThemeMode;
  /** 主题偏好是否已从持久化存储恢复 */
  isLoading: boolean;

  /** 从 AsyncStorage 恢复主题偏好 */
  hydrate: () => Promise<void>;
  /** 切换主题模式，同时持久化到 AsyncStorage */
  setMode: (mode: ThemeMode) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  isLoading: true,

  hydrate: async () => {
    try {
      const saved = await themeStorage.get();
      const mode: ThemeMode =
        saved && VALID_MODES.includes(saved) ? (saved as ThemeMode) : 'system';
      set({ mode, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setMode: async (mode: ThemeMode) => {
    set({ mode });
    await themeStorage.set(mode);
  },
}));
