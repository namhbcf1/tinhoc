/**
 * Web Analysis Agent System
 * Hệ thống 10 agent phân tích trang web vantrangedu.com
 * 
 * Cách sử dụng:
 *   node agents/orchestrator.js
 * 
 * Hoặc chạy từng agent:
 *   node agents/01-ux-ui-agent.js
 */

export const AGENTS = [
  {
    id: '01-ux-ui',
    name: 'UX/UI Analysis Agent',
    description: 'Phân tích trải nghiệm người dùng và giao diện',
    color: '#3B82F6'
  },
  {
    id: '02-accessibility',
    name: 'Accessibility (a11y) Agent',
    description: 'Phân tích khả năng tiếp cận cho người khuyết tật',
    color: '#8B5CF6'
  },
  {
    id: '03-performance',
    name: 'Performance Agent',
    description: 'Phân tích hiệu năng và tốc độ tải trang',
    color: '#10B981'
  },
  {
    id: '04-security',
    name: 'Security Agent',
    description: 'Phân tích bảo mật và lỗ hổng',
    color: '#EF4444'
  },
  {
    id: '05-seo',
    name: 'SEO Agent',
    description: 'Phân tích tối ưu hóa công cụ tìm kiếm',
    color: '#F59E0B'
  },
  {
    id: '06-mobile',
    name: 'Mobile Experience Agent',
    description: 'Phân tích trải nghiệm di động',
    color: '#EC4899'
  },
  {
    id: '07-content',
    name: 'Content & Copywriting Agent',
    description: 'Phân tích nội dung và chất lượng copy',
    color: '#06B6D4'
  },
  {
    id: '08-admin',
    name: 'Admin/Management UX Agent',
    description: 'Phân tích trải nghiệm quản lý admin',
    color: '#84CC16'
  },
  {
    id: '09-conversion',
    name: 'Conversion Optimization Agent',
    description: 'Phân tích tối đa chuyển đổi',
    color: '#F97316'
  },
  {
    id: '10-tech-debt',
    name: 'Technical Debt Agent',
    description: 'Phân tích kỹ thuật và chất lượng code',
    color: '#6366F1'
  }
];

export const TARGET_URL = 'https://vantrangedu.com';

