import React from 'react';
import '../../styles/admin/AdminDashboard.css';

interface Column<T = Record<string, any>> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface AdminDataTableProps<T = Record<string, any>> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  emptyMessage?: string;
  loading?: boolean;
  headerActions?: React.ReactNode;
}

/**
 * AdminDataTable — matches .table-container / table design from AdminDashboard.css
 */
export default function AdminDataTable<T extends Record<string, any>>({
  columns,
  data,
  title,
  emptyMessage = 'Không có dữ liệu',
  loading = false,
  headerActions,
}: AdminDataTableProps<T>) {
  return (
    <div className="table-container">
      {title && (
        <div className="table-header">
          <h3>{title}</h3>
          {headerActions && <div className="header-actions">{headerActions}</div>}
        </div>
      )}

      {loading ? (
        <div className="loading">Đang tải dữ liệu...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={(row as any).id ?? idx}>
                  {columns.map((col) => (
                    <td key={col.key} style={col.width ? { width: col.width } : undefined}>
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export type { Column };
