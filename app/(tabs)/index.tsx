import { FlashList } from '@shopify/flash-list';
import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import {
  ListEmpty,
  ListError,
  ListFooter,
  ListLoading,
} from '../../src/components/ListStates';
import { PostCard } from '../../src/components/PostCard';
import type { Post } from '../../src/features/feed';
import { useFeed } from '../../src/features/feed';

export default function HomeScreen() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useFeed();

  // flatMap 将多页数据拍平为一维数组
  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  const handlePostPress = useCallback(
    (post: Post) => {
      router.push(`/(screens)/post/${post.id}` as Href);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard post={item} onPress={handlePostPress} />
    ),
    [handlePostPress],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <ListLoading />;
  if (isError) return <ListError message={error.message} onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50">
      <FlashList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={<ListEmpty />}
        ListFooterComponent={
          <ListFooter
            isLoading={isFetchingNextPage}
            hasMore={hasNextPage ?? false}
          />
        }
        // 下拉刷新：排除"加载下一页"时的 refetching 状态
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={refetch}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
      />
    </View>
  );
}
