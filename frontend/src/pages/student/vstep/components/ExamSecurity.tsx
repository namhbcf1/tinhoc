/**
 * ExamSecurity - Anti-cheat wrapper for VSTEP exam sessions.
 * Ported from vantrangexam/components/ExamSecurity.tsx
 * Detects: copy, paste, right-click, tab switch, window blur, fullscreen exit, devtools shortcuts.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, X, Eye, Copy, Keyboard, Monitor, MousePointer } from 'lucide-react';
import api from '../../../../services/api';

const VIOLATION_CONFIG = {
  copy:             { message: 'Khong duoc sao chep noi dung bai thi!', icon: 'copy',     severity: 'warning' },
  paste:            { message: 'Khong duoc dan noi dung vao bai thi!',  icon: 'copy',     severity: 'warning' },
  right_click:      { message: 'Chuot phai da bi vo hieu hoa!',          icon: 'mouse',    severity: 'warning' },
  window_blur:      { message: 'Ban da roi khoi cua so thi! Hay quay lai ngay.', icon: 'eye', severity: 'danger' },
  tab_switch:       { message: 'Phat hien chuyen tab! Hanh vi nay se bi ghi nhan.', icon: 'eye', severity: 'danger' },
  fullscreen_exit:  { message: 'Ban da thoat che do toan man hinh!',     icon: 'monitor',  severity: 'danger' },
  devtools:         { message: 'Khong duoc mo cong cu nha phat trien!',  icon: 'keyboard', severity: 'danger' },
  keyboard_shortcut:{ message: 'Phim tat nay da bi vo hieu hoa!',        icon: 'keyboard', severity: 'warning' },
};

const getIcon = (iconType) => {
  switch (iconType) {
    case 'copy':     return <Copy className="w-5 h-5" />;
    case 'mouse':    return <MousePointer className="w-5 h-5" />;
    case 'eye':      return <Eye className="w-5 h-5" />;
    case 'monitor':  return <Monitor className="w-5 h-5" />;
    case 'keyboard': return <Keyboard className="w-5 h-5" />;
    default:         return <AlertTriangle className="w-5 h-5" />;
  }
};

const ExamSecurity = ({ attemptId, examId, children, onViolation }) => {
  const [violationCount, setViolationCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const logTimeoutRef = useRef(null);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showViolationToast = useCallback((eventType) => {
    const config = VIOLATION_CONFIG[eventType] || {
      message: 'Phat hien hanh vi vi pham quy che thi!',
      icon: 'alert',
      severity: 'warning',
    };
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev.slice(-4), {
      id, type: eventType, message: config.message,
      icon: getIcon(config.icon), severity: config.severity, timestamp: Date.now(),
    }]);
    setTimeout(() => removeToast(id), 5000);
    if (config.severity === 'danger') {
      setShowOverlay(true);
      setTimeout(() => setShowOverlay(false), 3000);
    }
  }, [removeToast]);

  const logSecurityEvent = useCallback(async (eventType, eventData) => {
    try {
      await api.logVstepSecurityEvent(examId, attemptId, eventType, eventData);
    } catch (err) {
      console.error('Failed to log security event:', err);
    }
    setViolationCount(prev => prev + 1);
    showViolationToast(eventType);
    if (onViolation) onViolation(eventType);
  }, [examId, attemptId, onViolation, showViolationToast]);

  const debouncedLog = useCallback((eventType, eventData) => {
    if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    logTimeoutRef.current = window.setTimeout(() => logSecurityEvent(eventType, eventData), 500);
  }, [logSecurityEvent]);

  // Stable ref for debouncedLog to avoid re-running effect on every render
  const debouncedLogRef = useRef(debouncedLog);
  useEffect(() => { debouncedLogRef.current = debouncedLog; }, [debouncedLog]);

  useEffect(() => {
    const ts = () => ({ timestamp: Date.now() });
    const log = (type, data) => debouncedLogRef.current(type, data);
    const onCopy =    (e) => { e.preventDefault(); log('copy', ts()); };
    const onPaste =   (e) => { e.preventDefault(); log('paste', ts()); };
    const onCtxMenu = (e) => { e.preventDefault(); log('right_click', ts()); };
    const onBlur =    ()  => log('window_blur', ts());
    const onFsChange= ()  => { if (!document.fullscreenElement) log('fullscreen_exit', ts()); };
    const onKeyDown = (e) => {
      if (e.key === 'F12') { e.preventDefault(); log('devtools', { key: 'F12', ...ts() }); return; }
      if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) {
        e.preventDefault(); log('devtools', { key: `Ctrl+Shift+${e.key}`, ...ts() }); return;
      }
      if (e.ctrlKey && ['u','s','p'].includes(e.key)) {
        e.preventDefault(); log('keyboard_shortcut', { key: `Ctrl+${e.key.toUpperCase()}`, ...ts() });
      }
    };
    const onVisible = () => { if (document.hidden) log('tab_switch', ts()); };

    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onCtxMenu);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisible);

    // DO NOT request fullscreen here — browser blocks non-user-gesture calls.
    // Fullscreen is now requested from ExamIntroScreen "Start" button click.

    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onCtxMenu);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisible);
      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
    };
  }, []); // Empty deps — only mount/unmount once

  const bannerColor = violationCount >= 5
    ? 'bg-red-700 animate-pulse'
    : violationCount >= 3 ? 'bg-red-600' : 'bg-orange-500';

  return (
    <div className="relative">
      {/* Violation banner */}
      {violationCount > 0 && (
        <div className={`fixed top-0 left-0 right-0 z-[60] text-white text-center text-sm font-bold py-2 px-4 flex items-center justify-center gap-2 ${bannerColor}`}>
          <AlertTriangle className="w-4 h-4" />
          {violationCount >= 5
            ? `CANH BAO NGHIEM TRONG: ${violationCount} vi pham! Bai thi co the bi huy!`
            : violationCount >= 3
              ? `Canh bao: ${violationCount} hanh vi vi pham da bi ghi nhan!`
              : `Luu y: ${violationCount} vi pham quy che thi da duoc ghi nhan`}
        </div>
      )}

      {/* Red overlay flash */}
      {showOverlay && (
        <div className="fixed inset-0 z-[70] pointer-events-none animate-pulse">
          <div className="absolute inset-0 bg-red-600/20 border-4 border-red-600" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-700/95 text-white px-8 py-6 rounded-xl shadow-2xl flex items-center gap-4 pointer-events-auto">
            <AlertTriangle className="w-10 h-10 text-yellow-300 shrink-0" />
            <div>
              <div className="text-lg font-bold">VI PHAM QUY CHE THI!</div>
              <div className="text-sm text-red-100 mt-1">Hanh vi nay da bi ghi nhan va se duoc bao cao cho giam thi.</div>
            </div>
          </div>
        </div>
      )}

      {/* Toast stack */}
      <div className="fixed top-12 right-4 z-[65] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-xl border-l-4 text-sm animate-slide-in-right ${
              toast.severity === 'danger'
                ? 'bg-red-50 border-red-600 text-red-900'
                : 'bg-amber-50 border-amber-500 text-amber-900'
            }`}
          >
            <div className={`shrink-0 mt-0.5 ${toast.severity === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>
              {toast.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs uppercase tracking-wide mb-0.5">
                {toast.severity === 'danger' ? 'Vi pham nghiem trong' : 'Canh bao'}
              </div>
              <div className="text-sm leading-snug">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={`shrink-0 p-0.5 rounded hover:bg-black/10 ${toast.severity === 'danger' ? 'text-red-400' : 'text-amber-400'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Exam content */}
      <div style={{ paddingTop: violationCount > 0 ? '40px' : '0' }}>
        {children}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in-right { animation: slideInRight 0.35s ease-out; }
      `}</style>
    </div>
  );
};

export default ExamSecurity;
