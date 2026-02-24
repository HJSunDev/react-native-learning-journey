import type { FeedPage } from './types';
import { MOCK_POSTS } from './mock';

const PAGE_SIZE = 8;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const feedApi = {
  /**
   * 获取 Feed 分页数据。
   * cursor 为上一页返回的 nextCursor，首页传 null。
   */
  getPage: async (cursor: string | null): Promise<FeedPage> => {
    await delay(800);

    const startIndex = cursor ? parseInt(cursor, 10) : 0;
    const data = MOCK_POSTS.slice(startIndex, startIndex + PAGE_SIZE);
    const nextIndex = startIndex + PAGE_SIZE;

    return {
      data,
      nextCursor: nextIndex < MOCK_POSTS.length ? String(nextIndex) : null,
    };
  },
};
