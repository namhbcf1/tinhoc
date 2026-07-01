// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
    CreditCard, Search, Filter, Check, X, Eye, Clock, RefreshCw,
    AlertCircle, CheckCircle, XCircle, Calendar, ChevronDown
} from 'lucide-react';
import { useToast } from '../../../components/ui/ToastContainer';
import { usePaymentsManagement } from '../shared/hooks/usePaymentsManagement';
import { formatDateVN } from '../../../utils/dateUtils';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import {
    MobileAdminBottomSheet,
    MobileAdminHeroCard,
    MobileAdminSearchField,
    MobileAdminSecondaryButton,
    MobileAdminStatCard,
    mobileAdminContentPadding,
} from '../shared/mobileAdminUi';

const BottomSheet = MobileAdminBottomSheet;

const formatCurrency = (value) => {
    if (!value) return '0 đ';
    return parseInt(value).toLocaleString('vi-VN') + ' đ';
};

const getStatusConfig = (status) => {
    const config = {
        pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
        confirmed: { label: 'Đã xác nhận', color: 'bg-green-100 text-green-700', icon: CheckCircle },
        rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700', icon: XCircle },
        partial: { label: 'Thanh toán 1 phần', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
    };
    return config[status] || { label: status, color: 'bg-slate-100 text-slate-700', icon: CreditCard };
};

// ============= PAYMENT CARD =============
const PaymentCard = ({ payment, onView, onConfirm, onReject }) => {
    const { label, color, icon: Icon } = getStatusConfig(payment.status);

    return (
        <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf2_100%)] p-4 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.34)]">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h4 className="truncate text-[17px] font-black tracking-[-0.03em] text-slate-900">{payment.ho_ten_full || payment.student_name || payment.ho_ten || 'Học viên'}</h4>
                    <p className="text-xs text-slate-500">{payment.ten_lop || payment.class_name || 'Lớp học'}</p>
                    {(payment.cccd) && (
                        <p className="text-[10px] text-slate-400 font-mono">{payment.cccd}</p>
                    )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${color}`}>
                    <Icon size={10} /> {label}
                </span>
            </div>

            <div className="mb-3 flex items-center justify-between">
                <span className="text-[26px] font-black tracking-[-0.03em] text-amber-600">{formatCurrency(payment.amount)}</span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {formatDateVN(payment.payment_date || payment.created_at, true)}
                </span>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
                {payment.status === 'pending' && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onConfirm(payment.id)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-green-600 py-2.5 text-sm font-semibold text-white active:bg-green-700"
                        >
                            <Check size={14} /> Xác nhận
                        </button>
                        <button
                            onClick={() => onReject(payment.id)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-red-100 bg-red-50 py-2.5 text-sm font-semibold text-red-600 active:bg-red-100"
                        >
                            <X size={14} /> Từ chối
                        </button>
                    </div>
                )}
                <button
                    onClick={() => onView(payment)}
                    className="flex w-full items-center justify-center gap-1 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700"
                >
                    <Eye size={14} /> Xem chi tiết
                </button>
            </div>
        </div>
    );
};

// ============= PAYMENT DETAIL SHEET =============
const PaymentDetailSheet = ({ isOpen, onClose, payment, onConfirm, onReject }) => {
    if (!payment) return null;

    const { label, color } = getStatusConfig(payment.status);

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Chi tiết thanh toán" height="auto">
            <div className="p-4 pb-8">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CreditCard size={32} className="text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(payment.amount)}</p>
                    <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full mt-2 ${color}`}>
                        {label}
                    </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl space-y-3 mb-4">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Học viên</span>
                        <span className="font-medium text-slate-800">{payment.ho_ten_full || payment.student_name || payment.ho_ten}</span>
                    </div>
                    {payment.cccd && (
                        <div className="flex justify-between">
                            <span className="text-slate-500">CCCD</span>
                            <span className="font-mono text-sm text-slate-800">{payment.cccd}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-slate-500">Lớp học</span>
                        <span className="font-medium text-slate-800">{payment.ten_lop || payment.class_name || `Lớp #${payment.class_id}`}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Ngày tạo</span>
                        <span className="font-medium text-slate-800">{formatDateVN(payment.payment_date || payment.created_at, true)}</span>
                    </div>
                    {(payment.note || payment.notes) && (
                        <div className="pt-2 border-t border-slate-200">
                            <span className="text-sm text-slate-500">Ghi chú:</span>
                            <p className="text-slate-700 mt-1">{payment.note || payment.notes}</p>
                        </div>
                    )}
                </div>

                {payment.status === 'pending' && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => { onConfirm(payment.id); onClose(); }}
                            className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl text-sm active:bg-green-700 flex items-center justify-center gap-2"
                        >
                            <Check size={16} /> Xác nhận
                        </button>
                        <button
                            onClick={() => { onReject(payment.id); onClose(); }}
                            className="flex-1 py-3 bg-red-100 text-red-600 font-bold rounded-xl text-sm active:bg-red-200 flex items-center justify-center gap-2"
                        >
                            <X size={16} /> Từ chối
                        </button>
                    </div>
                )}
            </div>
        </BottomSheet>
    );
};

// ============= MAIN COMPONENT =============
export default function MobilePaymentsModule() {
    const { success, error } = useToast();
    const { payments, classes, loading, filterPayments, getStats, confirmPayment, rejectPayment, loadPayments } = usePaymentsManagement();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    const filteredPayments = useMemo(() => {
        return filterPayments(searchTerm, filterStatus, filterClass);
    }, [payments, searchTerm, filterStatus, filterClass, filterPayments]);

    const stats = getStats();

    const handleConfirm = async (paymentId) => {
        try {
            await confirmPayment(paymentId);
            success('Xác nhận thanh toán thành công!');
        } catch (err) {
            error('Lỗi: ' + err.message);
        }
    };

    const handleReject = async (paymentId) => {
        if (!window.confirm('Từ chối thanh toán này?')) return;
        try {
            await rejectPayment(paymentId);
            success('Đã từ chối thanh toán');
        } catch (err) {
            error('Lỗi: ' + err.message);
        }
    };

    const hasActiveFilters = searchTerm || filterStatus || filterClass;

    return (
        <div className="min-h-screen bg-slate-50">
            <MobileAdminHeroCard
                eyebrow="Tài chính"
                icon={CreditCard}
                tone="amber"
                title="Thanh toán"
                description="Giữ tìm kiếm, lọc và số liệu xử lý trong cùng một cụm để duyệt học phí nhanh hơn trên mobile."
                actions={(
                    <MobileAdminSecondaryButton onClick={() => loadPayments({ force: true })} className="px-3.5">
                        <RefreshCw size={16} />
                        Làm mới
                    </MobileAdminSecondaryButton>
                )}
                stats={(
                    <div className="grid grid-cols-2 gap-2">
                        <MobileAdminStatCard
                            label="Tổng thu"
                            value={stats.total >= 1000000000
                                ? (stats.total / 1000000000).toFixed(1) + 'B'
                                : stats.total >= 1000000
                                ? (stats.total / 1000000).toFixed(0) + 'M'
                                : stats.total >= 1000
                                ? (stats.total / 1000).toFixed(0) + 'k'
                                : stats.total.toLocaleString('vi-VN')}
                            tone="amber"
                        />
                        <MobileAdminStatCard label="Chờ duyệt" value={stats.pendingCount} tone="amber" />
                        <MobileAdminStatCard label="Đã xác nhận" value={stats.confirmedCount} tone="emerald" />
                        <MobileAdminStatCard label="Từ chối" value={stats.rejectedCount} tone="rose" />
                    </div>
                )}
                search={(
                    <div className="flex gap-2">
                        <MobileAdminSearchField
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onClear={() => setSearchTerm('')}
                            placeholder="Tìm theo tên, CCCD, lớp..."
                        />
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border shadow-sm ${showFilters ? 'border-amber-200 bg-amber-500 text-white' : 'border-white/10 bg-white/[0.96] text-slate-500'}`}
                        >
                            <Filter size={18} />
                        </button>
                    </div>
                )}
                filters={showFilters ? (
                    <div className="space-y-2">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {[
                                { value: '', label: 'Tất cả' },
                                { value: 'pending', label: 'Chờ duyệt' },
                                { value: 'confirmed', label: 'Đã xác nhận' },
                                { value: 'rejected', label: 'Từ chối' },
                            ].map((f) => (
                                <button
                                    key={f.value}
                                    onClick={() => setFilterStatus(f.value)}
                                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${filterStatus === f.value ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {classes.length > 0 && (
                            <div className="relative">
                                <select
                                    value={filterClass}
                                    onChange={(e) => setFilterClass(e.target.value)}
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-8 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-200"
                                >
                                    <option value="">Tất cả lớp</option>
                                    {classes.map((cls) => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.ten_lop}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        )}

                        {hasActiveFilters ? (
                            <button
                                onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterClass(''); }}
                                className="flex items-center gap-1 text-sm font-medium text-slate-500"
                            >
                                <X size={14} /> Xóa bộ lọc
                            </button>
                        ) : null}
                    </div>
                ) : null}
            />

            {/* List */}
            <div className="p-4 pt-3" style={{ paddingBottom: mobileAdminContentPadding(20) }}>
                {hasActiveFilters && (
                    <p className="text-xs text-slate-500 mb-3">
                        Hiển thị {filteredPayments.length} / {payments.length} khoản
                    </p>
                )}
                {loading ? (
                    <AdminLoadingState
                        title="Đang tải thanh toán"
                        hint="Khoản thanh toán dùng cache ngắn để mở nhanh nhưng vẫn giữ dữ liệu mới tương đối sát."
                        variant="mobile-list"
                        accent="amber"
                    />
                ) : filteredPayments.length > 0 ? (
                    <div className="space-y-3">
                        {filteredPayments.map((payment) => (
                            <PaymentCard
                                key={payment.id}
                                payment={payment}
                                onView={setSelectedPayment}
                                onConfirm={handleConfirm}
                                onReject={handleReject}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60">
                        <CreditCard size={64} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Không có thanh toán nào</p>
                        {hasActiveFilters && (
                            <button
                                onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterClass(''); }}
                                className="mt-3 text-sm text-blue-600 font-medium"
                            >
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Payment Detail Sheet */}
            <PaymentDetailSheet
                isOpen={!!selectedPayment}
                onClose={() => setSelectedPayment(null)}
                payment={selectedPayment}
                onConfirm={handleConfirm}
                onReject={handleReject}
            />
        </div>
    );
}
