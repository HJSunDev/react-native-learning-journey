import { useMutation } from '@tanstack/react-query';
import { postApi } from './api';
import type { CreatePostInput } from './schema';

/**
 * 发布动态 Mutation Hook。
 * 封装 postApi.create，供表单页面调用 mutateAsync 提交数据。
 */
export function useCreatePost() {
  return useMutation({
    mutationFn: (data: CreatePostInput) => postApi.create(data),
  });
}
