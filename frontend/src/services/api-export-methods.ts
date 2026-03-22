// ========================================
// EXPORT METHODS MIXIN
// Excel exports, exam exports, templates, database backup
// ========================================

export function applyExportMethods(ApiClient) {
  // Build export URL for a class (used to open in new tab or anchor href)
  ApiClient.prototype.getExportUrl = function(classId) {
    return `${this.baseURL}/export/class/${classId}`;
  };

  // Download class registration list as Excel file
  ApiClient.prototype.downloadExcel = async function(classId) {
    const url = this.getExportUrl(classId);

    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error('Lỗi tải file Excel');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `danh-sach-lop-${classId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  // Download exam result list as Excel file
  ApiClient.prototype.downloadExamExcel = async function(examId) {
    const url = `${this.baseURL}/export/exam/${examId}`;

    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error('Lỗi tải file Excel');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `danh-sach-thi-${examId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  // Get available Excel templates
  ApiClient.prototype.getTemplates = async function() {
    return this.request('/templates');
  };

  // ---- Backup ----

  // Export entire database as JSON
  ApiClient.prototype.exportDatabaseJSON = async function() {
    return this.request('/backup/export/json');
  };

  // Export a specific table as CSV
  ApiClient.prototype.exportTableCSV = async function(tableName) {
    return this.request(`/backup/export/csv/${tableName}`);
  };

  // Create a full database backup
  ApiClient.prototype.createBackup = async function() {
    return this.request('/backup/create', {
      method: 'POST',
    });
  };

  // List available backups
  ApiClient.prototype.listBackups = async function() {
    return this.request('/backup/list');
  };

  // Restore from a specific backup key
  ApiClient.prototype.restoreBackup = async function(backupKey) {
    return this.request(`/backup/restore/${encodeURIComponent(backupKey)}`, {
      method: 'POST',
    });
  };
}
