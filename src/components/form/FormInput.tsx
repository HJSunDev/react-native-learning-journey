import { Ionicons } from '@expo/vector-icons';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { TextInput, type TextInputProps, useColorScheme, View } from 'react-native';
import { FormField } from './FormField';

interface FormInputProps<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** 用于焦点跳转：父组件持有 ref，通过 inputRef 传入 */
  inputRef?: React.RefObject<TextInput | null>;
}

/**
 * 单行文本输入控件。
 * 内置 react-hook-form Controller，自动绑定 value/onChange/onBlur 和错误展示。
 */
export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  icon,
  inputRef,
  ...inputProps
}: FormInputProps<T>) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <FormField label={label} error={error?.message} required={required}>
          <View className="h-12 flex-row items-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4">
            {icon && (
              <Ionicons
                name={icon}
                size={18}
                color={isDark ? '#6B7280' : '#9CA3AF'}
                style={{ marginRight: 10 }}
              />
            )}
            {/* text-[16px] 只设 fontSize，规避 iOS TextInput lineHeight 渲染 bug */}
            <TextInput
              ref={inputRef}
              className="flex-1 text-[16px] text-gray-900 dark:text-gray-100"
              placeholderTextColor={isDark ? '#6B7280' : '#D1D5DB'}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              {...inputProps}
            />
          </View>
        </FormField>
      )}
    />
  );
}
