import { Text, View } from 'react-native';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

/**
 * 表单字段容器：统一提供标签、必填标记和错误信息展示。
 * 所有表单控件（FormInput、FormSelect 等）内部使用此组件包裹。
 */
export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
        {required && <Text className="ml-0.5 text-red-500">*</Text>}
      </View>
      {children}
      {error && <Text className="text-xs text-red-500">{error}</Text>}
    </View>
  );
}
