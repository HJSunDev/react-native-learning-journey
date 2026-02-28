import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FlatList, Modal, Pressable, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormField } from './FormField';

export interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  options: SelectOption[];
}

/**
 * 模态选择器控件。
 * React Native 无原生 <select>，通过底部弹出 Modal + FlatList 实现。
 * 选中项高亮并带勾选标记，点击选项后自动关闭。
 */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = '请选择',
  required,
  options,
}: FormSelectProps<T>) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const selectedOption = options.find((opt) => opt.value === value);

        return (
          <FormField label={label} error={error?.message} required={required}>
            <Pressable
              className="h-12 flex-row items-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4"
              onPress={() => setVisible(true)}
            >
              <Text
                className={`flex-1 text-[16px] ${
                  selectedOption
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-300 dark:text-gray-500'
                }`}
              >
                {selectedOption?.label ?? placeholder}
              </Text>
              <Ionicons name="chevron-down" size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
            </Pressable>

            <Modal
              visible={visible}
              transparent
              animationType="fade"
              onRequestClose={() => setVisible(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => setVisible(false)}
                />

                <View
                  style={{
                    paddingBottom: insets.bottom,
                    backgroundColor: isDark ? '#1F2937' : '#fff',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                  }}
                >
                {/* 标题栏 */}
                <View className="flex-row items-center justify-between border-b border-gray-100 dark:border-gray-700 px-5 py-4">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {label}
                  </Text>
                  <Pressable onPress={() => setVisible(false)}>
                    <Ionicons name="close" size={24} color={isDark ? '#6B7280' : '#9CA3AF'} />
                  </Pressable>
                </View>

                {/* 选项列表 */}
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.value}
                  style={{ maxHeight: 300 }}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    return (
                      <Pressable
                        className={`flex-row items-center px-5 py-4 ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950'
                            : 'active:bg-gray-50 dark:active:bg-gray-700'
                        }`}
                        onPress={() => {
                          onChange(item.value);
                          setVisible(false);
                        }}
                      >
                        <Text
                          className={`flex-1 text-base ${
                            isSelected
                              ? 'font-medium text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={isDark ? '#818CF8' : '#6366F1'}
                          />
                        )}
                      </Pressable>
                    );
                  }}
                />
                </View>
              </View>
            </Modal>
          </FormField>
        );
      }}
    />
  );
}
