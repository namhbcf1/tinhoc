import React, { useState, useEffect, useMemo } from 'react';
import {
    CreditCard, Search, Filter, Check, X, Eye, Clock, RefreshCw,
    DollarSign, TrendingUp, AlertCircle, CheckCircle, XCircle, Calendar, ChevronRight
} from 'lucide-react';
import { useToast } from '../../../components/ui/ToastContainer';
import { usePaymentsManagement } from '../shared/hooks/usePaymentsManagement';
import { formatDateVN } from '../../../utils/dateUtils';

// ============= BOTTOM SHEET =============
const BottomSheet = ({ isOpen, onClose, title, children, height = 'auto' }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div
                className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />
            <div
                className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ maxHeight: height === 'auto' ? '90vh' : height }}
            >
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

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
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 truncate">{payment.student_name || payment.ho_ten || 'Học viên'}</h4>
                    <p className="text-xs text-slate-500">{payment.class_name || payment.ten_lop || 'Lớp học'}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${color}`}>
                    <Icon size={10} /> {label}
                </span>
            </div>

            <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(payment.amount)}</span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {formatDateVN(payment.payment_date || payment.created_at)}
                </span>
            </div>

            {payment.status === 'pending' && (
                <div className="flex gap-2 pt-3 border-t border-slate-50">
                    <button
                        onClick={() => onConfirm(payment.id)}
                        className="flex-1 py-2 bg-green-600 text-white font-semibold rounded-xl text-sm active:bg-green-700 flex items-center justify-center gap-1"
                    >
                        <Check size={14} /> Xác nhận
                    </button>
                    <button
                        onClick={() => onReject(payment.id)}
                        className="flex-1 py-2 bg-red-100 text-red-600 font-semibold rounded-xl text-sm active:bg-red-200 flex items-center justify-center gap-1"
                    >
                        <X size={14} /> Từ chối
                    </button>
                </div>
            )}

            {payment.status !== 'pending' && (
                <button
                    onClick={() => onView(payment)}
                    className="w-full pt-3 border-t border-slate-50 text-sm text-blue-600 font-medium flex items-center justify-center gap-1"
                >
                    <Eye size={14} /> Xem chi tiết
                </button>
            )}
        </div>
    );
};

// ============= PAYMENT DETAIL SHEET =============
const PaymentDetailSheet = ({ isOpen, onClose, payment }) => {
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

                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Học viên</span>
                        <span className="font-medium text-slate-800">{payment.student_name || payment.ho_ten}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Lớp học</span>
                        <span className="font-medium text-slate-800">{payment.class_name || payment.ten_lop}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Ngày thanh toán</span>
                        <span className="font-medium text-slate-800">{formatDateVN(payment.payment_date || payment.created_at)}</span>
                    </div>
                    {payment.notes && (
                        <div className="pt-2 border-t border-slate-200">
                            <span className="text-sm text-slate-500">Ghi chú:</span>
                            <p className="text-slate-700 mt-1">{payment.notes}</p>
                        </div>
                    )}
                </div>
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
        try {
            await rejectPayment(paymentId);
            success('Đã từ chối thanh toán');
        } catch (err) {
            error('Lỗi: ' + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 pt-4 pb-6 safe-area-inset-top">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Quản lý Thanh toán</h2>
                    <button onClick={loadPayments} className="p-2 bg-white/20 rounded-xl text-white">
                        <RefreshCw size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                    <input
                        type="text"
                        placeholder="Tìm theo học viên, lớp..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/60"
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg ${showFilters ? 'bg-white/30' : ''}`}
                    >
                        <Filter size={18} className="text-white/80" />
                    </button>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {[
                            { value: '', label: 'Tất cả' },
                            { value: 'pending', label: 'Chờ duyệt' },
                            { value: 'confirmed', label: 'Đã xác nhận' },
                            { value: 'rejected', label: 'Từ chối' },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilterStatus(f.value)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${filterStatus === f.value ? 'bg-white text-amber-600' : 'bg-white/20 text-white'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="px-4 -mt-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-lg font-bold text-amber-600">{formatCurrency(stats.total)}</p>
                            <p className="text-[10px] text-slate-500">Tổng thu</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-orange-600">{stats.pendingCount}</p>
                            <p className="text-[10px] text-slate-500">Chờ duyệt</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-green-600">{stats.confirmedCount}</p>
                            <p className="text-[10px] text-slate-500">Đã xác nhận</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="p-4 pb-24">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <RefreshCw size={32} className="animate-spin text-amber-600" />
                        <p className="text-slate-500">Đang tải dữ liệu...</p>
                    </div>
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
                    </div>
                )}
            </div>

            {/* Payment Detail Sheet */}
            <PaymentDetailSheet
                isOpen={!!selectedPayment}
                onClose={() => setSelectedPayment(null)}
                payment={selectedPayment}
            />
        </div>
    );
}
