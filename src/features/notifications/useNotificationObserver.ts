import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * 通知点击 → 页面导航 Hook。
 *
 * 处理两种场景：
 *   1. App 在后台/前台时用户点击通知 → addNotificationResponseReceivedListener
 *   2. App 被杀死后用户点击通知冷启动 → getLastNotificationResponse
 *
 * 约定：通知的 data 中携带 `url` 字段作为 Deep Link 目标路由。
 * 例如 data: { url: '/post/123' } 会导航到 /post/123 页面。
 */
export function useNotificationObserver() {
  useEffect(() => {
    function redirect(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url as never);
      }
    }

    // 冷启动场景：App 从通知点击启动，此时还没注册 listener
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      redirect(lastResponse.notification);
    }

    // 热启动 / 后台恢复场景
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        redirect(response.notification);
      });

    return () => subscription.remove();
  }, []);
}
