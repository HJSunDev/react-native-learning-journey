# 012. 列表与数据流

## 1. 核心问题与概念

### 解决什么问题

移动端内容 App 的核心场景：**展示大量同构数据**（Feed 流、商品列表、聊天记录）。如果用 `ScrollView` 把 1000 个 Item 一次性渲染到内存，不论用户是否看到，都会产生巨大的内存占用和渲染耗时。

**虚拟化列表**解决这个问题：只渲染当前可视区域附近的 Item，屏幕外的 Item 不在内存中。用户滚动时，动态创建进入视口的 Item、销毁离开的 Item。

### FlatList vs FlashList：定位与关系

|          | FlatList                                                       | FlashList                                                    |
| -------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 来源     | React Native 内置                                              | Shopify 开源 (`@shopify/flash-list`)                         |
| 底层     | `VirtualizedList`（JS 层虚拟化）                               | `RecyclerListView`（原生层回收复用）                         |
| 回收策略 | **销毁/重建** — Item 离开视口后被 unmount，再次进入时 re-mount | **回收复用** — Item 离开视口后保留 View 实例，绑定新数据复用 |
| 性能     | 普通场景够用，大数据量或复杂 Item 掉帧                         | 接近原生 `UICollectionView`/`RecyclerView` 性能              |
| API      | 标准 API                                                       | **刻意兼容 FlatList API**，几乎 drop-in 替换                 |
| 关键差异 | 无需额外配置                                                   | v1 需要 `estimatedItemSize`；**v2 已移除，自动测量**         |
| 生产推荐 | 简单短列表（<50 项）可用                                       | 任何有分页/大数据量的列表                                    |

**一句话总结：学 FlatList 的 API，写 FlashList 的组件。**

### 共享 API 速查（两者通用）

```tsx
<FlashList // 或 FlatList
  data={items} // 数据源
  renderItem={({ item }) => <Card />} // 每项如何渲染
  keyExtractor={(item) => item.id} // 唯一 Key
  // ── 列表状态插槽 ──
  ListHeaderComponent={<Header />} // 列表头部
  ListFooterComponent={<Footer />} // 列表底部（加载更多指示器）
  ListEmptyComponent={<Empty />} // data.length === 0 时显示
  ItemSeparatorComponent={<Sep />} // 每两项之间的分隔线
  // ── 分页与刷新 ──
  onEndReached={loadMore} // 滚到底部触发
  onEndReachedThreshold={0.5} // 距底部 50% 高度时触发
  refreshing={isRefreshing} // 下拉刷新状态
  onRefresh={handleRefresh} // 下拉刷新回调
  // ── 布局 ──
  contentContainerStyle={{ padding }} // 内容容器样式
  numColumns={2} // 多列网格
/>
```

## 2. 核心用法 / 方案设计

### 场景 A: 基础 Feed 列表（FlashList + 分页）

最常见的移动端模式：**带无限滚动的内容 Feed**。

数据层使用 React Query 的 `useInfiniteQuery`，它天然支持 cursor 分页：

```tsx
// src/features/feed/useFeed.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { feedApi } from "./api";

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => feedApi.getPage(pageParam),
    // 首页 cursor 为 null，后续由 API 返回
    initialPageParam: null as string | null,
    // 决定是否还有下一页
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

页面层将多页数据拍平，交给 FlashList：

```tsx
// app/(tabs)/index.tsx
import { FlashList } from "@shopify/flash-list";

export default function HomeScreen() {
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

  // flatMap 将 [[page1Items], [page2Items]] 拍成 [item1, item2, ...]
  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  // useCallback 缓存 renderItem，避免 FlashList 因引用变化做不必要的重渲染
  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    [],
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
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={refetch}
        // 底部留出空间给浮动 TabBar（64px 高 + 24px 底部偏移 + 余量）
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
      />
    </View>
  );
}
```

关键点：

- **FlashList v2 无需 `estimatedItemSize`**：v1 需要手动预估 Item 高度来决定回收池大小；v2 基于新架构重写，自动测量 Item 高度。
- **`onEndReachedThreshold={0.5}`**：距底部 50% 屏幕高度时触发预加载。用户还在看当前内容时，下一页已经在路上。
- **`refreshing` 的条件**：`isRefetching && !isFetchingNextPage` 确保只有下拉刷新时显示顶部 Loading，翻页加载不会误触发。

### 场景 B: 下拉刷新

FlashList/FlatList 内置了 `RefreshControl` 集成，只需提供两个 props：

```tsx
<FlashList
  refreshing={isRefreshing} // 控制下拉指示器的显隐
  onRefresh={handleRefresh} // 用户下拉释放时触发
/>
```

与 React Query 配合时，`refetch()` 会重新请求第一页并替换缓存中的所有页数据。

### 场景 C: 列表状态模式

生产级列表必须处理 4 种状态：

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Loading  │    │  Error   │    │  Empty   │    │  Normal  │
│          │    │          │    │          │    │          │
│   ⏳     │    │  ❌     │    │  📭      │    │ ┌──────┐ │
│          │    │  重试    │    │ 暂无内容  │    │ │ Item │ │
│          │    │          │    │          │    │ ├──────┤ │
│          │    │          │    │          │    │ │ Item │ │
└──────────┘    └──────────┘    └──────────┘    │ ├──────┤ │
                                                │ │ ...  │ │
                                                └──────────┘
```

分别通过组件化实现：

- **ListLoading**：首屏加载，全屏居中 ActivityIndicator
- **ListError**：请求失败，展示错误信息 + 重试按钮
- **ListEmpty**：`data.length === 0`，通过 `ListEmptyComponent` 展示
- **ListFooter**：列表底部，区分"加载中"和"到底了"两种状态

```tsx
// src/components/ListStates.tsx (简化版)
export function ListFooter({ isLoading, hasMore }: ListFooterProps) {
  if (isLoading) {
    return <ActivityIndicator size="small" color="#6366F1" />;
  }
  if (!hasMore) {
    return <Text>— 已经到底了 —</Text>;
  }
  return null;
}
```

### 场景 D: SectionList（分组列表）

当数据需要按分类/字母/日期分组时，使用 RN 内置的 `SectionList`（FlashList 暂无完整对应物）：

```tsx
import { SectionList, Text, View } from "react-native";

const DATA = [
  {
    title: "前端开发",
    data: [
      { id: "1", name: "React Native" },
      { id: "2", name: "Flutter" },
    ],
  },
  {
    title: "后端开发",
    data: [
      { id: "3", name: "Node.js" },
      { id: "4", name: "Go" },
    ],
  },
];

<SectionList
  sections={DATA}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Text>{item.name}</Text>}
  renderSectionHeader={({ section: { title } }) => (
    <View className="bg-gray-100 px-4 py-2">
      <Text className="font-bold text-gray-600">{title}</Text>
    </View>
  )}
  // 分组头 sticky 效果（iOS 默认开启）
  stickySectionHeadersEnabled={true}
/>;
```

SectionList 的数据结构要求每个 section 有 `title` 和 `data` 数组，这是它与 FlatList/FlashList 最大的 API 差异。

## 3. 深度原理与机制

### FlatList：Unmount/Remount 模型

```
     用户向下滚动 ↓

    ┌─────────────┐
    │   Item A    │  ❌ 离开视口 -> Unmount (销毁 DOM)
    ├─────────────┤
  ┌─│   Item B    │─┐
  │ │             │ │
  │ │   Item C    │ │ ✅ 可视区域 (Viewport)
  │ │             │ │
  └─│   Item D    │─┘
    ├─────────────┤
    │   Item E    │  ✨ 进入视口 -> Mount (新建 DOM)
    └─────────────┘
```

- Item 离开可视窗口 → **完全 unmount**（React 树中移除）
- Item 重新进入可视窗口 → **重新 mount**（创建新组件实例）
- 每次 mount 都要执行完整的组件初始化：创建 View → 渲染 children → 布局计算
- **代价**：大量组件频繁创建/销毁，快速滚动时容易出现空白帧（blank area）

### FlashList：Cell 回收复用模型

```
     用户向下滚动 ↓
                      ┌──────────────┐
    ┌─────────────┐   │    回收池     │
    │   Cell α    │──►│(Recycle Pool)│ ♻️ 暂存
    ├─────────────┤   │              │
  ┌─│   Cell β    │─┐ │              │
  │ │             │ │ │              │
  │ │   Cell γ    │ │ │              │
  │ │             │ │ │              │
  └─│   Cell δ    │─┘ │              │
    ├─────────────┤   │              │
    │   Cell α'   │◄──│  Cell α      │ ⚡️ 复用 (Rebind)
    └─────────────┘   └──────────────┘
      (复用 Cell α)
```

- Item 离开视口 → **Cell 实例保留**，放入回收池
- 新 Item 进入视口 → **从回收池取出 Cell**，只更新 props（绑定新数据）
- View 实例始终存在，**跳过创建和销毁的开销**
- 这与 iOS `UICollectionView` / Android `RecyclerView` 的原理一致

### `estimatedItemSize` 的版本变迁

FlashList **v1** 要求开发者提供 `estimatedItemSize`，用于首次渲染前预计算回收池大小。这是 v1 最常见的"必填项"。

FlashList **v2**（2.x，当前项目使用）基于新架构完全重写，**移除了 `estimatedItemSize`**。v2 通过原生层自动测量 Item 高度，不再需要手动预估。如果你看到社区文章或面试题提到这个属性，那是 v1 的知识。

### 视图复用带来的状态 Bug（核心陷阱）

**这是 FlashList 最容易踩的坑，也是面试必问题。**

```tsx
// ❌ 危险：Cell 内部的 useState 会随复用"泄漏"到其他 Item
function PostCard({ post }) {
  const [liked, setLiked] = useState(false);

  return (
    <Pressable onPress={() => setLiked(!liked)}>
      <Ionicons name={liked ? "heart" : "heart-outline"} />
    </Pressable>
  );
}
```

问题：当你点赞了 Item A，然后 Item A 滚出视口，它的 Cell 被回收给了 Item F。此时 Item F 会显示"已点赞"，因为 `liked: true` 这个状态属于 Cell 实例，不属于数据。

```
用户点赞 Item A → liked = true
       ↓ 滚动
Cell α 被回收给 Item F
       ↓
Item F 继承了 liked = true ← BUG!
```

**解决方案：状态提升到数据层，组件只从 props 读取。**

```tsx
// ✅ 安全：liked 来自外部数据，Cell 复用时跟随新 props 更新
function PostCard({ post, onToggleLike }) {
  return (
    <Pressable onPress={() => onToggleLike(post.id)}>
      <Ionicons name={post.liked ? "heart" : "heart-outline"} />
    </Pressable>
  );
}
```

**原则：FlashList 中的 Item 组件必须是纯展示组件（Pure Component），所有视觉状态都通过 props 驱动。**

## 4. 最佳实践与坑

### ✅ 推荐做法

- **生产列表用 FlashList**，简单短列表（设置菜单、固定几项）用 `ScrollView` 即可
- **始终提供 `keyExtractor`**，使用业务唯一 ID（如 `post.id`），不要用数组 index
- **`renderItem` 用 `useCallback` 包裹**，避免父组件重渲染时 FlashList 做无谓的 diff
- **Item 组件保持纯净**：不持有 `useState`，所有状态来自 props
- **图片组件使用 `recyclingKey`**：`expo-image` 的 `recyclingKey={item.id}` 确保 Cell 复用时图片正确切换，不闪烁上一张
- **浮动 TabBar 需要底部 padding**：`contentContainerStyle={{ paddingBottom: 100 }}` 防止最后几项被 TabBar 遮挡

### ❌ 避免做法

- **不要用 `index` 做 key**：分页追加时 index 会变，导致 React diff 错乱
- **不要在 Item 中使用 `useEffect` 做副作用**：Cell 复用时不会 unmount/remount，`useEffect` 不会重新触发
- **不要嵌套 FlashList/FlatList 在 ScrollView 中**：虚拟化列表本身就是 ScrollView，嵌套会打架，导致高度计算失效
- **不要混淆 FlashList v1/v2 API**：v2 移除了 `estimatedItemSize`，如果看到 TS 报错"属性不存在"，检查版本
- **不要在 `onEndReached` 中无条件 fetch**：必须检查 `hasNextPage && !isFetchingNextPage`，否则会重复请求

### 选择决策树

```
需要展示列表数据？
├── 固定 < 20 项 → ScrollView + map
├── 需要按分组展示 → SectionList
└── 大数据 / 分页 / 无限滚动
    ├── 新项目 / 生产环境 → FlashList ✅
    └── 已有 FlatList 且无性能问题 → 保持 FlatList
```

## 5. 行动导向 (Action Guide)

### Step 1: 安装 FlashList

**这一步在干什么**: 添加 FlashList 依赖。使用 `npx expo install` 确保版本与当前 Expo SDK 兼容。

```bash
npx expo install @shopify/flash-list
```

### Step 2: 定义数据类型

**这一步在干什么**: 为 Feed 数据建立 TypeScript 类型契约。`FeedPage` 定义了 cursor 分页的响应结构。

```typescript
// src/features/feed/types.ts
export interface Author {
  id: string;
  name: string;
  avatar: string;
}

export interface Post {
  id: string;
  title: string;
  summary: string;
  coverImage: string;
  author: Author;
  createdAt: string;
  likes: number;
  comments: number;
  tags: string[];
}

export interface FeedPage {
  data: Post[];
  nextCursor: string | null;
}
```

### Step 3: 创建 Mock API（带分页）

**这一步在干什么**: 模拟带 cursor 分页的 API 请求。`PAGE_SIZE` 控制每页数量，`nextCursor` 为 null 表示没有更多数据。

```typescript
// src/features/feed/api.ts
import type { FeedPage } from "./types";
import { MOCK_POSTS } from "./mock";

const PAGE_SIZE = 8;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const feedApi = {
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
```

### Step 4: 封装 useInfiniteQuery Hook

**这一步在干什么**: 用 React Query 的 `useInfiniteQuery` 将分页 API 封装为声明式 Hook。它自动管理多页数据的累积、翻页状态、刷新逻辑。

```typescript
// src/features/feed/useFeed.ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { feedApi } from "./api";

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => feedApi.getPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

### Step 5: 构建 PostCard（回收安全的 Item 组件）

**这一步在干什么**: 创建 Feed 卡片。关键设计——**零内部状态**，所有视觉数据从 props 读取，确保 Cell 复用不产生脏状态。`expo-image` 的 `recyclingKey` 确保图片跟随数据切换。

```tsx
// src/components/PostCard.tsx
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import type { Post } from "../features/feed";
import { formatRelativeTime } from "../utils/format";

interface PostCardProps {
  post: Post;
  onPress?: (post: Post) => void;
}

export function PostCard({ post, onPress }: PostCardProps) {
  return (
    <Pressable
      className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white"
      onPress={() => onPress?.(post)}
    >
      <Image
        source={post.coverImage}
        className="w-full aspect-video"
        contentFit="cover"
        transition={200}
        recyclingKey={post.id}
      />

      <View className="p-4">
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
```

### Step 6: 实现 Feed 页面

**这一步在干什么**: 组装完整的 Feed 页面。FlashList 负责虚拟化渲染，`useInfiniteQuery` 负责数据，列表状态组件负责空/错误/加载 UI。

```tsx
// app/(tabs)/index.tsx
import { FlashList } from "@shopify/flash-list";
import { useCallback } from "react";
import { View } from "react-native";
import {
  ListEmpty,
  ListError,
  ListFooter,
  ListLoading,
} from "../../src/components/ListStates";
import { PostCard } from "../../src/components/PostCard";
import type { Post } from "../../src/features/feed";
import { useFeed } from "../../src/features/feed";

export default function HomeScreen() {
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

  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: Post }) => <PostCard post={item} />,
    [],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
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
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={refetch}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
      />
    </View>
  );
}
```
