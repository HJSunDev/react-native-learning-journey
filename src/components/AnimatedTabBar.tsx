import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { useCallback, useState } from "react";
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const BAR_HEIGHT = 64;
const CAPSULE_HEIGHT = 48;
// 胶囊与外框共享同一圆角半径，视觉上更协调
const BORDER_RADIUS = CAPSULE_HEIGHT / 0.7;
// 胶囊宽度占 Tab 格子的比例，控制胶囊的紧凑程度
const CAPSULE_WIDTH_RATIO = 0.48;

// 浅色 / 深色 模式的颜色映射
const THEME = {
  light: {
    activeColor: "#374151",       // gray-700
    inactiveColor: "#9CA3AF",     // gray-400
    blurTint: "light" as const,
    barOverlay: "rgba(255, 255, 255, 0.80)",
    capsuleGlass: "rgba(155, 165, 180, 0.22)",
    capsuleBorder: "rgba(255, 255, 255, 0.75)",
  },
  dark: {
    activeColor: "#F3F4F6",       // gray-100
    inactiveColor: "#6B7280",     // gray-500
    blurTint: "dark" as const,
    barOverlay: "rgba(15, 15, 20, 0.82)",
    capsuleGlass: "rgba(100, 115, 135, 0.30)",
    capsuleBorder: "rgba(255, 255, 255, 0.08)",
  },
};

interface TabLayout {
  x: number;
  width: number;
}

/** 根据 Tab 格子的位置与宽度，计算居中胶囊的 x 和 width */
function getCapsuleLayout(tab: TabLayout) {
  const capsuleW = tab.width * CAPSULE_WIDTH_RATIO;
  return {
    x: tab.x + (tab.width - capsuleW) / 2,
    width: capsuleW,
  };
}

/**
 * 自定义动画 TabBar。
 * - 胶囊指示器紧凑居中，不铺满 Tab 全宽
 * - 切换时以 Q 弹弹簧横向滑动，带过冲回弹
 * - 胶囊内嵌毛玻璃，移动时纵向拉伸并变得更通透
 * - 自动响应系统 / 用户设定的暗色模式
 */
export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const theme = THEME[colorScheme === "dark" ? "dark" : "light"];

  const [tabLayouts, setTabLayouts] = useState<TabLayout[]>([]);

  const capsuleX = useSharedValue(0);
  const capsuleWidth = useSharedValue(0);
  // 目标 X 快照，用于计算运动进度
  const targetX = useSharedValue(0);

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setTabLayouts((prev) => {
        const next = [...prev];
        next[index] = { x, width };

        // 所有 Tab 首次测量完毕后，静默定位胶囊到当前选中 Tab
        if (
          next.filter(Boolean).length === state.routes.length &&
          prev.filter(Boolean).length < state.routes.length
        ) {
          const current = next[state.index];
          if (current) {
            const { x: cx, width: cw } = getCapsuleLayout(current);
            capsuleX.value = cx;
            capsuleWidth.value = cw;
            targetX.value = cx;
          }
        }
        return next;
      });
    },
    [state.routes.length, state.index, capsuleX, capsuleWidth, targetX],
  );

  const handlePress = useCallback(
    (index: number) => {
      const route = state.routes[index];
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (state.index !== index && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);

        const layout = tabLayouts[index];
        if (layout) {
          const { x, width } = getCapsuleLayout(layout);
          targetX.value = x;
          // 低 damping 允许过冲回弹，产生 Q 弹手感
          capsuleX.value = withSpring(x, {
            damping: 14,
            stiffness: 200,
            mass: 0.8,
          });
          capsuleWidth.value = withSpring(width, {
            damping: 14,
            stiffness: 200,
            mass: 0.8,
          });
        }
      }
    },
    [state, navigation, tabLayouts, capsuleX, capsuleWidth, targetX],
  );

  // 运动进度：0 = 静止，1 = 全速运动中
  const motionProgress = useDerivedValue(() => {
    const distance = Math.abs(capsuleX.value - targetX.value);
    return Math.min(distance / 60, 1);
  });

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: capsuleX.value },
      { scaleY: 1 + motionProgress.value * 0.22 },
      { scaleX: 1 - motionProgress.value * 0.03 },
    ],
    width: capsuleWidth.value,
  }));

  // 运动中玻璃变得更通透（降低叠加层不透明度）
  const glassTintStyle = useAnimatedStyle(() => ({
    opacity: 1 - motionProgress.value * 0.35,
  }));

  return (
    <View
      style={[styles.container, { bottom: Platform.OS === "ios" ? 24 : 16 }]}
    >
      {/* 毛玻璃背景层 */}
      <View style={[StyleSheet.absoluteFill, styles.bgClip]}>
        <BlurView
          intensity={40}
          tint={theme.blurTint}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.barOverlay },
          ]}
        />
      </View>

      {/* 胶囊指示器：内嵌毛玻璃，居中于选中 Tab */}
      <Animated.View
        style={[
          styles.capsule,
          { borderColor: theme.capsuleBorder },
          capsuleStyle,
        ]}
      >
        <BlurView
          intensity={80}
          tint={theme.blurTint}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.capsuleGlass, borderRadius: BORDER_RADIUS },
            glassTintStyle,
          ]}
        />
      </Animated.View>

      {/* Tab 按钮 */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        return (
          <Pressable
            key={route.key}
            onPress={() => handlePress(index)}
            onLayout={(e) => handleTabLayout(index, e)}
            style={styles.tabItem}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
          >
            {options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? theme.activeColor : theme.inactiveColor,
              size: 22,
            })}
            <Text
              style={[
                styles.label,
                { color: isFocused ? theme.activeColor : theme.inactiveColor },
                isFocused && styles.labelActive,
              ]}
            >
              {typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : (options.title ?? route.name)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    // iOS 原生端 left/right 在 absolute TabBar 下不生效，用 marginHorizontal
    marginHorizontal: 16,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    borderRadius: BORDER_RADIUS,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  bgClip: {
    borderRadius: BORDER_RADIUS,
    overflow: "hidden",
  },
  capsule: {
    position: "absolute",
    top: (BAR_HEIGHT - CAPSULE_HEIGHT) / 2,
    height: CAPSULE_HEIGHT,
    borderRadius: BORDER_RADIUS,
    overflow: "hidden",
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 3,
  },
  label: {
    fontSize: 11,
  },
  labelActive: {
    fontWeight: "600",
  },
});
