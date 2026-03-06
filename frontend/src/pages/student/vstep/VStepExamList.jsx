import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Award, ArrowRight, PlayCircle, History } from 'lucide-react';
import api from '../../../services/api';

const VStepExamList = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasRegistrations, setHasRegistrations] = useState(true); // assume true until checked
    const navigate = useNavigate();

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        try {
            // Check student's registered class types from localStorage
            const studentData = JSON.parse(localStorage.getItem('student_data') || '{}');
            const registrations = studentData.registrations || [];
            const activeClassTypes = registrations.filter(
                r => r.class_type && r.status !== 'cancelled'
            );

            // Flag if student has no registered class (to show appropriate message)
            setHasRegistrations(activeClassTypes.length > 0 || registrations.length === 0);

            // Backend uses student JWT to filter exams by class_type automatically
            const res = await api.request('/vstep/exams?status=published', {
                tokenType: 'student'
            });
            if (res.success) {
                setExams(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartExam = async (examId) => {
        // Create attempt then redirect
        if (window.confirm("Bạn có chắc chắn muốn bắt đầu bài thi? Thời gian sẽ bắt đầu tính ngay lập tức.")) {
            try {
                const res = await api.request('/vstep/attempts', {
                    method: 'POST',
                    body: JSON.stringify({ exam_id: examId }),
                    tokenType: 'student'
                });
                if (res.success) {
                    navigate(`/dashboard/vstep/take/${res.data.attempt_id}`); // route handled by App.jsx redirect
                }
            } catch (err) {
                alert(err.message);
            }
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Cổng Thi VSTEP</h1>
                    <p className="text-slate-500">Danh sách các bài thi VSTEP theo chuẩn B1, B2, C1</p>
                </div>
                <Link
                    to="/dashboard/vstep/history"
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl transition-all"
                >
                    <History size={16} />
                    Lịch sử thi
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : exams.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    {!hasRegistrations ? (
                        <>
                            <p className="text-slate-600 text-lg font-medium">Bạn chưa đăng ký lớp học có thể thi.</p>
                            <p className="text-slate-400 text-sm mt-2">Vui lòng liên hệ trung tâm để đăng ký lớp phù hợp.</p>
                        </>
                    ) : (
                        <p className="text-slate-500 text-lg">Hiện tại chưa có bài thi nào được mở.</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                        <div key={exam.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 overflow-hidden group">
                            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
                                <div className="absolute inset-0 bg-black/10"></div>
                                <div className="absolute bottom-4 left-4 text-white">
                                    <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 inline-block">
                                        {exam.level} / {exam.code}
                                    </span>
                                    <h3 className="font-bold text-lg leading-tight">{exam.title}</h3>
                                </div>
                            </div>
                            <div className="p-5">
                                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{exam.description}</p>

                                <div className="flex items-center gap-4 text-sm text-slate-600 mb-6">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={16} className="text-blue-500" />
                                        <span>{exam.duration} phút</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Award size={16} className="text-orange-500" />
                                        <span>4 Kỹ năng</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleStartExam(exam.id)}
                                    className="w-full py-2.5 bg-slate-50 text-blue-600 font-bold rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all flex justify-center items-center gap-2 group-hover:border-blue-600"
                                >
                                    <PlayCircle size={20} />
                                    Bắt đầu làm bài
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VStepExamList;
