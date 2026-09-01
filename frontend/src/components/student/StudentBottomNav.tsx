import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDeviceType } from '../../utils/deviceDetection';
import { STUDENT_MAIN_MENU, openStudyPlatform } from '../../features/student/student-nav';

export default function StudentBottomNav() {
  const { platform } = useDeviceType();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[rgba(255,250,241,0.92)] border-t border-[var(--vt-line)] shadow-[0_-18px_42px_rgba(19,34,56,0.12)] backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch min-h-[66px] px-1">
        {STUDENT_MAIN_MENU.filter((item) => item.primary !== false).map((item) => {
          const Icon = item.icon;
          const isActive = item.path ? location.pathname.includes(item.id) : false;

          return (
            <button
              key={item.id}
              onClick={() => item.external ? openStudyPlatform() : navigate(item.path!, { replace: true })}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200 active:scale-95 outline-none rounded-xl mx-0.5"
              aria-label={item.label}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-[var(--vt-champagne)]" />
              )}

              <div className={`flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--vt-ink)] text-[var(--vt-champagne)] shadow-sm'
                  : 'text-[var(--vt-muted)]'
              }`}>
                <Icon size={isActive ? 21 : 20} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span className={`text-[10px] font-semibold leading-none transition-colors ${
                isActive ? 'text-[var(--vt-ink)]' : 'text-[var(--vt-muted)]'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
