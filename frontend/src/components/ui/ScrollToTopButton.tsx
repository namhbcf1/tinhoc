import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export default function ScrollToTopButton() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 400) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);

        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <div className={cn(
            "fixed bottom-8 right-8 z-50 transition-all duration-300 transform",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        )}>
            <Button
                onClick={scrollToTop}
                size="icon"
                className="rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white w-12 h-12"
                aria-label="Scroll to top"
            >
                <ArrowUp size={24} />
            </Button>
        </div>
    );
}
