// @ts-nocheck
import { useState, useEffect, useRef } from 'react';

function parseDateParts(value) {
  if (!value) return null;

  if (typeof value === 'string') {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/');
      return { year, month, day };
    }

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return { year, month, day };
    }
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return {
        year: String(date.getFullYear()),
        month: String(date.getMonth() + 1).padStart(2, '0'),
        day: String(date.getDate()).padStart(2, '0'),
      };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * DateInput Component - Hiển thị dd/mm/yyyy chuẩn Việt Nam
 * Sử dụng hidden native date picker để chọn ngày
 */
export default function DateInput({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  required,
  disabled,
  className = '',
  ...props
}) {
  const [displayValue, setDisplayValue] = useState('');
  const hiddenInputRef = useRef(null);

  // Convert value to display format (dd/mm/yyyy)
  useEffect(() => {
    const parts = parseDateParts(value);
    if (!parts) {
      setDisplayValue('');
      return;
    }

    setDisplayValue(`${parts.day}/${parts.month}/${parts.year}`);
  }, [value]);

  // Handle click on the input - open native date picker
  const handleClick = () => {
    if (!disabled && hiddenInputRef.current) {
      hiddenInputRef.current.showPicker?.();
      hiddenInputRef.current.focus();
    }
  };

  // Handle native date picker change
  const handleNativeChange = (e) => {
    const nativeValue = e.target.value; // yyyy-mm-dd
    if (!nativeValue) {
      setDisplayValue('');
      onChange?.('');
      return;
    }

    const [year, month, day] = nativeValue.split('-');
    const formatted = `${day}/${month}/${year}`;
    setDisplayValue(formatted);

    // Return yyyy-mm-dd format for easy processing
    onChange?.(nativeValue);
  };

  // Handle manual input
  const handleInputChange = (e) => {
    let input = e.target.value;

    // Only allow digits and slashes
    input = input.replace(/[^\d\/]/g, '');

    // Auto-add slashes
    if (input.length === 2 && !input.includes('/')) {
      input += '/';
    } else if (input.length === 5 && input.split('/').length === 2) {
      input += '/';
    }

    // Limit length
    if (input.length > 10) {
      input = input.slice(0, 10);
    }

    setDisplayValue(input);

    // If complete date, convert to yyyy-mm-dd and call onChange
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
      const [day, month, year] = input.split('/');
      const d = parseInt(day), m = parseInt(month), y = parseInt(year);

      // Basic validation
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        onChange?.(`${year}-${month}-${day}`);
      }
    }
  };

  // Convert displayValue to native format for hidden input
  const getNativeValue = () => {
    const parts = parseDateParts(value);
    if (!parts) {
      return '';
    }
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

  return (
    <div className="relative">
      {/* Visible input showing dd/mm/yyyy */}
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onClick={handleClick}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={10}
        className={`flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10 ${className}`}
        {...props}
      />

      {/* Calendar icon — tabIndex fixed to 0 for keyboard access (fix #11) */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        tabIndex={0}
        aria-label="Mở lịch chọn ngày"
      >
        {/* aria-hidden on decorative SVG calendar icon (fix #12) */}
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
          <line x1="16" x2="16" y1="2" y2="6"/>
          <line x1="8" x2="8" y1="2" y2="6"/>
          <line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
      </button>

      {/* Hidden native date input for picker */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={getNativeValue()}
        onChange={handleNativeChange}
        disabled={disabled}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}
