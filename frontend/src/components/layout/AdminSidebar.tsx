import React from 'react';
import { LayoutDashboard, LogOut, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ADMIN_TAB_GROUP_LABELS, getAdminTabsForTarget, type AdminTabGroup } from '../../pages/admin/adminTabs';

const GROUP_ORDER: AdminTabGroup[] = ['overview', 'teaching', 'learning', 'finance', 'content', 'system'];

export default function AdminSidebar({ admin, activeTab, setActiveTab, isOpen, onClose, onLogout }) {
    const initials = admin?.full_name
        ? admin.full_name.trim().split(' ').filter(Boolean).slice(-2).map(w => w[0]).join('').toUpperCase()
        : 'A';
    const isSuperAdmin = admin?.role === 'super_admin';
    const desktopTabs = getAdminTabsForTarget(admin?.role, 'desktop', admin);

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity"
                    onClick={onClose}
                />
            )}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-30 flex flex-col md:static md:h-screen w-[var(--vt-admin-sidebar-width,292px)] bg-[linear-gradient(180deg,#fcfefd_0%,#f6fbf7_100%)] border-r border-slate-200/70 shadow-[10px_0_40px_rgba(15,23,42,0.05)]",
                    "transition-transform duration-300 ease-in-out md:translate-x-0 will-change-transform",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
                data-tour="admin-desktop-sidebar"
            >
                {/* Logo Section */}
                <div className="flex items-center justify-between h-[var(--vt-admin-sidebar-header-height,84px)] px-6 border-b border-slate-200/70 shrink-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.82))] backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[18px] bg-[linear-gradient(135deg,#059669_0%,#10b981_48%,#2dd4bf_100%)] flex items-center justify-center shadow-[0_18px_38px_-16px_rgba(16,185,129,0.65)] shrink-0">
                            <LayoutDashboard size={22} className="text-white" strokeWidth={2.5}/>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">VanTrangEdu</span>
                            <span className="font-extrabold text-[18px] text-slate-900 tracking-tight leading-tight">Learning<span className="text-emerald-600">OS</span></span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Admin Info Card */}
                <div className="px-5 mt-5 mb-1 shrink-0">
                    <div className={cn(
                        "p-3.5 rounded-[24px] flex items-center gap-3 border transition-all duration-200 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.28)] cursor-default bg-white/90 backdrop-blur-sm",
                        isSuperAdmin
                            ? "border-amber-200/70 hover:bg-amber-50"
                            : "border-emerald-200/70 hover:bg-emerald-50"
                    )}>
                        <div className={cn(
                            "w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 text-white font-black text-[15px] shadow-md border border-white/80",
                            isSuperAdmin
                                ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/20"
                                : "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20"
                        )}>
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <h3 className="font-bold text-[14px] text-slate-900 truncate tracking-tight">
                                {admin?.full_name || 'Admin'}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full animate-pulse",
                                    isSuperAdmin ? "bg-amber-500" : "bg-emerald-500"
                                )} />
                                <span className={cn(
                                    "text-[12px] font-bold tracking-tight mt-0.5 leading-none",
                                    isSuperAdmin ? "text-amber-700" : "text-emerald-700"
                                )}>
                                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar" data-tour="admin-desktop-nav">
                    {GROUP_ORDER.map((groupKey) => {
                        const visibleItems = desktopTabs.filter((item) => item.group === groupKey);
                        if (!visibleItems.length) return null;
                        return (
                            <div key={groupKey} className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,250,248,0.92))] p-2.5 shadow-[0_18px_34px_-32px_rgba(15,23,42,0.32)] backdrop-blur-sm">
                                <div className="px-3 pb-2 pt-1 text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                                    {ADMIN_TAB_GROUP_LABELS[groupKey]}
                                </div>
                                <div className="flex flex-col gap-1">
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) onClose(); }}
                                            data-tour={`admin-desktop-nav-${item.id}`}
                                            aria-current={isActive ? 'page' : undefined}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-3 rounded-[20px] transition-all duration-200 group relative border",
                                                isActive
                                                    ? "border-emerald-300 bg-[linear-gradient(135deg,#10b981_0%,#14b8a6_100%)] text-white font-bold shadow-[0_20px_34px_-22px_rgba(16,185,129,0.7)]"
                                                    : "border-transparent text-slate-600 font-semibold hover:border-slate-200 hover:bg-slate-50/80 hover:text-slate-900"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex items-center justify-center w-10 h-10 rounded-[16px] shrink-0 transition-all duration-200",
                                                isActive
                                                    ? "bg-white/18 text-white shadow-sm ring-1 ring-white/12"
                                                    : "bg-slate-100/80 text-slate-400 group-hover:bg-slate-200/70 group-hover:text-slate-600"
                                            )}>
                                                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span className="flex-1 text-left text-[14px] leading-none tracking-tight">
                                                {item.label}
                                            </span>
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-white/90" />
                                            )}
                                        </button>
                                    );
                                })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-5 border-t border-slate-200/70 shrink-0 bg-white/70">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[22px] border border-red-200 bg-[linear-gradient(180deg,#fff5f5_0%,#fff0f0_100%)] text-red-600 font-bold text-[14px] transition-all duration-200 hover:bg-red-100 hover:border-red-300 focus:ring-4 focus:ring-red-100/50 shadow-sm"
                        data-tour="admin-desktop-logout"
                    >
                        <LogOut size={18} strokeWidth={2.5} />
                        Đăng xuất
                    </button>
                </div>
            </aside>
        </>
    );
}
