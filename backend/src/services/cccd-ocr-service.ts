import type { Env } from '../types/env.js';
import { generateSignedImageURL } from '../utils/cloudflare-images.js';
import { type CCCDExtractionResult } from './cccd-ocr-parser.js';

type CCCDImageType = 'cccd_front' | 'cccd_back';

const OCR_SPACE_API_KEY = 'K81400402488957';
const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';
const OCR_SPACE_MAX_BYTES = 1024 * 1024;
const OCR_SPACE_TIMEOUT_MS = 15000;
const OCR_SPACE_TIMEOUT_ENGINE3_MS = 25000;

interface OCRSpaceResult {
  ParsedResults?: Array<{ ParsedText: string }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
}

type OCRSpaceAttempt = {
  engine: '1' | '2' | '3';
  language: string;
  status: 'pending' | 'success' | 'failed';
  transport?: 'base64' | 'url';
  parseStatus?: 'useful' | 'no_useful_data';
  timeoutMs?: number;
  error?: string;
};

type OCRSpaceInput = {
  imageData: Uint8Array;
  imageUrl: string | null;
};

function uint8ToBase64(data: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < data.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, data.length);
    binary += String.fromCharCode.apply(null, Array.from(data.subarray(i, end)));
  }
  return btoa(binary);
}

async function getImageBytes(env: Env, imageId: string): Promise<Uint8Array> {
  if (imageId.startsWith('cccd-uploads/')) {
    const object = await env.R2.get(imageId);
    if (!object) throw new Error('R2: ảnh không tồn tại - ' + imageId.slice(0, 60));
    return new Uint8Array(await object.arrayBuffer());
  }

  const signedUrl = await generateSignedImageURL(env, imageId, 2);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error('CF Images fetch failed: ' + response.status);
  return new Uint8Array(await response.arrayBuffer());
}

async function buildOCRSpaceImageUrl(env: Env, imageId: string): Promise<string | null> {
  if (!imageId) {
    return null;
  }

  if (imageId.startsWith('cccd-uploads/')) {
    return `https://vantrangedu-api.bangachieu2.workers.dev/cccd-upload/image/${encodeURIComponent(imageId)}`;
  }

  return generateSignedImageURL(env, imageId, 2);
}

async function callOCRSpaceAttempt(input: OCRSpaceInput, attempt: OCRSpaceAttempt): Promise<string> {
  const formData = new FormData();
  if (input.imageData.length > OCR_SPACE_MAX_BYTES) {
    if (!input.imageUrl) {
      throw new Error(`Ảnh quá lớn: ${(input.imageData.length / 1024).toFixed(0)}KB > 1024KB limit`);
    }

    formData.append('url', input.imageUrl);
    attempt.transport = 'url';
  } else {
    const base64 = uint8ToBase64(input.imageData);
    formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
    attempt.transport = 'base64';
  }

  formData.append('language', attempt.language);
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('filetype', 'JPG');
  formData.append('OCREngine', attempt.engine);

  const controller = new AbortController();
  const timeoutMs = attempt.timeoutMs || OCR_SPACE_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(OCR_SPACE_API_URL, {
      method: 'POST',
      headers: { apikey: OCR_SPACE_API_KEY },
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`OCR.space timeout sau ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) throw new Error(`OCR.space HTTP ${response.status}`);

  const result: OCRSpaceResult = await response.json();
  console.log(
    `[OCR] OCR.space raw engine=${attempt.engine} lang=${attempt.language} transport=${attempt.transport}:`,
    JSON.stringify(result).slice(0, 500),
  );

  if (result.IsErroredOnProcessing || result.OCRExitCode !== 1) {
    throw new Error('OCR.space: ' + (result.ErrorMessage?.[0] || 'processing error'));
  }

  const text = result.ParsedResults?.[0]?.ParsedText || '';
  if (!text.trim()) throw new Error('OCR.space: không phát hiện text');
  return text;
}

async function extractWithOCRSpace(
  input: OCRSpaceInput,
  type: CCCDImageType,
  attemptsLog: OCRSpaceAttempt[],
): Promise<{ text: string; parsed: CCCDExtractionResult }> {
  const attempts: OCRSpaceAttempt[] = [
    { engine: '3', language: 'auto', status: 'pending', timeoutMs: OCR_SPACE_TIMEOUT_ENGINE3_MS },
    { engine: '2', language: 'auto', status: 'pending' },
    { engine: '2', language: 'vnm', status: 'pending' },
    { engine: '2', language: 'eng', status: 'pending' },
    { engine: '1', language: 'vnm', status: 'pending' },
    { engine: '1', language: 'eng', status: 'pending' },
  ];

  let lastError: Error | null = null;
  let sawTextWithoutUsefulFields = false;

  for (const attempt of attempts) {
    try {
      const text = await callOCRSpaceAttempt(input, attempt);
      const parsed = parseOCRTextToPrefill(text, type);
      attempt.status = 'success';
      attempt.parseStatus = hasUsefulExtraction(parsed) ? 'useful' : 'no_useful_data';
      attemptsLog.push({ ...attempt });
      console.log('[OCR] Parsed:', JSON.stringify(parsed));

      if (hasUsefulExtraction(parsed)) {
        return { text, parsed };
      }

      sawTextWithoutUsefulFields = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempt.status = 'failed';
      attempt.error = message;
      attemptsLog.push({ ...attempt });
      lastError = error instanceof Error ? error : new Error(message);
      console.warn(
        `[OCR] OCR.space attempt failed engine=${attempt.engine} lang=${attempt.language} transport=${attempt.transport || 'pending'}: ${message}`,
      );
    }
  }

  if (sawTextWithoutUsefulFields) {
    throw new Error('OCR đọc được text nhưng không nhận diện được trường CCCD nào');
  }

  throw lastError || new Error('OCR.space: all attempts failed');
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function foldOCRValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function lineHasAnyFragment(line: string, fragments: string[]): boolean {
  const folded = foldOCRValue(line);
  return fragments.some((fragment) => folded.includes(fragment));
}

function looksLikeFieldLabel(line: string): boolean {
  return lineHasAnyFragment(line, [
    'ho va ten',
    'full name',
    'ngay sinh',
    'date of birth',
    'gioi tinh',
    ' sex',
    'gender',
    'dan toc',
    'ethnicity',
    'quoc tich',
    'nationality',
    'que quan',
    'place of origin',
    'noi thuong tru',
    'place of residence',
    'ngay thang nam',
    'date month year',
    'ngay cap',
    'date of issue',
  ]);
}

function looksLikeNonDataLine(line: string): boolean {
  return lineHasAnyFragment(line, [
    'cong hoa',
    'socialist republic',
    'can cuoc',
    'citizen identity card',
    'dac diem nhan dang',
    'personal identification',
    'director general',
    'cuc truong',
    'idvnm',
    'left index',
    'right index',
  ]);
}

function cleanInlineValue(value: string): string {
  return value.replace(/^[\s:./-]+/, '').replace(/\s+/g, ' ').trim();
}

function cleanPlaceValue(value: string): string {
  return value
    .replace(
      /\b(?:place\s*of\s*ongin|place\s*of\s*origin|place\s*of\s*residence|quê\s*quán|quê\s*quán|que\s*quan|nơi\s*thường\s*trú|noi\s*thuong\s*tru)\b/giu,
      '',
    )
    .replace(/[/:]+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^(?:[,.\-\s])+/, '')
    .trim();
}

function normalizeOCRGenderValue(value: string): string {
  const folded = foldOCRValue(value);
  if (!folded) return '';
  if (folded === 'nam' || folded === 'male' || folded === 'm') return 'Nam';
  if (folded === 'nu' || folded === 'female' || folded === 'f') return 'Nữ';
  if (folded.startsWith('nam')) return 'Nam';
  if (folded.startsWith('nu') || folded.includes('female')) return 'Nữ';
  return '';
}

function extractGenderAndNationalityFromLine(line: string): { gender: string; nationality: string } {
  const afterGenderLabel = line.replace(
    /.*?(?:giới\s*tính\s*\/\s*sex|gioi\s*tinh\s*\/\s*sex|giới\s*tính|gioi\s*tinh|sex|gender)\s*[:\-]?\s*/iu,
    '',
  );

  const parts = afterGenderLabel.split(
    /(?:quốc\s*tịch\s*\/\s*nationality|quoc\s*tich\s*\/\s*nationality|quốc\s*tịch|quoc\s*tich|nationality)\s*[:\-]?\s*/iu,
  );

  const rawGender = cleanInlineValue(parts[0] || '').split(/\s+/)[0] || '';
  const rawNationality = cleanInlineValue(parts.slice(1).join(' '));

  return {
    gender: normalizeOCRGenderValue(rawGender),
    nationality: rawNationality,
  };
}

function normalizeDateParts(day: string, month: string, year: string): string {
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

function extractDateFromText(value: string): string {
  if (!value) return '';

  const normalizedValue = value.replace(/\s+/g, ' ').trim();
  const separatedMatch = normalizedValue.match(/\b(\d{1,2})\s*[\/\-\. ]\s*(\d{1,2})\s*[\/\-\. ]\s*(\d{4})\b/);
  if (separatedMatch) {
    return normalizeDateParts(separatedMatch[1], separatedMatch[2], separatedMatch[3]);
  }

  const compactMatch = normalizedValue.match(/\b(\d{2})(\d{2})(\d{4})\b/);
  if (compactMatch) {
    return normalizeDateParts(compactMatch[1], compactMatch[2], compactMatch[3]);
  }

  return '';
}

function extractDateNearLabels(
  lines: string[],
  labelFragments: string[],
  minYear: number,
  maxYear: number,
): string {
  for (let i = 0; i < lines.length; i += 1) {
    if (!lineHasAnyFragment(lines[i], labelFragments)) {
      continue;
    }

    const candidateParts = [lines[i]];
    if (i + 1 < lines.length && !looksLikeFieldLabel(lines[i + 1]) && !looksLikeNonDataLine(lines[i + 1])) {
      candidateParts.push(lines[i + 1]);
    }

    const extractedDate = extractDateFromText(candidateParts.join(' '));
    if (!extractedDate) continue;

    const year = Number.parseInt(extractedDate.slice(-4), 10);
    if (year >= minYear && year <= maxYear) {
      return extractedDate;
    }
  }

  return '';
}

function extractDateByYearRange(text: string, minYear: number, maxYear: number): string {
  for (const match of text.matchAll(/\b(\d{1,2})\s*[\/\-\. ]\s*(\d{1,2})\s*[\/\-\. ]\s*(\d{4})\b/g)) {
    const year = Number.parseInt(match[3], 10);
    if (year >= minYear && year <= maxYear) {
      return normalizeDateParts(match[1], match[2], match[3]);
    }
  }

  for (const match of text.matchAll(/\b(\d{2})(\d{2})(\d{4})\b/g)) {
    const year = Number.parseInt(match[3], 10);
    if (year >= minYear && year <= maxYear) {
      return normalizeDateParts(match[1], match[2], match[3]);
    }
  }

  return '';
}

function extractLabeledMultilineValue(text: string, labelRegex: RegExp, maxExtraLines = 1): string {
  const lines = splitLines(text);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!labelRegex.test(line)) {
      continue;
    }

    const value = cleanInlineValue(line.replace(labelRegex, ''));
    const extras: string[] = [];

    for (let j = i + 1; j < lines.length && extras.length < maxExtraLines; j += 1) {
      const nextLine = lines[j];
      if (looksLikeFieldLabel(nextLine) || looksLikeNonDataLine(nextLine)) {
        break;
      }
      extras.push(nextLine);
    }

    const parts = [value, ...extras].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ').replace(/\s+,/g, ',').trim();
    }
  }

  return '';
}

function parseOCRTextToPrefill(text: string, type: CCCDImageType): CCCDExtractionResult {
  let cccd = '';
  let fullName = '';
  let dateOfBirth = '';
  let gender = '';
  let ethnicity = '';
  let nationality = '';
  const lines = splitLines(text);

  const placeOfOrigin = extractLabeledMultilineValue(
    text,
    /(?:quê\s*quán\s*\/\s*place\s*of\s*origin|que\s*quan\s*\/\s*place\s*of\s*origin|place\s*of\s*origin|quê\s*quán|que\s*quan)/iu,
    1,
  );

  const placeOfResidence = extractLabeledMultilineValue(
    text,
    /(?:nơi\s*thường\s*trú\s*\/\s*place\s*of\s*residence|noi\s*thuong\s*tru\s*\/\s*place\s*of\s*residence|place\s*of\s*residence|place\s*of\s*residen|nơi\s*thường\s*trú|noi\s*thuong\s*tru|thường\s*trú|thuong\s*tru)/iu,
    1,
  );

  let issueDate = extractDateNearLabels(
    lines,
    ['ngay cap', 'date of issue', 'issued date', 'date month year', 'ngay thang nam'],
    2015,
    2035,
  );

  if (!issueDate && type === 'cccd_back') {
    issueDate = extractDateByYearRange(text, 2015, 2035);
  }

  if (type === 'cccd_front') {
    const cccdMatch = text.match(/\b(\d{12})\b/);
    cccd = cccdMatch ? cccdMatch[1] : '';

    const multilineNamePatterns = [
      /(?:họ[,\s]*(?:chữ\s*đệm\s*)?(?:và\s*)?tên|ho\s*(?:va\s*)?ten|full\s*name)[^\n]*$/iu,
    ];
    for (const pattern of multilineNamePatterns) {
      fullName = extractLabeledMultilineValue(text, pattern, 1);
      if (fullName) break;
    }

    if (!fullName) {
      const namePatterns = [
        /(?:họ[,\s]*(?:chữ\s*đệm\s*)?(?:và\s*)?tên|ho\s*(?:va\s*)?ten|full\s*name)[\s:\/.\-]*([^\n]+)/iu,
        /(?:name|tên|ten)[\s:]*([^\n]+)/iu,
      ];
      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length > 2) {
          fullName = match[1].replace(/\/?\.?\s*full\s*name\s*/iu, '').trim();
          break;
        }
      }
    }

    if (!fullName) {
      for (const line of lines) {
        if (/^\d/.test(line)) continue;
        if (/cccd|cmnd|căn cước|can cuoc|cộng hòa|cong hoa|việt nam|viet nam|socialist|republic|identity/iu.test(line)) continue;
        if (/ngày|ngay|quê|que|nơi|noi|giới|gioi|quốc|quoc|dân|dan|date|place|sex|nation/iu.test(line)) continue;
        if (/^[A-ZÀ-Ỵ][A-Za-zÀ-ỹ]*(?:\s+[A-ZÀ-Ỵ][A-Za-zÀ-ỹ]*){1,5}$/u.test(line)) {
          fullName = line;
          break;
        }
      }
    }

    dateOfBirth = extractDateNearLabels(lines, ['ngay sinh', 'date of birth', 'birth', 'dob'], 1940, 2015);
    if (!dateOfBirth) {
      dateOfBirth = extractDateByYearRange(text, 1940, 2015);
    }

    const genderMatch = text.match(/(?:giới\s*tính|gioi\s*tinh|sex|gender)[\s:\/.\-]*([A-Za-zÀ-ỹ]{1,10})\b/iu);
    const genderMatchTight = text.match(/(?:giới\s*tính\s*\/\s*sex|gioi\s*tinh\s*\/\s*sex|sex|giới\s*tính|gioi\s*tinh|gender)[^A-Za-zÀ-ỹ]{0,10}(Nam|Nữ|Nu|Male|Female)\b/iu);
    const genderValue = genderMatchTight?.[1] || genderMatch?.[1] || '';
    if (genderValue) {
      gender = normalizeOCRGenderValue(genderValue);
    }

    const ethMatch = text.match(/(?:dân\s*tộc|dan\s*toc|ethnicity)[\s:\/.\-]*([^\n,]{1,30})/iu);
    if (!gender || !nationality) {
      const genderLine = lines.find((line) => {
        const folded = foldOCRValue(line);
        return folded.includes('gioi tinh')
          || folded.includes(' sex')
          || folded.startsWith('sex')
          || folded.includes('gender');
      }) || '';

      if (genderLine) {
        const extracted = extractGenderAndNationalityFromLine(genderLine);
        if (!gender && extracted.gender) {
          gender = extracted.gender;
        }
        if (!nationality && extracted.nationality) {
          nationality = extracted.nationality;
        }
      }
    }

    ethnicity = ethMatch ? ethMatch[1].trim() : '';

    const natMatch = text.match(/(?:quốc\s*tịch\s*\/\s*nationality|quoc\s*tich\s*\/\s*nationality|nationality|quốc\s*tịch|quoc\s*tich)[\s:\/.\-]*([^\n,]{1,30})/iu);
    nationality = nationality || (natMatch ? natMatch[1].trim() : '');
  }

  return {
    cccd,
    fullName,
    dateOfBirth,
    gender,
    ethnicity,
    nationality,
    placeOfOrigin: cleanPlaceValue(placeOfOrigin),
    placeOfResidence: cleanPlaceValue(placeOfResidence),
    issueDate,
  };
}

function hasUsefulExtraction(prefill: CCCDExtractionResult): boolean {
  return Boolean(
    prefill.cccd
      || prefill.fullName
      || prefill.dateOfBirth
      || prefill.gender
      || prefill.ethnicity
      || prefill.issueDate
      || prefill.placeOfOrigin
      || prefill.placeOfResidence,
  );
}

export interface OCRDebugInfo {
  imageSize: number;
  ocrSpaceStatus: string;
  ocrSpaceText: string;
  ocrSpaceAttempts: OCRSpaceAttempt[];
}

export interface OCRCandidateInput {
  imageId: string;
  label: string;
  mode?: string | null;
}

export interface OCRArbitrationDebug {
  selectedImageId: string | null;
  selectedMode: string | null;
  selectedLabel: string | null;
  conflictFields: string[];
  candidates: Array<{
    imageId: string;
    label: string;
    mode: string | null;
    success: boolean;
    score: number;
    error?: string;
    prefill?: CCCDExtractionResult;
    debug?: OCRDebugInfo;
  }>;
}

function normalizeCriticalValue(field: keyof CCCDExtractionResult, value: string) {
  if (!value) return '';
  if (field === 'cccd') {
    return value.replace(/\D/g, '');
  }
  if (field === 'dateOfBirth' || field === 'issueDate') {
    return value.replace(/\D/g, '');
  }
  return foldOCRValue(value).replace(/[^a-z0-9 ]/g, '').trim();
}

function scoreCandidatePrefill(prefill: CCCDExtractionResult, type: CCCDImageType) {
  let score = 0;

  if (type === 'cccd_front') {
    if (prefill.cccd) score += 42;
    if (prefill.fullName) score += 26;
    if (prefill.dateOfBirth) score += 22;
    if (prefill.gender) score += 4;
    if (prefill.ethnicity) score += 2;
    if (prefill.placeOfOrigin) score += 2;
    if (prefill.placeOfResidence) score += 2;
  } else {
    if (prefill.issueDate) score += 70;
    if (prefill.placeOfOrigin) score += 5;
    if (prefill.placeOfResidence) score += 5;
    if (prefill.cccd) score += 10;
  }

  return score;
}

function hasRequiredCriticalFields(prefill: CCCDExtractionResult, type: CCCDImageType) {
  if (type === 'cccd_front') {
    return Boolean(prefill.cccd && prefill.fullName && prefill.dateOfBirth);
  }

  return Boolean(prefill.issueDate);
}

function detectCriticalConflicts(
  results: Array<{ prefill: CCCDExtractionResult }>,
  type: CCCDImageType,
) {
  const fields: Array<keyof CCCDExtractionResult> = type === 'cccd_front'
    ? ['cccd', 'fullName', 'dateOfBirth']
    : ['issueDate'];

  const conflicts: string[] = [];
  for (const field of fields) {
    const uniqueValues = [...new Set(
      results
        .map((result) => normalizeCriticalValue(field, result.prefill[field] || ''))
        .filter(Boolean),
    )];
    if (uniqueValues.length > 1) {
      conflicts.push(field);
    }
  }
  return conflicts;
}

function mergeCandidatePrefills(
  results: Array<{
    score: number;
    prefill: CCCDExtractionResult;
  }>,
  type: CCCDImageType,
) {
  const ordered = [...results].sort((a, b) => b.score - a.score);
  const merged: CCCDExtractionResult = {
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

  const fieldOrder: Array<keyof CCCDExtractionResult> = type === 'cccd_front'
    ? ['cccd', 'fullName', 'dateOfBirth', 'gender', 'ethnicity', 'nationality', 'placeOfOrigin', 'placeOfResidence']
    : ['issueDate', 'placeOfOrigin', 'placeOfResidence', 'cccd'];

  for (const field of fieldOrder) {
    for (const result of ordered) {
      const value = (result.prefill[field] || '').trim();
      if (!value) continue;

      if (!merged[field]) {
        merged[field] = value;
        break;
      }

      if ((field === 'placeOfOrigin' || field === 'placeOfResidence' || field === 'fullName') && value.length > merged[field].length + 6) {
        merged[field] = value;
        break;
      }
    }
  }

  return merged;
}

export async function extractRegistrationPrefillFromImage(
  env: Env,
  imageId: string,
  type: CCCDImageType,
): Promise<{ prefill: CCCDExtractionResult; model: string; debug: OCRDebugInfo }> {
  const debug: OCRDebugInfo = {
    imageSize: 0,
    ocrSpaceStatus: 'pending',
    ocrSpaceText: '',
    ocrSpaceAttempts: [],
  };

  const imageBytes = await getImageBytes(env, imageId);
  const imageUrl = await buildOCRSpaceImageUrl(env, imageId).catch((error) => {
    console.warn('[OCR] Failed to build OCR.space image URL:', error);
    return null;
  });
  debug.imageSize = imageBytes.length;
  console.log(`[OCR] imageId=${imageId.slice(0, 50)} size=${imageBytes.length} type=${type}`);

  debug.ocrSpaceStatus = 'calling';
  const { text: ocrText, parsed } = await extractWithOCRSpace({ imageData: imageBytes, imageUrl }, type, debug.ocrSpaceAttempts);
  debug.ocrSpaceText = ocrText.slice(0, 800);
  debug.ocrSpaceStatus = 'success';
  console.log(`[OCR] OCR.space text (${ocrText.length} chars):`, ocrText.slice(0, 400));

  return { prefill: parsed, model: 'OCR.space', debug };
}

export async function extractRegistrationPrefillFromCandidates(
  env: Env,
  candidates: OCRCandidateInput[],
  type: CCCDImageType,
): Promise<{
  prefill: CCCDExtractionResult;
  model: string;
  debug: OCRDebugInfo;
  arbitration: OCRArbitrationDebug;
}> {
  const dedupedCandidates = candidates
    .filter((candidate, index, array) => (
      Boolean(candidate?.imageId)
      && array.findIndex((item) => item.imageId === candidate.imageId) === index
    ))
    .sort((left, right) => getCandidatePriority(right, type) - getCandidatePriority(left, type));

  if (dedupedCandidates.length === 0) {
    throw new Error('Khong co candidate OCR nao de xu ly.');
  }

  const arbitration: OCRArbitrationDebug = {
    selectedImageId: null,
    selectedMode: null,
    selectedLabel: null,
    conflictFields: [],
    candidates: [],
  };

  const successfulResults: Array<{
    imageId: string;
    label: string;
    mode: string | null;
    score: number;
    prefill: CCCDExtractionResult;
    debug: OCRDebugInfo;
  }> = [];

  for (const candidate of dedupedCandidates) {
    try {
      const extracted = await extractRegistrationPrefillFromImage(env, candidate.imageId, type);
      const score = scoreCandidatePrefill(extracted.prefill, type);
      successfulResults.push({
        imageId: candidate.imageId,
        label: candidate.label,
        mode: candidate.mode || null,
        score,
        prefill: extracted.prefill,
        debug: extracted.debug,
      });
      arbitration.candidates.push({
        imageId: candidate.imageId,
        label: candidate.label,
        mode: candidate.mode || null,
        success: true,
        score,
        prefill: extracted.prefill,
        debug: extracted.debug,
      });

      const rankedSoFar = [...successfulResults].sort((a, b) => b.score - a.score);
      const currentWinner = rankedSoFar[0];
      const currentRunnerUp = rankedSoFar[1] || null;
      const currentLead = currentWinner.score - (currentRunnerUp?.score || 0);
      if (
        rankedSoFar.length >= 2
        && hasRequiredCriticalFields(currentWinner.prefill, type)
        && currentLead >= (type === 'cccd_front' ? 18 : 24)
      ) {
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      arbitration.candidates.push({
        imageId: candidate.imageId,
        label: candidate.label,
        mode: candidate.mode || null,
        success: false,
        score: 0,
        error: message,
      });
    }
  }

  if (successfulResults.length === 0) {
    throw new Error('Tat ca candidate OCR deu that bai.');
  }

  successfulResults.sort((a, b) => b.score - a.score);
  const conflictFields = detectCriticalConflicts(successfulResults, type);
  arbitration.conflictFields = conflictFields;

  const winner = successfulResults[0];
  const runnerUp = successfulResults[1] || null;
  const winnerLead = winner.score - (runnerUp?.score || 0);

  if (conflictFields.length > 0) {
    const strongWinner = hasRequiredCriticalFields(winner.prefill, type)
      && winnerLead >= (type === 'cccd_front' ? 18 : 24);

    if (!strongWinner) {
      throw new Error(`OCR candidates disagree on critical fields: ${conflictFields.join(', ')}`);
    }
  }

  const mergedPrefill = mergeCandidatePrefills(successfulResults, type);
  for (const field of conflictFields as Array<keyof CCCDExtractionResult>) {
    mergedPrefill[field] = winner.prefill[field];
  }
  arbitration.selectedImageId = winner.imageId;
  arbitration.selectedMode = winner.mode || null;
  arbitration.selectedLabel = winner.label;

  return {
    prefill: mergedPrefill,
    model: 'OCR.space',
    debug: winner.debug,
    arbitration,
  };
}

function getCandidatePriority(candidate: OCRCandidateInput, type: CCCDImageType) {
  const mode = String(candidate.mode || '').trim();
  const label = String(candidate.label || '').trim().toLowerCase();

  if (mode === 'ocr_restore_text_priority') return 100;
  if (mode === 'ocr_restore_balanced') return 90;
  if (mode === 'normalized_original') return 80;
  if (mode === 'source_original') return 70;
  if (mode === 'final_uploaded') return 60;
  if (label.includes('recommended text')) return 95;
  if (label.includes('recommended balanced')) return 88;
  if (type === 'cccd_back' && mode === 'single') return 75;
  return 50;
}
