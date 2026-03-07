// ========================================
// POST METHODS MIXIN
// Blog/news post CRUD + publish/unpublish
// Note: duplicate getPosts (lines ~1012 and ~1625 in original) — keeping FIRST definition only
// ========================================

export function applyPostMethods(ApiClient) {
  // Get posts with optional filters (first definition kept, duplicate removed)
  ApiClient.prototype.getPosts = async function(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/posts?${query}`);
  };

  // Get a single post by ID
  ApiClient.prototype.getPostById = async function(postId) {
    return this.request(`/posts/${postId}`);
  };

  // Create a new post
  ApiClient.prototype.createPost = async function(data) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Update an existing post
  ApiClient.prototype.updatePost = async function(postId, data) {
    return this.request(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  // Delete a post
  ApiClient.prototype.deletePost = async function(postId) {
    return this.request(`/posts/${postId}`, {
      method: 'DELETE',
    });
  };

  // Publish a draft post
  ApiClient.prototype.publishPost = async function(postId) {
    return this.request(`/posts/${postId}/publish`, {
      method: 'PUT',
    });
  };

  // Unpublish a published post
  ApiClient.prototype.unpublishPost = async function(postId) {
    return this.request(`/posts/${postId}/unpublish`, {
      method: 'PUT',
    });
  };

  // Alias: getPost — used by second posts block in original file
  ApiClient.prototype.getPost = async function(id) {
    return this.request(`/posts/${id}`);
  };
}
