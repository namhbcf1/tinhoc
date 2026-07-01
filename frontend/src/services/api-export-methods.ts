// @ts-nocheck
// ========================================
// EXPORT METHODS MIXIN
// Excel exports, exam exports, templates, database backup
// ========================================

export function applyExportMethods(ApiClient) {
  const sanitizeDownloadFilename = (filename) => {
    if (!filename) return '';
    return String(filename)
      .replace(/^["']|["']$/g, '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getFilenameFromContentDisposition = (contentDisposition) => {
    if (!contentDisposition) return '';

    const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return sanitizeDownloadFilename(decodeURIComponent(utf8Match[1]));
      } catch {
        return sanitizeDownloadFilename(utf8Match[1]);
      }
    }

    const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
    if (quotedMatch?.[1]) return sanitizeDownloadFilename(quotedMatch[1]);

    const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
    if (plainMatch?.[1]) return sanitizeDownloadFilename(plainMatch[1]);

    return '';
  };

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
    const contentDisposition = response.headers.get('content-disposition') || '';
    const serverFilename = getFilenameFromContentDisposition(contentDisposition);
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = serverFilename || `danh-sach-lop-${classId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  // Download filtered students as Excel file
  ApiClient.prototype.downloadStudentsExcel = async function(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params.set(key, String(value));
    });
    const url = `${this.baseURL}/export/students${params.toString() ? `?${params.toString()}` : ''}`;

    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error('Lỗi tải file Excel học viên');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const serverFilename = getFilenameFromContentDisposition(contentDisposition);
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = serverFilename || 'danh-sach-hoc-vien.xlsx';
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
    const contentDisposition = response.headers.get('content-disposition') || '';
    const serverFilename = getFilenameFromContentDisposition(contentDisposition);
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = serverFilename || `danh-sach-thi-${examId}.xlsx`;
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
