import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { useDeviceType } from '../../utils/deviceDetection';
import './MobileSearchBar.css';

export default function MobileSearchBar({
    value,
    onChange,
    onSearch,
    placeholder = 'Tìm kiếm...',
    showFilters = false,
    onFilterClick,
    filters = []
}) {
    const { platform } = useDeviceType();
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSearch) {
            onSearch(value);
        }
    };

    return (
        <div className={`mobile-search-bar ${platform} ${isFocused ? 'focused' : ''}`}>
            <form onSubmit={handleSubmit} className="mobile-search-form">
                <div className="mobile-search-input-wrapper">
                    <Search size={20} className="mobile-search-icon" />
                    <input
                        type="search"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        className="mobile-search-input"
                        style={{ fontSize: '16px' }} // Prevent zoom on iOS
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={() => {
                                onChange('');
                                setIsFocused(false);
                            }}
                            className="mobile-search-clear"
                            aria-label="Clear"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
                {showFilters && onFilterClick && (
                    <button
                        type="button"
                        onClick={onFilterClick}
                        className="mobile-search-filter-btn"
                        aria-label="Filters"
                    >
                        <Filter size={20} />
                        {filters.length > 0 && (
                            <span className="mobile-search-filter-badge">{filters.length}</span>
                        )}
                    </button>
                )}
            </form>
        </div>
    );
}








