import { Image, type ImageProps } from 'expo-image';
import { View } from 'react-native';

/**
 * react-native-css（NativeWind v5 runtime）通过 Metro resolver 将
 * `import { View, Text } from 'react-native'` 拦截并替换为支持 className 的增强组件。
 * expo-image 不在拦截范围内，其 Image 在原生端会忽略 className，
 * 导致图片 0×0 不可见（Web 端 className 是标准 CSS 属性，不受影响）。
 *
 * 此组件用 View（有 CSS interop）承载 className，
 * expo-image 通过 100% 尺寸填充容器，实现 className 驱动的布局。
 */
export function ExpoImage({
  className,
  ...imageProps
}: Omit<ImageProps, 'style'> & { className?: string }) {
  return (
    <View className={`overflow-hidden ${className ?? ''}`}>
      <Image {...imageProps} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
