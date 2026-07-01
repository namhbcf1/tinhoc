// @ts-nocheck
import { useState, useEffect } from 'react';
import { formatDateTimeInput, parseDateTimeInput, formatDateTimeVN } from '../../utils/dateUtils';

/**
 * Custom DateTime Input Component - Hiển thị và xử lý format DD/MM/YYYY HH:mm
 */
export default function DateTimeInput({ value, onChange, placeholder = 'dd/mm/yyyy HH:mm', required, ...props }) {
  const [displayValue, setDisplayValue] = useState('');
  const [internalValue, setInternalValue] = useState(''); // yyyy-mm-ddTHH:mm for native input

  useEffect(() => {
    if (value) {
      // Convert value to display format (dd/mm/yyyy HH:mm)
      const formatted = formatDateTimeVN(value);
      setDisplayValue(formatted);
      // Also set internal value for native input
      const inputValue = formatDateTimeInput(value);
      setInternalValue(inputValue);
    } else {
      setDisplayValue('');
      setInternalValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value; // yyyy-mm-ddTHH:mm from native input
    setInternalValue(inputValue);
    
    if (inputValue) {
      const parsed = parseDateTimeInput(inputValue);
      if (parsed) {
        // Format for display
        const formatted = formatDateTimeVN(parsed);
        setDisplayValue(formatted);
        // Call onChange with Date object
        if (onChange) {
          onChange({
            target: {
              value: parsed.toISOString(),
              valueAsDate: parsed,
            },
          });
        }
      }
    } else {
      setDisplayValue('');
      if (onChange) {
        onChange({ target: { value: '', valueAsDate: null } });
      }
    }
  };

  return (
    <div className="datetime-input-wrapper" style={{ position: 'relative' }}>
      <input
        type="datetime-local"
        value={internalValue}
        onChange={handleChange}
        required={required}
        style={{
          paddingRight: '140px',
        }}
        {...props}
      />
      <span
        className="datetime-placeholder"
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#999',
          fontSize: '14px',
          display: internalValue ? 'none' : 'block',
        }}
      >
        {placeholder}
      </span>
    </div>
  );
}
