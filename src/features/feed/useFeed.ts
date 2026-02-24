import { useInfiniteQuery } from '@tanstack/react-query';
import { feedApi } from './api';

/**
 * Feed 无限滚动 Hook。
 * 基于 cursor 分页，自动管理加载/刷新/翻页状态。
 */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => feedApi.getPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
