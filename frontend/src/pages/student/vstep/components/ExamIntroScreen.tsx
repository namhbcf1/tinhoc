/**
 * ExamIntroScreen - Landing screen shown before exam starts.
 * Displays exam info, skill list, and "Start Exam" CTA.
 */
import React from 'react';
import { BookOpen, Clock, Volume2, AlignLeft, Mic } from 'lucide-react';

const SKILL_ICONS = {
  LISTENING: <Volume2 size={20} className="text-blue-500" />,
  READING:   <BookOpen size={20} className="text-emerald-500" />,
  WRITING:   <AlignLeft size={20} className="text-violet-500" />,
  SPEAKING:  <Mic size={20} className="text-rose-500" />,
};

const ExamIntroScreen = ({ examData, sections, onStart }) => {
  const totalMinutes = sections.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-2xl w-full p-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
          <BookOpen size={14} />
          VSTEP Exam
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{examData?.title || 'Bai Thi VSTEP'}</h1>
        <p className="text-slate-500 mb-6">{examData?.description || 'Kiem tra 4 ky nang: Nghe, Doc, Viet, Noi.'}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Clock size={16} /> Tong thoi gian
            </div>
            <div className="font-bold text-2xl text-slate-800">{totalMinutes} phut</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <BookOpen size={16} /> So ky nang
            </div>
            <div className="font-bold text-2xl text-slate-800">{sections.length} ky nang</div>
          </div>
        </div>

        {/* Skill breakdown */}
        <div className="space-y-3 mb-8">
          {sections.map((sec, idx) => (
            <div key={sec.id || idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
              {SKILL_ICONS[sec.type] || <BookOpen size={20} />}
              <div className="flex-1">
                <div className="font-semibold text-slate-800">{sec.title || sec.type}</div>
                {sec.duration_minutes && (
                  <div className="text-xs text-slate-500">{sec.duration_minutes} phut</div>
                )}
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {sec.groups?.length || 0} phan
              </span>
            </div>
          ))}
        </div>

        {/* Rules notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
          <strong>Luu y:</strong> Sau khi bat dau, thoi gian se tinh ngay. Khong duoc chuyen tab, sao chep, hay thoat toan man hinh. Moi hanh vi vi pham deu duoc ghi nhan.
        </div>

        <button
          onClick={() => {
            // Request fullscreen from user gesture (browser requires this)
            document.documentElement.requestFullscreen?.().catch(() => {});
            onStart();
          }}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-lg shadow-md transition-all active:scale-[.98]"
        >
          Bat dau lam bai
        </button>
      </div>
    </div>
  );
};

export default ExamIntroScreen;
