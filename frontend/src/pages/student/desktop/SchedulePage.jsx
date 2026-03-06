import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Loader2, BookOpen, X, Users, Award, CheckCircle2, Video, FileText, Download, PlayCircle } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

export default function SchedulePage({ studentData }) {
    const [scheduleData, setScheduleData] = useState({ days: [], padding: [] });
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [classDetail, setClassDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const containerRef = useRef(null);

    useGSAP(() => {
        if (!loading && scheduleData) {
            gsap.fromTo(
                '.anim-fade-up',
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
            );
            gsap.fromTo(
                '.anim-scale',
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)', delay: 0.2 }
            );
        }
    }, { scope: containerRef, dependencies: [scheduleData, loading, currentDate] });

    useEffect(() => {
        // Load schedule using studentData prop or fall back to CCCD from localStorage
        const hasCccd = studentData?.cccd || localStorage.getItem('student_cccd');
        if (hasCccd) {
            loadSchedule();
        }
    }, [currentDate, studentData]);

    // SAME LOGIC AS MobileScheduleModule
    const loadSchedule = async () => {
        setLoading(true);
        try {
            const allSchedules = [];
            const examEvents = [];
            const teachersMap = {};

            const cccd = studentData?.cccd || localStorage.getItem('student_cccd');
            if (!cccd) {
                console.warn('No CCCD found for schedule');
                setScheduleData({ days: [], padding: [] });
                setLoading(false);
                return;
            }

            console.log('Loading schedule for CCCD:', cccd);

            // A) OFFLINE registrations (classes table) - SAME AS MOBILE
            try {
                const registrationsResponse = await api.request(`/registrations?student_cccd=${cccd}`, { method: 'GET' });
                console.log('Registrations:', registrationsResponse);
                if (registrationsResponse && registrationsResponse.success && Array.isArray(registrationsResponse.data) && registrationsResponse.data.length > 0) {
                    for (const reg of registrationsResponse.data) {
                        if (['pending', 'approved', 'studying', 'completed', 'certified'].includes(reg.status)) {
                            try {
                                const schedulesResponse = await api.getClassSchedules(reg.class_id);
                                console.log(`Class ${reg.class_id} schedules response:`, schedulesResponse);
                                if (schedulesResponse) {
                                    let scheduleItems = [];
                                    if (schedulesResponse.success && Array.isArray(schedulesResponse.data)) {
                                        scheduleItems = schedulesResponse.data;
                                    } else if (Array.isArray(schedulesResponse)) {
                                        scheduleItems = schedulesResponse;
                                    } else if (schedulesResponse.data && Array.isArray(schedulesResponse.data)) {
                                        scheduleItems = schedulesResponse.data;
                                    }

                                    if (scheduleItems.length > 0) {
                                        scheduleItems.forEach(item => {
                                            allSchedules.push({
                                                ...item,
                                                class_id: reg.class_id,
                                                class_name: reg.class_name || reg.ten_lop || item.class_name || 'Lớp học',
                                                ma_lop: reg.ma_lop || item.ma_lop,
                                                ngay_bat_dau: reg.ngay_bat_dau || item.ngay_bat_dau,
                                                ngay_ket_thuc: reg.ngay_ket_thuc || item.ngay_ket_thuc,
                                            });
                                        });
                                        console.log(`Added ${scheduleItems.length} schedules for class ${reg.class_id}`);
                                    }
                                }
                                const teachersResponse = await api.getClassTeachers(reg.class_id);
                                if (teachersResponse && teachersResponse.success && Array.isArray(teachersResponse.data) && teachersResponse.data.length > 0) {
                                    teachersMap[reg.class_id] = teachersResponse.data;
                                }
                            } catch (e) {
                                console.warn("Offline schedule load error for class", reg.class_id, e);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load registrations:", e);
            }

            // B) ONLINE enrollments - SAME AS MOBILE
            try {
                const onlineResp = await fetch(`${import.meta.env.VITE_API_URL || 'https://vantrangedu-api.bangachieu2.workers.dev'}/online-classes?status=active`, {
                    headers: cccd ? { 'X-Student-CCCD': cccd } : {}
                });
                const onlineData = await onlineResp.json();
                if (onlineData?.success && onlineData.data?.classes && Array.isArray(onlineData.data.classes)) {
                    const enrolledOnline = onlineData.data.classes.filter(c => c.is_enrolled);
                    enrolledOnline.forEach(cls => {
                        const scheduleRule = cls.schedule_rule || '';
                        const scheduleTime = cls.schedule_time || '';
                        const [start_time, end_time] = scheduleTime.includes('-') ? scheduleTime.split('-').map(s => s.trim()) : ['19:00', '21:00'];

                        let days = [];
                        if (scheduleRule === 'DAILY') {
                            days = [0, 1, 2, 3, 4, 5, 6];
                        } else if (scheduleRule.includes(':')) {
                            const [, d] = scheduleRule.split(':');
                            days = (d || '').split(',').map(x => parseInt(x)).filter(n => !Number.isNaN(n));
                        }

                        days.forEach(day_of_week => {
                            allSchedules.push({
                                day_of_week,
                                start_time: start_time || '00:00',
                                end_time: end_time || '00:00',
                                room: 'Online',
                                class_id: cls.id,
                                class_name: cls.class_name,
                                ma_lop: cls.ma_lop || `ONLINE-${cls.id}`,
                                ngay_bat_dau: cls.start_date,
                                ngay_ket_thuc: cls.end_date,
                                _source: 'online',
                                teacher_name: cls.teacher_name,
                            });
                        });
                    });
                }
            } catch (e) {
                console.warn("Online schedule load error", e);
            }

            // C) Fetch exam schedule - SAME AS MOBILE
            try {
                const examsResponse = await api.getStudentExams();
                if (examsResponse.success && Array.isArray(examsResponse.data) && examsResponse.data.length > 0) {
                    examsResponse.data.forEach(exam => {
                        const status = exam.registration_status;
                        if (status && ['pending', 'approved', 'registered'].includes(status)) {
                            examEvents.push({
                                type: 'exam',
                                id: exam.id,
                                name: exam.exam_name,
                                date: new Date(exam.exam_date),
                                time: exam.exam_time || '',
                                location: exam.location || 'Chưa xác định',
                                status: exam.registration_status,
                            });
                        }
                    });
                }
            } catch (e) {
                console.warn("Exam load error", e);
            }

            console.log('All schedules collected:', {
                totalSchedules: allSchedules.length,
                totalExams: examEvents.length,
                schedules: allSchedules.slice(0, 5)
            });

            const generated = generateMonthSchedule(allSchedules, teachersMap, examEvents, currentDate);
            console.log('Schedule data generated:', {
                totalSchedules: allSchedules.length,
                totalExams: examEvents.length,
                daysWithEvents: generated.days.filter(d => d.classes.length > 0).length,
            });
            setScheduleData(generated);
        } catch (error) {
            console.error('Error loading schedule:', error);
            setScheduleData({ days: [], padding: [] });
        } finally {
            setLoading(false);
        }
    };

    // SAME LOGIC AS MOBILE
    const generateMonthSchedule = (schedules, teachersMap, examEvents, date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();

        const monthSchedule = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const currentDayDate = new Date(year, month, i);
            currentDayDate.setHours(0, 0, 0, 0);
            const dayOfWeek = currentDayDate.getDay();

            const dayEvents = [];

            schedules.forEach(item => {
                if (item.day_of_week === dayOfWeek) {
                    let isValidDate = true;
                    if (item.ngay_bat_dau) {
                        const start = new Date(item.ngay_bat_dau);
                        start.setHours(0, 0, 0, 0);
                        if (currentDayDate < start) isValidDate = false;
                    }
                    if (item.ngay_ket_thuc) {
                        const end = new Date(item.ngay_ket_thuc);
                        end.setHours(0, 0, 0, 0);
                        if (currentDayDate > end) isValidDate = false;
                    }

                    if (isValidDate) {
                        const teachers = teachersMap[item.class_id] || [];
                        const mainTeacher = teachers.find(t => t.role === 'teacher') || teachers[0];

                        dayEvents.push({
                            type: 'class',
                            id: item.class_id + '_' + i,
                            name: item.class_name || item.ten_lop,
                            code: item.ma_lop || `LOP-${item.class_id}`,
                            startTime: item.start_time || '00:00',
                            endTime: item.end_time || '00:00',
                            room: item.room || 'Chưa cập nhật',
                            teacher: item.teacher_name || (mainTeacher ? mainTeacher.ho_ten_full : 'Chưa có GV'),
                            isOnline: item._source === 'online',
                            class_id: item.class_id,
                        });
                    }
                }
            });

            if (examEvents && Array.isArray(examEvents)) {
                examEvents.forEach(exam => {
                    const examDate = new Date(exam.date);
                    examDate.setHours(0, 0, 0, 0);
                    if (examDate.getTime() === currentDayDate.getTime()) {
                        dayEvents.push({
                            type: 'exam',
                            id: 'exam_' + exam.id,
                            exam_id: exam.id,
                            name: `THI: ${exam.name}`,
                            code: 'EXAM',
                            startTime: exam.time || '00:00',
                            endTime: '',
                            room: exam.location,
                            status: exam.status,
                            date: currentDayDate
                        });
                    }
                });
            }

            dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

            monthSchedule.push({
                date: currentDayDate,
                day: i,
                classes: dayEvents
            });
        }

        const paddingDays = Array(firstDayOfMonth).fill(null);
        return { days: monthSchedule, padding: paddingDays };
    };

    const changeMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const isToday = (date) => {
        const today = new Date();
        return date && date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const monthNames = [
        "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
        "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];

    const totalClasses = scheduleData.days?.reduce((sum, day) => sum + day.classes.filter(c => c.type === 'class').length, 0) || 0;
    const totalExams = scheduleData.days?.reduce((sum, day) => sum + day.classes.filter(c => c.type === 'exam').length, 0) || 0;

    const handleEventClick = async (evt) => {
        if (evt.type === 'exam') {
            console.log('Exam clicked:', evt);
            setSelectedEvent(evt);
            return;
        }

        if (evt.class_id) {
            setLoadingDetail(true);
            setSelectedEvent(evt);
            try {
                const classInfo = await api.getClass(evt.class_id);
                console.log('Class detail loaded:', classInfo);

                let classData = null;
                if (classInfo) {
                    if (classInfo.success && classInfo.data) {
                        classData = classInfo.data;
                    } else if (classInfo.id || classInfo.ten_lop) {
                        classData = classInfo;
                    } else if (classInfo.data && (classInfo.data.id || classInfo.data.ten_lop)) {
                        classData = classInfo.data;
                    }
                }

                if (classData) {
                    const cccd = studentData?.cccd || localStorage.getItem('student_cccd');
                    let registration = null;
                    try {
                        const regsResponse = await api.request(`/registrations?student_cccd=${cccd}`, { method: 'GET' });
                        if (regsResponse && regsResponse.success && Array.isArray(regsResponse.data)) {
                            registration = regsResponse.data.find(r => r.class_id === evt.class_id);
                        }
                    } catch (e) {
                        console.warn('Could not load registration:', e);
                    }

                    setClassDetail({
                        ...classData,
                        registration: registration,
                        scheduleInfo: {
                            startTime: evt.startTime,
                            endTime: evt.endTime,
                            room: evt.room,
                            teacher: evt.teacher,
                            date: evt.date
                        }
                    });
                } else {
                    console.warn('No class data found');
                }
            } catch (error) {
                console.error('Error loading class detail:', error);
            } finally {
                setLoadingDetail(false);
            }
        }
    };

    return (
        <div className="space-y-6" ref={containerRef}>

            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] anim-fade-up">
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-[40px] mix-blend-screen pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-cyan-400/20 rounded-full blur-[30px] mix-blend-screen pointer-events-none" />

                <div className="relative z-10">
                    {/* Title row */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                                <Calendar size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-white tracking-tight">Lịch học</h1>
                                <p className="text-white/70 text-sm mt-0.5">Xem lịch học và lịch thi theo tháng</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-5 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-full border border-white/30 backdrop-blur-sm transition-all duration-200"
                        >
                            Hôm nay
                        </button>
                    </div>

                    {/* Month navigator */}
                    <div className="flex items-center justify-between bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/20">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-all duration-200 border border-white/20"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white tracking-tight">
                                {monthNames[currentDate.getMonth()]}
                            </p>
                            <p className="text-white/70 text-sm">{currentDate.getFullYear()}</p>
                        </div>
                        <button
                            onClick={() => changeMonth(1)}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-all duration-200 border border-white/20"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-400/30 flex items-center justify-center">
                                <BookOpen size={18} className="text-emerald-200" />
                            </div>
                            <div>
                                <p className="text-white/70 text-xs font-medium">Buổi học</p>
                                <p className="text-2xl font-bold text-white tracking-tight">{totalClasses}</p>
                            </div>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-400/30 flex items-center justify-center">
                                <Award size={18} className="text-orange-200" />
                            </div>
                            <div>
                                <p className="text-white/70 text-xs font-medium">Lịch thi</p>
                                <p className="text-2xl font-bold text-white tracking-tight">{totalExams}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 anim-fade-up">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center shadow-inner border border-indigo-100/50">
                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                    </div>
                    <p className="text-slate-500 font-semibold tracking-wide">Đang tải lịch học...</p>
                </div>
            ) : (
                <div className="bg-white rounded-[32px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden anim-scale">
                    {/* Weekday header row */}
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100/80">
                        {[
                            { label: 'CN', weekend: true },
                            { label: 'Thứ 2', weekend: false },
                            { label: 'Thứ 3', weekend: false },
                            { label: 'Thứ 4', weekend: false },
                            { label: 'Thứ 5', weekend: false },
                            { label: 'Thứ 6', weekend: false },
                            { label: 'Thứ 7', weekend: true },
                        ].map((d, idx) => (
                            <div key={idx} className={`py-3 text-center text-xs font-bold uppercase tracking-wide ${d.weekend ? 'text-rose-400' : 'text-slate-500'}`}>
                                {d.label}
                            </div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7">
                        {/* Padding days */}
                        {scheduleData.padding?.map((_, idx) => (
                            <div key={`pad-${idx}`} className="min-h-[130px] bg-slate-50/40 border-b border-r border-slate-100 p-2" />
                        ))}

                        {/* Actual days */}
                        {scheduleData.days?.map((day, idx) => (
                            <div
                                key={idx}
                                className={`min-h-[130px] border-b border-r border-slate-100 p-2 relative transition-colors duration-150
                                    ${isToday(day.date) ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50/50'}
                                `}
                            >
                                {/* Date number */}
                                <div className="flex justify-end mb-2">
                                    <span className={`
                                        inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors
                                        ${isToday(day.date)
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                            : 'text-slate-600 hover:bg-slate-100'}
                                    `}>
                                        {day.day}
                                    </span>
                                </div>

                                {/* Events */}
                                <div className="space-y-1">
                                    {day.classes.slice(0, 3).map((evt, cIdx) => (
                                        <button
                                            key={cIdx}
                                            className={`w-full text-left rounded-lg px-2 py-1.5 cursor-pointer transition-all duration-150 border-l-[3px] text-xs group
                                                ${evt.type === 'exam'
                                                    ? 'bg-orange-50 border-orange-400 hover:bg-orange-100'
                                                    : 'bg-indigo-50 border-indigo-400 hover:bg-indigo-100'}
                                            `}
                                            onClick={() => handleEventClick(evt)}
                                            title={`${evt.name} (${evt.startTime}${evt.endTime ? ` - ${evt.endTime}` : ''})`}
                                        >
                                            <div className={`text-[10px] font-semibold mb-0.5 ${evt.type === 'exam' ? 'text-orange-500' : 'text-indigo-500'}`}>
                                                {evt.startTime}{evt.endTime ? `–${evt.endTime}` : ''}
                                            </div>
                                            <div className={`text-[11px] font-bold truncate leading-tight ${evt.type === 'exam' ? 'text-orange-800' : 'text-slate-800'}`}>
                                                {evt.name}
                                            </div>
                                            {evt.room && (
                                                <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5 truncate">
                                                    <MapPin size={7} />
                                                    {evt.room.length > 14 ? evt.room.substring(0, 14) + '…' : evt.room}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                    {day.classes.length > 3 && (
                                        <div className="text-[10px] text-indigo-500 font-semibold text-center py-0.5">
                                            +{day.classes.length - 3} sự kiện nữa
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-6 px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-indigo-400" />
                            Buổi học
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-orange-400" />
                            Lịch thi
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-indigo-600" />
                            Hôm nay
                        </span>
                    </div>
                </div>
            )}

            {/* Class Detail Modal */}
            {selectedEvent && classDetail && (
                <ClassDetailModal
                    cls={classDetail}
                    onClose={() => {
                        setSelectedEvent(null);
                        setClassDetail(null);
                    }}
                    studentData={studentData}
                />
            )}

            {/* Loading Detail Overlay */}
            {loadingDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Loader2 className="animate-spin text-indigo-600" size={28} />
                        </div>
                        <p className="text-slate-700 font-semibold">Đang tải thông tin lớp...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Class Detail Modal ────────────────────────────────────────────────────────
const ClassDetailModal = ({ cls, onClose, studentData }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [videos, setVideos] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [videoError, setVideoError] = useState('');

    useEffect(() => {
        if (cls && activeTab === 'videos') {
            loadVideos();
        } else if (cls && activeTab === 'documents') {
            loadDocuments();
        }
    }, [cls, activeTab]);

    const loadVideos = async () => {
        setLoading(true);
        try {
            const resp = await api.getClassVideos(cls.id || cls.class_id);
            if (resp?.success && Array.isArray(resp.data)) {
                setVideos(resp.data || []);
            }
        } catch (error) {
            console.error('Failed to load videos', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async () => {
        setLoading(true);
        try {
            setDocuments([]);
        } catch (error) {
            console.error('Failed to load documents', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWatchVideo = async (video) => {
        try {
            setVideoError('');
            setSelectedVideo(null);
            setLoading(true);

            const playResp = await api.playVideo(video.id);
            if (!playResp?.success || !playResp.data?.play_url) {
                setVideoError('Không lấy được link xem video. Vui lòng thử lại sau.');
                return;
            }

            setSelectedVideo({ ...video, play_url: playResp.data.play_url });
        } catch (err) {
            console.error('Error loading video:', err);
            setVideoError('Có lỗi khi tải video. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const status = cls.registration?.status || 'pending';

    const getStatusColor = () => {
        if (['completed', 'certified'].includes(status)) return 'bg-purple-100 text-purple-700';
        if (['studying', 'approved'].includes(status)) return 'bg-blue-100 text-blue-700';
        if (status === 'pending') return 'bg-amber-100 text-amber-700';
        return 'bg-slate-100 text-slate-700';
    };

    const getStatusLabel = () => {
        if (status === 'pending') return 'Chờ duyệt';
        if (status === 'approved') return 'Đã duyệt';
        if (status === 'studying') return 'Đang học';
        if (status === 'completed') return 'Hoàn thành';
        if (status === 'certified') return 'Đã cấp bằng';
        return status;
    };

    const tabs = [
        { id: 'info', label: 'Thông tin' },
        { id: 'videos', label: `Video (${videos.length})` },
        { id: 'documents', label: 'Tài liệu' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 p-8 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-[30px] mix-blend-screen pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                                <BookOpen size={30} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
                                    {cls.ten_lop || cls.name || 'Lớp học'}
                                </h2>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor()}`}>
                                    {getStatusLabel()}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100/80 bg-slate-50/50 px-8 pt-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-6 py-4 text-sm font-bold transition-all border-b-2 mr-1 ${activeTab === tab.id
                                ? 'text-indigo-600 border-indigo-600'
                                : 'text-slate-400 border-transparent hover:text-slate-600'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    {activeTab === 'info' && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Thông tin lớp học</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <InfoRow icon={<BookOpen size={16} />} label="Tên lớp" value={cls.ten_lop || cls.name} />
                                    <InfoRow icon={<Award size={16} />} label="Mã lớp" value={cls.ma_lop || cls.code || `LOP-${cls.id || cls.class_id}`} />
                                    {cls.scheduleInfo && (
                                        <>
                                            <InfoRow icon={<Calendar size={16} />} label="Ngày học" value={cls.scheduleInfo.date ? formatDateVN(cls.scheduleInfo.date) : ''} />
                                            <InfoRow icon={<Clock size={16} />} label="Thời gian" value={cls.scheduleInfo.startTime && cls.scheduleInfo.endTime ? `${cls.scheduleInfo.startTime} - ${cls.scheduleInfo.endTime}` : cls.gio_hoc || '18:00 - 20:00 (Tối)'} />
                                            <InfoRow icon={<MapPin size={16} />} label="Địa điểm" value={cls.scheduleInfo.room || cls.dia_diem || 'Lớp học trực tuyến / Tầng 2, Nhà C'} />
                                            <InfoRow icon={<Users size={16} />} label="Giáo viên" value={cls.scheduleInfo.teacher || cls.giao_vien || cls.teacher_name || 'Chưa phân công'} />
                                        </>
                                    )}
                                    {!cls.scheduleInfo && (
                                        <>
                                            <InfoRow icon={<Calendar size={16} />} label="Ngày bắt đầu" value={cls.ngay_bat_dau ? formatDateVN(cls.ngay_bat_dau) : 'Chưa xếp lịch'} />
                                            <InfoRow icon={<Clock size={16} />} label="Thời gian" value={cls.gio_hoc || '18:00 - 20:00 (Tối)'} />
                                            <InfoRow icon={<MapPin size={16} />} label="Địa điểm" value={cls.dia_diem || 'Lớp học trực tuyến / Tầng 2, Nhà C'} />
                                            <InfoRow icon={<Users size={16} />} label="Giáo viên" value={cls.giao_vien || cls.teacher_name || 'Chưa phân công'} />
                                        </>
                                    )}
                                </div>
                            </div>

                            {cls.registration && (
                                <div>
                                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">Trạng thái đăng ký</h3>
                                    <div className="space-y-2">
                                        <InfoRow icon={<CheckCircle2 size={16} />} label="Trạng thái" value={getStatusLabel()} />
                                        {cls.registration.registration_date && (
                                            <InfoRow icon={<Calendar size={16} />} label="Ngày đăng ký" value={formatDateVN(cls.registration.registration_date)} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'videos' && (
                        <div>
                            {loading ? (
                                <div className="flex justify-center py-16">
                                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
                                </div>
                            ) : videos.length > 0 ? (
                                <div className="space-y-3">
                                    {videos.map((video, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                    <Video size={18} className="text-indigo-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-slate-800 truncate">{video.title || 'Video bài giảng'}</h4>
                                                    {video.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{video.description}</p>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleWatchVideo(video)}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
                                            >
                                                <PlayCircle size={16} />
                                                Xem
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-400">
                                    <Video size={48} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">Chưa có video bài giảng</p>
                                </div>
                            )}

                            {(selectedVideo || videoError) && (
                                <div className="mt-5 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                                    {videoError && <div className="py-3 text-sm text-red-500 font-medium">{videoError}</div>}
                                    {selectedVideo && !videoError && (
                                        <div className="space-y-3">
                                            <p className="text-sm font-semibold text-slate-700">{selectedVideo.title || 'Video bài giảng'}</p>
                                            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
                                                <video key={selectedVideo.play_url} src={selectedVideo.play_url} controls className="w-full h-full" />
                                            </div>
                                            <p className="text-xs text-slate-400">Link xem có thời hạn. Nếu video không phát được, vui lòng nhấn "Xem" để lấy link mới.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div>
                            {loading ? (
                                <div className="flex justify-center py-16">
                                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
                                </div>
                            ) : documents.length > 0 ? (
                                <div className="space-y-3">
                                    {documents.map((doc, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                                                    <FileText size={18} className="text-cyan-500" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{doc.name || 'Tài liệu'}</p>
                                                    <p className="text-xs text-slate-400">{doc.size || ''}</p>
                                                </div>
                                            </div>
                                            <button className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-cyan-50 flex items-center justify-center text-slate-500 hover:text-cyan-600 transition-colors">
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-400">
                                    <FileText size={48} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">Chưa có tài liệu</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Info Row Helper ───────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
                <p className="font-semibold text-slate-800 break-words">{value}</p>
            </div>
        </div>
    );
};
