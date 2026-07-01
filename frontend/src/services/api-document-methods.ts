// @ts-nocheck
// ========================================
// DOCUMENT METHODS MIXIN
// Document upload/download, folders, sharing, class documents
// ========================================

import { uploadToDocumentsEndpoint } from './api-document-upload-helper.js';

export function applyDocumentMethods(ApiClient) {
  // Upload a document for a student (admin)
  ApiClient.prototype.uploadDocument = async function(cccd, title, description, file) {
    const formData = new FormData();
    formData.append('cccd', cccd);
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('file', file);
    return uploadToDocumentsEndpoint(this.baseURL, this.getToken.bind(this), formData);
  };

  // Get all documents for a student by CCCD
  ApiClient.prototype.getDocumentsByCCCD = async function(cccd) {
    return this.request(`/documents/cccd/${cccd}`, { tokenType: 'student' });
  };

  // Get paginated list of all documents (admin)
  ApiClient.prototype.getAllDocuments = async function(limit = 100, offset = 0) {
    return this.request(`/documents?limit=${limit}&offset=${offset}`);
  };

  // Delete a document by ID
  ApiClient.prototype.deleteDocument = async function(docId) {
    return this.request(`/documents/${docId}`, { method: 'DELETE' });
  };

  // Upload document with fine-grained permission control
  ApiClient.prototype.uploadDocumentWithPermission = async function(data) {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('doc_type', data.doc_type);
    formData.append('access_type', data.access_type);
    if (data.folder_id) formData.append('folder_id', String(data.folder_id));
    if (data.visibility) formData.append('visibility', data.visibility);
    if (data.class_ids?.length) formData.append('class_ids', JSON.stringify(data.class_ids));
    if (data.online_class_ids?.length) formData.append('online_class_ids', JSON.stringify(data.online_class_ids));
    if (data.student_ids?.length) formData.append('student_ids', JSON.stringify(data.student_ids));
    if (data.cccd) formData.append('cccd', data.cccd);
    if (data.valid_from) formData.append('valid_from', data.valid_from);
    if (data.valid_until) formData.append('valid_until', data.valid_until);
    formData.append('file', data.file);
    return uploadToDocumentsEndpoint(this.baseURL, this.getToken.bind(this), formData);
  };

  // ---- Document Folders (Drive-like) ----

  ApiClient.prototype.getDocumentFolders = async function(scope = 'shared') {
    return this.request(`/document-folders?scope=${encodeURIComponent(scope)}`);
  };

  ApiClient.prototype.createDocumentFolder = async function(data) {
    return this.request('/document-folders', { method: 'POST', body: JSON.stringify(data) });
  };

  ApiClient.prototype.updateDocumentFolder = async function(id, data) {
    return this.request(`/document-folders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  };

  ApiClient.prototype.deleteDocumentFolder = async function(id) {
    return this.request(`/document-folders/${id}`, { method: 'DELETE' });
  };

  ApiClient.prototype.getDocumentsByFolder = async function(folderId) {
    return this.request(`/documents/by-folder/${folderId}`);
  };

  ApiClient.prototype.getDocumentShares = async function(docId) {
    return this.request(`/documents/${docId}/shares`);
  };

  ApiClient.prototype.shareDocument = async function(docId, targets) {
    return this.request(`/documents/${docId}/share`, {
      method: 'POST',
      body: JSON.stringify({ targets }),
    });
  };

  ApiClient.prototype.unshareDocument = async function(docId, type, id) {
    return this.request(`/documents/${docId}/unshare`, {
      method: 'POST',
      body: JSON.stringify({ type, id }),
    });
  };

  ApiClient.prototype.getSharedDocumentsForOnlineClass = async function(classId) {
    return this.request(`/documents/for/online-class/${classId}`);
  };

  ApiClient.prototype.getSharedDocumentsForOfflineClass = async function(classId) {
    return this.request(`/documents/for/offline-class/${classId}`);
  };

  // Upload document for a specific offline class (used in ClassDetailDashboard)
  // Duplicate definition removed — keeping first occurrence only
  ApiClient.prototype.uploadClassDocument = async function(classId, data) {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('class_id', classId);
    formData.append('access_type', 'class');
    formData.append('file', data.file);
    return uploadToDocumentsEndpoint(this.baseURL, this.getToken.bind(this), formData);
  };

  // Build download URL for a document (optionally scoped to a student)
  ApiClient.prototype.getDocumentDownloadUrl = function(docId, studentId = null) {
    let url = `${this.baseURL}/documents/${docId}/download`;
    if (studentId) url += `?student_id=${studentId}`;
    return url;
  };

  // Download a document and trigger browser save dialog
  ApiClient.prototype.downloadDocument = async function(docId, fileName, studentId = null) {
    let url = `${this.baseURL}/documents/${docId}/download`;
    if (studentId) url += `?student_id=${studentId}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Lỗi tải file');

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  // Get documents accessible to a student (filtered by their class memberships)
  ApiClient.prototype.getStudentDocuments = async function(studentId, classIds = []) {
    return this.request('/documents/student', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, class_ids: classIds }),
    });
  };

  ApiClient.prototype.getDocumentsByClass = async function(classId) {
    return this.request(`/documents/class/${classId}`);
  };

  ApiClient.prototype.getDocumentsByOnlineClass = async function(classId) {
    return this.request(`/documents/online-class/${classId}`);
  };

  // Upload document to a specific online class (admin only)
  ApiClient.prototype.uploadOnlineClassDocument = async function(classId, data) {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('file', data.file);
    formData.append('online_class_id', classId);
    return uploadToDocumentsEndpoint(this.baseURL, this.getToken.bind(this), formData);
  };
}
