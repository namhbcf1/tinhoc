// ========================================
// PAYMENT METHODS MIXIN
// Payment listing, confirmation, rejection, creation
// ========================================

export function applyPaymentMethods(ApiClient) {
  // Get payments with optional filters
  ApiClient.prototype.getPayments = async function(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.cachedRequest(`/payments?${query}`, {}, { ttlMs: 3 * 60 * 1000 });
  };

  // Get payment statistics summary
  ApiClient.prototype.getPaymentStats = async function() {
    return this.cachedRequest('/payments/stats', {}, { ttlMs: 5 * 60 * 1000 });
  };

  // Confirm (approve) a payment
  ApiClient.prototype.confirmPayment = async function(paymentId) {
    const response = await this.request(`/payments/${paymentId}/confirm`, {
      method: 'PUT',
    });
    this.invalidateCache(['/payments', '/reports/payments', '/reports/summary']);
    return response;
  };

  // Reject a payment with a reason
  ApiClient.prototype.rejectPayment = async function(paymentId, reason) {
    const response = await this.request(`/payments/${paymentId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
    this.invalidateCache(['/payments', '/reports/payments', '/reports/summary']);
    return response;
  };

  // Create a new payment record
  ApiClient.prototype.createPayment = async function(data) {
    const response = await this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.invalidateCache(['/payments', '/reports/payments', '/reports/summary']);
    return response;
  };

  // Get payments linked to a specific registration (student-only endpoint)
  ApiClient.prototype.getPaymentsByRegistration = async function(registrationId) {
    // Student-only endpoint. If no token (or invalid), don't spam 401s.
    const studentToken = this.getToken('student');
    if (!studentToken) {
      return { success: true, data: [] };
    }

    try {
      return await this.request(`/payments/registration/${registrationId}`, { tokenType: 'student' });
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        this.setToken(null, 'student');
        return { success: true, data: [] };
      }
      throw err;
    }
  };
}
