
import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext({});

const Tabs = ({ defaultValue, value, onValueChange, children, className = '' }) => {
    const [localValue, setLocalValue] = useState(defaultValue);
    const activeValue = value !== undefined ? value : localValue;

    const handleValueChange = (newValue) => {
        if (onValueChange) {
            onValueChange(newValue);
        }
        if (value === undefined) {
            setLocalValue(newValue);
        }
    };

    return (
        <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
            <div className={`w-full ${className}`} data-value={activeValue}>
                {children}
            </div>
        </TabsContext.Provider>
    );
};

const TabsList = ({ children, className = '' }) => {
    return (
        <div className={`flex items-center p-1 rounded-xl bg-slate-100 ${className}`}>
            {children}
        </div>
    );
};

const TabsTrigger = ({ value, children, className = '', disabled }) => {
    const { value: activeValue, onValueChange } = useContext(TabsContext);
    const isActive = activeValue === value;

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            data-state={isActive ? 'active' : 'inactive'}
            onClick={() => !disabled && onValueChange(value)}
            className={`
                inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-Purple-500 disabled:pointer-events-none disabled:opacity-50
                ${isActive
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }
                ${className}
            `}
        >
            {children}
        </button>
    );
};

const TabsContent = ({ value, children, className = '' }) => {
    const { value: activeValue } = useContext(TabsContext);

    if (activeValue !== value) return null;

    return (
        <div
            role="tabpanel"
            data-state="active"
            className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 ${className}`}
        >
            {children}
        </div>
    );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
