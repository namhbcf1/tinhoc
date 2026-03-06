import React, { useState, useEffect } from 'react';
import { Users, BookOpen, CreditCard, Award, TrendingUp, Loader, BarChart2 } from 'lucide-react';
import api from '../../../services/api';

// Stat card for desktop overview dashboard
const StatCard = ({ icon: Icon, label, value, color, subLabel }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className={`p-3 rounded-xl ${color}`}>
            <Icon size={24} className="text-white" />
        </div>
        <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
            {subLabel && <p className="text-xs text-slate-400 mt-0.5">{subLabel}</p>}
        </div>
    </div>
);

export default function DashboardOverview({ toast }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [students, classes, paymentStats] = await Promise.allSettled([
                    api.getStudents(1, 0),
                    api.getClasses(),
                    api.getPaymentStats(),
                ]);

                const studentCount = students.status === 'fulfilled'
                    ? (students.value?.total ?? students.value?.data?.length ?? 0)
                    : '?';
                const classCount = classes.status === 'fulfilled'
                    ? (Array.isArray(classes.value) ? classes.value.length : (classes.value?.data?.length ?? 0))
                    : '?';
                const revenue = paymentStats.status === 'fulfilled'
                    ? (paymentStats.value?.data?.total_revenue ?? paymentStats.value?.total_revenue ?? 0)
                    : '?';

                setStats({ studentCount, classCount, revenue });
            } catch (err) {
                console.error('Failed to load dashboard stats', err);
                toast?.error?.('Không thể tải dữ liệu tổng quan');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const formatCurrency = (val) => {
        if (val === '?') return '?';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(val);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-24">
                <Loader className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <BarChart2 size={24} className="text-blue-600" />
                <h2 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    icon={Users}
                    label="Tổng học viên"
                    value={stats?.studentCount}
                    color="bg-blue-500"
                    subLabel="Học viên đã đăng ký"
                />
                <StatCard
                    icon={BookOpen}
                    label="Tổng lớp học"
                    value={stats?.classCount}
                    color="bg-emerald-500"
                    subLabel="Lớp đang hoạt động"
                />
                <StatCard
                    icon={CreditCard}
                    label="Doanh thu"
                    value={formatCurrency(stats?.revenue)}
                    color="bg-violet-500"
                    subLabel="Tổng thu nhập"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Tăng trưởng"
                    value="—"
                    color="bg-amber-500"
                    subLabel="So với tháng trước"
                />
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                    <Award size={20} className="text-blue-600" />
                    <h3 className="font-semibold text-slate-700 text-lg">Thông báo & Hoạt động</h3>
                </div>
                <p className="text-slate-500">Báo cáo chi tiết có sẵn trong mục <span className="font-medium text-blue-600">Báo cáo</span>.</p>
            </div>
        </div>
    );
}
