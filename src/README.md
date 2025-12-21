# src 目录说明

本项目采用 **特性驱动 (Feature-First)** 的架构组织代码。

## 核心原则

1.  **特性内聚**：与特定业务功能（Feature）相关的所有代码（API、Hooks、Types、Components）必须放在 `features/<feature-name>` 目录下，禁止散落在全局。
2.  **全局通用**：只有跨多个 Feature 复用的代码才允许放在根目录下的 `api/`, `utils/`, `components/` 中。

## 目录结构

### `features/` (业务核心)
每个子目录代表一个独立的业务模块。
- **`auth/`**: 认证模块示例
  - `api.ts`: 该模块专用的 API 请求
  - `types.ts`: 该模块专用的类型定义
  - `useAuth.ts`: 该模块的自定义 Hooks
  - `index.ts`: 模块对外暴露的公共接口 (Barrel Export)

### `api/` (网络层)
- `client.ts`: 全局 Axios/Fetch 实例配置（拦截器、超时等）
- `config.ts`: 环境变量与 API 基础配置

### `utils/` (工具库)
- `storage.ts`: 纯函数或单例工具（如 AsyncStorage 封装）

## 开发规范

- **新增功能**：请在 `features/` 下新建目录，不要随意修改现有目录结构。
- **引用规则**：尽量通过 `index.ts` 导入模块内容，保持模块封装性。
