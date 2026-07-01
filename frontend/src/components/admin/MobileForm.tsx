// @ts-nocheck
import React from 'react';
import { useDeviceType } from '../../utils/deviceDetection';
import './MobileForm.css';

export default function MobileForm({ children, onSubmit, className = '' }) {
    const { platform } = useDeviceType();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) {
            onSubmit(e);
        }
    };

    return (
        <form
            className={`mobile-form ${platform} ${className}`}
            onSubmit={handleSubmit}
        >
            {children}
        </form>
    );
}

export function MobileFormField({
    label,
    children,
    error,
    required = false,
    hint
}) {
    return (
        <div className="mobile-form-field">
            {label && (
                <label className="mobile-form-label">
                    {label}
                    {required && <span className="mobile-form-required">*</span>}
                </label>
            )}
            <div className="mobile-form-input-wrapper">
                {children}
            </div>
            {hint && !error && (
                <div className="mobile-form-hint">{hint}</div>
            )}
            {error && (
                <div className="mobile-form-error">{error}</div>
            )}
        </div>
    );
}

export function MobileFormInput({
    type = 'text',
    value,
    onChange,
    placeholder,
    disabled = false,
    required = false,
    ...props
}) {
    const { platform } = useDeviceType();

    // Determine appropriate input type for mobile
    const getInputType = () => {
        if (type === 'email') return 'email';
        if (type === 'tel' || type === 'phone') return 'tel';
        if (type === 'number') return 'number';
        if (type === 'date') return 'date';
        if (type === 'time') return 'time';
        return 'text';
    };

    return (
        <input
            type={getInputType()}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`mobile-form-input ${platform}`}
            style={{
                fontSize: '16px' // Prevent zoom on iOS
            }}
            {...props}
        />
    );
}

export function MobileFormTextarea({
    value,
    onChange,
    placeholder,
    disabled = false,
    required = false,
    rows = 4,
    ...props
}) {
    return (
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={rows}
            className="mobile-form-textarea"
            style={{
                fontSize: '16px' // Prevent zoom on iOS
            }}
            {...props}
        />
    );
}

export function MobileFormSelect({
    value,
    onChange,
    options = [],
    placeholder,
    disabled = false,
    required = false,
    ...props
}) {
    return (
        <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className="mobile-form-select"
            style={{
                fontSize: '16px' // Prevent zoom on iOS
            }}
            {...props}
        >
            {placeholder && (
                <option value="">{placeholder}</option>
            )}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

export function MobileFormActions({ children, className = '' }) {
    return (
        <div className={`mobile-form-actions ${className}`}>
            {children}
        </div>
    );
}
