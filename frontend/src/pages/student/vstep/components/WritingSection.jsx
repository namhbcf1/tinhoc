import React, { useState, useEffect } from 'react';
import { AlignLeft } from 'lucide-react';

const WritingSection = ({ section, answers, onAnswerChange }) => {
    // Usually Writing has 1 or 2 Tasks.
    // Tasks are "Groups" in our schema? Or "Questions" per group?
    // VSTEP Writing: Task 1 (Letter), Task 2 (Essay).
    // Our Schema: Section -> Groups (Task 1) -> Question (The prompt).
    // Answers table works on Question ID.
    // So we need to render each Task (Group) and its Question.

    // We assume the user enters text for the Question.
    const [activePartIndex, setActivePartIndex] = useState(0);
    const parts = section.groups || [];

    if (parts.length === 0) return <div>Không có dữ liệu bài viết.</div>;
    const activePart = parts[activePartIndex];
    // In Writing, a Group usually contains 1 Question (The prompt to answer).
    const question = activePart.questions[0];

    // Word Count Logic
    const currentAnswer = answers[question?.id] || "";
    const wordCount = currentAnswer.trim().split(/\s+/).filter(w => w.length > 0).length;

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Tabs */}
            {parts.length > 1 && (
                <div className="bg-white border-b border-slate-200 px-4 flex gap-4 shrink-0 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                    {parts.map((part, idx) => (
                        <button
                            key={part.id}
                            onClick={() => setActivePartIndex(idx)}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activePartIndex === idx
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {part.title || `Task ${idx + 1}`}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Instructions */}
                <div className="w-1/3 h-full overflow-y-auto border-r border-slate-200 bg-white p-6 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                    <h3 className="font-bold text-xl text-slate-800 mb-2 tracking-tight">{activePart.title}</h3>
                    {/* The prompt is in the question content usually */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-800 leading-relaxed font-serif">
                        {question ? (
                            <div dangerouslySetInnerHTML={{ __html: question.content }} />
                        ) : "Đang tải đề bài..."}
                    </div>
                </div>

                {/* Right: Editor */}
                <div className="w-2/3 h-full flex flex-col bg-white p-6 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-medium text-slate-500 flex items-center gap-2">
                            <AlignLeft size={18} />
                            Nhập bài làm của bạn
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${wordCount > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {wordCount} từ
                        </span>
                    </div>

                    <textarea
                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-medium leading-relaxed hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default"
                        placeholder="Bắt đầu viết tại đây..."
                        value={currentAnswer}
                        onChange={(e) => question && onAnswerChange(question.id, e.target.value)}
                        spellCheck="false"
                    />
                </div>
            </div>
        </div>
    );
};

export default WritingSection;
