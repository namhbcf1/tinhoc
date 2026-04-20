import React, { useState } from 'react';
import { Search } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminMobileLayout from './AdminMobileLayout';
import ScrollToTopButton from '../ui/ScrollToTopButton';
import { useDeviceType } from '../../utils/deviceDetection';
import { ADMIN_TAB_GROUP_LABELS, getAdminTabById } from '../../pages/admin/adminTabs';

export default function AdminLayout({
    children,
    admin,
    activeTab,
    setActiveTab,
    onLogout
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { isMobile } = useDeviceType();

    // Use mobile layout for mobile devices
    if (isMobile) {
        return (
            <AdminMobileLayout
                admin={admin}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onLogout={onLogout}
            >
                {children}
            </AdminMobileLayout>
        );
    }

    const activeTabMeta = getAdminTabById(activeTab);
    const ActiveIcon = activeTabMeta?.icon;
    const activeGroupLabel = activeTabMeta?.group ? ADMIN_TAB_GROUP_LABELS[activeTabMeta.group] : null;

    // Desktop layout
    return (
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-[#edf3ef]">
            {/* Sidebar - w-[280px] fixed width */}
            <AdminSidebar
                admin={admin}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onLogout={onLogout}
            />

            {/* Main Content Wrapper - flex-1 takes remaining width after 280px sidebar */}
            <div className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_24%)]" />

                {/* Desktop Top Bar */}
                <header className="relative z-20 flex items-center justify-between h-[var(--vt-admin-topbar-height,74px)] px-[var(--vt-admin-page-padding-x,24px)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.76))] backdrop-blur-md border-b border-slate-200/60 shrink-0">
                    <div className="flex min-w-0 items-center gap-3.5">
                        {ActiveIcon && (
                            <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-white text-emerald-600 shadow-[0_14px_28px_-20px_rgba(16,185,129,0.55)] ring-1 ring-emerald-100">
                                <ActiveIcon size={18} strokeWidth={2.5} />
                            </div>
                        )}
                        <div className="min-w-0">
                            {activeGroupLabel ? (
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{activeGroupLabel}</div>
                            ) : null}
                            <h1 className="truncate text-[18px] font-black text-slate-900 tracking-tight">
                                {activeTabMeta?.title || activeTabMeta?.label || 'Admin'}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const evt = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
                                window.dispatchEvent(evt);
                            }}
                            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
                            data-tour="admin-desktop-search"
                        >
                            <Search size={14} />
                            <span>Tìm kiếm</span>
                            <kbd className="ml-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-500">Ctrl+K</kbd>
                        </button>
                        <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm xl:flex xl:items-center xl:gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {admin?.full_name}
                        </div>
                    </div>
                </header>

                {/* Content Area - overflow-x hidden prevents horizontal scroll, each page handles own padding */}
                <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden w-full" id="main-scroll" data-tour="admin-desktop-main">
                    {children}
                    <ScrollToTopButton />
                </main>
            </div>
        </div>
    );
}
