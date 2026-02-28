export {
  authenticate,
  checkBiometricCapability,
  getBiometricTypeLabel,
  getSecurityLevelLabel,
  isBiometricAvailable,
} from './biometricService';

export { useBiometric } from './useBiometric';

export type {
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricCapability,
  BiometricType,
} from './types';
