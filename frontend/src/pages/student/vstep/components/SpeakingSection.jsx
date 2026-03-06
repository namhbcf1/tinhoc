import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Upload, Clock, RefreshCw } from 'lucide-react';
import useAudioRecorder from '../../../../hooks/useAudioRecorder';
import api from '../../../../services/api';

const SpeakingQuestion = ({ question, onSave }) => {
    // States: idle, preparing, recording, uploading, completed
    const [phase, setPhase] = useState('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const { startRecording, stopRecording, isRecording, audioBlob, audioUrl } = useAudioRecorder();

    // Settings defaults
    const settings = question.settings || {};
    const prepSeconds = settings.prep_seconds || 60;
    const speakSeconds = settings.speak_seconds || 120;

    useEffect(() => {
        let timer;
        if ((phase === 'preparing' || phase === 'recording') && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleTimerComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [phase, timeLeft]);

    const handleTimerComplete = () => {
        if (phase === 'preparing') {
            // Auto start recording
            setPhase('recording');
            setTimeLeft(speakSeconds);
            startRecording();
        } else if (phase === 'recording') {
            // Auto stop
            stopRecording();
            setPhase('uploading');
        }
    };

    const handleStart = () => {
        setPhase('preparing');
        setTimeLeft(prepSeconds);
    };

    // Auto upload when recording stops (and we have blob)
    // Note: useAudioRecorder sets blob asynchronously, use Effect to watch it?
    // Or handle in handleTimerComplete? 
    // Effect safely watches blob change only if we are in 'uploading' phase.

    useEffect(() => {
        if (phase === 'uploading' && audioBlob) {
            uploadRecording();
        }
    }, [phase, audioBlob]);

    const uploadRecording = async () => {
        try {
            // Upload
            const filename = `speaking_${question.id}_${Date.now()}.webm`;
            // Ensure we differentiate student upload.
            // Using existing uploadDocument for now. 
            // Better: api.uploadAssignment?
            const res = await api.uploadDocument('SYSTEM', 'Speaking Answer', filename, audioBlob);

            if (res && (res.url || res.data?.url || res.r2_key)) {
                const url = res.url || res.data?.url || res.r2_key;
                onSave(question.id, url);
                setPhase('completed');
            } else {
                throw new Error("Upload failed, no URL returned");
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi upload: " + error.message);
            setPhase('completed'); // Mark done anyway? Allow retry?
            // Allow retry logic would be better.
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default">
            <h3 className="font-bold text-slate-800 mb-4">{question.content || "Speaking Question"}</h3>

            <div className="flex items-center gap-4">
                {/* Status Indicator */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border ${phase === 'idle' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                        phase === 'preparing' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                            phase === 'recording' ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' :
                                phase === 'uploading' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                    'bg-green-50 text-green-600 border-green-200'
                    }`}>
                    {phase === 'idle' && <Square size={16} />}
                    {phase === 'preparing' && <Clock size={16} />}
                    {phase === 'recording' && <Mic size={16} />}
                    {phase === 'uploading' && <Upload size={16} />}
                    {phase === 'completed' && <CheckIcon />}

                    <span className="uppercase text-xs tracking-wide">
                        {phase === 'idle' ? 'Chưa bắt đầu' :
                            phase === 'preparing' ? 'Chuẩn bị' :
                                phase === 'recording' ? 'Đang ghi âm' :
                                    phase === 'uploading' ? 'Đang lưu...' :
                                        'Hoàn thành'}
                    </span>
                </div>

                {/* Timer */}
                {(phase === 'preparing' || phase === 'recording') && (
                    <div className="text-2xl font-mono font-bold text-slate-800 tracking-tight">
                        00:{timeLeft.toString().padStart(2, '0')}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
                {phase === 'idle' && (
                    <button
                        onClick={handleStart}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Play size={18} />
                        Bắt đầu
                    </button>
                )}

                {phase === 'recording' && (
                    <button
                        onClick={() => { stopRecording(); setPhase('uploading'); }}
                        className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                        <Square size={18} />
                        Dừng sớm
                    </button>
                )}

                {audioUrl && (
                    <audio src={audioUrl} controls className="h-10 mt-2" />
                )}
            </div>
        </div>
    );
};

// Simple Icon
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const SpeakingSection = ({ section, answers, onAnswerChange }) => {
    // Speaking usually has 3 Parts.

    // We render tabs for parts if multiple groups.
    const [activePartIndex, setActivePartIndex] = useState(0);
    const parts = section.groups || [];

    if (parts.length === 0) return <div>Không có bài nói.</div>;
    const activePart = parts[activePartIndex];

    // Questions in this part
    const questions = activePart.questions || [];

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

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">{activePart.title}</h2>
                    {activePart.image_url && (
                        <img src={activePart.image_url} alt="Context" className="mb-6 rounded-2xl shadow-sm max-h-60 w-auto hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-default" />
                    )}

                    <div className="space-y-8">
                        {questions.map(q => (
                            <SpeakingQuestion
                                key={q.id}
                                question={q}
                                onSave={(qid, url) => onAnswerChange(qid, url)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpeakingSection;
