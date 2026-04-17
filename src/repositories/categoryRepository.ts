import { getSupabase } from "../db/supabase";
import { Category } from "../types/category";

export async function getAllCategories(): Promise<Category[]> {
  const supabase = getSupabase();
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
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, position")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;

  return data as Category | null;
}

export async function createCategory(
  slug: string,
  name: string,
  description: string,
): Promise<Category> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .insert({ slug, name, description })
    .select("id, slug, name, description, position")
    .single();

  if (error) throw error;

  return data as Category;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, position")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data as Category | null;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = getSupabase();
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
  const supabase = getSupabase();
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
  const supabase = getSupabase();

  // Get the category being moved
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("position")
    .eq("id", categoryId)
    .single();

  if (catError || !category) {
    throw new Error("Category not found");
  }

  const currentPosition = category.position as number;

  // If no change needed, just return all categories
  if (currentPosition === newPosition) {
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, description, position")
      .order("position", { ascending: true });

    if (error) throw error;
    return data as Category[];
  }

  // Get all categories
  const { data: allCategories, error: allError } = await supabase
    .from("categories")
    .select("id, slug, name, description, position")
    .order("position", { ascending: true });

  if (allError) throw allError;
  if (!allCategories) throw new Error("Failed to fetch categories");

  // Update categories one by one
  if (newPosition > currentPosition) {
    // Moving down: shift intermediate categories up
    for (const cat of allCategories) {
      if (
        cat.position > currentPosition &&
        cat.position <= newPosition
      ) {
        await supabase
          .from("categories")
          .update({ position: cat.position - 1 })
          .eq("id", cat.id);
      }
    }
  } else {
    // Moving up: shift intermediate categories down
    for (const cat of allCategories) {
      if (
        cat.position >= newPosition &&
        cat.position < currentPosition
      ) {
        await supabase
          .from("categories")
          .update({ position: cat.position + 1 })
          .eq("id", cat.id);
      }
    }
  }

  // Finally, update the target category to the new position
  const { error: finalError } = await supabase
    .from("categories")
    .update({ position: newPosition })
    .eq("id", categoryId);

  if (finalError) throw finalError;

  // Return updated categories
  const { data: result, error: resultError } = await supabase
    .from("categories")
    .select("id, slug, name, description, position")
    .order("position", { ascending: true });

  if (resultError) throw resultError;
  return result as Category[];
}
