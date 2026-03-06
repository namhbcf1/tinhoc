import { useState, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, CreditCard, Award, FileText, Bell, MessageSquare, LogOut, GraduationCap, UserCircle, X, Video, ClipboardList, ExternalLink, ClipboardCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import StudentProfileEditor from '../profile/StudentProfileEditor';
import api from '../../services/api';
import './DashboardSidebar.css';

// Đọc student_data an toàn từ cả localStorage và sessionStorage
function safeReadStudentData() {
    try {
        const raw = localStorage.getItem('student_data') || sessionStorage.getItem('student_data');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) {
            localStorage.removeItem('student_data');
            sessionStorage.removeItem('student_data');
            return {};
        }
        return parsed;
    } catch {
        localStorage.removeItem('student_data');
        sessionStorage.removeItem('student_data');
        return {};
    }
}

export default function DashboardSidebar({ userType = 'student', isOpen, onClose, studentData: studentDataProp }) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [localData, setLocalData] = useState(() => studentDataProp || safeReadStudentData());

    // Sync khi studentDataProp thay đổi (ví dụ sau khi fetch từ API xong)
    useEffect(() => {
        if (studentDataProp && Object.keys(studentDataProp).length > 0) {
            setLocalData(studentDataProp);
            setCurrentStudent(studentDataProp);
        }
    }, [studentDataProp]);

    const menuItems = [
        { icon: ClipboardCheck, label: 'Lịch thi', to: '/dashboard/exams' },
        { icon: Video, label: 'Lớp học', to: '/dashboard/my-classes' },
        { icon: GraduationCap, label: 'Học tập', external: 'https://vantrangexam.pages.dev/#/login' },
        { icon: Calendar, label: 'Lịch học', to: '/dashboard/schedule' },
        { icon: CreditCard, label: 'Học phí', to: '/dashboard/payment' },
    ];

    const secondaryItems = [
        { icon: FileText, label: 'Tài liệu', to: '/dashboard/documents' },
        { icon: Award, label: 'Chứng chỉ', to: '/dashboard/certificates' },
        { icon: MessageSquare, label: 'Tin nhắn', to: '/dashboard/messages' },
        { icon: ClipboardList, label: 'Điểm danh', to: '/dashboard/attendance' },
    ];

    const [currentStudent, setCurrentStudent] = useState(() => studentDataProp || safeReadStudentData());

    const handleOpenProfile = async () => {
        // Use current state data (from prop or localStorage) - not just localStorage
        const latestData = localData && Object.keys(localData).length > 0
            ? localData
            : safeReadStudentData();
        setCurrentStudent(latestData);
        setLocalData(latestData);
        setIsProfileOpen(true);

        // Then try to refresh with latest data from API in background
        const cccd = latestData.cccd || localStorage.getItem('student_cccd') || sessionStorage.getItem('student_cccd');
        if (cccd) {
            try {
                const res = await api.getStudentByCCCD(cccd);
                if (res.success && res.data) {
                    setCurrentStudent(res.data);
                    setLocalData(res.data);
                }
            } catch (error) {
                console.error("Failed to refresh profile:", error);
            }
        }
    };

    const handleProfileUpdate = () => {
        // Đọc lại student_data từ localStorage (đã được StudentProfileEditor cập nhật)
        setLocalData(safeReadStudentData());
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* aria-label on aside for landmark navigation (fix #7) */}
            <aside
                aria-label="Menu điều hướng"
                className={cn(
                    "dashboard-sidebar fixed inset-y-0 left-0 z-40 w-[280px] bg-white border-r border-slate-200/60 text-slate-700 shadow-[4px_0_24px_rgba(15,23,42,0.04)] md:shadow-none flex flex-col",
                    "transition-transform duration-300 ease-in-out md:translate-x-0 will-change-transform",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Sidebar Header */}
                <div className="h-[76px] shrink-0 flex items-center justify-between px-6 border-b border-slate-100 bg-white/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                            <span className="font-black text-[20px]">V</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="font-extrabold text-[17px] text-slate-800 tracking-tight leading-tight">
                                VanTrang<span className="text-emerald-600">Edu</span>
                            </span>
                            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">Học viên</span>
                        </div>
                    </div>
                    <button
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* User Mini Profile — changed <div> to <button> for keyboard access (fix #6) */}
                <div className="px-5 mt-6 mb-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleOpenProfile}
                        title="Bấm để cập nhật hồ sơ"
                        className="p-3 bg-white border border-slate-200/60 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-200 transition-all duration-200 group shadow-sm hover:shadow-md text-left w-full"
                    >
                        <div className="w-11 h-11 rounded-[14px] bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner group-hover:scale-105 transition-transform duration-300 shrink-0">
                            {(localData?.image_3x4 || localData?.avatar) ? (
                                <img src={localData.image_3x4 || localData.avatar} alt="Avatar" className="w-full h-full rounded-[12px] object-cover" />
                            ) : (
                                <UserCircle size={26} strokeWidth={2} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-center">
                            <p className="text-[14px] font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors leading-tight">
                                {localData.ho_ten_full || localData.fullName || localData.ten || 'Học viên'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                                {/* aria-hidden on decorative pulse dot (fix #9) */}
                                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[12px] font-semibold text-slate-500 truncate mt-0.5 leading-none group-hover:text-emerald-600 transition-colors tracking-tight">
                                    {localData.cccd ? `ID: ${localData.cccd.slice(-4)}` : 'Đang trực tuyến'}
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                    <div className="px-3 mb-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Menu chính
                    </div>
                    <ul className="space-y-1">
                        {menuItems.map((item) => (
                            <li key={item.to || item.external}>
                                {item.external ? (
                                    <a
                                        href={item.external}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-bold transition-all duration-200 group relative",
                                            "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                        onClick={() => onClose && window.innerWidth < 768 && onClose()}
                                    >
                                        <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200 bg-slate-100 text-slate-400 group-hover:bg-slate-200/50 group-hover:text-slate-600">
                                            <item.icon size={18} strokeWidth={2} />
                                        </div>
                                        {/* External link indicator for screen readers (fix #8) */}
                                        <span className="flex-1 text-left leading-none tracking-tight">
                                            {item.label}
                                            <ExternalLink size={12} className="inline ml-1 opacity-60" aria-hidden="true" />
                                            <span className="sr-only">(mở tab mới)</span>
                                        </span>
                                    </a>
                                ) : (
                                <NavLink
                                    to={item.to}
                                    end={item.to === '/dashboard'}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-bold transition-all duration-200 group relative",
                                        isActive
                                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                    onClick={() => onClose && window.innerWidth < 768 && onClose()}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className={cn(
                                                "flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200",
                                                isActive
                                                    ? "bg-emerald-600/50 text-white shadow-inner"
                                                    : "bg-slate-100 text-slate-400 group-hover:bg-slate-200/50 group-hover:text-slate-600"
                                            )}>
                                                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span className="flex-1 text-left leading-none tracking-tight">{item.label}</span>
                                            {isActive && (
                                                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                                            )}
                                        </>
                                    )}
                                </NavLink>
                                )}
                            </li>
                        ))}
                    </ul>

                    <div className="px-3 mt-5 mb-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Tiện ích
                    </div>
                    <ul className="space-y-1">
                        {secondaryItems.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-bold transition-all duration-200 group relative",
                                        isActive
                                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                    onClick={() => onClose && window.innerWidth < 768 && onClose()}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className={cn(
                                                "flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200",
                                                isActive
                                                    ? "bg-emerald-600/50 text-white shadow-inner"
                                                    : "bg-slate-100 text-slate-400 group-hover:bg-slate-200/50 group-hover:text-slate-600"
                                            )}>
                                                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span className="flex-1 text-left leading-none tracking-tight">{item.label}</span>
                                            {isActive && (
                                                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Footer actions */}
                <div className="p-5 border-t border-slate-100 shrink-0 bg-slate-50/50">
                    <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 font-bold text-[14px] transition-all duration-200 hover:bg-red-100 hover:border-red-300 focus:ring-4 focus:ring-red-100/50 shadow-sm"
                        onClick={() => {
                            api.logoutRole('student');
                            window.location.href = '/login';
                        }}
                    >
                        <LogOut size={18} strokeWidth={2.5} />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Profile Editor Modal */}
            <StudentProfileEditor
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                studentData={currentStudent}
                onUpdateSuccess={handleProfileUpdate}
            />
        </>
    );
}
