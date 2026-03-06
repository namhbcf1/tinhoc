// ========================================
// DATE UTILITIES - Format ngày tháng theo GMT+7 (Hà Nội)
// ========================================

/**
 * Chuyển đổi date string hoặc Date object sang Date object với múi giờ GMT+7
 * Đảm bảo logic Việt Nam 100%
 */
export function toVietnamDate(date) {
  if (!date) return null;

  let d;
  if (typeof date === 'string') {
    // Nếu là định dạng dd/mm/yyyy
    if (date.includes('/')) {
      const parts = date.split('/');
      if (parts.length === 3) {
        // dd/mm/yyyy
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        d = new Date(year, month - 1, day);
      } else {
        d = new Date(date);
      }
    }
    // Nếu là định dạng SQL: YYYY-MM-DD HH:mm:ss
    else if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(date)) {
      // Treat as UTC
      d = new Date(date.replace(' ', 'T') + 'Z');
    }
    // Các định dạng khác (ISO, v.v.)
    else {
      d = new Date(date);
    }
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    d = date;
  }

  if (!(d instanceof Date) || isNaN(d.getTime())) return null;

  // Lấy UTC time và chuyển sang GMT+7
  const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
  const vietnamTime = new Date(utcTime + (7 * 3600000)); // GMT+7 = +7 hours

  return vietnamTime;
}

/**
 * Format ngày tháng theo định dạng Việt Nam: dd/mm/yyyy
 */
export function formatDateVN(date, includeTime = false) {
  if (!date) return '';

  const d = toVietnamDate(date);
  if (!d || isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (includeTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  return `${day}/${month}/${year}`;
}

/**
 * Format ngày tháng và giờ đầy đủ: dd/mm/yyyy HH:mm
 */
export function formatDateTimeVN(date) {
  return formatDateVN(date, true);
}

/**
 * Format ngày tháng cho input (dd/mm/yyyy)
 * Lưu ý: Input type="date" thường bắt yyyy-mm-dd, 
 * nhưng user yêu cầu hiển thị dd/mm/yyyy ở mọi nơi.
 */
export function formatDateInput(date) {
  return formatDateVN(date);
}

/**
 * Format thời gian cho input datetime-local (yyyy-mm-ddTHH:mm) - Giữ nguyên cho browser compatibility
 */
export function formatDateTimeInput(date) {
  if (!date) return '';

  const d = toVietnamDate(date);
  if (!d || isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse date string từ input (yyyy-mm-dd) sang Date object với GMT+7
 */
export function parseDateInput(dateString) {
  if (!dateString) return null;

  if (dateString.includes('/')) {
    return parseVNDate(dateString);
  }

  // Parse yyyy-mm-dd
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;

  // Tạo date với GMT+7
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const vietnamDate = new Date(date.getTime() - (7 * 3600000));

  return vietnamDate;
}

/**
 * Parse date string từ định dạng Việt Nam (dd/mm/yyyy) sang Date object với GMT+7
 */
export function parseVNDate(dateString) {
  if (!dateString) return null;

  // Parse dd/mm/yyyy
  const parts = dateString.trim().split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return null;

  // Tạo date với GMT+7
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const vietnamDate = new Date(date.getTime() - (7 * 3600000));

  return vietnamDate;
}

/**
 * Parse datetime string từ input (yyyy-mm-ddTHH:mm) sang Date object với GMT+7
 */
export function parseDateTimeInput(dateTimeString) {
  if (!dateTimeString) return null;

  // Parse yyyy-mm-ddTHH:mm
  const [datePart, timePart] = dateTimeString.split('T');
  if (!datePart) return null;

  let year, month, day;
  if (datePart.includes('/')) {
    [day, month, year] = datePart.split('/').map(Number);
  } else {
    [year, month, day] = datePart.split('-').map(Number);
  }

  let hours = 0, minutes = 0;
  if (timePart) {
    [hours, minutes] = timePart.split(':').map(Number);
  }

  if (!year || !month || !day) return null;

  // Tạo date với GMT+7
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const vietnamDate = new Date(date.getTime() - (7 * 3600000));

  return vietnamDate;
}

/**
 * Format ngày tháng ngắn gọn: dd/mm
 */
export function formatDateShort(date) {
  if (!date) return '';

  const d = toVietnamDate(date);
  if (!d || isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');

  return `${day}/${month}`;
}

/**
 * Format thời gian: HH:mm
 */
export function formatTime(date) {
  if (!date) return '';

  const d = toVietnamDate(date);
  if (!d || isNaN(d.getTime())) return '';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Lấy ngày hiện tại theo GMT+7
 * @param {boolean} asString - Nếu true, trả về string yyyy-MM-dd cho HTML date input
 */
export function getCurrentDateVN(asString = false) {
  const d = new Date();
  const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
  const vietnamDate = new Date(utcTime + (7 * 3600000));

  if (asString) {
    const year = vietnamDate.getFullYear();
    const month = String(vietnamDate.getMonth() + 1).padStart(2, '0');
    const day = String(vietnamDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return vietnamDate;
}






