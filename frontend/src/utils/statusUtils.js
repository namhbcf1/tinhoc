/**
 * Standardized status configurations for the application.
 * Ensures badges and labels look consistent everywhere.
 */

export const CLASS_STATUS_CONFIG = {
    studying: { label: 'Đang học', cls: 'bg-blue-50 text-blue-700 border-blue-200', isActive: true },
    approved: { label: 'Đã duyệt', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', isActive: true },
    completed: { label: 'Hoàn thành', cls: 'bg-purple-50 text-purple-700 border-purple-200', isActive: false },
    certified: { label: 'Có chứng chỉ', cls: 'bg-amber-50 text-amber-700 border-amber-200', isActive: false },
    pending: { label: 'Chờ duyệt', cls: 'bg-orange-50 text-orange-700 border-orange-200', isActive: false },
};

/**
 * Get configuration for a class status
 */
export const getClassStatus = (status) => {
    return CLASS_STATUS_CONFIG[status] || { label: status || 'Chờ duyệt', cls: 'bg-slate-50 text-slate-600 border-slate-200', isActive: false };
};
