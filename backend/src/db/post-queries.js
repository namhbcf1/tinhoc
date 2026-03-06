// ========================================
// POST QUERIES
// ========================================

/**
 * Lấy tất cả bài viết
 */
export async function getAllPosts(db, status = null, limit = 50, offset = 0) {
  let query = `
    SELECT * FROM posts
  `;

  if (status) {
    query += ` WHERE status = ?`;
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

  const params = status ? [status, limit, offset] : [limit, offset];
  const { results } = await db.prepare(query).bind(...params).all();

  return results || [];
}

/**
 * Lấy bài viết theo danh mục
 */
export async function getPostsByCategory(db, category, status = null) {
  let query = `
    SELECT * FROM posts
    WHERE category = ?
  `;

  const params = [category];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC`;

  const { results } = await db.prepare(query).bind(...params).all();

  return results || [];
}

/**
 * Lấy bài viết theo ID
 */
export async function getPostById(db, postId) {
  const post = await db.prepare(`
    SELECT * FROM posts WHERE id = ?
  `).bind(postId).first();

  return post;
}

/**
 * Tạo bài viết mới
 */
export async function createPost(db, postData) {
  const {
    title,
    slug,
    content,
    excerpt,
    category,
    tags,
    featured_image,
    author_id,
    status = 'draft',
    publish_at
  } = postData;

  // Generate slug from title if not provided
  const postSlug = slug || title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const result = await db.prepare(`
    INSERT INTO posts (
      title, slug, content, excerpt, category, tags,
      featured_image, author_id, status, publish_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    title,
    postSlug,
    content,
    excerpt || null,
    category || 'general',
    tags || null,
    featured_image || null,
    author_id || 0,
    status,
    publish_at || null
  ).run();

  if (!result.success) {
    throw new Error('Không thể tạo bài viết');
  }

  return await getPostById(db, result.meta.last_row_id);
}

/**
 * Cập nhật bài viết
 */
export async function updatePost(db, postId, postData) {
  const {
    title,
    slug,
    content,
    excerpt,
    category,
    tags,
    featured_image,
    status,
    publish_at
  } = postData;

  // Build dynamic update query
  const updates = [];
  const params = [];

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
    throw new Error('Không thể cập nhật bài viết');
  }

  return await getPostById(db, postId);
}

/**
 * Xóa bài viết
 */
export async function deletePost(db, postId) {
  const result = await db.prepare(`
    DELETE FROM posts WHERE id = ?
  `).bind(postId).run();

  if (!result.success) {
    throw new Error('Không thể xóa bài viết');
  }

  return true;
}

/**
 * Đăng bài viết (publish)
 */
export async function publishPost(db, postId) {
  const result = await db.prepare(`
    UPDATE posts
    SET status = 'published', publish_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(postId).run();

  if (!result.success) {
    throw new Error('Không thể đăng bài viết');
  }

  return true;
}

/**
 * Gỡ bài viết (unpublish)
 */
export async function unpublishPost(db, postId) {
  const result = await db.prepare(`
    UPDATE posts
    SET status = 'draft', updated_at = datetime('now')
    WHERE id = ?
  `).bind(postId).run();

  if (!result.success) {
    throw new Error('Không thể gỡ bài viết');
  }

  return true;
}
