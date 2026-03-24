// ========================================
// POST QUERIES
// ========================================

/**
 * Lay tat ca bai viet
 */
export async function getAllPosts(db: D1Database, status: string | null = null, limit = 50, offset = 0) {
  let query = `
    SELECT * FROM posts
  `;

  if (status) {
    query += ` WHERE status = ?`;
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

  const params: unknown[] = status ? [status, limit, offset] : [limit, offset];
  const { results } = await db.prepare(query).bind(...params).all();

  return results || [];
}

/**
 * Lay bai viet theo danh muc
 */
export async function getPostsByCategory(db: D1Database, category: string, status: string | null = null) {
  let query = `
    SELECT * FROM posts
    WHERE category = ?
  `;

  const params: unknown[] = [category];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC`;

  const { results } = await db.prepare(query).bind(...params).all();

  return results || [];
}

/**
 * Lay bai viet theo ID
 */
export async function getPostById(db: D1Database, postId: number) {
  const post = await db.prepare(`
    SELECT * FROM posts WHERE id = ?
  `).bind(postId).first();

  return post;
}

/**
 * Tao bai viet moi
 */
export async function createPost(db: D1Database, postData: Record<string, any>) {
  const {
    title,
    slug,
    content,
    excerpt,
    category,
    tags,
    featured_image,
    video_url,
    author_id,
    status = 'draft',
    publish_at
  } = postData;

  // Generate slug from title if not provided
  const postSlug = slug || title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const result = await db.prepare(`
    INSERT INTO posts (
      title, slug, content, excerpt, category, tags,
      featured_image, video_url, author_id, status, publish_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    title,
    postSlug,
    content,
    excerpt || null,
    category || 'general',
    tags || null,
    featured_image || null,
    video_url || null,
    author_id || 0,
    status,
    publish_at || null
  ).run();

  if (!result.success) {
    throw new Error('Cannot create post');
  }

  return await getPostById(db, result.meta.last_row_id);
}

/**
 * Cap nhat bai viet
 */
export async function updatePost(db: D1Database, postId: number, postData: Record<string, unknown>) {
  const {
    title,
    slug,
    content,
    excerpt,
    category,
    tags,
    featured_image,
    video_url,
    status,
    publish_at
  } = postData;

  // Build dynamic update query
  const updates: string[] = [];
  const params: unknown[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (slug !== undefined) {
    updates.push('slug = ?');
    params.push(slug);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
  }
  if (excerpt !== undefined) {
    updates.push('excerpt = ?');
    params.push(excerpt);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    params.push(tags);
  }
  if (featured_image !== undefined) {
    updates.push('featured_image = ?');
    params.push(featured_image);
  }
  if (video_url !== undefined) {
    updates.push('video_url = ?');
    params.push(video_url);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (publish_at !== undefined) {
    updates.push('publish_at = ?');
    params.push(publish_at);
  }

  updates.push('updated_at = datetime("now")');
  params.push(postId);

  const result = await db.prepare(`
    UPDATE posts
    SET ${updates.join(', ')}
    WHERE id = ?
  `).bind(...params).run();

  if (!result.success) {
    throw new Error('Cannot update post');
  }

  return await getPostById(db, postId);
}

/**
 * Xoa bai viet
 */
export async function deletePost(db: D1Database, postId: number) {
  const result = await db.prepare(`
    DELETE FROM posts WHERE id = ?
  `).bind(postId).run();

  if (!result.success) {
    throw new Error('Cannot delete post');
  }

  return true;
}

/**
 * Dang bai viet (publish)
 */
export async function publishPost(db: D1Database, postId: number) {
  const result = await db.prepare(`
    UPDATE posts
    SET status = 'published', publish_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(postId).run();

  if (!result.success) {
    throw new Error('Cannot publish post');
  }

  return true;
}

/**
 * Go bai viet (unpublish)
 */
export async function unpublishPost(db: D1Database, postId: number) {
  const result = await db.prepare(`
    UPDATE posts
    SET status = 'draft', updated_at = datetime('now')
    WHERE id = ?
  `).bind(postId).run();

  if (!result.success) {
    throw new Error('Cannot unpublish post');
  }

  return true;
}
