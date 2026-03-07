import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    DollarSign, Calendar, CheckCircle, AlertCircle,
    Clock, X, Download, CreditCard, TrendingUp, AlertTriangle,
    Building2, Copy, QrCode
} from 'lucide-react';
import api from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatCurrency } from '../../../utils/formatters';

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

// Skeleton loader for payment cards
const PaymentSkeleton = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
        <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
                <div className="h-5 bg-slate-200 rounded-lg w-32 mb-2" />
                <div className="h-4 bg-slate-100 rounded-lg w-24" />
            </div>
            <div className="h-6 bg-slate-200 rounded-full w-24" />
        </div>
        <div className="h-8 bg-slate-200 rounded-lg w-40 mb-4" />
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="h-4 bg-slate-100 rounded w-28" />
            <div className="h-9 bg-slate-200 rounded-xl w-24" />
        </div>
    </div>
);

// Bank transfer info modal shown when student clicks "Thanh toán ngay"
const BankTransferModal = ({ payment, onClose }) => {
    const [copied, setCopied] = useState(false);
    const amount = payment?.amount || payment?.so_tien || 0;
    const className = payment?.class_name || payment?.ten_lop || 'Khóa học';
    const invoiceNumber = payment?.invoice_number || payment?.ma_hoa_don || `#${payment?.id}`;
    const transferContent = `THANHTOAN ${invoiceNumber}`.replace(/\s+/g, ' ');

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white rounded-t-3xl relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <X size={16} className="text-white" />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Building2 size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Thanh toán học phí</p>
                            <h2 className="text-lg font-bold text-white">{className}</h2>
                        </div>
                    </div>
                    <div className="bg-white/15 rounded-2xl px-4 py-3 border border-white/25">
                        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Số tiền cần thanh toán</p>
                        <p className="text-2xl font-extrabold text-white tracking-tight">{formatCurrency(amount)}</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 font-medium">
                        Vui lòng chuyển khoản theo thông tin dưới đây:
                    </p>

                    {/* Bank info */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                        {[
                            { label: 'Ngân hàng', value: 'Vietcombank (VCB)' },
                            { label: 'Số tài khoản', value: '1234567890', canCopy: true },
                            { label: 'Chủ tài khoản', value: 'TRUNG TÂM TIẾNG ANH VAN TRANG' },
                            { label: 'Nội dung CK', value: transferContent, canCopy: true },
                        ].map(({ label, value, canCopy }) => (
                            <div key={label} className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500 shrink-0">{label}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-slate-800 text-right">{value}</span>
                                    {canCopy && (
                                        <button
                                            onClick={() => copyToClipboard(value)}
                                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                            title="Sao chép"
                                        >
                                            <Copy size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* QR placeholder */}
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <QrCode size={16} className="text-slate-500" />
                            <p className="text-sm font-semibold text-slate-600">Quét mã QR để thanh toán</p>
                        </div>
                        <div className="w-32 h-32 bg-white rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto">
                            <QrCode size={48} className="text-slate-300" />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Mã QR sẽ được cập nhật sớm</p>
                    </div>

                    {copied && (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-2.5 text-sm font-semibold">
                            <CheckCircle size={15} />
                            Đã sao chép!
                        </div>
                    )}

                    <p className="text-xs text-slate-400 text-center leading-relaxed">
                        Sau khi chuyển khoản, Admin sẽ xác nhận trong vòng 24h. Vui lòng liên hệ nếu cần hỗ trợ.
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

const PaymentCard = ({ payment, onClick, onPayNow }) => {
    const isPaid = payment.payment_status === 'paid' || payment.trang_thai === 'paid';
    const isOverdue = !isPaid && getDaysUntilDue(payment.due_date || payment.han_thanh_toan) < 0;
    const daysUntilDue = getDaysUntilDue(payment.due_date || payment.han_thanh_toan);
    const amount = payment.amount || payment.so_tien || 0;
    const invoiceNumber = payment.invoice_number || payment.ma_hoa_don || `#${payment.id}`;
    const className = payment.class_name || payment.ten_lop || payment.ten_khoa_hoc || 'Khóa học';

    const borderColor = isPaid ? 'border-l-emerald-500' : isOverdue ? 'border-l-red-500' : 'border-l-amber-500';
    const statusBg = isPaid
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : isOverdue
            ? 'bg-red-50 text-red-600 border border-red-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200';
    const statusLabel = isPaid ? 'Đã thanh toán' : isOverdue ? 'Quá hạn' : 'Chưa thanh toán';
    const StatusIcon = isPaid ? CheckCircle : isOverdue ? AlertTriangle : Clock;

    return (
        <div
            className={`bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden anim-fade-up border-0 border-l-4 flex flex-col h-full ${borderColor}`}
            onClick={() => onClick(payment)}
        >
            <div className="p-5 flex-1 flex flex-col">
                {/* Header row */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Mã hóa đơn</p>
                        <h3 className="font-bold text-base text-slate-800 truncate">{invoiceNumber}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${statusBg}`}>
                        <StatusIcon size={12} />
                        {statusLabel}
                    </span>
                </div>

                {/* Class name */}
                <p className="text-sm text-slate-500 mb-4 truncate">{className}</p>

                {/* Amount */}
                <div className="flex items-end justify-between mt-auto">
                    <div>
                        <p className="text-xs text-slate-400 mb-0.5">Số tiền</p>
                        <p className="text-2xl font-extrabold text-slate-800 tracking-tight">{formatCurrency(amount)}</p>
                        {/* Due date countdown */}
                        {payment.due_date && !isPaid && (
                            <p className={`text-xs mt-1.5 font-semibold flex items-center gap-1 ${isOverdue ? 'text-red-600' : daysUntilDue <= 7 ? 'text-amber-600' : 'text-slate-400'}`}>
                                <Calendar size={11} />
                                {isOverdue
                                    ? `Quá hạn ${Math.abs(daysUntilDue)} ngày`
                                    : daysUntilDue === 0
                                        ? 'Hôm nay đến hạn!'
                                        : `Hạn: ${formatDate(payment.due_date)} · còn ${daysUntilDue} ngày`}
                            </p>
                        )}
                        {isPaid && payment.payment_date && (
                            <p className="text-xs text-emerald-600 mt-1.5 font-semibold flex items-center gap-1">
                                <CheckCircle size={11} />
                                Thanh toán: {formatDate(payment.payment_date)}
                            </p>
                        )}
                    </div>
                    {!isPaid && (
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                onPayNow(payment);
                            }}
                            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
                        >
                            <CreditCard size={14} className="mr-1.5" />
                            Thanh toán
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const PaymentDetailModal = ({ payment, onClose, onPayNow }) => {
    const isPaid = payment.payment_status === 'paid' || payment.trang_thai === 'paid';
    const isOverdue = !isPaid && getDaysUntilDue(payment.due_date || payment.han_thanh_toan) < 0;
    const amount = payment.amount || payment.so_tien || 0;
    const invoiceNumber = payment.invoice_number || payment.ma_hoa_don || `#${payment.id}`;
    const className = payment.class_name || payment.ten_lop || payment.ten_khoa_hoc || 'Khóa học';

    const headerGradient = isPaid
        ? 'from-emerald-500 to-green-600'
        : isOverdue
            ? 'from-red-500 to-rose-600'
            : 'from-amber-500 to-orange-500';

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className={`bg-gradient-to-br ${headerGradient} p-6 text-white relative`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default"
                    >
                        <X size={16} className="text-white" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                            <DollarSign size={28} className="text-white" />
                        </div>
                        <div>
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Hóa đơn</p>
                            <h2 className="text-xl font-bold text-white tracking-tight">{invoiceNumber}</h2>
                            <p className="text-white/80 text-sm mt-0.5 truncate max-w-xs">{className}</p>
                        </div>
                    </div>
                    {/* Amount highlight */}
                    <div className="mt-5 bg-white/15 rounded-2xl px-5 py-4 border border-white/25 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Tổng số tiền</p>
                        <p className="text-3xl font-extrabold text-white tracking-tight">{formatCurrency(amount)}</p>
                    </div>
                </div>

                {/* Modal body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Payment info block */}
                    <div className="bg-slate-50 rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Thông tin thanh toán</h3>
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Trạng thái</span>
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                                    {isPaid ? <CheckCircle size={11} /> : isOverdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
                                    {isPaid ? 'Đã thanh toán' : isOverdue ? 'Quá hạn' : 'Chưa thanh toán'}
                                </span>
                            </div>
                            {payment.due_date && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Hạn thanh toán</span>
                                    <span className="font-semibold text-slate-800">{formatDate(payment.due_date)}</span>
                                </div>
                            )}
                            {isPaid && payment.payment_date && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Ngày thanh toán</span>
                                    <span className="font-semibold text-emerald-600">{formatDate(payment.payment_date)}</span>
                                </div>
                            )}
                            {payment.payment_method && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Phương thức</span>
                                    <span className="font-semibold text-slate-800">{payment.payment_method}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Course info block */}
                    <div className="bg-slate-50 rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Thông tin khóa học</h3>
                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Tên khóa học</span>
                                <span className="font-semibold text-slate-800 text-right max-w-[60%]">{className}</span>
                            </div>
                            {payment.enrollment_date && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Ngày đăng ký</span>
                                    <span className="font-semibold text-slate-800">{formatDate(payment.enrollment_date)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2 pt-1">
                        {isPaid && (
                            <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-3 font-semibold shadow-md">
                                <Download size={16} className="mr-2" />
                                Tải hóa đơn PDF
                            </Button>
                        )}
                        {!isPaid && (
                            <Button
                                onClick={() => onPayNow(payment)}
                                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl py-3 font-semibold shadow-md">
                                <CreditCard size={16} className="mr-2" />
                                Thanh toán ngay
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Payment({ studentData }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [bankTransferPayment, setBankTransferPayment] = useState(null);
    const containerRef = useRef(null);

    useGSAP(() => {
        gsap.fromTo(
            '.anim-fade-up',
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
        );
        gsap.fromTo(
            '.anim-scale',
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)', delay: 0.2 }
        );
    }, [payments, activeTab]);

    useEffect(() => {
        // Use studentData prop or fall back to localStorage
        const data = studentData || (() => {
            try {
                const raw = localStorage.getItem('student_data');
                return raw ? JSON.parse(raw) : null;
            } catch { return null; }
        })();
        if (data) {
            fetchPayments(data);
        } else {
            setLoading(false);
        }
    }, [studentData]);

    // SAME LOGIC AS MOBILE - fetch sequentially to avoid rate limits
    const fetchPayments = async (data) => {
        const resolvedData = data || studentData;
        setLoading(true);
        try {
            if (resolvedData?.registrations?.length > 0) {
                const paymentData = [];
                for (const reg of resolvedData.registrations) {
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

    const paidCount = payments.filter(p => p.payment_status === 'paid' || p.trang_thai === 'paid').length;
    const unpaidCount = payments.filter(p => {
        const isPaid = p.payment_status === 'paid' || p.trang_thai === 'paid';
        const isOverdue = !isPaid && getDaysUntilDue(p.due_date || p.han_thanh_toan) < 0;
        return !isPaid && !isOverdue;
    }).length;

    const tabs = [
        { key: 'all', label: 'Tất cả', count: payments.length, color: 'emerald' },
        { key: 'paid', label: 'Đã thanh toán', count: paidCount, color: 'emerald' },
        { key: 'unpaid', label: 'Chưa thanh toán', count: unpaidCount, color: 'amber' },
        { key: 'overdue', label: 'Quá hạn', count: overdueCount, color: 'red' },
    ];

    const tabActiveStyles = {
        emerald: 'bg-emerald-600 text-white shadow-md shadow-emerald-200',
        amber: 'bg-amber-500 text-white shadow-md shadow-amber-200',
        red: 'bg-red-500 text-white shadow-md shadow-red-200',
    };
    const tabBadgeStyles = {
        emerald: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-700',
    };

    return (
        <div className="space-y-6" ref={containerRef}>
            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 rounded-3xl p-7 text-white shadow-xl anim-fade-up relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default" />
                <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign size={20} className="text-white/80" />
                        <p className="text-white/80 text-sm font-semibold uppercase tracking-widest">Quản lý học phí</p>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white mb-1 tracking-tight">
                        {formatCurrency(totalAmount)}
                    </h1>
                    <p className="text-white/70 text-sm mb-6">Tổng học phí tất cả khóa học</p>

                    {/* 4 stat pills */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: 'Tổng học phí', value: formatCurrency(totalAmount), icon: TrendingUp },
                            { label: 'Đã thanh toán', value: formatCurrency(paidAmount), icon: CheckCircle },
                            { label: 'Còn nợ', value: formatCurrency(unpaidAmount), icon: Clock },
                            { label: 'Quá hạn', value: `${overdueCount} hóa đơn`, icon: AlertCircle, pulse: overdueCount > 0 },
                        ].map(({ label, value, icon: Icon, pulse }) => (
                            <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/25 relative hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                                {pulse && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                                )}
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Icon size={13} className="text-white/70" />
                                    <p className="text-white/70 text-xs font-medium">{label}</p>
                                </div>
                                <p className="text-white font-bold text-base leading-tight truncate">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pill Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 anim-scale hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                <div className="flex gap-2 flex-wrap">
                    {tabs.map(({ key, label, count, color }) => {
                        const isActive = activeTab === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
                                    ? tabActiveStyles[color]
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                            >
                                {label}
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/25 text-white' : tabBadgeStyles[color]}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Payment List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <PaymentSkeleton key={i} />)}
                </div>
            ) : filteredPayments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPayments.map((payment) => (
                        <PaymentCard
                            key={payment.id}
                            payment={payment}
                            onClick={setSelectedPayment}
                            onPayNow={setBankTransferPayment}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 py-20 text-center hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                        <DollarSign size={36} className="text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-semibold text-lg">Không có học phí nào</p>
                    <p className="text-slate-400 text-sm mt-1">Chưa có dữ liệu cho bộ lọc này</p>
                </div>
            )}

            {/* Payment Detail Modal */}
            {selectedPayment && (
                <PaymentDetailModal
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                    onPayNow={(p) => { setSelectedPayment(null); setBankTransferPayment(p); }}
                />
            )}

            {/* Bank Transfer Modal */}
            {bankTransferPayment && (
                <BankTransferModal
                    payment={bankTransferPayment}
                    onClose={() => setBankTransferPayment(null)}
                />
            )}
        </div>
    );
}
