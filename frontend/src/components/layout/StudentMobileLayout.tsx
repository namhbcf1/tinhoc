import React, { useState, useEffect } from 'react';
import {
    Menu, X, Bell, User, LogOut, Home, BookOpen, Calendar,
    CreditCard, ChevronRight,
    ClipboardCheck, GraduationCap, ExternalLink
} from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import './StudentMobileLayout.css';

const VSTEP_URL = 'https://vantrangexam.pages.dev/#/login';

export default function StudentMobileLayout({
    children,
    studentData,
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
            'my-classes': 'Lớp của tôi',
            'register-class': 'Đăng ký lớp',
            payment: 'Học phí',
            certificates: 'Chứng chỉ',
            documents: 'Tài liệu',
            schedule: 'Lịch học',
            exams: 'Lịch thi',
            messages: 'Tin nhắn',
            profile: 'Hồ sơ cá nhân'
        };
        return titles[activeTab] || 'Học viên';
    };

    const menuItems = [
        { id: 'dashboard', label: 'Tổng quan', icon: Home },
        { id: 'my-classes', label: 'Lớp của tôi', icon: BookOpen },
        { id: 'schedule', label: 'Lịch học', icon: Calendar },
        { id: 'exams', label: 'Lịch thi', icon: ClipboardCheck },
        { id: 'payment', label: 'Học phí', icon: CreditCard },
    ];

    const bottomItems = [
        { id: 'exams', label: 'Lịch thi', icon: ClipboardCheck },
        { id: 'my-classes', label: 'Lớp học', icon: BookOpen },
        { id: 'schedule', label: 'Lịch học', icon: Calendar },
        { id: 'payment', label: 'Học phí', icon: CreditCard },
        { id: 'profile', label: 'Tôi', icon: User },
    ];

    const displayName = studentData?.ho_ten_full || studentData?.fullName || 'Học viên';
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <div className={`student-mobile-layout ${platform}`}>
            {/* Header - Fixed position with safe area */}
            <header className="mobile-header student">
                <div className="mobile-header-content">
                    <button
                        className="mobile-header-btn"
                        onClick={() => setIsMenuOpen(true)}
                        aria-label="Menu"
                    >
                        <Menu size={22} />
                    </button>

                    <h1 className="mobile-header-title">{getPageTitle()}</h1>

                    <div className="mobile-header-actions">
                        <button
                            className="mobile-header-btn"
                            aria-label="Notifications"
                            style={{ position: 'relative' }}
                        >
                            <Bell size={20} />
                            <span className="mobile-notification-badge" />
                        </button>
                        <div className="mobile-header-avatar student">
                            {studentData?.image_3x4 ? (
                                <img src={studentData.image_3x4} alt="Avatar" />
                            ) : (
                                <span>{initial}</span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mobile-content">
                {children}
            </main>

            {/* Bottom Navigation - Fixed position */}
            <nav className="mobile-bottom-nav student">
                {bottomItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <Icon size={21} className="mobile-bottom-nav-icon" strokeWidth={isActive ? 2.5 : 2} />
                            <span className="mobile-bottom-nav-label">{item.label}</span>
                        </button>
                    );
                })}
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
                        <div className="mobile-drawer-header student">
                            <div className="mobile-drawer-user">
                                <div className="mobile-drawer-avatar">
                                    {studentData?.image_3x4 ? (
                                        <img src={studentData.image_3x4} alt="Avatar" />
                                    ) : (
                                        <span>{initial}</span>
                                    )}
                                </div>
                                <div className="mobile-drawer-info">
                                    <h3 className="mobile-drawer-name">{displayName}</h3>
                                    <p className="mobile-drawer-role">
                                        {studentData?.email || studentData?.cccd || 'Học viên'}
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
                                            <Icon size={19} />
                                        </div>
                                        <span className="mobile-drawer-item-label">{item.label}</span>
                                        <ChevronRight size={16} className="mobile-drawer-item-arrow" />
                                    </button>
                                );
                            })}

                            {/* External VSTEP link */}
                            <div className="mobile-divider" />
                            <a
                                href={VSTEP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mobile-drawer-item"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <div className="mobile-drawer-item-icon" style={{ background: 'var(--mb-student-bg)', color: 'var(--mb-student)' }}>
                                    <GraduationCap size={19} />
                                </div>
                                <span className="mobile-drawer-item-label">Luyện thi VSTEP</span>
                                <ExternalLink size={14} className="mobile-drawer-item-arrow" />
                            </a>
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
                                <User size={17} />
                                <span style={{ flex: 1 }}>Hồ sơ cá nhân</span>
                                <ChevronRight size={15} style={{ color: 'var(--mb-text-light)' }} />
                            </button>
                            <button
                                className="mobile-drawer-btn logout"
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    onLogout?.();
                                }}
                            >
                                <LogOut size={17} />
                                <span style={{ flex: 1 }}>Đăng xuất</span>
                            </button>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}
