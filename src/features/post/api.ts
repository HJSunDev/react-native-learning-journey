import type { CreatePostInput } from './schema';
import type { CreatePostResult } from './types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const postApi = {
  create: async (input: CreatePostInput): Promise<CreatePostResult> => {
    await delay(1500);

    if (input.title.includes('test')) {
      throw new Error('标题已被使用，请换一个');
    }

    return {
      id: `post-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  },
};
