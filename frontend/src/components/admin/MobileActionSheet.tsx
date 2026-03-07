import React from 'react';
import { X } from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import './MobileActionSheet.css';

export default function MobileActionSheet({
    isOpen,
    onClose,
    title,
    actions = [],
    destructiveIndex = -1
}) {
    const { platform } = useDeviceType();

    if (!isOpen) return null;

    return (
        <div className="mobile-action-sheet-overlay" onClick={onClose}>
            <div
                className={`mobile-action-sheet ${platform}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                    paddingBottom: platform === 'ios' ? 'env(safe-area-inset-bottom)' : '0'
                }}
            >
                {title && (
                    <div className="mobile-action-sheet-title">{title}</div>
                )}
                
                <div className="mobile-action-sheet-actions">
                    {actions.map((action, index) => {
                        const isDestructive = index === destructiveIndex;
                        return (
                            <button
                                key={index}
                                onClick={() => {
                                    if (action.onClick) {
                                        action.onClick();
                                    }
                                    onClose();
                                }}
                                className={`mobile-action-sheet-item ${isDestructive ? 'destructive' : ''}`}
                                disabled={action.disabled}
                            >
                                {action.icon && (
                                    <span className="mobile-action-sheet-icon">{action.icon}</span>
                                )}
                                <span className="mobile-action-sheet-label">{action.label}</span>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={onClose}
                    className="mobile-action-sheet-cancel"
                >
                    Hủy
                </button>
            </div>
        </div>
    );
}








