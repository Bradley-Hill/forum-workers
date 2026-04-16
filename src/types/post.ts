export interface Post {
  id: string;
  thread_id: string;
  author: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PostsResponse {
  posts: Post[];
  totalCount: number;
}
