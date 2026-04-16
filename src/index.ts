import { Hono } from "hono";
import {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  getCategoryById,
  deleteCategory,
  updateCategory,
  reorderCategories,
} from "./repositories/categoryRepository";

const app = new Hono();

app.get("/categories", async (c) => {
  const categories = await getAllCategories();

  return c.json({ data: categories });
});

app.get("/categories/id/:id", async (c) => {
  const { id } = c.req.param();
  const category = await getCategoryById(id);

  if (!category) {
    return c.json({ error: "Category not found" }, 404);
  }

  return c.json({ data: category });
});

app.get("/categories/:slug", async (c) => {
  const { slug } = c.req.param();
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return c.json({ error: "Category not found" }, 404);
  }

  return c.json({ data: category });
});

app.post("/categories", async (c) => {
  const body = await c.req.json();
  const { name, slug, description } = body;

  const newCategory = await createCategory(slug, name, description);

  return c.json({ data: newCategory }, 201);
});

app.delete("/categories/:id", async (c) => {
  const id = c.req.param("id");

  const category = await getCategoryById(id);
  if (!category) {
    return c.json({ error: "Category not found" }, 404);
  }

  await deleteCategory(id);
  return c.text("", 204);
});

app.patch("/categories/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, description } = body;

  const category = await getCategoryById(id);
  if (!category) {
    return c.json({ error: "Category not found" }, 404);
  }

  const fields: {
    name?: string;
    slug?: string;
    description?: string;
    position?: number;
  } = {};
  if (name !== undefined) {
    const trimmedName = name.trim();
    fields.name = trimmedName;
    fields.slug = trimmedName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  }
  if (description !== undefined) {
    fields.description = description;
  }

  const updatedCategory = await updateCategory(id, fields);

  return c.json({ data: updatedCategory });
});

app.patch("/categories/:id/position", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { position } = body;

  if (typeof position !== "number" || position < 0) {
    return c.json({ error: "Position must be a non-negative number" }, 400);
  }

  const category = await getCategoryById(id);
  if (!category) {
    return c.json({ error: "Category not found" }, 404);
  }

  const reorderedCategories = await reorderCategories(id, position);

  return c.json({ data: reorderedCategories });
});

export default app;
