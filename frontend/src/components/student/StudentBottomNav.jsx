import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Calendar, CalendarCheck, CreditCard, GraduationCap } from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';

const EXTERNAL_URL = 'https://vantrangexam.pages.dev/#/login';

const menuItems = [
    { id: 'exams', label: 'Lịch thi', icon: CalendarCheck, path: '/dashboard/exams' },
    { id: 'my-classes', label: 'Lớp học', icon: BookOpen, path: '/dashboard/my-classes' },
    { id: 'learning', label: 'Học tập', icon: GraduationCap, external: EXTERNAL_URL },
    { id: 'schedule', label: 'Lịch học', icon: Calendar, path: '/dashboard/schedule' },
    { id: 'payment', label: 'Học phí', icon: CreditCard, path: '/dashboard/payment' },
];

export default function StudentBottomNav() {
    const { platform } = useDeviceType();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
            style={{ paddingBottom: platform === 'ios' ? 'env(safe-area-inset-bottom)' : '0' }}
        >
            <div className="flex items-stretch h-[66px] px-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.path && location.pathname.includes(item.id);

                    return (
                        <button
                            key={item.id}
                            onClick={() => item.external ? window.open(item.external, '_blank') : navigate(item.path, { replace: true })}
                            className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200 active:scale-95 outline-none rounded-xl mx-0.5"
                            aria-label={item.label}
                        >
                            {isActive && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-emerald-500" />
                            )}

                            <div className={`flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200 ${
                                isActive
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'text-slate-400'
                            }`}>
                                <Icon size={isActive ? 21 : 20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>

                            <span className={`text-[10px] font-semibold leading-none transition-colors ${
                                isActive ? 'text-emerald-700' : 'text-slate-500'
                            }`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
