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
                <header className="relative z-20 flex items-center justify-between h-14 px-5 bg-white/96 backdrop-blur-xl border-b border-[rgba(14,165,233,0.12)] shrink-0">
                    <div className="flex min-w-0 items-center gap-2.5">
                        {ActiveIcon && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[rgba(14,165,233,0.10)] text-[var(--admin-ink)]">
                                <ActiveIcon size={16} strokeWidth={2.5} />
                            </div>
                        )}
                        <div className="min-w-0">
                            {activeGroupLabel ? (
                                <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--admin-champagne)]">{activeGroupLabel}</div>
                            ) : null}
                            <h1 className="truncate text-[16px] font-black text-[var(--admin-ink)] tracking-tight">
                                {activeTabMeta?.title || activeTabMeta?.label || 'Admin'}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { const evt = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }); window.dispatchEvent(evt); }}
                            className="flex items-center gap-1.5 rounded-lg border border-[rgba(14,165,233,0.18)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--admin-text-muted)] hover:bg-white">
                            <Search size={13} />
                            <span className="hidden sm:inline">Tìm kiếm</span>
                            <kbd className="rounded border border-[rgba(37,99,235,0.12)] bg-[var(--admin-paper-deep)] px-1.5 py-0.5 text-[9px] font-mono">Ctrl+K</kbd>
                        </button>
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
