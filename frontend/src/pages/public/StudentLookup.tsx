// @ts-nocheck
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatDateVN } from '../../utils/dateUtils';
import api from '../../services/api';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Search, User, Calendar, MapPin, Mail, Phone, BookOpen, Clock, AlertCircle, FileText, Download, UserCheck } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import SEO from '../../components/common/SEO';

export default function StudentLookup() {
  const [cccd, setCccd] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const structuredData = {
    '@type': 'WebPage',
    name: 'Tra cuu hoc vien',
    description: 'Cong cu tra cuu ho so hoc vien va tai lieu ca nhan.',
    url: 'https://vantrangedu.com/student-lookup'
  };

  const container = useRef();

  useGSAP(() => {
    gsap.fromTo('.anim-fade-up',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, { scope: container });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!cccd) return;

    setLoading(true);
    setError('');
    setStudentData(null);
    setDocuments([]);

    try {
      const studentResponse = await api.getStudentByCCCD(cccd);
      setStudentData(studentResponse.data);

      const docsResponse = await api.getDocumentsByCCCD(cccd);
      setDocuments(docsResponse.data || []);

      setTimeout(() => {
        gsap.fromTo('.anim-result-card',
          { scale: 0.95, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'back.out(1.1)' }
        );
      }, 50);

    } catch (err) {
      setError(err.message || 'Không tìm thấy thông tin học viên');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId, fileName) => {
    try {
      await api.downloadDocument(docId, fileName);
    } catch (err) {
      alert('Lỗi tải file: ' + err.message);
    }
  };

  return (
    <ModernPublicLayout>
      <SEO
        title="Tra cuu hoc vien"
        description="Cong cu tra cuu ho so hoc vien va tai lieu ca nhan theo CCCD."
        url="/student-lookup"
        structuredData={structuredData}
        noindex
      />
      <div ref={container} className="min-h-screen bg-slate-50 py-24 relative overflow-hidden">
        {/* Abstract Backgrounds */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] opacity-60 pointer-events-none -translate-y-1/2 -translate-x-1/3"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-100/30 rounded-full blur-[80px] opacity-50 pointer-events-none translate-y-1/3 translate-x-1/3"></div>

        <div className="container px-4 mx-auto max-w-4xl relative z-10">
          <div className="text-center mb-12 anim-fade-up">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-indigo-600 rounded-full mb-6">
              <UserCheck size={40} className="drop-shadow-sm" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Tra Cứu Học Viên
            </h1>
            <p className="text-lg text-slate-600 font-light max-w-xl mx-auto">
              Nhập số CCCD/CMT để tra cứu hồ sơ cá nhân, lịch thi và tải các tài liệu học tập của bạn.
            </p>
          </div>

          <Card className="glass-panel border-0 shadow-xl bg-white/80 rounded-[2rem] overflow-hidden anim-fade-up mb-10">
            <CardContent className="p-8 md:p-10">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                    <Search size={22} />
                  </div>
                  <Input
                    type="text"
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    placeholder="Nhập số CCCD/CMT của bạn..."
                    className="pl-12 h-16 bg-white/60 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 text-xl font-medium rounded-2xl"
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-16 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all w-full md:w-auto text-xl shrink-0"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang tìm...
                    </span>
                  ) : 'Tra cứu'}
                </Button>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-3">
                  <div className="p-1 bg-red-100 rounded-full shrink-0"><AlertCircle size={16} /></div>
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {studentData && (
            <div className="space-y-6">
              {/* Personal Info */}
              <Card className="anim-result-card glass-panel border border-indigo-100 shadow-xl shadow-indigo-900/5 bg-gradient-to-br from-white to-blue-50/20 rounded-[2rem] overflow-hidden">
                <div className="bg-indigo-600 px-8 py-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Thông tin cá nhân</h2>
                    <p className="text-indigo-100 text-sm font-medium opacity-90">Mã định danh hợp lệ</p>
                  </div>
                </div>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><User size={14} /> Họ và tên</span>
                      <span className="text-lg font-bold text-slate-800">{studentData.ho_ten_full}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={14} /> Ngày sinh</span>
                      <span className="text-lg font-medium text-slate-700">{studentData.ngay_sinh}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={14} /> Nơi sinh</span>
                      <span className="text-lg font-medium text-slate-700">{studentData.noi_sinh}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><UserCheck size={14} /> Giới tính</span>
                      <span className="text-lg font-medium text-slate-700">{studentData.gioi_tinh}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Mail size={14} /> Email</span>
                      <span className="text-lg font-medium text-slate-700">{studentData.email}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Phone size={14} /> Số điện thoại</span>
                      <span className="text-lg font-medium text-slate-700">{studentData.sdt}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Registered Classes */}
              {studentData.registrations && studentData.registrations.length > 0 && (
                <Card className="anim-result-card glass-panel border border-emerald-100 shadow-xl shadow-emerald-900/5 bg-gradient-to-br from-white to-emerald-50/20 rounded-[2rem] overflow-hidden">
                  <div className="px-8 pt-8 pb-4 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><BookOpen size={20} /></div>
                    <h2 className="text-2xl font-bold text-slate-800">Lớp đã đăng ký</h2>
                  </div>
                  <CardContent className="p-8 pt-0">
                    <div className="grid gap-4 mt-4">
                      {studentData.registrations.map((reg) => (
                        <div key={reg.registration_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md transition-all">
                          <div>
                            <div className="font-bold text-lg text-emerald-800 mb-1">{reg.ten_lop}</div>
                            <div className="text-sm text-slate-500 flex items-center gap-2">
                              <Clock size={14} /> Ngày thi: {reg.ngay_thi}
                            </div>
                          </div>
                          <div className="mt-3 sm:mt-0">
                            <div className="px-4 py-1.5 bg-emerald-50/50 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-full inline-block">
                              {reg.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              <Card className="anim-result-card glass-panel border border-amber-100 shadow-xl shadow-amber-900/5 bg-gradient-to-br from-white to-amber-50/20 rounded-[2rem] overflow-hidden">
                <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><FileText size={20} /></div>
                    <h2 className="text-2xl font-bold text-slate-800">Tài liệu của bạn</h2>
                  </div>
                  <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-sm">{documents.length} tài liệu</span>
                </div>
                <CardContent className="p-8 pt-0">
                  {documents.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500">
                      Chưa có tài liệu nào được đính kèm vào hồ sơ này.
                    </div>
                  ) : (
                    <div className="grid gap-4 mt-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-lg transition-all group">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors shrink-0">
                              <FileText size={24} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 mb-1 group-hover:text-amber-700 transition-colors">{doc.title}</h3>
                              {doc.description && <p className="text-sm text-slate-500 mb-2">{doc.description}</p>}
                              <div className="flex items-center gap-3 text-xs text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                <span className="max-w-[150px] truncate block">{doc.file_name}</span>
                                <span>•</span>
                                <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                                <span>•</span>
                                <span>{formatDateVN(doc.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDownload(doc.id, doc.file_name)}
                            variant="outline"
                            className="w-full sm:w-auto shrink-0 border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50"
                          >
                            <Download size={16} className="mr-2" /> Tải về
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-12 text-center text-slate-500 font-medium anim-fade-up">
            Trang phục vụ tra cứu. Dành cho Ban Quản trị vui lòng <Link to="/admin/login" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-4">đăng nhập tại đây</Link>.
          </div>
        </div>
      </div>
    </ModernPublicLayout>
  );
}
