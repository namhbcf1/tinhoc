// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Maximize2, Minimize2, MessageSquare, Loader2, User, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../../lib/utils';
import { gsap } from '../../lib/gsap';

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Xin chào! Tôi là Trợ lý AI của VanTrangEdu. Tôi có thể giúp gì cho bạn hôm nay?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef();
    const chatRef = useRef();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    useEffect(() => {
        if (isOpen) {
            gsap.fromTo(chatRef.current,
                { opacity: 0, scale: 0.9, y: 20 },
                { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
            );
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const api = (await import('../../services/api')).default;
            const result = await api.queryAI(input);

            if (result.success && result.response) {
                setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
            } else {
                throw new Error('No response');
            }
        } catch (err) {
            console.error('AI Error:', err);
            // Fallback to local simulated response if API fails
            const aiResponse = generateAIResponse(input);
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse + ' (Lưu ý: Đang chạy ở chế độ offline do lỗi kết nối AI)' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const generateAIResponse = (query) => {
        const q = query.toLowerCase();
        if (q.includes('vstep')) return 'VanTrangEdu là đơn vị hàng đầu luyện thi VSTEP. Chúng tôi có các lộ trình cấp tốc 1.5 - 3 tháng giúp bạn đạt B1, B2 dễ dàng.';
        if (q.includes('học phí') || q.includes('giá')) return 'Học phí tại VanTrangEdu rất cạnh tranh và linh hoạt. Bạn có thể xem chi tiết trong mục "Học phí & Thanh toán" ở Dashboard hoặc để lại số điện thoại để tư vấn viên liên hệ nhé!';
        if (q.includes('địa chỉ') || q.includes('ở đâu')) return 'Chúng tôi có trụ sở chính tại Hà Nội và hệ thống đào tạo Online toàn quốc. Bạn có thể học bất cứ đâu!';
        if (q.includes('liên hệ')) return 'Bạn có thể gọi Hotline: 096.244.5963 hoặc chat Zalo để được hỗ trợ ngay lập tức.';
        return 'Cảm ơn câu hỏi của bạn! Đó là một vấn đề thú vị. Tại VanTrangEdu, chúng tôi luôn tối ưu hóa lộ trình học tập để bạn đạt kết quả tốt nhất. Bạn có muốn tìm hiểu kỹ hơn về khóa học nào không?';
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] font-sans">
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 liquid-shadow overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Bot className="relative z-10 w-8 h-8 group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    ref={chatRef}
                    className={cn(
                        "glass-card border-slate-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden transition-all duration-500 origin-bottom-right",
                        isMaximized ? "fixed inset-6 w-auto h-auto m-0" : "w-[400px] h-[600px] rounded-3xl"
                    )}
                >
                    {/* Header */}
                    <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                <Zap size={20} className="text-white" fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                                    Smart Assistant
                                </h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">AI Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                                {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Body */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                        {messages.map((m, i) => (
                            <div key={i} className={cn("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "max-w-[85%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2",
                                    m.role === 'user'
                                        ? "bg-emerald-600 text-white rounded-tr-none"
                                        : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
                                )}>
                                    {m.content}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-tighter">
                                    {m.role === 'user' ? 'Bạn' : 'AI Assistant'}
                                </span>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex items-start gap-2">
                                <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm h-10 flex items-center">
                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-5 bg-white border-t border-slate-100 flex items-center gap-3">
                        <div className="flex-1 relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Nhập câu hỏi của bạn..."
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 font-medium"
                            />
                            <div className="absolute inset-0 rounded-xl border border-slate-200 group-focus-within:border-emerald-500/50 pointer-events-none transition-colors" />
                        </div>
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="bg-slate-900 hover:bg-emerald-600 text-white h-11 w-11 p-0 rounded-xl transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                        >
                            <Send size={18} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
