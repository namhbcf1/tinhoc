import { useState } from 'react';
import {
  FileText, BookOpen, Headphones, Mic, PenLine,
  CheckCircle, AlertCircle, XCircle, ChevronRight,
  ClipboardList, Calendar, TrendingUp, MessageSquare
} from 'lucide-react';
import { StudentPageShell, StudentModal, StudentCardSkeleton } from '../../../features/student/student-shared';
import { useStudentReviews } from '../../../features/student/student-hooks';
import type { StudentReviewVM, StudentReviewSkillVM } from '../../../features/student/student-hooks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_LABELS: Record<string, string> = {
  reading: 'Reading',
  listening: 'Listening',
  speaking: 'Speaking',
  writing: 'Writing',
};

const SKILL_ICONS: Record<string, typeof BookOpen> = {
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
  writing: PenLine,
};

const STATUS_CONFIG = {
  good: {
    label: 'Tốt',
    icon: CheckCircle,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    iconColor: 'text-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  needs_work: {
    label: 'Cần cải thiện',
    icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconColor: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  weak: {
    label: 'Cần chú ý',
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconColor: 'text-red-500',
    badge: 'bg-red-100 text-red-700',
  },
};

const HOMEWORK_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  du: { label: 'Đủ', cls: 'bg-emerald-100 text-emerald-700' },
  thieu_video: { label: 'Thiếu video', cls: 'bg-amber-100 text-amber-700' },
  khong_nop: { label: 'Không nộp', cls: 'bg-red-100 text-red-700' },
  duoc_nghi: { label: 'Được nghỉ', cls: 'bg-slate-100 text-slate-600' },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── Skill Card ────────────────────────────────────────────────────────────────

function SkillCard({ skill }: { skill: StudentReviewSkillVM }) {
  const Icon = SKILL_ICONS[skill.skill] || BookOpen;
  const cfg = skill.skill_status ? STATUS_CONFIG[skill.skill_status] : null;

  return (
    <div className={`rounded-xl border p-4 ${cfg ? `${cfg.bg} ${cfg.border}` : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className={cfg ? cfg.iconColor : 'text-slate-500'} />
          <span className="font-bold text-sm text-slate-800">{SKILL_LABELS[skill.skill]}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {skill.score_raw && (
            <span className="text-sm font-extrabold text-slate-900">{skill.score_raw}</span>
          )}
          {cfg && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
          )}
        </div>
      </div>
      {skill.comments && (
        <p className="text-xs text-slate-600 leading-relaxed">{skill.comments}</p>
      )}
    </div>
  );
}

// ─── Review Detail Modal ───────────────────────────────────────────────────────

function ReviewDetailModal({ review, onClose }: { review: StudentReviewVM; onClose: () => void }) {
  const hasBHTN = review.homework_tracking.length > 0;
  const hasScores = review.test_scores.length > 0;
  const hasSkills = review.skills.length > 0;

  return (
    <StudentModal
      open
      title={review.report_title || `Báo cáo — ${review.class_name}`}
      onClose={onClose}
    >
      {/* Meta */}
      <div className="flex flex-wrap gap-2 mb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg px-2.5 py-1">
          <ClipboardList size={12} />
          {review.class_name}
        </span>
        {review.period_label && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1">
            <Calendar size={12} />
            {review.period_label}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 rounded-lg px-2.5 py-1">
          Cập nhật: {formatDate(review.updated_at)}
        </span>
      </div>

      {/* Overall summary */}
      {review.overall_summary && (
        <section>
          <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-700 uppercase tracking-wide mb-2">
            <TrendingUp size={14} className="text-indigo-500" />
            Nhận xét tổng quan
          </h4>
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {review.overall_summary}
          </div>
        </section>
      )}

      {/* Skills */}
      {hasSkills && (
        <section>
          <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-700 uppercase tracking-wide mb-2.5">
            <BookOpen size={14} className="text-emerald-500" />
            Đánh giá kỹ năng
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {review.skills.map((skill) => (
              <SkillCard key={skill.skill} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {/* Test scores */}
      {hasScores && (
        <section>
          <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-700 uppercase tracking-wide mb-2.5">
            <FileText size={14} className="text-blue-500" />
            Bảng điểm test đầu ra
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">Kỹ năng</th>
                  <th className="text-center px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">Điểm tối đa</th>
                  <th className="text-center px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">Điểm đạt</th>
                  <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {review.test_scores.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{row.skill_label}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{row.max_score ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-slate-900">
                      {row.student_score != null ? row.student_score : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{row.score_notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Homework tracking */}
      {hasBHTN && (
        <section>
          <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-700 uppercase tracking-wide mb-2.5">
            <ClipboardList size={14} className="text-purple-500" />
            Theo dõi bài tập về nhà
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {review.homework_tracking.map((entry, idx) => {
              const cfg = HOMEWORK_STATUS_LABELS[entry.status] || { label: entry.status, cls: 'bg-slate-100 text-slate-600' };
              return (
                <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs text-slate-600 font-medium">{entry.date}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {review.recommendations && (
        <section>
          <h4 className="flex items-center gap-2 text-sm font-extrabold text-slate-700 uppercase tracking-wide mb-2">
            <MessageSquare size={14} className="text-amber-500" />
            Đề xuất & kế hoạch tiếp theo
          </h4>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {review.recommendations}
          </div>
        </section>
      )}
    </StudentModal>
  );
}

// ─── Review Card (list item) ───────────────────────────────────────────────────

function ReviewCard({ review, onClick }: { review: StudentReviewVM; onClick: () => void }) {
  const skillBadges = review.skills.filter((s) => s.skill_status);
  const goodCount = skillBadges.filter((s) => s.skill_status === 'good').length;
  const weakCount = skillBadges.filter((s) => s.skill_status === 'weak').length;
  const needsWorkCount = skillBadges.filter((s) => s.skill_status === 'needs_work').length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all group"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-extrabold text-slate-900 text-sm truncate">{review.class_name}</span>
              {review.class_code && (
                <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{review.class_code}</span>
              )}
            </div>
            {review.report_title && (
              <p className="text-xs font-semibold text-slate-700 mb-1">{review.report_title}</p>
            )}
            {review.period_label && (
              <p className="text-xs text-slate-500">{review.period_label}</p>
            )}
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-500 shrink-0 mt-0.5 transition-colors" />
        </div>

        {/* Skill summary badges */}
        {skillBadges.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {goodCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle size={10} /> {goodCount} Tốt
              </span>
            )}
            {needsWorkCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                <AlertCircle size={10} /> {needsWorkCount} Cần cải thiện
              </span>
            )}
            {weakCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                <XCircle size={10} /> {weakCount} Cần chú ý
              </span>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-400 mt-2">Cập nhật: {formatDate(review.updated_at)}</p>
      </div>
    </button>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <FileText size={24} className="text-slate-400" />
      </div>
      <h3 className="font-extrabold text-slate-700 mb-1">Chưa có báo cáo nào</h3>
      <p className="text-sm text-slate-400 max-w-xs">
        Giáo viên sẽ gửi báo cáo học tập sau mỗi đợt học. Hãy kiểm tra lại sau.
      </p>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function StudentReviewsView({ compact = false }: { compact?: boolean }) {
  const { reviews, loading, error, selectedReview, setSelectedReview } = useStudentReviews();

  return (
    <>
      <StudentPageShell
        icon={<FileText size={18} />}
        title="Báo cáo học tập"
        subtitle="Báo cáo đánh giá của giáo viên về kết quả học tập của bạn."
        compact={compact}
        stickyHeader={!compact}
        stats={reviews.length > 0 ? [{ label: 'Báo cáo', value: reviews.length }] : []}
      >
        {loading && <StudentCardSkeleton count={3} />}

        {!loading && error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && reviews.length === 0 && <EmptyState />}

        {!loading && !error && reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onClick={() => setSelectedReview(review)}
              />
            ))}
          </div>
        )}
      </StudentPageShell>

      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </>
  );
}
