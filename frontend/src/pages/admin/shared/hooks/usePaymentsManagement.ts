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

export function usePaymentsManagement() {
  const cachedPayments = getAdminCache(ADMIN_CACHE_KEYS.payments, ADMIN_CACHE_TTL.payments);
  const cachedClasses = getAdminCache(ADMIN_CACHE_KEYS.paymentClasses, ADMIN_CACHE_TTL.classes);

  const [payments, setPayments] = useState(() => cachedPayments ?? []);
  const [classes, setClasses] = useState(() => cachedClasses ?? []);
  const [loading, setLoading] = useState(() => cachedPayments === null);
  const [error, setError] = useState(null);

  const loadPayments = async ({ force = false } = {}) => {
    const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.payments, ADMIN_CACHE_TTL.payments);
    if (cached !== null) {
      setPayments(cached);
      setLoading(false);
      return cached;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.getPayments(1000, 0);
      const data = Array.isArray(response.data) ? response.data : [];
      setPayments(data);
      setAdminCache(ADMIN_CACHE_KEYS.payments, data);
      return data;
    } catch (err) {
      setError(err.message);
      setPayments([]);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async ({ force = false } = {}) => {
    const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.paymentClasses, ADMIN_CACHE_TTL.classes);
    if (cached !== null) {
      setClasses(cached);
      return cached;
    }

    try {
      const response = await api.getClasses();
      const data = response.data || [];
      setClasses(data);
      setAdminCache(ADMIN_CACHE_KEYS.paymentClasses, data);
      return data;
    } catch (err) {
      setClasses([]);
    }
  };

  const confirmPayment = async (paymentId) => {
    try {
      await api.confirmPayment(paymentId);
      invalidateAdminData({
        keys: [
          ADMIN_CACHE_KEYS.payments,
          ADMIN_CACHE_KEYS.dashboardOverview,
          ADMIN_CACHE_KEYS.mobileDashboardOverview,
        ],
        source: 'payments-management',
      });
      await loadPayments({ force: true });
    } catch (err) {
      throw err;
    }
  };

  const rejectPayment = async (paymentId) => {
    try {
      await api.rejectPayment(paymentId);
      invalidateAdminData({
        keys: [
          ADMIN_CACHE_KEYS.payments,
          ADMIN_CACHE_KEYS.dashboardOverview,
          ADMIN_CACHE_KEYS.mobileDashboardOverview,
        ],
        source: 'payments-management',
      });
      await loadPayments({ force: true });
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
    void loadPayments();
    void loadClasses();
  }, []);

  useAdminAutoRefresh(async () => {
    await Promise.all([
      loadPayments({ force: true }),
      loadClasses({ force: true }),
    ]);
  }, { minIntervalMs: 12000 });

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






