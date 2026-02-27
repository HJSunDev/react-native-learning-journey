import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ShareOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const SHARE_OPTIONS: ShareOption[] = [
  { id: 'link', label: '复制链接', icon: 'link-outline', color: '#6366F1', bgColor: '#EEF2FF' },
  { id: 'wechat', label: '微信', icon: 'chatbubble-ellipses-outline', color: '#22C55E', bgColor: '#F0FDF4' },
  { id: 'weibo', label: '微博', icon: 'globe-outline', color: '#EF4444', bgColor: '#FEF2F2' },
  { id: 'save', label: '保存图片', icon: 'download-outline', color: '#F59E0B', bgColor: '#FFFBEB' },
  { id: 'more', label: '更多', icon: 'ellipsis-horizontal', color: '#6B7280', bgColor: '#F3F4F6' },
];

interface ShareSheetProps {
  title: string;
  url: string;
}

/**
 * 分享面板 —— 基于 @gorhom/bottom-sheet 的 BottomSheetModal。
 *
 * 与 RN 内置 Modal 的区别：
 * - 支持手势拖拽关闭（原生触感）
 * - 多个 snap point 停靠位置
 * - 自带 backdrop 遮罩和动画
 * - 在原生手势线程执行，不阻塞 JS 线程
 */
export const ShareSheet = forwardRef<BottomSheetModal, ShareSheetProps>(
  function ShareSheet({ title, url }, ref) {
    const insets = useSafeAreaInsets();

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
        />
      ),
      [],
    );

    const handleOptionPress = useCallback(
      (option: ShareOption) => {
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
        Alert.alert(option.label, `分享「${title}」\n链接: ${url}`);
      },
      [ref, title, url],
    );

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 36 }}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <BottomSheetView
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <Text className="px-5 pb-3 text-base font-semibold text-gray-900">
            分享到
          </Text>

          <View className="flex-row flex-wrap px-5 gap-4">
            {SHARE_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                className="w-14 items-center active:opacity-60"
                onPress={() => handleOptionPress(option)}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: option.bgColor,
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={option.color}
                  />
                </View>
                <Text className="mt-1.5 text-xs text-gray-600">
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* 取消按钮 */}
          <Pressable
            className="mx-5 mt-5 items-center rounded-xl bg-gray-100 py-3 active:bg-gray-200"
            onPress={() =>
              (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()
            }
          >
            <Text className="text-sm font-medium text-gray-600">取消</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
