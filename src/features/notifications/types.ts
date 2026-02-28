/**
 * 通知模块类型定义。
 *
 * 将 expo-notifications 的复杂类型收敛到业务语义，
 * 上层组件只依赖本模块类型，不直接引用 expo-notifications 的内部类型。
 */

/** 本地通知的调度配置 */
export interface LocalNotificationInput {
  title: string;
  body: string;
  /** 附带的业务数据，通知点击时可从 response.notification.request.content.data 取回 */
  data?: Record<string, unknown>;
  /** 触发延迟秒数，null/undefined 表示立即触发 */
  delaySeconds?: number;
  /** 是否重复触发（delaySeconds >= 60 时才允许重复） */
  repeats?: boolean;
}

/** 已调度通知的摘要信息 */
export interface ScheduledNotificationInfo {
  id: string;
  title: string | null;
  body: string | null;
  trigger: string;
}
