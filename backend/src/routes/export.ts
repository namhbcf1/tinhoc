import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import XLSX from 'xlsx-js-style';
import { errorResponse, formatDate } from '../utils/helpers.js';
import { getRegistrationsByClass, getClassById } from '../db/queries.js';
import {
  getExamRegistrations,
  getExamRegistrationsForExport,
  type ExamRegistrationExportScope,
} from '../db/attendance-queries.js';
import { normalizeBirthPlaceValue } from '../utils/birth-place.js';
import { requireAdmin } from '../middleware/auth-middleware.js';
import * as StudentRepo from '../repositories/student-repository.js';

const exportRoute = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

const EXAM_EXPORT_SCOPE_LABELS: Record<ExamRegistrationExportScope, string> = {
  approved: 'Chỉ đã duyệt',
  all: 'Tất cả',
};

// Format date as DD/MM/YYYY for Vietnamese locale Excel export
function normalizeWhitespace(value: any) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function toUpperVi(value: any) {
  return normalizeWhitespace(value).toLocaleUpperCase('vi-VN');
}

function normalizeEmail(value: any) {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizeStudentForExport(student: any) {
  const s = { ...student };
  s.ho = toUpperVi(s.ho);
  s.ten_dem = toUpperVi(s.ten_dem);
  s.ten = toUpperVi(s.ten);
  s.ho_ten_full = toUpperVi(s.ho_ten_full || [s.ho, s.ten_dem, s.ten].filter(Boolean).join(' '));
  s.gioi_tinh = normalizeGenderLabel(s.gioi_tinh);
  s.dan_toc = toUpperVi(s.dan_toc);
  s.quoc_tich = toUpperVi(s.quoc_tich);
  s.noi_sinh = toUpperVi(s.noi_sinh);
  s.dia_chi = toUpperVi(s.dia_chi);
  s.don_vi_cong_tac = toUpperVi(s.don_vi_cong_tac);
  s.email = normalizeEmail(s.email);
  return s;
}

function normalizeStudentsForExport(students: any[]) {
  return (students || []).map((student) => normalizeStudentForExport(student));
}

function resolveExamExportScope(rawScope: string | undefined | null): ExamRegistrationExportScope | null {
  if (!rawScope) return 'approved';
  if (rawScope === 'approved' || rawScope === 'all') return rawScope;
  return null;
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
  if (['nam', 'male', 'm'].includes(normalized)) return 'NAM';
  if (['nữ', 'nu', 'female', 'f'].includes(normalized)) return 'NỮ';
  return toUpperVi(value);
}

function cleanStudentPlace(value: any) {
  const cleaned = normalizeWhitespace(value)
    .replace(/^(place\s+of\s+origin|place\s+of\s+ongin|quê\s*quán|quê\s*quản|que\s*quan|nơi\s*thường\s*trú)\s*[:/,-]?\s*/i, '')
    .replace(/^[/:;,\-.\s]+/, '')
    .trim();

  return toUpperVi(normalizeBirthPlaceValue(cleaned));
}

function cleanStudentWorkplace(value: any) {
  return toUpperVi(value);
}

function cleanStudentAddress(value: any) {
  return toUpperVi(value);
}

function getStudentExportValue(student: any, field: string) {
  if (field === 'gioi_tinh') return normalizeGenderLabel(student.gioi_tinh);
  if (field === 'noi_sinh') return cleanStudentPlace(student.noi_sinh);
  if (field === 'don_vi_cong_tac') return cleanStudentWorkplace(student.don_vi_cong_tac);
  if (field === 'dia_chi') return cleanStudentAddress(student.dia_chi);
  if (field === 'email') return normalizeEmail(student?.email);
  const value = student?.[field];
  if (typeof value === 'string') return toUpperVi(value);
  return value ?? '';
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

function normalizeTemplateToken(value: any) {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function detectExamListTemplateName(input: {
  templateName?: string | null;
  templateDisplayName?: string | null;
  organizerCode?: string | null;
  organizerName?: string | null;
  programCode?: string | null;
  programName?: string | null;
  examName?: string | null;
  examType?: string | null;
}) {
  const templateTokens = [input.templateName, input.templateDisplayName]
    .map(normalizeTemplateToken)
    .filter(Boolean);

  if (
    templateTokens.some(
      (value) =>
        value.includes('VANTRANG') ||
        value.includes('MAC DINH') ||
        value.includes('DEFAULT'),
    )
  ) {
    return 'vantrang_full';
  }

  const tokens = [
    input.templateName,
    input.templateDisplayName,
    input.programCode,
    input.programName,
    input.organizerCode,
    input.organizerName,
    input.examName,
    input.examType,
  ]
    .map(normalizeTemplateToken)
    .filter(Boolean);

  if (tokens.some((value) => value.includes('VEPT') || value.includes('VSTEP') || value.includes('VERSANT'))) {
    return 'vept';
  }

  if (
    tokens.some(
      (value) =>
        value.includes('PTIT') ||
        value.includes('TIN HOC') ||
        value.includes('TINHOC') ||
        value.includes('CNTT') ||
        value.includes('TH-')
    )
  ) {
    return 'ptit';
  }

  return null;
}

function formatDateTimeVN(value: any) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatDateVN(value);
  }
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
  const title3 = toUpperVi(examInfo.exam_name || 'DANH SÁCH DỰ THI');
  const examDateLine = formatExamDateLine(examInfo.exam_date);
  const organizerLine = `Hội đồng thi: ${toUpperVi(examInfo.organizer_name || examInfo.location || 'Chưa xác định')}`;
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
    ensureWorksheetCell(worksheet, `D${row}`, toUpperVi([student.ho, student.ten_dem].filter(Boolean).join(' ')));
    ensureWorksheetCell(worksheet, `E${row}`, toUpperVi(student.ten || ''));
    ensureWorksheetCell(worksheet, `F${row}`, formatDateVN(student.ngay_sinh));
    ensureWorksheetCell(worksheet, `G${row}`, cleanStudentPlace(student.noi_sinh));
    ensureWorksheetCell(worksheet, `H${row}`, normalizeGenderLabel(student.gioi_tinh));
    ensureWorksheetCell(worksheet, `I${row}`, toUpperVi(student.dan_toc || ''));
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
  ensureWorksheetCell(worksheet, 'A2', `Tên Đơn vị/ Trường học đăng ký: ${toUpperVi(examInfo.organizer_name || '')}`);
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
    ensureWorksheetCell(worksheet, `B${row}`, toUpperVi([student.ho, student.ten_dem].filter(Boolean).join(' ')));
    ensureWorksheetCell(worksheet, `C${row}`, toUpperVi(student.ten || ''));
    ensureWorksheetCell(worksheet, `D${row}`, normalizeGenderLabel(student.gioi_tinh));
    ensureWorksheetCell(worksheet, `E${row}`, day, day === '' ? 's' : 'n');
    ensureWorksheetCell(worksheet, `F${row}`, month, month === '' ? 's' : 'n');
    ensureWorksheetCell(worksheet, `G${row}`, year, year === '' ? 's' : 'n');
    ensureWorksheetCell(worksheet, `H${row}`, student.cccd || '');
    ensureWorksheetCell(worksheet, `I${row}`, student.sdt || '');
    ensureWorksheetCell(worksheet, `J${row}`, normalizeEmail(student.email || ''));
    ensureWorksheetCell(worksheet, `K${row}`, cleanStudentWorkplace(student.don_vi_cong_tac));
    ensureWorksheetCell(worksheet, `L${row}`, toUpperVi(student.nganh_dang_hoc || ''));
    ensureWorksheetCell(worksheet, `M${row}`, toUpperVi(examInfo.exam_level || ''));
    ensureWorksheetCell(worksheet, `N${row}`, formatDateVN(examInfo.exam_date));
    ensureWorksheetCell(worksheet, `T${row}`, toUpperVi(examInfo.location || ''));

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

function buildVanTrangFullTitle(examInfo: any) {
  const examName = toUpperVi(examInfo?.exam_name || '');
  if (!examName) return 'DANH SÁCH THÍ SINH';
  return `DANH SÁCH THÍ SINH - ${examName}`;
}

function getVanTrangFullColumns() {
  return [
    { header: 'STT', width: 6, value: (_s: any, index: number) => index + 1, center: true },
    { header: 'Họ', width: 18, value: (s: any) => toUpperVi(s.ho || '') },
    { header: 'Tên đệm', width: 18, value: (s: any) => toUpperVi(s.ten_dem || '') },
    { header: 'Tên', width: 12, value: (s: any) => toUpperVi(s.ten || '') },
    { header: 'Họ và tên', width: 24, value: (s: any) => toUpperVi(s.ho_ten_full || [s.ho, s.ten_dem, s.ten].filter(Boolean).join(' ')) },
    { header: 'Ngày sinh', width: 14, value: (s: any) => formatDateVN(s.ngay_sinh), center: true },
    { header: 'Giới tính', width: 10, value: (s: any) => normalizeGenderLabel(s.gioi_tinh), center: true },
    { header: 'Dân tộc', width: 12, value: (s: any) => toUpperVi(s.dan_toc || ''), center: true },
    { header: 'CCCD', width: 18, value: (s: any) => s.cccd || '', center: true },
    { header: 'Ngày cấp CCCD', width: 14, value: (s: any) => formatDateVN(s.ngay_cap_cccd), center: true },
    { header: 'SĐT', width: 14, value: (s: any) => s.sdt || '', center: true },
    { header: 'Email', width: 26, value: (s: any) => normalizeEmail(s.email || '') },
    { header: 'Nơi sinh', width: 20, value: (s: any) => cleanStudentPlace(s.noi_sinh) },
    { header: 'Địa chỉ', width: 34, value: (s: any) => cleanStudentAddress(s.dia_chi) },
    { header: 'Đơn vị công tác', width: 24, value: (s: any) => cleanStudentWorkplace(s.don_vi_cong_tac) },
    { header: 'Khoa/ngành đang theo học', width: 24, value: (s: any) => toUpperVi(s.nganh_dang_hoc || '') },
  ];
}

function writeVanTrangFullExamListTemplate(
  worksheet: XLSX.WorkSheet,
  examInfo: any,
  students: any[],
) {
  const titleStyle = {
    font: { name: 'Times New Roman', bold: true, sz: 14, color: { rgb: '1F4E78' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'E7F3FF' } },
  };
  const infoStyle = {
    font: { name: 'Times New Roman', sz: 11, italic: true },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  };
  const headerStyle = {
    font: { name: 'Times New Roman', bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: '2F75B5' } },
    border: {
      top: { style: 'thin', color: { rgb: 'FFFFFF' } },
      bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
      left: { style: 'thin', color: { rgb: 'FFFFFF' } },
      right: { style: 'thin', color: { rgb: 'FFFFFF' } },
    },
  };
  const dataStyle = {
    font: { name: 'Times New Roman', sz: 11 },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'D9D9D9' } },
      bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
      left: { style: 'thin', color: { rgb: 'D9D9D9' } },
      right: { style: 'thin', color: { rgb: 'D9D9D9' } },
    },
  };
  const dataCenterStyle = {
    ...dataStyle,
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  };

  const fullColumns = getVanTrangFullColumns();

  const examDate = formatDateVN(examInfo.exam_date);
  const examTime = (() => {
    const date = new Date(examInfo.exam_date);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  })();

  ensureWorksheetCell(worksheet, 'A1', buildVanTrangFullTitle(examInfo));
  ensureWorksheetCell(worksheet, 'A2', `Kỳ thi: ${examInfo.exam_name || ''}`);
  ensureWorksheetCell(worksheet, 'A3', `Ngày thi: ${examDate}${examTime ? ` • ${examTime}` : ''}`);
  ensureWorksheetCell(worksheet, 'A4', `Địa điểm: ${examInfo.location || 'Chưa xác định'}`);
  ensureWorksheetCell(worksheet, 'A5', `Tổng thí sinh đã duyệt: ${students.length}`);

  applyCellStyle(worksheet, 'A1', titleStyle);
  applyCellStyle(worksheet, 'A2', infoStyle);
  applyCellStyle(worksheet, 'A3', infoStyle);
  applyCellStyle(worksheet, 'A4', infoStyle);
  applyCellStyle(worksheet, 'A5', infoStyle);

  const headerRow = 6;
  fullColumns.forEach((column, index) => {
    const address = `${XLSX.utils.encode_col(index)}${headerRow}`;
    ensureWorksheetCell(worksheet, address, column.header);
    applyCellStyle(worksheet, address, headerStyle);
  });

  students.forEach((student, index) => {
    const row = headerRow + 1 + index;
    fullColumns.forEach((column, colIndex) => {
      const value = column.value(student, index);
      const address = `${XLSX.utils.encode_col(colIndex)}${row}`;
      ensureWorksheetCell(worksheet, address, value, typeof value === 'number' ? 'n' : 's');
      applyCellStyle(worksheet, address, column.center ? dataCenterStyle : dataStyle);
    });
  });

  const lastCol = XLSX.utils.encode_col(fullColumns.length - 1);
  setWorksheetMerges(worksheet, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: fullColumns.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: fullColumns.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: fullColumns.length - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: fullColumns.length - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: fullColumns.length - 1 } },
  ]);
  setWorksheetColumns(worksheet, fullColumns.map((column) => ({ wch: column.width })));
  setWorksheetRows(worksheet, [
    { hpt: 26 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 24 },
    ...students.map(() => ({ hpt: 20 })),
  ]);
  setWorksheetFreeze(worksheet, {
    xSplit: 0,
    ySplit: headerRow,
    topLeftCell: `A${headerRow + 1}`,
    activePane: 'bottomLeft',
    state: 'frozen',
  });
  worksheet['!autofilter'] = { ref: `A${headerRow}:${lastCol}${headerRow}` };
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
      else if (field === 'ho_ten') value = toUpperVi(student.ho_ten_full || [student.ho, student.ten_dem, student.ten].filter(Boolean).join(' '));
      else if (field === 'ngay_sinh') value = formatDateVN(student.ngay_sinh);
      else if (field === 'ma_sv') value = student.cccd || student.id || '';
      else if (field === 'ho_so') value = '';
      else value = getStudentExportValue(student, field);

      ensureWorksheetCell(worksheet, cellAddress, value, typeof value === 'number' ? 'n' : 's');
    });
  });

  return true;
}

type ResolvedExamListTemplateName = 'ptit' | 'vept' | 'vantrang_full';

function sortStudentsForExamList(students: any[]) {
  students.sort((a: any, b: any) => {
    const aTen = normalizeWhitespace(a.ten);
    const bTen = normalizeWhitespace(b.ten);
    const cmpTen = aTen.localeCompare(bTen, 'vi', { sensitivity: 'base' });
    if (cmpTen !== 0) return cmpTen;

    const aHo = normalizeWhitespace(a.ho);
    const bHo = normalizeWhitespace(b.ho);
    const cmpHo = aHo.localeCompare(bHo, 'vi', { sensitivity: 'base' });
    if (cmpHo !== 0) return cmpHo;

    const aTenDem = normalizeWhitespace(a.ten_dem);
    const bTenDem = normalizeWhitespace(b.ten_dem);
    const cmpTenDem = aTenDem.localeCompare(bTenDem, 'vi', { sensitivity: 'base' });
    if (cmpTenDem !== 0) return cmpTenDem;

    const aKey = normalizeWhitespace(a.cccd || a.id || '');
    const bKey = normalizeWhitespace(b.cccd || b.id || '');
    return aKey.localeCompare(bKey, 'vi', { sensitivity: 'base' });
  });
}

async function loadExamListExportContext(
  db: any,
  examId: number,
  scope: ExamRegistrationExportScope = 'approved',
) {
  const examInfo = await db.prepare(
    `
      SELECT
        e.*,
        org.name as organizer_name,
        org.code as organizer_code,
        p.name as program_name,
        p.code as program_code,
        t.name as template_name,
        t.display_name as template_display_name
      FROM exam_schedules e
      LEFT JOIN program_organizers org ON org.uuid = e.organizer_uuid
      LEFT JOIN programs p ON p.uuid = e.program_uuid
      LEFT JOIN excel_templates t ON t.id = e.template_id
      WHERE e.id = ?
    `
  ).bind(examId).first() as any;

  if (!examInfo) return null;

  const students = normalizeStudentsForExport(await getExamRegistrationsForExport(db, examId, scope) as any[]);
  sortStudentsForExamList(students);

  const resolvedTemplateName = (detectExamListTemplateName({
    templateName: examInfo.template_name,
    templateDisplayName: examInfo.template_display_name,
    organizerCode: examInfo.organizer_code,
    organizerName: examInfo.organizer_name,
    programCode: examInfo.program_code,
    programName: examInfo.program_name,
    examName: examInfo.exam_name,
    examType: examInfo.exam_type,
  }) || 'ptit') as ResolvedExamListTemplateName;

  return {
    examInfo,
    students,
    scope,
    scopeLabel: EXAM_EXPORT_SCOPE_LABELS[scope],
    resolvedTemplateName,
  };
}

function buildVeptExamListPreview(examInfo: any, students: any[]) {
  return {
    kind: 'vept',
    formatLabel: 'VEPT / VSTEP',
    sheetTitle: 'DANH SÁCH ĐĂNG KÝ THI VERSANT ENGLISH PLACEMENT TEST (VEPT)',
    organizationLine: `Tên Đơn vị/ Trường học đăng ký: ${toUpperVi(examInfo.organizer_name || '')}`,
    representativeLine: 'Đại diện đăng ký:',
    phoneLine: 'Số điện thoại:',
    centerLine: 'Phần dành cho trung tâm',
    leftHeaders: [
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
    ],
    rightHeaders: ['Kiểm tra hồ sơ dự thi', 'Ngày thi', 'Giờ thi', 'Địa điểm thi'],
    rows: students.map((student: any, index: number) => {
      const birthDate = getDateParts(student.ngay_sinh);
      return [
        index + 1,
        toUpperVi([student.ho, student.ten_dem].filter(Boolean).join(' ')),
        toUpperVi(student.ten || ''),
        normalizeGenderLabel(student.gioi_tinh),
        birthDate.day || '',
        birthDate.month || '',
        birthDate.year || '',
        student.cccd || '',
        student.sdt || '',
        normalizeEmail(student.email || ''),
        cleanStudentWorkplace(student.don_vi_cong_tac),
        toUpperVi(student.nganh_dang_hoc || ''),
        toUpperVi(examInfo.exam_level || ''),
        formatDateVN(examInfo.exam_date),
        '',
        '',
        '',
        '',
        '',
        toUpperVi(examInfo.location || ''),
      ];
    }),
  };
}

function buildPtitExamListPreview(examInfo: any, students: any[]) {
  return {
    kind: 'exam-list',
    formatLabel: 'PTIT / Tin học',
    titleLines: [
      'CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO',
      'THEO THÔNG TƯ 03/2014/TT-BTTTT',
      toUpperVi(examInfo.exam_name || 'DANH SÁCH DỰ THI'),
    ],
    infoLines: [
      formatExamDateLine(examInfo.exam_date),
      `Hội đồng thi: ${toUpperVi(examInfo.organizer_name || examInfo.location || 'Chưa xác định')}`,
    ],
    headers: ['STT', 'SỐ PHÁCH', 'SỐ CMT', 'HỌ', 'TÊN', 'NGÀY SINH', 'NƠI SINH', 'GIỚI TÍNH', 'DÂN TỘC', 'MÔN THI', '', 'KÝ TÊN', 'GHI CHÚ'],
    subHeaders: ['LT', 'TH'],
    rows: students.map((student: any, index: number) => [
      index + 1,
      '',
      student.cccd || '',
      toUpperVi([student.ho, student.ten_dem].filter(Boolean).join(' ')),
      toUpperVi(student.ten || ''),
      formatDateVN(student.ngay_sinh),
      cleanStudentPlace(student.noi_sinh),
      normalizeGenderLabel(student.gioi_tinh),
      toUpperVi(student.dan_toc || ''),
      '',
      '',
      '',
      '',
    ]),
  };
}

function buildVanTrangFullExamListPreview(
  examInfo: any,
  students: any[],
  scopeLabel: string,
) {
  const columns = getVanTrangFullColumns();
  const examDate = formatDateVN(examInfo.exam_date);
  const examTime = (() => {
    const date = new Date(examInfo.exam_date);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  })();

  return {
    kind: 'vantrang_full',
    formatLabel: 'VanTrang Full thông tin',
    sheetTitle: buildVanTrangFullTitle(examInfo),
    infoLines: [
      `Kỳ thi: ${examInfo.exam_name || ''}`,
      `Ngày thi: ${examDate}${examTime ? ` • ${examTime}` : ''}`,
      `Địa điểm: ${examInfo.location || 'Chưa xác định'}`,
      `Tổng thí sinh (${scopeLabel}): ${students.length}`,
    ],
    headers: columns.map((column) => column.header),
    centerColumnIndexes: columns
      .map((column, index) => (column.center ? index : -1))
      .filter((index) => index >= 0),
    rows: students.map((student: any, index: number) => columns.map((column: any) => column.value(student, index))),
  };
}

function buildExamListPreviewData(
  examInfo: any,
  students: any[],
  resolvedTemplateName: ResolvedExamListTemplateName,
  scopeLabel: string,
) {
  if (resolvedTemplateName === 'vept') {
    return buildVeptExamListPreview(examInfo, students);
  }

  if (resolvedTemplateName === 'vantrang_full') {
    return buildVanTrangFullExamListPreview(examInfo, students, scopeLabel);
  }

  return buildPtitExamListPreview(examInfo, students);
}

// ========================================
// GET /export/students - Xuất Excel danh sách học viên theo bộ lọc hiện tại
// ========================================
exportRoute.get('/students', requireAdmin, async (c) => {
  try {
    const url = new URL(c.req.url);
    const filters = {
      q: url.searchParams.get('q') || undefined,
      status: url.searchParams.get('status') || undefined,
      registration_type: url.searchParams.get('registration_type') || undefined,
      has_certificate: url.searchParams.get('has_certificate') || undefined,
      created_from: url.searchParams.get('created_from') || undefined,
      created_to: url.searchParams.get('created_to') || undefined,
      sort_by: url.searchParams.get('sort_by') || 'created_at',
      sort_dir: url.searchParams.get('sort_dir') || 'desc',
    };
    const students = normalizeStudentsForExport(
      excludeTestStudents(await StudentRepo.getAllStudents(c.env.DB, null, 0, filters))
    );

    const headers = [
      'Họ tên', 'CCCD', 'Ngày sinh', 'Giới tính', 'Email', 'SĐT', 'Nơi sinh',
      'Địa chỉ', 'Đơn vị công tác', 'Lớp học', 'Lịch thi', 'Trạng thái chính', 'Ngày tạo'
    ];
    const rows = students.map((student: any) => [
      student.ho_ten_full || [student.ho, student.ten_dem, student.ten].filter(Boolean).join(' '),
      student.cccd || '',
      formatDateVN(student.ngay_sinh),
      normalizeGenderLabel(student.gioi_tinh),
      normalizeEmail(student.email),
      student.sdt || '',
      cleanStudentPlace(student.noi_sinh),
      cleanStudentAddress(student.dia_chi),
      cleanStudentWorkplace(student.don_vi_cong_tac),
      Number(student.study_count || 0),
      Number(student.exam_count || 0),
      student.primary_status || 'new',
      formatDateVN(student.created_at),
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = [
      { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 30 }, { wch: 15 },
      { wch: 24 }, { wch: 46 }, { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
    ];

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '', t: 's' };
        worksheet[cellAddress].s = row === 0
          ? { font: { name: 'Times New Roman', sz: 11, bold: true }, border: borderStyle, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, fill: { fgColor: { rgb: 'E2EFDA' } } }
          : { font: { name: 'Times New Roman', sz: 11 }, border: borderStyle, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hoc vien');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Danh-sach-hoc-vien-${new Date().toISOString().split('T')[0]}.xlsx`;
    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': buildAttachmentDisposition(filename),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Students export error:', error);
    return errorResponse('Lỗi xuất danh sách học viên: ' + error.message, 500);
  }
});

// ========================================
// GET /export/class/:class_id - Xuất Excel danh sách theo form chuẩn
// ========================================
exportRoute.get('/class/:class_id', requireAdmin, async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));
    if (isNaN(classId)) return errorResponse('class_id không hợp lệ', 400);

    // 1. Lấy thông tin lớp
    const classInfo = await getClassById(c.env.DB, classId) as any;
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    // 2. Lấy danh sách đăng ký
    const registrations = normalizeStudentsForExport(
      excludeTestStudents(await getRegistrationsByClass(c.env.DB, classId))
    );

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
      const hoVaTenDem = toUpperVi((reg.ho || '') + (reg.ten_dem ? ' ' + reg.ten_dem : ''));
      return [
        hoVaTenDem,
        toUpperVi(reg.ten || ''),
        formatDateVN(reg.ngay_sinh),
        normalizeGenderLabel(reg.gioi_tinh),
        toUpperVi(reg.dan_toc || 'KINH'),
        reg.sdt || '',
        normalizeEmail(reg.email || ''),
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
exportRoute.get('/class/:class_id/json', requireAdmin, async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));
    if (isNaN(classId)) return errorResponse('class_id không hợp lệ', 400);

    const classInfo = await getClassById(c.env.DB, classId) as any;
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    const registrations = normalizeStudentsForExport(
      excludeTestStudents(await getRegistrationsByClass(c.env.DB, classId))
    );

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
exportRoute.get('/class/:class_id/csv', requireAdmin, async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));
    if (isNaN(classId)) return errorResponse('class_id không hợp lệ', 400);
    const classInfo = await getClassById(c.env.DB, classId) as any;
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    const registrations = normalizeStudentsForExport(
      excludeTestStudents(await getRegistrationsByClass(c.env.DB, classId))
    );

    // Convert to CSV
    const headers = ['STT', 'Số phách', 'Số CMT', 'Họ', 'Tên', 'Ngày sinh', 'Nơi sinh', 'Giới tính', 'Email', 'SĐT', 'Địa chỉ', 'Trạng thái', 'Nộp phí'];
    const csvRows = registrations.map((reg, index) => {
      const nopPhi = (reg.payment_status === 'confirmed' || reg.payment_status === 'paid') ? 'ĐÃ NỘP' : 'CHƯA NỘP';
      const statusMap = {
        'pending': 'CHỜ DUYỆT',
        'approved': 'ĐÃ DUYỆT',
        'studying': 'ĐANG HỌC',
        'completed': 'HOÀN THÀNH',
        'certified': 'ĐÃ CẤP CHỨNG CHỈ',
        'cancelled': 'ĐÃ HỦY'
      };
      const trangThai = statusMap[reg.status as keyof typeof statusMap] || toUpperVi(reg.status || '');

      return [
        index + 1,
        reg.so_phach || '',
        reg.cccd || '',
        toUpperVi((reg.ho || '') + (reg.ten_dem ? ' ' + reg.ten_dem : '')),
        toUpperVi(reg.ten || ''),
        formatDateVN(reg.ngay_sinh),
        cleanStudentPlace(reg.noi_sinh),
        normalizeGenderLabel(reg.gioi_tinh),
        normalizeEmail(reg.email || ''),
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
exportRoute.get('/exam/:exam_id', requireAdmin, async (c) => {
  try {
    const examId = parseInt(c.req.param('exam_id'));
    if (isNaN(examId)) return errorResponse('exam_id không hợp lệ', 400);

    // 1. Lấy thông tin kỳ thi
    const examInfo = await c.env.DB.prepare(
      'SELECT * FROM exam_schedules WHERE id = ?'
    ).bind(examId).first() as any;

    if (!examInfo) {
      return errorResponse('Kỳ thi không tồn tại', 404);
    }

    // 2. Lấy đúng danh sách đã duyệt như màn hình admin (/exam-schedules/:id/students)
    const students = normalizeStudentsForExport(await getExamRegistrations(c.env.DB, examId) as any[]);

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
      const hoVaTenDem = toUpperVi((s.ho || '') + (s.ten_dem ? ' ' + s.ten_dem : ''));
      return [
        hoVaTenDem,
        toUpperVi(s.ten || ''),
        formatDateVN(s.ngay_sinh),
        normalizeGenderLabel(s.gioi_tinh),
        toUpperVi(s.dan_toc || 'KINH'),
        s.sdt || '',
        normalizeEmail(s.email || ''),
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
exportRoute.get('/exam/:exam_id/exam-list', requireAdmin, async (c) => {
  try {
    const examId = parseInt(c.req.param('exam_id'));
    if (isNaN(examId)) return errorResponse('exam_id không hợp lệ', 400);
    const scope = resolveExamExportScope(c.req.query('scope'));
    if (!scope) {
      return errorResponse('Phạm vi export không hợp lệ', 400);
    }

    const context = await loadExamListExportContext(c.env.DB, examId, scope);
    if (!context) {
      return errorResponse('Kỳ thi không tồn tại', 404);
    }
    const { examInfo, students, resolvedTemplateName } = context;

    // Export theo template đã lưu; nếu thiếu template thì fallback bằng rule nhận diện
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    if (resolvedTemplateName === 'vept') {
      writeVeptExamListTemplate(worksheet, examInfo, students, 5);
    } else if (resolvedTemplateName === 'vantrang_full') {
      writeVanTrangFullExamListTemplate(worksheet, examInfo, students);
    } else {
      writePtitExamListTemplate(worksheet, examInfo, students, 9);
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

// ========================================
// GET /export/exam/:exam_id/exam-list/preview - Preview dữ liệu Excel từ backend (single source of truth)
// ========================================
exportRoute.get('/exam/:exam_id/exam-list/preview', requireAdmin, async (c) => {
  try {
    const examId = parseInt(c.req.param('exam_id'));
    if (isNaN(examId)) return errorResponse('exam_id không hợp lệ', 400);
    const scope = resolveExamExportScope(c.req.query('scope'));
    if (!scope) {
      return errorResponse('Phạm vi export không hợp lệ', 400);
    }

    const context = await loadExamListExportContext(c.env.DB, examId, scope);

    if (!context) {
      return errorResponse('Kỳ thi không tồn tại', 404);
    }

    const preview = buildExamListPreviewData(
      context.examInfo,
      context.students,
      context.resolvedTemplateName,
      context.scopeLabel,
    );

    return c.json({
      success: true,
      data: {
        ...preview,
        scope: context.scope,
        scopeLabel: context.scopeLabel,
        totalStudents: context.students.length,
      },
    });
  } catch (error: any) {
    console.error('Export exam list preview error:', error);
    return errorResponse('Lỗi preview danh sách dự thi: ' + error.message, 500);
  }
});


export default exportRoute;
