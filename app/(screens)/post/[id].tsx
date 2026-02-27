import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ShareSheet } from '../../../src/components/ShareSheet';
import { MOCK_POSTS } from '../../../src/features/feed/mock';
import { formatRelativeTime } from '../../../src/utils/format';

/**
 * 文章详情页 —— 动态路由 [id] 示例。
 *
 * 演示要点：
 * 1. useLocalSearchParams 获取 URL 参数
 * 2. 通过 Stack.Screen 动态设置 Header 标题
 * 3. 与 BottomSheetModal 联动（分享面板）
 */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shareSheetRef = useRef<BottomSheetModal>(null);

  const post = MOCK_POSTS.find((p) => p.id === id);

  const handleShare = useCallback(() => {
    shareSheetRef.current?.present();
  }, []);

  if (!post) {
    return (
      <>
        <Stack.Screen options={{ title: '文章详情' }} />
        <View className="flex-1 items-center justify-center bg-gray-50">
          <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
          <Text className="mt-3 text-base text-gray-400">
            文章不存在 (id: {id})
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '文章详情',
          headerRight: () => (
            <Pressable onPress={handleShare} hitSlop={12}>
              <Ionicons name="share-outline" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        className="flex-1 bg-gray-50"
        showsVerticalScrollIndicator={false}
      >
        {/* 封面图 */}
        <Image
          source={post.coverImage}
          className="w-full aspect-video"
          contentFit="cover"
          transition={300}
        />

        <View className="px-5 py-5">
          {/* 标签 */}
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {post.tags.map((tag) => (
              <View
                key={tag}
                className="rounded-full bg-indigo-50 px-3 py-1"
              >
                <Text className="text-xs font-medium text-indigo-600">
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          {/* 标题 */}
          <Text className="text-xl font-bold text-gray-900 leading-7">
            {post.title}
          </Text>

          {/* 作者信息栏 */}
          <View className="flex-row items-center mt-4 pb-4 border-b border-gray-100">
            <Image
              source={post.author.avatar}
              className="w-10 h-10 rounded-full bg-gray-100"
              contentFit="cover"
            />
            <View className="ml-3">
              <Text className="text-sm font-medium text-gray-800">
                {post.author.name}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </View>

          {/* 正文内容 */}
          <Text className="mt-4 text-base text-gray-700 leading-7">
            {post.summary}
          </Text>

          {/* 模拟更多内容段落 */}
          <Text className="mt-4 text-base text-gray-700 leading-7">
            在移动端开发中，导航是用户体验的核心组成部分。一个精心设计的导航架构不仅能提升用户的使用效率，还能让应用的信息层级更加清晰。本文将从实际项目出发，探讨 React Native 中常见的导航模式及其实现方式。
          </Text>
          <Text className="mt-4 text-base text-gray-700 leading-7">
            Expo Router 基于文件系统的路由约定极大简化了导航配置，开发者只需按照约定创建文件，即可自动获得路由注册、类型安全和深度链接支持。这种 Convention over Configuration 的设计哲学源自 Next.js，在移动端同样展现出了强大的工程化优势。
          </Text>

          {/* 互动数据栏 */}
          <View className="flex-row items-center mt-6 pt-4 border-t border-gray-100">
            <Pressable className="flex-row items-center mr-6 active:opacity-60">
              <Ionicons name="heart-outline" size={22} color="#6B7280" />
              <Text className="ml-1.5 text-sm text-gray-500">{post.likes}</Text>
            </Pressable>
            <Pressable className="flex-row items-center mr-6 active:opacity-60">
              <Ionicons name="chatbubble-outline" size={21} color="#6B7280" />
              <Text className="ml-1.5 text-sm text-gray-500">
                {post.comments}
              </Text>
            </Pressable>
            <Pressable className="flex-row items-center active:opacity-60">
              <Ionicons name="bookmark-outline" size={22} color="#6B7280" />
              <Text className="ml-1.5 text-sm text-gray-500">收藏</Text>
            </Pressable>

            <View className="flex-1" />

            <Pressable
              className="flex-row items-center active:opacity-60"
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={22} color="#6B7280" />
              <Text className="ml-1.5 text-sm text-gray-500">分享</Text>
            </Pressable>
          </View>

          {/* Route Params 调试信息 */}
          <View className="mt-6 rounded-xl bg-gray-100 p-4">
            <Text className="text-xs font-mono text-gray-500">
              useLocalSearchParams() → {`{ id: "${id}" }`}
            </Text>
          </View>
        </View>

        <View className="h-24" />
      </ScrollView>

      <ShareSheet
        ref={shareSheetRef}
        title={post.title}
        url={`rnjourney://post/${post.id}`}
      />
    </>
  );
}
