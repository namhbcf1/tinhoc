// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { FileText, Calendar, Clock, MapPin } from 'lucide-react';
import { formatDateVN } from '../../../utils/dateUtils';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';

type FilterTab = 'all' | 'upcoming' | 'past';

export default function MobileMyExamsModule() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');

    useEffect(() => {
        loadExams();
    }, []);
    useAdminAutoRefresh(() => loadExams(), { minIntervalMs: 15000 });

    const loadExams = async () => {
        setLoading(true);
        try {
            const response = await api.cachedRequest(
                '/teachers/my-exams',
                { method: 'GET', tokenType: 'admin' },
                { ttlMs: 3 * 60 * 1000 }
            );
            if (response?.success && Array.isArray(response.data)) {
                setExams(response.data);
            }
        } catch (error) {
            console.error('Error loading exams:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredExams = useMemo(() => {
        if (activeTab === 'all') return exams;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return exams.filter((exam) => {
            const examDate = new Date(exam.exam_date || exam.ngay_thi);
            examDate.setHours(0, 0, 0, 0);
            if (activeTab === 'upcoming') return examDate >= now;
            return examDate < now;
        });
    }, [exams, activeTab]);

    const tabs: { id: FilterTab; label: string }[] = [
        { id: 'all', label: 'Tất cả' },
        { id: 'upcoming', label: 'Sắp tới' },
        { id: 'past', label: 'Đã qua' },
    ];

    return (
        <PullToRefreshWrapper onRefresh={loadExams}>
            <div style={{ paddingBottom: 'calc(var(--mb-bottom-nav-height, 70px) + 16px)' }}>
                {/* Header summary */}
                <div
                    className="mx-4 mt-3 mb-4 rounded-2xl p-4"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-bold text-base">Lịch thi của tôi</h3>
                            <p className="text-purple-200 text-xs font-medium mt-0.5">
                                {loading ? '...' : `${exams.length} bài thi được phân công`}
                            </p>
                        </div>
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                            <FileText size={20} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="mx-4 mb-4">
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                                    ${activeTab === tab.id
                                        ? 'bg-white text-purple-700 shadow-sm'
                                        : 'text-slate-500'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                            <p className="text-xs font-medium text-slate-500">Đang tải lịch thi...</p>
                        </div>
                    ) : filteredExams.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <FileText size={26} className="text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-semibold text-sm">
                                {activeTab === 'all'
                                    ? 'Chưa có bài thi nào'
                                    : activeTab === 'upcoming'
                                    ? 'Không có bài thi sắp tới'
                                    : 'Không có bài thi đã qua'}
                            </p>
                        </div>
                    ) : (
                        filteredExams.map((exam, idx) => {
                            const examDate = new Date(exam.exam_date || exam.ngay_thi);
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            examDate.setHours(0, 0, 0, 0);
                            const isPast = examDate < now;

                            return (
                                <div
                                    key={exam.id || exam.exam_id || idx}
                                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                                >
                                    {/* Color accent top bar */}
                                    <div
                                        className="h-1"
                                        style={{
                                            background: isPast
                                                ? 'linear-gradient(90deg, #94a3b8, #64748b)'
                                                : 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                                        }}
                                    />

                                    <div className="p-4 flex items-start gap-3">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg text-white"
                                            style={{
                                                background: isPast
                                                    ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                                                    : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                            }}
                                        >
                                            {(exam.exam_name || exam.ten_bai_thi || 'T').charAt(0)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">
                                                {exam.exam_name || exam.ten_bai_thi || 'Bài thi'}
                                            </h3>
                                            {(exam.class_name || exam.ten_lop) && (
                                                <p className="text-xs text-purple-600 font-medium mt-0.5 truncate">
                                                    {exam.class_name || exam.ten_lop}
                                                </p>
                                            )}
                                            <div className="mt-2 space-y-1">
                                                {(exam.exam_date || exam.ngay_thi) && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Calendar size={12} className="text-purple-400" />
                                                        <span>{formatDateVN(exam.exam_date || exam.ngay_thi)}</span>
                                                    </div>
                                                )}
                                                {(exam.duration || exam.thoi_luong) && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Clock size={12} className="text-purple-400" />
                                                        <span>{exam.duration || exam.thoi_luong} phút</span>
                                                    </div>
                                                )}
                                                {(exam.location || exam.dia_diem) && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <MapPin size={12} className="text-purple-400" />
                                                        <span className="truncate">{exam.location || exam.dia_diem}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <span
                                            className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                                            style={{
                                                background: isPast ? '#f1f5f9' : '#f5f3ff',
                                                color: isPast ? '#64748b' : '#7c3aed',
                                            }}
                                        >
                                            {isPast ? 'Đã qua' : 'Sắp tới'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </PullToRefreshWrapper>
    );
}
