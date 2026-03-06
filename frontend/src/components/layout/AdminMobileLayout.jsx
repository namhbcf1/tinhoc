import React, { useState, useEffect } from 'react';
import { Menu, Search, X, Bell, LogOut, User, ChevronRight, Home, Users, BookOpen, CreditCard, Award, FileText, Calendar, MessageSquare, Settings, ClipboardList } from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import './AdminMobileLayout.css';

export default function AdminMobileLayout({
    children,
    admin,
    activeTab,
    setActiveTab,
    onLogout
}) {
    const { platform } = useDeviceType();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [activeTab]);

    const getPageTitle = () => {
        const titles = {
            dashboard: 'Tổng quan',
            classes: 'Lớp học',
            students: 'Học viên',
            payments: 'Học phí',
            certificates: 'Chứng chỉ',
            posts: 'Bài viết',
            homepage: 'Homepage',
            documents: 'Tài liệu',
            reports: 'Báo cáo',
            teachers: 'Giáo viên',
            'exam-schedules': 'Lịch thi',
            admins: 'Quản lý Admin',
            backup: 'Sao lưu',
            profile: 'Cá nhân',
            logs: 'Nhật ký',
            assignments: 'Bài tập'
        };
        return titles[activeTab] || 'Admin Panel';
    };

    const menuItems = [
        { id: 'dashboard', label: 'Tổng quan', icon: Home },
        { id: 'classes', label: 'Lớp Online', icon: BookOpen },
        { id: 'students', label: 'Học viên', icon: Users },
        { id: 'payments', label: 'Học phí', icon: CreditCard },
        { id: 'teachers', label: 'Giáo viên', icon: User },
        { id: 'exam-schedules', label: 'Lịch thi', icon: Calendar },
        { id: 'certificates', label: 'Chứng chỉ', icon: Award },
        { id: 'documents', label: 'Tài liệu', icon: FileText },
        { id: 'assignments', label: 'Bài tập', icon: ClipboardList },
        { id: 'reports', label: 'Báo cáo', icon: MessageSquare },
        { id: 'posts', label: 'Bài viết', icon: FileText },
        { id: 'homepage', label: 'Homepage', icon: Settings },
    ];

    const adminItems = admin?.role === 'super_admin' ? [
        { id: 'admins', label: 'Quản lý Admin', icon: Users },
        { id: 'backup', label: 'Sao lưu', icon: Settings },
    ] : [];

    const bottomItems = [
        { id: 'dashboard', label: 'Tổng quan', icon: Home },
        { id: 'students', label: 'Học viên', icon: Users },
        { id: 'classes', label: 'Lớp', icon: BookOpen },
        { id: 'payments', label: 'Học phí', icon: CreditCard },
        { id: 'profile', label: 'Tôi', icon: User },
    ];

    return (
        <div className={`admin-mobile-layout ${platform}`}>
            {/* Header - Sử dụng CSS classes */}
            <header className="mobile-header admin">
                <div className="mobile-header-content">
                    <button
                        className="mobile-header-btn"
                        onClick={() => setIsMenuOpen(true)}
                        aria-label="Menu"
                    >
                        <Menu size={24} />
                    </button>

                    <h1 className="mobile-header-title">
                        {getPageTitle()}
                    </h1>

                    <div className="mobile-header-actions">
                        <button
                            className="mobile-header-btn"
                            aria-label="Search"
                        >
                            <Search size={20} />
                        </button>
                        <button
                            className="mobile-header-btn"
                            aria-label="Notifications"
                            style={{ position: 'relative' }}
                        >
                            <Bell size={20} />
                            <span className="mobile-notification-badge"></span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content - Sử dụng CSS classes */}
            <main className="mobile-content">
                {children}
            </main>

            {/* Bottom Navigation - Sử dụng CSS classes */}
            <nav className="mobile-bottom-nav admin">
                {bottomItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <Icon size={22} className="mobile-bottom-nav-icon" />
                            <span className="mobile-bottom-nav-label">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Side Menu Drawer - Sử dụng CSS classes */}
            {isMenuOpen && (
                <>
                    <div
                        className="mobile-overlay"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <aside className="mobile-drawer open">
                        {/* Drawer Header */}
                        <div className="mobile-drawer-header admin">
                            <div className="mobile-drawer-user">
                                <div className="mobile-drawer-avatar">
                                    {admin?.full_name?.charAt(0) || 'A'}
                                </div>
                                <div className="mobile-drawer-info">
                                    <h3 className="mobile-drawer-name">
                                        {admin?.full_name}
                                    </h3>
                                    <p className="mobile-drawer-role">
                                        {admin?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                    </p>
                                </div>
                            </div>
                            <button
                                className="mobile-drawer-close"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Menu Items */}
                        <nav className="mobile-drawer-nav">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        className={`mobile-drawer-item ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <div className="mobile-drawer-item-icon">
                                            <Icon size={20} />
                                        </div>
                                        <span className="mobile-drawer-item-label">{item.label}</span>
                                        <ChevronRight size={18} className="mobile-drawer-item-arrow" />
                                    </button>
                                );
                            })}

                            {adminItems.length > 0 && (
                                <>
                                    <div className="mobile-divider" />
                                    {adminItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = activeTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                className={`mobile-drawer-item ${isActive ? 'active' : ''}`}
                                                onClick={() => {
                                                    setActiveTab(item.id);
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                <div className="mobile-drawer-item-icon">
                                                    <Icon size={20} />
                                                </div>
                                                <span className="mobile-drawer-item-label">{item.label}</span>
                                                <ChevronRight size={18} className="mobile-drawer-item-arrow" />
                                            </button>
                                        );
                                    })}
                                </>
                            )}
                        </nav>

                        {/* Footer */}
                        <div className="mobile-drawer-footer">
                            <button
                                className="mobile-drawer-btn profile"
                                onClick={() => {
                                    setActiveTab('profile');
                                    setIsMenuOpen(false);
                                }}
                            >
                                <User size={18} />
                                <span style={{ flex: 1 }}>Hồ sơ cá nhân</span>
                                <ChevronRight size={16} style={{ color: 'var(--mb-text-light)' }} />
                            </button>
                            <button
                                className="mobile-drawer-btn logout"
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    onLogout?.();
                                }}
                            >
                                <LogOut size={18} />
                                <span style={{ flex: 1 }}>Đăng xuất</span>
                            </button>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}
