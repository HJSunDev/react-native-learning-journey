import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  getBiometricTypeLabel,
  getSecurityLevelLabel,
  useBiometric,
  type BiometricAuthResult,
} from '../../src/features/biometric';
import { useBiometricStore } from '../../src/stores/biometricStore';

// ---------------------------------------------------------------------------
// Section 1: Device Capability
// ---------------------------------------------------------------------------

function CapabilitySection() {
  const isDark = useColorScheme() === 'dark';
  const { capability, refreshCapability } = useBiometric();

  if (!capability) {
    return (
      <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
        <Text className="text-sm text-gray-400 dark:text-gray-500">
          正在检测设备能力...
        </Text>
      </View>
    );
  }

  const rows: { label: string; value: string; ok: boolean }[] = [
    {
      label: '生物认证硬件',
      value: capability.hasHardware ? '可用' : '不可用',
      ok: capability.hasHardware,
    },
    {
      label: '已录入生物信息',
      value: capability.isEnrolled ? '已录入' : '未录入',
      ok: capability.isEnrolled,
    },
    {
      label: '支持的认证方式',
      value:
        capability.biometricTypes.length > 0
          ? capability.biometricTypes.map(getBiometricTypeLabel).join(' / ')
          : '无',
      ok: capability.biometricTypes.length > 0,
    },
    {
      label: '安全等级',
      value: getSecurityLevelLabel(capability.securityLevel),
      ok: capability.securityLevel >= 2,
    },
  ];

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="hardware-chip-outline"
          size={18}
          color={isDark ? '#818CF8' : '#6366F1'}
        />
        <Text className="ml-2 flex-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
          设备能力检测
        </Text>
        <Pressable
          onPress={refreshCapability}
          className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-1.5 active:bg-gray-200 dark:active:bg-gray-600"
        >
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
            重新检测
          </Text>
        </Pressable>
      </View>

      <View className="gap-2">
        {rows.map((row) => (
          <View
            key={row.label}
            className="flex-row items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-700 px-3 py-2.5"
          >
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {row.label}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text
                className={`text-sm font-medium ${
                  row.ok
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {row.value}
              </Text>
              <Ionicons
                name={row.ok ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={
                  row.ok
                    ? isDark
                      ? '#34D399'
                      : '#10B981'
                    : isDark
                      ? '#6B7280'
                      : '#9CA3AF'
                }
              />
            </View>
          </View>
        ))}
      </View>

      <View className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          hasHardwareAsync() 检测传感器硬件；isEnrolledAsync() 检测是否已录入；
          {'\n'}
          supportedAuthenticationTypesAsync() 返回支持的认证类型数组。
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Authentication Demo
// ---------------------------------------------------------------------------

function AuthDemoSection() {
  const isDark = useColorScheme() === 'dark';
  const { isAvailable, isAuthenticating, triggerAuth } = useBiometric();
  const [result, setResult] = useState<BiometricAuthResult | null>(null);

  const handleAuth = useCallback(
    async (disableFallback: boolean) => {
      setResult(null);
      const res = await triggerAuth({
        promptMessage: '验证你的身份',
        fallbackLabel: '使用密码',
        disableDeviceFallback: disableFallback,
      });
      setResult(res);
    },
    [triggerAuth],
  );

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="finger-print"
          size={18}
          color={isDark ? '#818CF8' : '#6366F1'}
        />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          认证演示
        </Text>
      </View>

      <View className="flex-row gap-2 mb-3">
        <Pressable
          onPress={() => handleAuth(false)}
          disabled={!isAvailable || isAuthenticating}
          className={`flex-1 items-center rounded-xl py-3 ${
            !isAvailable || isAuthenticating
              ? 'bg-gray-200 dark:bg-gray-600'
              : 'bg-indigo-600 active:bg-indigo-700'
          }`}
        >
          <Text className="text-sm font-semibold text-white">
            {isAuthenticating ? '认证中...' : '生物认证'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleAuth(true)}
          disabled={!isAvailable || isAuthenticating}
          className={`flex-1 items-center rounded-xl py-3 ${
            !isAvailable || isAuthenticating
              ? 'bg-gray-200 dark:bg-gray-600'
              : 'bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              !isAvailable || isAuthenticating
                ? 'text-gray-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            仅生物认证
          </Text>
        </Pressable>
      </View>

      {!isAvailable && (
        <View className="rounded-xl bg-amber-50 dark:bg-amber-950 p-3 mb-3">
          <Text className="text-xs text-amber-700 dark:text-amber-300">
            设备不支持生物认证或未录入生物信息，按钮已禁用
          </Text>
        </View>
      )}

      {result && (
        <View
          className={`rounded-xl p-3 ${
            result.success
              ? 'bg-emerald-50 dark:bg-emerald-950'
              : 'bg-red-50 dark:bg-red-950'
          }`}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons
              name={result.success ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={
                result.success
                  ? isDark
                    ? '#34D399'
                    : '#10B981'
                  : isDark
                    ? '#FCA5A5'
                    : '#EF4444'
              }
            />
            <Text
              className={`text-sm font-medium ${
                result.success
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              {result.success ? '认证成功' : '认证失败'}
            </Text>
          </View>
          {result.error && (
            <Text className="text-xs text-red-600 dark:text-red-400 mt-1">
              错误: {result.error}
            </Text>
          )}
          {result.warning && (
            <Text className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              警告: {result.warning}
            </Text>
          )}
        </View>
      )}

      <View className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          「生物认证」允许回退到设备密码 (disableDeviceFallback: false)。
          {'\n'}「仅生物认证」禁止回退 (disableDeviceFallback: true)，
          生物认证失败后不会弹出密码输入。
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 3: App Lock
// ---------------------------------------------------------------------------

function AppLockSection() {
  const isDark = useColorScheme() === 'dark';
  const { isAvailable, triggerAuth } = useBiometric();
  const isEnabled = useBiometricStore((s) => s.isEnabled);
  const setEnabled = useBiometricStore((s) => s.setEnabled);

  const handleToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        // 开启前先验证身份，确认是设备主人在操作
        const result = await triggerAuth({
          promptMessage: '验证身份以开启 App 锁',
        });

        if (!result.success) {
          Alert.alert('验证失败', '需要通过生物认证才能开启 App 锁');
          return;
        }
      }

      await setEnabled(value);
    },
    [triggerAuth, setEnabled],
  );

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="lock-closed"
          size={18}
          color={isDark ? '#818CF8' : '#6366F1'}
        />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          App 锁
        </Text>
      </View>

      <View className="flex-row items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-700 px-4 py-3 mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
            启用生物认证锁屏
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            App 切到后台后，返回时需要认证
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          disabled={!isAvailable}
          trackColor={{
            false: isDark ? '#374151' : '#D1D5DB',
            true: '#818CF8',
          }}
          thumbColor={isEnabled ? '#6366F1' : isDark ? '#9CA3AF' : '#F9FAFB'}
        />
      </View>

      {!isAvailable && (
        <View className="rounded-xl bg-amber-50 dark:bg-amber-950 p-3 mb-3">
          <Text className="text-xs text-amber-700 dark:text-amber-300">
            设备不支持生物认证或未录入，无法启用 App 锁
          </Text>
        </View>
      )}

      <View className="rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          工作原理：AppState 变为 background 时将 isLocked 设为 true，
          {'\n'}
          App 回到前台时 BiometricLockScreen 渲染全屏遮罩并弹出认证。
          {'\n'}认证成功后解锁，遮罩移除。偏好持久化在 AsyncStorage 中。
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 4: Security Architecture Diagram
// ---------------------------------------------------------------------------

function SecurityArchSection() {
  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        安全存储架构
      </Text>
      <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
        <Text className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-5">
          {'┌─── 凭证层 (SecureStore) ─────────\n'}
          {'│ JWT Token / Refresh Token        \n'}
          {'│ iOS: Keychain (硬件加密)          \n'}
          {'│ Android: Keystore + Encrypted SP \n'}
          {'└──────────────────────────────────\n'}
          {'\n'}
          {'┌─── 偏好层 (AsyncStorage) ────────\n'}
          {'│ 用户信息缓存 / 主题偏好           \n'}
          {'│ 生物认证开关 (biometric_enabled)  \n'}
          {'│ 明文存储，不含敏感数据             \n'}
          {'└──────────────────────────────────\n'}
          {'\n'}
          {'┌─── 认证门禁 (Biometric) ─────────\n'}
          {'│ expo-local-authentication         \n'}
          {'│ iOS: Face ID / Touch ID           \n'}
          {'│ Android: Biometric Prompt         \n'}
          {'│                                   \n'}
          {'│ 生物认证 ≠ 登录凭证               \n'}
          {'│ 它是「门禁」，不是「钥匙」        \n'}
          {'│ Token 始终由 SecureStore 保管      \n'}
          {'└──────────────────────────────────'}
        </Text>
      </View>

      <View className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {'生物认证的角色是「访问控制」，验证的是「操作者是否是设备主人」。'}
          {'\n'}{'它不替代 JWT Token，也不存储任何凭证，只决定是否允许访问已存储的登录态。'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 5: API Quick Reference
// ---------------------------------------------------------------------------

function ApiReferenceSection() {
  const isDark = useColorScheme() === 'dark';

  const apis = [
    { method: 'hasHardwareAsync()', desc: '检测是否有生物认证硬件' },
    { method: 'isEnrolledAsync()', desc: '检测是否已录入生物信息' },
    {
      method: 'supportedAuthenticationTypesAsync()',
      desc: '获取支持的认证类型',
    },
    { method: 'getEnrolledLevelAsync()', desc: '获取认证安全等级' },
    { method: 'authenticateAsync(options)', desc: '触发系统认证弹窗' },
    { method: 'cancelAuthenticate()', desc: '取消认证 (仅 Android)' },
  ];

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="code-slash"
          size={18}
          color={isDark ? '#818CF8' : '#6366F1'}
        />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          API 速查
        </Text>
      </View>

      <View className="gap-1.5">
        {apis.map((api) => (
          <View
            key={api.method}
            className="flex-row rounded-xl bg-gray-50 dark:bg-gray-700 px-3 py-2"
          >
            <Text
              className="text-xs font-mono text-indigo-600 dark:text-indigo-400"
              style={{ width: '55%' }}
              numberOfLines={1}
            >
              {api.method}
            </Text>
            <Text
              className="text-xs text-gray-500 dark:text-gray-400 flex-1"
              numberOfLines={1}
            >
              {api.desc}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function BiometricLabScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '生物认证与安全' }} />

      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950 p-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="warning" size={16} color="#F59E0B" />
            <Text className="ml-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              Expo Go 限制
            </Text>
          </View>
          <Text className="text-xs text-amber-700 dark:text-amber-400 leading-5">
            {'Face ID 在 Expo Go 中不可用。Expo Go 是通用沙盒，'}
            {'它的原生配置不包含你在 app.json 中声明的 faceIDPermission。'}
            {'\n\n'}{'解决方式：创建 Development Build（包含你项目原生配置的调试版 App）：'}
            {'\n'}{'  npx expo run:ios（本地构建，需要 Xcode）'}
            {'\n'}{'  eas build --profile development（云端构建）'}
            {'\n\n'}{'构建后手机上会安装一个独立 App，它仍然连接 Metro 热更新，'}
            {'但原生层是你自己的配置，Face ID 即可正常使用。'}
            {'\n\n'}{'Touch ID / Android 指纹不受此限制，Expo Go 中可正常测试。'}
          </Text>
        </View>

        <CapabilitySection />

        <Text className="mb-2 mt-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          认证交互
        </Text>

        <AuthDemoSection />

        <Text className="mb-2 mt-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          App 安全
        </Text>

        <AppLockSection />
        <SecurityArchSection />

        <Text className="mb-2 mt-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          参考
        </Text>

        <ApiReferenceSection />
      </ScrollView>
    </>
  );
}
