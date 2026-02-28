import * as LocalAuthentication from 'expo-local-authentication';

import type {
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricCapability,
  BiometricType,
} from './types';

/**
 * 将 expo-local-authentication 的枚举值映射为语义化字符串，
 * 上层组件无需引用 LocalAuthentication 枚举即可判断类型。
 */
function mapAuthenticationType(
  type: LocalAuthentication.AuthenticationType,
): BiometricType {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'fingerprint';
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'facial';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'iris';
  }
}

/**
 * 一次性获取设备的完整生物认证能力，供 UI 层展示硬件状态和判断认证可用性。
 * 内部并行调用四个独立的原生 API，减少串行等待。
 */
export async function checkBiometricCapability(): Promise<BiometricCapability> {
  const [hasHardware, isEnrolled, supportedTypes, securityLevel] =
    await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);

  return {
    hasHardware,
    isEnrolled,
    biometricTypes: supportedTypes.map(mapAuthenticationType),
    securityLevel,
  };
}

/**
 * 触发系统生物认证弹窗。
 *
 * 内部自动执行预检（硬件可用性 + 录入状态），
 * 预检失败直接返回错误结果，不会弹出系统弹窗。
 */
export async function authenticate(
  options?: BiometricAuthOptions,
): Promise<BiometricAuthResult> {
  const capability = await checkBiometricCapability();

  if (!capability.hasHardware) {
    return { success: false, error: '设备不支持生物认证' };
  }

  if (!capability.isEnrolled) {
    return {
      success: false,
      error: '未录入生物信息，请在系统设置中添加指纹或面容',
    };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: options?.promptMessage ?? '验证身份',
    cancelLabel: options?.cancelLabel ?? '取消',
    fallbackLabel: options?.fallbackLabel ?? '使用密码',
    disableDeviceFallback: options?.disableDeviceFallback ?? false,
  });

  if (result.success) {
    return { success: true };
  }

  // user_cancel / user_fallback 属于正常用户行为，不视为错误
  const silentErrors = new Set(['user_cancel', 'user_fallback']);

  // Expo Go 中 Face ID 不可用：原生 Info.plist 缺少 NSFaceIDUsageDescription
  const friendlyErrors: Record<string, string> = {
    missing_usage_description:
      'Face ID 需要 Development Build 才能使用（Expo Go 不支持）',
    lockout: '认证失败次数过多，请稍后再试或使用设备密码',
    passcode_not_set: '设备未设置锁屏密码，无法使用生物认证',
  };

  return {
    success: false,
    error: silentErrors.has(result.error)
      ? undefined
      : (friendlyErrors[result.error] ?? result.error),
    warning: result.warning,
  };
}

/**
 * 便捷方法：判断当前设备是否支持且已录入生物认证。
 * 用于开关 UI 的 disabled 状态判断。
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const capability = await checkBiometricCapability();
  return capability.hasHardware && capability.isEnrolled;
}

/** SecurityLevel 枚举的中文描述映射 */
export function getSecurityLevelLabel(
  level: LocalAuthentication.SecurityLevel,
): string {
  switch (level) {
    case LocalAuthentication.SecurityLevel.NONE:
      return '无认证';
    case LocalAuthentication.SecurityLevel.SECRET:
      return 'SECRET (PIN/Pattern)';
    case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
      return 'BIOMETRIC_WEAK (Class 2)';
    case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
      return 'BIOMETRIC_STRONG (Class 3)';
    default:
      return '未知';
  }
}

/** BiometricType 的中文标签映射 */
export function getBiometricTypeLabel(type: BiometricType): string {
  switch (type) {
    case 'fingerprint':
      return '指纹识别';
    case 'facial':
      return '面容识别';
    case 'iris':
      return '虹膜识别';
  }
}
