import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogin } from "../../src/features/auth";

export default function LoginScreen() {
  const [phone, setPhone] = useState("13800138000");
  const [code, setCode] = useState("1234");
  const insets = useSafeAreaInsets();
  const loginMutation = useLogin();

  const handleLogin = () => {
    loginMutation.mutate({ phone, code });
  };

  /**
   * 布局策略：
   * 1. style/className 不混用：需要动态值的结构性容器仅用 style，展示子元素仅用 className
   * 2. 分层背景：基底为中性灰色，顶部 indigo 用绝对定位装饰层实现，
   *    这样 iOS 半透明键盘弹出时，底部透出的是灰色而非 indigo
   */
  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* 装饰层：绝对定位的 indigo 背景，只覆盖屏幕上半部分 */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          backgroundColor: "#4f46e5",
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: insets.top }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* 顶部品牌区域：透明背景，装饰层的 indigo 透过来 */}
          <View className="items-center px-8 pb-10 pt-16">
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <Ionicons name="rocket-outline" size={40} color="white" />
            </View>
            <Text className="text-3xl font-bold text-white">欢迎回来</Text>
            <Text className="mt-2 text-base text-indigo-200">
              登录以继续你的旅程
            </Text>
          </View>

          {/* 底部表单卡片区域：圆角处透出装饰层的 indigo，形成视觉过渡 */}
          <View className="flex-1 rounded-t-[32px] bg-gray-50 px-8 pt-10">
            <View className="gap-4">
              {/* 手机号输入框 */}
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-500">
                  手机号
                </Text>
                <View className="h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                  <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                  {/* text-[16px] 只设 fontSize 不带 lineHeight，规避 iOS TextInput lineHeight 渲染 bug */}
                  <TextInput
                    className="ml-3 flex-1 text-[16px] text-gray-900"
                    placeholder="请输入手机号"
                    placeholderTextColor="#D1D5DB"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                </View>
              </View>

              {/* 验证码输入框 */}
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-500">
                  验证码
                </Text>
                <View className="h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#9CA3AF"
                  />
                  {/* text-[16px] 只设 fontSize 不带 lineHeight，规避 iOS TextInput lineHeight 渲染 bug */}
                  <TextInput
                    className="ml-3 flex-1 text-[16px] text-gray-900"
                    placeholder="请输入验证码"
                    placeholderTextColor="#D1D5DB"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  {/* 获取验证码按钮（视觉占位，暂不实现逻辑） */}
                  <Pressable className="rounded-xl bg-indigo-50 px-3 py-2">
                    <Text className="text-xs font-medium text-indigo-600">
                      获取验证码
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 登录按钮 */}
              <Pressable
                className="mt-4 items-center rounded-2xl bg-indigo-600 py-4 active:bg-indigo-700"
                onPress={handleLogin}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-base font-semibold text-white">
                    登录
                  </Text>
                )}
              </Pressable>

              {/* 错误提示 */}
              {loginMutation.isError && (
                <View className="flex-row items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3">
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#EF4444"
                  />
                  <Text className="text-sm text-red-500">
                    {loginMutation.error?.message ?? "登录失败，请重试"}
                  </Text>
                </View>
              )}
            </View>

            {/* 底部辅助信息 */}
            <View className="mt-auto items-center pb-8">
              <Text className="text-xs text-gray-400">
                登录即代表你同意{" "}
                <Text className="text-indigo-500">服务条款</Text> 与{" "}
                <Text className="text-indigo-500">隐私政策</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
