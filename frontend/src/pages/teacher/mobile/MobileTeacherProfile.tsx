import { Mail, Phone, Calendar, Hash, BookOpen, Star } from 'lucide-react';
import { formatDateVN } from '../../../utils/dateUtils';

export default function MobileTeacherProfile({ teacher, onUpdate }) {
    const initial = teacher?.ho_ten_full?.charAt(0)?.toUpperCase() || 'G';

    const fields = [
        teacher?.email        && { icon: Mail,     label: 'Email',          value: teacher.email },
        teacher?.phone        && { icon: Phone,     label: 'Điện thoại',     value: teacher.phone },
        teacher?.ngay_sinh    && { icon: Calendar,  label: 'Ngày sinh',      value: formatDateVN(teacher.ngay_sinh) },
        teacher?.teacher_code && { icon: Hash,      label: 'Mã giáo viên',   value: teacher.teacher_code },
        teacher?.subject      && { icon: BookOpen,  label: 'Môn phụ trách',  value: teacher.subject },
    ].filter(Boolean);

    return (
        <div style={{ paddingBottom: 'calc(var(--mb-bottom-nav-height, 70px) + 16px)' }}>
            {/* Hero Card */}
            <div
                className="mx-4 mt-3 mb-4 rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
            >
                <div className="p-5 relative">
                    <div
                        className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/10"
                        style={{ transform: 'translate(30%, -30%)' }}
                    />
                    <div className="flex items-center gap-4 relative">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 text-white"
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: '2px solid rgba(255,255,255,0.3)',
                            }}
                        >
                            {initial}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">
                                {teacher?.ho_ten_full || 'Giáo viên'}
                            </h2>
                            {teacher?.teacher_code && (
                                <p className="text-orange-200 text-xs font-medium mt-0.5">
                                    #{teacher.teacher_code}
                                </p>
                            )}
                            <div className="mt-1 flex items-center gap-1">
                                <Star size={12} className="text-yellow-300 fill-yellow-300" />
                                <span className="text-orange-100 text-xs font-medium">Giáo viên</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info fields */}
            <div className="mx-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Thông tin cá nhân
                </h3>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {fields.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <div
                                key={i}
                                className={`flex items-center gap-3 px-4 py-3.5 ${i < fields.length - 1 ? 'border-b border-slate-50' : ''}`}
                            >
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: '#fff7ed' }}
                                >
                                    <Icon size={15} style={{ color: '#f97316' }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-slate-400 font-medium leading-none mb-0.5">{f.label}</p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{f.value}</p>
                                </div>
                            </div>
                        );
                    })}
                    {fields.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            Chưa có thông tin
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
