import { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';

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
  const [documents, setDocuments] = useState([]);
  const [offlineClasses, setOfflineClasses] = useState([]);
  const [onlineClasses, setOnlineClasses] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAllDocuments();
      const docs = response.success && response.data ? response.data : (response.data || []);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      setError(err.message);
      setDocuments([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadAllClasses = async () => {
    try {
      const offlineRes = await api.getClasses();
      setOfflineClasses(offlineRes.data || []);

      try {
        const onlineRes = await api.request('/online-classes');
        setOnlineClasses(onlineRes.data || []);
      } catch { 
        setOnlineClasses([]); 
      }

      try {
        const examRes = await api.request('/exam-schedules');
        setExamSchedules(examRes.data || []);
      } catch { 
        setExamSchedules([]); 
      }
    } catch (err) {
      console.error('Load classes error:', err);
    }
  };

  const loadFolders = async () => {
    try {
      const res = await api.getDocumentFolders('shared');
      setFolders(res.data || res.results || res || []);
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
      }

      const allClassIds = [...uploadData.class_ids];
      
      await api.uploadDocumentWithPermission({
        ...uploadData,
        class_ids: allClassIds,
        doc_type: 'general',
        visibility: 'internal',
      });

      await loadDocuments();
    } catch (err) {
      throw err;
    }
  };

  const deleteDocument = async (docId) => {
    try {
      await api.deleteDocument(docId);
      await loadDocuments();
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
      await loadDocuments();
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
      await loadFolders();
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
    loadDocuments();
    loadAllClasses();
    loadFolders();
  }, []);

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






