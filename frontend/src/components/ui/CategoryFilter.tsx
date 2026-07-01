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
                    <Badge className="ml-1 bg-green-600 text-white">{selected.length}</Badge>
                )}
            </Button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Lọc theo danh mục</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
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
                                                ? 'bg-green-50 border-2 border-green-500'
                                                : 'bg-slate-50 border-2 border-transparent hover:border-slate-200'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggle(category)}
                                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <span className={`flex-1 font-medium ${isSelected ? 'text-green-700' : 'text-slate-700'}`}>
                                            {category}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    {selected.length > 0 && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <Button
                                onClick={handleClearAll}
                                variant="outline"
                                size="sm"
                                className="w-full text-slate-600 hover:text-slate-900"
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
                            className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
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
