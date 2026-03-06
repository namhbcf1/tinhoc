// ========================================
// PAYMENT METHODS MIXIN
// Payment listing, confirmation, rejection, creation
// ========================================

export function applyPaymentMethods(ApiClient) {
  // Get payments with optional filters
  ApiClient.prototype.getPayments = async function(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/payments?${query}`);
  };

  // Get payment statistics summary
  ApiClient.prototype.getPaymentStats = async function() {
    return this.request('/payments/stats');
  };

  // Confirm (approve) a payment
  ApiClient.prototype.confirmPayment = async function(paymentId) {
    return this.request(`/payments/${paymentId}/confirm`, {
      method: 'PUT',
    });
  };

  // Reject a payment with a reason
  ApiClient.prototype.rejectPayment = async function(paymentId, reason) {
    return this.request(`/payments/${paymentId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  };

  // Create a new payment record
  ApiClient.prototype.createPayment = async function(data) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
