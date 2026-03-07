import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, XCircle, RefreshCw, ArrowLeft, Download,
         ChevronDown } from 'lucide-react';
import api from '../../../services/api';
import '../../../styles/admin/AdminModern.css';

// ─── Status badge ───────────────────────────────────────────────────────────────
const STATUS_MAP = {
  pending:   { cls: 'bg-amber-100 text-amber-700',   text: 'Chờ duyệt' },
  approved:  { cls: 'bg-emerald-100 text-emerald-700', text: 'Đã xác nhận' },
  studying:  { cls: 'bg-blue-100 text-blue-700',     text: 'Đang học' },
  completed: { cls: 'bg-indigo-100 text-indigo-700', text: 'Hoàn thành' },
  certified: { cls: 'bg-purple-100 text-purple-700', text: 'Đã cấp CC' },
  cancelled: { cls: 'bg-red-100 text-red-700',       text: 'Đã hủy' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { cls: 'bg-slate-100 text-slate-500', text: status || 'N/A' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.text}
    </span>
  );
}

// ─── Payment badge ──────────────────────────────────────────────────────────────
function PaymentBadge({ status }) {
  if (status === 'confirmed' || status === 'paid') {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">✅ Đã nộp</span>;
  }
  if (status === 'pending') {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">⏳ Chờ XN</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold">❌ Chưa nộp</span>;
}

// ─── Indeterminate checkbox ─────────────────────────────────────────────────────
function IndeterminateCheckbox({ checked, indeterminate, onChange, title }) {
  return (
    <input
      type="checkbox"
      title={title}
      ref={el => { if (el) el.indeterminate = indeterminate; }}
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
    />
  );
}

// ─── Bulk toolbar (shown when rows selected) ────────────────────────────────────
function BulkToolbar({ count, onApproveAll, onRejectAll, onClear, processing }) {
  return (
    <div className="flex items-center gap-3 px-8 py-3 bg-blue-50 border-b border-blue-200 animate-[fadeIn_0.2s_ease-out]">
      <span className="text-sm font-semibold text-blue-700 mr-1">
        Đã chọn <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">{count}</span>
      </span>
      <div className="flex gap-2">
        <button
          onClick={onApproveAll}
          disabled={processing}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          {processing ? 'Đang xử lý...' : `Duyệt tất cả (${count})`}
        </button>
        <button
          onClick={onRejectAll}
          disabled={processing}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <XCircle size={14} />
          {processing ? 'Đang xử lý...' : `Từ chối tất cả (${count})`}
        </button>
      </div>
      <button
        onClick={onClear}
        disabled={processing}
        className="ml-auto text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
      >
        Bỏ chọn
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function RegistrationsManagement({ toast }) {
  const [classes,       setClasses]       = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading,       setLoading]       = useState(false);

  // Bulk selection
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [processing,   setProcessing]   = useState(false);

  useEffect(() => {
    loadClasses();
    const hash  = window.location.hash;
    const match = hash.match(/class=(\d+)/);
    if (match) loadRegistrations(parseInt(match[1]));
  }, []);

  const loadClasses = async () => {
    try {
      const response = await api.getClasses();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadRegistrations = async (classId) => {
    setLoading(true);
    setSelectedClass(classId);
    setSelectedIds(new Set());
    try {
      const response = await api.getRegistrationsByClass(classId);
      const regs = response.success && response.data ? response.data : (response.data || []);
      setRegistrations(Array.isArray(regs) ? regs : []);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast?.error('Lỗi tải danh sách đăng ký: ' + error.message);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (regId, status) => {
    const validStatuses = ['pending', 'approved', 'studying', 'completed', 'certified', 'cancelled'];
    if (!validStatuses.includes(status)) { toast?.error('Trạng thái không hợp lệ'); return; }
    try {
      await api.updateRegistrationStatus(regId, status);
      toast?.success('Cập nhật thành công!');
      if (selectedClass) loadRegistrations(selectedClass);
    } catch (error) {
      toast?.error('Lỗi cập nhật: ' + error.message);
    }
  };

  const handleUpdateSoPhach = async (regId, soPhach) => {
    try {
      await api.updateSoPhach(regId, soPhach);
      if (selectedClass) loadRegistrations(selectedClass);
    } catch (error) {
      toast?.error('Lỗi cập nhật: ' + error.message);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedClass) { toast?.warning('Vui lòng chọn lớp trước'); return; }
    try {
      await api.downloadExcel(selectedClass);
      toast?.success('Tải file Excel thành công!');
    } catch (error) {
      toast?.error('Lỗi tải file: ' + error.message);
    }
  };

  // ── Bulk selection helpers ──────────────────────────────────────────────────
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (registrations.every(r => selectedIds.has(r.registration_id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(registrations.map(r => r.registration_id)));
    }
  };

  // Parallel bulk approve using Promise.allSettled
  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    setProcessing(true);
    const results = await Promise.allSettled(
      ids.map(id => api.updateRegistrationStatus(id, 'approved'))
    );
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed    = results.filter(r => r.status === 'rejected').length;
    setProcessing(false);
    if (succeeded > 0) toast?.success(`Đã duyệt ${succeeded} đăng ký`);
    if (failed    > 0) toast?.error(`Không duyệt được ${failed} đăng ký`);
    loadRegistrations(selectedClass);
  };

  // Parallel bulk reject using Promise.allSettled
  const handleBulkReject = async () => {
    const ids = Array.from(selectedIds);
    setProcessing(true);
    const results = await Promise.allSettled(
      ids.map(id => api.updateRegistrationStatus(id, 'cancelled'))
    );
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed    = results.filter(r => r.status === 'rejected').length;
    setProcessing(false);
    if (succeeded > 0) toast?.success(`Đã từ chối ${succeeded} đăng ký`);
    if (failed    > 0) toast?.error(`Không xử lý được ${failed} đăng ký`);
    loadRegistrations(selectedClass);
  };

  const allSelected  = registrations.length > 0 && registrations.every(r => selectedIds.has(r.registration_id));
  const someSelected = registrations.some(r => selectedIds.has(r.registration_id)) && !allSelected;
  const bulkCount    = selectedIds.size;

  // ── Class selector ──────────────────────────────────────────────────────────
  if (!selectedClass) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <h1 className="flex items-center gap-3">
            <ClipboardList size={30} /> Danh sách đăng ký
          </h1>
          <p>Chọn lớp để xem và quản lý danh sách đăng ký</p>
        </div>

        <div className="admin-card mt-5">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
            Chọn lớp để xem đăng ký:
          </h3>
          {classes.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Chưa có lớp học nào</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => loadRegistrations(cls.id)}
                  className="text-left p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-400 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="font-semibold text-slate-900 group-hover:text-emerald-700 mb-1">
                    {cls.ten_lop}
                  </div>
                  <div className="text-xs text-slate-400 mb-3">Ngày thi: {cls.ngay_thi}</div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                    ${cls.status === 'open'      ? 'bg-emerald-100 text-emerald-700' :
                      cls.status === 'closed'    ? 'bg-slate-100 text-slate-600' :
                                                   'bg-blue-100 text-blue-700'}`}>
                    {cls.status === 'open' ? 'ĐANG MỞ' : cls.status === 'closed' ? 'ĐÃ ĐÓNG' : 'HOÀN THÀNH'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Registration table ──────────────────────────────────────────────────────
  const className = classes.find(c => c.id === selectedClass)?.ten_lop || `Lớp #${selectedClass}`;

  return (
    <div className="admin-page">
      {/* Page header */}
      <div className="admin-header flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="flex items-center gap-3">
            <ClipboardList size={30} /> Danh sách đăng ký
          </h1>
          <p className="flex items-center gap-2">
            <button
              onClick={() => { setSelectedClass(null); setSelectedIds(new Set()); }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-2 text-sm"
            >
              Chọn lớp khác
            </button>
            <span className="text-slate-300">›</span>
            <span className="font-semibold text-slate-700">{className}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => loadRegistrations(selectedClass)} className="admin-btn admin-btn-outline p-2.5">
            <RefreshCw size={18} />
          </button>
          <button onClick={handleExportExcel} className="admin-btn admin-btn-primary">
            <Download size={18} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="admin-card mt-5 p-0 overflow-hidden border border-slate-200 shadow-sm rounded-2xl">

        {/* Summary bar */}
        <div className="px-8 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
          <span className="text-sm text-slate-600 font-medium">
            Tổng: <span className="font-bold text-slate-900">{registrations.length}</span> học viên
          </span>
          {bulkCount > 0 && (
            <span className="text-xs text-blue-600 font-semibold">
              · Đã chọn {bulkCount}
            </span>
          )}
        </div>

        {/* Bulk toolbar */}
        {bulkCount > 0 && (
          <BulkToolbar
            count={bulkCount}
            onApproveAll={handleBulkApprove}
            onRejectAll={handleBulkReject}
            onClear={() => setSelectedIds(new Set())}
            processing={processing}
          />
        )}

        {/* Table */}
        {loading ? (
          <div className="admin-loading py-16">
            <div className="admin-loading-spinner" />
            <span className="mt-3 text-sm font-medium text-slate-500">Đang tải dữ liệu...</span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  {/* Select all */}
                  <th className="px-4 py-4 bg-slate-50 w-12">
                    <IndeterminateCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleToggleSelectAll}
                      title="Chọn tất cả"
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-left">STT</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-left">Số phách</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-left">CCCD</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-left">Họ và tên</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-left">Ngày sinh</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-left">Trạng thái</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-left">Nộp phí</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg, index) => {
                  const isSelected = selectedIds.has(reg.registration_id);
                  return (
                    <tr
                      key={reg.registration_id}
                      className={`border-b border-slate-50 transition-all duration-150
                        ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-400' : 'hover:bg-slate-50'}`}
                    >
                      {/* Row checkbox */}
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(reg.registration_id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-500 font-medium">{index + 1}</td>

                      <td className="px-4 py-4">
                        <input
                          type="text"
                          defaultValue={reg.so_phach || ''}
                          onBlur={(e) => {
                            const newSoPhach = e.target.value;
                            if (newSoPhach !== reg.so_phach) {
                              handleUpdateSoPhach(reg.registration_id, newSoPhach);
                            }
                          }}
                          placeholder="Nhập số phách"
                          className="w-24 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 outline-none"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <code className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-xs font-mono">
                          {reg.cccd}
                        </code>
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">{reg.ho_ten_full}</td>

                      <td className="px-4 py-4 text-sm text-slate-500">{reg.ngay_sinh}</td>

                      <td className="px-4 py-4">
                        {/* Inline status changer with styled select */}
                        <div className="relative inline-flex items-center">
                          <select
                            value={reg.status || 'pending'}
                            onChange={(e) => handleUpdateStatus(reg.registration_id, e.target.value)}
                            className="appearance-none pr-7 pl-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 outline-none cursor-pointer font-medium"
                          >
                            <option value="pending">Chờ duyệt</option>
                            <option value="approved">Đã xác nhận</option>
                            <option value="studying">Đang học</option>
                            <option value="completed">Hoàn thành</option>
                            <option value="certified">Đã cấp CC</option>
                            <option value="cancelled">Đã hủy</option>
                          </select>
                          <ChevronDown size={12} className="absolute right-2 pointer-events-none text-slate-400" />
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <PaymentBadge status={reg.payment_status} />
                        <div className="text-xs text-slate-400 mt-1">(Quản lý tại Học phí)</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {registrations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <ClipboardList size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Chưa có học viên đăng ký</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
