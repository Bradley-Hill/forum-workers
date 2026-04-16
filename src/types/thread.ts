export interface Thread {
  id: string;
  category_id: string;
  title: string;
  is_sticky: boolean;
  is_locked: boolean;
  author: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
  reply_count: number;
}
