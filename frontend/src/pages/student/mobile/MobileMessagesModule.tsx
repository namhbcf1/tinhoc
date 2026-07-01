// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, AlertCircle, CheckCircle, Info, RefreshCw, X } from 'lucide-react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { useToast } from '../../../components/ui/ToastContainer';

const getTypeConfig = (type) => {
    const configs = {
        alert: { bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-400', icon: AlertCircle, iconColor: 'text-amber-500' },
        success: { bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-400', icon: CheckCircle, iconColor: 'text-emerald-500' },
        info: { bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-400', icon: Info, iconColor: 'text-blue-500' },
        warning: { bg: 'bg-orange-50', border: 'border-orange-100', dot: 'bg-orange-400', icon: AlertCircle, iconColor: 'text-orange-500' },
    };
    return configs[type] || configs.info;
};

const formatTime = (ts) => {
    if (!ts) return '';
    try {
        const d = new Date(ts);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Vừa xong';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
        return d.toLocaleDateString('vi-VN');
    } catch { return ''; }
};

const NotificationCard = ({ item, onMarkRead }) => {
    const config = getTypeConfig(item.type || item.notification_type);
    const Icon = config.icon;
    const isRead = item.read || item.is_read;

    return (
        <div className={`rounded-2xl border p-4 flex gap-3 ${isRead ? 'bg-white border-slate-100' : `${config.bg} ${config.border}`}`}>
            <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${isRead ? 'bg-slate-100' : config.bg} border ${isRead ? 'border-slate-100' : config.border}`}>
                <Icon size={18} className={isRead ? 'text-slate-400' : config.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-sm font-bold leading-tight ${isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                        {item.title || item.subject || 'Thông báo'}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">{formatTime(item.created_at)}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                    {item.content || item.message || item.body || 'Không có nội dung'}
                </p>
                {!isRead && onMarkRead && (
                    <button
                        onClick={() => onMarkRead(item.id)}
                        className="mt-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl active:bg-blue-100 transition-colors"
                    >
                        Đánh dấu đã đọc
                    </button>
                )}
            </div>
            {!isRead && <div className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0 mt-1.5`} />}
        </div>
    );
};

export default function MobileMessagesModule({ studentData }) {
    const { success, error } = useToast();
    const [activeTab, setActiveTab] = useState('notifications');
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (activeTab === 'notifications') loadNotifications();
    }, [activeTab]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.getNotifications({ limit: 100, offset: 0 });
            const data = res?.data || res || [];
            setNotifications(Array.isArray(data) ? data : []);
            try {
                const countRes = await api.getUnreadNotificationCount();
                setUnreadCount(countRes?.unreadCount || countRes?.data?.unreadCount || countRes?.data?.count || countRes?.count || 0);
            } catch { /* skip */ }
        } catch (err) {
            console.error('Load notifications error:', err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = async (notificationId) => {
        try {
            await api.markNotificationAsRead(notificationId);
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            success('Đã đánh dấu đã đọc');
        } catch (err) { error('Lỗi: ' + err.message); }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: true })));
            setUnreadCount(0);
            success('Đã đánh dấu tất cả đã đọc');
        } catch (err) { error('Lỗi: ' + err.message); }
    };

    const unreadNotifications = notifications.filter(n => !n.read && !n.is_read);

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        await loadNotifications();
    };

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50 pb-28">
            {/* Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 px-5 pt-6 pb-8" style={{ overflow: 'clip' }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl opacity-60" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                                <Bell size={24} className="text-white" strokeWidth={1.5} />
                            </div>
                            <div>
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Trung tâm</p>
                                <h1 className="text-white font-black text-xl tracking-tight">Thông báo</h1>
                            </div>
                        </div>
                        <button
                            onClick={loadNotifications}
                            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
                        >
                            <RefreshCw size={18} className={`text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Tổng thông báo</p>
                            <p className="text-white font-black text-2xl leading-none">{notifications.length}</p>
                        </div>
                        <div className={`rounded-2xl px-4 py-3 border border-white/20 ${unreadCount > 0 ? 'bg-blue-500/20 border-blue-400/30' : 'bg-white/10'}`}>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Chưa đọc</p>
                            <p className="text-white font-black text-2xl leading-none">{unreadCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between sticky z-10 shadow-sm" style={{ top: 'var(--mb-header-height)' }}>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                    {[
                        { id: 'notifications', label: 'Thông báo' },
                        { id: 'messages', label: 'Trò chuyện' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all relative ${tab.id === activeTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            {tab.label}
                            {tab.id === 'notifications' && unreadCount > 0 && tab.id !== activeTab && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-black">{unreadCount}</span>
                            )}
                        </button>
                    ))}
                </div>
                {unreadCount > 0 && activeTab === 'notifications' && (
                    <button onClick={handleMarkAllRead} className="text-xs font-black text-blue-600 active:text-blue-700">
                        Đọc tất cả
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="px-4 py-4">
                {activeTab === 'notifications' ? (
                    <>
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3 animate-pulse">
                                        <div className="w-10 h-10 bg-slate-100 rounded-2xl flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-100 rounded-full w-2/3" />
                                            <div className="h-3 bg-slate-100 rounded-full w-full" />
                                            <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : notifications.length > 0 ? (
                            <div className="space-y-2.5">
                                {notifications.map(item => (
                                    <NotificationCard key={item.id} item={item} onMarkRead={handleMarkRead} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-5">
                                    <Bell size={40} className="text-slate-300" />
                                </div>
                                <h3 className="font-black text-slate-800 text-lg mb-2">Chưa có thông báo nào</h3>
                                <p className="text-slate-500 text-sm">Các thông báo mới sẽ xuất hiện tại đây</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
                            <MessageSquare size={40} className="text-blue-300" />
                        </div>
                        <h3 className="font-black text-slate-800 text-lg mb-2">Tính năng trò chuyện</h3>
                        <p className="text-slate-500 text-sm">Đang được phát triển và sẽ ra mắt sớm</p>
                    </div>
                )}
            </div>
        </div>
        </PullToRefreshWrapper>
    );
}
