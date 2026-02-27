import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  /** 标题文字 */
  title?: string;
  /** 是否显示返回按钮，默认 true */
  showBack?: boolean;
  /** 右侧自定义内容 */
  headerRight?: ReactNode;
}

const HEADER_HEIGHT = 56;

/**
 * 自定义全屏 Header 组件，替代原生 UINavigationBar。
 *
 * 原生导航栏在 iOS 26 上强制应用 Liquid Glass 效果，
 * 且 react-native-screens < 4.17 没有实现 hidesSharedBackground 原生接口，
 * 导致无法通过 props 移除毛玻璃气泡。
 *
 * 采用 header prop 完全替换原生导航栏是生产级 RN 应用的主流做法，
 * 可实现跨平台视觉一致性和完整的样式控制。
 */
export function ScreenHeader({
  title,
  showBack = true,
  headerRight,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/explore');
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: isDark ? '#030712' : '#f9fafb',
          borderBottomColor: isDark
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(0, 0, 0, 0.08)',
        },
      ]}
    >
      <View style={styles.content}>
        {/* 左侧区域 */}
        <View style={styles.left}>
          {showBack && (
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              style={({ pressed }) => [
                styles.backButton,
                pressed && {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.10)'
                    : 'rgba(55, 65, 81, 0.12)',
                },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={isDark ? '#F3F4F6' : '#111827'}
              />
            </Pressable>
          )}
        </View>

        {/* 标题 */}
        <View style={styles.titleContainer}>
          <Text
            style={[styles.title, { color: isDark ? '#F3F4F6' : '#111827' }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* 右侧区域 */}
        <View style={styles.right}>{headerRight}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 8,
  },
  left: {
    width: 48,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  right: {
    width: 48,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
