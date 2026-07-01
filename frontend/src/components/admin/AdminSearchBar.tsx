import React from 'react';
import { Search } from 'lucide-react';
import '../../styles/admin/AdminDashboard.css';

interface AdminSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  actions?: React.ReactNode;
}

/**
 * AdminSearchBar — matches .search-bar design from AdminDashboard.css
 */
export default function AdminSearchBar({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  actions,
}: AdminSearchBarProps) {
  return (
    <div className="search-bar">
      <Search size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {actions}
    </div>
  );
}
