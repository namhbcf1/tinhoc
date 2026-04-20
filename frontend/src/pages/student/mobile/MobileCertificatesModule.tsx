import React, { useState, useEffect } from 'react';
import { Award, Download, QrCode, Share2, X, CheckCircle, Star } from 'lucide-react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { getStorageValue } from '../../../utils/browser-storage.js';
import OverlayPortal from '../../../components/ui/OverlayPortal';

const formatDate = (date) => {
    if (!date) return '';
    try { return new Date(date).toLocaleDateString('vi-VN'); } catch { return date; }
};

const CertificateCard = ({ certificate, onClick, onDownload, onShare, index }) => {
    const name = certificate.certificate_name || certificate.ten_chung_chi || 'Chứng chỉ';
    const issueDate = certificate.issue_date || certificate.ngay_cap || '';
    const level = certificate.level || certificate.cap_do || '';
    const gradients = [
        'from-amber-500 to-yellow-600',
        'from-violet-500 to-purple-600',
        'from-emerald-500 to-teal-600',
        'from-blue-500 to-indigo-600',
    ];
    const gradient = gradients[index % gradients.length];

    return (
        <div
            className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 active:scale-[0.97] transition-all duration-200"
            onClick={() => onClick(certificate)}
        >
            {/* Colorful top strip */}
            <div className={`bg-gradient-to-r ${gradient} p-5 relative overflow-hidden`} style={{ overflow: 'clip' }}>
                <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-white/10 blur-lg opacity-60" />
                <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center`}>
                        <Award size={24} className="text-white" strokeWidth={2} />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                        <CheckCircle size={16} className="text-white" />
                    </div>
                </div>
                <div className="mt-4">
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Chứng chỉ đã cấp</p>
                    <h3 className="text-white font-black text-base leading-tight line-clamp-2">{name}</h3>
                </div>
            </div>
            {/* Details */}
            <div className="p-4 flex items-center justify-between">
                <div>
                    {level && <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">{level}</span>}
                    {issueDate && <p className="text-xs text-slate-400 font-semibold mt-1.5">Ngày cấp: {formatDate(issueDate)}</p>}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            onDownload(certificate);
                        }}
                        className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center active:scale-90 transition-transform"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            onShare(certificate);
                        }}
                        className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center active:scale-90 transition-transform"
                    >
                        <Share2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const CertificateDetailSheet = ({ certificate, onClose, onDownload, onShare }) => {
    const name = certificate.certificate_name || certificate.ten_chung_chi || 'Chứng chỉ';
    const issuer = certificate.issuer || certificate.don_vi_cap || 'VanTrangEdu';
    const issueDate = certificate.issue_date || certificate.ngay_cap || '';
    const certificateNumber = certificate.certificate_number || certificate.so_chung_chi || '';
    const level = certificate.level || certificate.cap_do || '';

    return (
        <OverlayPortal>
            <div className="fixed inset-0 z-[100000] flex items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div
                    className="bg-white w-full max-h-[90vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                <div className="relative bg-gradient-to-br from-amber-500 to-yellow-600 px-6 pt-8 pb-6">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm">
                        <X size={20} className="text-white" />
                    </button>
                    <div className="w-20 h-20 rounded-3xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-4">
                        <Award size={40} className="text-white" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-black text-white text-center tracking-tight">{name}</h2>
                    {level && <p className="text-white/80 text-sm text-center mt-1">{level}</p>}
                    <div className="mt-4 bg-white/15 rounded-2xl px-4 py-3 border border-white/20 text-center">
                        <p className="text-white/70 text-xs font-bold tracking-widest">Đơn vị cấp</p>
                        <p className="text-white font-black text-base mt-0.5">{issuer}</p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                        {[
                            { label: 'Số chứng chỉ', value: certificateNumber || 'N/A' },
                            { label: 'Ngày cấp', value: issueDate ? formatDate(issueDate) : 'N/A' },
                            { label: 'Đơn vị cấp', value: issuer },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-sm">
                                <span className="text-slate-500">{label}</span>
                                <span className="font-bold text-slate-800">{value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex flex-col items-center">
                        <QrCode size={100} className="text-amber-600 mb-3" />
                        <p className="text-amber-700 text-sm font-semibold text-center">Quét mã để xác thực chứng chỉ</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onDownload(certificate)}
                            className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform"
                        >
                            <Download size={16} /> Tải xuống
                        </button>
                        <button
                            onClick={() => onShare(certificate)}
                            className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform"
                        >
                            <Share2 size={16} /> Chia sẻ
                        </button>
                    </div>
                </div>
                </div>
            </div>
        </OverlayPortal>
    );
};

export default function MobileCertificatesModule({ studentData }) {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    useEffect(() => { fetchCertificates(); }, [studentData?.cccd]);

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        await fetchCertificates();
    };

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const cccd = studentData?.cccd || studentData?.so_cccd || getStorageValue('student_cccd');
            if (!cccd) {
                setCertificates([]);
                return;
            }

            const res = await api.lookupCertificate(cccd, null);
            const certList = Array.isArray(res) ? res : (res?.data || res?.certificates || []);
            setCertificates(certList);
        } catch (error) {
            console.error("Failed to fetch certificates", error);
            setCertificates([]);
        } finally {
            setLoading(false);
        }
    };

    const buildLookupUrl = (certificate) => {
        const params = new URLSearchParams();
        const certificateNumber = certificate?.certificate_number || certificate?.so_chung_chi;
        const cccd = certificate?.cccd || studentData?.cccd || getStorageValue('student_cccd');
        if (certificateNumber) params.set('certificate_number', certificateNumber);
        if (cccd) params.set('cccd', cccd);
        return `${window.location.origin}/certificate/lookup?${params.toString()}`;
    };

    const handleDownloadCertificate = async (certificate) => {
        if (!certificate?.id) return;
        try {
            const html = await api.downloadCertificate(certificate.id, 'html');
            const popup = window.open('', '_blank', 'noopener,noreferrer');
            if (!popup) return;
            popup.document.open();
            popup.document.write(html);
            popup.document.close();
        } catch (downloadError) {
            console.error('Failed to download certificate', downloadError);
        }
    };

    const handleShareCertificate = async (certificate) => {
        const shareUrl = buildLookupUrl(certificate);
        try {
            if (navigator.share) {
                await navigator.share({
                    title: certificate?.certificate_number || 'Chứng chỉ',
                    text: 'Tra cứu chứng chỉ',
                    url: shareUrl,
                });
                return;
            }
            await navigator.clipboard.writeText(shareUrl);
        } catch (shareError) {
            console.error('Failed to share certificate', shareError);
        }
    };

    const totalCerts = certificates.length;
    const thisYear = new Date().getFullYear();
    const thisYearCerts = certificates.filter(c => {
        const d = c.issue_date || c.ngay_cap;
        return d && new Date(d).getFullYear() === thisYear;
    }).length;

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50 pb-28">
            {/* Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-600 px-5 pt-6 pb-8" style={{ overflow: 'clip' }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-2xl opacity-60" />
                <div className="absolute bottom-0 left-5 w-32 h-32 rounded-full bg-white/10 blur-2xl opacity-60" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
                            <Award size={24} className="text-white" strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Hồ sơ thành tích</p>
                            <h1 className="text-white font-black text-xl tracking-tight">Chứng chỉ & Kết quả</h1>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Tổng chứng chỉ', value: loading ? '...' : totalCerts },
                            { label: `Năm ${thisYear}`, value: loading ? '...' : thisYearCerts },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                                <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
                                <p className="text-white font-black text-2xl leading-none">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-5">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-3xl overflow-hidden border border-slate-100 animate-pulse">
                                <div className="h-28 bg-slate-100" />
                                <div className="p-4 flex justify-between items-center">
                                    <div className="space-y-2">
                                        <div className="h-5 w-20 bg-slate-100 rounded-xl" />
                                        <div className="h-3 w-28 bg-slate-100 rounded-xl" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-9 h-9 bg-slate-100 rounded-2xl" />
                                        <div className="w-9 h-9 bg-slate-100 rounded-2xl" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : certificates.length > 0 ? (
                    <div className="space-y-3">
                        {certificates.map((cert, i) => (
                            <CertificateCard
                                key={cert.id || i}
                                certificate={cert}
                                onClick={setSelectedCertificate}
                                onDownload={handleDownloadCertificate}
                                onShare={handleShareCertificate}
                                index={i}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
                            <Award size={40} className="text-amber-300" />
                        </div>
                        <h3 className="font-black text-slate-800 text-lg mb-2">Chưa có chứng chỉ nào</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">Hoàn thành khóa học để nhận chứng chỉ của bạn!</p>
                        <div className="mt-4 flex items-center gap-2 text-amber-600">
                            <Star size={14} fill="currentColor" />
                            <span className="text-xs font-bold">Mỗi chứng chỉ là minh chứng cho nỗ lực của bạn</span>
                            <Star size={14} fill="currentColor" />
                        </div>
                    </div>
                )}
            </div>

            {selectedCertificate && (
                <CertificateDetailSheet
                    certificate={selectedCertificate}
                    onClose={() => setSelectedCertificate(null)}
                    onDownload={handleDownloadCertificate}
                    onShare={handleShareCertificate}
                />
            )}
        </div>
        </PullToRefreshWrapper>
    );
}
