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
                            className="bg-[var(--color-paper-raised)] text-[var(--color-navy)] border border-[var(--color-rule)] px-4 py-3 rounded-md transition-colors font-semibold text-sm flex items-center gap-2 whitespace-nowrap hover:border-[var(--color-navy)]"
                        >
                            <MessageCircle size={16} />
                            Tư vấn Zalo
                        </a>
                        <Link
                            to="/register"
                            className="bg-[var(--color-paper-raised)] text-[var(--color-navy)] border border-[var(--color-rule)] px-4 py-3 rounded-md transition-colors font-semibold text-sm flex items-center gap-2 whitespace-nowrap hover:border-[var(--color-navy)]"
                        >
                            📝 Đăng ký học viên
                        </Link>
                        <a
                            href="tel:0962449563"
                            className="bg-[var(--color-paper-raised)] text-[var(--color-navy)] border border-[var(--color-rule)] px-4 py-3 rounded-md transition-colors font-semibold text-sm flex items-center gap-2 whitespace-nowrap hover:border-[var(--color-navy)]"
                        >
                            <Phone size={16} />
                            096 244 9563
                        </a>
                    </div>
                )}

                {/* Toggle Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="relative bg-[var(--color-navy)] text-[var(--color-paper)] px-6 py-4 rounded-md transition-colors font-semibold flex items-center gap-2 group hover:bg-[var(--color-ink)]"
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
                        <span className="absolute inset-0 rounded-md bg-[var(--color-gold)] animate-ping opacity-25" aria-hidden="true" />
                    )}
                </button>
            </div>
        </>
    );
}

FloatingCTA.propTypes = {
    showAfter: PropTypes.number,
};

