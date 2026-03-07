import React from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

const ListeningSection = ({ section, answers, onAnswerChange }) => {
    const [activePartIndex, setActivePartIndex] = React.useState(0);
    const parts = section.groups || [];

    if (parts.length === 0) return <div>Không có dữ liệu bài nghe.</div>;
    const activePart = parts[activePartIndex];
    const audioUrl = activePart.audio_url || null;

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
                            {part.title || `Part ${idx + 1}`}
                        </button>
                    ))}
                </div>
            )}

            {/* Split Pane - Responsive: vertical on mobile, horizontal on desktop */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* LEFT/TOP: Audio Player & Instructions */}
                <div className="w-full md:w-1/2 h-auto md:h-full overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 p-4 md:p-6">
                    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-2xl shadow-sm border border-slate-200 sticky top-0 z-10 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                        <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-slate-800 flex items-center gap-2">
                            <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                            {activePart.title}
                        </h3>
                        {audioUrl ? (
                            <audio
                                controls
                                className="w-full h-10 md:h-12 rounded-lg bg-slate-100"
                                src={audioUrl}
                                controlsList="nodownload"
                            />
                        ) : (
                            <div className="p-3 md:p-4 bg-red-50 text-red-600 rounded-lg text-xs md:text-sm border border-red-100">
                                Chưa có file Audio cho phần thi này. Vui lòng báo giám thị.
                            </div>
                        )}
                        {activePart.text_content && (
                            <div className="mt-3 md:mt-4 p-3 md:p-4 bg-slate-50 rounded-lg text-xs md:text-sm text-slate-600 italic border border-slate-100">
                                {activePart.text_content}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT/BOTTOM: Questions */}
                <div className="w-full md:w-1/2 flex-1 md:h-full overflow-y-auto bg-white p-4 md:p-6 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                    <div className="space-y-4 md:space-y-6">
                        {activePart.questions.map((q, idx) => (
                            <div key={q.id} className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
                                <div className="flex gap-3 md:gap-4">
                                    <span className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-blue-600 text-white font-bold rounded-lg text-xs md:text-sm">
                                        {q.order_index || idx + 1}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm md:text-lg text-slate-900 mb-4 md:mb-6">{q.content}</p>

                                        <div className="space-y-3 md:space-y-4">
                                            {q.options.map((opt, optIdx) => {
                                                const optLabel = ['A', 'B', 'C', 'D'][optIdx];
                                                const isSelected = answers[q.id] === optLabel;

                                                return (
                                                    <label
                                                        key={optIdx}
                                                        className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                                            ? 'bg-blue-50 border-blue-500 shadow-md'
                                                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                                                            }`}>
                                                            {isSelected && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="font-bold mr-1 md:mr-2 text-xs md:text-sm text-slate-500">{optLabel}.</span>
                                                            <span className="text-xs md:text-sm text-slate-800">{opt}</span>
                                                        </div>
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

export default ListeningSection;
