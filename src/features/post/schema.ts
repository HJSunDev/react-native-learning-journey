import { z } from 'zod';

/**
 * 发布动态的表单校验 Schema。
 * 使用 Zod v4 定义，通过自定义 zodResolver 桥接 react-hook-form。
 */
export const createPostSchema = z.object({
  title: z
    .string()
    .min(2, '标题至少 2 个字符')
    .max(50, '标题最多 50 个字符'),
  content: z
    .string()
    .min(10, '内容至少 10 个字符')
    .max(500, '内容最多 500 个字符'),
  category: z
    .string()
    .min(1, '请选择分类'),
  tags: z
    .array(z.string())
    .min(1, '请至少选择一个标签')
    .max(3, '最多选择 3 个标签'),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
