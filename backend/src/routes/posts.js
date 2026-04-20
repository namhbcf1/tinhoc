import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import { getAllPosts, getPostById, createPost, updatePost, deletePost, getPostsByCategory, publishPost, unpublishPost } from '../db/post-queries.js';
const posts = new Hono();
// ========================================
// GET /posts - Lấy danh sách bài viết
// ========================================
posts.get('/', async (c) => {
    try {
        const { category, status, limit = 50, offset = 0 } = c.req.query();
        let postsData;
        if (category) {
            postsData = await getPostsByCategory(c.env.DB, category, status);
        }
        else {
            postsData = await getAllPosts(c.env.DB, status, parseInt(limit), parseInt(offset));
        }
        return jsonResponse({
            success: true,
            data: postsData,
            total: postsData.length
        }, 200, {
            'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
        });
    }
    catch (error) {
        console.error('Error fetching posts:', error);
        return errorResponse('Lỗi lấy danh sách bài viết: ' + error.message, 500);
    }
});
// ========================================
// GET /posts/:id - Lấy chi tiết bài viết
// ========================================
posts.get('/:id', async (c) => {
    try {
        const { id } = c.req.param();
        const post = await getPostById(c.env.DB, parseInt(id));
        if (!post) {
            return errorResponse('Không tìm thấy bài viết', 404);
        }
        return jsonResponse({
            success: true,
            data: post
        }, 200, {
            'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
        });
    }
    catch (error) {
        console.error('Error fetching post:', error);
        return errorResponse('Lỗi lấy thông tin bài viết: ' + error.message, 500);
    }
});
// ========================================
// POST /posts - Tạo bài viết mới
// ========================================
posts.post('/', async (c) => {
    try {
        const postData = await c.req.json();
        // Validate
        if (!postData.title || !postData.content) {
            return errorResponse('Thiếu tiêu đề hoặc nội dung', 400);
        }
        const newPost = await createPost(c.env.DB, postData);
        return jsonResponse({
            success: true,
            message: 'Tạo bài viết thành công',
            data: newPost
        }, 201);
    }
    catch (error) {
        console.error('Error creating post:', error);
        return errorResponse('Lỗi tạo bài viết: ' + error.message, 500);
    }
});
// ========================================
// PUT /posts/:id - Cập nhật bài viết
// ========================================
posts.put('/:id', async (c) => {
    try {
        const { id } = c.req.param();
        const postData = await c.req.json();
        const updatedPost = await updatePost(c.env.DB, parseInt(id), postData);
        if (!updatedPost) {
            return errorResponse('Không tìm thấy bài viết', 404);
        }
        return jsonResponse({
            success: true,
            message: 'Cập nhật bài viết thành công',
            data: updatedPost
        });
    }
    catch (error) {
        console.error('Error updating post:', error);
        return errorResponse('Lỗi cập nhật bài viết: ' + error.message, 500);
    }
});
// ========================================
// DELETE /posts/:id - Xóa bài viết
// ========================================
posts.delete('/:id', async (c) => {
    try {
        const { id } = c.req.param();
        await deletePost(c.env.DB, parseInt(id));
        return jsonResponse({
            success: true,
            message: 'Xóa bài viết thành công'
        });
    }
    catch (error) {
        console.error('Error deleting post:', error);
        return errorResponse('Lỗi xóa bài viết: ' + error.message, 500);
    }
});
// ========================================
// PUT /posts/:id/publish - Đăng bài viết
// ========================================
posts.put('/:id/publish', async (c) => {
    try {
        const { id } = c.req.param();
        await publishPost(c.env.DB, parseInt(id));
        return jsonResponse({
            success: true,
            message: 'Đăng bài viết thành công'
        });
    }
    catch (error) {
        console.error('Error publishing post:', error);
        return errorResponse('Lỗi đăng bài viết: ' + error.message, 500);
    }
});
// ========================================
// PUT /posts/:id/unpublish - Gỡ bài viết
// ========================================
posts.put('/:id/unpublish', async (c) => {
    try {
        const { id } = c.req.param();
        await unpublishPost(c.env.DB, parseInt(id));
        return jsonResponse({
            success: true,
            message: 'Gỡ bài viết thành công'
        });
    }
    catch (error) {
        console.error('Error unpublishing post:', error);
        return errorResponse('Lỗi gỡ bài viết: ' + error.message, 500);
    }
});
export default posts;
