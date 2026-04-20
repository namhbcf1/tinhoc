import type { Env } from '../types/env.js';

export type Photo3x4PipelineStage =
  | 'uploaded'
  | 'queued'
  | 'preprocessing'
  | 'ai_generate'
  | 'ranking'
  | 'awaiting_selection'
  | 'selected'
  | 'failed';

export type Photo3x4SelectionStatus =
  | 'processing'
  | 'awaiting_selection'
  | 'selected'
  | 'failed';

export type Photo3x4QueueMessage = {
  processingLogId: number;
  originalImageId: string;
  sourceUrl: string;
  studentId?: string | null;
  genderHint?: string | null;
};

type PromptProfileId =
  | 'conservative'
  | 'balanced'
  | 'studio'
  | 'transform_fallback'
  | 'original_fallback';

type PromptProfile = {
  id: Exclude<PromptProfileId, 'transform_fallback' | 'original_fallback'>;
  label: string;
  guidance: number;
  steps: number;
  instruction: string;
};

type IdentityProfile = {
  apparentGender: 'male' | 'female' | 'unknown';
  ageGroup: string;
  hairDescription: string;
  faceDescription: string;
  skinTone: string;
  keepDetails: string[];
};

type VariantEvaluationResult = {
  usable: boolean;
  score: number;
  identityPreserved: number;
  backgroundBlue: boolean;
  framing: boolean;
  sharpEnough: boolean;
  natural: boolean;
  warnings: string[];
  fatalIssues: string[];
};

type PendingVariant = {
  imageId: string;
  generationMode: 'ai_variant' | 'transform_fallback' | 'original_fallback';
  promptProfile: PromptProfileId;
  score: number;
  warnings: string[];
  validationResult: VariantEvaluationResult;
};

type ProcessingLogRecord = {
  id: number;
  image_type: string;
  processing_status: string | null;
  pipeline_stage: string | null;
  progress_percent: number | null;
  source_image_id: string | null;
  candidate_image_id: string | null;
  final_image_id: string | null;
  original_image_id: string | null;
  generation_mode: string | null;
  warnings_json: string | null;
  validation_result_json: string | null;
  error_message: string | null;
  processing_details: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  selection_status: string | null;
  selected_variant_id: number | null;
  recommended_variant_id: number | null;
  selection_completed_at: string | null;
  student_id?: number | null;
};

type VariantRow = {
  id: number;
  processing_log_id: number;
  variant_slot: number;
  image_id: string;
  generation_mode: string;
  score: number | null;
  recommended: number | null;
  warnings_json: string | null;
  validation_result_json: string | null;
  prompt_profile: string | null;
  created_at: string | null;
};

type PipelineDetails = {
  sourceUrl?: string | null;
  genderHint?: string | null;
};

const DEFAULT_PIPELINE_VERSION = 'v2-generate-first';
const DETERMINISTIC_WIDTH = 1152;
const DETERMINISTIC_HEIGHT = 1536;
const REFERENCE_FORMAT = 'png';
const VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const DEFAULT_GENERATIVE_MODEL = '@cf/black-forest-labs/flux-2-dev';
const DEFAULT_VARIANT_COUNT = 3;

const PROMPT_PROFILES: readonly PromptProfile[] = [
  {
    id: 'conservative',
    label: 'Giu mat sat anh goc',
    guidance: 6.2,
    steps: 24,
    instruction: 'Use the lightest cleanup possible and keep the source identity almost unchanged.',
  },
  {
    id: 'balanced',
    label: 'Can bang ho so',
    guidance: 6.8,
    steps: 26,
    instruction: 'Standardize framing, background, hair neatness, and shirt collar more clearly while preserving identity.',
  },
  {
    id: 'studio',
    label: 'Chuan studio',
    guidance: 7.2,
    steps: 28,
    instruction: 'Handle selfie cleanup more assertively, with stronger blue-background replacement and portrait normalization, but keep the same real person.',
  },
] as const;

const PROMPT_PROFILE_LABELS: Record<PromptProfileId, string> = {
  conservative: 'Giu mat sat anh goc',
  balanced: 'Can bang ho so',
  studio: 'Chuan studio',
  transform_fallback: 'AI can lai',
  original_fallback: 'Anh goc',
};

const GENERATION_NEGATIVE_PROMPT = [
  'different person',
  'face swap',
  'identity drift',
  'gender swap',
  'changed ethnicity',
  'beauty retouch',
  'glamour retouch',
  'heavy makeup',
  'anime',
  'illustration',
  'painting',
  'multiple faces',
  'duplicate face',
  'cropped head',
  'missing shoulders',
  'blur',
  'low detail',
  'white background',
  'yellow background',
  'patterned background',
  'room background',
  'outdoor background',
  'hat',
  'glasses',
  'jewelry',
  'text',
  'watermark',
].join(', ');

function parseBooleanEnv(value: string | undefined, defaultValue = false) {
  if (value == null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function parseIntegerEnv(value: string | undefined, defaultValue: number, min: number, max: number) {
  const numeric = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(numeric)) return defaultValue;
  return Math.max(min, Math.min(max, numeric));
}

function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function sanitizePromptText(value: unknown, maxLength = 80) {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[{}[\]<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function detectExtension(contentType: string) {
  const lowered = String(contentType || '').toLowerCase();
  if (lowered.includes('png')) return 'png';
  if (lowered.includes('webp')) return 'webp';
  if (lowered.includes('jpeg') || lowered.includes('jpg')) return 'jpg';
  return 'jpg';
}

function bufferToDataUrl(bytes: Uint8Array, mimeType = 'image/jpeg') {
  const base64 = Buffer.from(bytes).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

function normalizeGenderHint(value: unknown): IdentityProfile['apparentGender'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (['nam', 'male', 'm'].includes(normalized)) return 'male';
  if (['nu', 'nữ', 'female', 'f'].includes(normalized)) return 'female';
  return 'unknown';
}

function getPipelineVersion(env: Env) {
  return env.PHOTO_3X4_PIPELINE_VERSION?.trim() || DEFAULT_PIPELINE_VERSION;
}

function getPrimaryModel(env: Env) {
  return env.PHOTO_3X4_MODEL_PRIMARY?.trim() || DEFAULT_GENERATIVE_MODEL;
}

function getVariantCount(env: Env) {
  return parseIntegerEnv(env.PHOTO_3X4_VARIANT_COUNT, DEFAULT_VARIANT_COUNT, 1, DEFAULT_VARIANT_COUNT);
}

function buildAbsoluteR2PreviewUrl(baseOrigin: string, key: string | null | undefined) {
  if (!key) return null;
  return `${baseOrigin}/students/image/${encodeURIComponent(key)}`;
}

function buildClientR2PreviewUrl(key: string | null | undefined) {
  if (!key) return null;
  return `/api/students/image/${encodeURIComponent(key)}`;
}

function getPreviewBaseOrigin(env: Env, sourceUrl: string) {
  try {
    return new URL(sourceUrl).origin;
  } catch {
    const host = env.PHOTO_3X4_ZONE_HOST?.trim();
    if (host) return `https://${host}`;
    return 'https://vantrangedu-api.bangachieu2.workers.dev';
  }
}

function dedupeWarnings(...groups: Array<Array<string | null | undefined> | null | undefined>) {
  const merged = groups
    .flatMap((group) => group || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return Array.from(new Set(merged));
}

function getRandomSeed(offset = 0) {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] + offset) % 2147483647 || offset + 1;
}

function buildPipelineObjectKey(
  processingLogId: number,
  stage: 'candidate' | 'variant',
  suffix: string,
  contentType: string,
) {
  const extension = detectExtension(contentType);
  return `cccd-uploads/photo_3x4/pipeline/${processingLogId}/${stage}-${suffix}.${extension}`;
}

function createFallbackEvaluation(score: number, warnings: string[], usable = true): VariantEvaluationResult {
  return {
    usable,
    score,
    identityPreserved: usable ? Math.max(40, Math.min(100, score)) : 0,
    backgroundBlue: score >= 55,
    framing: score >= 50,
    sharpEnough: score >= 45,
    natural: score >= 45,
    warnings,
    fatalIssues: usable ? [] : ['technical_failure'],
  };
}

function normalizeIdentityProfile(raw: unknown, genderHint?: string | null): IdentityProfile {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const hintedGender = normalizeGenderHint(genderHint);
  const apparentGender = data.apparentGender === 'male' || data.apparentGender === 'female'
    ? data.apparentGender
    : hintedGender;

  return {
    apparentGender: apparentGender || 'unknown',
    ageGroup: String(data.ageGroup || 'young adult'),
    hairDescription: String(data.hairDescription || 'same hairstyle'),
    faceDescription: String(data.faceDescription || 'same facial proportions'),
    skinTone: String(data.skinTone || 'same natural skin tone'),
    keepDetails: Array.isArray(data.keepDetails)
      ? data.keepDetails.map((item) => String(item)).filter(Boolean).slice(0, 5)
      : [],
  };
}

function normalizeVariantEvaluation(raw: unknown): VariantEvaluationResult {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const warnings = Array.isArray(data.warnings) ? data.warnings.map((item) => String(item)).filter(Boolean) : [];
  const fatalIssues = Array.isArray(data.fatalIssues) ? data.fatalIssues.map((item) => String(item)).filter(Boolean) : [];
  const usable = Boolean(data.usable);
  const score = Number(data.score || 0);

  return {
    usable,
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
    identityPreserved: Number.isFinite(Number(data.identityPreserved))
      ? Math.max(0, Math.min(100, Number(data.identityPreserved)))
      : 0,
    backgroundBlue: Boolean(data.backgroundBlue),
    framing: Boolean(data.framing),
    sharpEnough: Boolean(data.sharpEnough),
    natural: Boolean(data.natural),
    warnings: warnings.length > 0 ? warnings : usable ? [] : ['Ban sinh ra khong du ro de goi y cho hoc vien'],
    fatalIssues,
  };
}

async function updateProcessingLog(
  env: Env,
  logId: number,
  fields: Record<string, unknown>,
) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sql = `UPDATE image_processing_logs SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`;
  const values = entries.map(([, value]) => value);
  await env.DB.prepare(sql).bind(...values, logId).run();
}

async function fetchProcessingLog(env: Env, logId: number | string) {
  return await env.DB.prepare(`
    SELECT
      id,
      student_id,
      image_type,
      processing_status,
      pipeline_stage,
      progress_percent,
      source_image_id,
      candidate_image_id,
      final_image_id,
      original_image_id,
      generation_mode,
      warnings_json,
      validation_result_json,
      error_message,
      processing_details,
      processing_started_at,
      processing_completed_at,
      selection_status,
      selected_variant_id,
      recommended_variant_id,
      selection_completed_at
    FROM image_processing_logs
    WHERE id = ?
  `).bind(logId).first<ProcessingLogRecord>();
}

async function deleteVariants(env: Env, logId: number) {
  await env.DB.prepare('DELETE FROM photo_3x4_variants WHERE processing_log_id = ?').bind(logId).run();
}

async function insertVariant(
  env: Env,
  logId: number,
  slot: number,
  variant: PendingVariant,
  recommended: boolean,
) {
  const inserted = await env.DB.prepare(`
    INSERT INTO photo_3x4_variants (
      processing_log_id,
      variant_slot,
      image_id,
      generation_mode,
      score,
      recommended,
      warnings_json,
      validation_result_json,
      prompt_profile
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    logId,
    slot,
    variant.imageId,
    variant.generationMode,
    variant.score,
    recommended ? 1 : 0,
    JSON.stringify(variant.warnings),
    JSON.stringify(variant.validationResult),
    variant.promptProfile,
  ).run();

  return Number(inserted.meta.last_row_id || 0) || 0;
}

async function storeR2Blob(
  env: Env,
  key: string,
  blob: Blob,
  metadata: Record<string, string> = {},
) {
  await env.R2.put(key, await blob.arrayBuffer(), {
    httpMetadata: {
      contentType: blob.type || 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    },
    customMetadata: metadata,
  });

  return { imageId: key };
}

async function fetchBlob(url: string, init?: RequestInit & { cf?: Record<string, unknown> }) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Image fetch failed with status ${response.status}`);
  }
  return await response.blob();
}

async function fetchBytes(url: string, init?: RequestInit & { cf?: Record<string, unknown> }) {
  const blob = await fetchBlob(url, init);
  return {
    blob,
    bytes: new Uint8Array(await blob.arrayBuffer()),
    contentType: blob.type || 'image/jpeg',
  };
}

async function fetchReferenceBlob(
  sourceUrl: string,
  options: {
    width: number;
    height: number;
    fit?: 'cover' | 'contain';
    gravity?: 'face' | 'center';
    trim?: 'border';
    quality?: number;
    sharpen?: number;
    brightness?: number;
    contrast?: number;
  },
) {
  const {
    width,
    height,
    fit = 'cover',
    gravity = 'face',
    trim,
    quality = 86,
    sharpen,
    brightness,
    contrast,
  } = options;

  return await fetchBlob(sourceUrl, {
    cf: {
      image: {
        width,
        height,
        fit,
        gravity,
        trim,
        quality,
        sharpen,
        brightness,
        contrast,
        format: REFERENCE_FORMAT,
      },
    } as never,
  });
}

async function fetchVisionReviewBytes(url: string) {
  return await fetchBytes(url, {
    cf: {
      image: {
        width: 160,
        height: 208,
        fit: 'cover',
        gravity: 'face',
        quality: 60,
        format: 'jpeg',
      },
    } as never,
  });
}

async function runDeterministicTransform(sourceUrl: string) {
  return await fetchBlob(sourceUrl, {
    cf: {
      image: {
        width: DETERMINISTIC_WIDTH,
        height: DETERMINISTIC_HEIGHT,
        fit: 'cover',
        gravity: 'face',
        trim: 'border',
        sharpen: 2,
        brightness: 1.02,
        contrast: 1.08,
        saturation: 1.04,
        quality: 96,
        format: 'jpeg',
      },
    } as never,
  });
}

async function maybeAgreeToModel(env: Env, model: string) {
  try {
    await (env.AI as any).run(model, { prompt: 'agree' });
  } catch {
    // Ignore preflight failures and let the real call report a useful error.
  }
}

async function describeIdentityForPortrait(
  env: Env,
  imageBytes: Uint8Array,
  contentType: string,
  genderHint?: string | null,
): Promise<IdentityProfile> {
  try {
    await maybeAgreeToModel(env, VISION_MODEL);

    const response = await (env.AI as any).run(VISION_MODEL, {
      messages: [
        {
          role: 'system',
          content: 'You describe stable identity traits from a portrait image. Return JSON only and stay conservative.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'Describe the visible identity traits of the same person in this portrait.',
                'Return JSON with: apparentGender (male|female|unknown), ageGroup, hairDescription, faceDescription, skinTone, keepDetails.',
                'keepDetails should contain 2 to 5 concise traits that help preserve identity.',
                genderHint ? `The form gender hint is: ${sanitizePromptText(genderHint, 12)}.` : '',
              ].join(' '),
            },
            {
              type: 'image_url',
              image_url: {
                url: bufferToDataUrl(imageBytes, contentType),
              },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          type: 'object',
          properties: {
            apparentGender: { type: 'string', enum: ['male', 'female', 'unknown'] },
            ageGroup: { type: 'string' },
            hairDescription: { type: 'string' },
            faceDescription: { type: 'string' },
            skinTone: { type: 'string' },
            keepDetails: { type: 'array', items: { type: 'string' } },
          },
          required: ['apparentGender', 'ageGroup', 'hairDescription', 'faceDescription', 'skinTone', 'keepDetails'],
        },
      },
      max_tokens: 220,
    });

    const rawPayload = (response as any)?.response ?? response;
    const parsedPayload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    return normalizeIdentityProfile(parsedPayload, genderHint);
  } catch {
    return normalizeIdentityProfile({}, genderHint);
  }
}

function buildGenderInstruction(gender: IdentityProfile['apparentGender']) {
  if (gender === 'male') {
    return 'If hair needs cleanup, keep it neat, tidy, and away from the eyes without changing the real identity.';
  }
  if (gender === 'female') {
    return 'If hair needs cleanup, keep it neat, away from the eyes, and when natural place longer hair behind the shoulders or behind the ears.';
  }
  return 'Keep hair neat and away from the face while preserving the same real person.';
}

function buildGenerativePrompt(
  identity: IdentityProfile,
  profile: PromptProfile,
  genderHint?: string | null,
) {
  const hintedGender = normalizeGenderHint(genderHint);
  const gender = sanitizePromptText(hintedGender !== 'unknown' ? hintedGender : identity.apparentGender, 16) || 'unknown';
  const ageGroup = sanitizePromptText(identity.ageGroup, 40) || 'young adult';
  const hair = sanitizePromptText(identity.hairDescription, 64) || 'same hairstyle';
  const face = sanitizePromptText(identity.faceDescription, 96) || 'same facial proportions';
  const skinTone = sanitizePromptText(identity.skinTone, 40) || 'same natural skin tone';
  const keepDetails = identity.keepDetails
    .map((item) => sanitizePromptText(item, 48))
    .filter(Boolean)
    .slice(0, 5);

  const keepText = keepDetails.length > 0
    ? `Keep these identity details: ${keepDetails.join(', ')}.`
    : 'Keep the same identity details from the source portrait.';

  return [
    'Edit the reference images into an official Vietnamese student 3x4 portrait with blue background.',
    'Keep the exact same real person and keep identity highly consistent with the source portrait.',
    'Render a high-detail, print-ready portrait with crisp focus, clear eyes, clean hair edges, and natural skin texture.',
    `Gender hint ${gender}. Age ${ageGroup}. Hair ${hair}. Face ${face}. Skin tone ${skinTone}.`,
    keepText,
    buildGenderInstruction(hintedGender !== 'unknown' ? hintedGender : identity.apparentGender),
    profile.instruction,
    'Make only identity-safe changes: clean blue background, centered frontal head-and-shoulders framing, natural skin, tidy collar, and slightly clearer lighting.',
    'Do not change the person, do not beautify, do not face swap, do not change age, do not change ethnicity, do not change face shape, eyes, nose, lips, jawline, or hairstyle category.',
  ].join(' ');
}

async function fetchStyleReferenceBlob(env: Env, sourceUrl: string) {
  const configuredUrl = env.PHOTO_3X4_STYLE_REFERENCE_URL?.trim();
  if (!configuredUrl) return null;

  try {
    const absoluteUrl = new URL(configuredUrl, sourceUrl).toString();
    return await fetchBlob(absoluteUrl);
  } catch {
    return null;
  }
}

async function buildReferenceBlobs(env: Env, sourceUrl: string) {
  const [medium, tight, wide, styleReference] = await Promise.all([
    fetchReferenceBlob(sourceUrl, {
      width: 576,
      height: 768,
      fit: 'cover',
      gravity: 'face',
      trim: 'border',
      quality: 92,
      sharpen: 1.45,
      contrast: 1.04,
    }),
    fetchReferenceBlob(sourceUrl, {
      width: 480,
      height: 640,
      fit: 'cover',
      gravity: 'face',
      quality: 92,
      sharpen: 1.55,
      contrast: 1.06,
    }),
    fetchReferenceBlob(sourceUrl, {
      width: 768,
      height: 1024,
      fit: 'cover',
      gravity: 'face',
      trim: 'border',
      quality: 94,
      sharpen: 1.2,
      contrast: 1.02,
    }),
    fetchStyleReferenceBlob(env, sourceUrl),
  ]);

  return [medium, tight, wide, styleReference].filter(Boolean) as Blob[];
}

async function generatePortraitWithAI(
  env: Env,
  references: Blob[],
  identity: IdentityProfile,
  profile: PromptProfile,
  genderHint?: string | null,
) {
  const model = getPrimaryModel(env);
  await maybeAgreeToModel(env, model);

  const buildMultipartResponse = (blobs: Blob[]) => {
    const form = new FormData();
    form.append('prompt', buildGenerativePrompt(identity, profile, genderHint));
    form.append('negative_prompt', GENERATION_NEGATIVE_PROMPT);
    blobs.forEach((blob, index) => {
      form.append(`input_image_${index}`, blob, `reference-${index}.${REFERENCE_FORMAT}`);
    });
    form.append('guidance', String(profile.guidance));
    form.append('steps', String(profile.steps));
    form.append('width', String(DETERMINISTIC_WIDTH));
    form.append('height', String(DETERMINISTIC_HEIGHT));
    form.append('seed', String(getRandomSeed(profile.steps)));
    return new Response(form);
  };

  const attemptGenerate = async (blobs: Blob[]) => {
    const formResponse = buildMultipartResponse(blobs);
    const response = await (env.AI as any).run(model, {
      multipart: {
        body: formResponse.body,
        contentType: formResponse.headers.get('content-type') || 'multipart/form-data',
      },
    });

    const base64Image = (response as any)?.image;
    if (!base64Image || typeof base64Image !== 'string') {
      throw new Error('Flux did not return an image payload.');
    }
    const bytes = Uint8Array.from(Buffer.from(base64Image, 'base64'));
    return new Blob([bytes], { type: 'image/jpeg' });
  };

  try {
    return await attemptGenerate(references);
  } catch (error) {
    if (references.length > 1) {
      return await attemptGenerate(references.slice(0, 1));
    }
    throw error;
  }
}

async function polishPortraitOutput(sourceUrl: string) {
  return await fetchBlob(sourceUrl, {
    cf: {
      image: {
        width: DETERMINISTIC_WIDTH,
        height: DETERMINISTIC_HEIGHT,
        fit: 'cover',
        gravity: 'face',
        trim: 'border',
        sharpen: 2.2,
        contrast: 1.06,
        saturation: 1.03,
        quality: 98,
        format: 'jpeg',
      },
    } as never,
  });
}

async function evaluatePortraitVariant(
  env: Env,
  identity: IdentityProfile,
  candidateBytes: Uint8Array,
  candidateContentType: string,
): Promise<VariantEvaluationResult> {
  try {
    await maybeAgreeToModel(env, VISION_MODEL);

    const hintedGender = sanitizePromptText(identity.apparentGender, 16) || 'unknown';
    const ageGroup = sanitizePromptText(identity.ageGroup, 40) || 'young adult';
    const hair = sanitizePromptText(identity.hairDescription, 64) || 'same hairstyle';
    const face = sanitizePromptText(identity.faceDescription, 96) || 'same facial proportions';
    const skinTone = sanitizePromptText(identity.skinTone, 40) || 'same natural skin tone';
    const keepDetails = identity.keepDetails
      .map((item) => sanitizePromptText(item, 48))
      .filter(Boolean)
      .slice(0, 5);
    const identityHint = keepDetails.length > 0
      ? keepDetails.join(', ')
      : 'same real person from the source portrait';

    const response = await (env.AI as any).run(VISION_MODEL, {
      messages: [
        {
          role: 'system',
          content: [
            'You review AI-generated Vietnamese student 3x4 portraits for self-service selection.',
            'Be practical and lenient on small grooming differences.',
            'Mark usable=false only for catastrophic failures: wrong person, obvious face swap, multiple faces, no clear face, severe crop, or broken output.',
            'Return JSON only.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'Review image 1 as the candidate portrait.',
                `Expected identity hints: gender ${hintedGender}, age ${ageGroup}, hair ${hair}, face ${face}, skin tone ${skinTone}.`,
                `Keep details to preserve: ${identityHint}.`,
                'Score the candidate from 0 to 100 for identity preservation plus official blue-background student portrait quality.',
                'Return fields: usable, score, identityPreserved, backgroundBlue, framing, sharpEnough, natural, warnings, fatalIssues.',
                'Warnings should be short phrases in Vietnamese without punctuation at the end.',
              ].join(' '),
            },
            {
              type: 'image_url',
              image_url: {
                url: bufferToDataUrl(candidateBytes, candidateContentType),
              },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          type: 'object',
          properties: {
            usable: { type: 'boolean' },
            score: { type: 'number' },
            identityPreserved: { type: 'number' },
            backgroundBlue: { type: 'boolean' },
            framing: { type: 'boolean' },
            sharpEnough: { type: 'boolean' },
            natural: { type: 'boolean' },
            warnings: { type: 'array', items: { type: 'string' } },
            fatalIssues: { type: 'array', items: { type: 'string' } },
          },
          required: [
            'usable',
            'score',
            'identityPreserved',
            'backgroundBlue',
            'framing',
            'sharpEnough',
            'natural',
            'warnings',
            'fatalIssues',
          ],
        },
      },
      max_tokens: 220,
    });

    const rawPayload = (response as any)?.response ?? response;
    const parsedPayload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    return normalizeVariantEvaluation(parsedPayload);
  } catch (error) {
    return createFallbackEvaluation(58, [], true);
  }
}

async function buildFallbackVariant(
  env: Env,
  identity: IdentityProfile,
  sourceVision: { bytes: Uint8Array; contentType: string },
  previewUrl: string,
  imageId: string,
  generationMode: PendingVariant['generationMode'],
  promptProfile: Extract<PromptProfileId, 'transform_fallback' | 'original_fallback'>,
  defaultScore: number,
  extraWarnings: string[],
): Promise<PendingVariant> {
  try {
    const candidateVision = await fetchBytes(previewUrl);

    const evaluation = await evaluatePortraitVariant(
      env,
      identity,
      candidateVision.bytes,
      candidateVision.contentType,
    );

    return {
      imageId,
      generationMode,
      promptProfile,
      score: evaluation.score || defaultScore,
      warnings: dedupeWarnings(extraWarnings, evaluation.warnings),
      validationResult: evaluation,
    };
  } catch {
    const fallbackWarnings = dedupeWarnings(extraWarnings, [
      `Khong danh gia duoc ${promptProfile === 'transform_fallback' ? 'ban can lai' : 'anh goc'}`,
    ]);
    return {
      imageId,
      generationMode,
      promptProfile,
      score: defaultScore,
      warnings: fallbackWarnings,
      validationResult: createFallbackEvaluation(defaultScore, fallbackWarnings, true),
    };
  }
}

async function generateAiVariant(
  env: Env,
  processingLogId: number,
  sourceVision: { bytes: Uint8Array; contentType: string },
  previewBaseOrigin: string,
  references: Blob[],
  identity: IdentityProfile,
  profile: PromptProfile,
  metadata: { studentId?: string | null; genderHint?: string | null },
) {
  const generatedBlob = await generatePortraitWithAI(env, references, identity, profile, metadata.genderHint);
  const imageKey = buildPipelineObjectKey(processingLogId, 'variant', profile.id, generatedBlob.type || 'image/jpeg');
  const objectMetadata = {
    type: 'photo_3x4',
    stage: 'variant',
    generationMode: 'ai_variant',
    promptProfile: profile.id,
    processingLogId: String(processingLogId),
    studentId: metadata.studentId ? String(metadata.studentId) : '',
  };
  const upload = await storeR2Blob(env, imageKey, generatedBlob, objectMetadata);

  let finalBlob = generatedBlob;
  const uploadedPreviewUrl = buildAbsoluteR2PreviewUrl(previewBaseOrigin, upload.imageId);
  if (uploadedPreviewUrl) {
    try {
      finalBlob = await polishPortraitOutput(uploadedPreviewUrl);
      await storeR2Blob(env, imageKey, finalBlob, objectMetadata);
    } catch {
      finalBlob = generatedBlob;
    }
  }

  const candidateVision = {
    bytes: new Uint8Array(await finalBlob.arrayBuffer()),
    contentType: finalBlob.type || 'image/jpeg',
  };
  const evaluation = await evaluatePortraitVariant(
    env,
    identity,
    candidateVision.bytes,
    candidateVision.contentType,
  );

  if (!evaluation.usable) {
    return null;
  }

  return {
    imageId: upload.imageId,
    generationMode: 'ai_variant' as const,
    promptProfile: profile.id,
    score: evaluation.score,
    warnings: evaluation.warnings,
    validationResult: evaluation,
  };
}

async function markFailed(
  env: Env,
  processingLogId: number,
  message: string,
  extra: Record<string, unknown> = {},
) {
  await updateProcessingLog(env, processingLogId, {
    processing_status: 'failed',
    pipeline_stage: 'failed',
    selection_status: 'failed',
    progress_percent: 100,
    error_message: message,
    used_as_primary: 0,
    processing_completed_at: new Date().toISOString(),
    ...extra,
  });
}

export async function enqueuePhoto3x4Pipeline(
  env: Env,
  message: Photo3x4QueueMessage,
) {
  if (!env.PHOTO_3X4_QUEUE) {
    return false;
  }

  await env.PHOTO_3X4_QUEUE.send(message);
  return true;
}

export async function runPhoto3x4Pipeline(env: Env, message: Photo3x4QueueMessage) {
  const { processingLogId, originalImageId, sourceUrl, studentId, genderHint } = message;
  const previewBaseOrigin = getPreviewBaseOrigin(env, sourceUrl);
  const pipelineVersion = getPipelineVersion(env);
  const aiEnabled = parseBooleanEnv(env.PHOTO_3X4_AI_ENABLED, true);
  const generativeEnabled = parseBooleanEnv(env.PHOTO_3X4_GENERATIVE_ENABLED, true);
  const variantCount = getVariantCount(env);
  let candidateImageId: string | null = null;

  try {
    await updateProcessingLog(env, processingLogId, {
      processing_status: 'processing',
      pipeline_stage: 'preprocessing',
      selection_status: 'processing',
      progress_percent: 12,
      source_image_id: originalImageId,
      original_image_id: originalImageId,
      pipeline_version: pipelineVersion,
      generation_mode: null,
      used_as_primary: 0,
      error_message: null,
      warnings_json: JSON.stringify([]),
      validation_result_json: null,
      selected_variant_id: null,
      recommended_variant_id: null,
      selection_completed_at: null,
      processing_started_at: new Date().toISOString(),
      processing_completed_at: null,
      processing_details: JSON.stringify({
        sourceUrl,
        genderHint: genderHint || null,
      }),
    });

    await deleteVariants(env, processingLogId);

    const [candidateBlob, sourceVision, references] = await Promise.all([
      runDeterministicTransform(sourceUrl),
      fetchBytes(sourceUrl, {
        cf: {
          image: {
            width: 576,
            height: 768,
            fit: 'cover',
            gravity: 'face',
            quality: 84,
            sharpen: 1.2,
            format: 'jpeg',
          },
        } as never,
      }),
      buildReferenceBlobs(env, sourceUrl),
    ]);

    const candidateKey = buildPipelineObjectKey(processingLogId, 'candidate', 'base', candidateBlob.type || 'image/jpeg');
    const candidateUpload = await storeR2Blob(env, candidateKey, candidateBlob, {
      type: 'photo_3x4',
      stage: 'candidate',
      generationMode: 'transform_fallback',
      processingLogId: String(processingLogId),
      studentId: studentId ? String(studentId) : '',
    });
    candidateImageId = candidateUpload.imageId;

    await updateProcessingLog(env, processingLogId, {
      candidate_image_id: candidateUpload.imageId,
      progress_percent: 32,
    });

    const identity = await describeIdentityForPortrait(
      env,
      sourceVision.bytes,
      sourceVision.contentType,
      genderHint,
    );

    await updateProcessingLog(env, processingLogId, {
      pipeline_stage: 'ai_generate',
      progress_percent: 45,
    });

    const aiVariantPromises = aiEnabled && generativeEnabled
      ? PROMPT_PROFILES.slice(0, variantCount).map(async (profile) => {
          try {
            return await generateAiVariant(
              env,
              processingLogId,
              sourceVision,
              previewBaseOrigin,
              references,
              identity,
              profile,
              { studentId, genderHint },
            );
          } catch (error) {
            return {
              error: `Khong tao duoc bien the ${PROMPT_PROFILE_LABELS[profile.id]}: ${String((error as Error)?.message || error || 'unknown')}`,
            };
          }
        })
      : [];

    const aiResults = await Promise.all(aiVariantPromises);
    const pipelineWarnings: string[] = [];
    const pendingVariants: PendingVariant[] = [];

    for (const result of aiResults) {
      if (!result) continue;
      if ('error' in result) {
        pipelineWarnings.push(result.error);
        continue;
      }
      pendingVariants.push(result);
    }

    const candidatePreviewUrl = buildAbsoluteR2PreviewUrl(previewBaseOrigin, candidateUpload.imageId);
    const originalPreviewUrl = buildAbsoluteR2PreviewUrl(previewBaseOrigin, originalImageId);

    if (pendingVariants.length < variantCount && candidatePreviewUrl) {
      pendingVariants.push(
        await buildFallbackVariant(
          env,
          identity,
          sourceVision,
          candidatePreviewUrl,
          candidateUpload.imageId,
          'transform_fallback',
          'transform_fallback',
          64,
          ['Dung ban AI can lai khi cac phuong an sinh anh chua on dinh'],
        ),
      );
    }

    if (pendingVariants.length < variantCount && originalPreviewUrl) {
      pendingVariants.push(
        await buildFallbackVariant(
          env,
          identity,
          sourceVision,
          originalPreviewUrl,
          originalImageId,
          'original_fallback',
          'original_fallback',
          44,
          ['Giu anh goc de hoc vien tu doi chieu'],
        ),
      );
    }

    const finalVariants = pendingVariants
      .filter((variant, index, all) => all.findIndex((item) => item.imageId === variant.imageId) === index)
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.max(variantCount, pendingVariants.length === 0 ? 2 : variantCount));

    if (finalVariants.length === 0) {
      await markFailed(
        env,
        processingLogId,
        'Khong tao duoc bat ky phuong an anh 3x4 nao co the hien thi cho hoc vien.',
        {
          source_image_id: originalImageId,
          candidate_image_id: candidateImageId || undefined,
          warnings_json: JSON.stringify(dedupeWarnings(pipelineWarnings, ['Khong co phuong an anh kha dung.'])),
        },
      );
      return;
    }

    await updateProcessingLog(env, processingLogId, {
      pipeline_stage: 'ranking',
      progress_percent: 85,
    });

    const insertedVariantIds: number[] = [];
    for (let index = 0; index < finalVariants.length; index += 1) {
      const variantId = await insertVariant(env, processingLogId, index + 1, finalVariants[index], index === 0);
      insertedVariantIds.push(variantId);
    }

    const recommendedVariantId = insertedVariantIds[0] || null;
    const recommendedVariant = finalVariants[0] || null;

    await updateProcessingLog(env, processingLogId, {
      processing_status: 'awaiting_selection',
      pipeline_stage: 'awaiting_selection',
      selection_status: 'awaiting_selection',
      progress_percent: 100,
      recommended_variant_id: recommendedVariantId,
      generation_mode: recommendedVariant?.generationMode || null,
      validation_result_json: recommendedVariant ? JSON.stringify(recommendedVariant.validationResult) : null,
      warnings_json: JSON.stringify(dedupeWarnings(
        pipelineWarnings,
        ...finalVariants.map((variant) => variant.warnings),
      )),
      error_message: null,
      processing_completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[photo_3x4 pipeline] failed:', error);
    await markFailed(
      env,
      processingLogId,
      String((error as Error)?.message || error || 'photo_3x4 pipeline failed'),
      {
        source_image_id: originalImageId,
        candidate_image_id: candidateImageId || undefined,
      },
    );
  }
}

export async function handlePhoto3x4Queue(
  batch: MessageBatch<Photo3x4QueueMessage>,
  env: Env,
) {
  for (const message of batch.messages) {
    const body = message.body;

    if (!body || typeof body !== 'object' || !body.processingLogId || !body.originalImageId || !body.sourceUrl) {
      message.ack();
      continue;
    }

    await runPhoto3x4Pipeline(env, body);
    message.ack();
  }
}

export async function regeneratePhoto3x4Pipeline(
  env: Env,
  logId: number,
  previewBaseOrigin: string,
) {
  const log = await fetchProcessingLog(env, logId);
  if (!log) {
    throw new Error('Processing log not found.');
  }

  const details = parseJsonField<PipelineDetails>(log.processing_details, {});
  const originalImageId = log.source_image_id || log.original_image_id;
  if (!originalImageId) {
    throw new Error('Source image not found for regeneration.');
  }

  const sourceUrl = details.sourceUrl || buildAbsoluteR2PreviewUrl(previewBaseOrigin, originalImageId);
  if (!sourceUrl) {
    throw new Error('Source preview URL is missing.');
  }

  await deleteVariants(env, logId);
  await updateProcessingLog(env, logId, {
    processing_status: 'processing',
    pipeline_stage: 'queued',
    selection_status: 'processing',
    progress_percent: 5,
    final_image_id: null,
    processed_image_id: null,
    selected_variant_id: null,
    recommended_variant_id: null,
    selection_completed_at: null,
    generation_mode: null,
    warnings_json: JSON.stringify([]),
    validation_result_json: null,
    error_message: null,
    processing_started_at: new Date().toISOString(),
    processing_completed_at: null,
    processing_details: JSON.stringify({
      ...details,
      sourceUrl,
    }),
  });

  const queued = await enqueuePhoto3x4Pipeline(env, {
    processingLogId: logId,
    originalImageId,
    sourceUrl,
    studentId: log.student_id ? String(log.student_id) : null,
    genderHint: details.genderHint || null,
  });

  if (!queued) {
    await runPhoto3x4Pipeline(env, {
      processingLogId: logId,
      originalImageId,
      sourceUrl,
      studentId: log.student_id ? String(log.student_id) : null,
      genderHint: details.genderHint || null,
    });
  }
}

export async function selectPhoto3x4Variant(
  env: Env,
  logId: number,
  variantId: number,
) {
  const log = await fetchProcessingLog(env, logId);
  if (!log) {
    throw new Error('Processing log not found.');
  }

  const variant = await env.DB.prepare(`
    SELECT
      id,
      processing_log_id,
      variant_slot,
      image_id,
      generation_mode,
      score,
      recommended,
      warnings_json,
      validation_result_json,
      prompt_profile,
      created_at
    FROM photo_3x4_variants
    WHERE id = ? AND processing_log_id = ?
  `).bind(variantId, logId).first<VariantRow>();

  if (!variant) {
    throw new Error('Variant not found for this processing log.');
  }

  await updateProcessingLog(env, logId, {
    processing_status: 'success',
    pipeline_stage: 'selected',
    selection_status: 'selected',
    progress_percent: 100,
    selected_variant_id: variant.id,
    final_image_id: variant.image_id,
    processed_image_id: variant.image_id,
    generation_mode: variant.generation_mode,
    used_as_primary: 1,
    validation_result_json: variant.validation_result_json || null,
    warnings_json: variant.warnings_json || JSON.stringify([]),
    error_message: null,
    selection_completed_at: new Date().toISOString(),
    processing_completed_at: new Date().toISOString(),
  });

  if (log.student_id) {
    await env.DB.prepare(`
      UPDATE students
      SET photo_3x4_image_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(variant.image_id, log.student_id).run();
  }

  return {
    success: true,
    imageId: variant.image_id,
    imageUrl: buildClientR2PreviewUrl(variant.image_id),
    previewUrl: buildClientR2PreviewUrl(variant.image_id),
    generationMode: variant.generation_mode,
    warnings: parseJsonField<string[]>(variant.warnings_json, []),
    selectedVariantId: variant.id,
  };
}

export async function getPhoto3x4ProcessingStatus(
  env: Env,
  logId: string | number,
  previewBaseOrigin?: string,
) {
  const log = await fetchProcessingLog(env, logId);
  if (!log) {
    return null;
  }

  const variants = await env.DB.prepare(`
    SELECT
      id,
      processing_log_id,
      variant_slot,
      image_id,
      generation_mode,
      score,
      recommended,
      warnings_json,
      validation_result_json,
      prompt_profile,
      created_at
    FROM photo_3x4_variants
    WHERE processing_log_id = ?
    ORDER BY variant_slot ASC, id ASC
  `).bind(logId).all<VariantRow>();

  const sourceImageId = log.source_image_id || log.original_image_id || null;
  const selectedVariant = variants.results.find((variant) => variant.id === log.selected_variant_id) || null;
  const recommendedVariant = variants.results.find((variant) => variant.id === log.recommended_variant_id) || variants.results[0] || null;
  const activePreviewId = selectedVariant?.image_id || recommendedVariant?.image_id || log.final_image_id || log.candidate_image_id || sourceImageId;

  return {
    success: true,
    status: log.selection_status === 'awaiting_selection'
      ? 'awaiting_selection'
      : log.processing_status,
    stage: (log.pipeline_stage || 'uploaded') as Photo3x4PipelineStage,
    progress: Number(log.progress_percent || 0),
    selectionRequired: log.selection_status === 'awaiting_selection',
    selectionStatus: (log.selection_status || 'processing') as Photo3x4SelectionStatus,
    sourceImageId,
    sourcePreviewUrl: buildClientR2PreviewUrl(sourceImageId),
    candidateImageId: log.candidate_image_id || null,
    candidatePreviewUrl: buildClientR2PreviewUrl(log.candidate_image_id || null),
    finalImageId: log.final_image_id || null,
    finalPreviewUrl: buildClientR2PreviewUrl(log.final_image_id || null),
    previewImageId: activePreviewId || null,
    previewUrl: buildClientR2PreviewUrl(activePreviewId || null),
    selectedVariantId: log.selected_variant_id || null,
    recommendedVariantId: log.recommended_variant_id || null,
    generationMode: log.generation_mode || null,
    warnings: parseJsonField<string[]>(log.warnings_json, []),
    validationResult: parseJsonField<Record<string, unknown> | null>(log.validation_result_json, null),
    variants: variants.results.map((variant) => ({
      variantId: variant.id,
      variantSlot: variant.variant_slot,
      imageId: variant.image_id,
      previewUrl: buildClientR2PreviewUrl(variant.image_id),
      score: Number(variant.score || 0),
      recommended: Boolean(variant.recommended),
      warnings: parseJsonField<string[]>(variant.warnings_json, []),
      generationMode: variant.generation_mode,
      promptProfile: variant.prompt_profile || null,
      label: PROMPT_PROFILE_LABELS[(variant.prompt_profile || 'balanced') as PromptProfileId] || 'Phuong an AI',
      validationResult: parseJsonField<Record<string, unknown> | null>(variant.validation_result_json, null),
    })),
    errorCode: log.processing_status === 'failed' ? 'PHOTO_3X4_PIPELINE_FAILED' : null,
    errorMessage: log.error_message || null,
    startedAt: log.processing_started_at || null,
    completedAt: log.processing_completed_at || null,
    selectedAt: log.selection_completed_at || null,
    absoluteSourcePreviewUrl: previewBaseOrigin ? buildAbsoluteR2PreviewUrl(previewBaseOrigin, sourceImageId) : null,
  };
}
