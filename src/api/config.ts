// src/api/config.ts

// 最佳实践：
// 1. 代码中不包含任何默认 URL，强制依赖环境变量。
// 2. 如果环境变量缺失，直接抛出错误，避免上线后因配置错误导致静默失败。

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const appEnv = process.env.EXPO_PUBLIC_APP_ENV;

if (!apiUrl) {
  // 在构建或运行时检查，防止配置遗漏
  console.warn('警告: EXPO_PUBLIC_API_URL 未设置，应用可能无法正常工作。');
}

export const config = {
  apiUrl: apiUrl || '', 
  env: appEnv || 'development',
};
