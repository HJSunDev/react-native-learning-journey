import type { Author, Post } from './types';

const AUTHORS: Author[] = [
  { id: 'a1', name: '林晓峰', avatar: 'https://picsum.photos/seed/av1/100/100' },
  { id: 'a2', name: '张思远', avatar: 'https://picsum.photos/seed/av2/100/100' },
  { id: 'a3', name: '王子墨', avatar: 'https://picsum.photos/seed/av3/100/100' },
  { id: 'a4', name: '李明轩', avatar: 'https://picsum.photos/seed/av4/100/100' },
  { id: 'a5', name: '陈思琪', avatar: 'https://picsum.photos/seed/av5/100/100' },
  { id: 'a6', name: '赵一凡', avatar: 'https://picsum.photos/seed/av6/100/100' },
];

interface PostSeed {
  title: string;
  summary: string;
  tags: string[];
}

const SEEDS: PostSeed[] = [
  {
    title: 'React Native 新架构完全指南：Fabric 与 TurboModules',
    summary: '深入剖析 RN 新架构的两大支柱：Fabric 渲染器如何实现同步布局，TurboModules 如何按需加载原生模块以减少启动开销。',
    tags: ['React Native', '架构'],
  },
  {
    title: '用 FlashList 替代 FlatList：性能提升 5 倍的秘密',
    summary: 'Shopify 开源的 FlashList 通过 Cell 回收复用机制，将列表渲染性能提升至原生水平。本文详解其原理与迁移实践。',
    tags: ['性能优化', 'FlashList'],
  },
  {
    title: 'Expo Router v4 文件路由深度解析',
    summary: '从零理解 Expo Router 的文件路由约定、布局嵌套、路由分组与类型安全导航，构建企业级路由架构。',
    tags: ['Expo', '路由'],
  },
  {
    title: 'Zustand vs Redux Toolkit：2025 状态管理选型指南',
    summary: '对比两大状态管理方案的 API 设计、包体积、性能表现与生态系统，帮你做出适合项目的选择。',
    tags: ['状态管理', 'Zustand'],
  },
  {
    title: '移动端手势交互设计：从 PanGesture 到流畅的卡片滑动',
    summary: '结合 react-native-gesture-handler 与 Reanimated，实现丝滑的滑动删除、可拖拽排序等高级手势交互。',
    tags: ['手势', '动画'],
  },
  {
    title: 'React Query 在 React Native 中的最佳实践',
    summary: '掌握 useQuery、useMutation 与 useInfiniteQuery 在移动端的正确用法，处理离线缓存、后台刷新与乐观更新。',
    tags: ['React Query', '网络'],
  },
  {
    title: 'NativeWind v5 实战：用 Tailwind 写 React Native 样式',
    summary: '告别 StyleSheet.create，拥抱 className。本文涵盖 NativeWind v5 的配置、用法、Design Token 与平台适配。',
    tags: ['样式', 'NativeWind'],
  },
  {
    title: '构建离线优先的移动应用：SQLite + React Query',
    summary: '利用 expo-sqlite 实现本地数据持久化，配合 React Query 的缓存策略，打造断网也能用的优质体验。',
    tags: ['离线', 'SQLite'],
  },
  {
    title: 'React Native 动画从入门到精通',
    summary: '系统学习 Reanimated 的 SharedValue、Animated Style、Layout Animation 以及 Shared Element Transition。',
    tags: ['动画', 'Reanimated'],
  },
  {
    title: 'Expo SDK 54 新功能速览与迁移指南',
    summary: 'SDK 54 带来了 React Native 0.81、全新的 expo-camera API、改进的 EAS Build 等重要更新。',
    tags: ['Expo', '更新'],
  },
  {
    title: '移动端暗色模式完整实现方案',
    summary: '从 useColorScheme 到 NativeWind dark: 前缀，再到用户偏好持久化，实现系统级的暗色模式支持。',
    tags: ['主题', 'UI'],
  },
  {
    title: 'TypeScript 严格模式下的 React Native 开发',
    summary: '启用 strict 模式后，如何优雅处理导航参数类型、组件 Props 推断与第三方库的类型兼容问题。',
    tags: ['TypeScript', '工程化'],
  },
  {
    title: '深入理解 Metro Bundler：配置、优化与调试',
    summary: 'Metro 是 React Native 的打包引擎。掌握其配置、Tree Shaking、缓存机制与自定义 Transformer。',
    tags: ['工具链', 'Metro'],
  },
  {
    title: 'EAS Build 实战：从零到 App Store 上架',
    summary: '使用 Expo Application Services 完成 iOS 和 Android 的云端构建、签名配置、提审与 OTA 更新。',
    tags: ['发布', 'EAS'],
  },
  {
    title: '移动端表单设计：react-hook-form + Zod 实践',
    summary: '结合 react-hook-form 的高性能表单管理与 Zod 的类型安全校验，构建复杂的移动端表单体验。',
    tags: ['表单', '校验'],
  },
  {
    title: 'React Native 无障碍开发指南',
    summary: '为视障和运动障碍用户优化体验：accessibilityLabel、accessibilityRole 与 VoiceOver/TalkBack 测试。',
    tags: ['无障碍', 'A11y'],
  },
  {
    title: '用 expo-image 替代 Image：加载速度提升 3 倍',
    summary: 'expo-image 基于 SDWebImage 和 Glide，提供自动缓存、BlurHash 占位、渐进式加载等企业级图片方案。',
    tags: ['图片', '性能'],
  },
  {
    title: '从 Web 到 Native：前端工程师的思维转变',
    summary: '对比 Web 和 Native 在布局模型、事件系统、渲染机制上的核心差异，帮助 Web 开发者快速适应。',
    tags: ['入门', '对比'],
  },
  {
    title: '推送通知完整方案：expo-notifications 实战',
    summary: '从本地通知到远程推送，涵盖权限请求、Token 注册、服务端集成与通知点击后的路由跳转。',
    tags: ['通知', 'Expo'],
  },
  {
    title: '移动端安全实践：认证、加密与数据保护',
    summary: '使用 SecureStore 管理 Token、expo-local-authentication 实现生物认证、HTTPS Pinning 防中间人攻击。',
    tags: ['安全', '认证'],
  },
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** 20 条确定性 Mock 数据，时间戳相对于当前时间生成，保证 Feed 始终"新鲜" */
export const MOCK_POSTS: Post[] = SEEDS.map((seed, i) => ({
  id: `post-${i + 1}`,
  ...seed,
  coverImage: `https://picsum.photos/seed/post${i + 1}/800/450`,
  author: AUTHORS[i % AUTHORS.length],
  createdAt: daysAgo(i + 1),
  likes: 50 + ((i * 37 + 13) % 450),
  comments: 5 + ((i * 13 + 7) % 95),
}));
