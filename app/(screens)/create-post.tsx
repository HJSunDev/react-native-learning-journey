import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  FormInput,
  FormSelect,
  FormTagSelect,
  FormTextArea,
} from '../../src/components/form';
import {
  createPostSchema,
  type CreatePostInput,
  POST_CATEGORIES,
  POST_TAGS,
  useCreatePost,
} from '../../src/features/post';
import { zodResolver } from '../../src/utils/zodResolver';

export default function CreatePostScreen() {
  const router = useRouter();
  const createPost = useCreatePost();
  const contentRef = useRef<TextInput>(null);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
      tags: [],
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createPost.mutateAsync(data);
      Alert.alert('发布成功', '你的动态已发布', [
        { text: '好的', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('发布失败', (error as Error).message);
    }
  });

  return (
    <>
      <Stack.Screen options={{ title: '发布动态' }} />

      <KeyboardAvoidingView
        className="flex-1 bg-gray-50"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-5">
            <FormInput
              control={control}
              name="title"
              label="标题"
              placeholder="请输入标题"
              required
              icon="create-outline"
              returnKeyType="next"
              maxLength={50}
              onSubmitEditing={() => contentRef.current?.focus()}
            />

            <FormTextArea
              control={control}
              name="content"
              label="内容"
              placeholder="分享你的想法..."
              required
              maxLength={500}
              numberOfLines={6}
              inputRef={contentRef}
            />

            <FormSelect
              control={control}
              name="category"
              label="分类"
              placeholder="请选择分类"
              required
              options={POST_CATEGORIES}
            />

            <FormTagSelect
              control={control}
              name="tags"
              label="标签"
              required
              options={POST_TAGS}
              maxSelect={3}
            />

            {/* 提交按钮 */}
            <Pressable
              className="mt-2 items-center rounded-2xl bg-indigo-600 py-4 active:bg-indigo-700"
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <Ionicons name="send" size={18} color="white" />
                  <Text className="text-base font-semibold text-white">
                    发布
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
