type RawCCCDExtraction = {
  cccd?: string;
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  ethnicity?: string;
  nationality?: string;
  place_of_origin?: string;
  place_of_residence?: string;
  issue_date?: string;
};

export type CCCDFieldConfidence = {
  cccd: number;
  fullName: number;
  dateOfBirth: number;
  gender: number;
  ethnicity: number;
  nationality: number;
  placeOfOrigin: number;
  placeOfResidence: number;
  issueDate: number;
};

export type CCCDExtractionResult = {
  cccd: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  ethnicity: string;
  nationality: string;
  placeOfOrigin: string;
  placeOfResidence: string;
  issueDate: string;
  confidence?: CCCDFieldConfidence;
};

function emptyConfidence(): CCCDFieldConfidence {
  return {
    cccd: 0,
    fullName: 0,
    dateOfBirth: 0,
    gender: 0,
    ethnicity: 0,
    nationality: 0,
    placeOfOrigin: 0,
    placeOfResidence: 0,
    issueDate: 0,
  };
}

function emptyExtraction(): CCCDExtractionResult {
  return {
    cccd: '',
    fullName: '',
    dateOfBirth: '',
    gender: '',
    ethnicity: '',
    nationality: '',
    placeOfOrigin: '',
    placeOfResidence: '',
    issueDate: '',
    confidence: emptyConfidence(),
  };
}

function nfc(value: string): string {
  try {
    return value.normalize('NFC');
  } catch {
    return value;
  }
}

function normalizeSpaces(value: string): string {
  return nfc(value).replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
}

function fixDigitConfusables(value: string): string {
  return value
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Bb](?=\d|$)/g, '8')
    .replace(/[Ss](?=\d|$)/g, '5')
    .replace(/[Zz](?=\d|$)/g, '2');
}

const VN_PROVINCE_PREFIXES = new Set([
  '001', '002', '004', '006', '008', '010', '011', '012', '014', '015', '017', '019', '020', '022', '024',
  '025', '026', '027', '030', '031', '033', '034', '035', '036', '037', '038', '040', '042', '044', '045',
  '046', '048', '049', '051', '052', '054', '056', '058', '060', '062', '064', '066', '067', '068', '070',
  '072', '074', '075', '077', '079', '080', '082', '083', '084', '086', '087', '089', '091', '092', '093',
  '094', '095', '096',
]);

function extractCCCDFromText(text: string): { value: string; confidence: number } {
  const cleaned = fixDigitConfusables(text);
  const candidates = cleaned.match(/\b[\d\s.\-]{12,18}\b/g) ?? [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/[^\d]/g, '');
    if (digits.length === 12) {
      const prefix = digits.slice(0, 3);
      const confidence = VN_PROVINCE_PREFIXES.has(prefix) ? 1 : 0.6;
      return { value: digits, confidence };
    }
  }
  return { value: '', confidence: 0 };
}

function normalizeDate(value: string): { value: string; confidence: number } {
  if (!value) return { value: '', confidence: 0 };
  const fixed = fixDigitConfusables(value);
  const match = fixed.match(/(\d{1,2})\s*[/.\-\s]\s*(\d{1,2})\s*[/.\-\s]\s*(\d{2,4})/);
  if (!match) {
    const digits = fixed.replace(/[^\d]/g, '');
    if (digits.length === 8) {
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      return validateDate(dd, mm, yyyy);
    }
    return { value: normalizeSpaces(value), confidence: 0.3 };
  }
  let dd = match[1].padStart(2, '0');
  let mm = match[2].padStart(2, '0');
  let yyyy = match[3];
  if (yyyy.length === 2) {
    const num = parseInt(yyyy, 10);
    yyyy = num > 30 ? `19${yyyy}` : `20${yyyy}`;
  }
  return validateDate(dd, mm, yyyy);
}

function validateDate(dd: string, mm: string, yyyy: string): { value: string; confidence: number } {
  const d = parseInt(dd, 10);
  const m = parseInt(mm, 10);
  const y = parseInt(yyyy, 10);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
    return { value: `${dd}/${mm}/${yyyy}`, confidence: 0.4 };
  }
  return { value: `${dd}/${mm}/${yyyy}`, confidence: 1 };
}

function normalizeGender(value: string): { value: string; confidence: number } {
  const normalized = nfc(value).toLowerCase().trim();
  if (!normalized) return { value: '', confidence: 0 };
  if (/n[ữu]\b|female|^f$/.test(normalized)) return { value: 'Nữ', confidence: 1 };
  if (/\bnam\b|male|^m$/.test(normalized)) return { value: 'Nam', confidence: 1 };
  return { value: normalizeSpaces(value), confidence: 0.3 };
}

export function normalizeFullName(value: string): { value: string; confidence: number } {
  const cleaned = normalizeSpaces(value)
    .replace(/[^\p{L}\s.''\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return { value: '', confidence: 0 };
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length < 2) return { value: cleaned, confidence: 0.4 };
  const titled = parts
    .map(p => p.charAt(0).toLocaleUpperCase('vi-VN') + p.slice(1).toLocaleLowerCase('vi-VN'))
    .join(' ');
  return { value: titled, confidence: parts.length >= 2 && parts.length <= 6 ? 1 : 0.6 };
}

function pickFirstString(payload: unknown): RawCCCDExtraction {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const source = payload as Record<string, unknown>;

  const findField = (keys: string[]): string => {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return nfc(value.trim());
      }
    }
    return '';
  };

  return {
    cccd: findField(['cccd', 'id_number', 'id', 'so_cccd', 'identity', 'identity_number', 'citizen_id', 'number']),
    full_name: findField(['full_name', 'name', 'ho_ten', 'fullName', 'ho_va_ten', 'ten', 'full name']),
    date_of_birth: findField(['date_of_birth', 'dob', 'birth_date', 'ngay_sinh', 'dateOfBirth']),
    gender: findField(['gender', 'sex', 'gioi_tinh', 'gioitinh']),
    ethnicity: findField(['ethnicity', 'dan_toc', 'ethnic']),
    nationality: findField(['nationality', 'quoc_tich', 'country']),
    place_of_origin: findField(['place_of_origin', 'origin', 'que_quan', 'place_of_birth', 'home_town']),
    place_of_residence: findField(['place_of_residence', 'residence', 'noi_thuong_tru', 'address', 'dia_chi', 'current_residence']),
    issue_date: findField(['issue_date', 'issued_date', 'ngay_cap', 'issueDate']),
  };
}

function quoteBareObjectKeys(value: string): string {
  return value.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
}

function sanitizeJsonLikeText(value: string): string {
  return quoteBareObjectKeys(
    value
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, '$1')
  );
}

function tryParseJsonLikeText(text: string): unknown {
  const jsonBlock = extractJsonBlock(text);
  const candidates = [jsonBlock, sanitizeJsonLikeText(jsonBlock)];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // try next
    }
  }

  return null;
}

const NEXT_LINE_LABEL = /^(h[ọo]\s*v[àa]?\s*t[êe]n|full\s*name|h[ọo]\s*t[êe]n)\s*[:：]?\s*$/i;
const STOP_LINE = /(date|sex|gender|nationality|ethnicity|gi[ớo]i\s*t[íi]nh|qu[ốo]c\s*t[ịi]ch|d[âa]n\s*t[ộo]c|ng[àa]y\s*sinh|\d{2}\/\d{2}\/\d{4})/i;

function parseLabeledText(text: string): RawCCCDExtraction {
  const normalized = nfc(text);
  const lines = normalized
    .split('\n')
    .map(line => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {};
  }

  const output: RawCCCDExtraction = {};
  const aliasMap: Array<[keyof RawCCCDExtraction, RegExp]> = [
    ['cccd', /^(cccd|s[ốo]\s*(cccd|cmnd|đ[ịi]nh\s*danh)|id(_|\s)?number|identity(_|\s)?number|citizen(_|\s)?id|no\.?)\s*[:：=\-]\s*(.+)$/i],
    ['full_name', /^(full\s*name|h[ọo]\s*v[àa]?\s*t[êe]n|h[ọo]\s*t[êe]n|name)\s*[:：=\-]\s*(.+)$/i],
    ['date_of_birth', /^(date(_|\s)?of(_|\s)?birth|ng[àa]y\s*(sinh|\,?\s*th[áa]ng\,?\s*n[ăa]m\s*sinh)|dob|birth(_|\s)?date)\s*[:：=\-]\s*(.+)$/i],
    ['gender', /^(gender|gi[ớo]i\s*t[íi]nh|sex)\s*[:：=\-]\s*(.+)$/i],
    ['ethnicity', /^(ethnicity|d[âa]n\s*t[ộo]c|ethnic)\s*[:：=\-]\s*(.+)$/i],
    ['nationality', /^(nationality|qu[ốo]c\s*t[ịi]ch|country)\s*[:：=\-]\s*(.+)$/i],
    ['place_of_origin', /^(place(_|\s)?of(_|\s)?origin|qu[êe]\s*qu[áa]n|origin|home(_|\s)?town)\s*[:：=\-]\s*(.+)$/i],
    ['place_of_residence', /^(place(_|\s)?of(_|\s)?residence|n[ơo]i\s*th[ườu]ng\s*tr[úu]|current\s*residence|address|residence|đ[ịi]a\s*ch[ỉi])\s*[:：=\-]\s*(.+)$/i],
    ['issue_date', /^(issue(_|\s)?date|issued(_|\s)?date|ng[àa]y\s*c[ấa]p)\s*[:：=\-]\s*(.+)$/i],
  ];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!output.full_name && NEXT_LINE_LABEL.test(line)) {
      const next = lines[i + 1];
      if (next && !STOP_LINE.test(next)) {
        output.full_name = next;
      }
    }

    for (const [field, pattern] of aliasMap) {
      const match = line.match(pattern);
      if (!match) {
        continue;
      }

      const rawValue = match[match.length - 1]?.trim() || '';
      if (rawValue && !output[field]) {
        output[field] = rawValue;
      }
      break;
    }
  }

  if (!output.cccd) {
    const found = extractCCCDFromText(normalized);
    if (found.value) output.cccd = found.value;
  }

  return output;
}

export function parseCCCDExtractionPayload(payload: unknown): CCCDExtractionResult {
  const raw = pickFirstString(payload);
  const confidence = emptyConfidence();

  const cccdResult = raw.cccd
    ? extractCCCDFromText(raw.cccd)
    : { value: '', confidence: 0 };
  confidence.cccd = cccdResult.confidence;

  const dobResult = normalizeDate(raw.date_of_birth || '');
  confidence.dateOfBirth = dobResult.confidence;

  const issueResult = normalizeDate(raw.issue_date || '');
  confidence.issueDate = issueResult.confidence;

  const genderResult = normalizeGender(raw.gender || '');
  confidence.gender = genderResult.confidence;

  const nameResult = normalizeFullName(raw.full_name || '');
  confidence.fullName = nameResult.confidence;

  const ethnicity = normalizeSpaces(raw.ethnicity || '');
  if (ethnicity) confidence.ethnicity = 0.8;
  const nationality = normalizeSpaces(raw.nationality || '');
  if (nationality) confidence.nationality = 0.8;
  const placeOfOrigin = normalizeSpaces(raw.place_of_origin || '');
  if (placeOfOrigin) confidence.placeOfOrigin = 0.7;
  const placeOfResidence = normalizeSpaces(raw.place_of_residence || '');
  if (placeOfResidence) confidence.placeOfResidence = 0.7;

  return {
    cccd: cccdResult.value,
    fullName: nameResult.value,
    dateOfBirth: dobResult.value,
    gender: genderResult.value,
    ethnicity,
    nationality,
    placeOfOrigin,
    placeOfResidence,
    issueDate: issueResult.value,
    confidence,
  };
}

export function extractJsonBlock(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function parseCCCDExtraction(text: string): CCCDExtractionResult {
  try {
    const normalized = nfc(text);
    const parsedJson = tryParseJsonLikeText(normalized);
    if (parsedJson) {
      const result = parseCCCDExtractionPayload(parsedJson);
      if (result.cccd || result.fullName || result.dateOfBirth || result.issueDate) {
        return result;
      }
    }

    const labeled = parseLabeledText(normalized);
    if (Object.values(labeled).some(Boolean)) {
      return parseCCCDExtractionPayload(labeled);
    }

    const cccdFound = extractCCCDFromText(normalized);
    if (cccdFound.value) {
      const result = emptyExtraction();
      result.cccd = cccdFound.value;
      if (result.confidence) result.confidence.cccd = cccdFound.confidence;
      return result;
    }

    return emptyExtraction();
  } catch (parseError) {
    console.error('Failed to parse CCCD extraction result:', parseError);
    console.error('Raw text from AI:', text);
    return emptyExtraction();
  }
}
