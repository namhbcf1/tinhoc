// @ts-nocheck
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Filter, X } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';

/**
 * CategoryFilter Component
 * Multi-select filter for categories/tags with beautiful UI
 */
export default function CategoryFilter({ categories, selected, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = (category) => {
        const newSelected = selected.includes(category)
            ? selected.filter((c) => c !== category)
            : [...selected, category];
        onChange(newSelected);
    };

    const handleClearAll = () => {
        onChange([]);
    };

    return (
        <div className={`relative ${className}`}>
            {/* Filter Button */}
            <Button
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2"
            >
                <Filter size={16} />
                Danh mục
                {selected.length > 0 && (
                    <Badge className="ml-1 bg-[var(--color-navy)] text-[var(--color-paper)]">{selected.length}</Badge>
                )}
            </Button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[var(--color-paper-raised)] rounded-md border border-[var(--color-rule)] shadow-[0_18px_36px_-26px_rgba(15,35,50,0.35)] z-50 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--color-rule)] flex items-center justify-between">
                        <h3 className="font-display text-[1.05rem] font-semibold text-[var(--color-ink)]">Lọc theo danh mục</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-[var(--vt-ink-40)] hover:text-[var(--color-ink)] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Categories List */}
                    <div className="p-4 max-h-80 overflow-y-auto">
                        <div className="space-y-2">
                            {categories.map((category) => {
                                const isSelected = selected.includes(category);
                                return (
                                    <label
                                        key={category}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected
                                                ? 'bg-[var(--color-secondary)] border-2 border-[var(--color-navy)]'
                                                : 'border-2 border-transparent hover:border-[var(--color-rule)]'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggle(category)}
                                            className="h-4 w-4 rounded-sm accent-[var(--color-navy)]"
                                        />
                                        <span className={`flex-1 font-medium ${isSelected ? 'text-[var(--color-navy)] font-semibold' : 'text-[var(--color-ink)]'}`}>
                                            {category}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    {selected.length > 0 && (
                        <div className="p-4 border-t border-[var(--color-rule)] bg-[var(--color-secondary)]">
                            <Button
                                onClick={handleClearAll}
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                Xóa tất cả bộ lọc
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Selected Tags Display */}
            {selected.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {selected.map((category) => (
                        <Badge
                            key={category}
                            className="border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-navy)] hover:border-[var(--color-navy)] cursor-pointer"
                            onClick={() => handleToggle(category)}
                        >
                            {category}
                            <X size={12} className="ml-1" />
                        </Badge>
                    ))}
                </div>
            )}

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

CategoryFilter.propTypes = {
    categories: PropTypes.arrayOf(PropTypes.string).isRequired,
    selected: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
    className: PropTypes.string,
};
