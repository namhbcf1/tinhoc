import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import { Button } from '../ui/Button';
import './ModernDashboardLayout.css';

export default function ModernDashboardLayout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile Sidebar Overlay - Enhanced for better UX */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 md:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        animation: 'fadeIn 0.2s ease-out',
                    }}
                />
            )}

            {/* Sidebar */}
            <DashboardSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content - offset by the exact sidebar width (280px) */}
            <div className="flex flex-col md:pl-[280px] min-h-screen">
                {/* Top Header for Mobile */}
                <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={20} />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                    <span className="font-bold text-lg text-slate-800">VanTrangEdu</span>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden max-w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
