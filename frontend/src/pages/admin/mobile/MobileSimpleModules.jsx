import React, { useState, useEffect } from 'react';
import {
    Search, FileText, CheckCircle, XCircle, Shield, Database,
    Award, BarChart2, RefreshCw, Clock, ChevronRight, Globe
} from 'lucide-react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

// ── Shared: Module Header ────────────────────────────────────────────────────
const ModuleHeader = ({ icon: Icon, title, count, iconBg, iconColor }) => (
    <div
        className="mx-4 mt-3 mb-4 rounded-2xl p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
    >
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10"
            style={{ transform: 'translate(30%,-30%)' }} />
        <div className="flex items-center justify-between relative">
            <div>
                <h3 className="text-white font-bold text-base">{title}</h3>
                {count !== undefined && (
                    <p className="text-blue-200 text-xs font-medium mt-0.5">{count} mục</p>
                )}
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Icon size={20} className="text-white" />
            </div>
        </div>
    </div>
);

// ── Shared: Search Bar ───────────────────────────────────────────────────────
const SearchBar = ({ value, onChange, placeholder }) => (
    <div className="px-4 mb-3 relative">
        <Search size={15} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 pl-8 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400"
        />
    </div>
);

// ── Shared: Empty State ──────────────────────────────────────────────────────
const EmptyState = ({ message = 'Không có dữ liệu' }) => (
    <div className="py-14 text-center text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <FileText size={24} className="text-slate-300" />
        </div>
        <p className="text-sm font-medium">{message}</p>
    </div>
);

// ── Shared: Loading Skeleton ─────────────────────────────────────────────────
const SkeletonList = () => (
    <div className="px-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-14 animate-pulse border border-slate-100" />
        ))}
    </div>
);

// ── Generic Module ───────────────────────────────────────────────────────────
const GenericModule = ({ headerIcon, headerTitle, fetchFn, renderItem, searchKey, emptyMessage }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetchFn();
            const list = Array.isArray(res) ? res : (res?.data || res?.results || []);
            setData(list);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = search
        ? data.filter(item => {
            const term = search.toLowerCase();
            if (searchKey) return (item[searchKey] || '').toLowerCase().includes(term);
            return (item.title || item.name || item.full_name || '').toLowerCase().includes(term);
        })
        : data;

    return (
        <PullToRefreshWrapper onRefresh={load}>
            <div style={{ paddingBottom: 'calc(var(--mb-bottom-nav-height, 70px) + 16px)' }}>
                <ModuleHeader icon={headerIcon} title={headerTitle} count={loading ? undefined : data.length} />
                <SearchBar value={search} onChange={setSearch} placeholder={`Tìm ${headerTitle.toLowerCase()}...`} />

                {loading ? <SkeletonList /> : filtered.length === 0 ? (
                    <EmptyState message={emptyMessage || `Không có ${headerTitle.toLowerCase()}`} />
                ) : (
                    <div className="px-4 space-y-2">
                        {filtered.map((item, idx) => (
                            <div key={item.id || idx} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                {renderItem(item)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </PullToRefreshWrapper>
    );
};

// ── Posts Module ─────────────────────────────────────────────────────────────
export const MobilePostsModule = () => (
    <GenericModule
        headerIcon={FileText}
        headerTitle="Bài viết"
        fetchFn={() => api.getPosts()}
        searchKey="title"
        renderItem={(post) => (
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{post.title || 'Bài viết'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {post.created_at ? new Date(post.created_at).toLocaleDateString('vi-VN') : ''}
                    </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${post.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {post.published ? 'Đã đăng' : 'Nháp'}
                </span>
            </div>
        )}
    />
);

// ── Homepage Module ───────────────────────────────────────────────────────────
export const MobileHomepageModule = () => (
    <GenericModule
        headerIcon={Globe}
        headerTitle="Homepage"
        fetchFn={async () => {
            try {
                const res = await api.getHomepageSettings();
                return Object.entries(res.data || res).map(([key, value]) => ({ id: key, title: key, value }));
            } catch { return []; }
        }}
        renderItem={(section) => (
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Globe size={16} className="text-blue-500" />
                </div>
                <p className="flex-1 text-sm font-semibold text-slate-800 capitalize">
                    {section.title.replace(/_/g, ' ')}
                </p>
                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
            </div>
        )}
    />
);

// ── Certificates Module ───────────────────────────────────────────────────────
export const MobileCertificatesModule = () => (
    <GenericModule
        headerIcon={Award}
        headerTitle="Chứng chỉ"
        fetchFn={() => api.getCertificates()}
        searchKey="student_name"
        renderItem={(cert) => (
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                    <Award size={16} className="text-pink-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                        {cert.student_name || 'Học viên'}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                        {cert.certificate_name || cert.course_name || '—'}
                    </p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">
                    {cert.issue_date
                        ? new Date(cert.issue_date).toLocaleDateString('vi-VN')
                        : cert.created_at
                            ? new Date(cert.created_at).toLocaleDateString('vi-VN')
                            : ''}
                </span>
            </div>
        )}
    />
);

// ── Reports Module ────────────────────────────────────────────────────────────
export const MobileReportsModule = () => (
    <div style={{ paddingBottom: 'calc(var(--mb-bottom-nav-height, 70px) + 16px)' }}>
        <ModuleHeader icon={BarChart2} title="Báo cáo" />
        <div className="px-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                    <BarChart2 size={26} className="text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Báo cáo chi tiết</p>
                <p className="text-xs text-slate-400 mt-1">Vui lòng xem trên màn hình Desktop để có trải nghiệm tốt nhất</p>
            </div>
        </div>
    </div>
);

// ── Logs Module ───────────────────────────────────────────────────────────────
export const MobileLogsModule = () => (
    <GenericModule
        headerIcon={Clock}
        headerTitle="Nhật ký hoạt động"
        fetchFn={() => api.getActivityLogs(null, 50, 0)}
        renderItem={(log) => (
            <div className="flex items-start gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock size={15} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-snug">
                        <span className="font-bold text-blue-600">{log.admin_name || log.user || 'Hệ thống'}</span>
                        {' '}{log.action}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{log.created_at || log.timestamp}</p>
                </div>
            </div>
        )}
    />
);

// ── Backup Module ─────────────────────────────────────────────────────────────
export const MobileBackupModule = () => (
    <GenericModule
        headerIcon={Database}
        headerTitle="Sao lưu dữ liệu"
        fetchFn={async () => {
            try {
                const res = await api.listBackups();
                return Array.isArray(res) ? res : (res.data || []);
            } catch { return []; }
        }}
        emptyMessage="Không có bản sao lưu"
        renderItem={(backup) => (
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Database size={15} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                        {backup.key || backup.filename || 'Backup'}
                    </p>
                    {backup.size && (
                        <p className="text-xs text-slate-400 mt-0.5">{backup.size}</p>
                    )}
                </div>
                <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
            </div>
        )}
    />
);

// ── Admins Module ─────────────────────────────────────────────────────────────
export const MobileAdminsModule = () => (
    <GenericModule
        headerIcon={Shield}
        headerTitle="Quản lý Admin"
        fetchFn={() => api.getAdmins(50, 0)}
        searchKey="full_name"
        renderItem={(adm) => (
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                    {(adm.full_name || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{adm.full_name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{adm.email}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${adm.role === 'super_admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {adm.role === 'super_admin' ? 'Super' : 'Admin'}
                </span>
            </div>
        )}
    />
);
