import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';

import type { LocalNotificationInput, ScheduledNotificationInfo } from './types';

// ---------------------------------------------------------------------------
// Android Notification Channel
// ---------------------------------------------------------------------------

const DEFAULT_CHANNEL_ID = 'default';

/**
 * 在 Android 13+ 上，系统只有在至少创建了一个 Channel 后才会弹出通知权限弹窗。
 * 在非 Android 平台上调用是 no-op。
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: '默认通知',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6366F1',
  });
}

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

/**
 * 请求通知权限。
 *
 * 流程：
 *   1. Android 先创建 Channel（触发权限弹窗的前置条件）
 *   2. 检查当前权限状态，已授权则直接返回
 *   3. 未授权则调用 requestPermissionsAsync 弹窗
 *
 * @returns 是否成功获得通知权限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  // iOS 拒绝后 canAskAgain 为 false，系统不会再弹权限弹窗
  if (!existing.canAskAgain) {
    Alert.alert('需要通知权限', '请在系统设置中允许通知', [
      { text: '取消', style: 'cancel' },
      { text: '打开设置', onPress: () => Linking.openSettings() },
    ]);
    return false;
  }

  const result = await Notifications.requestPermissionsAsync();

  if (result.granted) return true;

  if (!result.canAskAgain) {
    Alert.alert('需要通知权限', '请在系统设置中允许通知', [
      { text: '取消', style: 'cancel' },
      { text: '打开设置', onPress: () => Linking.openSettings() },
    ]);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Push Token
// ---------------------------------------------------------------------------

/**
 * 获取 Expo Push Token。
 *
 * Push Token 是 Expo Push Service 用来定位设备的唯一标识。
 * 仅在物理设备上可用（模拟器/Expo Go 无法接收远程推送）。
 *
 * @returns ExpoPushToken 字符串，格式如 `ExponentPushToken[xxxxxx]`
 * @throws 在模拟器或缺少 projectId 时抛出错误
 */
export async function getExpoPushToken(): Promise<string> {
  if (!Device.isDevice) {
    throw new Error('Push Token 仅在物理设备上可用');
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      '未找到 EAS projectId，请运行 eas init 或在 app.json 中配置 extra.eas.projectId',
    );
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

// ---------------------------------------------------------------------------
// Local Notification Scheduling
// ---------------------------------------------------------------------------

/**
 * 调度一条本地通知。
 *
 * @returns 通知标识符，可用于后续取消
 */
export async function scheduleLocalNotification(
  input: LocalNotificationInput,
): Promise<string> {
  await ensureAndroidChannel();

  const trigger =
    input.delaySeconds != null
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL as const,
          seconds: input.delaySeconds,
          repeats: input.repeats ?? false,
          channelId: DEFAULT_CHANNEL_ID,
        }
      : null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: input.data,
      sound: true,
    },
    trigger,
  });
}

/**
 * 取消指定的已调度通知。
 */
export async function cancelScheduledNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * 取消所有已调度的通知。
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * 获取所有已调度通知的摘要信息。
 */
export async function getScheduledNotifications(): Promise<
  ScheduledNotificationInfo[]
> {
  const list = await Notifications.getAllScheduledNotificationsAsync();

  return list.map((n) => {
    const { title, body } = n.content;
    const trigger = n.trigger;

    let triggerDesc = '立即';
    if (trigger && 'seconds' in trigger) {
      triggerDesc = `${trigger.seconds}秒后`;
    } else if (trigger && 'dateComponents' in trigger) {
      triggerDesc = '日历触发';
    }

    return { id: n.identifier, title, body, trigger: triggerDesc };
  });
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

// ---------------------------------------------------------------------------
// Dismiss
// ---------------------------------------------------------------------------

/**
 * 清除通知中心（托盘）里的所有已展示通知。
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
