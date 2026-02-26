const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// react-hook-form 等现代库通过 package.json 的 exports 字段声明多平台入口，
// Metro 默认只读 main 字段，Web 端会解析失败。启用后三端统一走 exports 解析。
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativewind(config);
