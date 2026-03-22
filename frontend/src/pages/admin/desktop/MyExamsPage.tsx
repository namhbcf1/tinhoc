import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import { formatDateVN, formatTime } from '../../../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ClipboardList, Calendar, Clock, MapPin, Info, Filter, ArrowRight, BookOpen, Hash, X } from 'lucide-react';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';

function formatDurationLabel(durationMinutes) {
  return durationMinutes == null || durationMinutes === ''
    ? 'Chưa khai báo thời lượng'
    : `${durationMinutes} phút`;
}

export default function MyExamsPage({ toast }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'past'
  const [selectedExam, setSelectedExam] = useState(null); // for detail modal
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      '.anim-fade-up',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
    );
  }, [exams, filter]);

  useEffect(() => {
    loadExams();
  }, []);
  useAdminAutoRefresh(() => loadExams(), { minIntervalMs: 15000 });

  const loadExams = async () => {
    setLoading(true);
    try {
      // Use cached request - exams don't change frequently
      const response = await api.cachedRequest('/teachers/my-exams', { tokenType: 'admin' }, true);
      if (response.success) {
        setExams(Array.isArray(response.data) ? response.data : []);
      } else {
        setExams([]);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExams = () => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return exams.filter((exam) => new Date(exam.exam_date) >= now);
      case 'past':
        return exams.filter((exam) => new Date(exam.exam_date) < now);
      default:
        return exams;
    }
  };

  if (loading) {
    return <LoadingSpinner text="\u0110ang t\u1ea3i l\u1ecbch thi..." />;
  }

  const filteredExams = getFilteredExams();

  return (
    <div className="space-y-8" ref={containerRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 anim-fade-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">L\u1ecbch thi c\u1ee7a t\u00f4i</h1>
          <p className="text-slate-500 mt-1">Qu\u1ea3n l\u00fd c\u00e1c k\u1ef3 thi v\u00e0 l\u1ecbch g\u00e1c thi</p>
        </div>

        <div className="flex bg-white/50 backdrop-blur border border-slate-200/50 p-1 rounded-2xl shadow-sm">
          {[
            { id: 'all', label: 'T\u1ea5t c\u1ea3' },
            { id: 'upcoming', label: 'S\u1eafp t\u1edbi' },
            { id: 'past', label: '\u0110\u00e3 qua' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === tab.id
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <Card className="glass-panel py-20 flex flex-col items-center justify-center text-center anim-fade-up">
          <EmptyState
            icon={<ClipboardList size={64} className="text-slate-300 mx-auto" />}
            title={filter === 'all' ? 'Ch\u01b0a c\u00f3 l\u1ecbch thi' : filter === 'upcoming' ? 'Kh\u00f4ng c\u00f3 l\u1ecbch thi s\u1eafp t\u1edbi' : 'Kh\u00f4ng c\u00f3 l\u1ecbch thi \u0111\u00e3 qua'}
            message="Th\u00f4ng tin v\u1ec1 c\u00e1c k\u1ef3 thi c\u1ee7a b\u1ea1n s\u1ebd xu\u1ea5t hi\u1ec7n t\u1ea1i \u0111\u00e2y"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
          {filteredExams.map((exam) => {
            const examDate = new Date(exam.exam_date);
            const isPast = examDate < new Date();

            return (
              <Card
                key={exam.id}
                className={`glass-card border-0 shadow-sm overflow-hidden anim-fade-up transition-all hover:shadow-md ${isPast ? 'opacity-70 bg-slate-50' : 'bg-gradient-to-r from-teal-50/30 to-white'
                  }`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className={`p-6 md:w-48 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-100 ${isPast ? 'bg-slate-100' : 'bg-teal-600 text-white shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]'
                      }`}>
                      <span className={`text-xs font-bold uppercase tracking-wide mb-1 ${isPast ? 'text-slate-400' : 'text-teal-100'}`}>
                        {new Intl.DateTimeFormat('vi-VN', { month: 'long' }).format(examDate)}
                      </span>
                      <span className="text-4xl font-black">{examDate.getDate()}</span>
                      <span className={`text-xs font-bold mt-1 ${isPast ? 'text-slate-500' : 'text-teal-50'}`}>
                        {new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(examDate)}
                      </span>
                    </div>

                    <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-slate-800">{exam.exam_name}</h3>
                          {isPast && <Badge className="bg-slate-200 text-slate-600 border-0 text-xs font-semibold">\u0110\u00e3 qua</Badge>}
                          {!isPast && <Badge className="bg-teal-100 text-teal-700 border-0 text-xs font-semibold">S\u1eafp t\u1edbi</Badge>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                          <div className="flex items-center gap-2 text-slate-600">
                            <BookOpen size={16} className="text-slate-400" />
                            <span className="text-sm font-medium">{exam.ten_lop || exam.ma_lop}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={16} className="text-slate-400" />
                            <span className="text-sm font-medium">{formatTime(exam.exam_date)} ({formatDurationLabel(exam.duration_minutes)})</span>
                          </div>
                          {exam.location && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin size={16} className="text-slate-400" />
                              <span className="text-sm font-medium">{exam.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-slate-600">
                            <Hash size={16} className="text-slate-400" />
                            <span className="text-sm font-medium">{exam.ma_lop}</span>
                          </div>
                        </div>
                      </div>

                      {exam.notes && (
                        <div className="bg-slate-100/50 p-4 rounded-2xl md:max-w-xs flex-shrink-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Info size={14} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ghi ch\u00fa</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2 italic">"{exam.notes}"</p>
                        </div>
                      )}

                      {!isPast && (
                        <Button variant="outline" className="rounded-xl border-teal-200 text-teal-700 font-bold hover:bg-teal-50 group px-6 h-12"
                          onClick={() => setSelectedExam(exam)}
                        >
                          <span>Chi ti\u1ebft</span>
                          <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Exam Detail Modal */}
      {selectedExam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedExam(null)}
        >
          <Card
            className="glass-card max-w-lg w-full overflow-hidden shadow-2xl border-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-teal-600 to-emerald-600 p-6 text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <ClipboardList size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{selectedExam.exam_name}</h2>
                  <p className="text-teal-100 text-sm mt-0.5">{selectedExam.ten_lop || selectedExam.ma_lop}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedExam(null)}
                className="text-white hover:bg-white/10 rounded-full h-10 w-10 flex-shrink-0"
              >
                <X size={20} />
              </Button>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-teal-100 text-teal-600 rounded-lg"><Calendar size={18} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ng\u00e0y thi</p>
                    <p className="font-bold text-slate-700 text-sm">{formatDateVN(selectedExam.exam_date)}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Clock size={18} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Gi\u1edd thi</p>
                    <p className="font-bold text-slate-700 text-sm">{formatTime(selectedExam.exam_date)} ({formatDurationLabel(selectedExam.duration_minutes)})</p>
                  </div>
                </div>
                {selectedExam.location && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><MapPin size={18} /></div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">\u0110\u1ecba \u0111i\u1ec3m</p>
                      <p className="font-bold text-slate-700 text-sm">{selectedExam.location}</p>
                    </div>
                  </div>
                )}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Hash size={18} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">M\u00e3 l\u1edbp</p>
                    <p className="font-bold text-slate-700 text-sm">{selectedExam.ma_lop}</p>
                  </div>
                </div>
              </div>

              {selectedExam.notes && (
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 flex items-start gap-3">
                  <Info size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-600/70 uppercase tracking-wide mb-1">Ghi ch\u00fa</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedExam.notes}</p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  variant="ghost"
                  className="px-6 rounded-xl h-11 font-bold text-slate-400 hover:text-slate-600"
                  onClick={() => setSelectedExam(null)}
                >
                  \u0110\u00f3ng
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
