// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import { formatDateVN } from '../../../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import OverlayPortal from '../../../components/ui/OverlayPortal';
import { Calendar, Clock, MapPin, Video, Info, ChevronLeft, ChevronRight, Hash, BookOpen } from 'lucide-react';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';

export default function MySchedulePage({ toast }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      '.anim-fade-up',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
    );
  }, [schedule, selectedWeek]);

  useEffect(() => {
    loadSchedule();
  }, [selectedWeek]);
  useAdminAutoRefresh(() => loadSchedule(), { minIntervalMs: 15000 });

  const loadSchedule = async () => {
    setLoading(true);
    try {
      // Get week start date in local timezone (GMT+7 for Vietnam)
      const weekStartDate = getWeekStart(selectedWeek);
      const year = weekStartDate.getFullYear();
      const month = String(weekStartDate.getMonth() + 1).padStart(2, '0');
      const day = String(weekStartDate.getDate()).padStart(2, '0');
      const weekStart = `${year}-${month}-${day}`;

      // Use cached request with short TTL for better performance
      const response = await api.cachedRequest(
        `/teachers/my-schedule?week_start=${weekStart}`,
        { tokenType: 'admin' },
        true // Use cache
      );

      if (response.success) {
        setSchedule(Array.isArray(response.data) ? response.data : []);
      } else {
        setSchedule([]);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const changeWeek = (direction) => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedWeek(newDate);
  };

  const goToToday = () => {
    setSelectedWeek(new Date());
  };

  const getDayName = (dayOfWeek) => {
    const days = ['Ch\u1ee7 nh\u1eadt', 'Th\u1ee9 hai', 'Th\u1ee9 ba', 'Th\u1ee9 t\u01b0', 'Th\u1ee9 n\u0103m', 'Th\u1ee9 s\u00e1u', 'Th\u1ee9 b\u1ea3y'];
    return days[dayOfWeek];
  };

  const formatTime = (time) => {
    return time || 'N/A';
  };

  // Group schedule by day_of_week (memoized) - MUST be before early return
  const scheduleByDay = useMemo(() => {
    const grouped = {};
    for (let i = 0; i < 7; i++) {
      grouped[i] = [];
    }

    schedule.forEach((item) => {
      if (item.day_of_week >= 0 && item.day_of_week <= 6) {
        grouped[item.day_of_week].push(item);
      }
    });

    // Sort by start_time
    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => {
        const [aHour, aMin] = a.start_time.split(':').map(Number);
        const [bHour, bMin] = b.start_time.split(':').map(Number);
        return aHour * 60 + aMin - (bHour * 60 + bMin);
      });
    });

    return grouped;
  }, [schedule]);

  const weekStart = useMemo(() => getWeekStart(selectedWeek), [selectedWeek]);
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push({ date, dayOfWeek: i });
    }
    return days;
  }, [weekStart]);

  if (loading) {
    return <LoadingSpinner text="\u0110ang t\u1ea3i l\u1ecbch h\u1ecdc..." />;
  }

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 anim-fade-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">L\u1ecbch d\u1ea1y c\u1ee7a t\u00f4i</h1>
          <p className="text-slate-500 mt-1">Qu\u1ea3n l\u00fd c\u00e1c gi\u1edd gi\u1ea3ng d\u1ea1y trong tu\u1ea7n</p>
        </div>

        <div className="flex items-center gap-2 bg-white/50 backdrop-blur rounded-xl p-1 shadow-sm border border-slate-200/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changeWeek(-1)}
            className="hover:bg-slate-100 rounded-lg h-9"
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="font-semibold text-slate-700 h-9 px-4"
          >
            H\u00f4m nay
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changeWeek(1)}
            className="hover:bg-slate-100 rounded-lg h-9"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      <Card className="glass-card bg-gradient-to-br from-teal-600/90 to-emerald-600/90 text-white border-0 shadow-lg anim-fade-up">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <Calendar size={24} className="text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Tu\u1ea7n hi\u1ec7n t\u1ea1i</p>
              <p className="text-xl font-bold">
                {formatDateVN(weekDays[0].date)} \u2014 {formatDateVN(weekDays[6].date)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDays.map(({ date, dayOfWeek }) => {
          const daySchedule = scheduleByDay[dayOfWeek] || [];
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div key={dayOfWeek} className="flex flex-col gap-3 anim-fade-up">
              <div className={`p-3 rounded-2xl flex flex-col items-center transition-all ${isToday ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'bg-white border border-slate-200 shadow-sm'
                }`}>
                <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-teal-100' : 'text-slate-400'}`}>
                  {getDayName(dayOfWeek)}
                </span>
                <span className="text-lg font-bold">
                  {date.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-3 min-h-[200px]">
                {daySchedule.length === 0 ? (
                  <div className="flex-1 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                      <Clock size={16} className="text-slate-300" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tr\u1ed1ng</span>
                  </div>
                ) : (
                  daySchedule.map((item) => {
                    const isRoomUrl = item.room && (
                      item.room.startsWith('http://') ||
                      item.room.startsWith('https://') ||
                      item.room.includes('meet.google.com') ||
                      item.room.includes('zoom.us')
                    );
                    const meetingLink = item.meeting_link || (isRoomUrl ? item.room : null);

                    return (
                      <Card
                        key={item.id}
                        className="glass-card border-l-4 border-l-teal-500 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden p-3 group"
                        onClick={() => {
                          setSelectedSchedule({ ...item, meeting_link: meetingLink });
                          setShowDetailModal(true);
                        }}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                              {item.start_time}
                            </span>
                            {item.class_type === 'online' && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs px-1 py-0 h-4 uppercase">Online</Badge>
                            )}
                          </div>

                          <h4 className="font-bold text-slate-800 text-xs leading-tight line-clamp-2">
                            {item.ten_lop || item.ma_lop}
                          </h4>

                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Hash size={10} />
                            <span className="truncate">{item.ma_lop}</span>
                          </div>

                          {item.room && !isRoomUrl ? (
                            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                              <MapPin size={10} className="text-slate-400" />
                              <span className="truncate">{item.room}</span>
                            </div>
                          ) : meetingLink ? (
                            <div className="flex items-center gap-1 text-xs text-purple-600 font-bold italic">
                              <Video size={10} />
                              <span>Link online</span>
                            </div>
                          ) : null}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {schedule.length === 0 && (
        <Card className="glass-panel py-16 flex flex-col items-center justify-center text-center anim-fade-up">
          <EmptyState
            icon={<Calendar size={48} className="text-slate-300 mx-auto" />}
            title="Ch\u01b0a c\u00f3 l\u1ecbch d\u1ea1y"
            message="B\u1ea1n ch\u01b0a c\u00f3 l\u1edbp h\u1ecdc n\u00e0o trong tu\u1ea7n n\u00e0y."
          />
        </Card>
      )}

      {/* Modal chi ti\u1ebft l\u1ecbch h\u1ecdc */}
      {showDetailModal && selectedSchedule && (
        <OverlayPortal>
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
            <Card className="glass-card max-w-lg w-full overflow-hidden shadow-2xl anim-scale border-0" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="bg-gradient-to-br from-teal-600 to-emerald-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/30">
                    <BookOpen size={28} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">{selectedSchedule.ten_lop}</h2>
                    <Badge className="bg-white/20 text-white mt-1 border-white/30">{selectedSchedule.ma_lop}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowDetailModal(false)} className="text-white hover:bg-white/10 rounded-full h-10 w-10">
                  <ChevronLeft size={24} className="rotate-90 md:rotate-0" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Th\u1eddi gian</p>
                    <p className="font-bold text-slate-700">{selectedSchedule.start_time} - {selectedSchedule.end_time}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">\u0110\u1ecba \u0111i\u1ec3m</p>
                    <p className="font-bold text-slate-700">{selectedSchedule.room || (selectedSchedule.class_type === 'online' ? 'Tr\u1ef1c tuy\u1ebfn' : 'Ch\u01b0a x\u1ebfp ph\u00f2ng')}</p>
                  </div>
                </div>
              </div>

              {selectedSchedule.notes && (
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 flex items-start gap-3">
                  <Info size={20} className="text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-600/60 uppercase tracking-wide">Ghi ch\u00fa</p>
                    <p className="text-sm text-slate-700 mt-0.5 font-medium">{selectedSchedule.notes}</p>
                  </div>
                </div>
              )}

              {selectedSchedule.meeting_link && (
                <Button
                  variant="default"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-14 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                  onClick={() => window.open(selectedSchedule.meeting_link, '_blank')}
                >
                  <Video size={20} />
                  <span className="font-bold">Tham gia d\u1ea1y h\u1ecdc tr\u1ef1c tuy\u1ebfn</span>
                </Button>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  className="flex-1 px-6 rounded-xl h-12 font-bold text-slate-400 hover:text-slate-600"
                  onClick={() => setShowDetailModal(false)}
                >
                  \u0110\u00f3ng
                </Button>
              </div>
            </CardContent>
            </Card>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
