import React from 'react';

const ReadingSection = ({ section, answers, onAnswerChange }) => {
    // Collect all groups (passages)
    // Some exams might have multiple passages in one Reading Section (Part 1, Part 2...)
    // Or just one big section. Database structure supports multiple groups.

    // UI: We render tabs if multiple passages? Or just vertical stack?
    // VSTEP usually has Part 1, Part 2, Part 3, Part 4. Each has its own passage.
    // Ideally we should have sub-tabs for Parts if section has multiple parts.
    // For MVP, we'll stack them, but Split Pane works best for ONE passage at a time.
    // Let's assume the user clicks "Part X" in `VStepExamHall`?
    // In database, Sections -> Groups (Parts). 
    // `VStepExamHall` rendered Sections.
    // So `ReadingSection` receives one Section (e.g. "Reading Skills").
    // Inspecting `VStepExamHall`: It tabs through `sections`.
    // Valid mapping: Exam has 4 Sections (L, R, W, S).
    // Reading Section has 4 Groups (Part 1..4).

    // UX Decision: We need TABS for Parts inside Reading Section.
    const [activePartIndex, setActivePartIndex] = React.useState(0);
    const parts = section.groups || [];

    if (parts.length === 0) return <div>Không có dữ liệu bài đọc.</div>;

    const activePart = parts[activePartIndex];

    return (
        <div className="h-full flex flex-col">
            {/* Part Tabs (Only if multiple parts) */}
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
                            {part.title || `Part ${idx + 1}`}
                        </button>
                    ))}
                </div>
            )}

            {/* Split Pane - Responsive: vertical on mobile, horizontal on desktop */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* LEFT/TOP: Passage */}
                <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 p-4 md:p-6">
                    <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-slate-800">{activePart.title}</h3>
                    <div
                        className="prose prose-sm md:prose prose-slate max-w-none prose-p:text-justify prose-img:rounded-xl"
                        dangerouslySetInnerHTML={{ __html: activePart.text_content }}
                    />
                </div>

                {/* RIGHT/BOTTOM: Questions */}
                <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-y-auto bg-white p-4 md:p-6 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                    <div className="space-y-4 md:space-y-8">
                        {activePart.questions.map((q, idx) => (
                            <div key={q.id} className="p-3 md:p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all">
                                <div className="flex gap-2 md:gap-3">
                                    <span className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-blue-50 text-blue-600 font-bold rounded-lg text-xs md:text-sm">
                                        {q.order_index || idx + 1}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm md:text-base text-slate-800 mb-3 md:mb-4">{q.content}</p>

                                        <div className="space-y-2 md:space-y-3">
                                            {q.options.map((opt, optIdx) => {
                                                const optLabel = ['A', 'B', 'C', 'D'][optIdx];
                                                const isSelected = answers[q.id] === optLabel;

                                                return (
                                                    <label
                                                        key={optIdx}
                                                        className={`flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                                            ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                                                            : 'border-slate-100 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`q-${q.id}`}
                                                            value={optLabel}
                                                            checked={isSelected}
                                                            onChange={() => onAnswerChange(q.id, optLabel)}
                                                            className="mt-0.5 md:mt-1"
                                                        />
                                                        <span className="text-xs md:text-sm text-slate-700">
                                                            <span className="font-bold mr-1 md:mr-2">{optLabel}.</span>
                                                            {opt}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReadingSection;
