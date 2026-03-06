import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Loader2, BookOpen, X, Users, Award, CheckCircle2, Video, FileText, Download, PlayCircle } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

export default function MobileScheduleModule({ studentData }) {
    const [scheduleData, setScheduleData] = useState({ days: [], padding: [] });
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [classDetail, setClassDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        if (studentData) {
            loadSchedule();
        }
    }, [currentDate, studentData]);

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

            // A) OFFLINE registrations (classes table)
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
                                    // Handle different response formats
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

            // B) ONLINE enrollments
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

            // C) Fetch exam schedule
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
                schedules: allSchedules.slice(0, 5) // First 5 for debugging
            });

            const generated = generateMonthSchedule(allSchedules, teachersMap, examEvents, currentDate);
            console.log('Schedule data generated:', {
                totalSchedules: allSchedules.length,
                totalExams: examEvents.length,
                daysWithEvents: generated.days.filter(d => d.classes.length > 0).length,
                sampleDay: generated.days.find(d => d.classes.length > 0)
            });
            setScheduleData(generated);
        } catch (error) {
            console.error('Error loading schedule:', error);
            setScheduleData({ days: [], padding: [] });
        } finally {
            setLoading(false);
        }
    };

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

            // Process Classes
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
                            isOnline: item._source === 'online'
                        });
                    }
                }
            });

            // Process Exams
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

    // Calculate stats
    const totalClasses = scheduleData.days?.reduce((sum, day) => sum + day.classes.filter(c => c.type === 'class').length, 0) || 0;
    const totalExams = scheduleData.days?.reduce((sum, day) => sum + day.classes.filter(c => c.type === 'exam').length, 0) || 0;

    // Handle event click
    const handleEventClick = async (evt) => {
        if (evt.type === 'exam') {
            // Navigate to exams page or show exam detail
            console.log('Exam clicked:', evt);
            setSelectedEvent(evt);
            return;
        }

        // For class, load full class details
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
                    // Try to get registration info
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

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        if (studentData) await loadSchedule();
    };

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50 pb-28">
            {/* Header */}
            <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-700 px-4 pt-5 pb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-white/20 border border-white/30 rounded-2xl">
                        <Calendar size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-0.5">Thời khóa biểu</p>
                        <h2 className="text-xl font-black text-white tracking-tight">Lịch học</h2>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className="bg-white/15 border border-white/25 rounded-2xl px-3 py-2.5 text-center">
                        <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-0.5">Buổi học</p>
                        <p className="text-2xl font-black text-white tracking-tight">{totalClasses}</p>
                    </div>
                    <div className="bg-white/15 border border-white/25 rounded-2xl px-3 py-2.5 text-center">
                        <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-0.5">Lịch thi</p>
                        <p className="text-2xl font-black text-white tracking-tight">{totalExams}</p>
                    </div>
                </div>

                {/* Month Navigation */}
                <div className="bg-white/15 border border-white/25 rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => changeMonth(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl bg-white/20 active:scale-90 transition-transform">
                                <ChevronLeft size={18} className="text-white" />
                            </button>
                            <p className="text-white font-black text-sm">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </p>
                            <button onClick={() => changeMonth(1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl bg-white/20 active:scale-90 transition-transform">
                                <ChevronRight size={18} className="text-white" />
                            </button>
                        </div>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="text-xs bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-full font-black active:scale-95"
                        >
                            Hôm nay
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-teal-600" size={32} />
                        <p className="text-slate-500 font-medium animate-pulse">Äang táº£i lá»‹ch há»c...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, idx) => (
                                <div key={idx} className={`py-2 text-center text-xs font-bold ${idx === 0 || idx === 6 ? 'text-red-500' : 'text-slate-600'}`}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7">
                            {/* Padding Days */}
                            {scheduleData.padding?.map((_, idx) => (
                                <div key={`pad-${idx}`} className="min-h-[90px] bg-slate-50/30 border-b border-r border-slate-100 p-1"></div>
                            ))}

                            {/* Actual Days */}
                            {scheduleData.days?.map((day, idx) => (
                                <div
                                    key={idx}
                                    className={`min-h-[90px] border-b border-r border-slate-100 p-1.5 relative
                                        ${isToday(day.date) ? 'bg-green-50/50' : 'bg-white'}
                                    `}
                                >
                                    {/* Date Number */}
                                    <div className="text-right mb-1">
                                        <span className={`
                                            inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                                            ${isToday(day.date) ? 'bg-green-600 text-white shadow-sm' : 'text-slate-700'}
                                        `}>
                                            {day.day}
                                        </span>
                                    </div>

                                    {/* Events */}
                                    <div className="space-y-1">
                                        {day.classes.slice(0, 2).map((evt, cIdx) => (
                                            <div
                                                key={cIdx}
                                                className={`
                                                    border rounded-md p-1 shadow-sm cursor-pointer transition-all border-l-2
                                                    ${evt.type === 'exam'
                                                        ? 'bg-orange-50 border-orange-200 border-l-orange-500'
                                                        : 'bg-white border-slate-200 border-l-green-500'}
                                                `}
                                                title={`${evt.name} (${evt.startTime}${evt.endTime ? ` - ${evt.endTime}` : ''})`}
                                            >
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className={`text-[9px] font-bold px-1 rounded ${evt.type === 'exam' ? 'text-orange-700 bg-orange-100' : 'text-green-700 bg-green-50'}`}>
                                                        {evt.startTime}{evt.endTime ? ` - ${evt.endTime}` : ''}
                                                    </span>
                                                    {evt.type === 'exam' && <span className="text-[8px] font-bold text-red-500">THI</span>}
                                                </div>
                                                <div className={`text-[10px] font-semibold truncate leading-tight ${evt.type === 'exam' ? 'text-orange-800' : 'text-slate-800'}`}>
                                                    {evt.name}
                                                </div>
                                                {evt.room && (
                                                    <div className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                                        <MapPin size={8} /> {evt.room.length > 10 ? evt.room.substring(0, 10) + '...' : evt.room}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {day.classes.length > 2 && (
                                            <div className="text-[9px] text-slate-500 text-center font-medium">
                                                +{day.classes.length - 2} nữa
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="p-3 bg-slate-50 text-[10px] text-slate-500 border-t border-slate-200 flex gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-sm"></div>
                                Lớp đang học
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm"></div>
                                Lịch thi
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 bg-white border border-slate-200 rounded-sm"></div>
                                Ngày trống
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Class Detail Sheet */}
            {selectedEvent && classDetail && (
                <ClassDetailSheet
                    cls={classDetail}
                    onClose={() => {
                        setSelectedEvent(null);
                        setClassDetail(null);
                    }}
                    studentData={studentData}
                />
            )}

            {/* Loading Detail */}
            {loadingDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 ">
                        <Loader2 className="animate-spin text-teal-600" size={32} />
                        <p className="text-slate-600 font-medium">Äang táº£i thÃ´ng tin lá»›p...</p>
                    </div>
                </div>
            )}
        </div>
        </PullToRefreshWrapper>
    );
}

// Class Detail Sheet Component (reused from MobileMyClassesModule)
const ClassDetailSheet = ({ cls, onClose, studentData }) => {
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
            // Load class documents if API exists
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

            setSelectedVideo({
                ...video,
                play_url: playResp.data.play_url,
            });
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
        if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
        return 'bg-slate-100 text-slate-700';
    };

    const getStatusLabel = () => {
        if (status === 'pending') return 'Chá» duyá»‡t';
        if (status === 'approved') return 'ÄÃ£ duyá»‡t';
        if (status === 'studying') return 'Äang há»c';
        if (status === 'completed') return 'HoÃ n thÃ nh';
        if (status === 'certified') return 'ÄÃ£ cáº¥p báº±ng';
        return status;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
            <div
                className="bg-white w-full max-h-[92vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up "
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-teal-600 to-cyan-600 px-5 pt-6 pb-5">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm active:scale-95 transition-transform "
                    >
                        <X size={20} className="text-white" />
                    </button>

                    <div className="flex gap-4 items-center">
                        <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-2xl font-bold text-teal-600 shadow-lg  tracking-tight">
                            <BookOpen size={32} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{cls.ten_lop || cls.name || 'Lớp học'}</h2>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getStatusColor()}`}>
                                {getStatusLabel()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 px-5 bg-white sticky top-0 z-10 overflow-x-auto ">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'info' ? 'text-teal-600 border-teal-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Thông tin
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'videos' ? 'text-teal-600 border-teal-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Video ({videos.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'documents' ? 'text-teal-600 border-teal-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Tài liệu
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto px-5">
                    {activeTab === 'info' && (
                        <div className="space-y-4 py-6">
                            {/* ThÃ´ng tin lá»›p */}
                            <div>
                                <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-3">Thông tin lớp học</h3>
                                <div className="space-y-3">
                                    <InfoRow icon={<BookOpen size={16} />} label="Tên lớp" value={cls.ten_lop || cls.name} />
                                    <InfoRow icon={<Award size={16} />} label="Mã lớp" value={cls.ma_lop || cls.code || `LOP-${cls.id || cls.class_id}`} />
                                    {cls.scheduleInfo && (
                                        <>
                                            <InfoRow icon={<Calendar size={16} />} label="NgÃ y há»c" value={cls.scheduleInfo.date ? formatDateVN(cls.scheduleInfo.date) : ''} />
                                            <InfoRow icon={<Clock size={16} />} label="Thá»i gian" value={cls.scheduleInfo.startTime && cls.scheduleInfo.endTime ? `${cls.scheduleInfo.startTime} - ${cls.scheduleInfo.endTime}` : cls.gio_hoc || '18:00 - 20:00 (Tá»‘i)'} />
                                            <InfoRow icon={<MapPin size={16} />} label="Äá»‹a Ä‘iá»ƒm" value={cls.scheduleInfo.room || cls.dia_diem || 'Lá»›p há»c trá»±c tuyáº¿n / Táº§ng 2, NhÃ  C'} />
                                            <InfoRow icon={<Users size={16} />} label="GiÃ¡o viÃªn" value={cls.scheduleInfo.teacher || cls.giao_vien || cls.teacher_name || 'ChÆ°a phÃ¢n cÃ´ng'} />
                                        </>
                                    )}
                                    {!cls.scheduleInfo && (
                                        <>
                                            <InfoRow icon={<Calendar size={16} />} label="NgÃ y báº¯t Ä‘áº§u" value={cls.ngay_bat_dau ? formatDateVN(cls.ngay_bat_dau) : 'ChÆ°a xáº¿p lá»‹ch'} />
                                            <InfoRow icon={<Clock size={16} />} label="Thá»i gian" value={cls.gio_hoc || '18:00 - 20:00 (Tá»‘i)'} />
                                            <InfoRow icon={<MapPin size={16} />} label="Äá»‹a Ä‘iá»ƒm" value={cls.dia_diem || 'Lá»›p há»c trá»±c tuyáº¿n / Táº§ng 2, NhÃ  C'} />
                                            <InfoRow icon={<Users size={16} />} label="GiÃ¡o viÃªn" value={cls.giao_vien || cls.teacher_name || 'ChÆ°a phÃ¢n cÃ´ng'} />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Tráº¡ng thÃ¡i Ä‘Äƒng kÃ½ */}
                            {cls.registration && (
                                <div>
                                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-3">Trạng thái đăng ký</h3>
                                    <div className="space-y-3">
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
                        <div className="py-6">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent"></div>
                                </div>
                            ) : videos.length > 0 ? (
                                <div className="space-y-3">
                                    {videos.map((video, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-bold text-slate-800 flex-1">{video.title || 'Video bài giảng'}</h4>
                                                <button
                                                    onClick={() => handleWatchVideo(video)}
                                                    className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 active:scale-95"
                                                >
                                                    <PlayCircle size={14} />
                                                    Xem
                                                </button>
                                            </div>
                                            {video.description && (
                                                <p className="text-xs text-slate-500 mt-1">{video.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <Video size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Chưa có video bài giảng</p>
                                </div>
                            )}

                            {/* Video Player */}
                            {(selectedVideo || videoError) && (
                                <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    {videoError && (
                                        <div className="py-4 text-sm text-red-600">
                                            {videoError}
                                        </div>
                                    )}
                                    {selectedVideo && !videoError && (
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-slate-700">
                                                {selectedVideo.title || 'Video bài giảng'}
                                            </div>
                                            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                                <video
                                                    key={selectedVideo.play_url}
                                                    src={selectedVideo.play_url}
                                                    controls
                                                    className="w-full h-full"
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Link xem có thời hạn. Nếu video không phát được, vui lòng nhấn nút "Xem" để lấy link mới.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="py-6">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent"></div>
                                </div>
                            ) : documents.length > 0 ? (
                                <div className="space-y-3">
                                    {documents.map((doc, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FileText size={24} className="text-teal-600" />
                                                <div>
                                                    <p className="font-medium text-slate-800">{doc.name || 'Tài liệu'}</p>
                                                    <p className="text-xs text-slate-500">{doc.size || ''}</p>
                                                </div>
                                            </div>
                                            <button className="p-2 text-teal-600">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <FileText size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Chưa có tài liệu</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg">
            <div className="p-2 bg-white rounded-2xl text-slate-400 flex-shrink-0 ">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="font-medium text-slate-800 break-words">{value}</p>
            </div>
        </div>
    );
};
