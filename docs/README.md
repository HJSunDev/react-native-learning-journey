# 📚 React Native Learning Journey (索引)

这里是项目学习文档的总入口。为了保持轻量和条理，所有的具体知识点都拆分成了独立的原子笔记。

## 🚀 阶段一：环境与启动 (起始)

> 早期记录均存放在根目录的 [LEARNING.md](../LEARNING.md) 中，作为永久存档。

- **[LEARNING.md](../LEARNING.md)**
  - Chapter 1: Windows 环境开发注意事项 (路径规范)
  - Chapter 2: 项目初始化 (Expo Create)
  - Chapter 3: Expo 项目启动指南 (iOS/Android/Web)
  - Chapter 4: 项目重置 (Reset Project)

## 🧩 阶段二：基础概念与核心组件

> 新的笔记将自动添加到下方

<!-- NEW_NOTES_START -->
- **[005. Expo Router 路由与基础组件](notes/005-expo-router-basics.md)**
  - 涵盖文件路由、Stack/Tabs 布局嵌套、View/Text 组件及 StyleSheet 样式管理
- **[007. Tabs 导航与底部导航栏设计](notes/007-tabs-navigation.md)**
  - Tabs 核心概念与配置、徽章显示、自定义 TabBar、浮动毛玻璃 TabBar、与 Stack 组合架构
- **[008. 客户端架构设计与 API 对接准备](notes/007-client-arch-and-api-setup.md)**
  - 总结前端网络层架构 (Axios + React Query) 及目录规范，包含 iOS 键盘交互处理
- **[009. 全局认证状态管理与安全存储](notes/009-auth-state-and-secure-storage.md)**
  - Zustand 全局 Auth 状态、expo-secure-store 加密存储、AuthGuard 路由守卫与路由重构
- **[010. NativeWind 样式引擎集成与最佳实践](notes/010-nativewind-setup.md)**
  - NativeWind v5 集成配置、Tailwind CSS utility-first 用法、Design Token 体系与未来组件库扩展路线
- **[011. React Native 交互事件体系](notes/011-rn-interaction-events.md)**
  - Pressable 生命周期、TextInput 事件、键盘管理、滚动/列表交互、Gesture Handler 手势系统、触觉反馈

<!-- 这是一个锚点，AI 会自动识别这里并追加新链接 -->

<!-- NEW_NOTES_END -->

## 🛠️ 阶段三：核心开发能力

> 补齐独立开发 App 所需的核心拼图。完成本阶段即具备交付完整产品的能力。

- 🔲 **012. 列表与数据流**
  - FlatList 核心 API → FlashList 生产落地、SectionList 分组场景、分页加载 (useInfiniteQuery)、下拉刷新、列表状态模式 (空/加载/错误)
- 🔲 **013. 表单体系**
  - react-hook-form + Zod 校验集成、复杂表单模式 (多步骤/动态字段)、原生选择器 (Picker/DateTimePicker)、表单 UX
- 🔲 **014. 图片与媒体**
  - expo-image 深度用法 (缓存/placeholder/blurhash)、expo-image-picker、图片裁剪压缩、上传流程 (FormData + 进度)
- 🔲 **015. 导航进阶**
  - Modal/Bottom Sheet、Drawer 导航、Deep Linking (URL Scheme + Universal Links)、动态路由 `[id].tsx`、页面传参方式对比
- 🔲 **016. 暗色模式与主题系统**
  - useColorScheme + NativeWind dark: 实战、主题切换 (跟随系统/手动/持久化)、状态栏与导航栏联动、Design Token 驱动主题架构

## 📱 阶段四：设备与平台能力

> 让 App 具备原生质感，调用设备硬件与系统能力。

- 🔲 **017. 权限与设备 API**
  - 权限请求统一模式、expo-camera (扫码/拍照)、expo-location (前台/后台定位)、expo-file-system、Share API、Clipboard
- 🔲 **018. 推送通知**
  - expo-notifications 本地通知、远程推送 (Push Token 注册/服务端流程)、通知点击导航、权限请求 UX
- 🔲 **019. 生物认证与安全**
  - expo-local-authentication (指纹/Face ID)、与 SecureStore 配合的安全架构、App Lock 模式

## ✨ 阶段五：体验与性能打磨

> 从"能用"到"好用"，打磨产品质感。

- 🔲 **020. 动画进阶**
  - Layout Animations (列表增删)、Shared Element Transition、手势驱动动画 (Pan + Reanimated)、Lottie、Skeleton Screen
- 🔲 **021. 性能优化实战**
  - 渲染优化 (memo/useCallback)、FlatList 调优 (windowSize/maxToRenderPerBatch)、图片性能、Bundle 分析、Hermes、Profiler
- 🔲 **022. 错误处理与健壮性**
  - Error Boundary + 降级 UI、全局错误处理策略、React Query 错误重试与降级、Crash Reporting (Sentry)
- 🔲 **023. 离线与本地数据库**
  - expo-sqlite、MMKV 高性能 KV 存储、React Query 持久化缓存、离线优先模式与数据同步策略

## 🚀 阶段六：构建与发布

> 最后一公里，把 App 送到用户手中。

- 🔲 **024. 构建与发布流程**
  - EAS Build 云构建、App 图标/启动屏生成、app.config.ts 多环境配置、App Store + Google Play 提审、expo-updates OTA 热更新、版本管理

---

## 📝 维护指南

- 所有的详细笔记存放在 `docs/notes/` 目录下。
- 命名格式：`SEQ-topic-name.md` (例如 `005-view-component.md`)。
- 每次新增笔记后，必须更新本文件的目录。
- 章节完成后，将 🔲 替换为对应的笔记链接（格式同阶段二）。
