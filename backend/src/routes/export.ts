import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import XLSX from 'xlsx-js-style';
import { errorResponse, formatDate } from '../utils/helpers.js';
import { getRegistrationsByClass, getClassById } from '../db/queries.js';
import { getExamRegistrations } from '../db/attendance-queries.js';
import { normalizeBirthPlaceValue } from '../utils/birth-place.js';

const exportRoute = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

// Format date as DD/MM/YYYY for Vietnamese locale Excel export
function normalizeWhitespace(value: any) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function parseDateParts(value: any): { day: number; month: number; year: number } | null {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      year: value.getFullYear(),
    };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      return {
        day: Number(slashMatch[1]),
        month: Number(slashMatch[2]),
        year: Number(slashMatch[3]),
      };
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (isoMatch) {
      return {
        day: Number(isoMatch[3]),
        month: Number(isoMatch[2]),
        year: Number(isoMatch[1]),
      };
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function formatDateVN(date: any) {
  const parts = parseDateParts(date);
  if (!parts) return '';
  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
}

function normalizeGenderLabel(value: any) {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) return '';
  if (['nam', 'male', 'm'].includes(normalized)) return 'Nam';
  if (['nữ', 'nu', 'female', 'f'].includes(normalized)) return 'Nữ';
  return normalizeWhitespace(value);
}

function cleanStudentPlace(value: any) {
  const cleaned = normalizeWhitespace(value)
    .replace(/^(place\s+of\s+origin|place\s+of\s+ongin|quê\s*quán|quê\s*quản|que\s*quan|nơi\s*thường\s*trú)\s*[:/,-]?\s*/i, '')
    .replace(/^[/:;,\-.\s]+/, '')
    .trim();

  return normalizeBirthPlaceValue(cleaned);
}

function cleanStudentWorkplace(value: any) {
  return normalizeWhitespace(value);
}

function cleanStudentAddress(value: any) {
  return normalizeWhitespace(value);
}

function getStudentExportValue(student: any, field: string) {
  if (field === 'gioi_tinh') return normalizeGenderLabel(student.gioi_tinh);
  if (field === 'noi_sinh') return cleanStudentPlace(student.noi_sinh);
  if (field === 'don_vi_cong_tac') return cleanStudentWorkplace(student.don_vi_cong_tac);
  if (field === 'dia_chi') return cleanStudentAddress(student.dia_chi);
  return student?.[field] ?? '';
}

function isTestStudentRecord(student: any) {
  const fullName = normalizeWhitespace(student?.ho_ten_full).toLowerCase();
  const email = normalizeWhitespace(student?.email).toLowerCase();
  const cccd = normalizeWhitespace(student?.cccd).toLowerCase();
  const isLegacyTestCode = (value: string) => /^\d{3,4}$/.test(value) && Number(value) >= 1 && Number(value) <= 19;

  return (
    fullName.startsWith('test hoc vien') ||
    email.endsWith('@student.local') ||
    cccd.startsWith('test') ||
    isLegacyTestCode(cccd) ||
    isLegacyTestCode(fullName)
  );
}

function excludeTestStudents<T>(students: T[]) {
  return students.filter((student: any) => !isTestStudentRecord(student));
}

function buildExamExportFilename(examName: any) {
  const normalized = normalizeWhitespace(examName).replace(/["\r\n]/g, '');
  const baseName = normalized || 'Danh sach ky thi';
  return `${baseName}.xlsx`;
}

function buildAttachmentDisposition(filename: string) {
  const fallback = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim() || 'export.xlsx';

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

// Border style chuẩn - đường viền đen mỏng 4 góc
const borderStyle = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } }
};

function ensureWorksheetCell(worksheet: XLSX.WorkSheet, address: string, value: any, type: 's' | 'n' = 's') {
  const cell = XLSX.utils.decode_cell(address);
  const currentRange = worksheet['!ref']
    ? XLSX.utils.decode_range(worksheet['!ref'])
    : { s: { c: cell.c, r: cell.r }, e: { c: cell.c, r: cell.r } };

  currentRange.s.c = Math.min(currentRange.s.c, cell.c);
  currentRange.s.r = Math.min(currentRange.s.r, cell.r);
  currentRange.e.c = Math.max(currentRange.e.c, cell.c);
  currentRange.e.r = Math.max(currentRange.e.r, cell.r);
  worksheet['!ref'] = XLSX.utils.encode_range(currentRange);

  if (!worksheet[address]) {
    worksheet[address] = { v: value, t: type };
    return worksheet[address];
  }

  worksheet[address].v = value;
  worksheet[address].t = type;
  return worksheet[address];
}

function applyCellStyle(
  worksheet: XLSX.WorkSheet,
  address: string,
  style: Record<string, any>,
) {
  const cell = ensureWorksheetCell(
    worksheet,
    address,
    worksheet[address]?.v ?? '',
    (worksheet[address]?.t as 's' | 'n') || 's',
  );
  cell.s = style;
}

function setWorksheetMerges(worksheet: XLSX.WorkSheet, merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>) {
  worksheet['!merges'] = merges;
}

function setWorksheetColumns(worksheet: XLSX.WorkSheet, columns: Array<Record<string, number>>) {
  worksheet['!cols'] = columns;
}

function setWorksheetRows(worksheet: XLSX.WorkSheet, rows: Array<Record<string, number>>) {
  worksheet['!rows'] = rows;
}

function setWorksheetFreeze(worksheet: XLSX.WorkSheet, freeze: Record<string, any>) {
  worksheet['!freeze'] = freeze;
}

function buildPtitStyles() {
  return {
    title1: {
      font: { bold: true, sz: 14, name: 'Times New Roman', color: { rgb: '1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'E7F3FF' } },
    },
    title2: {
      font: { bold: true, sz: 13, name: 'Times New Roman', color: { rgb: '1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'E7F3FF' } },
    },
    title3: {
      font: { bold: true, sz: 16, name: 'Times New Roman', color: { rgb: '1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'D0E8FF' } },
    },
    italic: {
      font: { italic: true, sz: 11, name: 'Times New Roman', color: { rgb: '333333' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    },
    header: {
      font: { bold: true, sz: 11, name: 'Times New Roman', color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: '4472C4' } },
      border: {
        top: { style: 'medium', color: { rgb: '1F4E78' } },
        bottom: { style: 'medium', color: { rgb: '1F4E78' } },
        left: { style: 'medium', color: { rgb: '1F4E78' } },
        right: { style: 'medium', color: { rgb: '1F4E78' } },
      },
    },
    subHeader: {
      font: { bold: true, sz: 10, name: 'Times New Roman', color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: '5B9BD5' } },
      border: {
        top: { style: 'thin', color: { rgb: '1F4E78' } },
        bottom: { style: 'thin', color: { rgb: '1F4E78' } },
        left: { style: 'thin', color: { rgb: '1F4E78' } },
        right: { style: 'thin', color: { rgb: '1F4E78' } },
      },
    },
    dataCenter: {
      font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } },
      },
      fill: { fgColor: { rgb: 'FFFFFF' } },
    },
    dataLeft: {
      font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } },
      },
      fill: { fgColor: { rgb: 'FFFFFF' } },
    },
    dataCenterAlt: {
      font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } },
      },
      fill: { fgColor: { rgb: 'F2F2F2' } },
    },
    dataLeftAlt: {
      font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } },
      },
      fill: { fgColor: { rgb: 'F2F2F2' } },
    },
  };
}

function buildVeptStyles() {
  const baseBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  return {
    title: {
      font: { name: 'Times New Roman', sz: 13, bold: true },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    },
    label: {
      font: { name: 'Times New Roman', sz: 11 },
      alignment: { horizontal: 'left', vertical: 'center' },
    },
    centerBanner: {
      font: { name: 'Times New Roman', sz: 11, bold: true },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'FFCCCC' } },
    },
    headerYellow: {
      font: { name: 'Times New Roman', sz: 10, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'FFFF99' } },
      border: baseBorder,
    },
    headerRed: {
      font: { name: 'Times New Roman', sz: 10, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'FFCCCC' } },
      border: baseBorder,
    },
    dataCenter: {
      font: { name: 'Times New Roman', sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
      border: {
        top: { style: 'thin', color: { rgb: 'AAAAAA' } },
        bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
        left: { style: 'thin', color: { rgb: 'AAAAAA' } },
        right: { style: 'thin', color: { rgb: 'AAAAAA' } },
      },
    },
    dataLeft: {
      font: { name: 'Times New Roman', sz: 11 },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
      border: {
        top: { style: 'thin', color: { rgb: 'AAAAAA' } },
        bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
        left: { style: 'thin', color: { rgb: 'AAAAAA' } },
        right: { style: 'thin', color: { rgb: 'AAAAAA' } },
      },
    },
  };
}

function getDateParts(value: any) {
  const parts = parseDateParts(value);
  return {
    date: parts ? new Date(parts.year, parts.month - 1, parts.day) : null,
    day: parts?.day ?? '',
    month: parts?.month ?? '',
    year: parts?.year ?? '',
  };
}

function formatExamDateLine(value: any) {
  const { day, month, year } = getDateParts(value);
  if (!day || !month || !year) return 'Thời gian: Chưa xác định';
  return `Thời gian: ngày ${String(day).padStart(2, '0')} tháng ${String(month).padStart(2, '0')} năm ${year}`;
}

function clearWorksheetValuesFromRow(worksheet: XLSX.WorkSheet, startRow: number) {
  const ref = worksheet['!ref'];
  if (!ref) return;

  const range = XLSX.utils.decode_range(ref);
  const startRowIndex = Math.max(Number(startRow || 1) - 1, range.s.r);

  for (let row = startRowIndex; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      if (!cell) continue;

      cell.v = '';
      cell.t = 's';
      delete (cell as any).w;
      delete (cell as any).f;
      delete (cell as any).h;
      delete (cell as any).r;
    }
  }
}

function writePtitExamListTemplate(
  worksheet: XLSX.WorkSheet,
  examInfo: any,
  students: any[],
  dataStartRow: number,
) {
  const styles = buildPtitStyles();
  const title1 = 'CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO';
  const title2 = 'THEO THÔNG TƯ 03/2014/TT-BTTTT';
  const title3 = String(examInfo.exam_name || 'DANH SÁCH DỰ THI').trim();
  const examDateLine = formatExamDateLine(examInfo.exam_date);
  const organizerLine = `Hội đồng thi: ${examInfo.organizer_name || examInfo.location || 'Chưa xác định'}`;
  const headers = ['STT', 'SỐ PHÁCH', 'SỐ CMT', 'HỌ', 'TÊN', 'NGÀY SINH', 'NƠI SINH', 'GIỚI TÍNH', 'DÂN TỘC', 'MÔN THI', '', 'KÝ TÊN', 'GHI CHÚ'];
  const cols = 'ABCDEFGHIJKLM'.split('');

  ensureWorksheetCell(worksheet, 'A1', title1);
  ensureWorksheetCell(worksheet, 'A2', title2);
  ensureWorksheetCell(worksheet, 'A3', title3);
  ensureWorksheetCell(worksheet, 'F4', examDateLine);
  ensureWorksheetCell(worksheet, 'F5', organizerLine);

  applyCellStyle(worksheet, 'A1', styles.title1);
  applyCellStyle(worksheet, 'A2', styles.title2);
  applyCellStyle(worksheet, 'A3', styles.title3);
  applyCellStyle(worksheet, 'F4', styles.italic);
  applyCellStyle(worksheet, 'F5', styles.italic);

  headers.forEach((header, index) => {
    const col = cols[index];
    ensureWorksheetCell(worksheet, `${col}7`, header);
    applyCellStyle(worksheet, `${col}7`, styles.header);
  });

  cols.forEach((col) => {
    const subHeaderValue = col === 'J' ? 'LT' : col === 'K' ? 'TH' : '';
    ensureWorksheetCell(worksheet, `${col}8`, subHeaderValue);
    applyCellStyle(worksheet, `${col}8`, styles.subHeader);
  });

  students.forEach((student, index) => {
    const row = dataStartRow + index;
    const isAltRow = index % 2 === 1;
    const centerStyle = isAltRow ? styles.dataCenterAlt : styles.dataCenter;
    const leftStyle = isAltRow ? styles.dataLeftAlt : styles.dataLeft;

    ensureWorksheetCell(worksheet, `A${row}`, index + 1, 'n');
    ensureWorksheetCell(worksheet, `B${row}`, '');
    ensureWorksheetCell(worksheet, `C${row}`, student.cccd || '');
    ensureWorksheetCell(worksheet, `D${row}`, [student.ho, student.ten_dem].filter(Boolean).join(' '));
    ensureWorksheetCell(worksheet, `E${row}`, student.ten || '');
    ensureWorksheetCell(worksheet, `F${row}`, formatDateVN(student.ngay_sinh));
    ensureWorksheetCell(worksheet, `G${row}`, cleanStudentPlace(student.noi_sinh));
    ensureWorksheetCell(worksheet, `H${row}`, normalizeGenderLabel(student.gioi_tinh));
    ensureWorksheetCell(worksheet, `I${row}`, student.dan_toc || '');
    ensureWorksheetCell(worksheet, `J${row}`, '');
    ensureWorksheetCell(worksheet, `K${row}`, '');
    ensureWorksheetCell(worksheet, `L${row}`, '');
    ensureWorksheetCell(worksheet, `M${row}`, '');

    applyCellStyle(worksheet, `A${row}`, centerStyle);
    applyCellStyle(worksheet, `B${row}`, centerStyle);
    applyCellStyle(worksheet, `C${row}`, centerStyle);
    applyCellStyle(worksheet, `D${row}`, leftStyle);
    applyCellStyle(worksheet, `E${row}`, leftStyle);
    applyCellStyle(worksheet, `F${row}`, centerStyle);
    applyCellStyle(worksheet, `G${row}`, leftStyle);
    applyCellStyle(worksheet, `H${row}`, centerStyle);
    applyCellStyle(worksheet, `I${row}`, centerStyle);
    applyCellStyle(worksheet, `J${row}`, centerStyle);
    applyCellStyle(worksheet, `K${row}`, centerStyle);
    applyCellStyle(worksheet, `L${row}`, centerStyle);
    applyCellStyle(worksheet, `M${row}`, leftStyle);
  });

  setWorksheetMerges(worksheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
    { s: { r: 3, c: 5 }, e: { r: 3, c: 12 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 12 } },
    { s: { r: 6, c: 9 }, e: { r: 6, c: 10 } },
  ]);

  setWorksheetColumns(worksheet, [
    { wch: 6 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 16 },
  ]);

  const lastRow = Math.max(dataStartRow, dataStartRow + students.length - 1);
  const rows: Array<Record<string, number>> = [
    { hpt: 24 },
    { hpt: 22 },
    { hpt: 28 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 12 },
    { hpt: 28 },
    { hpt: 22 },
  ];
  for (let row = 9; row <= lastRow; row += 1) {
    rows[row - 1] = { hpt: 20 };
  }
  setWorksheetRows(worksheet, rows);
  setWorksheetFreeze(worksheet, { xSplit: 0, ySplit: 8, topLeftCell: 'A9', activePane: 'bottomLeft', state: 'frozen' });
}

function writeVeptExamListTemplate(
  worksheet: XLSX.WorkSheet,
  examInfo: any,
  students: any[],
  dataStartRow: number,
) {
  const styles = buildVeptStyles();
  const headersLeft = [
    'STT',
    'Họ và tên đệm',
    'Tên',
    'Giới tính',
    'Ngày sinh',
    'Tháng sinh ',
    'Năm sinh',
    'Số CMND/ Hộ chiếu',
    'Điện thoại',
    'Email (Thí sinh điền đúng thông tin để nhận kết quả thi)',
    'Đơn vị công tác/ Trường học',
    'Vị trí công tác',
    'Nhu cầu đăng ký trình độ (A1, A2, B1, B2, C1, C2)',
    'Nhu cầu đăng ký thi ngày',
    'Mục đích tham dự thi (Ghi rõ làm đầu vào, đầu ra sinh viên, thạc sĩ, tiến sĩ…)',
    'Nguồn đăng kí ',
  ];
  const headersRight = ['Kiểm tra hồ sơ dự thi', 'Ngày thi', 'Giờ thi', 'Địa điểm thi'];

  ensureWorksheetCell(worksheet, 'A1', 'DANH SÁCH ĐĂNG KÝ THI VERSANT ENGLISH PLACEMENT TEST (VEPT)');
  ensureWorksheetCell(worksheet, 'A2', `Tên Đơn vị/ Trường học đăng ký: ${examInfo.organizer_name || ''}`);
  ensureWorksheetCell(worksheet, 'A3', 'Đại diện đăng ký: ');
  ensureWorksheetCell(worksheet, 'E3', 'Số điện thoại:');
  ensureWorksheetCell(worksheet, 'Q3', 'Phần dành cho trung tâm');

  applyCellStyle(worksheet, 'A1', styles.title);
  applyCellStyle(worksheet, 'A2', styles.label);
  applyCellStyle(worksheet, 'A3', styles.label);
  applyCellStyle(worksheet, 'E3', styles.label);
  applyCellStyle(worksheet, 'Q3', styles.centerBanner);

  headersLeft.forEach((header, index) => {
    const address = `${XLSX.utils.encode_col(index)}4`;
    ensureWorksheetCell(worksheet, address, header);
    applyCellStyle(worksheet, address, styles.headerYellow);
  });

  headersRight.forEach((header, index) => {
    const address = `${XLSX.utils.encode_col(16 + index)}4`;
    ensureWorksheetCell(worksheet, address, header);
    applyCellStyle(worksheet, address, styles.headerRed);
  });

  students.forEach((student, index) => {
    const row = dataStartRow + index;
    const birthDate = getDateParts(student.ngay_sinh);
    const day = birthDate.day || '';
    const month = birthDate.month || '';
    const year = birthDate.year || '';

    ensureWorksheetCell(worksheet, `A${row}`, index + 1, 'n');
    ensureWorksheetCell(worksheet, `B${row}`, [student.ho, student.ten_dem].filter(Boolean).join(' '));
    ensureWorksheetCell(worksheet, `C${row}`, student.ten || '');
    ensureWorksheetCell(worksheet, `D${row}`, normalizeGenderLabel(student.gioi_tinh));
    ensureWorksheetCell(worksheet, `E${row}`, day, day === '' ? 's' : 'n');
    ensureWorksheetCell(worksheet, `F${row}`, month, month === '' ? 's' : 'n');
    ensureWorksheetCell(worksheet, `G${row}`, year, year === '' ? 's' : 'n');
    ensureWorksheetCell(worksheet, `H${row}`, student.cccd || '');
    ensureWorksheetCell(worksheet, `I${row}`, student.sdt || '');
    ensureWorksheetCell(worksheet, `J${row}`, student.email || '');
    ensureWorksheetCell(worksheet, `K${row}`, cleanStudentWorkplace(student.don_vi_cong_tac));
    ensureWorksheetCell(worksheet, `L${row}`, '');
    ensureWorksheetCell(worksheet, `M${row}`, examInfo.exam_level || '');
    ensureWorksheetCell(worksheet, `N${row}`, formatDateVN(examInfo.exam_date));
    ensureWorksheetCell(worksheet, `T${row}`, examInfo.location || '');

    applyCellStyle(worksheet, `A${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `B${row}`, styles.dataLeft);
    applyCellStyle(worksheet, `C${row}`, styles.dataLeft);
    applyCellStyle(worksheet, `D${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `E${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `F${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `G${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `H${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `I${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `J${row}`, styles.dataLeft);
    applyCellStyle(worksheet, `K${row}`, styles.dataLeft);
    applyCellStyle(worksheet, `L${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `M${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `N${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `O${row}`, styles.dataLeft);
    applyCellStyle(worksheet, `P${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `Q${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `R${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `S${row}`, styles.dataCenter);
    applyCellStyle(worksheet, `T${row}`, styles.dataCenter);
  });

  const lastRow = Math.max(dataStartRow, dataStartRow + students.length - 1);
  setWorksheetMerges(worksheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 16 }, e: { r: 2, c: 19 } },
  ]);
  setWorksheetColumns(worksheet, [
    { wch: 5 },
    { wch: 20 },
    { wch: 8 },
    { wch: 9 },
    { wch: 7 },
    { wch: 8 },
    { wch: 7 },
    { wch: 16 },
    { wch: 13 },
    { wch: 34 },
    { wch: 26 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 36 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
  ]);
  const rows: Array<Record<string, number>> = [
    { hpt: 30 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 60 },
  ];
  for (let row = 5; row <= lastRow; row += 1) {
    rows[row - 1] = { hpt: 18 };
  }
  setWorksheetRows(worksheet, rows);
  setWorksheetFreeze(worksheet, { xSplit: 0, ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft', state: 'frozen' });
}

function applyMappedTemplate(
  worksheet: XLSX.WorkSheet,
  template: any,
  examInfo: any,
  students: any[],
) {
  const templateName = String(template?.name || '').toLowerCase();
  const dataStartRow = Number(template?.data_start_row || 10);

  // Template files often contain sample rows. Clear old values first so export
  // always reflects exactly the current approved list.
  clearWorksheetValuesFromRow(worksheet, dataStartRow);

  if (templateName === 'ptit') {
    writePtitExamListTemplate(worksheet, examInfo, students, dataStartRow);
    return true;
  }

  if (templateName === 'vept') {
    writeVeptExamListTemplate(worksheet, examInfo, students, dataStartRow);
    return true;
  }

  if (template?.date_cell) {
    ensureWorksheetCell(worksheet, template.date_cell, formatDateVN(examInfo.exam_date));
  }

  const mapping = template?.column_mapping ? JSON.parse(template.column_mapping) : null;
  if (!mapping) {
    return false;
  }

  students.forEach((student: any, index: number) => {
    const rowIndex = (dataStartRow - 1) + index;

    Object.entries(mapping).forEach(([field, colLetter]) => {
      const colIndex = XLSX.utils.decode_col(colLetter as string);
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });

      let value: any = '';
      if (field === 'stt') value = index + 1;
      else if (field === 'ho_ten') value = student.ho_ten_full || [student.ho, student.ten_dem, student.ten].filter(Boolean).join(' ');
      else if (field === 'ngay_sinh') value = formatDateVN(student.ngay_sinh);
      else if (field === 'ma_sv') value = student.cccd || student.id || '';
      else if (field === 'ho_so') value = '';
      else value = getStudentExportValue(student, field);

      ensureWorksheetCell(worksheet, cellAddress, value, typeof value === 'number' ? 'n' : 's');
    });
  });

  return true;
}

// ========================================
// GET /export/class/:class_id - Xuất Excel danh sách theo form chuẩn
// ========================================
exportRoute.get('/class/:class_id', async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));

    // 1. Lấy thông tin lớp
    const classInfo = await getClassById(c.env.DB, classId) as any;
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    // 2. Lấy danh sách đăng ký
    const registrations = excludeTestStudents(await getRegistrationsByClass(c.env.DB, classId));

    // 3. Tạo workbook
    const workbook = XLSX.utils.book_new();

    // Headers theo mẫu form chuẩn
    const headers = [
      'Họ và tên đệm',
      'Tên',
      'Ngày tháng năm sinh',
      'Giới tính',
      'Dân tộc',
      'SĐT',
      'Email',
      'Số CCCD',
      'Ngày cấp CCCD',
      'NƠI SINH\n(Chỉ ghi tên tỉnh/TP - ví dụ: Hà Nội)\n\nGHI THEO ĐỊA CHỈ TRÊN CCCD CÒN HIỆU LỰC',
      'ĐƠN VỊ CÔNG TÁC/HỌC TẬP\n(Ví dụ: Sinh viên trường Đại học Công nghiệp)',
      'BẢN CUNG CẤP THÔNG TIN CƯ THỂ VỀ NƠI ĐANG Ở HIỆN NAY\n(Ghi cụ thể: số nhà, tổ, khu phố, tên đường, ấp/xã/phường, tỉnh / TP ....)\nGHI THEO ĐỊA CHỈ MỚI SAU SÁP NHẬP'
    ];

    // 4. Tạo data rows
    const dataRows = registrations.map((reg) => {
      const hoVaTenDem = (reg.ho || '') + (reg.ten_dem ? ' ' + reg.ten_dem : '');
      return [
        hoVaTenDem,
        reg.ten || '',
        formatDateVN(reg.ngay_sinh),
        normalizeGenderLabel(reg.gioi_tinh),
        reg.dan_toc || 'Kinh',
        reg.sdt || '',
        reg.email || '',
        reg.cccd || '',
        formatDateVN(reg.ngay_cap_cccd),
        cleanStudentPlace(reg.noi_sinh),
        cleanStudentWorkplace(reg.don_vi_cong_tac),
        cleanStudentAddress(reg.dia_chi),
      ];
    });

    // 5. Tạo worksheet
    const wsData = [headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // 6. Thiết lập độ rộng cột
    worksheet['!cols'] = [
      { wch: 22 },  // Họ và tên đệm
      { wch: 12 },  // Tên
      { wch: 18 },  // Ngày sinh
      { wch: 10 },  // Giới tính
      { wch: 10 },  // Dân tộc
      { wch: 15 },  // SĐT
      { wch: 28 },  // Email
      { wch: 18 },  // Số CCCD
      { wch: 18 },  // Ngày cấp CCCD
      { wch: 28 },  // Nơi sinh
      { wch: 32 },  // Đơn vị công tác
      { wch: 50 },  // Địa chỉ hiện tại
    ];

    // 7. Thiết lập chiều cao hàng
    worksheet['!rows'] = [{ hpt: 90 }]; // Header row cao

    // 8. Áp dụng style cho tất cả cells (borders + formatting)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { v: '', t: 's' };
        }

        // Style cho header row
        if (row === 0) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11, bold: true },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            fill: { fgColor: { rgb: 'E2EFDA' } } // Màu xanh nhạt như mẫu
          };
        } else {
          // Style cho data rows
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11 },
            border: borderStyle,
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách');

    // 9. Tạo buffer và return
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Danh-sach-${classInfo.ma_lop || classInfo.ten_lop.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Upload to R2
    try {
      await (c.env.R2 as any).put(filename, excelBuffer, {
        httpMetadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    } catch (r2Error: any) {
      console.error('R2 upload error:', r2Error);
    }


    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Export error:', error);
    return errorResponse('Lỗi xuất Excel: ' + error.message, 500);
  }
});

// ========================================
// GET /export/class/:class_id/json - Xuất JSON (để preview)
// ========================================
exportRoute.get('/class/:class_id/json', async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));

    const classInfo = await getClassById(c.env.DB, classId) as any;
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    const registrations = excludeTestStudents(await getRegistrationsByClass(c.env.DB, classId));

    return new Response(JSON.stringify({
      success: true,
      class: classInfo,
      registrations,
      count: registrations.length,
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// GET /export/class/:class_id/csv - Xuất CSV
// ========================================
exportRoute.get('/class/:class_id/csv', async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));
    const classInfo = await getClassById(c.env.DB, classId) as any;
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    const registrations = excludeTestStudents(await getRegistrationsByClass(c.env.DB, classId));

    // Convert to CSV
    const headers = ['STT', 'Số phách', 'Số CMT', 'Họ', 'Tên', 'Ngày sinh', 'Nơi sinh', 'Giới tính', 'Email', 'SĐT', 'Địa chỉ', 'Trạng thái', 'Nộp phí'];
    const csvRows = registrations.map((reg, index) => {
      const nopPhi = (reg.payment_status === 'confirmed' || reg.payment_status === 'paid') ? 'Đã nộp' : 'Chưa nộp';
      const statusMap = {
        'pending': 'Chờ duyệt',
        'approved': 'Đã duyệt',
        'studying': 'Đang học',
        'completed': 'Hoàn thành',
        'certified': 'Đã cấp chứng chỉ',
        'cancelled': 'Đã hủy'
      };
      const trangThai = statusMap[reg.status as keyof typeof statusMap] || reg.status;

      return [
        index + 1,
        reg.so_phach || '',
        reg.cccd || '',
        (reg.ho || '') + (reg.ten_dem ? ' ' + reg.ten_dem : ''),
        reg.ten || '',
        formatDateVN(reg.ngay_sinh),
        cleanStudentPlace(reg.noi_sinh),
        normalizeGenderLabel(reg.gioi_tinh),
        reg.email || '',
        reg.sdt || '',
        cleanStudentAddress(reg.dia_chi),
        trangThai,
        nopPhi,
      ].map(val => {
        const str = String(val || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });

    const csv = [headers.join(','), ...csvRows].join('\n');
    const filename = `danh-sach-${classInfo.ten_lop.replace(/\s+/g, '-')}-${Date.now()}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return errorResponse('Lỗi xuất CSV: ' + error.message, 500);
  }
});

// ========================================
// GET /export/exam/:exam_id - Xuất Excel danh sách thí sinh theo form chuẩn
// ========================================
exportRoute.get('/exam/:exam_id', async (c) => {
  try {
    const examId = parseInt(c.req.param('exam_id'));

    // 1. Lấy thông tin kỳ thi
    const examInfo = await c.env.DB.prepare(
      'SELECT * FROM exam_schedules WHERE id = ?'
    ).bind(examId).first() as any;

    if (!examInfo) {
      return errorResponse('Kỳ thi không tồn tại', 404);
    }

    // 2. Lấy đúng danh sách đã duyệt như màn hình admin (/exam-schedules/:id/students)
    const students = await getExamRegistrations(c.env.DB, examId) as any[];

    // 3. Tạo workbook
    const workbook = XLSX.utils.book_new();

    // Parse ngày thi
    const { day, month, year } = getDateParts(examInfo.exam_date);

    // Header organization rows
    const orgHeaders = [
      ['CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO', '', '', '', '', '', '', '', '', '', '', ''],
      ['THEO THÔNG TƯ 03/2014/TT-BTTTT', '', '', '', '', '', '', '', '', '', '', ''],
      [`DANH SÁCH THÍ SINH - ${examInfo.exam_name}`, '', '', '', '', '', '', '', '', '', '', ''],
      [`Thời gian: ngày ${day} tháng ${String(month).padStart(2, '0')} năm ${year}`, '', '', '', '', '', '', '', '', '', '', ''],
      [`Địa điểm thi: ${examInfo.location || 'Chưa xác định'}`, '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
    ];

    // Headers cột theo mẫu form chuẩn
    const headers = [
      'Họ và tên đệm',
      'Tên',
      'Ngày tháng năm sinh',
      'Giới tính',
      'Dân tộc',
      'SĐT',
      'Email',
      'Số CCCD',
      'Ngày cấp CCCD',
      'NƠI SINH\n(Chỉ ghi tên tỉnh/TP - ví dụ: Hà Nội)\n\nGHI THEO ĐỊA CHỈ TRÊN CCCD CÒN HIỆU LỰC',
      'ĐƠN VỊ CÔNG TÁC/HỌC TẬP\n(Ví dụ: Sinh viên trường Đại học Công nghiệp)',
      'BẢN CUNG CẤP THÔNG TIN CƯ THỂ VỀ NƠI ĐANG Ở HIỆN NAY\n(Ghi cụ thể: số nhà, tổ, khu phố, tên đường, ấp/xã/phường, tỉnh / TP ....)\nGHI THEO ĐỊA CHỈ MỚI SAU SÁP NHẬP'
    ];

    // 4. Tạo data rows
    const dataRows = students.map((s) => {
      const hoVaTenDem = (s.ho || '') + (s.ten_dem ? ' ' + s.ten_dem : '');
      return [
        hoVaTenDem,
        s.ten || '',
        formatDateVN(s.ngay_sinh),
        normalizeGenderLabel(s.gioi_tinh),
        s.dan_toc || 'Kinh',
        s.sdt || '',
        s.email || '',
        s.cccd || '',
        formatDateVN(s.ngay_cap_cccd),
        cleanStudentPlace(s.noi_sinh),
        cleanStudentWorkplace(s.don_vi_cong_tac),
        cleanStudentAddress(s.dia_chi),
      ];
    });

    // 5. Tạo worksheet với org headers + column headers + data
    const wsData = [...orgHeaders, headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // 6. Merge cells cho Organization Header
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, // ĐẠI HỌC CÔNG ĐOÀN
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }, // TRUNG TÂM TIN HỌC
      { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } }, // DANH SÁCH THÍ SINH
      { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } }, // Thời gian
      { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } }, // Hội đồng thi
    ];

    // 7. Thiết lập độ rộng cột
    worksheet['!cols'] = [
      { wch: 22 },  // Họ và tên đệm
      { wch: 10 },  // Tên
      { wch: 12 },  // Ngày sinh
      { wch: 8 },   // Giới tính
      { wch: 8 },   // Dân tộc
      { wch: 12 },  // SĐT
      { wch: 25 },  // Email
      { wch: 14 },  // Số CCCD
      { wch: 12 },  // Ngày cấp CCCD
      { wch: 20 },  // Nơi sinh
      { wch: 25 },  // Đơn vị công tác
      { wch: 40 },  // Địa chỉ hiện tại
    ];

    // 8. Thiết lập chiều cao hàng
    worksheet['!rows'] = [
      { hpt: 20 }, { hpt: 20 }, { hpt: 30 }, { hpt: 20 }, { hpt: 20 }, { hpt: 10 }, // Header info rows
      { hpt: 45 } // Column header row
    ];

    // 9. Áp dụng style cho tất cả cells
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { v: '', t: 's' };
        }

        // Style chung: Font Times New Roman
        const baseStyle = {
          font: { name: 'Times New Roman', sz: 11 },
          alignment: { vertical: 'center', wrapText: true }
        };

        // Org Header Rows (0-4)
        if (row <= 4) {
          if (row <= 1) { // ĐH CÔNG ĐOÀN, TRUNG TÂM TIN HỌC
            worksheet[cellAddress].s = {
              font: { name: 'Times New Roman', sz: 12, bold: true },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          } else if (row === 2) { // DANH SÁCH THÍ SINH (Title lớn)
            worksheet[cellAddress].s = {
              font: { name: 'Times New Roman', sz: 16, bold: true, color: { rgb: '000000' } },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          } else { // Thời gian, Hội đồng thi
            worksheet[cellAddress].s = {
              font: { name: 'Times New Roman', sz: 12, italic: true },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
        // Column Header Row (6)
        else if (row === 6) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11, bold: true },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            fill: { fgColor: { rgb: 'E2EFDA' } } // Light Green background
          };
        }
        // Data Rows (7+)
        else if (row >= 7) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11 },
            border: borderStyle,
            alignment: {
              horizontal: [2, 3, 4, 5, 7, 8].includes(col) ? 'center' : 'left', // Center specific columns (Date, Gender, CCCD...)
              vertical: 'center',
              wrapText: true
            }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách thí sinh');

    // 9. Tạo buffer và return
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = buildExamExportFilename(examInfo.exam_name);

    // Upload to R2
    try {
      await (c.env.R2 as any).put(filename, excelBuffer, {
        httpMetadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    } catch (r2Error: any) {
      console.error('R2 upload error:', r2Error);
    }

    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': buildAttachmentDisposition(filename),
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Export exam error:', error);
    return errorResponse('Lỗi xuất Excel: ' + error.message, 500);
  }
});

// ========================================
// GET /export/exam/:exam_id/exam-list - Xuất "DANH SÁCH DỰ THI" theo mẫu chuẩn
// ========================================
exportRoute.get('/exam/:exam_id/exam-list', async (c) => {
  try {
    const examId = parseInt(c.req.param('exam_id'));

    // 1. Lấy thông tin kỳ thi (kèm template_id)
    const examInfo = await c.env.DB.prepare(
      `
        SELECT e.*, org.name as organizer_name, org.code as organizer_code
        FROM exam_schedules e
        LEFT JOIN program_organizers org ON org.uuid = e.organizer_uuid
        WHERE e.id = ?
      `
    ).bind(examId).first() as any;

    if (!examInfo) {
      return errorResponse('Kỳ thi không tồn tại', 404);
    }

    // 2. Lấy đúng danh sách đã duyệt như màn hình admin (/exam-schedules/:id/students)
    const students = await getExamRegistrations(c.env.DB, examId) as any[];

    // 2.1 Sort theo cột TÊN (cột E) nhưng giữ nguyên toàn bộ dòng dữ liệu
    // Ưu tiên: TEN -> HO -> TEN_DEM -> CCCD/ID, dùng localeCompare tiếng Việt để sắp xếp có dấu ổn hơn.
    students.sort((a: any, b: any) => {
      const aTen = (a.ten || '').trim();
      const bTen = (b.ten || '').trim();
      const cmpTen = aTen.localeCompare(bTen, 'vi', { sensitivity: 'base' });
      if (cmpTen !== 0) return cmpTen;

      const aHo = (a.ho || '').trim();
      const bHo = (b.ho || '').trim();
      const cmpHo = aHo.localeCompare(bHo, 'vi', { sensitivity: 'base' });
      if (cmpHo !== 0) return cmpHo;

      const aTenDem = (a.ten_dem || '').trim();
      const bTenDem = (b.ten_dem || '').trim();
      const cmpTenDem = aTenDem.localeCompare(bTenDem, 'vi', { sensitivity: 'base' });
      if (cmpTenDem !== 0) return cmpTenDem;

      const aKey = (a.cccd || a.id || '').toString();
      const bKey = (b.cccd || b.id || '').toString();
      return aKey.localeCompare(bKey, 'vi', { sensitivity: 'base' });
    });
    const { day, month, year } = getDateParts(examInfo.exam_date);

    // 3. Export mặc định theo dữ liệu danh sách thực tế đang hiển thị
    const workbook = XLSX.utils.book_new();

    // Header rows 
    const headerRows = [
      ['CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['THEO THÔNG TƯ 03/2014/TT-BTTTT', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['DANH SÁCH DỰ THI', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', `Thời gian: ngày ${day} tháng ${String(month).padStart(2, '0')} năm ${year}`, '', '', '', '', '', '', ''],
      ['', '', '', '', '', `Địa điểm thi: ${examInfo.location || 'Chưa xác định'}`, '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['STT', 'SỐ PHÁCH', 'SỐ CMT', 'HỌ', 'TÊN', 'NGÀY SINH', 'NƠI SINH', 'GIỚI TÍNH', 'DÂN TỘC', 'MÔN THI', '', 'KÝ TÊN', 'GHI CHÚ'],
      ['', '', '', '', '', '', '', '', '', 'LT', 'TH', '', ''],
    ];

    // Tạo data rows
    const dataRows = students.map((s, index) => {
      const hoVaTenDem = (s.ho || '') + (s.ten_dem ? ' ' + s.ten_dem : '');
      return [
        index + 1,
        '', // SỐ PHÁCH
        s.cccd || '',
        hoVaTenDem,
        s.ten || '',
        formatDateVN(s.ngay_sinh),
        cleanStudentPlace(s.noi_sinh),
        normalizeGenderLabel(s.gioi_tinh),
        s.dan_toc || '',
        '', // LT
        '', // TH
        '', // KÝ TÊN
        '', // GHI CHÚ
      ];
    });

    const wsData = [...headerRows, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Merge cells
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
      { s: { r: 3, c: 5 }, e: { r: 3, c: 12 } },
      { s: { r: 4, c: 5 }, e: { r: 4, c: 12 } },
      { s: { r: 6, c: 9 }, e: { r: 6, c: 10 } },
    ];

    // Col widths
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
      { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 5 },
      { wch: 5 }, { wch: 12 }, { wch: 12 },
    ];

    // Styles
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '', t: 's' };

        if (row <= 2) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: row === 2 ? 14 : 12, bold: true },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        } else if (row >= 3 && row <= 5) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11, italic: true },
            alignment: { horizontal: 'left', vertical: 'center' },
          };
        } else if (row >= 6 && row <= 7) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11, bold: true },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            fill: { fgColor: { rgb: 'D9E1F2' } }
          };
        } else {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11 },
            border: borderStyle,
            alignment: { horizontal: col === 0 ? 'center' : 'left', vertical: 'center' }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách dự thi');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = buildExamExportFilename(examInfo.exam_name);

    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': buildAttachmentDisposition(filename),
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Export exam list error:', error);
    return errorResponse('Lỗi xuất danh sách dự thi: ' + error.message, 500);
  }
});


export default exportRoute;
