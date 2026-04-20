const OCR_DIGIT_FIXES = [
    [/O/g, '0', 'O->0'],
    [/o/g, '0', 'o->0'],
    [/Q/g, '0', 'Q->0'],
    [/D/g, '0', 'D->0'],
    [/I/g, '1', 'I->1'],
    [/l/g, '1', 'l->1'],
    [/\|/g, '1', '|->1'],
    [/S/g, '5', 'S->5'],
    [/B/g, '8', 'B->8'],
];
function applyDigitFixes(raw) {
    let normalized = raw;
    const corrections = [];
    for (const [pattern, value, label] of OCR_DIGIT_FIXES) {
        if (pattern.test(normalized)) {
            normalized = normalized.replace(pattern, value);
            corrections.push(label);
        }
    }
    return { normalized, corrections: Array.from(new Set(corrections)) };
}
function isValidDateParts(year, month, day) {
    const dt = new Date(year, month - 1, day);
    return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}
function normalizeYear(rawYear, anchorYear) {
    const digits = rawYear.trim();
    const anchor = Number.isInteger(anchorYear) ? Number(anchorYear) : new Date().getFullYear();
    const anchorText = String(anchor);
    if (!/^\d{1,4}$/.test(digits)) {
        return { year: null, corrected: false, warning: `Năm không hợp lệ: ${rawYear}` };
    }
    if (digits.length === 4) {
        const year = Number(digits);
        if (year < 1900 || year > 2100) {
            return { year: null, corrected: false, warning: `Năm ngoài khoảng cho phép: ${digits}` };
        }
        return { year, corrected: false };
    }
    if (digits.length === 2) {
        const year = Number(`20${digits}`);
        return {
            year,
            corrected: true,
            correction: `Tự chuẩn hóa năm ${digits} -> ${year}`,
        };
    }
    if (digits.length === 3) {
        // Ví dụ OCR: 206 -> 2026 (mất chữ số hàng chục)
        if (digits.startsWith(anchorText.slice(0, 2))) {
            const year = Number(`${anchorText.slice(0, 2)}${anchorText.charAt(2)}${digits.slice(-1)}`);
            return {
                year,
                corrected: true,
                correction: `Tự sửa năm ${digits} -> ${year}`,
            };
        }
        const year = Number(`${anchorText.slice(0, 3)}${digits.slice(-1)}`);
        return {
            year,
            corrected: true,
            correction: `Tự suy luận năm ${digits} -> ${year}`,
        };
    }
    // 1 digit
    const year = Number(`${anchorText.slice(0, 3)}${digits}`);
    return {
        year,
        corrected: true,
        correction: `Tự suy luận năm ${digits} -> ${year}`,
    };
}
function normalizeDateToken(rawDate, anchorYear) {
    const warnings = [];
    const corrections = [];
    const fixed = applyDigitFixes(rawDate.replace(/[.\-]/g, '/'));
    corrections.push(...fixed.corrections.map((item) => `Sửa ký tự ngày: ${item}`));
    const parts = fixed.normalized.split('/').map((part) => part.trim());
    if (parts.length !== 3) {
        warnings.push(`Không đọc được ngày hợp lệ từ: ${rawDate}`);
        return { value: null, warnings, corrections };
    }
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    if (!Number.isInteger(day) || !Number.isInteger(month)) {
        warnings.push(`Ngày/tháng không hợp lệ: ${rawDate}`);
        return { value: null, warnings, corrections };
    }
    const yearResult = normalizeYear(parts[2], anchorYear);
    if (!yearResult.year) {
        if (yearResult.warning)
            warnings.push(yearResult.warning);
        return { value: null, warnings, corrections };
    }
    if (yearResult.correction)
        corrections.push(yearResult.correction);
    if (day < 1 || day > 31 || month < 1 || month > 12 || !isValidDateParts(yearResult.year, month, day)) {
        warnings.push(`Ngày không tồn tại: ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${yearResult.year}`);
        return { value: null, warnings, corrections };
    }
    const value = `${yearResult.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { value, warnings, corrections };
}
function normalizeTimeToken(rawToken) {
    const warnings = [];
    const corrections = [];
    const fixed = applyDigitFixes(rawToken);
    corrections.push(...fixed.corrections.map((item) => `Sửa ký tự giờ: ${item}`));
    let normalized = fixed.normalized.replace(/\s+/g, '').replace(/[hH]/g, ':');
    if (/^\d{3,4}$/.test(normalized)) {
        const hours = normalized.length === 3 ? normalized.slice(0, 1) : normalized.slice(0, 2);
        const minutes = normalized.slice(-2);
        normalized = `${hours}:${minutes}`;
        corrections.push(`Tự chuẩn hóa giờ ${fixed.normalized} -> ${normalized}`);
    }
    if (!/^\d{1,2}:\d{1,2}$/.test(normalized)) {
        warnings.push(`Không đọc được giờ hợp lệ từ: ${rawToken}`);
        return { value: null, warnings, corrections };
    }
    const [hourRaw, minuteRaw] = normalized.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        warnings.push(`Giờ ngoài khoảng cho phép: ${normalized}`);
        return { value: null, warnings, corrections };
    }
    return {
        value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        warnings,
        corrections,
    };
}
function normalizeNote(raw) {
    if (!raw)
        return null;
    const value = String(raw).trim().replace(/\s+/g, ' ');
    if (!value)
        return null;
    const cleaned = value
        .replace(/^(bu[oô]i\s*\d+\s*[-:–]?\s*)/i, '')
        .replace(/^(th[ứu]\s*[2-7]|cn|ch[ủu]\s*nh[ậa]t)\s*/i, '')
        .trim();
    return cleaned || null;
}
export function parseLearningScheduleText(rawText, options) {
    const source = String(rawText || '').trim();
    if (!source)
        return [];
    const compact = source.replace(/\s+/g, ' ');
    const rowRegex = /(Bu[oô]i[^,;\n\r]{0,50})?\s*(Th[ứu]\s*[2-7]|CN|Ch[ủu]\s*Nh[ậa]t)?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.][A-Za-z0-9]{1,4})\s*(\d{1,2}\s*(?::|h|H)?\s*\d{1,2})\s*[-–]\s*(\d{1,2}\s*(?::|h|H)?\s*\d{1,2})/giu;
    const rows = [];
    const seenKeys = new Set();
    for (const match of compact.matchAll(rowRegex)) {
        const sourceText = (match[0] || '').trim();
        const noteToken = (match[1] || '').trim();
        const dateToken = (match[3] || '').trim();
        const startToken = (match[4] || '').trim();
        const endToken = (match[5] || '').trim();
        const dateResult = normalizeDateToken(dateToken, options?.anchorYear);
        const startResult = normalizeTimeToken(startToken);
        const endResult = normalizeTimeToken(endToken);
        const warnings = [...dateResult.warnings, ...startResult.warnings, ...endResult.warnings];
        const corrections = [...dateResult.corrections, ...startResult.corrections, ...endResult.corrections];
        const sessionDate = dateResult.value;
        const startTime = startResult.value;
        const endTime = endResult.value;
        const uniqKey = `${sessionDate || 'invalid'}|${startTime || 'invalid'}|${endTime || 'invalid'}`;
        if (seenKeys.has(uniqKey)) {
            continue;
        }
        seenKeys.add(uniqKey);
        rows.push({
            row_id: `ocr_${rows.length + 1}`,
            source_text: sourceText,
            session_date: sessionDate,
            start_time: startTime,
            end_time: endTime,
            note: normalizeNote(noteToken),
            status: sessionDate && startTime && endTime && warnings.length === 0 ? 'ready' : 'needs_review',
            warnings,
            corrections,
            auto_corrected: corrections.length > 0,
        });
    }
    return rows;
}
export function buildSessionDuplicateKey(sessionDate, startTime, endTime) {
    return `${String(sessionDate || '').trim()}|${String(startTime || '').trim()}|${String(endTime || '').trim()}`;
}
export function isIsoDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
    if (!match)
        return false;
    return isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
}
export function isHourMinute(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || '').trim());
    if (!match)
        return false;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
