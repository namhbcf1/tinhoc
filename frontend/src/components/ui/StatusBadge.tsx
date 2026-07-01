// @ts-nocheck
/**
 * StatusBadge Component
 * Shared component for displaying status badges across Student and Admin interfaces
 */

export default function StatusBadge({ status, type = 'default' }) {
  // Payment status badges
  const paymentBadges = {
    pending: { text: '⏳ Chờ xử lý', class: 'badge-warning' },
    confirmed: { text: '✅ Đã xác nhận', class: 'badge-success' },
    paid: { text: '✅ Đã thanh toán', class: 'badge-success' },
    unpaid: { text: '❌ Chưa thanh toán', class: 'badge-danger' },
    rejected: { text: '❌ Đã từ chối', class: 'badge-danger' },
    refunded: { text: '↩️ Đã hoàn tiền', class: 'badge-info' },
  };

  // Registration status badges
  const registrationBadges = {
    pending: { text: '⏳ Chờ duyệt', class: 'badge-warning' },
    approved: { text: '✅ Đã duyệt', class: 'badge-success' },
    rejected: { text: '❌ Đã từ chối', class: 'badge-danger' },
    studying: { text: '📚 Đang học', class: 'badge-info' },
    completed: { text: '✅ Hoàn thành', class: 'badge-success' },
    certified: { text: '🎓 Đã cấp chứng chỉ', class: 'badge-success' },
  };

  // Class status badges
  const classBadges = {
    upcoming: { text: '🕐 Sắp khai giảng', class: 'badge-info' },
    ongoing: { text: '📚 Đang học', class: 'badge-primary' },
    completed: { text: '✅ Hoàn thành', class: 'badge-success' },
    cancelled: { text: '❌ Đã hủy', class: 'badge-danger' },
  };

  // Post status badges
  const postBadges = {
    draft: { text: '📝 Nháp', class: 'badge-warning' },
    published: { text: '✅ Đã đăng', class: 'badge-success' },
    archived: { text: '📦 Lưu trữ', class: 'badge-secondary' },
  };

  // Certificate status badges
  const certificateBadges = {
    active: { text: '✅ Có hiệu lực', class: 'badge-success' },
    issued: { text: '✅ Đã cấp', class: 'badge-success' },
    revoked: { text: '❌ Đã thu hồi', class: 'badge-danger' },
  };

  // Document access badges
  const accessBadges = {
    public: { text: '🔓 Công khai', class: 'badge-info' },
    class: { text: '👥 Theo lớp', class: 'badge-primary' },
    student: { text: '👤 Cá nhân', class: 'badge-warning' },
    admin: { text: '🛡️ Admin', class: 'badge-danger' },
  };

  // Select appropriate badge set
  let badges;
  switch (type) {
    case 'payment':
      badges = paymentBadges;
      break;
    case 'registration':
      badges = registrationBadges;
      break;
    case 'class':
      badges = classBadges;
      break;
    case 'post':
      badges = postBadges;
      break;
    case 'certificate':
      badges = certificateBadges;
      break;
    case 'access':
      badges = accessBadges;
      break;
    default:
      badges = {};
  }

  const badge = badges[status] || { text: status, class: 'badge-secondary' };

  return <span className={`badge ${badge.class}`}>{badge.text}</span>;
}
