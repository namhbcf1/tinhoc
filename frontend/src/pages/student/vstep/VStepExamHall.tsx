/**
 * VStepExamHall - Main exam engine.
 * Ported from vantrangexam/pages/ExamPlayer.tsx
 * Supports: 4 skills (L/R/W/S), per-skill timers, MCQ+essay+recording,
 * auto-advance on timer expiry, anti-cheat via ExamSecurity, answer auto-save.
 *
 * Route: /student/vstep/take/:id  (id = attemptId)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import api from '../../../services/api';
import ExamSecurity from './components/ExamSecurity';
import ExamHeader from './components/ExamHeader';
import ExamIntroScreen from './components/ExamIntroScreen';
import SectionRenderer from './components/SectionRenderer';

// Auto-save debounce delay (ms)
const AUTOSAVE_DELAY = 1500;
// Countdown seconds before auto-advancing to next section
const AUTO_ADVANCE_COUNTDOWN = 5;

const VStepExamHall = () => {
  const { id: attemptId } = useParams();
  const navigate = useNavigate();

  // Core state
  const [view, setView] = useState('intro'); // 'intro' | 'exam'
  const [examData, setExamData] = useState(null);     // full exam object
  const [sections, setSections] = useState([]);        // array of skill sections
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState('loading');     // loading|active|submitting|completed

  // Per-skill timers: { LISTENING: seconds, READING: seconds, ... }
  const [skillTimers, setSkillTimers] = useState({});
  const [globalTimeLeft, setGlobalTimeLeft] = useState(0);

  const [answers, setAnswers] = useState({});

  // Fix #2: auto-save status indicator & error banner
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const [autoSaveError, setAutoSaveError] = useState(null);

  // Fix #3: auto-advance countdown warning
  const [advanceCountdown, setAdvanceCountdown] = useState(null); // null | number (seconds)
  const advanceCancelRef = useRef(false);
  const advanceTimerRef = useRef(null);

  const autosaveRef = useRef(null);
  const timerRef = useRef(null);
  const examIdRef = useRef(null);
  const autoSaveErrorTimerRef = useRef(null);

  // Fix #1: localStorage key for storing started_at per attempt
  const startedAtKey = `vstep_started_at_${attemptId}`;

  // Load attempt + exam on mount
  useEffect(() => {
    if (attemptId) loadAttempt();
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(autosaveRef.current);
      clearTimeout(autoSaveErrorTimerRef.current);
      clearInterval(advanceTimerRef.current);
    };
  }, [attemptId]);

  const loadAttempt = async () => {
    try {
      const attemptRes = await api.getVstepAttempt(attemptId);
      if (!attemptRes.success) throw new Error(attemptRes.error || 'Cannot load attempt');

      const attempt = attemptRes.data;
      if (attempt.status === 'completed') {
        alert('Bai thi nay da duoc nop.');
        navigate('/dashboard/learning');
        return;
      }

      examIdRef.current = attempt.exam_id;

      const examRes = await api.getVstepExam(attempt.exam_id);
      if (!examRes.success) throw new Error(examRes.error || 'Cannot load exam');

      const exam = examRes.data;
      const secs = exam.sections || [];
      setExamData(exam);
      setSections(secs);

      // Build per-skill timers from section.duration_minutes
      const timers = {};
      secs.forEach(sec => {
        timers[sec.type] = (sec.duration_minutes || 0) * 60;
      });
      setSkillTimers(timers);

      // Fix #1: use started_at from localStorage (set when student clicks "Bắt đầu làm bài")
      // If already started before, restore elapsed time correctly
      const savedStartedAt = localStorage.getItem(startedAtKey);
      const startRef = savedStartedAt ? parseInt(savedStartedAt, 10) : null;

      if (startRef) {
        // Already started — compute elapsed from actual start time
        const elapsed = Math.floor((Date.now() - startRef) / 1000);
        const totalSec = (exam.duration || 0) * 60;
        setGlobalTimeLeft(Math.max(0, totalSec - elapsed));
      } else {
        // Not yet started — set full duration; timer begins after clicking "Bắt đầu"
        const totalSec = (exam.duration || 0) * 60;
        setGlobalTimeLeft(totalSec);
      }

      // Restore saved answers if any
      if (attempt.answers) {
        const saved = {};
        attempt.answers.forEach(a => { saved[a.question_id] = a.value; });
        setAnswers(saved);
      }

      setStatus('active');
    } catch (err) {
      console.error(err);
      alert('Loi tai bai thi: ' + err.message);
    }
  };

  // Fix #1: record started_at when student actually clicks "Bắt đầu làm bài"
  const handleStartExam = useCallback(() => {
    const existing = localStorage.getItem(startedAtKey);
    if (!existing) {
      localStorage.setItem(startedAtKey, String(Date.now()));
    }
    setView('exam');
  }, [startedAtKey]);

  // Global countdown — only runs while in 'exam' view
  useEffect(() => {
    if (status !== 'active' || view !== 'exam') return;
    timerRef.current = setInterval(() => {
      setGlobalTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          autoSubmit();
          return 0;
        }
        return prev - 1;
      });
      // Decrement current skill timer
      setSkillTimers(prev => {
        const key = sections[currentIndex]?.type;
        if (!key || prev[key] <= 0) return prev;
        const updated = { ...prev, [key]: prev[key] - 1 };
        // Fix #3: show countdown warning before auto-advancing
        if (updated[key] <= 0) {
          triggerAdvanceWarning();
        }
        return updated;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, view, currentIndex, sections]);

  // Fix #3: show 5-second countdown, then advance unless cancelled
  const triggerAdvanceWarning = useCallback(() => {
    // Avoid duplicate warnings
    if (advanceCountdown !== null) return;
    advanceCancelRef.current = false;
    setAdvanceCountdown(AUTO_ADVANCE_COUNTDOWN);

    let remaining = AUTO_ADVANCE_COUNTDOWN;
    advanceTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (advanceCancelRef.current) {
        clearInterval(advanceTimerRef.current);
        setAdvanceCountdown(null);
        return;
      }
      if (remaining <= 0) {
        clearInterval(advanceTimerRef.current);
        setAdvanceCountdown(null);
        // Actually advance
        setCurrentIndex(prev => {
          const next = prev + 1;
          if (next >= sections.length) {
            autoSubmit();
            return prev;
          }
          return next;
        });
      } else {
        setAdvanceCountdown(remaining);
      }
    }, 1000);
  }, [advanceCountdown, sections.length]);

  const cancelAutoAdvance = useCallback(() => {
    advanceCancelRef.current = true;
    clearInterval(advanceTimerRef.current);
    setAdvanceCountdown(null);
  }, []);

  // Fix #2: Auto-save answer (debounced) with status + error feedback
  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    clearTimeout(autosaveRef.current);
    setAutoSaveStatus('saving');
    autosaveRef.current = setTimeout(async () => {
      try {
        await api.saveVstepAnswer(attemptId, questionId, value);
        setAutoSaveStatus('saved');
        setAutoSaveError(null);
        clearTimeout(autoSaveErrorTimerRef.current);
      } catch (err) {
        setAutoSaveStatus('error');
        setAutoSaveError('⚠️ Lưu tự động thất bại. Câu trả lời có thể bị mất. Vui lòng kiểm tra kết nối mạng.');
        // Auto-clear error after 5 seconds
        clearTimeout(autoSaveErrorTimerRef.current);
        autoSaveErrorTimerRef.current = setTimeout(() => {
          setAutoSaveError(null);
          setAutoSaveStatus('idle');
        }, 5000);
      }
    }, AUTOSAVE_DELAY);
  }, [attemptId]);

  const autoSubmit = useCallback(() => {
    if (status === 'submitting' || status === 'completed') return;
    handleSubmit(true);
  }, [status, answers]);

  const handleSubmit = async (forced = false) => {
    if (status === 'submitting') return;
    if (!forced && !window.confirm('Ban co chac chan muon nop bai?')) return;
    setStatus('submitting');
    try {
      await api.submitVstepAttempt(attemptId, answers);
      // Clean up started_at from localStorage on submit
      localStorage.removeItem(startedAtKey);
      setStatus('completed');
      navigate('/dashboard/learning');
    } catch (err) {
      console.error(err);
      alert('Loi nop bai: ' + err.message);
      setStatus('active');
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Dang tai de thi...</p>
        </div>
      </div>
    );
  }

  if (!examData || sections.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Loi: Khong co du lieu bai thi.</p>
      </div>
    );
  }

  // Intro screen — pass handleStartExam so started_at is recorded on actual click
  if (view === 'intro') {
    return (
      <ExamIntroScreen
        examData={examData}
        sections={sections}
        onStart={handleStartExam}
      />
    );
  }

  // Active exam
  const currentSection = sections[currentIndex];
  const currentSkillTime = skillTimers[currentSection?.type] ?? globalTimeLeft;

  // Fix #2: auto-save status label
  const saveStatusLabel = {
    idle: null,
    saving: <span className="text-xs text-slate-400 animate-pulse">Đang lưu...</span>,
    saved: <span className="text-xs text-green-600">✓ Đã lưu</span>,
    error: <span className="text-xs text-red-500">✗ Lưu thất bại</span>,
  }[autoSaveStatus];

  return (
    <ExamSecurity
      attemptId={attemptId}
      examId={examIdRef.current || ''}
      onViolation={(type) => console.warn('Security violation:', type)}
    >
      <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">

        {/* Fix #2: auto-save error banner */}
        {autoSaveError && (
          <div className="bg-amber-50 border-b border-amber-300 px-4 py-2 flex items-center justify-between text-amber-800 text-sm z-50">
            <span>{autoSaveError}</span>
            <button
              onClick={() => setAutoSaveError(null)}
              className="ml-4 text-amber-600 hover:text-amber-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Fix #3: auto-advance countdown warning banner */}
        {advanceCountdown !== null && (
          <div className="bg-blue-600 px-4 py-2 flex items-center justify-between text-white text-sm z-50">
            <span>
              Chuyển sang phần tiếp theo sau <strong>{advanceCountdown}</strong> giây...
            </span>
            <button
              onClick={cancelAutoAdvance}
              className="ml-4 px-3 py-1 bg-white text-blue-600 rounded font-semibold hover:bg-blue-50 transition-colors"
            >
              Ở lại
            </button>
          </div>
        )}

        <ExamHeader
          examTitle={examData.title}
          sections={sections}
          currentIndex={currentIndex}
          onSelectSection={setCurrentIndex}
          timeLeft={currentSkillTime}
          onSubmit={() => handleSubmit(false)}
          isSubmitting={status === 'submitting'}
        />

        {/* Fix #2: save status indicator below header */}
        {saveStatusLabel && (
          <div className="px-4 py-1 bg-white border-b border-slate-100 flex justify-end">
            {saveStatusLabel}
          </div>
        )}

        <main className="flex-1 overflow-hidden relative">
          {currentSection ? (
            <SectionRenderer
              section={currentSection}
              answers={answers}
              onAnswerChange={handleAnswerChange}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Khong co noi dung phan nay.
            </div>
          )}
        </main>
      </div>
    </ExamSecurity>
  );
};

export default VStepExamHall;
