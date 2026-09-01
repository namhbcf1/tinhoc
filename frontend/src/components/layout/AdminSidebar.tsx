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
                <div className="flex items-center justify-between h-16 px-5 border-b border-[rgba(14,165,233,0.18)] shrink-0 bg-white/55">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-[14px] bg-[rgba(14,165,233,0.14)] flex items-center justify-center shrink-0">
                            <LayoutDashboard size={18} className="text-[var(--admin-ink)]" strokeWidth={2.5}/>
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--admin-champagne)]">VanTrangEdu</span>
                            <span className="font-extrabold text-[16px] text-[var(--admin-ink)] tracking-tight leading-tight block">Admin<span className="text-[var(--admin-champagne)]">OS</span></span>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={16} /></button>
                </div>

                {/* Admin Info Card */}
                <div className="px-4 mt-3 mb-1 shrink-0">
                    <div className="p-2.5 rounded-[16px] flex items-center gap-2.5 border border-[rgba(14,165,233,0.18)] bg-white/70">
                        <div className="w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 font-black text-[13px] bg-white text-[var(--admin-ink)]">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[13px] text-[var(--admin-ink)] truncate">{admin?.full_name || 'Admin'}</h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-champagne)]" />
                                <span className="text-[11px] font-bold text-[var(--admin-text-muted)]">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar" data-tour="admin-desktop-nav">
                    {GROUP_ORDER.map((groupKey) => {
                        const visibleItems = desktopTabs.filter((item) => item.group === groupKey);
                        if (!visibleItems.length) return null;
                        return (
                            <div key={groupKey}>
                                <div className="px-3 pb-1 pt-2 text-[10px] font-bold tracking-wider text-[var(--admin-text-muted)] uppercase">
                                    {ADMIN_TAB_GROUP_LABELS[groupKey]}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button key={item.id} onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) onClose(); }}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] transition-all group relative ${isActive ? 'bg-[rgba(37,99,235,0.10)] text-[var(--admin-ink)] font-bold' : 'text-[var(--admin-text-muted)] font-medium hover:bg-[rgba(37,99,235,0.06)] hover:text-[var(--admin-ink)]'}`}>
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0 ${isActive ? 'bg-[rgba(37,99,235,0.14)] text-[var(--admin-ink)]' : 'text-[var(--admin-text-muted)]'}`}>
                                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span className="flex-1 text-left text-[13px] leading-none">{item.label}</span>
                                            {isActive && <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--admin-champagne)]" />}
                                        </button>
                                    );
                                })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-[rgba(14,165,233,0.18)] shrink-0 bg-white/50">
                    <button onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[14px] border border-[rgba(185,28,28,0.18)] bg-white text-red-600 font-bold text-[13px] hover:bg-red-50">
                        <LogOut size={16} strokeWidth={2.5} />
                        Đăng xuất
                    </button>
                </div>
            </aside>
        </>
    );
}
