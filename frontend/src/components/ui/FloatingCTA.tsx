import { useState, useEffect } from 'react';
import { Phone, X, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * FloatingCTA Component
 * Sticky floating call-to-action button
 * WCAG 2.2: pulse/ping animations disabled when prefers-reduced-motion is set
 */
export default function FloatingCTA({ showAfter = 500 }) {
    const [isVisible, setIsVisible] = useState(false);
    // WCAG 2.3.3: respect user motion preference
    const [reduceMotion] = useState(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, showAfter);

        return () => clearTimeout(timer);
    }, [showAfter]);

    const [isExpanded, setIsExpanded] = useState(false);

    if (!isVisible) return null;

    return (
        <>
            {/* Main Floating Button */}
            <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40 flex flex-col gap-3">
                {/* Expanded Options */}
                {isExpanded && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom">
                        <a
                            href="https://zalo.me/0339244566"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white text-blue-700 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all font-bold text-sm flex items-center gap-2 whitespace-nowrap"
                        >
                            <MessageCircle size={16} />
                            Tư vấn Zalo
                        </a>
                        <Link
                            to="/register"
                            className="bg-white text-green-700 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all font-bold text-sm flex items-center gap-2 whitespace-nowrap"
                        >
                            📝 Đăng ký học viên
                        </Link>
                        <a
                            href="tel:0962445963"
                            className="bg-white text-emerald-700 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all font-bold text-sm flex items-center gap-2 whitespace-nowrap"
                        >
                            <Phone size={16} />
                            096 244 5963
                        </a>
                    </div>
                )}

                {/* Toggle Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="relative bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-full shadow-lg hover:shadow-xl transition-all font-bold flex items-center gap-2 group"
                    aria-label="Liên hệ tư vấn"
                    aria-expanded={isExpanded}
                >
                    {isExpanded ? (
                        <>
                            <X size={20} aria-hidden="true" />
                            Đóng
                        </>
                    ) : (
                        <>
                            {/* Only animate phone icon when motion is allowed */}
                            <Phone
                                size={20}
                                aria-hidden="true"
                                className={reduceMotion ? '' : 'animate-pulse'}
                            />
                            Tư vấn ngay
                        </>
                    )}

                    {/* Pulse Ring — hidden when user prefers reduced motion */}
                    {!isExpanded && !reduceMotion && (
                        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" aria-hidden="true" />
                    )}
                </button>
            </div>
        </>
    );
}

FloatingCTA.propTypes = {
    showAfter: PropTypes.number,
};

