// ========================================
// MESSAGING METHODS MIXIN
// Conversations + messages + unread count
// ========================================

export function applyMessagingMethods(ApiClient) {
  // Get all conversations for current user
  ApiClient.prototype.getConversations = async function() {
    return this.request('/messaging/conversations');
  };

  // Create a new conversation
  ApiClient.prototype.createConversation = async function(data) {
    return this.request('/messaging/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Get messages in a conversation (paginated)
  ApiClient.prototype.getMessages = async function(conversationId, limit = 100, offset = 0) {
    return this.request(`/messaging/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`);
  };

  // Send a message in a conversation
  ApiClient.prototype.sendMessage = async function(conversationId, message) {
    return this.request(`/messaging/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  };

  // Get total unread message count for current user
  ApiClient.prototype.getUnreadMessageCount = async function() {
    return this.request('/messaging/unread-count');
  };
}
