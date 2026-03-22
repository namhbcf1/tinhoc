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
                    "fixed inset-y-0 left-0 z-30 flex flex-col md:static md:h-screen w-[280px] bg-white border-r border-slate-200/60 shadow-[4px_0_24px_rgba(15,23,42,0.04)]",
                    "transition-transform duration-300 ease-in-out md:translate-x-0 will-change-transform",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
                data-tour="admin-desktop-sidebar"
            >
                {/* Logo Section */}
                <div className="flex items-center justify-between h-[76px] px-6 border-b border-slate-100 shrink-0 bg-white/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                            <LayoutDashboard size={22} className="text-white" strokeWidth={2.5}/>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="font-extrabold text-[17px] text-slate-800 tracking-tight leading-tight">Admin<span className="text-emerald-600">Panel</span></span>
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
                <div className="px-5 mt-6 mb-2 shrink-0">
                    <div className={cn(
                        "p-3 rounded-2xl flex items-center gap-3 border transition-all duration-200 shadow-sm cursor-default",
                        isSuperAdmin
                            ? "bg-amber-50/50 border-amber-200/50 hover:bg-amber-50"
                            : "bg-emerald-50/50 border-emerald-200/50 hover:bg-emerald-50"
                    )}>
                        <div className={cn(
                            "w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[15px] shadow-md border-2 border-white",
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
                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar" data-tour="admin-desktop-nav">
                    {GROUP_ORDER.map((groupKey) => {
                        const visibleItems = desktopTabs.filter((item) => item.group === groupKey);
                        if (!visibleItems.length) return null;
                        return (
                            <div key={groupKey} className="flex flex-col gap-1">
                                <div className="px-3 mb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                    {ADMIN_TAB_GROUP_LABELS[groupKey]}
                                </div>
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) onClose(); }}
                                            data-tour={`admin-desktop-nav-${item.id}`}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group relative",
                                                isActive
                                                    ? "bg-emerald-50 text-emerald-700 font-bold"
                                                    : "text-slate-600 font-semibold hover:bg-slate-50 hover:text-slate-900"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200",
                                                isActive
                                                    ? "bg-emerald-100/80 text-emerald-600 shadow-sm"
                                                    : "bg-slate-100 text-slate-400 group-hover:bg-slate-200/50 group-hover:text-slate-600"
                                            )}>
                                                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span className="flex-1 text-left text-[14px] leading-none tracking-tight">
                                                {item.label}
                                            </span>
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-5 border-t border-slate-100 shrink-0 bg-slate-50/50">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 font-bold text-[14px] transition-all duration-200 hover:bg-red-100 hover:border-red-300 focus:ring-4 focus:ring-red-100/50 shadow-sm"
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
