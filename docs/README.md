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
- **[007. Tabs 导航与底部导航栏设计](notes/006-tabs-navigation.md)**
  - Tabs 核心概念与配置、徽章显示、自定义 TabBar、与 Stack 组合架构
- **[008. 客户端架构设计与 API 对接准备](notes/007-client-arch-and-api-setup.md)**
  - 总结前端网络层架构 (Axios + React Query) 及目录规范，包含 iOS 键盘交互处理
- **[009. 全局认证状态管理与安全存储](notes/009-auth-state-and-secure-storage.md)**
  - Zustand 全局 Auth 状态、expo-secure-store 加密存储、AuthGuard 路由守卫与路由重构
- **[010. NativeWind 样式引擎集成与最佳实践](notes/010-nativewind-setup.md)**
  - NativeWind v5 集成配置、Tailwind CSS utility-first 用法、Design Token 体系与未来组件库扩展路线

<!-- 这是一个锚点，AI 会自动识别这里并追加新链接 -->

<!-- NEW_NOTES_END -->

## 📝 维护指南

- 所有的详细笔记存放在 `docs/notes/` 目录下。
- 命名格式：`SEQ-topic-name.md` (例如 `005-view-component.md`)。
- 每次新增笔记后，必须更新本文件的目录。
