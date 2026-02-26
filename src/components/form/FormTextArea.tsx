import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { TextInput, Text, View } from 'react-native';
import { FormField } from './FormField';

interface FormTextAreaProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  numberOfLines?: number;
  inputRef?: React.RefObject<TextInput | null>;
}

/**
 * 多行文本输入控件。
 * 支持字符计数器和最大长度限制，适用于"内容"、"备注"等长文本场景。
 */
export function FormTextArea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required,
  maxLength,
  numberOfLines = 5,
  inputRef,
}: FormTextAreaProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <FormField label={label} error={error?.message} required={required}>
          <View className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <TextInput
              ref={inputRef}
              className="text-[16px] text-gray-900"
              placeholderTextColor="#D1D5DB"
              placeholder={placeholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={numberOfLines}
              textAlignVertical="top"
              style={{ minHeight: numberOfLines * 22 }}
              maxLength={maxLength}
            />
            {maxLength && (
              <Text className="mt-1.5 text-right text-xs text-gray-400">
                {(value as string)?.length ?? 0}/{maxLength}
              </Text>
            )}
          </View>
        </FormField>
      )}
    />
  );
}
