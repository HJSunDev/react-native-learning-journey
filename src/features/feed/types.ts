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

/** 分页响应：cursor 为 null 表示已到最后一页 */
export interface FeedPage {
  data: Post[];
  nextCursor: string | null;
}
