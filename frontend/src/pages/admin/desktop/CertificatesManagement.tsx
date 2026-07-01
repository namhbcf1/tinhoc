// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Award, Search, RefreshCw, Check, X, Download, Eye, Calendar,
  Users, CheckCircle, Clock, FileText, ChevronLeft, ChevronRight, Sparkles, Truck
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import CertificateShipmentModal from '../../../components/admin/CertificateShipmentModal';
import '../../../styles/admin/AdminModern.css';
import { AdminPageHeader, AdminSummaryPill } from '../shared/AdminPageHeader';

export default function CertificatesManagement({ toast }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentTab, setCurrentTab] = useState('classes'); // 'classes', 'eligible', 'issued'
  const [shipmentModalCertificate, setShipmentModalCertificate] = useState(null);

  useEffect(() => { loadClasses(); loadCertificates(); }, []);

  const loadClasses = async () => {
    try { const response = await api.getClasses(); setClasses(response.data || []); } catch { }
  };

  const loadCertificates = async () => {
    try { const response = await api.getCertificates(); setCertificates(response.data || []); } catch { }
  };

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setCurrentTab('eligible');
    setLoading(true);
    try {
      const response = await api.getEligibleStudents(cls.id);
      setEligibleStudents(response.data || []);
    } catch { setEligibleStudents([]); } finally { setLoading(false); }
  };

  const handleIssueCertificate = async (studentId) => {
    try {
      await api.issueCertificate(selectedClass.id, studentId);
      toast?.success('Cấp chứng chỉ thành công!');
      handleSelectClass(selectedClass);
      loadCertificates();
    } catch (error) { toast?.error('Lỗi: ' + error.message); }
  };

  const handleBulkIssue = async () => {
    if (selectedStudents.length === 0) { toast?.error('Chọn ít nhất 1 học viên'); return; }
    try {
      await api.bulkIssueCertificates(selectedClass.id, selectedStudents);
      toast?.success(`Cấp ${selectedStudents.length} chứng chỉ thành công!`);
      setSelectedStudents([]);
      handleSelectClass(selectedClass);
      loadCertificates();
    } catch (error) { toast?.error('Lỗi: ' + error.message); }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };

  const toggleAll = () => {
    const eligible = eligibleStudents.filter(s => !s.has_certificate);
    if (selectedStudents.length === eligible.length) setSelectedStudents([]);
    else setSelectedStudents(eligible.map(s => s.id));
  };

  const openShipmentModal = (certificate) => {
    setShipmentModalCertificate(certificate);
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        icon={Award}
        title="Chứng chỉ"
        description="Cấp chứng chỉ, theo dõi lịch sử phát hành và xử lý vận đơn sau khi in."
        pills={(
          <>
            <AdminSummaryPill>Lớp đủ điều kiện {classes.length}</AdminSummaryPill>
            <AdminSummaryPill>Đã cấp {certificates.length}</AdminSummaryPill>
          </>
        )}
        actions={<button onClick={() => { loadClasses(); loadCertificates(); }} className="admin-btn admin-btn-outline" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}><RefreshCw size={18} /> Làm mới</button>}
      />

      {/* Unified Card */}
      <div className="admin-card unified-card">

        {/* 1. Stats Section */}
        <div className="admin-stats-unified">
          <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 0 }}>
            <div className={`admin-stat-item ${currentTab === 'classes' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', opacity: currentTab === 'classes' ? 1 : 0.7 }} onClick={() => setCurrentTab('classes')}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{classes.length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Cần cấp theo Lớp</div></div>
            </div>
            {selectedClass && (
              <div className={`admin-stat-item ${currentTab === 'eligible' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', opacity: currentTab === 'eligible' ? 1 : 0.7 }} onClick={() => setCurrentTab('eligible')}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={24} /></div>
                <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{eligibleStudents.filter(s => !s.has_certificate).length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Chờ cấp ({selectedClass.ten_lop})</div></div>
              </div>
            )}
            <div className={`admin-stat-item ${currentTab === 'issued' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', opacity: currentTab === 'issued' ? 1 : 0.7 }} onClick={() => setCurrentTab('issued')}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Award size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{certificates.length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Đã cấp</div></div>
            </div>
          </div>
        </div>

        {/* 2. Toolbar (Tabs) */}
        <div className="admin-toolbar-unified">
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCurrentTab('classes')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${currentTab === 'classes' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Danh sách Lớp
            </button>
            <button
              onClick={() => { if (selectedClass) setCurrentTab('eligible'); }}
              disabled={!selectedClass}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${currentTab === 'eligible' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'} ${!selectedClass ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cấp chứng chỉ {selectedClass ? `- ${selectedClass.ten_lop}` : ''}
            </button>
            <button
              onClick={() => setCurrentTab('issued')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${currentTab === 'issued' ? 'bg-green-50 text-green-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Lịch sử cấp
            </button>
          </div>

          {currentTab === 'eligible' && selectedStudents.length > 0 && (
            <button onClick={handleBulkIssue} className="admin-btn admin-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
              <Sparkles size={16} /> Cấp {selectedStudents.length} chứng chỉ
            </button>
          )}
        </div>

        {/* 3. Content */}
        <div style={{ padding: 24, background: '#fcfcfc', minHeight: 400 }}>
          {currentTab === 'classes' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {classes.map(cls => (
                <div key={cls.id} onClick={() => handleSelectClass(cls)} className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-slate-200 cursor-pointer relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${cls.status === 'completed' ? 'bg-green-500' : cls.status === 'studying' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><FileText size={24} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{cls.ten_lop}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{cls.ma_lop || `ID: ${cls.id}`}</div>
                    </div>
                    <span className={`admin-badge ${cls.status === 'completed' ? 'success' : cls.status === 'studying' ? 'info' : 'warning'}`}>
                      {cls.status === 'completed' ? 'Hoàn thành' : cls.status === 'studying' ? 'Đang học' : 'Mở'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b', paddingLeft: 12 }}>
                    <span><Users size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {cls.current_students || 0} HV</span>
                    <span><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {formatDateVN(cls.ngay_bat_dau)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentTab === 'eligible' && selectedClass && (
            <div className="admin-table-container shadow-none border-0">
              {loading ? (
                <div className="admin-loading"><div className="admin-loading-spinner"></div><span>Đang tải...</span></div>
              ) : eligibleStudents.length === 0 ? (
                <div className="admin-empty-state"><Users size={48} /><p>Chưa có học viên đủ điều kiện</p></div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}><input type="checkbox" checked={selectedStudents.length === eligibleStudents.filter(s => !s.has_certificate).length && selectedStudents.length > 0} onChange={toggleAll} /></th>
                      <th>Học viên</th>
                      <th>CCCD</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleStudents.map(student => (
                      <tr key={student.id}>
                        <td>
                          {!student.has_certificate && (
                            <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: student.has_certificate ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'linear-gradient(135deg, #16a34a, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>{student.ho_ten_full?.charAt(0)}</div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{student.ho_ten_full}</div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><code style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>{student.cccd}</code></td>
                        <td>
                          {student.has_certificate ? (
                            <span className="admin-badge success"><CheckCircle size={14} /> Đã cấp</span>
                          ) : (
                            <span className="admin-badge warning"><Clock size={14} /> Chờ cấp</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {!student.has_certificate && (
                            <button onClick={() => handleIssueCertificate(student.id)} className="admin-btn admin-btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>
                              <Award size={14} /> Cấp
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {currentTab === 'issued' && (
            <div className="admin-table-container shadow-none border-0">
              {certificates.length === 0 ? (
                <div className="admin-empty-state"><Award size={48} /><p>Chưa có chứng chỉ nào</p></div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Học viên</th><th>Lớp</th><th>Số chứng chỉ</th><th>Ngày cấp</th><th style={{ textAlign: 'center' }}>Thao tác</th></tr></thead>
                  <tbody>
                    {certificates.map(cert => (
                      <tr key={cert.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Award size={18} /></div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{cert.ho_ten_full}</div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>{cert.cccd}</div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>{cert.sdt || 'Chưa có SĐT'} • {cert.shipment_status ? `Vận đơn: ${cert.shipment_status}` : 'Chưa tạo vận đơn'}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="admin-badge info">{cert.ten_lop}</span></td>
                        <td><code style={{ background: '#fef3c7', padding: '4px 10px', borderRadius: 6, fontSize: 13, color: '#92400e', fontWeight: 600 }}>{cert.certificate_number}</code></td>
                        <td style={{ color: '#64748b', fontSize: 13 }}>{formatDateVN(cert.issued_date)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button onClick={() => window.open(api.getCertificateDownloadUrl(cert.id), '_blank')} className="admin-btn admin-btn-ghost hover:scale-110 transition-transform" style={{ padding: '8px' }} title="Tải xuống"><Download size={18} /></button>
                            <button onClick={() => openShipmentModal(cert)} className="admin-btn admin-btn-ghost hover:scale-110 transition-transform" style={{ padding: '8px' }} title={cert.shipment_status ? 'Xem vận đơn' : 'Tạo vận đơn'}>
                              <Truck size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      <CertificateShipmentModal
        open={!!shipmentModalCertificate}
        onOpenChange={(open) => {
          if (!open) {
            setShipmentModalCertificate(null);
          }
        }}
        certificate={shipmentModalCertificate}
        toast={toast}
        onSuccess={() => {
          loadCertificates();
        }}
      />
    </div>
  );
}
