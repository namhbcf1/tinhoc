import XLSX from 'xlsx-js-style';

export interface ImportStudentRow {
  cccd: string;
  ho: string;
  ten_dem: string;
  ten: string;
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  noi_sinh: string;
  dan_toc: string;
  quoc_tich: string;
  email: string;
  sdt: string;
  dia_chi: string;
  don_vi_cong_tac: string;
  ngay_cap_cccd: string | null;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  total_rows: number;
  valid_rows: number;
  created: number;
  skipped: number;
  errors: ImportError[];
  preview: ImportStudentRow[];
}

const COLUMN_ALIASES: Record<string, keyof ImportStudentRow> = {
  'cccd': 'cccd',
  'số cccd': 'cccd',
  'số cccd/cmnd': 'cccd',
  'cccd/cmnd': 'cccd',
  'cmnd': 'cccd',
  'so cccd': 'cccd',
  'ho': 'ho',
  'họ': 'ho',
  'họ và tên': 'ho',
  'họ tên': 'ho',
  'ten_dem': 'ten_dem',
  'tên đệm': 'ten_dem',
  'ten dem': 'ten_dem',
  'tên đệm (nếu có)': 'ten_dem',
  'ten': 'ten',
  'tên': 'ten',
  'ngay_sinh': 'ngay_sinh',
  'ngày sinh': 'ngay_sinh',
  'ngay sinh': 'ngay_sinh',
  'gioi_tinh': 'gioi_tinh',
  'giới tính': 'gioi_tinh',
  'gioi tinh': 'gioi_tinh',
  'noi_sinh': 'noi_sinh',
  'nơi sinh': 'noi_sinh',
  'noi sinh': 'noi_sinh',
  'quê quán': 'noi_sinh',
  'que quan': 'noi_sinh',
  'dan_toc': 'dan_toc',
  'dân tộc': 'dan_toc',
  'dan toc': 'dan_toc',
  'quoc_tich': 'quoc_tich',
  'quốc tịch': 'quoc_tich',
  'quoc tich': 'quoc_tich',
  'sdt': 'sdt',
  'số điện thoại': 'sdt',
  'điện thoại': 'sdt',
  'dien thoai': 'sdt',
  'phone': 'sdt',
  'đt': 'sdt',
  'email': 'email',
  'e-mail': 'email',
  'dia_chi': 'dia_chi',
  'địa chỉ': 'dia_chi',
  'dia chi': 'dia_chi',
  'don_vi_cong_tac': 'don_vi_cong_tac',
  'đơn vị công tác': 'don_vi_cong_tac',
  'nơi công tác': 'don_vi_cong_tac',
  'công tác': 'don_vi_cong_tac',
  'ngay_cap_cccd': 'ngay_cap_cccd',
  'ngày cấp cccd': 'ngay_cap_cccd',
  'ngày cấp': 'ngay_cap_cccd',
};

const GENDER_MAP: Record<string, string> = {
  'nam': 'Nam',
  'nữ': 'Nữ',
  'nu': 'Nữ',
  'male': 'Nam',
  'female': 'Nữ',
  'm': 'Nam',
  'f': 'Nữ',
};

function normalizeHeader(header: string): string {
  return String(header || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapColumns(headers: string[]): Map<number, keyof ImportStudentRow> {
  const mapping = new Map<number, keyof ImportStudentRow>();
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeHeader(headers[i]);
    const field = COLUMN_ALIASES[normalized];
    if (field) {
      mapping.set(i, field);
    }
  }
  return mapping;
}

function parseDateValue(value: any): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  // Excel serial date number
  if (typeof value === 'number' && value > 25569) {
    const d = new Date((value - 25569) * 86400 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // dd/mm/yyyy
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y.trim()}-${m.trim().padStart(2, '0')}-${d.trim().padStart(2, '0')}`;
    }
  }

  // yyyy-mm-dd
  if (str.includes('-') && str.length >= 8) {
    return str;
  }

  return null;
}

function validateRow(row: ImportStudentRow, rowIndex: number): ImportError[] {
  const errors: ImportError[] = [];

  if (!row.cccd || !/^\d{9,12}$/.test(row.cccd.replace(/\s/g, ''))) {
    errors.push({ row: rowIndex, field: 'cccd', message: 'CCCD phải gồm 9-12 chữ số' });
  }

  if (!row.ho || row.ho.trim().length === 0) {
    errors.push({ row: rowIndex, field: 'ho', message: 'Họ không được để trống' });
  }

  if (!row.ten || row.ten.trim().length === 0) {
    errors.push({ row: rowIndex, field: 'ten', message: 'Tên không được để trống' });
  }

  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push({ row: rowIndex, field: 'email', message: 'Email không hợp lệ' });
  }

  if (row.sdt && !/^(0|\+84)\d{9}$/.test(row.sdt.replace(/\s/g, ''))) {
    errors.push({ row: rowIndex, field: 'sdt', message: 'SĐT không hợp lệ' });
  }

  if (row.ngay_sinh) {
    const parsed = parseDateValue(row.ngay_sinh);
    if (!parsed) {
      errors.push({ row: rowIndex, field: 'ngay_sinh', message: 'Ngày sinh không hợp lệ (cần dd/mm/yyyy hoặc yyyy-mm-dd)' });
    }
  }

  return errors;
}

export function parseExcelFile(buffer: ArrayBuffer): { headers: string[]; rows: any[][] } {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('File Excel không có sheet nào');

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

  if (data.length < 2) throw new Error('File Excel phải có ít nhất 1 header + 1 dòng dữ liệu');

  return {
    headers: data[0].map((h: any) => String(h || '')),
    rows: data.slice(1),
  };
}

export function parseAndValidateStudents(buffer: ArrayBuffer): ImportResult {
  const { headers, rows } = parseExcelFile(buffer);
  const columnMap = mapColumns(headers);

  if (columnMap.size === 0) {
    throw new Error('Không tìm thấy cột nào khớp. Cần ít nhất cột: CCCD, Họ, Tên');
  }

  const result: ImportResult = {
    total_rows: rows.length,
    valid_rows: 0,
    created: 0,
    skipped: 0,
    errors: [],
    preview: [],
  };

  const seenCccd = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNum = i + 2; // Excel row (1-indexed, +1 for header)

    // Skip empty rows
    const hasAnyData = rawRow.some((cell: any) => String(cell || '').trim());
    if (!hasAnyData) continue;

    const student: ImportStudentRow = {
      cccd: '',
      ho: '',
      ten_dem: '',
      ten: '',
      ngay_sinh: null,
      gioi_tinh: null,
      noi_sinh: '',
      dan_toc: 'KINH',
      quoc_tich: 'VIỆT NAM',
      email: '',
      sdt: '',
      dia_chi: '',
      don_vi_cong_tac: '',
      ngay_cap_cccd: null,
    };

    for (const [colIdx, field] of columnMap) {
      const value = rawRow[colIdx];
      const strValue = String(value ?? '').trim();

      if (field === 'ngay_sinh' || field === 'ngay_cap_cccd') {
        (student as any)[field] = parseDateValue(value);
      } else if (field === 'gioi_tinh') {
        const normalized = strValue.toLowerCase();
        student.gioi_tinh = GENDER_MAP[normalized] || strValue || null;
      } else {
        (student as any)[field] = strValue;
      }
    }

    // Normalize CCCD
    student.cccd = student.cccd.replace(/\s/g, '');

    // Validate
    const rowErrors = validateRow(student, rowNum);
    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors);
      continue;
    }

    // Check duplicate within file
    if (seenCccd.has(student.cccd)) {
      result.errors.push({ row: rowNum, field: 'cccd', message: `CCCD ${student.cccd} bị trùng trong file` });
      continue;
    }
    seenCccd.add(student.cccd);

    result.valid_rows++;
    result.preview.push(student);
  }

  return result;
}
