import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
  getCategoryById,
  deleteCategory,
  updateCategory,
  reorderCategories,
} from "./repositories/categoryRepository";
import {
  getPostsByThread,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from "./repositories/postRepository";
import {
  getThreadById,
  getThreadsByCategory,
  createThreadWithPost,
  updateThread,
  setThreadLocked,
  setThreadSticky,
  deleteThread,
  getThreadsByUserId,
} from "./repositories/threadRepository";
import {
  findUserByEmail,
  findUserByUsername,
  createUser,
  createRefreshToken,
  deleteRefreshToken,
  findRefreshToken,
  findUserById,
  updateUser,
  findUserWithHashById,
  findMeById,
  deleteUser,
} from "./repositories/userRepository";
import {
  authenticate,
  requireAuth,
  requireAdmin,
  setCookie,
  clearCookie,
  parseCookies,
} from "./middleware/authenticate";
import { csrf } from "./middleware/csrf";
import {
  rateLimiting,
  authRateLimiting,
  publicRateLimiting,
  apiRateLimiting,
} from "./middleware/rateLimiting";
import { AuthTokenPayload } from "./types/auth";
import { Variables } from "./types/context";
import {
  generateAccessToken,
  generateRefreshToken,
  generateCSRFToken,
} from "./utils/auth";
import {
  supabaseSignUp,
  supabaseSignIn,
  supabaseRefreshToken,
  supabaseUpdatePassword,
} from "./utils/supabaseAuth";
import { getSupabase } from "./db/supabase";

type Environment = {
  SUPABASE_SERVICE_ROLE_KEY: string;
};

const app = new Hono<{ Variables: Variables; Bindings: Environment }>();

app.use(async (c, next) => {
  (globalThis as any).SUPABASE_SERVICE_ROLE_KEY =
    c.env.SUPABASE_SERVICE_ROLE_KEY;
  await next();
});

app.use(
  cors({
    origin: "https://forum.bradley-hill.com",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "Cookie"],
    exposeHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
  }),
);

app.use(csrf);

app.get("/categories", publicRateLimiting(), async (c) => {
  const categories = await getAllCategories();

  return c.json({ data: categories });
});

app.get("/categories/id/:id", publicRateLimiting(), async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json(
      { error: { message: "Category ID is required", code: "MISSING_ID" } },
      400,
    );
  }
  const category = await getCategoryById(id);

  if (!category) {
    return c.json(
      { error: { message: "Category not found", code: "CATEGORY_NOT_FOUND" } },
      404,
    );
  }

  return c.json({ data: category });
});

app.get("/categories/:slug", publicRateLimiting(), async (c) => {
  const slug = c.req.param("slug");
  if (!slug) {
    return c.json(
      { error: { message: "Slug is required", code: "MISSING_SLUG" } },
      400,
    );
  }
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return c.json(
      { error: { message: "Category not found", code: "CATEGORY_NOT_FOUND" } },
      404,
    );
  }

  return c.json({ data: category });
});

app.post(
  "/categories",
  authenticate,
  csrf,
  requireAdmin,
  async (c) => {
  const body = await c.req.json();
  const { name, description } = body;

  if (!name || !description) {
    return c.json(
      {
        error: {
          message: "Name and description are required",
          code: "MISSING_FIELDS",
        },
      },
      400,
    );
  }

  const trimmedName = name.trim();
  const slug = trimmedName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

  const newCategory = await createCategory(slug, trimmedName, description);

  return c.json({ data: newCategory }, 201);
});

app.delete(
  "/categories/:id",
  authenticate,
  csrf,
  requireAdmin,
  async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json(
      { error: { message: "Category ID is required", code: "MISSING_ID" } },
      400,
    );
  }

  const category = await getCategoryById(id);
  if (!category) {
    return c.json(
      { error: { message: "Category not found", code: "CATEGORY_NOT_FOUND" } },
      404,
    );
  }

  await deleteCategory(id);
  return c.text("", 204);
});

app.patch(
  "/categories/:id",
  authenticate,
  csrf,
  requireAdmin,
  async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json(
      { error: { message: "Category ID is required", code: "MISSING_ID" } },
      400,
    );
  }
  const body = await c.req.json();
  const { name, description } = body;

  const category = await getCategoryById(id);
  if (!category) {
    return c.json(
      { error: { message: "Category not found", code: "CATEGORY_NOT_FOUND" } },
      404,
    );
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

app.patch(
  "/categories/:id/position",
  authenticate,
  csrf,
  requireAdmin,
  async (c) => {
    try {
      const id = c.req.param("id");
    if (!id) {
      return c.json(
        { error: { message: "Category ID is required", code: "MISSING_ID" } },
        400,
      );
    }
    const body = await c.req.json();
    const { position } = body;

    if (position === undefined || position === null) {
      return c.json(
        {
          error: {
            message: "Position is required",
            code: "MISSING_POSITION",
          },
        },
        400,
      );
    }

    if (typeof position !== "number" || !Number.isInteger(position)) {
      return c.json(
        {
          error: {
            message: "Position must be an integer",
            code: "INVALID_POSITION_TYPE",
          },
        },
        400,
      );
    }

    if (position < 0) {
      return c.json(
        {
          error: {
            message: "Position must be a non-negative number",
            code: "INVALID_POSITION",
          },
        },
        400,
      );
    }

    const category = await getCategoryById(id);
    if (!category) {
      return c.json(
        {
          error: { message: "Category not found", code: "CATEGORY_NOT_FOUND" },
        },
        404,
      );
    }

    const reorderedCategories = await reorderCategories(id, position);

    return c.json({ data: reorderedCategories });
  } catch (error) {
    return c.json(
      {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to reorder categories",
          code: "DATABASE_ERROR",
        },
      },
      500,
    );
  }
});

// ============ POST ROUTES ============

app.get("/posts/thread/:threadId", publicRateLimiting(), async (c) => {
  const threadId = c.req.param("threadId");
  if (!threadId) {
    return c.json(
      { error: { message: "Thread ID is required", code: "MISSING_ID" } },
      400,
    );
  }
  const query = c.req.query();
  const page = parseInt(query.page || "1", 10);
  const pageSize = parseInt(query.pageSize || "20", 10);

  if (page < 1 || pageSize < 1) {
    return c.json(
      {
        error: {
          message: "Page and pageSize must be positive integers",
          code: "INVALID_PAGINATION",
        },
      },
      400,
    );
  }

  try {
    const result = await getPostsByThread(threadId, page, pageSize);
    return c.json({
      data: {
        posts: result.posts,
        pagination: {
          page,
          pageSize,
          totalItems: result.totalCount,
          totalPages: Math.ceil(result.totalCount / pageSize),
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        error: { message: "Failed to fetch posts", code: "POSTS_FETCH_ERROR" },
      },
      500,
    );
  }
});

app.post(
  "/posts",
  apiRateLimiting(),
  authenticate,
  csrf,
  requireAuth,
  async (c) => {
    try {
      const user = c.get("user") as AuthTokenPayload;
      const body = await c.req.json();
      const { thread_id, content } = body;

      if (!thread_id || !content) {
        return c.json(
          {
            error: {
              message: "thread_id and content are required",
              code: "MISSING_FIELDS",
            },
          },
          400,
        );
      }

      const thread = await getThreadById(thread_id);
      if (!thread) {
        return c.json(
          { error: { message: "Thread not found", code: "THREAD_NOT_FOUND" } },
          404,
        );
      }

      if (thread.is_locked) {
        return c.json(
          { error: { message: "Thread is locked", code: "THREAD_LOCKED" } },
          403,
        );
      }

      const post = await createPost(thread_id, content, user.id);

      return c.json({ data: post }, 201);
    } catch (error) {
      return c.json(
        {
          error: {
            message: "Failed to create post",
            code: "POST_CREATE_ERROR",
          },
        },
        500,
      );
    }
  },
);

app.patch(
  "/posts/:id",
  apiRateLimiting(),
  authenticate,
  csrf,
  requireAuth,
  async (c) => {
    try {
      const user = c.get("user") as AuthTokenPayload;
      const id = c.req.param("id");

      if (!id) {
        return c.json(
          { error: { message: "Post ID is required", code: "MISSING_ID" } },
          400,
        );
      }

      const body = await c.req.json();
      const { content } = body;

      if (!content) {
        return c.json(
          { error: { message: "content is required", code: "MISSING_FIELDS" } },
          400,
        );
      }

      const post = await getPostById(id);
      if (!post) {
        return c.json(
          { error: { message: "Post not found", code: "POST_NOT_FOUND" } },
          404,
        );
      }

      // Check authorization: user must be author or admin
      if (user.role !== "admin" && post.author.id !== user.id) {
        return c.json(
          { error: { message: "Forbidden", code: "FORBIDDEN" } },
          403,
        );
      }

      const updated = await updatePost(id, content);
      return c.json({ data: updated });
    } catch (error) {
      return c.json(
        {
          error: {
            message: "Failed to update post",
            code: "POST_UPDATE_ERROR",
          },
        },
        500,
      );
    }
  },
);

app.delete(
  "/posts/:id",
  apiRateLimiting(),
  authenticate,
  csrf,
  requireAuth,
  async (c) => {
    try {
      const user = c.get("user") as AuthTokenPayload;
      const id = c.req.param("id");

      if (!id) {
        return c.json(
          { error: { message: "Post ID is required", code: "MISSING_ID" } },
          400,
        );
      }

      const post = await getPostById(id);
      if (!post) {
        return c.json(
          { error: { message: "Post not found", code: "POST_NOT_FOUND" } },
          404,
        );
      }

      // Check authorization: user must be author or admin
      if (user.role !== "admin" && post.author.id !== user.id) {
        return c.json(
          { error: { message: "Forbidden", code: "FORBIDDEN" } },
          403,
        );
      }

      await deletePost(id);
      return c.text("", 204);
    } catch (error) {
      return c.json(
        {
          error: {
            message: "Failed to delete post",
            code: "POST_DELETE_ERROR",
          },
        },
        500,
      );
    }
  },
);

// ============ THREAD ROUTES ============

app.get("/categories/:categoryId/threads", publicRateLimiting(), async (c) => {
  const categoryParam = c.req.param("categoryId");
  if (!categoryParam) {
    return c.json(
      {
        error: {
          message: "Category ID or slug is required",
          code: "MISSING_ID",
        },
      },
      400,
    );
  }
  const query = c.req.query();
  const page = parseInt(query.page || "1", 10);
  const pageSize = parseInt(query.pageSize || "20", 10);

  if (page < 1 || pageSize < 1) {
    return c.json(
      {
        error: {
          message: "Page and pageSize must be positive integers",
          code: "INVALID_PAGINATION",
        },
      },
      400,
    );
  }

  try {
    // Try to fetch by slug first (most common), then by ID
    let category = await getCategoryBySlug(categoryParam);
    if (!category) {
      category = await getCategoryById(categoryParam);
    }

    if (!category) {
      return c.json(
        {
          error: { message: "Category not found", code: "CATEGORY_NOT_FOUND" },
        },
        404,
      );
    }

    const result = await getThreadsByCategory(category.id, page, pageSize);
    return c.json({
      data: {
        category: {
          id: category.id,
          slug: category.slug,
          name: category.name,
        },
        threads: result.threads,
        pagination: {
          page,
          pageSize,
          totalItems: result.totalCount,
          totalPages: Math.ceil(result.totalCount / pageSize),
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        error: {
          message: "Failed to fetch threads",
          code: "THREADS_FETCH_ERROR",
        },
      },
      500,
    );
  }
});

app.get("/threads/:id", publicRateLimiting(), async (c) => {
  const threadId = c.req.param("id");
  if (!threadId) {
    return c.json(
      { error: { message: "Thread ID is required", code: "MISSING_ID" } },
      400,
    );
  }
  const query = c.req.query();
  const page = parseInt(query.page || "1", 10);
  const pageSize = parseInt(query.pageSize || "20", 10);

  if (page < 1 || pageSize < 1) {
    return c.json(
      {
        error: {
          message: "Page and pageSize must be positive integers",
          code: "INVALID_PAGINATION",
        },
      },
      400,
    );
  }

  try {
    const thread = await getThreadById(threadId);
    if (!thread) {
      return c.json(
        { error: { message: "Thread not found", code: "THREAD_NOT_FOUND" } },
        404,
      );
    }

    const { posts, totalCount } = await getPostsByThread(
      threadId,
      page,
      pageSize,
    );

    return c.json({
      data: {
        thread,
        posts,
        pagination: {
          page,
          pageSize,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        error: {
          message: "Failed to fetch thread",
          code: "THREAD_FETCH_ERROR",
        },
      },
      500,
    );
  }
});

app.post(
  "/threads",
  apiRateLimiting(),
  authenticate,
  csrf,
  requireAuth,
  async (c) => {
    try {
      const user = c.get("user") as AuthTokenPayload;
      const body = await c.req.json();
      const { category_id, title, content } = body;

      if (!category_id || !title || !content) {
        return c.json(
          {
            error: {
              message: "category_id, title, and content are required",
              code: "MISSING_FIELDS",
            },
          },
          400,
        );
      }

      const category = await getCategoryById(category_id);
      if (!category) {
        return c.json(
          {
            error: {
              message: "Category not found",
              code: "CATEGORY_NOT_FOUND",
            },
          },
          404,
        );
      }

      const thread = await createThreadWithPost(
        category_id,
        title,
        user.id,
        content,
      );

      return c.json({ data: thread }, 201);
    } catch (error) {
      return c.json(
        {
          error: {
            message: "Failed to create thread",
            code: "THREAD_CREATE_ERROR",
          },
        },
        500,
      );
    }
  },
);

app.patch(
  "/threads/:id",
  apiRateLimiting(),
  authenticate,
  csrf,
  requireAuth,
  async (c) => {
    try {
      const user = c.get("user") as AuthTokenPayload;
      const threadId = c.req.param("id");

      if (!threadId) {
        return c.json(
          { error: { message: "Thread ID is required", code: "MISSING_ID" } },
          400,
        );
      }

      const body = await c.req.json();
      const { title } = body;

      if (!title) {
        return c.json(
          { error: { message: "title is required", code: "MISSING_FIELDS" } },
          400,
        );
      }

      const thread = await getThreadById(threadId);
      if (!thread) {
        return c.json(
          { error: { message: "Thread not found", code: "THREAD_NOT_FOUND" } },
          404,
        );
      }

      // Check authorization: user must be author or admin
      if (user.role !== "admin" && thread.author.id !== user.id) {
        return c.json(
          { error: { message: "Forbidden", code: "FORBIDDEN" } },
          403,
        );
      }

      // Check if thread is locked (only admin can edit locked threads)
      if (thread.is_locked && user.role !== "admin") {
        return c.json(
          { error: { message: "Thread is locked", code: "THREAD_LOCKED" } },
          403,
        );
      }

      const updated = await updateThread(threadId, title);
      return c.json({ data: updated });
    } catch (error) {
      return c.json(
        {
          error: {
            message: "Failed to update thread",
            code: "THREAD_UPDATE_ERROR",
          },
        },
        500,
      );
    }
  },
);

app.patch(
  "/threads/:id/lock",
  authenticate,
  csrf,
  requireAdmin,
  async (c) => {
    try {
      const threadId = c.req.param("id");

      if (!threadId) {
        return c.json(
          { error: { message: "Thread ID is required", code: "MISSING_ID" } },
          400,
        );
      }

      const body = await c.req.json();
      const { is_locked } = body;

      if (typeof is_locked !== "boolean") {
        return c.json(
          {
            error: {
              message: "is_locked must be a boolean",
              code: "INVALID_TYPE",
            },
          },
          400,
        );
      }

      const thread = await getThreadById(threadId);
      if (!thread) {
        return c.json(
          { error: { message: "Thread not found", code: "THREAD_NOT_FOUND" } },
          404,
        );
      }

      const updated = await setThreadLocked(threadId, is_locked);
      return c.json({ data: updated });
    } catch (error) {
      return c.json(
        {
          error: {
            message: "Failed to lock/unlock thread",
            code: "THREAD_LOCK_ERROR",
          },
        },
        500,
      );
    }
  },
);

app.patch(
  "/threads/:id/sticky",
  authenticate,
  csrf,
  requireAdmin,
  async (c) => {
    try {
      const threadId = c.req.param("id");

      if (!threadId) {
        return c.json(
          { error: { message: "Thread ID is required", code: "MISSING_ID" } },
          400,
        );
      }

      const body = await c.req.json();
      const { is_sticky } = body;

      if (typeof is_sticky !== "boolean") {
        return c.json(
          {
            error: {
              message: "is_sticky must be a boolean",
              code: "INVALID_TYPE",
            },
          },
          400,
        );
      }

      const thread = await getThreadById(threadId);
      if (!thread) {
        return c.json(
          { error: { message: "Thread not found", code: "THREAD_NOT_FOUND" } },
          404,
        );
      }

      const updated = await setThreadSticky(threadId, is_sticky);
      return c.json({ data: updated });
    } catch (error) {
      return c.json(
        {
          error: {
            message: "Failed to set thread sticky",
            code: "THREAD_STICKY_ERROR",
          },
        },
        500,
      );
    }
  },
);

app.delete(
  "/threads/:id",
  authenticate,
  csrf,
  requireAdmin,
  async (c) => {
    try {
      const threadId = c.req.param("id");

      if (!threadId) {
        return c.json(
          { error: { message: "Thread ID is required", code: "MISSING_ID" } },
          400,
        );
      }

      const thread = await getThreadById(threadId);
      if (!thread) {
        return c.json(
          { error: { message: "Thread not found", code: "THREAD_NOT_FOUND" } },
          404,
        );
      }

      await deleteThread(threadId);
      return c.text("", 204);
    } catch (error) {
      return c.json(
        {
          error: {
            message: "Failed to delete thread",
            code: "THREAD_DELETE_ERROR",
          },
        },
        500,
      );
    }
  },
);

// ============ USER ROUTES ============

app.get(
  "/users/me",
  publicRateLimiting(),
  authenticate,
  requireAuth,
  async (c) => {
    try {
      const user = c.get("user") as AuthTokenPayload;
      const profile = await findMeById(user.id);

      if (!profile) {
        return c.json(
          { error: { message: "User not found", code: "USER_NOT_FOUND" } },
          404,
        );
      }

      return c.json({ data: profile });
    } catch (error) {
      return c.json(
        {
          error: { message: "Failed to fetch user", code: "USER_FETCH_ERROR" },
        },
        500,
      );
    }
  },
);

app.post("/users/me/avatar", authenticate, csrf, requireAuth, async (c) => {
  try {
    const user = c.get("user") as AuthTokenPayload;
    const formData = await c.req.formData();
    const avatarFile = formData.get("avatar");

    if (!avatarFile || typeof avatarFile === "string") {
      return c.json(
        {
          error: {
            message: "No file uploaded",
            code: "VALIDATION_ERROR",
          },
        },
        400,
      );
    }

    const supabase = getSupabase();
    const filename = `${user.id}/avatar.jpg`;

    const buffer = await (
      avatarFile as { arrayBuffer: () => Promise<ArrayBuffer> }
    ).arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filename, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      return c.json(
        {
          error: {
            message: "Failed to upload avatar",
            code: "STORAGE_ERROR",
          },
        },
        500,
      );
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filename);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      return c.json(
        {
          error: {
            message: "Failed to update user",
            code: "DATABASE_ERROR",
          },
        },
        500,
      );
    }

    return c.json({ data: { avatar_url: publicUrl } }, 200);
  } catch (error) {
    return c.json(
      {
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      },
      500,
    );
  }
});

app.get("/users/:username", publicRateLimiting(), async (c) => {
  try {
    const username = c.req.param("username");
    if (!username) {
      return c.json(
        {
          error: { message: "Username is required", code: "MISSING_USERNAME" },
        },
        400,
      );
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return c.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        404,
      );
    }

    return c.json({ data: user });
  } catch (error) {
    return c.json(
      {
        error: {
          message: "Failed to fetch user profile",
          code: "USER_PROFILE_FETCH_ERROR",
        },
      },
      500,
    );
  }
});

app.get("/users/:username/threads", publicRateLimiting(), async (c) => {
  try {
    const username = c.req.param("username");
    if (!username) {
      return c.json(
        {
          error: { message: "Username is required", code: "MISSING_USERNAME" },
        },
        400,
      );
    }
    const query = c.req.query();
    const page = parseInt(query.page || "1", 10);
    const pageSize = parseInt(query.pageSize || "10", 10);

    if (page < 1 || pageSize < 1) {
      return c.json(
        {
          error: {
            message: "Page and pageSize must be positive integers",
            code: "INVALID_PAGINATION",
          },
        },
        400,
      );
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return c.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        404,
      );
    }

    const result = await getThreadsByUserId(user.id, page, pageSize);

    return c.json({
      data: {
        threads: result.threads,
        pagination: {
          page,
          pageSize,
          totalItems: result.totalCount,
          totalPages: Math.ceil(result.totalCount / pageSize),
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        error: {
          message: "Failed to fetch user threads",
          code: "USER_THREADS_FETCH_ERROR",
        },
      },
      500,
    );
  }
});

app.patch(
  "/users/me",
  apiRateLimiting(),
  authenticate,
  csrf,
  requireAuth,
  async (c) => {
    try {
      const user = c.get("user") as AuthTokenPayload;
      const body = await c.req.json();
      const { email, currentPassword, newPassword } = body;

      const userProfile = await findMeById(user.id);

      if (!userProfile) {
        return c.json(
          {
            error: {
              message: "User not found",
              code: "USER_NOT_FOUND",
            },
          },
          404,
        );
      }

      if (!userProfile.auth_id) {
        return c.json(
          {
            error: {
              message:
                "Your account needs to be re-registered with the new authentication system. Please log out and create a new account.",
              code: "AUTH_MIGRATION_REQUIRED",
            },
          },
          403,
        );
      }

      const fields: { email?: string } = {};

      if (email !== undefined) {
        const existingUser = await findUserByEmail(email.trim());
        if (existingUser && existingUser.id !== user.id) {
          return c.json(
            {
              error: { message: "Email already in use", code: "EMAIL_IN_USE" },
            },
            409,
          );
        }
        fields.email = email.trim();
      }

      if (newPassword !== undefined) {
        if (!currentPassword) {
          return c.json(
            {
              error: {
                message: "currentPassword is required to set a new password",
                code: "MISSING_CURRENT_PASSWORD",
              },
            },
            400,
          );
        }

        // Verify current password with Supabase Auth
        try {
          await supabaseSignIn(userProfile.email, currentPassword);
        } catch (error: any) {
          return c.json(
            {
              error: {
                message: "Current password is incorrect",
                code: "INVALID_PASSWORD",
              },
            },
            401,
          );
        }

        // Update password via Supabase Auth
        try {
          await supabaseUpdatePassword(userProfile.auth_id, newPassword);
          // Password updated successfully
        } catch (error: any) {
          return c.json(
            {
              error: {
                message: error.message || "Failed to update password",
                code: "PASSWORD_UPDATE_ERROR",
              },
            },
            400,
          );
        }
      }

      const updated = await updateUser(user.id, fields);
      return c.json({ data: updated });
    } catch (error) {
      return c.json(
        {
          error: {
            message: "Failed to update user profile",
            code: "USER_UPDATE_ERROR",
          },
        },
        500,
      );
    }
  },
);

app.delete(
  "/users/me",
  apiRateLimiting(),
  authenticate,
  csrf,
  requireAuth,
  async (c) => {
    try {
      const user = c.get("user") as AuthTokenPayload;

      // Get user profile to access auth_id
      const userProfile = await findMeById(user.id);
      if (!userProfile) {
        return c.json(
          {
            error: {
              message: "User not found",
              code: "USER_NOT_FOUND",
            },
          },
          404,
        );
      }

      // Delete from Supabase Auth first
      if (userProfile.auth_id) {
        const supabase = getSupabase();
        const { error: authError } = await supabase.auth.admin.deleteUser(
          userProfile.auth_id,
        );
        if (authError) {
          throw new Error(`Failed to delete auth user: ${authError.message}`);
        }
      }

      // Then delete from forum database
      await deleteUser(user.id);
      return c.text("", 204);
    } catch (error: any) {
      return c.json(
        {
          error: {
            message: error.message || "Failed to delete user account",
            code: "USER_DELETE_ERROR",
          },
        },
        500,
      );
    }
  },
);

// ============ AUTH ROUTES ============

app.post("/auth/register", authRateLimiting(), async (c) => {
  try {
    const body = await c.req.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return c.json(
        {
          error: {
            message: "username, email, and password are required",
            code: "MISSING_FIELDS",
          },
        },
        400,
      );
    }

    if (await findUserByUsername(username)) {
      return c.json(
        {
          error: {
            message: "Username already exists",
            code: "USERNAME_EXISTS",
          },
        },
        409,
      );
    }

    const supabaseUser = await supabaseSignUp(email, password, { username });

    const user = await createUser(username, email, supabaseUser.user.id);

    const refreshToken = supabaseUser.session.refresh_token;
    const expiresIn = supabaseUser.session.expires_in;
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createRefreshToken(user.id, refreshToken, refreshTokenExpiry);

    // Generate our own access token with user info
    const accessToken = await generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const csrfToken = generateCSRFToken();

    setCookie(c, "accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: expiresIn,
    });
    setCookie(c, "refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60,
    });
    setCookie(c, "csrfToken", csrfToken, {
      httpOnly: false,
      secure: true,
      sameSite: "None",
      maxAge: 3600,
    });

    return c.json({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        csrfToken,
      },
    });
  } catch (error: any) {
    return c.json(
      {
        error: {
          message: error.message || "Failed to register user",
          code: "REGISTRATION_ERROR",
        },
      },
      400,
    );
  }
});

app.post("/auth/login", authRateLimiting(), async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json(
        {
          error: {
            message: "email and password are required",
            code: "MISSING_FIELDS",
          },
        },
        400,
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return c.json(
        {
          error: {
            message: "Invalid email or password",
            code: "INVALID_CREDENTIALS",
          },
        },
        401,
      );
    }

    const supabaseSession = await supabaseSignIn(email, password);

    const refreshToken = supabaseSession.session.refresh_token;
    const expiresIn = supabaseSession.session.expires_in;
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createRefreshToken(user.id, refreshToken, refreshTokenExpiry);

    // Generate our own access token with user info
    const accessToken = await generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const csrfToken = generateCSRFToken();

    setCookie(c, "accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: expiresIn,
    });
    setCookie(c, "refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60,
    });
    setCookie(c, "csrfToken", csrfToken, {
      httpOnly: false,
      secure: true,
      sameSite: "None",
      maxAge: 3600,
    });

    return c.json({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        csrfToken,
      },
    });
  } catch (error: any) {
    return c.json(
      {
        error: {
          message: error.message || "Failed to login",
          code: "LOGIN_ERROR",
        },
      },
      401,
    );
  }
});

app.post("/auth/refresh", authRateLimiting(), async (c) => {
  try {
    const cookieHeader = c.req.header("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      return c.json(
        {
          error: {
            message: "Refresh token is required",
            code: "MISSING_REFRESH_TOKEN",
          },
        },
        401,
      );
    }

    // Verify refresh token exists in our database
    const tokenRecord = await findRefreshToken(refreshToken);
    if (!tokenRecord) {
      return c.json(
        {
          error: {
            message: "Invalid or expired refresh token",
            code: "INVALID_REFRESH_TOKEN",
          },
        },
        401,
      );
    }

    const expiresAt = new Date(tokenRecord.expires_at);
    if (expiresAt < new Date()) {
      await deleteRefreshToken(refreshToken);
      return c.json(
        {
          error: {
            message: "Refresh token has expired",
            code: "REFRESH_TOKEN_EXPIRED",
          },
        },
        401,
      );
    }

    // Delegate to Supabase Auth to refresh tokens
    const newSession = await supabaseRefreshToken(refreshToken);

    const user = await findUserById(tokenRecord.user_id);
    if (!user) {
      return c.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        401,
      );
    }

    // Update refresh token in database if Supabase returned a new one
    if (newSession.refresh_token !== refreshToken) {
      await deleteRefreshToken(refreshToken);
      const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createRefreshToken(
        user.id,
        newSession.refresh_token,
        refreshTokenExpiry,
      );
    }

    const accessToken = await generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    // Set new access token cookie
    setCookie(c, "accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: newSession.expires_in,
    });

    // Update refresh token cookie if new one was issued
    if (newSession.refresh_token !== refreshToken) {
      setCookie(c, "refreshToken", newSession.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    const csrfToken = generateCSRFToken();
    setCookie(c, "csrfToken", csrfToken, {
      httpOnly: false,
      secure: true,
      sameSite: "None",
      maxAge: 3600,
    });

    return c.json({
      data: {
        id: user.id,
        username: user.username,
        csrfToken,
      },
    });
  } catch (error: any) {
    return c.json(
      {
        error: {
          message: error.message || "Failed to refresh token",
          code: "REFRESH_ERROR",
        },
      },
      401,
    );
  }
});

app.post("/auth/logout", authRateLimiting(), async (c) => {
  try {
    const cookieHeader = c.req.header("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const refreshToken = cookies.refreshToken;

    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }

    setCookie(c, "accessToken", "", { maxAge: 0, sameSite: "None" });
    setCookie(c, "refreshToken", "", { maxAge: 0, sameSite: "None" });

    return c.json({ data: { message: "Logout successful" } });
  } catch (error) {
    return c.json(
      { error: { message: "Failed to logout", code: "LOGOUT_ERROR" } },
      500,
    );
  }
});

export default app;
