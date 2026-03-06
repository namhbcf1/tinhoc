import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ClipboardList, CheckCircle, XCircle, Calendar, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d || '—'; } };

const STATUS_MAP = {
  present: { label: 'Có mặt', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  co_mat:  { label: 'Có mặt', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  absent:  { label: 'Vắng',   color: 'text-red-700 bg-red-50 border-red-200' },
  vang:    { label: 'Vắng',   color: 'text-red-700 bg-red-50 border-red-200' },
  late:    { label: 'Muộn',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  muon:    { label: 'Muộn',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  excused: { label: 'Có phép', color: 'text-blue-700 bg-blue-50 border-blue-200' },
};
const mapStatus = (raw) => STATUS_MAP[(raw || '').toLowerCase()] || { label: raw || '—', color: 'text-slate-500 bg-slate-50 border-slate-200' };
const barColor  = (pct) => pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
const isPresent = (r) => ['present', 'co_mat'].includes((r.status || r.trang_thai || '').toLowerCase());

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="h-5 bg-slate-200 rounded w-48 mb-3" />
        <div className="h-2.5 bg-slate-100 rounded-full w-full mb-2" />
        <div className="h-3 bg-slate-100 rounded w-24" />
      </div>
    ))}
  </div>
);

// ─── Class Card ───────────────────────────────────────────────────────────────

const ClassCard = ({ classItem: { className, records, presentCount, totalCount } }) => {
  const [open, setOpen] = useState(false);
  const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const pctColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden anim-fade-up hover:-translate-y-1.5 hover:shadow-xl transition-transform duration-300 cursor-default">
      <button className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-bold text-slate-800 truncate mb-2">{className}</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${barColor(pct)}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-bold whitespace-nowrap ${pctColor}`}>{pct}% ({presentCount}/{totalCount})</span>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 overflow-x-auto">
          {records.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Chưa có buổi học nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Ngày</th>
                  <th className="px-5 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, idx) => {
                  const { label, color } = mapStatus(rec.status || rec.trang_thai);
                  return (
                    <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-400" />{fmtDate(rec.date || rec.session_date || rec.ngay)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}>{label}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs font-bold">{rec.notes || rec.ghi_chu || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AttendancePage({ studentData }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo('.anim-fade-up', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' });
    gsap.fromTo('.anim-scale',   { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)', delay: 0.2 });
  }, [classes]);

  useEffect(() => { if (studentData) fetchAttendance(); }, [studentData]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const regs = studentData.registrations || [];
      if (!regs.length) { setClasses([]); return; }
      const results = await Promise.all(regs.map(async (reg) => {
        try {
          const [classRes, attendRes] = await Promise.all([
            api.getClass(reg.class_id),
            api.getAttendanceByRegistration(reg.registration_id),
          ]);
          const records = Array.isArray(attendRes?.data) ? attendRes.data : [];
          return {
            className: classRes.data?.ten_lop || classRes.data?.class_name || `Lớp #${reg.class_id}`,
            records,
            presentCount: records.filter(isPresent).length,
            totalCount: records.length,
          };
        } catch { return null; }
      }));
      setClasses(results.filter(Boolean));
    } catch (err) {
      console.error('Không thể tải điểm danh:', err);
      setClasses([]);
    } finally { setLoading(false); }
  };

  const totalSessions = classes.reduce((s, c) => s + c.totalCount, 0);
  const totalPresent  = classes.reduce((s, c) => s + c.presentCount, 0);
  const overallPct    = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;
  const lowAttendance = classes.filter(c => c.totalCount > 0 && Math.round((c.presentCount / c.totalCount) * 100) < 80);

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-7 text-white shadow-xl anim-fade-up relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={20} className="text-white/80" />
            <p className="text-white/80 text-sm font-semibold uppercase">Điểm danh</p>
          </div>
          <p className="text-7xl font-extrabold text-white leading-none mb-1">{overallPct}%</p>
          <p className="text-white/70 text-sm mb-5">Tỷ lệ chuyên cần tổng thể ({totalPresent}/{totalSessions} buổi)</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tổng buổi học', value: totalSessions, icon: Calendar },
              { label: 'Có mặt',        value: totalPresent,  icon: CheckCircle },
              { label: 'Vắng / Muộn',   value: totalSessions - totalPresent, icon: XCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/25">
                <div className="flex items-center gap-1.5 mb-1"><Icon size={13} className="text-white/70" /><p className="text-white/70 text-xs font-medium font-bold">{label}</p></div>
                <p className="text-white font-bold text-xl">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low-attendance warning */}
      {!loading && lowAttendance.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start anim-scale">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-sm">Cảnh báo chuyên cần</p>
            <p className="text-red-600 text-xs mt-0.5 font-bold">
              {lowAttendance.length} lớp có tỷ lệ điểm danh dưới 80%:{' '}
              <span className="font-semibold">{lowAttendance.map(c => c.className).join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? <Skeleton /> : classes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={36} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-semibold text-lg">Chưa có dữ liệu điểm danh</p>
          <p className="text-slate-400 text-sm mt-1">Bạn chưa đăng ký lớp học nào</p>
        </div>
      ) : (
        <div className="space-y-4">{classes.map((c, i) => <ClassCard key={i} classItem={c} />)}</div>
      )}
    </div>
  );
}
