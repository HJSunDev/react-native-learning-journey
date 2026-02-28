import * as Haptics from 'expo-haptics';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { FormField } from './FormField';

interface FormTagSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  options: string[];
  maxSelect?: number;
}

/**
 * 标签多选控件。
 * 以 Chip 形式展示所有可选项，点击切换选中状态。
 * 达到 maxSelect 上限时触发警告触觉反馈，防止无声失败。
 */
export function FormTagSelect<T extends FieldValues>({
  control,
  name,
  label,
  required,
  options,
  maxSelect,
}: FormTagSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const selected: string[] = (value as string[]) ?? [];

        const toggleTag = (tag: string) => {
          if (selected.includes(tag)) {
            onChange(selected.filter((t: string) => t !== tag));
            return;
          }
          if (maxSelect && selected.length >= maxSelect) {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange([...selected, tag]);
        };

        const displayLabel = maxSelect
          ? `${label}（最多 ${maxSelect} 个）`
          : label;

        return (
          <FormField
            label={displayLabel}
            error={error?.message}
            required={required}
          >
            <View className="flex-row flex-wrap gap-2">
              {options.map((tag) => {
                const isSelected = selected.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    className={`rounded-full border px-4 py-2 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? 'font-medium text-white'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </FormField>
        );
      }}
    />
  );
}
