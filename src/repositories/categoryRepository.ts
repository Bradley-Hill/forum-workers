import { supabase } from "../db/supabase";
import { Category } from "../types/category";

export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, position")
    .order("position", { ascending: true });

  if (error) throw error;

  return data as Category[];
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, position")
    .eq("slug", slug)
    .single();

  if (error) throw error;

  return data as Category;
}

export async function createCategory(
  slug: string,
  name: string,
  description: string,
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ slug, name, description })
    .select("id, slug, name, description, position")
    .single();

  if (error) throw error;

  return data as Category;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, position")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) throw error;
}

export async function updateCategory(
  id: string,
  fields: {
    name?: string;
    slug?: string;
    description?: string;
    position?: number;
  },
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update(fields)
    .eq("id", id)
    .select("id, slug, name, description, position")
    .single();

  if (error) throw error;

  return data as Category;
}

export async function reorderCategories(
  categoryId: string,
  newPosition: number,
): Promise<Category[]> {
    const { data, error } = await supabase
    .rpc('reorder_category', {
        p_category_id: categoryId,
        p_new_position: newPosition
    });

  if (error) throw error;

  return data as Category[];
}
