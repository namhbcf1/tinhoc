import React, { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminMobileLayout from './AdminMobileLayout';
import ScrollToTopButton from '../ui/ScrollToTopButton';
import { useDeviceType } from '../../utils/deviceDetection';
import { getAdminTabById } from '../../pages/admin/adminTabs';

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
                <header className="relative z-20 flex items-center justify-between h-14 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shrink-0">
                    <div className="flex items-center gap-2.5">
                        {ActiveIcon && (
                            <ActiveIcon size={18} className="text-emerald-600" strokeWidth={2.5} />
                        )}
                        <h1 className="text-[15px] font-bold text-slate-800 tracking-tight">
                            {activeTabMeta?.label || 'Admin'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const evt = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
                                window.dispatchEvent(evt);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            data-tour="admin-desktop-search"
                        >
                            <Search size={14} />
                            <span>Tìm kiếm</span>
                            <kbd className="ml-1 text-[10px] font-mono bg-white border border-slate-200 px-1 rounded text-slate-500">Ctrl+K</kbd>
                        </button>
                        <span className="text-xs font-semibold text-slate-400">
                            {admin?.full_name}
                        </span>
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
