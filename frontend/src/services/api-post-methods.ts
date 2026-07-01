// @ts-nocheck
// ========================================
// POST METHODS MIXIN
// Blog/news post CRUD + publish/unpublish
// Note: duplicate getPosts (lines ~1012 and ~1625 in original) — keeping FIRST definition only
// ========================================

export function applyPostMethods(ApiClient) {
  // Get posts with optional filters (first definition kept, duplicate removed)
  ApiClient.prototype.getPosts = async function(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/posts?${query}` : '/posts';
    return this.cachedRequest(endpoint, {}, { ttlMs: 5 * 60 * 1000 });
  };

  // Get a single post by ID
  ApiClient.prototype.getPostById = async function(postId) {
    return this.cachedRequest(`/posts/${postId}`, {}, { ttlMs: 5 * 60 * 1000 });
  };

  // Create a new post
  ApiClient.prototype.createPost = async function(data) {
    const response = await this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.invalidateCache(['/posts']);
    return response;
  };

  // Update an existing post
  ApiClient.prototype.updatePost = async function(postId, data) {
    const response = await this.request(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    this.invalidateCache(['/posts']);
    return response;
  };

  // Delete a post
  ApiClient.prototype.deletePost = async function(postId) {
    const response = await this.request(`/posts/${postId}`, {
      method: 'DELETE',
    });
    this.invalidateCache(['/posts']);
    return response;
  };

  // Publish a draft post
  ApiClient.prototype.publishPost = async function(postId) {
    const response = await this.request(`/posts/${postId}/publish`, {
      method: 'PUT',
    });
    this.invalidateCache(['/posts']);
    return response;
  };

  // Unpublish a published post
  ApiClient.prototype.unpublishPost = async function(postId) {
    const response = await this.request(`/posts/${postId}/unpublish`, {
      method: 'PUT',
    });
    this.invalidateCache(['/posts']);
    return response;
  };

  // Alias: getPost — used by second posts block in original file
  ApiClient.prototype.getPost = async function(id) {
    return this.cachedRequest(`/posts/${id}`, {}, { ttlMs: 5 * 60 * 1000 });
  };
}
