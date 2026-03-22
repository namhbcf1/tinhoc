import { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';
import {
  ADMIN_CACHE_KEYS,
  ADMIN_CACHE_TTL,
  getAdminCache,
  invalidateAdminData,
  setAdminCache,
} from '../admin-cache';
import { useAdminAutoRefresh } from '../useAdminAutoRefresh';

const FILE_COLORS = {
  pdf: '#DC2626',
  doc: '#2563EB', docx: '#2563EB',
  xls: '#059669', xlsx: '#059669',
  ppt: '#D97706', pptx: '#D97706',
  jpg: '#DB2777', jpeg: '#DB2777', png: '#DB2777', gif: '#DB2777',
  mp4: '#7C3AED', mov: '#7C3AED', webm: '#7C3AED',
  zip: '#64748B', rar: '#64748B',
};

export function useDocumentsManagement() {
  const cachedDocuments = getAdminCache(ADMIN_CACHE_KEYS.documents, ADMIN_CACHE_TTL.documents);
  const cachedTargets = getAdminCache(ADMIN_CACHE_KEYS.documentTargets, ADMIN_CACHE_TTL.documentMeta);
  const cachedFolders = getAdminCache(ADMIN_CACHE_KEYS.documentFolders, ADMIN_CACHE_TTL.documentMeta);

  const [documents, setDocuments] = useState(() => cachedDocuments ?? []);
  const [offlineClasses, setOfflineClasses] = useState(() => cachedTargets?.offlineClasses ?? []);
  const [onlineClasses, setOnlineClasses] = useState(() => cachedTargets?.onlineClasses ?? []);
  const [examSchedules, setExamSchedules] = useState(() => cachedTargets?.examSchedules ?? []);
  const [folders, setFolders] = useState(() => cachedFolders ?? []);
  const [loading, setLoading] = useState(() => cachedDocuments === null);
  const [error, setError] = useState(null);

  const normalizeClassRows = (payload, aliases = {}) => {
    const rows = Array.isArray(payload?.data?.classes)
      ? payload.data.classes
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

    return rows.map((item) => ({
      ...item,
      ten_lop: item.ten_lop || item.class_name || aliases.ten_lop || '',
      ma_lop: item.ma_lop || item.class_code || aliases.ma_lop || '',
    }));
  };

  const loadDocuments = async ({ force = false } = {}) => {
    const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.documents, ADMIN_CACHE_TTL.documents);
    if (cached !== null) {
      setDocuments(cached);
      setLoading(false);
      return cached;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.getAllDocuments();
      const docs = response.success && response.data ? response.data : (response.data || []);
      const normalized = Array.isArray(docs) ? docs : [];
      setDocuments(normalized);
      setAdminCache(ADMIN_CACHE_KEYS.documents, normalized);
      return normalized;
    } catch (err) {
      setError(err.message);
      setDocuments([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadAllClasses = async ({ force = false } = {}) => {
    const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.documentTargets, ADMIN_CACHE_TTL.documentMeta);
    if (cached !== null) {
      setOfflineClasses(cached.offlineClasses || []);
      setOnlineClasses(cached.onlineClasses || []);
      setExamSchedules(cached.examSchedules || []);
      return cached;
    }

    try {
      const offlineRes = await api.getClasses();
      const nextOfflineClasses = normalizeClassRows(offlineRes);
      setOfflineClasses(nextOfflineClasses);

      let nextOnlineClasses = [];
      try {
        const onlineRes = await api.getOnlineClasses(1000, 0);
        nextOnlineClasses = normalizeClassRows(onlineRes);
        setOnlineClasses(nextOnlineClasses);
      } catch { 
        setOnlineClasses([]); 
      }

      let nextExamSchedules = [];
      try {
        const examRes = await api.request('/exam-schedules');
        nextExamSchedules = Array.isArray(examRes?.data) ? examRes.data : [];
        setExamSchedules(nextExamSchedules);
      } catch { 
        setExamSchedules([]); 
      }

      const payload = {
        offlineClasses: nextOfflineClasses,
        onlineClasses: nextOnlineClasses,
        examSchedules: nextExamSchedules,
      };
      setAdminCache(ADMIN_CACHE_KEYS.documentTargets, payload);
      return payload;
    } catch (err) {
      console.error('Load classes error:', err);
    }
  };

  const loadFolders = async ({ force = false } = {}) => {
    const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.documentFolders, ADMIN_CACHE_TTL.documentMeta);
    if (cached !== null) {
      setFolders(cached);
      return cached;
    }

    try {
      const res = await api.getDocumentFolders('shared');
      const nextFolders = res.data || res.results || res || [];
      setFolders(nextFolders);
      setAdminCache(ADMIN_CACHE_KEYS.documentFolders, nextFolders);
      return nextFolders;
    } catch { 
      setFolders([]); 
    }
  };

  const uploadDocument = async (uploadData) => {
    try {
      if (!uploadData.title || !uploadData.file) {
        throw new Error('Vui lòng nhập tên và chọn file');
      }

      if (uploadData.access_type === 'class') {
        const totalSelected = uploadData.class_ids.length + uploadData.online_class_ids.length + uploadData.exam_ids.length;
        if (totalSelected === 0) {
          throw new Error('Vui lòng chọn ít nhất 1 lớp/lịch thi');
        }
        if (uploadData.exam_ids.length > 0) {
          throw new Error('Phân quyền tài liệu theo lịch thi chưa được hỗ trợ');
        }
      }

      await api.uploadDocumentWithPermission({
        ...uploadData,
        doc_type: 'general',
        visibility: 'internal',
      });

      invalidateAdminData({
        keys: [ADMIN_CACHE_KEYS.documents],
        source: 'documents-management',
      });
      await loadDocuments({ force: true });
    } catch (err) {
      throw err;
    }
  };

  const deleteDocument = async (docId) => {
    try {
      await api.deleteDocument(docId);
      invalidateAdminData({
        keys: [ADMIN_CACHE_KEYS.documents],
        source: 'documents-management',
      });
      await loadDocuments({ force: true });
    } catch (err) {
      throw err;
    }
  };

  const shareDocument = async (docId, shareTargets) => {
    try {
      if (!shareTargets || shareTargets.length === 0) {
        throw new Error('Chọn ít nhất 1 lớp');
      }
      await api.shareDocument(docId, shareTargets);
      invalidateAdminData({
        keys: [ADMIN_CACHE_KEYS.documents],
        source: 'documents-management',
      });
      await loadDocuments({ force: true });
    } catch (err) {
      throw err;
    }
  };

  const createFolder = async (name) => {
    try {
      if (!name || !name.trim()) {
        throw new Error('Vui lòng nhập tên folder');
      }
      await api.createDocumentFolder({ name: name.trim(), scope: 'shared' });
      invalidateAdminData({
        keys: [ADMIN_CACHE_KEYS.documentFolders],
        source: 'documents-management',
      });
      await loadFolders({ force: true });
    } catch (err) {
      throw err;
    }
  };

  const filterDocuments = (searchTerm, accessType) => {
    return documents.filter(doc => {
      const matchesAccess = !accessType || accessType === 'all' || doc.access_type === accessType;
      if (!matchesAccess) return false;

      if (!searchTerm || !searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        doc.title?.toLowerCase().includes(term) ||
        doc.file_name?.toLowerCase().includes(term) ||
        doc.description?.toLowerCase().includes(term)
      );
    });
  };

  const getStats = () => {
    return {
      all: documents.length,
      public: documents.filter(d => d.access_type === 'public').length,
      class: documents.filter(d => d.access_type === 'class').length,
      student: documents.filter(d => d.access_type === 'student').length,
      admin: documents.filter(d => d.access_type === 'admin').length,
    };
  };

  useEffect(() => {
    void loadDocuments();
    void loadAllClasses();
    void loadFolders();
  }, []);

  useAdminAutoRefresh(async () => {
    await Promise.all([
      loadDocuments({ force: true }),
      loadAllClasses({ force: true }),
      loadFolders({ force: true }),
    ]);
  }, { minIntervalMs: 12000 });

  return {
    documents,
    offlineClasses,
    onlineClasses,
    examSchedules,
    folders,
    loading,
    error,
    loadDocuments,
    loadAllClasses,
    loadFolders,
    uploadDocument,
    deleteDocument,
    shareDocument,
    createFolder,
    filterDocuments,
    getStats
  };
}

export function getFileExt(fileName) {
  return fileName?.split('.').pop()?.toLowerCase() || '';
}

export function getFileColor(fileName) {
  return FILE_COLORS[getFileExt(fileName)] || '#64748B';
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getAccessBadgeConfig(type) {
  const map = {
    public: { color: '#059669', bg: '#D1FAE5', label: 'Công khai', icon: 'Globe' },
    class: { color: '#2563EB', bg: '#DBEAFE', label: 'Theo lớp', icon: 'Users' },
    student: { color: '#D97706', bg: '#FEF3C7', label: 'Cá nhân', icon: 'User' },
    admin: { color: '#DC2626', bg: '#FEE2E2', label: 'Admin', icon: 'Shield' },
  };
  return map[type] || { color: '#64748B', bg: '#F1F5F9', label: type, icon: 'File' };
}






