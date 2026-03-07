// ========================================
// ERROR HANDLER UTILITY
// ========================================

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
  if (!error) {
    return 'Đã xảy ra lỗi không xác định';
  }

  // If error is a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If error has a message property
  if (error.message) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.';
    }
    
    // Timeout errors
    if (message.includes('timeout')) {
      return 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
    }
    
    // Authentication errors
    if (message.includes('401') || message.includes('unauthorized') || message.includes('chưa đăng nhập')) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    
    // Permission errors
    if (message.includes('403') || message.includes('forbidden') || message.includes('không có quyền')) {
      return 'Bạn không có quyền thực hiện hành động này.';
    }
    
    // Not found errors
    if (message.includes('404') || message.includes('not found') || message.includes('không tìm thấy')) {
      return 'Không tìm thấy dữ liệu yêu cầu.';
    }
    
    // Server errors
    if (message.includes('500') || message.includes('server error') || message.includes('lỗi server')) {
      return 'Lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
    }
    
    // Validation errors
    if (message.includes('validation') || message.includes('thiếu') || message.includes('invalid')) {
      return error.message;
    }
    
    // Return original message if no pattern matches
    return error.message;
  }

  // If error has an error property
  if (error.error) {
    return getErrorMessage(error.error);
  }

  // Default fallback
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

/**
 * Show error toast with user-friendly message
 */
export function showError(error, toast) {
  const message = getErrorMessage(error);
  if (toast && toast.error) {
    toast.error(message);
  } else {
    console.error('Error:', error);
    alert(message);
  }
}
