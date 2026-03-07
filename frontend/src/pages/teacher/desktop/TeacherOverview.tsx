import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../../../services/api';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Calendar, Clock, MapPin, MessageCircle, ClipboardCheck,
  ChevronRight, Users, BookOpen, Bell, Star
} from 'lucide-react';
import { formatDateVN } from '../../../utils/dateUtils';

// -------------------------------------------------------
// TeacherOverview — trang tổng quan giáo viên
// Hiển thị: chào hỏi, lịch dạy hôm nay, thông báo, quick actions
// -------------------------------------------------------

export default function TeacherOverview({ teacher, onNavigate }) {
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      '.ov-anim',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
    );
  }, { scope: containerRef, dependencies: [loadingSchedule] });

  useEffect(() => {
    loadTodaySchedule();
    loadUnreadCount();
  }, []);

  // Lấy lịch dạy tuần hiện tại rồi lọc ra hôm nay
  const loadTodaySchedule = async () => {
    setLoadingSchedule(true);
    try {
      const today = new Date();
      const weekStart = getWeekStart(today);
      const y = weekStart.getFullYear();
      const m = String(weekStart.getMonth() + 1).padStart(2, '0');
      const d = String(weekStart.getDate()).padStart(2, '0');

      const response = await api.cachedRequest(
        `/teachers/my-schedule?week_start=${y}-${m}-${d}`,
        { tokenType: 'teacher' },
        true
      );

      if (response.success && Array.isArray(response.data)) {
        const todayDOW = today.getDay(); // 0=CN, 1=T2...
        const todayItems = response.data.filter(
          (s) => s.day_of_week === todayDOW
        );
        todayItems.sort((a, b) => {
          const [aH, aM] = a.start_time.split(':').map(Number);
          const [bH, bM] = b.start_time.split(':').map(Number);
          return aH * 60 + aM - (bH * 60 + bM);
        });
        setTodaySchedule(todayItems);
      }
    } catch (err) {
      console.error('Error loading today schedule:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Lấy số tin nhắn chưa đọc từ conversations
  const loadUnreadCount = async () => {
    try {
      const response = await api.request('/teachers/conversations', { tokenType: 'teacher' });
      if (response.success && Array.isArray(response.data)) {
        const total = response.data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadMessages(total);
      }
    } catch (_) {
      // Không cần xử lý lỗi, chỉ để count = 0
    }
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Lời chào theo giờ
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const teacherName = teacher?.ho_ten || teacher?.ho_ten_full || 'Giáo viên';
  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="space-y-8" ref={containerRef}>
      {/* ===== HERO GREETING ===== */}
      <div className="ov-anim">
        <Card className="border-0 overflow-hidden shadow-md">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-600 p-8 text-white relative">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

            <div className="relative">
              <p className="text-teal-100 text-base font-medium mb-1">{getGreeting()},</p>
              <h1 className="text-3xl font-bold tracking-tight mb-2">{teacherName}! 👋</h1>
              <p className="text-teal-100 text-sm flex items-center gap-2">
                <Calendar size={14} />
                {todayStr}
              </p>

              {/* Quick stats row */}
              <div className="flex gap-6 mt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold leading-none">{todaySchedule.length}</p>
                  <p className="text-teal-100 text-xs mt-1">Lớp hôm nay</p>
                </div>
                {unreadMessages > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold leading-none">{unreadMessages}</p>
                    <p className="text-teal-100 text-xs mt-1">Tin chưa đọc</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== QUICK ACTIONS ===== */}
      <div className="ov-anim">
        <h2 className="text-base font-bold text-slate-500 uppercase tracking-wide mb-3">
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Điểm danh',
              icon: ClipboardCheck,
              color: 'from-teal-500 to-emerald-500',
              tab: 'attendance',
            },
            {
              label: 'Xem lịch',
              icon: Calendar,
              color: 'from-blue-500 to-indigo-500',
              tab: 'schedule',
            },
            {
              label: 'Nhắn tin',
              icon: MessageCircle,
              color: 'from-purple-500 to-violet-500',
              tab: 'messages',
              badge: unreadMessages > 0 ? unreadMessages : null,
            },
            {
              label: 'Lớp học',
              icon: BookOpen,
              color: 'from-amber-500 to-orange-500',
              tab: 'classes',
            },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                onClick={() => onNavigate(action.tab)}
                className="relative bg-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-100 hover:border-teal-200 transition-all duration-200 flex flex-col items-center gap-3 group active:scale-95"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon size={22} />
                </div>
                <span className="text-sm font-semibold text-slate-700">{action.label}</span>
                {action.badge && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== LỊCH DẠY HÔM NAY ===== */}
      <div className="ov-anim">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-500 uppercase tracking-wide">
            Lịch dạy hôm nay
          </h2>
          <button
            onClick={() => onNavigate('schedule')}
            className="text-teal-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
          >
            Xem tất cả <ChevronRight size={16} />
          </button>
        </div>

        {loadingSchedule ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : todaySchedule.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                <Star size={28} className="text-slate-300" />
              </div>
              <p className="font-semibold text-slate-600">Hôm nay không có lịch dạy</p>
              <p className="text-slate-400 text-sm">Hãy tận hưởng ngày nghỉ hoặc chuẩn bị bài giảng!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todaySchedule.map((item, idx) => {
              const isOnline = item.class_type === 'online' || (item.room && (
                item.room.startsWith('http') || item.room.includes('meet.google.com') || item.room.includes('zoom.us')
              ));
              return (
                <Card
                  key={item.id || idx}
                  className="border-0 shadow-sm hover:shadow-md transition-all border-l-4 border-l-teal-500 overflow-hidden"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0 font-bold text-lg">
                          {idx + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-base leading-tight">
                            {item.ten_lop || item.ma_lop || 'Lớp học'}
                          </h3>
                          <div className="flex flex-wrap gap-3 mt-2">
                            <span className="flex items-center gap-1.5 text-sm text-slate-500">
                              <Clock size={14} className="text-teal-500" />
                              {item.start_time} – {item.end_time}
                            </span>
                            {item.room && !isOnline && (
                              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                                <MapPin size={14} className="text-emerald-500" />
                                {item.room}
                              </span>
                            )}
                            {isOnline && (
                              <Badge className="bg-purple-100 text-purple-700 border-0 text-xs font-semibold">
                                Trực tuyến
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onNavigate('attendance')}
                        className="flex-shrink-0 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl px-3 h-9"
                      >
                        Điểm danh
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== THÔNG BÁO / TIN NHẮN CHƯA ĐỌC ===== */}
      {unreadMessages > 0 && (
        <div className="ov-anim">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-500 uppercase tracking-wide">
              Thông báo
            </h2>
          </div>
          <Card className="border-0 shadow-sm overflow-hidden">
            <button
              onClick={() => onNavigate('messages')}
              className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 relative">
                <MessageCircle size={22} />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadMessages}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">
                  Bạn có {unreadMessages} tin nhắn chưa đọc
                </p>
                <p className="text-slate-400 text-sm mt-0.5">Nhấn để xem ngay</p>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}
