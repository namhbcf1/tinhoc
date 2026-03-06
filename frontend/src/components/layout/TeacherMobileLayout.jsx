import React, { useState, useEffect } from 'react';
import {
    Menu, X, Bell, User, LogOut, ChevronRight,
    Home, Calendar, BookOpen, ClipboardList, MessageCircle, FileText
} from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import './TeacherMobileLayout.css';

export default function TeacherMobileLayout({
    children,
    teacher,
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
            overview: 'Tổng quan',
            schedule: 'Lịch học',
            classes: 'Lớp học',
            documents: 'Tài liệu',
            attendance: 'Điểm danh',
            messages: 'Nhắn tin',
            profile: 'Cá nhân',
            exams: 'Lịch thi'
        };
        return titles[activeTab] || 'Giáo viên';
    };

    const menuItems = [
        { id: 'overview', label: 'Tổng quan', icon: Home },
        { id: 'schedule', label: 'Lịch học', icon: Calendar },
        { id: 'classes', label: 'Lớp học', icon: BookOpen },
        { id: 'attendance', label: 'Điểm danh', icon: ClipboardList },
        { id: 'messages', label: 'Nhắn tin', icon: MessageCircle },
        { id: 'documents', label: 'Tài liệu', icon: FileText },
    ];

    const bottomItems = [
        { id: 'overview', label: 'Tổng quan', icon: Home },
        { id: 'schedule', label: 'Lịch học', icon: Calendar },
        { id: 'classes', label: 'Lớp học', icon: BookOpen },
        { id: 'attendance', label: 'Điểm danh', icon: ClipboardList },
    ];

    return (
        <div className={`teacher-mobile-layout ${platform}`}>
            {/* Header */}
            <header className="mobile-header teacher">
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
                            aria-label="Notifications"
                            style={{ position: 'relative' }}
                        >
                            <Bell size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mobile-content">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="mobile-bottom-nav teacher">
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
                {/* Profile button */}
                <button
                    className={`mobile-bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    <User size={22} className="mobile-bottom-nav-icon" />
                    <span className="mobile-bottom-nav-label">Tôi</span>
                </button>
            </nav>

            {/* Side Drawer */}
            {isMenuOpen && (
                <>
                    <div
                        className="mobile-overlay"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <aside className="mobile-drawer open">
                        {/* Drawer Header */}
                        <div className="mobile-drawer-header teacher">
                            <div className="mobile-drawer-user">
                                <div className="mobile-drawer-avatar">
                                    {teacher?.ho_ten_full?.charAt(0) || 'G'}
                                </div>
                                <div className="mobile-drawer-info">
                                    <h3 className="mobile-drawer-name">
                                        {teacher?.ho_ten_full || 'Giáo viên'}
                                    </h3>
                                    <p className="mobile-drawer-role">
                                        {teacher?.teacher_code || 'Giáo viên'}
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
                                        className={`mobile-drawer-item ${isActive ? 'active teacher' : ''}`}
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
