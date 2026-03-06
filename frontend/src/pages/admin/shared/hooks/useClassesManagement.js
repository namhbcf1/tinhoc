import { useState, useEffect } from 'react';
import api from '../../../../services/api';

export function useClassesManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadClasses = async () => {
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
    loadClasses();
  }, []);

  const createClass = async (classData) => {
    try {
      const response = await api.createClass(classData);
      if (response?.success || response?.id) {
        await loadClasses();
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
        await loadClasses();
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
        await loadClasses();
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
    schedule_days: [],
    schedule_start_time: '',
    schedule_end_time: '',
    schedule_location: '',
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
    }
  }, [initialData]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
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
      schedule_days: [],
      schedule_start_time: '',
      schedule_end_time: '',
      schedule_location: '',
    });
  };

  const handleDateInput = (field, value) => {
    updateField(field, value);
  };

  const handleDateTimeInput = (field, value) => {
    updateField(field, value);
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
