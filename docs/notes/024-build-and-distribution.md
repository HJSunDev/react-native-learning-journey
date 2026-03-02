# 024. 应用构建与分发

## 1. 核心问题与概念

- **解决什么问题**: 开发阶段的应用只能通过 `npx expo start` 在本地运行，其他人无法访问。本章解决"如何让别人看到并使用你的 App"这一最后一公里问题。
- **核心概念与依赖**:
  - **EAS (Expo Application Services)**: Expo 提供的云端服务套件，包含 Build（云构建）、Update（OTA 更新）、Submit（商店提交）等。
  - **EAS Update**: 将 JS Bundle 发布到 Expo 云端，设备通过 Expo Go 或独立构建直接拉取，无需开发者本地运行服务器。
  - **EAS Build**: 云端编译生成 `.apk`（Android）或 `.ipa`（iOS）独立安装包。Windows 用户无需 Mac 即可构建 iOS 应用。
  - **Channel / Branch**: EAS Update 的核心分发概念。Channel 是构建绑定的"频道"，Branch 是更新发布的"分支"，Channel 映射到 Branch 以确定构建接收哪个分支的更新。
  - **Runtime Version**: 标识原生代码版本，确保 OTA 更新只推送给兼容的构建。

## 2. 分发方案全景对比

根据是否持有 Apple Developer 账号，分发方案分为两大阶段：

| 维度               | 方案 A: EAS Update + Expo Go           | 方案 B: EAS Build + TestFlight         |
| ------------------ | -------------------------------------- | -------------------------------------- |
| **开销**     | 完全免费（EAS Free 套餐）              | Apple Developer $99/年 + EAS Free 套餐 |
| **对方需要** | 安装 Expo Go App（免费）               | 安装 TestFlight App（免费）            |
| **体验**     | 在 Expo Go 容器内运行，有 Expo UI 框架 | 独立 App，与上架版本一致               |
| **分享方式** | EAS Dashboard 链接 → 扫码             | TestFlight 邀请链接 → 点击安装        |
| **持久性**   | 持久化，不依赖开发者电脑               | 持久化，90 天有效期（可续）            |
| **限制**     | 仅 Expo SDK 内置模块；1000 MAU/月      | 无模块限制；10000 测试者               |
| **适用阶段** | 学习展示、个人项目分享、面试演示       | 正式内测、准上架阶段                   |

## 3. 方案 A：EAS Update + Expo Go（零成本分发）

### 3.1 原理

```
开发者电脑                     Expo 云端                     对方手机
┌─────────┐   eas update    ┌──────────────┐   扫码拉取    ┌──────────┐
│ JS 代码  │ ──────────────→│ EAS 服务器    │ ←─────────── │ Expo Go  │
│ 静态资源 │  上传 Bundle    │ 存储 Bundle  │   下载运行    │ App      │
└─────────┘                 └──────────────┘              └──────────┘
```

`eas update` 将项目的 JS Bundle 和静态资源打包上传到 Expo 云端。对方通过 Expo Go 扫描 QR 码，直接从云端拉取并运行应用。开发者电脑无需保持在线。

### 3.2 EAS Free 套餐配额（截至 2026 年 3 月）

| 资源           | 免费额度                 |
| -------------- | ------------------------ |
| OTA 更新次数   | 无限制                   |
| 月活用户 (MAU) | 1,000                    |
| 全球边缘带宽   | 100 GiB                  |
| 存储空间       | 20 GiB                   |
| 云构建次数     | 15 Android + 15 iOS / 月 |
| 构建超时       | 45 分钟                  |
| 构建队列       | 低优先级                 |

> MAU 的计算方式：一个设备在一个计费周期内下载至少 1 次更新 = 1 MAU。仅检查更新但未下载不计入。同一设备多次下载只算 1 MAU。

对于个人学习项目和少量分享，免费配额绰绰有余。

### 3.3 前置准备

#### Expo 账号

EAS Update 需要 Expo 账号（免费注册）。

```bash
# 安装 EAS CLI（全局）
npm install --global eas-cli

# 登录（首次使用需要注册）
eas login

# 验证登录状态
eas whoami
```

#### 安装 expo-updates

```bash
npx expo install expo-updates
```

### 3.4 配置 EAS Update

```bash
eas update:configure
```

该命令会自动完成以下配置变更：

**app.json 新增字段：**

```json
{
  "expo": {
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/[your-project-id]"
    },
    "extra": {
      "eas": {
        "projectId": "[your-project-id]"
      }
    }
  }
}
```

- `runtimeVersion`: 决定更新与构建的兼容性。`appVersion` 策略使用 `version` 字段作为 runtime version。
- `updates.url`: 客户端检查更新的端点地址。
- `extra.eas.projectId`: Expo 项目的唯一 ID，由 `eas update:configure` 自动生成。

同时会在项目根目录创建 `eas.json`（如果不存在）：

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  }
}
```

### 3.5 发布更新

```bash
# 自动使用当前 Git 分支名作为 branch 名称
eas update --auto

# 或手动指定 channel 和描述信息
eas update --channel preview --message "完成登录页面UI"
```

命令执行完成后，终端输出包含一个 EAS Dashboard 链接：

```
✔ Published!
...
EAS Dashboard  https://expo.dev/accounts/[account]/projects/[project]/updates/[update-id]
```

### 3.6 分享给他人

**对方操作步骤：**

1. 在 iPhone 上安装 **Expo Go** App（App Store 免费下载）
2. 打开你分享的 EAS Dashboard 链接（浏览器中打开）
3. 点击页面上的 **"Preview"** 按钮
4. 看到一个 QR 码，用 iPhone 相机扫描
5. Expo Go 自动打开并加载你的应用

整个过程中开发者电脑无需在线，JS Bundle 存储在 Expo 云端服务器上。

### 3.7 更新迭代

每次代码变更后，只需重新运行 `eas update --auto`，对方下次打开时自动获取最新版本。

```bash
# 修改代码后
eas update --auto
```

Expo Go 的更新检查策略：每次 App 启动时检查是否有新的更新，下载完成后在下次启动时应用。

### 3.8 限制与注意事项

- **仅限 Expo SDK 内置模块**: 和 Expo Go 本地开发的限制一致——不支持自定义原生模块。当前项目使用的 expo-router、expo-secure-store、expo-camera、expo-location、expo-image-picker、expo-notifications、expo-local-authentication、react-native-reanimated 均在 Expo SDK 范围内，不受影响。
- **Runtime Version 必须匹配**: 发布更新时的 Expo SDK 版本必须与对方 Expo Go 的版本兼容。通常保持 Expo Go 更新到最新版即可。
- **非独立应用**: 在 Expo Go 容器内运行，应用顶部和交互体验与独立安装的 App 有差异。
- **OTA 仅能更新 JS 层**: 如果涉及原生代码变更（新增原生模块、修改权限配置、升级 Expo SDK 版本），则无法通过 OTA 推送，需要重新构建。

## 4. 方案 B：EAS Build + TestFlight / Ad Hoc（付费分发）

> 本节描述需要 Apple Developer 账号后解锁的能力。当你的项目进入正式内测或准上架阶段时再投入。

### 4.1 需要什么

| 项目                              | 说明                                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| **Apple Developer Program** | $99/年，在[developer.apple.com](https://developer.apple.com/programs/) 注册 |
| **EAS 账号**                | 方案 A 已配置好，继续使用                                                |
| **EAS Build 配额**          | Free 套餐：15 iOS 构建/月，低优先级队列，45 分钟超时                     |

无需 Mac 电脑。EAS Build 在 Expo 的云端服务器上完成 iOS 编译、签名的全部工作。

### 4.2 与方案 A 的核心区别

| 维度                    | 方案 A (EAS Update + Expo Go)           | 方案 B (EAS Build + TestFlight) |
| ----------------------- | --------------------------------------- | ------------------------------- |
| **产物**          | JS Bundle（运行在 Expo Go 容器内）      | `.ipa` 独立安装包             |
| **App 图标**      | 显示为 Expo Go 图标                     | 你自定义的 App 图标             |
| **启动体验**      | Expo Go 启动 → 加载你的 Bundle         | 直接启动你的 App                |
| **原生模块**      | 仅 Expo SDK 内置                        | 支持任何原生模块                |
| **分发量**        | 1000 MAU（Free 套餐）                   | TestFlight 最多 10,000 测试者   |
| **后续 OTA**      | 不支持（Expo Go 无法接收 channel 更新） | 支持（独立构建绑定了 channel）  |
| **面试/展示印象** | 能看到功能，但有 Expo 容器感            | 独立 App 体验，展示完整交付能力 |

### 4.3 iOS 分发的两种机制

**Ad Hoc 分发：**

- 需要注册每台目标设备的 UDID
- 每个 Apple Developer 账号最多 100 台设备/年
- 适合：给固定的几个人测试

**TestFlight 分发：**

- Apple 官方的 Beta 测试平台
- 最多 10,000 名外部测试者
- 对方只需安装 TestFlight App，点击邀请链接即可加入
- 每个构建有 90 天有效期
- 适合：团队内测、面试展示、小范围公测

### 4.4 构建流程概述

```bash
# 1. 确保 eas.json 有 preview profile（方案 A 已配置）

# 2. 构建 iOS 预览版（云端编译，无需 Mac）
eas build --platform ios --profile preview

# 3. 首次构建时 EAS CLI 会引导你：
#    - 登录 Apple Developer 账号
#    - 自动创建/管理证书和 Provisioning Profile
#    - 选择 Ad Hoc 或 App Store 分发方式

# 4. 构建完成后，EAS Dashboard 提供安装链接
```

对于 TestFlight 分发，构建 profile 改用 `production`：

```bash
# 构建 App Store / TestFlight 版本
eas build --platform ios --profile production

# 提交到 App Store Connect（会自动出现在 TestFlight 中）
eas submit --platform ios
```

### 4.5 Android 侧（补充说明）

虽然你没有 Android 设备，但构建 APK 分享给有 Android 手机的朋友同样简单：

```bash
# 构建 Android APK（免费，无需开发者账号）
eas build --platform android --profile preview
```

构建完成后 EAS Dashboard 直接提供 APK 下载链接，对方下载安装即可。Android 不需要任何开发者账号就能侧载安装。

### 4.6 EAS 套餐升级参考

当免费配额不够用时，最低付费方案：

| 套餐       | 月费                              | Build 额度          | Update MAU | 带宽    |
| ---------- | --------------------------------- | ------------------- | ---------- | ------- |
| Free       | $0                                | 15 Android + 15 iOS | 1,000      | 100 GiB |
| Starter    | $19/月 | $45 构建额度（高优先级） | 3,000               | 500 GiB    |         |
| Production | $199/月 | $225 构建额度           | 50,000              | 1 TiB      |         |

个人开发者通常 Free 套餐足够。如果构建次数不够，Starter ($19/月) 性价比最高。

## 5. 最佳实践与坑

- ✅ **先用方案 A 验证功能**：EAS Update + Expo Go 零成本、即时生效，适合开发阶段快速迭代和分享
- ✅ **尽早做一次真机构建**：即使暂时不发布，也建议在开发中期用 `eas build` 做一次构建，提前暴露原生层问题（权限、图标、启动屏等）
- ✅ **善用 `--auto` 参数**：`eas update --auto` 自动使用当前 Git 分支名，简化操作
- ✅ **Windows 用户无障碍**：EAS Build 在云端运行，iOS 构建不需要 Mac，签名证书由 EAS 自动管理
- ❌ **不要混淆 OTA Update 和 Build**：OTA 只能更新 JS 代码和静态资源。任何涉及原生层的变更（新增 expo plugin、修改 app.json 的 plugins 配置、升级 SDK）都需要重新 Build
- ❌ **不要忽略 runtime version**：如果更新的 runtime version 与构建不匹配，设备会静默忽略更新。确保理解 `runtimeVersion` 策略

## 6. 行动导向 (Action Guide)

### Step 1: 注册 Expo 账号并安装 EAS CLI

**这一步在干什么**: 建立与 Expo 云端服务的连接，EAS CLI 是所有后续操作的命令行入口。

```bash
# 安装 EAS CLI
npm install --global eas-cli

# 登录（如果没有账号，在提示时选择注册）
eas login

# 验证
eas whoami
```

### Step 2: 安装 expo-updates 库

**这一步在干什么**: `expo-updates` 是客户端接收 OTA 更新的运行时库。安装后，App 具备从 EAS 服务器拉取更新的能力。

```bash
npx expo install expo-updates
```

### Step 3: 初始化 EAS Update 配置

**这一步在干什么**: 在 `app.json` 中注入项目 ID、更新服务端点和 runtime version 策略，同时创建 `eas.json` 构建配置文件。

```bash
eas update:configure
```

执行后检查 `app.json` 中是否新增了 `updates.url`、`runtimeVersion` 和 `extra.eas.projectId` 三个字段。同时确认项目根目录下生成了 `eas.json` 文件。

### Step 4: 发布第一个更新

**这一步在干什么**: 将当前项目的 JS Bundle 和资源打包上传到 Expo 云端，生成一个可分享的持久化版本。

```bash
eas update --auto
```

终端输出中复制 `EAS Dashboard` 链接，这就是你的分享入口。

### Step 5: 验证分享流程

**这一步在干什么**: 端到端验证"发布 → 分享 → 对方打开"的完整链路。

1. 在手机浏览器中打开上一步复制的 EAS Dashboard 链接
2. 点击 **Preview** 按钮
3. 用 iPhone 相机扫描显示的 QR 码
4. Expo Go 自动启动并加载应用
5. 确认应用功能正常、无白屏或报错

### Step 6（未来）: 构建独立应用（需要 Apple Developer $99/年）

**这一步在干什么**: 当项目进入正式分发阶段，通过 EAS Build 云端编译生成 `.ipa` 独立安装包，提交到 TestFlight 供他人下载。

```bash
# 构建 iOS 独立应用
eas build --platform ios --profile production

# 提交到 App Store Connect（出现在 TestFlight 中）
eas submit --platform ios
```

首次执行时 EAS CLI 会引导完成 Apple Developer 账号登录和证书配置，整个过程在 Windows 上完成，无需 Mac。
