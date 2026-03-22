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

const defaultClassFormState = {
  ten_lop: '',
  ma_lop: '',
  ngay_bat_dau: '',
  ngay_ket_thuc: '',
  lich_hoc: '',
  dia_diem: '',
  so_luong_hoc_vien_toi_da: '',
  hoc_phi: '',
  loai_lop: '',
  mo_ta: '',
  class_type: 'hoc',
  max_students: '',
  notes: '',
  open_at: '',
  close_at: '',
  status: 'open',
  isFreeContact: false,
  schedule_days: [],
  schedule_start_time: '',
  schedule_end_time: '',
  schedule_location: '',
};

export function useClassesManagement() {
  const cachedClasses = getAdminCache(ADMIN_CACHE_KEYS.classes, ADMIN_CACHE_TTL.classes);
  const [classes, setClasses] = useState(() => cachedClasses ?? []);
  const [loading, setLoading] = useState(() => cachedClasses === null);
  const [error, setError] = useState(null);

  const invalidateClassCaches = () => {
    invalidateAdminData({
      keys: [
        ADMIN_CACHE_KEYS.classes,
        ADMIN_CACHE_KEYS.paymentClasses,
        ADMIN_CACHE_KEYS.documentTargets,
        ADMIN_CACHE_KEYS.dashboardOverview,
        ADMIN_CACHE_KEYS.mobileDashboardOverview,
      ],
      source: 'classes-management',
    });
  };

  const loadClasses = async ({ force = false } = {}) => {
    const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.classes, ADMIN_CACHE_TTL.classes);
    if (cached !== null) {
      setClasses(cached);
      setLoading(false);
      return cached;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.getClasses();
      let data = [];
      if (response?.success && response.data) {
        data = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response?.data)) {
        data = response.data;
      } else if (Array.isArray(response)) {
        data = response;
      } else {
        data = [];
      }
      setClasses(data);
      setAdminCache(ADMIN_CACHE_KEYS.classes, data);
      return data;
    } catch (err) {
      console.error('Error loading classes:', err);
      setError(err.message);
      setClasses([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClasses();
  }, []);

  useAdminAutoRefresh(() => loadClasses({ force: true }), { minIntervalMs: 12000 });

  const createClass = async (classData) => {
    try {
      const response = await api.createClass(classData);
      if (response?.success || response?.id) {
        invalidateClassCaches();
        await loadClasses({ force: true });
        return response;
      }
      throw new Error(response?.message || 'Tạo lớp thất bại');
    } catch (err) {
      console.error('Error creating class:', err);
      throw err;
    }
  };

  const updateClass = async (id, classData) => {
    try {
      const response = await api.updateClass(id, classData);
      if (response?.success || response?.id) {
        invalidateClassCaches();
        await loadClasses({ force: true });
        return response;
      }
      throw new Error(response?.message || 'Cập nhật lớp thất bại');
    } catch (err) {
      console.error('Error updating class:', err);
      throw err;
    }
  };

  const deleteClass = async (id) => {
    try {
      const response = await api.deleteClass(id);
      if (response?.success !== false) {
        invalidateClassCaches();
        await loadClasses({ force: true });
        return response;
      }
      throw new Error(response?.message || 'Xóa lớp thất bại');
    } catch (err) {
      console.error('Error deleting class:', err);
      throw err;
    }
  };

  const filterClasses = (searchTerm = '', statusFilter = 'all') => {
    return classes.filter((cls) => {
      const matchesSearch =
        !searchTerm ||
        (cls.ten_lop || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cls.ma_lop || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus =
        statusFilter === 'all' ||
        (cls.status || 'open') === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const getStats = () => {
    const total = classes.length;
    const open = classes.filter((c) => (c.status || 'open') === 'open').length;
    const closed = classes.filter((c) => c.status === 'closed').length;
    const finished = classes.filter((c) => c.status === 'finished').length;
    const totalStudents = classes.reduce((sum, c) => sum + (c.current_students || c.total_students || 0), 0);
    
    return { total, open, closed, finished, totalStudents };
  };

  return {
    classes,
    loading,
    error,
    loadClasses,
    createClass,
    updateClass,
    deleteClass,
    filterClasses,
    getStats,
  };
}

export function useClassForm(initialData = null) {
  const [formData, setFormData] = useState({
    ...defaultClassFormState,
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultClassFormState,
        ...initialData,
      });
    }
  }, [initialData]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(defaultClassFormState);
  };

  const handleDateInput = (field) => (e) => {
    updateField(field, e.target.value);
  };

  const handleDateTimeInput = (field) => (e) => {
    updateField(field, e.target.value);
  };

  const toggleScheduleDay = (day) => {
    setFormData((prev) => {
      const days = prev.schedule_days || [];
      const newDays = days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day];
      return { ...prev, schedule_days: newDays };
    });
  };

  return {
    formData,
    updateField,
    resetForm,
    handleDateInput,
    handleDateTimeInput,
    toggleScheduleDay,
  };
}
