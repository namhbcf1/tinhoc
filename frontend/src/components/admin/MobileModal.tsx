import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import './MobileModal.css';

export default function MobileModal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    fullScreen = true,
    bottomSheet = false
}) {
    const { platform } = useDeviceType();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const modalClass = `mobile-modal ${platform} ${fullScreen ? 'fullscreen' : ''} ${bottomSheet ? 'bottom-sheet' : ''}`;

    return (
        <div className="mobile-modal-overlay" onClick={onClose}>
            <div
                className={modalClass}
                onClick={(e) => e.stopPropagation()}
                style={{
                    paddingTop: platform === 'ios' ? 'env(safe-area-inset-top)' : '0',
                    paddingBottom: platform === 'ios' ? 'env(safe-area-inset-bottom)' : '0'
                }}
            >
                {title && (
                    <div className="mobile-modal-header">
                        <h2 className="mobile-modal-title">{title}</h2>
                        <button
                            onClick={onClose}
                            className="mobile-modal-close"
                            aria-label="Close"
                        >
                            <X size={24} />
                        </button>
                    </div>
                )}
                
                <div className="mobile-modal-content">
                    {children}
                </div>

                {footer && (
                    <div className="mobile-modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}








