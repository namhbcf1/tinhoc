/**
 * ExamHeader - Sticky top bar showing exam title, per-skill timer, skill tabs, and submit button.
 */
import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

const SKILL_LABELS = {
  LISTENING: 'Nghe',
  READING:   'Doc',
  WRITING:   'Viet',
  SPEAKING:  'Noi',
};

const SKILL_COLORS = {
  LISTENING: 'text-blue-600 border-blue-600 bg-blue-50/50',
  READING:   'text-emerald-600 border-emerald-600 bg-emerald-50/50',
  WRITING:   'text-violet-600 border-violet-600 bg-violet-50/50',
  SPEAKING:  'text-rose-600 border-rose-600 bg-rose-50/50',
};

const formatTime = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const ExamHeader = ({ examTitle, sections, currentIndex, onSelectSection, timeLeft, onSubmit, isSubmitting }) => {
  const currentSection = sections[currentIndex];
  const isLow = timeLeft > 0 && timeLeft < 300; // < 5 min warning

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 shadow-sm">
      {/* Left: title + timer */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="font-bold text-base text-slate-800 hidden md:block truncate max-w-xs">{examTitle}</h1>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-base transition-colors ${
          isLow ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' : 'bg-blue-50 border-blue-100 text-blue-700'
        }`}>
          <Clock size={16} />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Center: skill tabs */}
      <nav className="flex gap-1 overflow-x-auto no-scrollbar px-2">
        {sections.map((sec, idx) => {
          const label = SKILL_LABELS[sec.type] || sec.type;
          const isActive = idx === currentIndex;
          return (
            <button
              key={sec.id || idx}
              onClick={() => onSelectSection(idx)}
              className={`px-3 py-1.5 text-sm font-semibold whitespace-nowrap rounded-lg border-b-2 transition-colors ${
                isActive
                  ? SKILL_COLORS[sec.type] || 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* Right: submit */}
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm shadow-sm transition-all active:scale-95 disabled:opacity-60 shrink-0"
      >
        <CheckCircle size={16} />
        <span className="hidden sm:inline">{isSubmitting ? 'Dang nop...' : 'Nop Bai'}</span>
      </button>
    </header>
  );
};

export default ExamHeader;
