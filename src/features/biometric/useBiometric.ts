import { useCallback, useEffect, useState } from 'react';

import {
  authenticate,
  checkBiometricCapability,
  isBiometricAvailable,
} from './biometricService';
import type {
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricCapability,
} from './types';

/**
 * 封装生物认证的完整交互流程：能力检测 + 认证触发 + 状态管理。
 *
 * 挂载时自动执行一次能力检测，上层组件通过返回值判断 UI 状态：
 * - capability: 展示设备硬件信息
 * - isAvailable: 控制认证按钮的 disabled 状态
 * - triggerAuth: 触发系统认证弹窗
 * - lastResult: 展示最近一次认证结果
 */
export function useBiometric() {
  /** 设备完整能力信息（硬件/录入/类型/安全等级），null 表示尚未检测 */
  const [capability, setCapability] = useState<BiometricCapability | null>(
    null,
  );
  /** 硬件可用 && 已录入 → true，用于控制按钮 disabled */
  const [isAvailable, setIsAvailable] = useState(false);
  /** 认证弹窗是否正在展示，防止重复触发 */
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  /** 最近一次认证的结果，用于 UI 反馈展示 */
  const [lastResult, setLastResult] = useState<BiometricAuthResult | null>(
    null,
  );

  // 挂载时自动检测一次设备能力，无依赖项保证只执行一次
  useEffect(() => {
    async function detect() {
      const cap = await checkBiometricCapability();
      setCapability(cap);
      setIsAvailable(cap.hasHardware && cap.isEnrolled);
    }
    detect();
  }, []);

  /**
   * 手动重新检测设备能力。
   * 适用场景：用户从系统设置返回后可能新增/删除了指纹，需要刷新状态。
   */
  const refreshCapability = useCallback(async () => {
    const cap = await checkBiometricCapability();
    setCapability(cap);
    const available = await isBiometricAvailable();
    setIsAvailable(available);
  }, []);

  /**
   * 触发系统生物认证弹窗，内部管理 isAuthenticating 加载态。
   * 返回认证结果的同时写入 lastResult 供 UI 展示。
   */
  const triggerAuth = useCallback(
    async (options?: BiometricAuthOptions): Promise<BiometricAuthResult> => {
      setIsAuthenticating(true);
      try {
        const result = await authenticate(options);
        setLastResult(result);
        return result;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [],
  );

  return {
    /** 设备能力快照 */
    capability,
    /** 生物认证是否可用（硬件 + 已录入） */
    isAvailable,
    /** 认证弹窗是否正在展示 */
    isAuthenticating,
    /** 最近一次认证结果 */
    lastResult,
    /** 触发认证 */
    triggerAuth,
    /** 重新检测设备能力 */
    refreshCapability,
  };
}
