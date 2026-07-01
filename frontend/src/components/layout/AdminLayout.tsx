// @ts-nocheck
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
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-[var(--admin-bg)]">
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
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#f0f9ff_0%,#dff3ff_48%,#e0f2fe_100%)]" />

                {/* Desktop Top Bar */}
                <header className="relative z-20 flex items-center justify-between h-[var(--vt-admin-topbar-height,74px)] px-[var(--vt-admin-page-padding-x,24px)] bg-[rgba(255,255,255,0.96)] backdrop-blur-xl border-b border-[rgba(14,165,233,0.18)] shadow-[0_8px_22px_-20px_rgba(14,165,233,0.16)] shrink-0">
                    <div className="flex min-w-0 items-center gap-3.5">
                        {ActiveIcon && (
                            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[rgba(14,165,233,0.12)] text-[var(--admin-ink)] shadow-none ring-1 ring-[rgba(14,165,233,0.18)]">
                                <ActiveIcon size={18} strokeWidth={2.5} />
                            </div>
                        )}
                        <div className="min-w-0">
                            {activeGroupLabel ? (
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--admin-champagne)]">{activeGroupLabel}</div>
                            ) : null}
                            <h1 className="truncate text-[19px] font-black text-[var(--admin-ink)] tracking-tight">
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
                            className="flex items-center gap-2 rounded-full border border-[rgba(14,165,233,0.18)] bg-[rgba(255,255,255,0.88)] px-3.5 py-2 text-xs font-bold text-[var(--admin-text-muted)] shadow-sm transition-colors hover:bg-white"
                            data-tour="admin-desktop-search"
                        >
                            <Search size={14} />
                            <span>Tìm kiếm</span>
                            <kbd className="ml-1 rounded-full border border-[rgba(37,99,235,0.12)] bg-[var(--admin-paper-deep)] px-2 py-0.5 text-[10px] font-mono text-[var(--admin-text-muted)]">Ctrl+K</kbd>
                        </button>
                        <div className="hidden rounded-full border border-[rgba(14,165,233,0.18)] bg-[rgba(255,255,255,0.88)] px-3 py-2 text-xs font-bold text-[var(--admin-text-muted)] shadow-sm xl:flex xl:items-center xl:gap-2">
                            <span className="h-2 w-2 rounded-full bg-[var(--admin-champagne)]" />
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
