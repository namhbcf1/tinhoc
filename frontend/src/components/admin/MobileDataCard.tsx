import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Trash2, Eye } from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import './MobileDataCard.css';

export default function MobileDataCard({
    data,
    primaryField,
    secondaryFields = [],
    actions = [],
    onEdit,
    onDelete,
    onView,
    expandable = false,
    expandedContent,
    swipeActions = true
}) {
    const { platform } = useDeviceType();
    const [isExpanded, setIsExpanded] = useState(false);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const handleTouchStart = (e) => {
        if (!swipeActions) return;
        const touch = e.touches[0];
        setSwipeOffset(0);
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!swipeActions || !isSwiping) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - e.touches[0].clientX;
        setSwipeOffset(deltaX);
    };

    const handleTouchEnd = () => {
        if (!isSwiping) return;
        setIsSwiping(false);
        
        if (swipeOffset < -80 && onDelete) {
            // Swipe left to delete
            onDelete();
        } else if (swipeOffset > 80 && onEdit) {
            // Swipe right to edit
            onEdit();
        } else {
            setSwipeOffset(0);
        }
    };

    const getPrimaryValue = () => {
        if (typeof primaryField === 'function') {
            return primaryField(data);
        }
        return data[primaryField] || '';
    };

    return (
        <div
            className={`mobile-data-card ${platform} ${isExpanded ? 'expanded' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: `translateX(${swipeOffset}px)`,
                transition: isSwiping ? 'none' : 'transform 0.3s ease'
            }}
        >
            <div className="mobile-data-card-content">
                <div className="mobile-data-card-main">
                    <div className="mobile-data-card-primary">
                        {getPrimaryValue()}
                    </div>
                    {secondaryFields.length > 0 && (
                        <div className="mobile-data-card-secondary">
                            {secondaryFields.map((field, index) => {
                                const value = typeof field === 'function' 
                                    ? field(data) 
                                    : data[field.key] || field.default || '';
                                const label = field.label || '';
                                
                                return (
                                    <div key={index} className="mobile-data-card-field">
                                        {label && <span className="mobile-data-card-label">{label}: </span>}
                                        <span className="mobile-data-card-value">{value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mobile-data-card-actions">
                    {onView && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onView();
                            }}
                            className="mobile-data-card-action-btn"
                            aria-label="View"
                        >
                            <Eye size={18} />
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className="mobile-data-card-action-btn"
                            aria-label="Edit"
                        >
                            <Edit2 size={18} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="mobile-data-card-action-btn delete"
                            aria-label="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    {expandable && expandedContent && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mobile-data-card-action-btn"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {expandable && isExpanded && expandedContent && (
                <div className="mobile-data-card-expanded">
                    {typeof expandedContent === 'function' 
                        ? expandedContent(data) 
                        : expandedContent}
                </div>
            )}

            {/* Swipe action indicators */}
            {swipeActions && (
                <>
                    {onDelete && (
                        <div 
                            className="mobile-data-card-swipe-action delete"
                            style={{
                                opacity: swipeOffset < -20 ? Math.min(Math.abs(swipeOffset) / 80, 1) : 0
                            }}
                        >
                            <Trash2 size={24} />
                        </div>
                    )}
                    {onEdit && (
                        <div 
                            className="mobile-data-card-swipe-action edit"
                            style={{
                                opacity: swipeOffset > 20 ? Math.min(swipeOffset / 80, 1) : 0
                            }}
                        >
                            <Edit2 size={24} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}








