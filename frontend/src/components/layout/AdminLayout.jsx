import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminMobileLayout from './AdminMobileLayout';
import ScrollToTopButton from '../ui/ScrollToTopButton';
import { useDeviceType } from '../../utils/deviceDetection';

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

    // Desktop layout
    return (
        <div className="min-h-screen bg-slate-50 flex flex-row w-full overflow-hidden">
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
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-lg text-slate-800">Admin Panel</span>
                    </div>
                </header>

                {/* Content Area - overflow-x hidden prevents horizontal scroll, each page handles own padding */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden w-full" id="main-scroll">
                    {children}
                    <ScrollToTopButton />
                </main>
            </div>
        </div>
    );
}
