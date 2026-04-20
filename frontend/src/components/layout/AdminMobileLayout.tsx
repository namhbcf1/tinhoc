import React, { useEffect, useState } from 'react';
import {
    Menu,
    MoreHorizontal,
    X,
    LogOut,
    User,
    ChevronRight,
    Home,
} from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import {
    ADMIN_TAB_GROUP_LABELS,
    getAdminTabsForTarget,
    getAdminBottomTabs,
    getAdminTabById,
    type AdminTabGroup,
} from '../../pages/admin/adminTabs';
import './AdminMobileLayout.css';

const GROUP_ORDER: AdminTabGroup[] = ['overview', 'teaching', 'learning', 'finance', 'content', 'system'];

export default function AdminMobileLayout({
    children,
    admin,
    activeTab,
    setActiveTab,
    onLogout,
}) {
    const { platform } = useDeviceType();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const visibleTabs = getAdminTabsForTarget(admin?.role, 'mobile', admin);
    const bottomTabs = getAdminBottomTabs(admin?.role, admin);
    const activeTabMeta = getAdminTabById(activeTab);
    const activeGroupLabel = activeTabMeta?.group ? ADMIN_TAB_GROUP_LABELS[activeTabMeta.group] : 'Admin';

    useEffect(() => {
        setIsMenuOpen(false);
    }, [activeTab]);

    return (
        <div className={`admin-mobile-layout ${platform}`}>
            <header className="mobile-header admin">
                <div className="mobile-header-content">
                    <button
                        className="mobile-header-btn min-h-[44px] min-w-[44px]"
                        onClick={() => setIsMenuOpen(true)}
                        aria-label="Menu"
                        data-tour="admin-mobile-menu"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="mobile-header-title">
                        <span className="mobile-header-kicker">{activeGroupLabel}</span>
                        <span className="mobile-header-heading">{activeTabMeta?.label || 'Admin'}</span>
                    </div>

                    <div className="mobile-header-actions">
                        <button
                            className="mobile-header-btn"
                            aria-label={activeTab === 'profile' ? 'Về lịch thi' : 'Hồ sơ cá nhân'}
                            onClick={() => setActiveTab(activeTab === 'profile' ? 'exam-schedules' : 'profile')}
                        >
                            {activeTab === 'profile' ? <Home size={20} /> : <User size={20} />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="mobile-content">
                {children}
            </main>

            <nav className="mobile-bottom-nav admin" data-tour="admin-mobile-bottom-nav">
                {bottomTabs.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                            data-tour={`admin-mobile-nav-${item.id}`}
                        >
                            <Icon size={22} className="mobile-bottom-nav-icon" />
                            <span className="mobile-bottom-nav-label">{item.label}</span>
                        </button>
                    );
                })}
                <button
                    className={`mobile-bottom-nav-item ${isMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(true)}
                    data-tour="admin-mobile-more"
                >
                    <MoreHorizontal size={22} className="mobile-bottom-nav-icon" />
                    <span className="mobile-bottom-nav-label">Thêm</span>
                </button>
            </nav>

            {isMenuOpen && (
                <>
                    <div
                        className="mobile-overlay"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <aside className="mobile-drawer open" data-tour="admin-mobile-drawer">
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
                                    <p className="mobile-drawer-subtitle">VanTrangEdu LearningOS</p>
                                </div>
                            </div>
                            <button
                                className="mobile-drawer-close"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="mobile-drawer-nav">
                            {GROUP_ORDER.map((groupKey) => {
                                const groupTabs = visibleTabs.filter((item) => item.group === groupKey);
                                if (!groupTabs.length) return null;

                                return (
                                    <div key={groupKey}>
                                        <div className="mobile-divider" />
                                        <div className="px-4 pb-2 pt-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                                            {ADMIN_TAB_GROUP_LABELS[groupKey]}
                                        </div>
                                        {groupTabs.map((item) => {
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
                                                    data-tour={`admin-mobile-nav-${item.id}`}
                                                >
                                                    <div className="mobile-drawer-item-icon">
                                                        <Icon size={20} />
                                                    </div>
                                                    <span className="mobile-drawer-item-label">{item.label}</span>
                                                    <ChevronRight size={18} className="mobile-drawer-item-arrow" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </nav>

                        <div className="mobile-drawer-footer">
                            <button
                                className="mobile-drawer-btn profile"
                                onClick={() => {
                                    setActiveTab('profile');
                                    setIsMenuOpen(false);
                                }}
                            >
                                <User size={18} />
                                <span style={{ flex: 1 }}>Hồ sơ</span>
                                <ChevronRight size={16} style={{ color: 'var(--mb-text-light)' }} />
                            </button>
                            <button
                                className="mobile-drawer-btn logout"
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    onLogout?.();
                                }}
                                data-tour="admin-mobile-logout"
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
