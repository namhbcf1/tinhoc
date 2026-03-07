import { useState, useEffect } from 'react';
import api from '../../../../services/api';

export function useAssignmentsManagement() {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAssignments = async (classId = null) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/assignments?status=`;
      if (classId) url += `&class_id=${classId}`;
      const response = await api.request(url);
      const data = response?.data?.assignments || response?.data || response || [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setAssignments([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await api.getClasses();
      setClasses(response.data || []);
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
      await loadAssignments();
    } catch (err) {
      throw err;
    }
  };

  const updateAssignment = async (assignmentId, assignmentData) => {
    try {
      await api.updateAssignment(assignmentId, assignmentData);
      await loadAssignments();
    } catch (err) {
      throw err;
    }
  };

  const deleteAssignment = async (assignmentId) => {
    try {
      await api.deleteAssignment(assignmentId);
      await loadAssignments();
    } catch (err) {
      throw err;
    }
  };

  const getAssignmentSubmissions = async (assignmentId) => {
    try {
      const response = await api.getAssignmentSubmissions(assignmentId);
      return response?.data || response || [];
    } catch (err) {
      throw err;
    }
  };

  const filterAssignments = (searchTerm, statusFilter) => {
    return assignments.filter(a => {
      const matchesSearch = !searchTerm || a.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getStats = () => {
    return {
      total: assignments.length,
      active: assignments.filter(a => a.status === 'active').length,
      closed: assignments.filter(a => a.status === 'closed').length,
      draft: assignments.filter(a => a.status === 'draft').length,
    };
  };

  useEffect(() => {
    loadAssignments();
    loadClasses();
  }, []);

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






