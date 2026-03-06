import { useState, useEffect } from 'react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { showError } from '../../../utils/errorHandler';
import { formatDateVN, getCurrentDateVN } from '../../../utils/dateUtils';
import './BackupPage.css';

export default function BackupPage() {
  const { success, error, toasts, removeToast } = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const response = await api.listBackups();
      if (response.success) {
        setBackups(response.data || []);
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const response = await api.createBackup();
      if (response.success) {
        success('Tạo backup thành công');
        loadBackups();
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestore = (backup) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận restore',
      message: `Bạn có chắc chắn muốn restore từ backup "${backup.key}"? Tất cả dữ liệu hiện tại sẽ bị ghi đè.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.restoreBackup(backup.key);
          if (response.success) {
            success('Restore backup thành công');
            loadBackups();
          }
        } catch (err) {
          showError(err, { error });
        }
      },
    });
  };

  const handleExportJSON = async () => {
    try {
      const response = await fetch(`${api.baseURL}/backup/export/json`, {
        headers: {
          'Authorization': `Bearer ${api.token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${getCurrentDateVN(true)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        success('Xuất JSON thành công');
      } else {
        throw new Error('Lỗi xuất JSON');
      }
    } catch (err) {
      showError(err, { error });
    }
  };

  const handleExportCSV = async (tableName) => {
    try {
      const response = await fetch(`${api.baseURL}/backup/export/csv/${tableName}`, {
        headers: {
          'Authorization': `Bearer ${api.token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}-${getCurrentDateVN(true)}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        success(`Xuất CSV ${tableName} thành công`);
      } else {
        throw new Error('Lỗi xuất CSV');
      }
    } catch (err) {
      showError(err, { error });
    }
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải danh sách backup..." />;
  }

  const tables = ['students', 'classes', 'registrations', 'payments', 'certificates', 'admins'];

  return (
    <div className="backup-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="page-header">
        <h1>💾 Sao lưu và Khôi phục</h1>
        <button
          onClick={handleCreateBackup}
          className="btn btn-primary"
          disabled={creatingBackup}
        >
          {creatingBackup ? 'Đang tạo...' : '➕ Tạo Backup'}
        </button>
      </div>

      <div className="backup-sections">
        <div className="backup-section">
          <h2>Xuất dữ liệu</h2>
          <div className="export-actions">
            <button onClick={handleExportJSON} className="btn btn-success">
              📥 Xuất JSON (Toàn bộ database)
            </button>
            <div className="csv-exports">
              <h3>Xuất CSV theo bảng:</h3>
              <div className="csv-buttons">
                {tables.map((table) => (
                  <button
                    key={table}
                    onClick={() => handleExportCSV(table)}
                    className="btn btn-sm btn-outline"
                  >
                    {table}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="backup-section">
          <h2>Danh sách Backup</h2>
          {backups.length === 0 ? (
            <div className="empty-state">
              <p>Chưa có backup nào</p>
            </div>
          ) : (
            <div className="backups-list">
              {backups.map((backup) => (
                <div key={backup.key} className="backup-item">
                  <div className="backup-info">
                    <h4>{backup.key.split('/').pop()}</h4>
                    <p>
                      Kích thước: {(backup.size / 1024).toFixed(2)} KB
                    </p>
                    <p>
                      Ngày tạo: {formatDateVN(backup.uploaded, true)}
                    </p>
                  </div>
                  <div className="backup-actions">
                    <button
                      onClick={() => handleRestore(backup)}
                      className="btn btn-warning"
                    >
                      🔄 Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={confirmDialog.onConfirm || (() => { })}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
}
