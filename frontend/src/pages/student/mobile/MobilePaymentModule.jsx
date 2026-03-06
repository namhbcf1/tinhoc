import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, CheckCircle, AlertCircle, Clock, X, Download, CreditCard, ChevronRight } from 'lucide-react';
import api from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';
import { useToast } from '../../../components/ui/ToastContainer';
import ToastContainer from '../../../components/ui/ToastContainer';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

// Helper to format date
const formatDate = (date) => {
    if (!date) return '';
    try {
        return new Date(date).toLocaleDateString('vi-VN');
    } catch {
        return date;
    }
};

// Calculate days until due
const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const PaymentCard = ({ payment, onClick, onPayNow }) => {
    const isPaid = payment.payment_status === 'paid' || payment.trang_thai === 'paid';
    const isOverdue = !isPaid && getDaysUntilDue(payment.due_date || payment.han_thanh_toan) < 0;
    const daysUntilDue = getDaysUntilDue(payment.due_date || payment.han_thanh_toan);
    const amount = payment.amount || payment.so_tien || 0;
    const invoiceNumber = payment.invoice_number || payment.ma_hoa_don || `#${payment.id}`;
    const className = payment.class_name || payment.ten_lop || payment.ten_khoa_hoc || 'Khóa học';

    return (
        <div
            className={`bg-white p-4 rounded-2xl border-2 ${isPaid ? 'border-emerald-200' :
                isOverdue ? 'border-red-200' :
                    'border-amber-200'
                } shadow-sm mb-3 active:scale-[0.98] transition-all duration-200`}
            onClick={() => onClick(payment)}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-800 text-sm">{invoiceNumber}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${isPaid ? 'bg-emerald-100 text-emerald-700' :
                            isOverdue ? 'bg-red-100 text-red-600' :
                                'bg-amber-100 text-amber-700'
                            }`}>
                            {isPaid ? 'Đã thanh toán' : isOverdue ? 'Quá hạn' : 'Chưa thanh toán'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{className}</p>
                </div>
                <ChevronRight size={20} className="text-slate-300 flex-shrink-0" />
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-2xl font-bold text-slate-800 tracking-tight">{formatCurrency(amount)}</p>
                    {payment.due_date && !isPaid && (
                        <p className={`text-xs mt-1 font-medium ${isOverdue ? 'text-red-600' :
                            daysUntilDue <= 7 ? 'text-amber-600' :
                                'text-slate-500'
                            }`}>
                            {isOverdue ? `Quá hạn ${Math.abs(daysUntilDue)} ngày` :
                                daysUntilDue === 0 ? 'Hôm nay đến hạn!' :
                                    `Còn ${daysUntilDue} ngày`}
                        </p>
                    )}
                    {isPaid && payment.payment_date && (
                        <p className="text-xs text-emerald-600 mt-1 font-medium">
                            Đã thanh toán: {formatDate(payment.payment_date)}
                        </p>
                    )}
                </div>
                {!isPaid && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Pass up to parent via prop (handled in main component)
                            if (onPayNow) onPayNow();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg text-sm font-medium active:scale-95 transition-transform"
                    >
                        Thanh toán
                    </button>
                )}
            </div>
        </div>
    );
};

const PaymentDetailSheet = ({ payment, onClose }) => {
    const isPaid = payment.payment_status === 'paid' || payment.trang_thai === 'paid';
    const amount = payment.amount || payment.so_tien || 0;
    const invoiceNumber = payment.invoice_number || payment.ma_hoa_don || `#${payment.id}`;
    const className = payment.class_name || payment.ten_lop || payment.ten_khoa_hoc || 'Khóa học';

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
            <div
                className="bg-white w-full max-h-[85vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`relative ${isPaid ? 'bg-gradient-to-r from-emerald-600 to-green-600' : 'bg-gradient-to-r from-amber-600 to-orange-600'} px-5 pt-6 pb-5`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm active:scale-95 transition-transform hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default"
                    >
                        <X size={20} className="text-white" />
                    </button>

                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 mb-3 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                            <DollarSign size={32} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1 tracking-tight">{invoiceNumber}</h2>
                        <p className="text-white/90 text-sm">{className}</p>
                    </div>

                    {/* Amount */}
                    <div className="mt-4 text-center">
                        <p className="text-sm text-white/80 mb-1">Số tiền</p>
                        <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(amount)}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    <div className="space-y-4">
                        {/* Payment Info */}
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h3 className="font-bold text-slate-800 mb-3">Thông tin thanh toán</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Trạng thái:</span>
                                    <span className={`font-medium ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                    </span>
                                </div>
                                {payment.due_date && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Hạn thanh toán:</span>
                                        <span className="font-medium text-slate-800">{formatDate(payment.due_date)}</span>
                                    </div>
                                )}
                                {isPaid && payment.payment_date && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Ngày thanh toán:</span>
                                        <span className="font-medium text-emerald-600">{formatDate(payment.payment_date)}</span>
                                    </div>
                                )}
                                {payment.payment_method && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Phương thức:</span>
                                        <span className="font-medium text-slate-800">{payment.payment_method}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Class Info */}
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h3 className="font-bold text-slate-800 mb-3">Thông tin khóa học</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Tên khóa học:</span>
                                    <span className="font-medium text-slate-800">{className}</span>
                                </div>
                                {payment.enrollment_date && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Ngày đăng ký:</span>
                                        <span className="font-medium text-slate-800">{formatDate(payment.enrollment_date)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            {isPaid && (
                                <button className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium active:scale-95 transition-transform flex items-center justify-center gap-2">
                                    <Download size={18} />
                                    Tải hóa đơn
                                </button>
                            )}
                            {!isPaid && (
                                <button className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium active:scale-95 transition-transform flex items-center justify-center gap-2">
                                    <CreditCard size={18} />
                                    Thanh toán ngay
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function MobilePaymentModule({ studentData }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedPayment, setSelectedPayment] = useState(null);

    const toast = useToast();

    useEffect(() => {
        if (studentData) {
            fetchPayments();
        }
    }, [studentData]);

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        if (studentData) await fetchPayments();
    };

    // Replaces alert() for payment feature notification
    const handlePayNow = () => {
        toast.info('Tính năng thanh toán online đang phát triển. Vui lòng liên hệ văn phòng.');
    };

    const fetchPayments = async () => {
        setLoading(true);
        try {
            if (studentData.registrations?.length > 0) {
                const paymentData = [];
                for (const reg of studentData.registrations) {
                    try {
                        let className = 'Khóa học';
                        let hocPhi = 0;
                        try {
                            const classInfo = await api.getClass(reg.class_id);
                            className = classInfo?.data?.ten_lop || classInfo?.data?.ma_lop || 'Khóa học';
                            hocPhi = classInfo?.data?.hoc_phi || 0;
                        } catch {/* ignore */ }

                        if (hocPhi > 0) {
                            paymentData.push({
                                id: reg.registration_id,
                                registration_id: reg.registration_id,
                                class_id: reg.class_id,
                                class_name: className,
                                amount: hocPhi,
                                payment_status: reg.payment_status || 'unpaid',
                                registration_status: reg.status,
                                due_date: reg.han_thanh_toan || reg.due_date,
                            });
                        }
                    } catch (error) {
                        console.warn('Error processing registration', reg.registration_id, error);
                    }
                }
                setPayments(paymentData);
            } else {
                setPayments([]);
            }
        } catch (error) {
            console.error("Failed to fetch payments", error);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter payments
    const filteredPayments = payments.filter(p => {
        const isPaid = p.payment_status === 'paid' || p.trang_thai === 'paid';
        const isOverdue = !isPaid && getDaysUntilDue(p.due_date || p.han_thanh_toan) < 0;

        if (activeTab === 'all') return true;
        if (activeTab === 'paid') return isPaid;
        if (activeTab === 'unpaid') return !isPaid && !isOverdue;
        if (activeTab === 'overdue') return isOverdue;
        return true;
    });

    // Stats
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || p.so_tien || 0), 0);
    const paidAmount = payments
        .filter(p => p.payment_status === 'paid' || p.trang_thai === 'paid')
        .reduce((sum, p) => sum + (p.amount || p.so_tien || 0), 0);
    const unpaidAmount = totalAmount - paidAmount;
    const overdueCount = payments.filter(p => {
        const isPaid = p.payment_status === 'paid' || p.trang_thai === 'paid';
        return !isPaid && getDaysUntilDue(p.due_date || p.han_thanh_toan) < 0;
    }).length;

    return (
        <PullToRefreshWrapper onRefresh={loadPayments}>
        <div className="min-h-screen bg-slate-50 pb-28">
            {/* Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 px-5 pt-6 pb-8">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-10 left-4 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
                            <DollarSign size={24} className="text-white" strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Quản lý học phí</p>
                            <h1 className="text-white font-black text-xl tracking-tight">Học phí & Thanh toán</h1>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Tổng học phí', value: formatCurrency(totalAmount) },
                            { label: 'Đã thanh toán', value: formatCurrency(paidAmount) },
                            { label: 'Còn nợ', value: formatCurrency(unpaidAmount) },
                            { label: 'Quá hạn', value: `${overdueCount} hóa đơn`, alert: overdueCount > 0 },
                        ].map(({ label, value, alert }) => (
                            <div key={label} className={`backdrop-blur-sm rounded-2xl px-4 py-3 border relative ${alert ? 'bg-red-500/20 border-red-400/30' : 'bg-white/15 border-white/20'}`}>
                                {alert && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-400 animate-pulse" />}
                                <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
                                <p className="text-white font-black text-sm leading-tight truncate">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="bg-white border-b border-slate-100 px-5 flex gap-1 overflow-x-auto sticky top-0 z-10 shadow-sm">
                {[
                    { key: 'all', label: `Tất cả (${payments.length})` },
                    { key: 'paid', label: 'Đã thanh toán' },
                    { key: 'unpaid', label: 'Chưa TT' },
                    { key: 'overdue', label: 'Quá hạn', badge: overdueCount },
                ].map(({ key, label, badge }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`py-3.5 font-black text-sm whitespace-nowrap border-b-2 transition-colors relative px-3 ${activeTab === key ? 'text-emerald-600 border-emerald-600' : 'text-slate-500 border-transparent'
                            }`}
                    >
                        {label}
                        {badge > 0 && (
                            <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black">{badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Payment List */}
            <div className="px-4 py-4">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl border-2 border-slate-100 p-4 animate-pulse">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-slate-100 rounded-full w-1/2" />
                                        <div className="h-3 bg-slate-100 rounded-full w-1/3" />
                                    </div>
                                    <div className="h-6 w-24 bg-slate-100 rounded-full" />
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="h-7 w-32 bg-slate-100 rounded-xl" />
                                    <div className="h-9 w-24 bg-slate-100 rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredPayments.length > 0 ? (
                    <div className="space-y-3">
                        {filteredPayments.map((payment) => (
                            <PaymentCard key={payment.id} payment={payment} onClick={setSelectedPayment} onPayNow={handlePayNow} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                            <DollarSign size={40} className="text-emerald-300" />
                        </div>
                        <h3 className="font-black text-slate-800 text-lg mb-2">Không có học phí nào</h3>
                        <p className="text-slate-500 text-sm">Chưa có dữ liệu cho bộ lọc này</p>
                    </div>
                )}
            </div>

            {/* Payment Detail Sheet */}
            {selectedPayment && (
                <PaymentDetailSheet
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}

            <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
        </div>
        </PullToRefreshWrapper>
    );
}
