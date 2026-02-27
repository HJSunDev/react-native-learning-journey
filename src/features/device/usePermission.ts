import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';

import type { PermissionAdapter, PermissionState } from './types';

interface UsePermissionReturn {
  state: PermissionState;
  isGranted: boolean;
  /** 请求权限，返回是否成功授予 */
  request: () => Promise<boolean>;
  /** 打开系统设置页（用于 blocked 状态下引导用户手动开启） */
  openSettings: () => void;
}

/**
 * 统一权限管理 Hook。
 *
 * 封装权限的完整生命周期：
 *   mount 时自动检查 → 按需请求 → denied/blocked 引导至系统设置。
 *
 * 通过 PermissionAdapter 接口适配不同 Expo 模块的权限 API，
 * 调用方只需传入模块级常量即可，无需关心各模块的差异。
 *
 * @param adapter    - 权限适配器（模块级常量，保证引用稳定）
 * @param featureName - 功能中文名，用于 Alert 提示文案
 */
export function usePermission(
  adapter: PermissionAdapter,
  featureName: string,
): UsePermissionReturn {
  const [state, setState] = useState<PermissionState>('loading');

  // 使用 ref 持有 adapter，避免将其放入 useEffect 依赖导致重复执行
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  useEffect(() => {
    let mounted = true;

    adapterRef.current
      .get()
      .then((res) => {
        if (!mounted) return;
        if (res.granted) setState('granted');
        else if (!res.canAskAgain) setState('blocked');
        else setState('undetermined');
      })
      .catch(() => {
        if (mounted) setState('undetermined');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    const res = await adapterRef.current.request();

    if (res.granted) {
      setState('granted');
      return true;
    }

    // canAskAgain === false: 用户选择了"不再询问"（Android）或系统不再弹窗（iOS 二次拒绝）
    if (!res.canAskAgain) {
      setState('blocked');
      Alert.alert(
        `需要${featureName}权限`,
        `请在系统设置中允许访问${featureName}`,
        [
          { text: '取消', style: 'cancel' },
          { text: '打开设置', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }

    setState('denied');
    return false;
  }, [featureName]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { state, isGranted: state === 'granted', request, openSettings };
}
