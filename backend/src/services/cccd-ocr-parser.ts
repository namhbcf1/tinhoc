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
};

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
  };
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
}

function normalizeDate(value: string): string {
  if (!value) return '';
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length !== 8) {
    return normalizeSpaces(value);
  }

  const first = digits.slice(0, 2);
  const second = digits.slice(2, 4);
  const third = digits.slice(4, 8);
  return `${first}/${second}/${third}`;
}

function normalizeGender(value: string): string {
  const normalized = normalizeSpaces(value).toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('nu') || normalized.includes('nữ') || normalized === 'f') {
    return 'Nữ';
  }
  if (normalized.includes('nam') || normalized === 'm') {
    return 'Nam';
  }
  return normalizeSpaces(value);
}

function pickFirstString(payload: unknown): RawCCCDExtraction {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const source = payload as Record<string, unknown>;
  
  // Helper function to find a string field by checking multiple possible keys
  const findField = (keys: string[]): string => {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  };

  return {
    // Try multiple possible field names the AI might return
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
      // Try the next candidate.
    }
  }

  return null;
}

function parseLabeledText(text: string): RawCCCDExtraction {
  const lines = text
    .split('\n')
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {};
  }

  const output: RawCCCDExtraction = {};
  const aliasMap: Array<[keyof RawCCCDExtraction, RegExp]> = [
    ['cccd', /^(cccd|s[ốo]\s*cccd|id(_|\s)?number|identity(_|\s)?number|citizen(_|\s)?id)\s*[:=-]\s*(.+)$/i],
    ['full_name', /^(full\s*name|h[ọo]\s*t[êe]n|name)\s*[:=-]\s*(.+)$/i],
    ['date_of_birth', /^(date(_|\s)?of(_|\s)?birth|ng[àa]y\s*sinh|dob|birth(_|\s)?date)\s*[:=-]\s*(.+)$/i],
    ['gender', /^(gender|gi[ớo]i\s*t[íi]nh|sex)\s*[:=-]\s*(.+)$/i],
    ['ethnicity', /^(ethnicity|d[âa]n\s*t[ộo]c|ethnic)\s*[:=-]\s*(.+)$/i],
    ['nationality', /^(nationality|qu[ốo]c\s*t[ịi]ch|country)\s*[:=-]\s*(.+)$/i],
    ['place_of_origin', /^(place(_|\s)?of(_|\s)?origin|qu[êe]\s*qu[áa]n|origin|home(_|\s)?town)\s*[:=-]\s*(.+)$/i],
    ['place_of_residence', /^(place(_|\s)?of(_|\s)?residence|n[ơo]i\s*th[ườu]ng\s*tr[úu]|current\s*residence|address|residence)\s*[:=-]\s*(.+)$/i],
    ['issue_date', /^(issue(_|\s)?date|issued(_|\s)?date|ng[àa]y\s*c[ấa]p)\s*[:=-]\s*(.+)$/i],
  ];

  for (const line of lines) {
    for (const [field, pattern] of aliasMap) {
      const match = line.match(pattern);
      if (!match) {
        continue;
      }

      const rawValue = match[match.length - 1]?.trim() || '';
      if (rawValue) {
        output[field] = rawValue;
      }
      break;
    }
  }

  return output;
}

export function parseCCCDExtractionPayload(payload: unknown): CCCDExtractionResult {
  const raw = pickFirstString(payload);

  return {
    cccd: (raw.cccd || '').replace(/[^\d]/g, '').slice(0, 12),
    fullName: normalizeSpaces(raw.full_name || ''),
    dateOfBirth: normalizeDate(raw.date_of_birth || ''),
    gender: normalizeGender(raw.gender || ''),
    ethnicity: normalizeSpaces(raw.ethnicity || ''),
    nationality: normalizeSpaces(raw.nationality || ''),
    placeOfOrigin: normalizeSpaces(raw.place_of_origin || ''),
    placeOfResidence: normalizeSpaces(raw.place_of_residence || ''),
    issueDate: normalizeDate(raw.issue_date || ''),
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
    const parsedJson = tryParseJsonLikeText(text);
    if (parsedJson) {
      return parseCCCDExtractionPayload(parsedJson);
    }

    const labeled = parseLabeledText(text);
    if (Object.values(labeled).some(Boolean)) {
      return parseCCCDExtractionPayload(labeled);
    }

    return emptyExtraction();
  } catch (parseError) {
    console.error('Failed to parse CCCD extraction result:', parseError);
    console.error('Raw text from AI:', text);
    return emptyExtraction();
  }
}
