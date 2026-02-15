import { Stack } from 'expo-router';

/**
 * 认证路由组布局。
 * 独立于主 Tabs 导航，未登录用户只能看到此组内的页面。
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
