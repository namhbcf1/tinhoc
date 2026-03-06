import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, FileText, Award, Download } from 'lucide-react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { formatDateVN } from '../../../utils/dateUtils';
import './ReportsPage.css';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'];

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [paymentData, setPaymentData] = useState([]);
  const [registrationData, setRegistrationData] = useState([]);
  const [certificateData, setCertificateData] = useState([]);
  const [studentsByClassData, setStudentsByClassData] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    summary: true,
    payments: true,
    registrations: true,
    certificates: true,
  });

  useEffect(() => {
    loadAllReports();
  }, [year]);

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const [summaryRes, paymentsRes, registrationsRes, certificatesRes, studentsRes] =
        await Promise.all([
          api.getReportSummary(year),
          api.getPaymentReports(year),
          api.getRegistrationReports(year, 'month'),
          api.getCertificateReports(year, 'month'),
          api.getStudentsByClassReport(),
        ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (paymentsRes.success) setPaymentData(paymentsRes.data || []);
      if (registrationsRes.success) setRegistrationData(registrationsRes.data || []);
      if (certificatesRes.success) setCertificateData(certificatesRes.data || []);
      if (studentsRes.success) setStudentsByClassData(studentsRes.data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Add title
      pdf.setFontSize(20);
      pdf.text('BÁO CÁO VÀ THỐNG KÊ', 105, 20, { align: 'center' });

      pdf.setFontSize(12);
      pdf.text(`Năm: ${year}`, 105, 30, { align: 'center' });

      let yPos = 45;

      // Summary
      if (exportOptions.summary && summary) {
        pdf.setFontSize(14);
        pdf.text('TỔNG HỢP', 20, yPos);
        yPos += 10;

        pdf.setFontSize(10);
        pdf.text(`Tổng học viên: ${summary.totalStudents}`, 25, yPos);
        yPos += 7;
        pdf.text(`Tổng lớp học: ${summary.totalClasses}`, 25, yPos);
        yPos += 7;
        pdf.text(`Đăng ký (${year}): ${summary.totalRegistrations}`, 25, yPos);
        yPos += 7;
        pdf.text(`Doanh thu (${year}): ${summary.totalRevenue.toLocaleString('vi-VN')} VNĐ`, 25, yPos);
        yPos += 7;
        pdf.text(`Chứng chỉ (${year}): ${summary.totalCertificates}`, 25, yPos);
        yPos += 15;
      }

      // Payment data
      if (exportOptions.payments && paymentData.length > 0) {
        pdf.setFontSize(14);
        pdf.text('HỌC PHÍ THEO THÁNG', 20, yPos);
        yPos += 10;

        pdf.setFontSize(9);
        paymentData.forEach((item) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`${item.month}: ${item.total_amount.toLocaleString('vi-VN')} VNĐ (${item.count} giao dịch)`, 25, yPos);
          yPos += 7;
        });
        yPos += 10;
      }

      // Registration data
      if (exportOptions.registrations && registrationData.length > 0) {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.setFontSize(14);
        pdf.text('ĐĂNG KÝ THEO THÁNG', 20, yPos);
        yPos += 10;

        pdf.setFontSize(9);
        registrationData.forEach((item) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`${item.month}: ${item.count} đăng ký`, 25, yPos);
          yPos += 7;
        });
        yPos += 10;
      }

      // Certificate data
      if (exportOptions.certificates && certificateData.length > 0) {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.setFontSize(14);
        pdf.text('CHỨNG CHỈ THEO THÁNG', 20, yPos);
        yPos += 10;

        pdf.setFontSize(9);
        certificateData.forEach((item) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`${item.month}: ${item.count} chứng chỉ`, 25, yPos);
          yPos += 7;
        });
      }

      // Footer
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(
          `Trang ${i}/${pageCount} - Xuất ngày: ${formatDateVN(new Date())}`,
          105,
          285,
          { align: 'center' }
        );
      }

      pdf.save(`Bao-cao-${year}.pdf`);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Lỗi xuất PDF: ' + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải báo cáo..." />;
  }

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 12, color: '#1e293b' }}>
          <span style={{ fontSize: 28 }}>📊</span> Báo cáo và Thống kê
        </h1>
        <p style={{ color: '#64748b', marginTop: 4, marginLeft: 44 }}>Tổng hợp số liệu hoạt động, doanh thu và học viên</p>
      </div>

      <div className="admin-card unified-card">
        {/* 1. Stats Section */}
        {summary && (
          <div className="admin-stats-unified">
            <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 0 }}>
              <div className="admin-stat-card info">
                <div className="admin-stat-header"><div className="admin-stat-icon"><Users size={22} /></div></div>
                <div className="admin-stat-value">{summary.totalStudents}</div>
                <div className="admin-stat-label">Tổng học viên</div>
              </div>
              <div className="admin-stat-card primary">
                <div className="admin-stat-header"><div className="admin-stat-icon"><FileText size={22} /></div></div>
                <div className="admin-stat-value">{summary.totalClasses}</div>
                <div className="admin-stat-label">Tổng lớp học</div>
              </div>
              <div className="admin-stat-card warning">
                <div className="admin-stat-header"><div className="admin-stat-icon"><FileText size={22} /></div></div>
                <div className="admin-stat-value">{summary.totalRegistrations}</div>
                <div className="admin-stat-label">Đăng ký ({year})</div>
              </div>
              <div className="admin-stat-card success">
                <div className="admin-stat-header"><div className="admin-stat-icon"><span style={{ fontSize: 22, fontWeight: 'bold' }}>$</span></div></div>
                <div className="admin-stat-value" style={{ fontSize: 24 }}>{summary.totalRevenue.toLocaleString('vi-VN')}</div>
                <div className="admin-stat-label">Doanh thu ({year})</div>
              </div>
              <div className="admin-stat-card info">
                <div className="admin-stat-header"><div className="admin-stat-icon"><Award size={22} /></div></div>
                <div className="admin-stat-value">{summary.totalCertificates}</div>
                <div className="admin-stat-label">Chứng chỉ ({year})</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Toolbar */}
        <div className="admin-toolbar-unified">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="text-sm font-semibold text-slate-500">Năm báo cáo:</span>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            className="admin-btn admin-btn-primary"
            onClick={() => setShowExportModal(true)}
            style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={16} /> Xuất Báo Cáo PDF
          </button>
        </div>

        {/* 3. Content (Charts) */}
        <div style={{ padding: 24, background: '#fcfcfc' }}>
          {/* Charts Grid - Reusing CSS class but ensuring logic */}
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Payment Chart */}
            <div className="chart-card" style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                📈 Học phí theo tháng
              </h2>
              {paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={paymentData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value) => `${value.toLocaleString('vi-VN')} VNĐ`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="total_amount" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Tổng học phí" />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Số lượng" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="no-data">Không có dữ liệu</div>}
            </div>

            {/* Registration Chart */}
            <div className="chart-card" style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                📊 Đăng ký theo tháng
              </h2>
              {registrationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={registrationData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Số đăng ký" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="no-data">Không có dữ liệu</div>}
            </div>

            {/* Certificate Chart */}
            <div className="chart-card" style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                🎓 Chứng chỉ đã cấp
              </h2>
              {certificateData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={certificateData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Số chứng chỉ" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="no-data">Không có dữ liệu</div>}
            </div>

            {/* Students by Class Chart */}
            <div className="chart-card" style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                👥 Học viên theo lớp
              </h2>
              {studentsByClassData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={studentsByClassData.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis
                      dataKey="class_name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Bar dataKey="student_count" fill="#16a34a" radius={[0, 4, 4, 0]} name="Tổng học viên" barSize={20} />
                    <Bar dataKey="paid_count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Đã thanh toán" barSize={20} />
                    <Bar dataKey="certificate_count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Có chứng chỉ" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="no-data">Không có dữ liệu</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="admin-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="admin-modal-header">
              <h2>📥 Xuất báo cáo PDF</h2>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ marginBottom: 16, color: '#64748b' }}>Chọn các phần muốn xuất trong báo cáo:</p>
              <div className="export-options">
                <label className="export-option">
                  <input
                    type="checkbox"
                    checked={exportOptions.summary}
                    onChange={(e) => setExportOptions({ ...exportOptions, summary: e.target.checked })}
                  />
                  <span>📊 Tổng hợp</span>
                </label>
                <label className="export-option">
                  <input
                    type="checkbox"
                    checked={exportOptions.payments}
                    onChange={(e) => setExportOptions({ ...exportOptions, payments: e.target.checked })}
                  />
                  <span>💰 Học phí theo tháng</span>
                </label>
                <label className="export-option">
                  <input
                    type="checkbox"
                    checked={exportOptions.registrations}
                    onChange={(e) => setExportOptions({ ...exportOptions, registrations: e.target.checked })}
                  />
                  <span>📝 Đăng ký theo tháng</span>
                </label>
                <label className="export-option">
                  <input
                    type="checkbox"
                    checked={exportOptions.certificates}
                    onChange={(e) => setExportOptions({ ...exportOptions, certificates: e.target.checked })}
                  />
                  <span>🎓 Chứng chỉ theo tháng</span>
                </label>
              </div>
              <div className="form-actions">
                <button onClick={() => setShowExportModal(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button
                  onClick={handleExportPDF}
                  className="btn btn-primary"
                  disabled={!exportOptions.summary && !exportOptions.payments && !exportOptions.registrations && !exportOptions.certificates}
                >
                  ✓ Xuất PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
