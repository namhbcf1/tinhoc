import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Award, Download, CheckCircle, BookOpen, Star, Calendar, GraduationCap, Trophy } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import api from '../../../services/api';
import { getStorageValue } from '../../../utils/browser-storage.js';

// ─── Status badge for certificate ────────────────────────────────────────────
const CertBadge = ({ status }) => {
    const map = {
        active:    { label: 'Còn hiệu lực', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
        expired:   { label: 'Hết hạn',      cls: 'bg-red-100 text-red-600 border border-red-200' },
        completed: { label: 'Hoàn thành',   cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
    };
    const cfg = map[status] || { label: 'Đã cấp', cls: 'bg-blue-100 text-blue-700 border border-blue-200' };
    return (
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>
    );
};

// ─── Single certificate card ──────────────────────────────────────────────────
const CertCard = ({ cert, index }) => (
    <div className={`cert-card group relative overflow-hidden rounded-2xl bg-white border border-slate-100
                     shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6`}>
        {/* gradient accent top stripe */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-t-2xl" />

        {/* decorative watermark */}
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-purple-50 opacity-60 pointer-events-none" />

        <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Award size={24} className="text-white" />
                </div>
                <CertBadge status={cert.status} />
            </div>

            <h3 className="font-bold text-slate-800 text-base leading-snug mb-1 line-clamp-2">
                {cert.name || cert.certificate_name || cert.course_name || `Chứng chỉ #${index + 1}`}
            </h3>
            {cert.issuer && (
                <p className="text-xs text-slate-500 font-medium mb-3 font-bold">{cert.issuer}</p>
            )}

            <div className="flex items-center gap-1 text-xs text-slate-400 mb-4 font-bold">
                <Calendar size={12} />
                <span>
                    Cấp ngày:{' '}
                    {cert.issue_date || cert.issued_at || cert.date
                        ? new Date(cert.issue_date || cert.issued_at || cert.date)
                              .toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : 'Chưa cập nhật'}
                </span>
            </div>

            <button
                aria-label={`Tải chứng chỉ ${cert.name || cert.certificate_name || 'chứng chỉ'}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                           bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold
                           hover:from-violet-600 hover:to-purple-700 shadow hover:shadow-md
                           transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
                <Download size={15} />
                Tải chứng chỉ
            </button>
        </div>
    </div>
);

// ─── Stat mini card ───────────────────────────────────────────────────────────
const MiniStat = ({ icon: Icon, label, value, gradient, bgLight, textColor }) => (
    <div className={`rounded-2xl p-5 ${bgLight} flex items-center gap-4`}>
        <div className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center shadow flex-shrink-0`}>
            <Icon size={20} className="text-white" />
        </div>
        <div>
            <p className={`text-2xl font-black leading-none ${textColor}`}>{value}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5 font-bold">{label}</p>
        </div>
    </div>
);

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const CertSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[0, 1, 2].map(i => (
            <div key={i} className="rounded-2xl bg-white border border-slate-100 shadow-md p-6 animate-pulse">
                <div className="h-1 bg-purple-200 rounded-t-2xl -mx-6 -mt-6 mb-6" />
                <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                    <div className="w-20 h-6 rounded-full bg-slate-200" />
                </div>
                <div className="h-4 bg-slate-200 rounded mb-2 w-3/4" />
                <div className="h-3 bg-slate-100 rounded mb-4 w-1/2" />
                <div className="h-10 bg-slate-200 rounded-xl" />
            </div>
        ))}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Certificates({ studentData }) {
    const containerRef = useRef(null);

    const [certs, setCerts] = useState(studentData?.certificates || []);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        const cccd = studentData?.cccd || getStorageValue('student_cccd');
        if (!cccd) { setFetching(false); return; }
        api.request(`/certificates/lookup?cccd=${cccd}`)
            .then(res => {
                if (res?.success && Array.isArray(res.data)) setCerts(res.data);
            })
            .catch(() => {})
            .finally(() => setFetching(false));
    }, [studentData?.cccd]);

    useGSAP(() => {
        gsap.fromTo(
            '.anim-fade-up',
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
        );
    }, []);

    const totalCerts   = certs.length;
    const completed    = certs.filter(c => ['completed', 'active'].includes(c.status)).length;

    // infer "studying" from studentData registrations if available
    const studyingCount = (studentData?.registrations || [])
        .filter(r => ['studying', 'approved'].includes(r.status)).length;

    return (
        <div className="space-y-7" ref={containerRef}>

            {/* ── Header Banner ────────────────────────────────────────── */}
            <div className="anim-fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-8 shadow-xl text-white">
                <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Star size={14} className="text-yellow-300 fill-yellow-300" />
                            <span className="text-xs font-semibold text-purple-200 uppercase">Hồ sơ thành tích</span>
                        </div>
                        <h1 className="text-3xl font-black">Chứng chỉ &amp; Kết quả</h1>
                        <p className="mt-1.5 text-purple-200 text-sm font-medium">
                            Quản lý và tải về các chứng chỉ điện tử của bạn
                        </p>
                    </div>
                    <div className="hidden md:flex w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm shadow-inner items-center justify-center">
                        <Award size={40} className="text-white" />
                    </div>
                </div>
            </div>

            {/* ── Summary Stats ─────────────────────────────────────────── */}
            <div className="anim-fade-up grid grid-cols-3 gap-4">
                <MiniStat
                    icon={Trophy}
                    label="Tổng chứng chỉ"
                    value={totalCerts}
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                    bgLight="bg-amber-50"
                    textColor="text-amber-700"
                />
                <MiniStat
                    icon={BookOpen}
                    label="Đang học"
                    value={studyingCount}
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    bgLight="bg-blue-50"
                    textColor="text-blue-700"
                />
                <MiniStat
                    icon={CheckCircle}
                    label="Đã hoàn thành"
                    value={completed}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                    bgLight="bg-emerald-50"
                    textColor="text-emerald-700"
                />
            </div>

            {/* ── Certificates Grid or Empty State ──────────────────────── */}
            {fetching ? (
                <div className="anim-fade-up">
                    <CertSkeleton />
                </div>
            ) : totalCerts > 0 ? (
                <div className="anim-fade-up">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow">
                            <GraduationCap size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Chứng chỉ của bạn</h2>
                            <p className="text-xs text-slate-500 font-bold">{totalCerts} chứng chỉ đã được cấp</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {certs.map((cert, idx) => (
                            <CertCard key={cert.id || idx} cert={cert} index={idx} />
                        ))}
                    </div>
                </div>
            ) : (
                <Card className="anim-fade-up border border-dashed border-purple-200 bg-purple-50/40 rounded-3xl shadow-none">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center px-8">
                        {/* layered icon illustration */}
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shadow-inner">
                                <Award size={48} className="text-violet-400" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-md">
                                <Star size={14} className="text-white fill-white" />
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-slate-700 mb-2">Chưa có chứng chỉ nào</h3>
                        <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-1">
                            Hoàn thành khóa học để nhận chứng chỉ của bạn
                        </p>
                        <p className="text-xs text-slate-400 max-w-xs font-bold">
                            Mỗi chứng chỉ là minh chứng cho sự nỗ lực và thành tích học tập của bạn.
                        </p>

                        <div className="mt-8 flex items-center gap-6 text-xs text-slate-400 font-bold">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle size={14} className="text-emerald-400" />
                                <span>Hoàn thành khóa học</span>
                            </div>
                            <div className="w-px h-4 bg-slate-200" />
                            <div className="flex items-center gap-1.5">
                                <Award size={14} className="text-violet-400" />
                                <span>Nhận chứng chỉ</span>
                            </div>
                            <div className="w-px h-4 bg-slate-200" />
                            <div className="flex items-center gap-1.5">
                                <Download size={14} className="text-blue-400" />
                                <span>Tải về PDF</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
