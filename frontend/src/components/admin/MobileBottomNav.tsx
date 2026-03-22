import React, { useState } from 'react';
import {
    Users,
    BookOpen,
    CreditCard,
    MoreHorizontal,
    Award,
    Newspaper,
    Home,
    Folder,
    CalendarDays,
    UserCircle,
    History
} from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import MobileActionSheet from './MobileActionSheet';
import './MobileBottomNav.css';

export default function MobileBottomNav({ activeTab, setActiveTab, admin }) {
    const { platform } = useDeviceType();
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const menuItems = [
        { id: 'classes', label: 'Lớp học', icon: BookOpen },
        { id: 'students', label: 'Học viên', icon: Users },
        { id: 'payments', label: 'Học phí', icon: CreditCard },
        { id: 'more', label: 'Thêm', icon: MoreHorizontal }
    ];

    const moreMenuItems = [
        { id: 'certificates', label: 'Chứng chỉ', icon: Award },
        { id: 'posts', label: 'Bài viết', icon: Newspaper },
        { id: 'homepage', label: 'Homepage', icon: Home },
        { id: 'documents', label: 'Tài liệu', icon: Folder },
        { id: 'exam-schedules', label: 'Lịch thi', icon: CalendarDays },
        { id: 'profile', label: 'Cá nhân', icon: UserCircle },
        { id: 'logs', label: 'Nhật ký', icon: History }
    ];

    const handleTabClick = (tabId) => {
        if (tabId === 'more') {
            setShowMoreMenu(true);
            return;
        }
        setActiveTab(tabId);
        window.location.hash = tabId;
    };

    const handleMoreMenuItemClick = (tabId) => {
        setActiveTab(tabId);
        window.location.hash = tabId;
        setShowMoreMenu(false);
    };

    return (
        <>
            <nav 
                className={`mobile-bottom-nav ${platform}`}
                style={{
                    paddingBottom: platform === 'ios' ? 'env(safe-area-inset-bottom)' : '0'
                }}
            >
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                            aria-label={item.label}
                        >
                            <Icon size={28} />
                            <span className="mobile-nav-label">{item.label}</span>
                            {isActive && <div className="mobile-nav-indicator" />}
                        </button>
                    );
                })}
            </nav>

            <MobileActionSheet
                isOpen={showMoreMenu}
                onClose={() => setShowMoreMenu(false)}
                title="Thêm tùy chọn"
                actions={moreMenuItems.map(item => ({
                    label: item.label,
                    icon: <item.icon size={20} />,
                    onClick: () => handleMoreMenuItemClick(item.id)
                }))}
            />
        </>
    );
}
