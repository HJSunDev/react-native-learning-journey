import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import type { Post } from '../features/feed';
import { formatRelativeTime } from '../utils/format';

interface PostCardProps {
  post: Post;
  onPress?: (post: Post) => void;
}

/**
 * Feed 文章卡片。
 * 纯展示组件，不持有内部状态 —— 这是 FlashList Cell 回收复用模式下的关键设计。
 * 如果组件内部使用 useState 保存视觉状态（如"已点赞"），
 * 当 Cell 被回收并绑定新数据时，旧状态会泄漏到新 Item 上。
 */
export function PostCard({ post, onPress }: PostCardProps) {
  return (
    <Pressable
      className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white"
      onPress={() => onPress?.(post)}
    >
      {/* 封面图：recyclingKey 确保 Cell 复用时图片正确切换 */}
      <Image
        source={post.coverImage}
        className="w-full aspect-video"
        contentFit="cover"
        transition={200}
        recyclingKey={post.id}
      />

      <View className="p-4">
        {/* 标签 */}
        <View className="flex-row flex-wrap gap-1.5 mb-2">
          {post.tags.map((tag) => (
            <View key={tag} className="rounded-full bg-indigo-50 px-2.5 py-0.5">
              <Text className="text-xs text-indigo-600">{tag}</Text>
            </View>
          ))}
        </View>

        <Text className="text-base font-bold text-gray-900" numberOfLines={2}>
          {post.title}
        </Text>

        <Text className="mt-1.5 text-sm text-gray-500" numberOfLines={2}>
          {post.summary}
        </Text>

        {/* 作者信息 & 互动数据 */}
        <View className="flex-row items-center mt-3">
          <Image
            source={post.author.avatar}
            className="w-6 h-6 rounded-full bg-gray-100"
            contentFit="cover"
            recyclingKey={post.author.id}
          />
          <Text className="ml-2 text-xs text-gray-600">{post.author.name}</Text>
          <Text className="mx-1.5 text-xs text-gray-300">·</Text>
          <Text className="text-xs text-gray-400">
            {formatRelativeTime(post.createdAt)}
          </Text>

          <View className="flex-1" />

          <View className="flex-row items-center">
            <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
            <Text className="ml-1 text-xs text-gray-400">{post.likes}</Text>
          </View>
          <View className="flex-row items-center ml-3">
            <Ionicons name="chatbubble-outline" size={13} color="#9CA3AF" />
            <Text className="ml-1 text-xs text-gray-400">{post.comments}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
