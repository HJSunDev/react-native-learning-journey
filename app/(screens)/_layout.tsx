import { Stack } from 'expo-router';

import { ScreenHeader } from '../../src/components/ScreenHeader';

/**
 * 非 Tab 推入屏幕的共享布局。
 *
 * 所有从 Tab 页 push 进来的页面（如发布动态、图片选择等）共享此 Stack。
 * 使用自定义 ScreenHeader 替代原生 UINavigationBar，
 * 规避 iOS 26 Liquid Glass 强制渲染，保持跨平台视觉一致。
 */
export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ options, route }) => (
          <ScreenHeader
            title={
              typeof options.headerTitle === 'string'
                ? options.headerTitle
                : options.title ?? route.name
            }
            fallbackRoute="/(tabs)/explore"
          />
        ),
      }}
    />
  );
}
