import React, { useEffect, useState } from 'react';
import { ChevronRight, ExternalLink, LogOut, Menu, User, X } from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import { STUDENT_MAIN_MENU, STUDENT_PAGE_TITLES, openStudyPlatform } from '../../features/student/student-nav';
import './StudentMobileLayout.css';

export default function StudentMobileLayout({
  children,
  studentData,
  activeTab,
  setActiveTab,
  onLogout,
}: {
  children: React.ReactNode;
  studentData: any;
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  onLogout?: () => void;
}) {
  const { platform } = useDeviceType();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth > 768) {
      return;
    }

    const root = document.documentElement;
    const previousFontSize = root.style.getPropertyValue('--vt-mobile-root-font-size');
    root.style.setProperty('--vt-mobile-root-font-size', '8.5px');

    return () => {
      if (previousFontSize) {
        root.style.setProperty('--vt-mobile-root-font-size', previousFontSize);
      } else {
        root.style.removeProperty('--vt-mobile-root-font-size');
      }
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [activeTab]);

  const displayName = studentData?.ho_ten_full || studentData?.fullName || 'Học viên';
  const initial = displayName.charAt(0).toUpperCase();
  const mobileMenuItems = [
    ...STUDENT_MAIN_MENU,
    { id: 'profile', label: 'Cá nhân', icon: User },
  ];

  const handleMenuAction = (item: any) => {
    if (item.external) {
      openStudyPlatform();
    } else {
      setActiveTab(item.id);
    }
    setIsMenuOpen(false);
  };

  return (
    <div className={`student-mobile-layout ${platform}`}>
      <header className="mobile-header student">
        <div className="mobile-header-content">
          <button
            className="mobile-header-btn"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Menu"
            data-tour="student-mobile-menu"
          >
            <Menu size={22} />
          </button>

          <h1 className="mobile-header-title">{STUDENT_PAGE_TITLES[activeTab] || 'Học viên'}</h1>

          <div className="mobile-header-actions">
            <button
              type="button"
              className="mobile-header-avatar student"
              onClick={() => setActiveTab('profile')}
              aria-label="Mở hồ sơ cá nhân"
              data-tour="student-mobile-profile"
            >
              {studentData?.image_3x4 ? (
                <img src={studentData.image_3x4} alt="Avatar" />
              ) : (
                <span>{initial}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mobile-content">{children}</main>

      <nav className="mobile-bottom-nav student" data-tour="student-mobile-bottom-nav">
        {mobileMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.external && activeTab === item.id;

          return (
            <button
              key={item.id}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleMenuAction(item)}
              data-tour={`student-mobile-nav-${item.id}`}
            >
              <Icon size={21} className="mobile-bottom-nav-icon" strokeWidth={isActive ? 2.5 : 2} />
              <span className="mobile-bottom-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {isMenuOpen && (
        <>
          <div className="mobile-overlay" onClick={() => setIsMenuOpen(false)} />
          <aside className="mobile-drawer open" data-tour="student-mobile-drawer">
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

            <nav className="mobile-drawer-nav">
              {mobileMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = !item.external && activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    className={`mobile-drawer-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleMenuAction(item)}
                    data-tour={`student-mobile-nav-${item.id}`}
                  >
                    <div className="mobile-drawer-item-icon">
                      <Icon size={19} />
                    </div>
                    <span className="mobile-drawer-item-label">{item.label}</span>
                    {item.external ? (
                      <ExternalLink size={14} className="mobile-drawer-item-arrow" />
                    ) : (
                      <ChevronRight size={16} className="mobile-drawer-item-arrow" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mobile-drawer-footer">
              <button
                className="mobile-drawer-btn logout"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout?.();
                }}
                data-tour="student-mobile-logout"
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
