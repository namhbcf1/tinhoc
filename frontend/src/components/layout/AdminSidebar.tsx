// @ts-nocheck
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
                    className="fixed inset-0 z-20 bg-sky-200/45 backdrop-blur-sm md:hidden transition-opacity"
                    onClick={onClose}
                />
            )}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-30 flex flex-col md:static md:h-screen w-[var(--vt-admin-sidebar-width,292px)] bg-[linear-gradient(180deg,#ffffff_0%,#e0f2fe_54%,#bae6fd_100%)] border-r border-[rgba(14,165,233,0.18)] shadow-[8px_0_28px_-24px_rgba(14,165,233,0.16)]",
                    "transition-transform duration-300 ease-in-out md:translate-x-0 will-change-transform",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
                data-tour="admin-desktop-sidebar"
            >
                {/* Logo Section */}
                <div className="flex items-center justify-between h-[var(--vt-admin-sidebar-header-height,84px)] px-6 border-b border-[rgba(14,165,233,0.18)] shrink-0 bg-white/55">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[18px] bg-[rgba(14,165,233,0.14)] flex items-center justify-center shadow-none ring-1 ring-[rgba(14,165,233,0.14)] shrink-0">
                            <LayoutDashboard size={22} className="text-[var(--admin-ink)]" strokeWidth={2.5}/>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--admin-champagne)]">VanTrangEdu</span>
                            <span className="font-extrabold text-[18px] text-[var(--admin-ink)] tracking-tight leading-tight">Admin<span className="text-[var(--admin-champagne)]">OS</span></span>
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
                        "p-3.5 rounded-[22px] flex items-center gap-3 border transition-all duration-200 cursor-default bg-white/70",
                        isSuperAdmin
                            ? "border-[rgba(37,99,235,0.22)] hover:bg-white"
                            : "border-[rgba(14,165,233,0.18)] hover:bg-white"
                    )}>
                        <div className={cn(
                            "w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 font-black text-[15px] border border-white/15",
                            isSuperAdmin
                                ? "bg-[rgba(14,165,233,0.14)] text-[var(--admin-ink)]"
                                : "bg-white text-[var(--admin-ink)]"
                        )}>
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <h3 className="font-bold text-[14px] text-[var(--admin-ink)] truncate tracking-tight">
                                {admin?.full_name || 'Admin'}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-champagne)]" />
                                <span className={cn(
                                    "text-[12px] font-bold tracking-tight mt-0.5 leading-none",
                                    isSuperAdmin ? "text-[var(--admin-champagne)]" : "text-[var(--admin-text-muted)]"
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
                            <div key={groupKey} className="rounded-[22px] border border-[rgba(14,165,233,0.14)] bg-white/60 p-2.5">
                                <div className="px-3 pb-2 pt-1 text-[11px] font-black tracking-[0.16em] text-[var(--admin-text-muted)] uppercase">
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
                                                    ? "border-[rgba(37,99,235,0.22)] bg-white text-[var(--admin-ink)] font-black shadow-[0_10px_22px_-20px_rgba(14,165,233,0.16)]"
                                                    : "border-transparent text-[var(--admin-text-muted)] font-semibold hover:border-[rgba(14,165,233,0.18)] hover:bg-white hover:text-[var(--admin-ink)]"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex items-center justify-center w-10 h-10 rounded-[16px] shrink-0 transition-all duration-200",
                                                isActive
                                                    ? "bg-[rgba(14,165,233,0.14)] text-[var(--admin-ink)] shadow-none ring-1 ring-[rgba(14,165,233,0.14)]"
                                                    : "bg-[rgba(37,99,235,0.06)] text-[var(--admin-text-muted)] group-hover:bg-[rgba(37,99,235,0.10)] group-hover:text-[var(--admin-ink)]"
                                            )}>
                                                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span className="flex-1 text-left text-[14px] leading-none tracking-tight">
                                                {item.label}
                                            </span>
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[var(--admin-champagne)]" />
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
                <div className="p-5 border-t border-[rgba(14,165,233,0.18)] shrink-0 bg-white/50">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[20px] border border-[rgba(185,28,28,0.18)] bg-white text-[var(--admin-danger)] font-bold text-[14px] transition-all duration-200 hover:bg-[rgba(155,93,85,0.08)] focus:ring-4 focus:ring-[rgba(155,93,85,0.10)] shadow-none"
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
