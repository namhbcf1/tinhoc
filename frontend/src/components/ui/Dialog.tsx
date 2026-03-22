import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

/**
 * Focusable element selectors for focus trap
 */
const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Dialog — WCAG 2.2 compliant modal
 * - role="dialog" + aria-modal="true" for screen readers
 * - aria-labelledby linked to DialogTitle via context
 * - Focus trap: cycles Tab/Shift+Tab within dialog
 * - Escape key closes dialog
 */

// Context to pass generated titleId from Dialog → DialogContent → DialogTitle
const DialogContext = React.createContext(null);

const Dialog = ({ open, onOpenChange, children }) => {
    const titleId = useId();

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [open]);

    // Close on Escape key
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onOpenChange(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onOpenChange]);

    if (!open) return null;

    return (
        <DialogContext.Provider value={{ titleId, onOpenChange }}>
            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                {/* Backdrop — click outside to close */}
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
                    onClick={() => onOpenChange(false)}
                    aria-hidden="true"
                />
                {/* Dialog Content Wrapper */}
                <div className="z-50 w-full flex justify-center p-4 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                    {children}
                </div>
            </div>
        </DialogContext.Provider>
    );
};

/**
 * DialogContent — the actual dialog panel
 * Implements focus trap and required ARIA attributes
 */
const DialogContent = ({ children, className, ...props }) => {
    const context = React.useContext(DialogContext);
    const contentRef = useRef(null);
    // Track element that was focused before dialog opened
    const previousFocusRef = useRef(null);

    useEffect(() => {
        // Save previously focused element
        previousFocusRef.current = document.activeElement;

        // Move initial focus to the dialog container (or first focusable child)
        const el = contentRef.current;
        if (!el) return;
        const firstFocusable = el.querySelector(FOCUSABLE_SELECTORS);
        if (firstFocusable) {
            firstFocusable.focus();
        } else {
            el.focus();
        }

        return () => {
            // Restore focus on unmount
            if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                previousFocusRef.current.focus();
            }
        };
    }, []);

    // Focus trap handler — cycles through focusable elements within dialog
    const handleKeyDown = (e) => {
        if (e.key !== 'Tab') return;
        const el = contentRef.current;
        if (!el) return;

        const focusableElements = Array.from(el.querySelectorAll(FOCUSABLE_SELECTORS));
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift+Tab: wrap from first → last
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            // Tab: wrap from last → first
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    return (
        <div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={context?.titleId}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={cn(
                "relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-100 outline-none",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

const DialogHeader = ({ children, className }) => {
    return (
        <div className={cn("flex flex-col space-y-1.5 p-6 pb-4 border-b border-slate-100 bg-slate-50/50", className)}>
            {children}
        </div>
    );
};

/**
 * DialogTitle — renders with the id linked to aria-labelledby on DialogContent
 */
const DialogTitle = ({ children, className }) => {
    const context = React.useContext(DialogContext);
    return (
        <h2
            id={context?.titleId}
            className={cn("text-lg font-semibold leading-none tracking-tight text-slate-900", className)}
        >
            {children}
        </h2>
    );
};

const DialogDescription = ({ children, className }) => {
    return (
        <p className={cn("text-sm text-slate-500", className)}>
            {children}
        </p>
    );
};

const DialogFooter = ({ children, className }) => {
    return (
        <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4 border-t border-slate-100 bg-slate-50/50", className)}>
            {children}
        </div>
    );
};

const DialogClose = ({ onClick, className }) => {
    const context = React.useContext(DialogContext);
    const handleClick = onClick || (() => context?.onOpenChange(false));
    return (
        <button
            onClick={handleClick}
            aria-label="Đóng hộp thoại"
            className={cn(
                "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
                className
            )}
        >
            <X size={18} aria-hidden="true" />
            <span className="sr-only">Close</span>
        </button>
    );
};

export {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
};
