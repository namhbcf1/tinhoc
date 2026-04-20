import { useEffect, useMemo, useState } from 'react';
import {
  isVietnamProvince2025,
  normalizeBirthPlaceValue,
  VIETNAM_PROVINCE_OPTIONS_2025,
} from '../../utils/birthPlaceOptions';

type BirthPlaceFieldProps = {
  label?: string;
  value: string;
  onChange: (nextValue: string) => void;
  fieldId?: string;
  hintId?: string;
  errorId?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  inputPlaceholder?: string;
  selectPlaceholder?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  toggleWrapperClassName?: string;
  radioGroupClassName?: string;
  radioOptionClassName?: string;
  domesticTextClassName?: string;
  foreignTextClassName?: string;
  inputClassName?: string;
  selectClassName?: string;
  hintClassName?: string;
  errorClassName?: string;
};

export default function BirthPlaceField({
  label = 'Nơi sinh',
  value,
  onChange,
  fieldId,
  hintId,
  errorId,
  required = false,
  error = '',
  hint = '',
  disabled = false,
  inputPlaceholder = 'Nhập nơi sinh ở nước ngoài',
  selectPlaceholder = 'Vui lòng chọn tỉnh/thành phố',
  wrapperClassName = '',
  labelClassName = 'block text-sm font-medium text-slate-700',
  toggleWrapperClassName = 'mt-2',
  radioGroupClassName = 'flex flex-wrap gap-4',
  radioOptionClassName = 'inline-flex items-center gap-2 text-sm text-slate-700',
  domesticTextClassName = '',
  foreignTextClassName = '',
  inputClassName = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100',
  selectClassName = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100',
  hintClassName = 'mt-1 text-xs text-slate-500',
  errorClassName = 'mt-1 text-xs text-red-500',
}: BirthPlaceFieldProps) {
  const accessibleLabel = label || 'Nơi sinh';
  const normalizedValue = useMemo(() => normalizeBirthPlaceValue(value), [value]);
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
  const [placeType, setPlaceType] = useState<'trong_nuoc' | 'nuoc_ngoai'>(
    normalizedValue && !isVietnamProvince2025(normalizedValue) ? 'nuoc_ngoai' : 'trong_nuoc'
  );

  useEffect(() => {
    if (normalizedValue !== value) {
      onChange(normalizedValue);
      return;
    }

    if (!normalizedValue) {
      return;
    }

    setPlaceType(!isVietnamProvince2025(normalizedValue) ? 'nuoc_ngoai' : 'trong_nuoc');
  }, [normalizedValue, onChange, value]);

  const domesticValue = isVietnamProvince2025(normalizedValue) ? normalizedValue : '';

  const handleTypeChange = (nextType: 'trong_nuoc' | 'nuoc_ngoai') => {
    setPlaceType(nextType);
    if (nextType === 'trong_nuoc') {
      onChange(domesticValue);
      return;
    }
    if (isVietnamProvince2025(normalizedValue)) {
      onChange('');
    }
  };

  return (
    <div className={wrapperClassName} data-testid="birth-place-field">
      {label ? (
        <label className={labelClassName} htmlFor={fieldId}>
          {label}
          {required ? <span className="ml-0.5 text-red-400">*</span> : null}
        </label>
      ) : null}

      <div className={toggleWrapperClassName}>
        <div className={radioGroupClassName}>
          <label className={radioOptionClassName}>
            <input
              type="radio"
              value="trong_nuoc"
              data-testid="birth-place-type-domestic"
              checked={placeType === 'trong_nuoc'}
              disabled={disabled}
              onChange={() => handleTypeChange('trong_nuoc')}
            />
            <span className={domesticTextClassName}>Trong nước</span>
          </label>
          <label className={radioOptionClassName}>
            <input
              type="radio"
              value="nuoc_ngoai"
              data-testid="birth-place-type-foreign"
              checked={placeType === 'nuoc_ngoai'}
              disabled={disabled}
              onChange={() => handleTypeChange('nuoc_ngoai')}
            />
            <span className={foreignTextClassName}>Nước ngoài</span>
          </label>
        </div>
      </div>

      <div className="mt-2">
        {placeType === 'trong_nuoc' ? (
          <select
            id={fieldId}
            value={domesticValue}
            aria-label={accessibleLabel}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : 'false'}
            data-testid="birth-place-select"
            disabled={disabled}
            onChange={(event) => onChange(normalizeBirthPlaceValue(event.target.value))}
            className={selectClassName}
          >
            <option value="">{selectPlaceholder}</option>
            {VIETNAM_PROVINCE_OPTIONS_2025.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={fieldId}
            type="text"
            value={placeType === 'nuoc_ngoai' ? normalizedValue : ''}
            aria-label={accessibleLabel}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : 'false'}
            data-testid="birth-place-input"
            disabled={disabled}
            placeholder={inputPlaceholder}
            onChange={(event) => onChange(normalizeBirthPlaceValue(event.target.value))}
            className={inputClassName}
          />
        )}
      </div>

      {hint ? <p id={hintId} className={hintClassName}>{hint}</p> : null}
      {error ? <p id={errorId} className={errorClassName}>{error}</p> : null}
    </div>
  );
}
