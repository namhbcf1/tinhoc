import { useState, useEffect } from 'react';
import api from '../../../../services/api';

export function usePaymentsManagement() {
  const [payments, setPayments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getPayments(1000, 0);
      const data = Array.isArray(response.data) ? response.data : [];
      setPayments(data);
    } catch (err) {
      setError(err.message);
      setPayments([]);
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

  const confirmPayment = async (paymentId) => {
    try {
      await api.confirmPayment(paymentId);
      await loadPayments();
    } catch (err) {
      throw err;
    }
  };

  const rejectPayment = async (paymentId) => {
    try {
      await api.rejectPayment(paymentId);
      await loadPayments();
    } catch (err) {
      throw err;
    }
  };

  const filterPayments = (searchTerm, statusFilter, classFilter) => {
    return payments.filter(p => {
      const matchesSearch = !searchTerm ||
        (p.student_name || p.ho_ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.class_name || p.ten_lop || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesClass = !classFilter || p.class_id === parseInt(classFilter);
      return matchesSearch && matchesStatus && matchesClass;
    });
  };

  const getStats = () => {
    const confirmed = payments.filter(p => p.status === 'confirmed' || p.status === 'paid');
    const pending = payments.filter(p => p.status === 'pending');
    const rejected = payments.filter(p => p.status === 'rejected');
    return {
      total: payments.reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, p) => s + (parseInt(p.amount) || 0), 0),
      confirmedCount: confirmed.length,
      confirmedAmount: confirmed.reduce((s, p) => s + (parseInt(p.amount) || 0), 0),
      rejectedCount: rejected.length,
    };
  };

  useEffect(() => {
    loadPayments();
    loadClasses();
  }, []);

  return {
    payments,
    classes,
    loading,
    error,
    loadPayments,
    loadClasses,
    confirmPayment,
    rejectPayment,
    filterPayments,
    getStats
  };
}






