/**
 * 权限状态枚举，用于描述权限请求的完整生命周期。
 *
 * - 'loading'：表示权限状态正在异步查询阶段，界面可用于展示加载指示器，避免误判状态。
 * - 'undetermined'：首次请求前的初始状态，通常触发权请求弹窗。
 * - 'granted'：权限已被授予，可直接访问相关 API。
 * - 'denied'：用户明确拒绝，但仍可重复发起请求（canAskAgain=true），适用于普通拒绝场景。
 * - 'blocked'：用户永久拒绝（如“拒绝且不再询问”），需引导到系统设置中手动开启权限，后续无法弹窗请求（canAskAgain=false）。
 */
export type PermissionState =
  | "loading"
  | "undetermined"
  | "granted"
  | "denied"
  | "blocked";

/**
 * 权限适配器接口。
 *
 * 各 Expo 模块的权限 API 都遵循相同形状（get/request 返回 granted + canAskAgain），
 * 通过此接口将不同模块的权限操作统一为可互换的适配器。
 */
export interface PermissionAdapter {
  get: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  request: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
}
