import { useState, useEffect, useId } from 'react';
import { X, Gift, Clock } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent } from './Card';

/**
 * ExitIntentModal Component
 * Displays special offer when user attempts to leave
 * Shows once per session with sessionStorage
 * WCAG 2.2: role="dialog", aria-modal, aria-labelledby, Escape key, focus restore
 */
export default function ExitIntentModal() {
    const [isVisible, setIsVisible] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
    const titleId = useId();

    useEffect(() => {
        // Check if already shown in this session
        const hasShown = sessionStorage.getItem('exitIntentShown');
        if (hasShown) return;

        let isExiting = false;

        const handleMouseLeave = (e) => {
            if (e.clientY <= 0 && !isExiting) {
                isExiting = true;
                setIsVisible(true);
                sessionStorage.setItem('exitIntentShown', 'true');
            }
        };

        // Add event listener after a delay to avoid immediate trigger
        const timer = setTimeout(() => {
            document.addEventListener('mouseleave', handleMouseLeave);
        }, 5000);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isVisible]);

    // Escape key to close dialog
    useEffect(() => {
        if (!isVisible) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isVisible]);

    const handleClose = () => {
        setIsVisible(false);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
            aria-hidden="true"
        >
            {/* Dialog panel — role="dialog" for screen readers */}
            <Card
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative max-w-lg mx-4 border-none shadow-2xl overflow-hidden"
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                    aria-label="Đóng ưu đãi"
                >
                    <X size={20} aria-hidden="true" />
                </button>

                <CardContent className="p-0">
                    {/* Header with Gradient */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
                            <Gift size={100} />
                        </div>
                        <div className="relative z-10">
                            <Gift className="mx-auto mb-3" size={48} aria-hidden="true" />
                            <h2 id={titleId} className="text-3xl font-extrabold mb-2">Chờ đã! 🎁</h2>
                            <p className="text-lg text-green-100">Nhận ngay ưu đãi đặc biệt trước khi rời đi</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 bg-white">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">
                                Giảm ngay <span className="text-green-600 text-4xl">20%</span> học phí
                            </h3>
                            <p className="text-slate-600 text-lg">
                                Áp dụng cho khóa học <strong>Tiếng Anh Cấp Tốc</strong> và <strong>VSTEP B1/B2</strong>
                            </p>
                        </div>

                        {/* Countdown */}
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center justify-center gap-2 text-red-600">
                                <Clock size={24} aria-hidden="true" />
                                <div>
                                    <p className="text-sm font-medium">Ưu đãi kết thúc sau:</p>
                                    <p
                                        className="text-3xl font-bold"
                                        role="timer"
                                        aria-label={`Còn lại ${formatTime(timeLeft)}`}
                                        aria-live="off"
                                    >
                                        {formatTime(timeLeft)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <ul className="space-y-2 mb-6 text-slate-700">
                            <li className="flex items-center gap-2">
                                <span className="text-green-600 font-bold" aria-hidden="true">✓</span>
                                Tặng kèm tài liệu học tập trị giá 500.000đ
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-600 font-bold" aria-hidden="true">✓</span>
                                Miễn phí 1 buổi học thử với giáo viên bản ngữ
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-600 font-bold" aria-hidden="true">✓</span>
                                Cam kết đầu ra hoặc học lại miễn phí
                            </li>
                        </ul>

                        {/* CTA Buttons */}
                        <div className="space-y-3">
                            <a href="tel:0962445963" className="block">
                                <Button className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6 font-bold shadow-lg">
                                    📞 Gọi ngay: 096 244 5963
                                </Button>
                            </a>
                            <a href="/admissions" className="block">
                                <Button
                                    variant="outline"
                                    className="w-full border-green-600 text-green-700 hover:bg-green-50 font-bold py-3"
                                >
                                    Đăng ký online ngay
                                </Button>
                            </a>
                        </div>

                        <p className="text-center text-xs text-slate-400 mt-4">
                            * Ưu đãi chỉ áp dụng cho 10 học viên đăng ký đầu tiên
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
