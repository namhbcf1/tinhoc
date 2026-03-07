/**
 * SkillCard — shows per-skill score + progress bar for VStepExamResult
 */
const COLOR_MAP = {
  blue:   { card: 'bg-blue-50 border-blue-200 text-blue-700', bar: 'bg-blue-500' },
  green:  { card: 'bg-green-50 border-green-200 text-green-700', bar: 'bg-green-500' },
  purple: { card: 'bg-purple-50 border-purple-200 text-purple-700', bar: 'bg-purple-500' },
  orange: { card: 'bg-orange-50 border-orange-200 text-orange-700', bar: 'bg-orange-500' },
};

const ResultSkillCard = ({ skill, score, correct, total, color, isManualGrading }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  const pct = Math.min((score / 10) * 100, 100);

  return (
    <div className={`border-2 rounded-xl p-4 ${c.card}`}>
      <div className="text-xs font-bold uppercase tracking-wide mb-1">{skill}</div>
      <div className="text-3xl font-bold mb-1">{score.toFixed(1)}</div>
      <div className="text-xs text-gray-500 mb-3">
        {isManualGrading
          ? 'Đã chấm tay'
          : total > 0 ? `${correct}/${total} câu đúng` : 'Chưa có dữ liệu'}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default ResultSkillCard;
