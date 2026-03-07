import { useState, useEffect } from 'react';
import api from '../../../../services/api';

export function useTeachersManagement() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAllTeachers(100, 0);
      let data = [];
      if (Array.isArray(response)) data = response;
      else if (response?.data && Array.isArray(response.data)) data = response.data;
      setTeachers(data.filter(t => t && typeof t === 'object' && t.id !== undefined));
    } catch (err) {
      setError(err.message);
      setTeachers([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createTeacher = async (teacherData) => {
    try {
      if (!teacherData.teacher_code || !teacherData.ho || !teacherData.ten || !teacherData.email || !teacherData.sdt) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }
      if (!teacherData.password) {
        throw new Error('Vui lòng nhập mật khẩu');
      }
      await api.createTeacher(teacherData);
      await loadTeachers();
    } catch (err) {
      throw err;
    }
  };

  const updateTeacher = async (teacherId, teacherData) => {
    try {
      if (!teacherData.ho || !teacherData.ten || !teacherData.email || !teacherData.sdt) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }
      const updateData = { ...teacherData };
      if (!updateData.password) delete updateData.password;
      await api.updateTeacher(teacherId, updateData);
      await loadTeachers();
    } catch (err) {
      throw err;
    }
  };

  const deleteTeacher = async (teacherId) => {
    try {
      await api.updateTeacher(teacherId, { status: 'inactive' });
      await loadTeachers();
    } catch (err) {
      throw err;
    }
  };

  const toggleTeacherStatus = async (teacherId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await api.updateTeacher(teacherId, { status: newStatus });
      await loadTeachers();
    } catch (err) {
      throw err;
    }
  };

  const filterTeachers = (searchTerm, statusFilter) => {
    return teachers.filter(t => {
      const matchesSearch = !searchTerm || 
        t.ho_ten_full?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.teacher_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getStats = () => {
    return {
      total: teachers.length,
      active: teachers.filter(t => t.status === 'active').length,
      inactive: teachers.filter(t => t.status === 'inactive').length,
    };
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  return {
    teachers,
    loading,
    error,
    loadTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    toggleTeacherStatus,
    filterTeachers,
    getStats
  };
}






