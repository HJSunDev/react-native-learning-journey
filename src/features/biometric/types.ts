import type * as LocalAuthentication from 'expo-local-authentication';

/** 设备支持的生物认证方式 */
export type BiometricType = 'fingerprint' | 'facial' | 'iris';

/** 设备生物认证能力的完整描述 */
export interface BiometricCapability {
  /** 设备是否具备生物认证硬件（指纹传感器、面容识别模块等） */
  hasHardware: boolean;
  /** 用户是否已录入生物信息（至少一个指纹或面容） */
  isEnrolled: boolean;
  /** 设备支持的认证方式列表（可能同时支持多种） */
  biometricTypes: BiometricType[];
  /** 已录入认证的安全等级（NONE / SECRET / BIOMETRIC_WEAK / BIOMETRIC_STRONG） */
  securityLevel: LocalAuthentication.SecurityLevel;
}

/** 认证结果 */
export interface BiometricAuthResult {
  success: boolean;
  /** 认证失败的错误类型（用户取消时为 undefined） */
  error?: string;
  /** 系统返回的警告信息 */
  warning?: string;
}

/** 认证选项 */
export interface BiometricAuthOptions {
  /** 认证弹窗的提示文字 */
  promptMessage?: string;
  /** iOS: 生物认证失败后备选按钮文字 */
  fallbackLabel?: string;
  /** 取消按钮文字 */
  cancelLabel?: string;
  /** 是否禁止回退到设备密码/PIN（默认 false，允许回退） */
  disableDeviceFallback?: boolean;
}
