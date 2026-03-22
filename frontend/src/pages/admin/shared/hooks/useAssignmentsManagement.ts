import { useState, useEffect } from 'react';
import api from '../../../../services/api';
import {
  ADMIN_CACHE_KEYS,
  ADMIN_CACHE_TTL,
  getAdminCache,
  invalidateAdminData,
  setAdminCache,
} from '../admin-cache';
import { useAdminAutoRefresh } from '../useAdminAutoRefresh';

export function useAssignmentsManagement() {
  const cachedAssignments = getAdminCache(ADMIN_CACHE_KEYS.assignments, ADMIN_CACHE_TTL.assignments);
  const cachedClasses = getAdminCache(ADMIN_CACHE_KEYS.assignmentClasses, ADMIN_CACHE_TTL.classes);

  const [assignments, setAssignments] = useState(() => cachedAssignments ?? []);
  const [classes, setClasses] = useState(() => cachedClasses ?? []);
  const [loading, setLoading] = useState(() => cachedAssignments === null);
  const [error, setError] = useState(null);

  const normalizeOnlineClasses = (payload) => {
    const rows = Array.isArray(payload?.data?.classes)
      ? payload.data.classes
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

    return rows.map((item) => ({
      ...item,
      ten_lop: item.ten_lop || item.class_name || '',
      ma_lop: item.ma_lop || item.class_code || '',
    }));
  };

  const loadAssignments = async ({ classId = null, force = false } = {}) => {
    const cacheKey = classId ? `${ADMIN_CACHE_KEYS.assignments}:${classId}` : ADMIN_CACHE_KEYS.assignments;
    const cached = force ? null : getAdminCache(cacheKey, ADMIN_CACHE_TTL.assignments);
    if (cached !== null) {
      setAssignments(cached);
      setLoading(false);
      return cached;
    }

    setLoading(true);
    setError(null);
    try {
      let url = `/assignments?status=`;
      if (classId) url += `&class_id=${classId}`;
      const response = await api.request(url);
      const data = response?.data?.assignments || response?.data || response || [];
      const normalized = Array.isArray(data) ? data : [];
      setAssignments(normalized);
      setAdminCache(cacheKey, normalized);
      return normalized;
    } catch (err) {
      setError(err.message);
      setAssignments([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async ({ force = false } = {}) => {
    const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.assignmentClasses, ADMIN_CACHE_TTL.classes);
    if (cached !== null) {
      setClasses(cached);
      return cached;
    }

    try {
      const response = await api.getOnlineClasses(1000, 0);
      const data = normalizeOnlineClasses(response);
      setClasses(data);
      setAdminCache(ADMIN_CACHE_KEYS.assignmentClasses, data);
      return data;
    } catch (err) {
      setClasses([]);
    }
  };

  const createAssignment = async (assignmentData) => {
    try {
      if (!assignmentData.title || !assignmentData.class_id) {
        throw new Error('Vui lòng nhập tiêu đề và chọn lớp');
      }
      await api.createAssignment(assignmentData);
      invalidateAdminData({
        prefixes: [ADMIN_CACHE_KEYS.assignments],
        source: 'assignments-management',
      });
      await loadAssignments({ force: true });
    } catch (err) {
      throw err;
    }
  };

  const updateAssignment = async (assignmentId, assignmentData) => {
    try {
      await api.updateAssignment(assignmentId, assignmentData);
      invalidateAdminData({
        prefixes: [ADMIN_CACHE_KEYS.assignments],
        source: 'assignments-management',
      });
      await loadAssignments({ force: true });
    } catch (err) {
      throw err;
    }
  };

  const deleteAssignment = async (assignmentId) => {
    try {
      await api.deleteAssignment(assignmentId);
      invalidateAdminData({
        prefixes: [ADMIN_CACHE_KEYS.assignments],
        source: 'assignments-management',
      });
      await loadAssignments({ force: true });
    } catch (err) {
      throw err;
    }
  };

  const getAssignmentSubmissions = async (assignmentId) => {
    try {
      const response = await api.getAssignmentSubmissions(assignmentId);
      return Array.isArray(response?.data?.submissions)
        ? response.data.submissions
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];
    } catch (err) {
      throw err;
    }
  };

  const filterAssignments = (searchTerm, statusFilter) => {
    return assignments.filter(a => {
      const matchesSearch = !searchTerm || a.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        !statusFilter ||
        a.status === statusFilter ||
        (statusFilter === 'active' && a.status === 'open');
      return matchesSearch && matchesStatus;
    });
  };

  const getStats = () => {
    return {
      total: assignments.length,
      active: assignments.filter(a => a.status === 'active' || a.status === 'open').length,
      closed: assignments.filter(a => a.status === 'closed').length,
      draft: assignments.filter(a => a.status === 'draft').length,
    };
  };

  useEffect(() => {
    void loadAssignments();
    void loadClasses();
  }, []);

  useAdminAutoRefresh(async () => {
    await Promise.all([
      loadAssignments({ force: true }),
      loadClasses({ force: true }),
    ]);
  }, { minIntervalMs: 12000 });

  return {
    assignments,
    classes,
    loading,
    error,
    loadAssignments,
    loadClasses,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    getAssignmentSubmissions,
    filterAssignments,
    getStats
  };
}






