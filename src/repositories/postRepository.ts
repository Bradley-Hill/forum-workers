import { getSupabase } from "../db/supabase";
import { Post, PostsResponse } from "../types/post";

export async function getPostsByThread(
  threadId: string,
  page: number,
  pageSize: number = 20,
): Promise<PostsResponse> {
  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("thread_id", threadId);

  if (countError) throw countError;

  const offset = (page - 1) * pageSize;
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id,
      thread_id,
      content,
      created_at,
      updated_at,
      author:author_id (
        id,
        username,
        avatar_url
      )
    `,
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  const posts = (data || []).map((post: any) => ({
    id: post.id,
    thread_id: post.thread_id,
    content: post.content,
    created_at: post.created_at,
    updated_at: post.updated_at,
    author: post.author && post.author.length > 0 ? post.author[0] : { id: "", username: "", avatar_url: undefined },
  })) as Post[];

  return {
    posts,
    totalCount: count || 0,
  };
}

export async function getPostById(postId: string): Promise<Post | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id,
      thread_id,
      content,
      created_at,
      updated_at,
      author:author_id (
        id,
        username,
        avatar_url
      )
    `,
    )
    .eq("id", postId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    id: data.id,
    thread_id: data.thread_id,
    content: data.content,
    created_at: data.created_at,
    updated_at: data.updated_at,
    author: data.author && data.author.length > 0 ? data.author[0] : { id: "", username: "", avatar_url: undefined },
  } as Post;
}

export async function createPost(
  threadId: string,
  content: string,
  authorId: string,
): Promise<Post> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      thread_id: threadId,
      content,
      author_id: authorId,
    })
    .select("id")
    .single();

  if (error) throw error;

  const post = await getPostById(data.id);
  if (!post) throw new Error("Failed to retrieve newly created post");
  return post;
}

export async function updatePost(
  postId: string,
  content: string,
): Promise<Post> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("posts")
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) throw error;

  const post = await getPostById(postId);
  if (!post) throw new Error("Failed to retrieve updated post");
  return post;
}

export async function deletePost(postId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (error) throw error;
}
