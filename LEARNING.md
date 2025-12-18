## 🚀 Chapter 1: Windows 环境开发注意事项

### 1. 项目路径配置规范 (Project Path Configuration)

在 Windows 系统下进行 React Native 开发时，必须严格遵守“路径极简原则”。

**✅ 推荐做法：**
将项目直接放置在盘符根目录或二级目录下，且目录名仅使用英文、数字和连字符。

* `D:\Dev\react-native-learning-journey`
* `C:\Code\rn-project`

**❌ 严禁做法：**

* 放在桌面或用户文档目录：`C:\Users\Huajiang\Desktop\My Projects\...`
* 路径包含空格：`D:\My Projects\React Native App`
* 路径包含中文：`D:\代码\我的项目`

### 2. 核心原因解析 (Why?)

#### A. Windows MAX_PATH 限制 (260字符)

尽管现代 Windows (win10/11) 允许通过注册表解除路径长度限制，但 React Native 依赖的工具链（特别是 Android 构建工具）仍然受限：

* **Gradle 构建过程**：Android 编译时，Gradle 会在 `build` 目录下生成大量嵌套极深的中间文件（Intermediate files）。
* **npm/yarn 依赖树**：前端项目的 `node_modules` 本身具有深层嵌套特性。

当 **"项目基础路径" + "node_modules嵌套" + "Gradle构建产物"** 叠加时，极易突破 260 字符限制，导致编译直接报错（通常报 `File not found` 或 `AAPT2 error`），且此类错误极难排查。

#### B. 工具链兼容性 (Toolchain Compatibility)

* **Metro Bundler**：RN 的打包工具在处理包含空格或特殊字符（如中文）的路径时，文件监听（Watchman）和模块解析可能会失效。
* **NDK & CMake**：如果你未来涉及到 C++ 原生模块开发，许多底层构建脚本对空格路径的支持几乎为零。

---

## 🚀 Chapter 2: 项目初始化实战

### 1. Expo 项目创建指令 (Project Creation)

根据当前目录结构的不同，有两种初始化方式：

#### 场景 A：已手动创建并进入文件夹（推荐）

如果你已经根据 Windows 规范建好了文件夹（如 `E:\Dev\rn-journey`）并位于该目录下：

```bash
# 注意命令最后的点 "."，代表在当前目录展开
npx create-expo-app@latest .
```

#### 场景 B：尚未创建文件夹

如果你还在根目录（如 `E:\Dev`），希望 CLI 自动创建文件夹：

```bash
# 这将自动创建一个名为 rn-journey 的新文件夹
npx create-expo-app@latest rn-journey
```

### 2. 依赖警告解析 (Dependency Warnings)

在创建项目过程中，控制台可能会输出大量 `npm warn deprecated` 警告（如 `inflight`, `rimraf`, `glob` 等）。

**现象截图：**

![1766061972251](image/LEARNING/1766061972251.png)

**核心原因：**

* **间接依赖 (Transitive Dependencies)**：这些过时的包通常不是项目直接使用的，而是底层工具链（如 Metro Bundler, Jest 等）所依赖的深层库。
* **版本锁定 (Version Locking)**：React Native 和 Expo 为了保证跨平台构建的稳定性，严格锁定了依赖树的版本。上游工具库可能尚未更新对这些底层包的引用。

**处理原则：**

1. **忽略警告**：只要最终显示 `Your project is ready!` 且没有 `ERR!` 报错，即可视为安装成功。
2. **❌ 禁止盲目修复**：**千万不要** 随意运行 `npm audit fix`。在 React Native 项目中，强制升级依赖版本极大概率会导致 Metro 打包器与原生运行时不兼容，导致项目无法启动。

---
