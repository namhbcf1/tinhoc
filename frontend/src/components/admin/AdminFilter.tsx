import React from 'react';
import '../../styles/admin/AdminDashboard.css';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  value?: string;
}

interface AdminFilterProps {
  filters: FilterGroup[];
}

/**
 * AdminFilter — matches .filters-section / .filter-group design from AdminDashboard.css
 */
export default function AdminFilter({ filters }: AdminFilterProps) {
  return (
    <div className="filters-section">
      {filters.map((filter) => (
        <div key={filter.key} className="filter-group">
          <label>{filter.label}</label>
          <select
            className="filter-select"
            value={filter.value || ''}
            onChange={(e) => filter.onChange(e.target.value)}
          >
            <option value="">Tất cả</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export type { FilterOption, FilterGroup };
