import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { pickImages, takePhoto } from '../../features/media';
import { FormField } from './FormField';

interface FormImagePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  /** 最大图片数量，默认 9 */
  maxCount?: number;
  /** 每行列数，默认 4 */
  columns?: number;
}

/**
 * 图片选择表单控件。
 * 以网格形式展示已选图片 + "添加"按钮，点击添加弹出 Alert 选择来源（相册/拍照）。
 * 内置 react-hook-form Controller，值类型为 string[]（URI 数组）。
 */
export function FormImagePicker<T extends FieldValues>({
  control,
  name,
  label,
  required,
  maxCount = 9,
  columns = 4,
}: FormImagePickerProps<T>) {
  const { width: screenWidth } = useWindowDimensions();
  const gap = 8;
  const containerPadding = 16;
  const cellSize =
    (screenWidth - containerPadding * 2 - gap * (columns - 1)) / columns;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const images: string[] = (value as string[]) ?? [];
        const canAdd = images.length < maxCount;

        const handleAdd = () => {
          const remaining = maxCount - images.length;

          Alert.alert('添加图片', '', [
            {
              text: '从相册选择',
              onPress: async () => {
                try {
                  const picked = await pickImages({
                    allowsMultipleSelection: true,
                    quality: 0.8,
                    selectionLimit: remaining,
                  });
                  if (picked.length > 0) {
                    const newUris = picked
                      .slice(0, remaining)
                      .map((p) => p.uri);
                    onChange([...images, ...newUris]);
                  }
                } catch (e) {
                  Alert.alert('选取失败', (e as Error).message);
                }
              },
            },
            {
              text: '拍照',
              onPress: async () => {
                try {
                  const photo = await takePhoto({ quality: 0.8 });
                  if (photo) {
                    onChange([...images, photo.uri]);
                  }
                } catch (e) {
                  Alert.alert('拍照失败', (e as Error).message);
                }
              },
            },
            { text: '取消', style: 'cancel' },
          ]);
        };

        const handleRemove = (index: number) => {
          onChange(images.filter((_, i) => i !== index));
        };

        const displayLabel = maxCount
          ? `${label}（最多 ${maxCount} 张）`
          : label;

        return (
          <FormField
            label={displayLabel}
            error={error?.message}
            required={required}
          >
            <View className="flex-row flex-wrap" style={{ gap }}>
              {images.map((uri, index) => (
                <View key={uri} style={{ width: cellSize, height: cellSize }}>
                  <Image
                    source={{ uri }}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 12,
                    }}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => handleRemove(index)}
                    className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-black/60"
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </Pressable>
                </View>
              ))}

              {canAdd && (
                <View style={{ width: cellSize, height: cellSize }}>
                  <Pressable
                    onPress={handleAdd}
                    className="flex-1 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 active:bg-gray-100"
                  >
                    <Ionicons name="add" size={28} color="#9CA3AF" />
                    <Text className="mt-1 text-xs text-gray-400">
                      {images.length}/{maxCount}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </FormField>
        );
      }}
    />
  );
}
