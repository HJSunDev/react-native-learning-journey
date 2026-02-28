import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import {
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { authenticate } from '../features/biometric';
import { useBiometricStore } from '../stores/biometricStore';

/**
 * 全屏锁屏遮罩 + AppState 监听器。
 *
 * 职责：
 * 1. 监听 AppState 变化：App 切到后台时触发 lock()
 * 2. 当 isLocked=true 时渲染不可穿透的全屏遮罩
 * 3. 遮罩上提供"点击解锁"按钮，触发系统生物认证弹窗
 * 4. 认证通过后调用 unlock() 移除遮罩
 *
 * 此组件在根布局中无条件挂载，不依赖导航层级，确保锁屏无法被导航操作绕过。
 */
export function BiometricLockScreen() {
  const isEnabled = useBiometricStore((s) => s.isEnabled);
  const isLocked = useBiometricStore((s) => s.isLocked);
  const lock = useBiometricStore((s) => s.lock);
  const unlock = useBiometricStore((s) => s.unlock);
  const isDark = useColorScheme() === 'dark';

  // 追踪前一个 AppState，避免 active → active 的重复触发
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      const prev = appStateRef.current;

      if (
        isEnabled &&
        (prev === 'active' || prev === 'inactive') &&
        nextState === 'background'
      ) {
        lock();
      }

      appStateRef.current = nextState;
    }

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [isEnabled, lock]);

  const hasTriggeredInitialAuth = useRef(false);

  const handleUnlock = useCallback(async () => {
    const result = await authenticate({
      promptMessage: '解锁 RN Journey',
    });

    if (result.success) {
      unlock();
      hasTriggeredInitialAuth.current = false;
    }
  }, [unlock]);

  // 冷启动时自动弹出认证
  useEffect(() => {
    if (isLocked && !hasTriggeredInitialAuth.current) {
      hasTriggeredInitialAuth.current = true;
      handleUnlock();
    }
  }, [isLocked, handleUnlock]);

  if (!isLocked) return null;

  return (
    <View
      style={[
        styles.overlay,
        { backgroundColor: isDark ? '#030712' : '#f9fafb' },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' },
          ]}
        >
          <Ionicons
            name="lock-closed"
            size={48}
            color={isDark ? '#818CF8' : '#6366F1'}
          />
        </View>

        <Text
          style={[styles.title, { color: isDark ? '#F3F4F6' : '#111827' }]}
        >
          App 已锁定
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: isDark ? '#9CA3AF' : '#6B7280' },
          ]}
        >
          使用生物认证解锁
        </Text>

        <Pressable
          onPress={handleUnlock}
          style={({ pressed }) => [
            styles.unlockButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="finger-print" size={20} color="#FFFFFF" />
          <Text style={styles.unlockText}>点击解锁</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 40,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  unlockText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
