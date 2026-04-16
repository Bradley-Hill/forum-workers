import { getSupabase } from "../db/supabase";
import { Thread } from "../types/thread";

export async function getThreadById(threadId: string): Promise<Thread | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("threads")
    .select(
      `
      id,
      category_id,
      title,
      is_sticky,
      is_locked,
      created_at,
      updated_at,
      author:author_id (
        id,
        username,
        avatar_url
      )
    `,
    )
    .eq("id", threadId)
    .single();

  if (error) throw error;

  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("thread_id", threadId);

  return {
    ...data,
    author: data.author ? data.author[0] : null,
    reply_count: count || 0,
  } as Thread;
}

export async function getThreadsByCategory(
  categoryId: string,
  page: number,
  pageSize: number = 20,
): Promise<{ threads: Thread[]; totalCount: number }> {
  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (countError) throw countError;

  const offset = (page - 1) * pageSize;
  const { data, error } = await supabase
    .from("threads")
    .select(
      `
      id,
      category_id,
      title,
      is_sticky,
      is_locked,
      created_at,
      updated_at,
      author:author_id (
        id,
        username,
        avatar_url
      )
    `,
    )
    .eq("category_id", categoryId)
    .order("is_sticky", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  const threads = (data || []).map((thread: any) => ({
    ...thread,
    author: thread.author ? thread.author[0] : null,
  })) as Thread[];

  return {
    threads,
    totalCount: count || 0,
  };
}

export async function createThreadWithPost(
  categoryId: string,
  title: string,
  authorId: string,
  content: string,
): Promise<Thread> {
  const supabase = getSupabase();
  const { data: threadData, error: threadError } = await supabase
    .from("threads")
    .insert({
      category_id: categoryId,
      title,
      author_id: authorId,
    })
    .select("id")
    .single();

  if (threadError) throw threadError;

  const { error: postError } = await supabase.from("posts").insert({
    thread_id: threadData.id,
    author_id: authorId,
    content,
  });

  if (postError) throw postError;

  const thread = await getThreadById(threadData.id);
  if (!thread) throw new Error("Failed to retrieve newly created thread");
  return thread;
}

export async function updateThread(
  threadId: string,
  title: string,
): Promise<Thread> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("threads")
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId);

  if (error) throw error;

  const thread = await getThreadById(threadId);
  if (!thread) throw new Error("Failed to retrieve updated thread");
  return thread;
}

export async function setThreadLocked(
  threadId: string,
  isLocked: boolean,
): Promise<Thread> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("threads")
    .update({
      is_locked: isLocked,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId);

  if (error) throw error;

  const thread = await getThreadById(threadId);
  if (!thread) throw new Error("Failed to retrieve updated thread");
  return thread;
}

export async function setThreadSticky(
  threadId: string,
  isSticky: boolean,
): Promise<Thread> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("threads")
    .update({
      is_sticky: isSticky,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId);

  if (error) throw error;

  const thread = await getThreadById(threadId);
  if (!thread) throw new Error("Failed to retrieve updated thread");
  return thread;
}

export async function deleteThread(threadId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("threads").delete().eq("id", threadId);

  if (error) throw error;
}

export async function getThreadsByUserId(
  userId: string,
  page: number,
  pageSize: number = 10,
): Promise<{ threads: Thread[]; totalCount: number }> {
  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("threads")
    .select("*", { count: "exact", head: true })
    .eq("author_id", userId);

  if (countError) throw countError;

  const offset = (page - 1) * pageSize;
  const { data, error } = await supabase
    .from("threads")
    .select(
      `
      id,
      category_id,
      title,
      is_sticky,
      is_locked,
      created_at,
      updated_at,
      author:author_id (
        id,
        username,
        avatar_url
      )
    `,
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  const threads = (data || []).map((thread: any) => ({
    ...thread,
    author: thread.author ? thread.author[0] : null,
  })) as Thread[];

  return {
    threads,
    totalCount: count || 0,
  };
}
