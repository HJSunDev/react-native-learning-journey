import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';

/**
 * 监听前台通知的生命周期 Hook。
 *
 * 订阅两个核心事件：
 *   1. NotificationReceived — App 在前台时收到通知
 *   2. NotificationResponseReceived — 用户点击/交互通知
 *
 * 返回最近一次收到的通知和最近一次交互响应，供 UI 展示。
 */
export function useNotificationListeners() {
  // lastNotification 保存最近一次收到的前台推送通知，用于展示通知内容和状态
  const [lastNotification, setLastNotification] =
    useState<Notifications.Notification | null>(null);
  // lastResponse 保存最近一次用户对通知的交互响应（如点击），用于跳转或触发操作
  const [lastResponse, setLastResponse] =
    useState<Notifications.NotificationResponse | null>(null);

  // notificationRef 和 responseRef 持有事件订阅对象，方便 effect 卸载时移除监听，避免内存泄漏
  const notificationRef = useRef<Notifications.EventSubscription>(null);
  const responseRef = useRef<Notifications.EventSubscription>(null);

  useEffect(() => {
    // 注册前台收到通知的监听器，便于 UI 实时感知通知事件
    notificationRef.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setLastNotification(notification);
      });

    // 注册用户响应通知（如点击）的监听器，便于业务感知入口和行为链路
    responseRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        setLastResponse(response);
      });

    // 卸载时移除事件监听，防止内存泄漏与多次事件响应
    return () => {
      notificationRef.current?.remove();
      responseRef.current?.remove();
    };
  }, []);

  return { lastNotification, lastResponse };
}
