import type { Env } from '../types/env.js';
import { generateSignedImageURL } from '../utils/cloudflare-images.js';
import { type CCCDExtractionResult } from './cccd-ocr-parser.js';

type CCCDImageType = 'cccd_front' | 'cccd_back';

// OCR.space API — Free 25,000 req/month, supports Vietnamese
const OCR_SPACE_API_KEY = 'K81400402488957';
const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';
const OCR_SPACE_MAX_BYTES = 1024 * 1024; // free tier ~1 MB
// OCR.space rejects "vie" with E201 on this endpoint. "eng" still reads bilingual CCCD well.
const OCR_SPACE_LANGUAGE = 'eng';
const OCR_SPACE_TIMEOUT_MS = 15000;

// ── Helpers ──────────────────────────────────────────────────────

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
    if (!object) throw new Error('R2: ảnh không tồn tại — ' + imageId.slice(0, 60));
    return new Uint8Array(await object.arrayBuffer());
  }
  const signedUrl = await generateSignedImageURL(env, imageId, 2);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error('CF Images fetch failed: ' + response.status);
  return new Uint8Array(await response.arrayBuffer());
}

// ── OCR.space ────────────────────────────────────────────────────

interface OCRSpaceResult {
  ParsedResults?: Array<{ ParsedText: string }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
}

type OCRSpaceAttempt = {
  engine: '1' | '2';
  language: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
};

async function callOCRSpaceAttempt(
  imageData: Uint8Array,
  attempt: OCRSpaceAttempt,
): Promise<string> {
  if (imageData.length > OCR_SPACE_MAX_BYTES) {
    throw new Error(`Ảnh quá lớn: ${(imageData.length / 1024).toFixed(0)}KB > 1024KB limit`);
  }

  const base64 = uint8ToBase64(imageData);
  const formData = new FormData();
  formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
  formData.append('language', attempt.language);
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', attempt.engine);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_SPACE_TIMEOUT_MS);
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
      throw new Error(`OCR.space timeout sau ${OCR_SPACE_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) throw new Error(`OCR.space HTTP ${response.status}`);

  const result: OCRSpaceResult = await response.json();
  console.log(
    `[OCR] OCR.space raw engine=${attempt.engine} lang=${attempt.language}:`,
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
  imageData: Uint8Array,
  attemptsLog: OCRSpaceAttempt[],
): Promise<string> {
  const attempts: OCRSpaceAttempt[] = [
    { engine: '2', language: OCR_SPACE_LANGUAGE, status: 'pending' },
    { engine: '1', language: OCR_SPACE_LANGUAGE, status: 'pending' },
  ];

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const text = await callOCRSpaceAttempt(imageData, attempt);
      attempt.status = 'success';
      attemptsLog.push({ ...attempt });
      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempt.status = 'failed';
      attempt.error = message;
      attemptsLog.push({ ...attempt });
      lastError = error instanceof Error ? error : new Error(message);
      console.warn(
        `[OCR] OCR.space attempt failed engine=${attempt.engine} lang=${attempt.language}: ${message}`,
      );
    }
  }

  throw lastError || new Error('OCR.space: all attempts failed');
}

// ── OCR Text → Structured Fields ─────────────────────────────────

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function looksLikeFieldLabel(line: string): boolean {
  return /(?:họ\s*và\s*tên|full\s*name|ngày\s*sinh|date\s*of\s*birth|giới\s*tính|sex|gender|dân\s*tộc|ethnicity|quốc\s*tịch|nationality|quê\s*quán|place\s*of\s*origin|nơi\s*thường\s*trú|place\s*of\s*residence|ngày,\s*tháng,\s*năm|date,\s*month,\s*year|ngày\s*cấp|date\s*of\s*issue)/i.test(line);
}

function looksLikeNonDataLine(line: string): boolean {
  return /^(cộng hòa|socialist republic|căn cước|citizen identity card|đặc điểm nhân dạng|personal identification|director general|cục trưởng|idvnm|ngón trỏ|left index|right index)/i.test(line);
}

function cleanInlineValue(value: string): string {
  return value.replace(/^[\s:./-]+/, '').replace(/\s+/g, ' ').trim();
}

function cleanPlaceValue(value: string): string {
  return value
    .replace(/\b(?:place\s*of\s*ongin|place\s*of\s*origin|place\s*of\s*residence|quê\s*quán|quê\s*quản|que\s*quan|nơi\s*thường\s*trú)\b/gi, '')
    .replace(/[/:]+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^(?:[,.\-\s])+/, '')
    .trim();
}

function extractLabeledMultilineValue(text: string, labelRegex: RegExp, maxExtraLines = 1): string {
  const lines = splitLines(text);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!labelRegex.test(line)) {
      continue;
    }

    let value = cleanInlineValue(line.replace(labelRegex, ''));
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

  // ── Place of Origin / Residence / Issue Date ──
  const placeOfOrigin = extractLabeledMultilineValue(
    text,
    /(?:qu[êe]\s*qu[áa]n\s*\/\s*place\s*of\s*origin|place\s*of\s*origin|qu[êe]\s*qu[áa]n|que\s*quan)/i,
    1,
  );

  const placeOfResidence = extractLabeledMultilineValue(
    text,
    /(?:n[ơo]i\s*thường\s*trú\s*\/\s*place\s*of\s*residence|place\s*of\s*residence|place\s*of\s*residen|n[ơo]i\s*thường\s*trú|noi\s*thuong\s*tru|th[ươo]ng\s*trú)/i,
    1,
  );

  let issueDate = '';
  const issuePatterns = [
    /(?:ng[àa]y[,\s]*(?:th[áa]ng[,\s]*n[ăa]m)?|date[,\s]*(?:month[,\s]*year)?)[\s:\/]*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/i,
    /(?:ng[àa]y\s*c[ấa]p|ngay\s*cap|date\s*of\s*issue|issued?\s*date)[\s:\/]*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/i,
  ];
  for (const p of issuePatterns) {
    const m = text.match(p);
    if (m) { issueDate = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`; break; }
  }
  if (!issueDate && type === 'cccd_back') {
    const allDates = [...text.matchAll(/\b(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})\b/g)];
    for (const m of allDates) {
      const year = parseInt(m[3]);
      if (year >= 2015 && year <= 2030) {
        issueDate = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
        break;
      }
    }
  }

  if (type === 'cccd_front') {
    const cccdMatch = text.match(/\b(\d{12})\b/);
    cccd = cccdMatch ? cccdMatch[1] : '';

    const multilineNamePatterns = [
      /(?:họ[,\s]*(?:chữ\s*đệm\s*)?(?:và\s*)?tên|full\s*name|ho\s*(?:va\s*)?ten)[^\n]*$/i,
    ];
    for (const pattern of multilineNamePatterns) {
      fullName = extractLabeledMultilineValue(text, pattern, 1);
      if (fullName) break;
    }

    if (!fullName) {
      const namePatterns = [
        /(?:họ[,\s]*(?:chữ\s*đệm\s*)?(?:và\s*)?tên|full\s*name|ho\s*(?:va\s*)?ten)[\s:\/.\-]*([^\n]+)/i,
        /(?:name|tên)[\s:]*([^\n]+)/i,
      ];
      for (const p of namePatterns) {
        const m = text.match(p);
        if (m && m[1].trim().length > 2) {
          fullName = m[1].replace(/\/?\.?\s*full\s*name\s*/i, '').trim();
          break;
        }
      }
    }

    if (!fullName) {
      const lines = splitLines(text);
      for (const line of lines) {
        if (/^\d/.test(line)) continue;
        if (/cccd|cmnd|căn cước|cộng hòa|việt nam|socialist|republic|identity/i.test(line)) continue;
        if (/ngày|quê|nơi|giới|quốc|dân|date|place|sex|nation/i.test(line)) continue;
        if (/^[A-ZÀÁẢÃẠĂẮẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ][a-zàáảãạăắẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]*(?:\s+[A-ZÀÁẢÃẠĂẮẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ][a-zàáảãạăắẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]*){1,5}$/.test(line)) {
          fullName = line;
          break;
        }
      }
    }

    const dobPatterns = [
      /(?:ngày\s*sinh|date\s*of\s*birth|birth|dob|ngay\s*sinh)[\s:\/]*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/i,
      /(?:ngày\s*sinh|date\s*of\s*birth)[\s:\/]*(\d{2})(\d{2})(\d{4})/i,
    ];
    for (const p of dobPatterns) {
      const m = text.match(p);
      if (m) {
        dateOfBirth = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
        break;
      }
    }
    if (!dateOfBirth) {
      const m = text.match(/\b(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})\b/);
      if (m && parseInt(m[3]) >= 1940 && parseInt(m[3]) <= 2015) {
        dateOfBirth = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
      }
    }

    const genderMatch = text.match(/(?:giới\s*tính|sex|gender|gioi\s*tinh)[\s:\/.\-]*([A-Za-zÀ-ỹ]{2,10})\b/i);
    const genderMatchTight = text.match(/(?:giới\s*tính\s*\/\s*sex|sex|giới\s*tính|gender)[^A-Za-zÀ-ỹ]{0,10}(Nam|Nữ|Male|Female)\b/i);
    const genderValue = genderMatchTight?.[1] || genderMatch?.[1] || '';
    if (genderValue) {
      const g = genderValue.trim().toLowerCase();
      if (g.includes('nữ') || g.includes('nu') || g === 'f' || g === 'female') gender = 'Nữ';
      else if (g.includes('nam') || g === 'm' || g === 'male') gender = 'Nam';
    }

    const ethMatch = text.match(/(?:dân\s*tộc|dan\s*toc|ethnicity)[\s:\/.\-]*([^\n,]{1,30})/i);
    ethnicity = ethMatch ? ethMatch[1].trim() : '';

    const natMatch = text.match(/(?:quốc\s*tịch\s*\/\s*nationality|nationality|quốc\s*tịch|quoc\s*tich)[\s:\/.\-]*([^\n,]{1,30})/i);
    nationality = natMatch ? natMatch[1].trim() : '';
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

// ── Shared ───────────────────────────────────────────────────────

function hasUsefulExtraction(prefill: CCCDExtractionResult): boolean {
  return Boolean(
    prefill.cccd || prefill.fullName || prefill.dateOfBirth ||
    prefill.gender || prefill.ethnicity || prefill.issueDate ||
    prefill.placeOfOrigin || prefill.placeOfResidence,
  );
}

// ── Main Export ──────────────────────────────────────────────────

export interface OCRDebugInfo {
  imageSize: number;
  ocrSpaceStatus: string;
  ocrSpaceText: string;
  ocrSpaceAttempts: OCRSpaceAttempt[];
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

  // ── Step 1: Get image from R2 ──
  const imageBytes = await getImageBytes(env, imageId);
  debug.imageSize = imageBytes.length;
  console.log(`[OCR] imageId=${imageId.slice(0, 50)} size=${imageBytes.length} type=${type}`);

  // ── Step 2: OCR.space ──
  debug.ocrSpaceStatus = 'calling';
  const ocrText = await extractWithOCRSpace(imageBytes, debug.ocrSpaceAttempts);
  debug.ocrSpaceText = ocrText.slice(0, 800);
  debug.ocrSpaceStatus = 'success';
  console.log(`[OCR] OCR.space text (${ocrText.length} chars):`, ocrText.slice(0, 400));

  // ── Step 3: Parse OCR text → structured fields ──
  let parsed = parseOCRTextToPrefill(ocrText, type);
  console.log(`[OCR] Parsed:`, JSON.stringify(parsed));

  if (!hasUsefulExtraction(parsed)) {
    const engine1WasTried = debug.ocrSpaceAttempts.some(attempt => attempt.engine === '1');

    if (!engine1WasTried) {
      debug.ocrSpaceStatus = 'retrying_engine_1_after_empty_parse';
      try {
        const retryAttempt: OCRSpaceAttempt = {
          engine: '1',
          language: OCR_SPACE_LANGUAGE,
          status: 'pending',
        };
        const retryText = await callOCRSpaceAttempt(imageBytes, retryAttempt);
        retryAttempt.status = 'success';
        debug.ocrSpaceAttempts.push(retryAttempt);
        debug.ocrSpaceText = retryText.slice(0, 800);
        parsed = parseOCRTextToPrefill(retryText, type);
        console.log(`[OCR] Parsed retry engine 1:`, JSON.stringify(parsed));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        debug.ocrSpaceAttempts.push({
          engine: '1',
          language: OCR_SPACE_LANGUAGE,
          status: 'failed',
          error: message,
        });
        console.warn(`[OCR] OCR.space retry engine=1 after empty parse failed: ${message}`);
      }
    }
  }

  if (!hasUsefulExtraction(parsed)) {
    debug.ocrSpaceStatus = 'no_useful_data';
    throw new Error('OCR đọc được text nhưng không nhận diện được trường CCCD nào');
  }

  return { prefill: parsed, model: 'OCR.space', debug };
}
