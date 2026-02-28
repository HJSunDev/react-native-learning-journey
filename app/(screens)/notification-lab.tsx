import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import {
  cancelAllScheduledNotifications,
  cancelScheduledNotification,
  dismissAllNotifications,
  getBadgeCount,
  getExpoPushToken,
  getScheduledNotifications,
  requestNotificationPermission,
  scheduleLocalNotification,
  setBadgeCount,
  useNotificationListeners,
  type ScheduledNotificationInfo,
} from '../../src/features/notifications';

// ---------------------------------------------------------------------------
// Section 1: Permission & Push Token
// ---------------------------------------------------------------------------

function PermissionSection() {
  const isDark = useColorScheme() === 'dark';
  const [permGranted, setPermGranted] = useState<boolean | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setPermGranted(granted);
  }, []);

  const handleGetToken = useCallback(async () => {
    try {
      setTokenError(null);
      const token = await getExpoPushToken();
      setPushToken(token);
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : '获取失败');
    }
  }, []);

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons name="key" size={18} color={isDark ? '#818CF8' : '#6366F1'} />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          权限与 Push Token
        </Text>
      </View>

      <View className="flex-row gap-2 mb-3">
        <Pressable
          onPress={handleRequestPermission}
          className="flex-1 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
        >
          <Text className="text-sm font-semibold text-white">请求权限</Text>
        </Pressable>
        <Pressable
          onPress={handleGetToken}
          className="flex-1 items-center rounded-xl bg-gray-100 dark:bg-gray-700 py-3 active:bg-gray-200 dark:active:bg-gray-600"
        >
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            获取 Token
          </Text>
        </Pressable>
      </View>

      {permGranted !== null && (
        <View
          className={`rounded-xl p-3 mb-2 ${
            permGranted
              ? 'bg-emerald-50 dark:bg-emerald-950'
              : 'bg-red-50 dark:bg-red-950'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              permGranted
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            {permGranted ? '通知权限已授予' : '通知权限被拒绝'}
          </Text>
        </View>
      )}

      {pushToken && (
        <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Expo Push Token
          </Text>
          <Text
            className="text-xs font-mono text-gray-800 dark:text-gray-200"
            selectable
          >
            {pushToken}
          </Text>
        </View>
      )}

      {tokenError && (
        <View className="rounded-xl bg-amber-50 dark:bg-amber-950 p-3">
          <Text className="text-xs text-amber-700 dark:text-amber-300">
            {tokenError}
          </Text>
          <Text className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Push Token 仅在物理设备 + EAS 项目中可用
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Local Notification Scheduler
// ---------------------------------------------------------------------------

function SchedulerSection() {
  const isDark = useColorScheme() === 'dark';
  const [title, setTitle] = useState('测试通知');
  const [body, setBody] = useState('这是一条来自 RN Journey 的本地通知');
  const [delay, setDelay] = useState('5');
  const [sending, setSending] = useState(false);

  const handleSendImmediate = useCallback(async () => {
    setSending(true);
    try {
      await scheduleLocalNotification({ title, body });
      Alert.alert('已发送', '通知已立即触发');
    } catch (e) {
      Alert.alert('发送失败', e instanceof Error ? e.message : '未知错误');
    } finally {
      setSending(false);
    }
  }, [title, body]);

  const handleSendDelayed = useCallback(async () => {
    const seconds = parseInt(delay, 10);
    if (isNaN(seconds) || seconds <= 0) {
      Alert.alert('参数错误', '请输入大于 0 的秒数');
      return;
    }

    setSending(true);
    try {
      await scheduleLocalNotification({
        title,
        body,
        delaySeconds: seconds,
        data: { url: '/notification-lab' },
      });
      Alert.alert('已调度', `通知将在 ${seconds} 秒后触发`);
    } catch (e) {
      Alert.alert('调度失败', e instanceof Error ? e.message : '未知错误');
    } finally {
      setSending(false);
    }
  }, [title, body, delay]);

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="send"
          size={18}
          color={isDark ? '#818CF8' : '#6366F1'}
        />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          本地通知调度
        </Text>
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="通知标题"
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-[14px] text-gray-800 dark:text-gray-200 mb-2"
      />

      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="通知内容"
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        multiline
        numberOfLines={2}
        className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-[14px] text-gray-800 dark:text-gray-200 mb-2"
      />

      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          延迟
        </Text>
        {/* NativeWind v5 preview 对 TextInput 的 text-center 存在 nativeStyleMapping path bug */}
        <View style={{ width: 64 }}>
          <TextInput
            value={delay}
            onChangeText={setDelay}
            keyboardType="number-pad"
            className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-[14px] text-gray-800 dark:text-gray-200"
          />
        </View>
        <Text className="text-sm text-gray-500 dark:text-gray-400">秒</Text>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={handleSendImmediate}
          disabled={sending}
          className={`flex-1 items-center rounded-xl py-3 ${
            sending
              ? 'bg-gray-200 dark:bg-gray-600'
              : 'bg-indigo-600 active:bg-indigo-700'
          }`}
        >
          <Text className="text-sm font-semibold text-white">立即发送</Text>
        </Pressable>
        <Pressable
          onPress={handleSendDelayed}
          disabled={sending}
          className={`flex-1 items-center rounded-xl py-3 ${
            sending
              ? 'bg-gray-200 dark:bg-gray-600'
              : 'bg-indigo-600 active:bg-indigo-700'
          }`}
        >
          <Text className="text-sm font-semibold text-white">定时发送</Text>
        </Pressable>
      </View>

      <View className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          「立即发送」使用 trigger: null 立即展示通知。
          {'\n'}「定时发送」使用 TIME_INTERVAL 触发器延迟展示，
          并携带 data.url 用于通知点击导航。
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Scheduled Notifications Manager
// ---------------------------------------------------------------------------

function ScheduledListSection() {
  const isDark = useColorScheme() === 'dark';
  const [list, setList] = useState<ScheduledNotificationInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getScheduledNotifications();
      setList(result);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCancelOne = useCallback(
    async (id: string) => {
      await cancelScheduledNotification(id);
      refresh();
    },
    [refresh],
  );

  const handleCancelAll = useCallback(async () => {
    await cancelAllScheduledNotifications();
    setList([]);
  }, []);

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="list"
          size={18}
          color={isDark ? '#818CF8' : '#6366F1'}
        />
        <Text className="ml-2 flex-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
          已调度通知
        </Text>
        <Pressable
          onPress={refresh}
          className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-1.5 active:bg-gray-200 dark:active:bg-gray-600"
        >
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {loading ? '加载中...' : '刷新'}
          </Text>
        </Pressable>
      </View>

      {list.length === 0 ? (
        <View className="items-center py-6">
          <Ionicons
            name="notifications-off-outline"
            size={32}
            color={isDark ? '#4B5563' : '#D1D5DB'}
          />
          <Text className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            暂无已调度的通知
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {list.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center rounded-xl bg-gray-50 dark:bg-gray-700 p-3"
            >
              <View className="flex-1">
                <Text
                  className="text-sm font-medium text-gray-800 dark:text-gray-200"
                  numberOfLines={1}
                >
                  {item.title ?? '(无标题)'}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.trigger} · {item.id.slice(0, 8)}...
                </Text>
              </View>
              <Pressable
                onPress={() => handleCancelOne(item.id)}
                className="ml-2 h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950 active:bg-red-100 dark:active:bg-red-900"
              >
                <Ionicons
                  name="close"
                  size={16}
                  color={isDark ? '#FCA5A5' : '#EF4444'}
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {list.length > 0 && (
        <Pressable
          onPress={handleCancelAll}
          className="mt-3 items-center rounded-xl bg-red-50 dark:bg-red-950 py-2.5 active:bg-red-100 dark:active:bg-red-900"
        >
          <Text className="text-sm font-medium text-red-600 dark:text-red-400">
            取消全部
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 4: Badge Control
// ---------------------------------------------------------------------------

function BadgeSection() {
  const isDark = useColorScheme() === 'dark';
  const [badge, setBadge] = useState<number | null>(null);

  const handleGet = useCallback(async () => {
    const count = await getBadgeCount();
    setBadge(count);
  }, []);

  const handleSet = useCallback(async (count: number) => {
    await setBadgeCount(count);
    setBadge(count);
  }, []);

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="ellipse"
          size={18}
          color={isDark ? '#818CF8' : '#6366F1'}
        />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          App 角标
        </Text>
      </View>

      <View className="flex-row gap-2 mb-3">
        <Pressable
          onPress={handleGet}
          className="flex-1 items-center rounded-xl bg-gray-100 dark:bg-gray-700 py-3 active:bg-gray-200 dark:active:bg-gray-600"
        >
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            读取角标
          </Text>
        </Pressable>
        {[1, 5, 99].map((n) => (
          <Pressable
            key={n}
            onPress={() => handleSet(n)}
            className="items-center rounded-xl bg-indigo-600 px-4 py-3 active:bg-indigo-700"
          >
            <Text className="text-sm font-semibold text-white">{n}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => handleSet(0)}
          className="items-center rounded-xl bg-red-50 dark:bg-red-950 px-4 py-3 active:bg-red-100 dark:active:bg-red-900"
        >
          <Text className="text-sm font-medium text-red-600 dark:text-red-400">
            清除
          </Text>
        </Pressable>
      </View>

      {badge !== null && (
        <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
          <Text className="text-sm text-gray-800 dark:text-gray-200">
            当前角标：
            <Text className="font-semibold">{badge}</Text>
          </Text>
        </View>
      )}

      <View className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          角标是 App 图标右上角的数字标记。iOS 需要通知权限的 allowBadge 授权。
          {'\n'}并非所有 Android 启动器都支持角标显示。
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 5: Notification Event Monitor
// ---------------------------------------------------------------------------

function EventMonitorSection() {
  const isDark = useColorScheme() === 'dark';
  const { lastNotification, lastResponse } = useNotificationListeners();

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="pulse"
          size={18}
          color={isDark ? '#818CF8' : '#6366F1'}
        />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          事件监听
        </Text>
      </View>

      <View className="gap-3">
        <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            最近收到的通知 (NotificationReceived)
          </Text>
          {lastNotification ? (
            <View>
              <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {lastNotification.request.content.title ?? '(无标题)'}
              </Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {lastNotification.request.content.body ?? '(无内容)'}
              </Text>
              {lastNotification.request.content.data &&
                Object.keys(lastNotification.request.content.data).length >
                  0 && (
                  <Text className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
                    data:{' '}
                    {JSON.stringify(lastNotification.request.content.data)}
                  </Text>
                )}
            </View>
          ) : (
            <Text className="text-sm text-gray-400 dark:text-gray-500">
              等待通知到达...
            </Text>
          )}
        </View>

        <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            最近的交互响应 (NotificationResponseReceived)
          </Text>
          {lastResponse ? (
            <View>
              <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {lastResponse.notification.request.content.title ?? '(无标题)'}
              </Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Action: {lastResponse.actionIdentifier}
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-gray-400 dark:text-gray-500">
              等待用户点击通知...
            </Text>
          )}
        </View>
      </View>

      <View className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          NotificationReceived: App 在前台时收到通知触发。
          {'\n'}NotificationResponseReceived: 用户点击/交互通知时触发。
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 6: Utility Actions
// ---------------------------------------------------------------------------

function UtilitySection() {
  const isDark = useColorScheme() === 'dark';

  const handleDismissAll = useCallback(async () => {
    await dismissAllNotifications();
    Alert.alert('已清除', '通知中心中的所有通知已被移除');
  }, []);

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center mb-3">
        <Ionicons
          name="build"
          size={18}
          color={isDark ? '#818CF8' : '#6366F1'}
        />
        <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          通知管理
        </Text>
      </View>

      <Pressable
        onPress={handleDismissAll}
        className="flex-row items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-700 py-3 active:bg-gray-200 dark:active:bg-gray-600"
      >
        <Ionicons
          name="trash-outline"
          size={16}
          color={isDark ? '#D1D5DB' : '#374151'}
        />
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          清除通知中心所有通知
        </Text>
      </Pressable>

      <View className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          dismissAllNotificationsAsync 仅移除已展示在通知中心/托盘中的通知，
          {'\n'}不会影响未来已调度的通知。
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Section 7: Architecture Diagram
// ---------------------------------------------------------------------------

function ArchitectureDiagram() {
  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-gray-800 p-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        通知系统数据流
      </Text>
      <View className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
        <Text className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-5">
          {'┌─── 本地通知 ──────────────────────\n'}
          {'│ scheduleNotificationAsync()      \n'}
          {'│   → trigger(null / TIME_INTERVAL)\n'}
          {'│   → 系统通知中心展示               \n'}
          {'└──────────────────────────────────\n'}
          {'\n'}
          {'┌─── 远程推送 ──────────────────────\n'}
          {'│ 服务端 → Expo Push Service        \n'}
          {'│   → APNs (iOS) / FCM (Android)   \n'}
          {'│   → 设备展示通知                  \n'}
          {'└──────────────────────────────────\n'}
          {'\n'}
          {'┌─── 事件监听 ──────────────────────\n'}
          {'│ setNotificationHandler           \n'}
          {'│   → 前台收到时决定是否展示         \n'}
          {'│ addNotificationReceivedListener  \n'}
          {'│   → 前台收到通知时回调             \n'}
          {'│ addNotificationResponseReceived  \n'}
          {'│   → 用户点击通知时回调             \n'}
          {'│ getLastNotificationResponse      \n'}
          {'│   → 冷启动时获取启动通知           \n'}
          {'└──────────────────────────────────'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function NotificationLabScreen() {
  // 进入页面时自动检查权限状态
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: '推送通知' }} />

      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <PermissionSection />

        <ArchitectureDiagram />

        <Text className="mb-2 mt-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          本地通知
        </Text>

        <SchedulerSection />
        <ScheduledListSection />

        <Text className="mb-2 mt-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          角标与事件
        </Text>

        <BadgeSection />
        <EventMonitorSection />
        <UtilitySection />
      </ScrollView>
    </>
  );
}
