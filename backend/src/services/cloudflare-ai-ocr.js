/**
 * Cloudflare Workers AI OCR Service
 * Uses GEMMA-4-26B (latest 2026 model) as primary OCR engine
 * Falls back to Llama 3.2 Vision, then OCR.space
 */

import { parseOCRTextToPrefill } from './cccd-ocr-service.js';

// Primary model: GEMMA-4 (requested by user, latest 2026)
const PRIMARY_MODEL = '@cf/google/gemma-4-26b-a4b-it';
// Fallback model: Llama 3.2 Vision (proven reliability)
const FALLBACK_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

// Vietnamese CCCD OCR prompt - optimized for GEMMA-4
const CCCD_FRONT_PROMPT = `You are an expert OCR specialist for Vietnamese Citizen Identity Cards (CCCD - Căn cước công dân).

Extract ALL text from this CCCD front card image. Return ONLY the raw extracted text, preserving the original layout as much as possible. Do NOT add any explanation or commentary.

Focus on extracting these fields accurately:
- 12-digit ID number (Số CCCD / No.)
- Full name (Họ và tên / Full name)
- Date of birth (Ngày sinh / Date of birth)
- Gender (Giới tính / Sex) - Nam/Nữ or Male/Female
- Ethnicity (Dân tộc / Ethnicity)
- Nationality (Quốc tịch / Nationality)
- Place of origin (Quê quán / Place of origin)
- Place of residence (Nơi thường trú / Place of residence)

Return the complete raw text with all visible content.`;

const CCCD_BACK_PROMPT = `You are an expert OCR specialist for Vietnamese Citizen Identity Cards (CCCD - Căn cước công dân).

Extract ALL text from this CCCD back card image. Return ONLY the raw extracted text, preserving the original layout as much as possible. Do NOT add any explanation or commentary.

Focus on extracting:
- Issue date (Ngày cấp / Date of issue)
- Any other visible text, numbers, or dates

Return the complete raw text with all visible content.`;

/**
 * Convert image bytes to base64 data URI
 */
function uint8ToBase64(data) {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < data.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, data.length);
    binary += String.fromCharCode.apply(null, Array.from(data.subarray(i, end)));
  }
  return btoa(binary);
}

/**
 * Call Cloudflare Workers AI with vision model
 * @param {object} env - Workers environment with AI binding
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} prompt - OCR prompt text
 * @param {string} model - Model ID to use
 * @returns {Promise<string>} Extracted text
 */
async function callWorkersAI(env, imageBase64, prompt, model) {
  if (!env.AI) {
    throw new Error('AI binding not available - env.AI is undefined');
  }

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail: 'high',
          },
        },
      ],
    },
  ];

  console.log(`[WorkersAI] Calling ${model}...`);

  const response = await env.AI.run(model, {
    messages,
    max_tokens: 2000,
    temperature: 0.1, // Low temperature for deterministic OCR
  });

  const text = response.choices?.[0]?.message?.content || '';

  if (!text.trim()) {
    throw new Error(`${model}: returned empty text`);
  }

  return text;
}

/**
 * Extract text from CCCD image using Workers AI
 * @param {object} env - Workers environment
 * @param {Uint8Array} imageBytes - Image bytes
 * @param {string} type - 'cccd_front' or 'cccd_back'
 * @param {string} model - Model to use (default: primary)
 * @returns {Promise<{text: string, model: string}>}
 */
async function extractWithWorkersAI(env, imageBytes, type, model = PRIMARY_MODEL) {
  const imageBase64 = uint8ToBase64(imageBytes);
  const prompt = type === 'cccd_front' ? CCCD_FRONT_PROMPT : CCCD_BACK_PROMPT;

  try {
    const text = await callWorkersAI(env, imageBase64, prompt, model);
    return { text, model };
  } catch (error) {
    console.error(`[WorkersAI] ${model} failed:`, error.message);

    // Try fallback model if primary failed
    if (model === PRIMARY_MODEL) {
      console.log('[WorkersAI] Falling back to', FALLBACK_MODEL);
      try {
        const text = await callWorkersAI(env, imageBase64, prompt, FALLBACK_MODEL);
        return { text, model: FALLBACK_MODEL };
      } catch (fallbackError) {
        console.error(`[WorkersAI] ${FALLBACK_MODEL} also failed:`, fallbackError.message);
        throw new Error(`Workers AI failed - ${model}: ${error.message}, ${FALLBACK_MODEL}: ${fallbackError.message}`);
      }
    }

    throw error;
  }
}

/**
 * Main entry point: Extract CCCD fields from single image using Workers AI
 * @param {object} env - Workers environment
 * @param {string} imageId - Image ID in R2 or Images
 * @param {string} type - 'cccd_front' or 'cccd_back'
 * @param {object} getImageBytesFn - Function to get image bytes by ID
 * @returns {Promise<{prefill: object, model: string, debug: object}>}
 */
export async function extractRegistrationPrefillFromImageAI(env, imageId, type, getImageBytesFn) {
  const debug = {
    imageSize: 0,
    workersAIStatus: 'pending',
    workersAIText: '',
    workersAIModel: '',
  };

  const imageBytes = await getImageBytesFn(imageId);
  debug.imageSize = imageBytes.length;

  console.log(`[WorkersAI] imageId=${imageId.slice(0, 50)} size=${imageBytes.length} type=${type}`);

  try {
    debug.workersAIStatus = 'calling';
    const { text: extractedText, model: usedModel } = await extractWithWorkersAI(env, imageBytes, type);

    debug.workersAIText = extractedText.slice(0, 800);
    debug.workersAIModel = usedModel;
    debug.workersAIStatus = 'success';

    console.log(`[WorkersAI] Success with ${usedModel}, text (${extractedText.length} chars):`, extractedText.slice(0, 400));

    // Parse extracted text using existing parser
    const parsed = parseOCRTextToPrefill(extractedText, type);

    return { prefill: parsed, model: `WorkersAI/${usedModel}`, debug };
  } catch (error) {
    debug.workersAIStatus = 'error';
    debug.workersAIError = error.message;

    console.error('[WorkersAI] Failed:', error.message);
    throw error;
  }
}

/**
 * Extract from multiple candidates using Workers AI with arbitration
 * @param {object} env - Workers environment
 * @param {Array} candidates - Array of {imageId, label, mode}
 * @param {string} type - 'cccd_front' or 'cccd_back'
 * @param {object} getImageBytesFn - Function to get image bytes
 * @returns {Promise<{prefill: object, model: string, debug: object, arbitration: object}>}
 */
export async function extractRegistrationPrefillFromCandidatesAI(env, candidates, type, getImageBytesFn) {
  const dedupedCandidates = candidates
    .filter((candidate, index, array) =>
      Boolean(candidate?.imageId) &&
      array.findIndex((item) => item.imageId === candidate.imageId) === index
    )
    .sort((left, right) => {
      // Same priority logic as original
      if (type === 'cccd_front') {
        const order = { front: 3, face: 2, full: 1 };
        return (order[right.label] || 0) - (order[left.label] || 0);
      }
      const order = { back: 3, id_back: 2, id_side2: 1 };
      return (order[right.label] || 0) - (order[left.label] || 0);
    });

  if (dedupedCandidates.length === 0) {
    throw new Error('Không có candidate OCR nào để xử lý.');
  }

  const arbitration = {
    selectedImageId: null,
    selectedMode: null,
    selectedLabel: null,
    conflictFields: [],
    candidates: [],
  };

  const successfulResults = [];

  for (const candidate of dedupedCandidates) {
    try {
      const extracted = await extractRegistrationPrefillFromImageAI(
        env,
        candidate.imageId,
        type,
        getImageBytesFn
      );

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

      // Early exit if clear winner
      const rankedSoFar = [...successfulResults].sort((a, b) => b.score - a.score);
      const currentWinner = rankedSoFar[0];
      const currentRunnerUp = rankedSoFar[1] || null;
      const currentLead = currentWinner.score - ((currentRunnerUp?.score) || 0);

      if (
        rankedSoFar.length >= 2 &&
        hasRequiredCriticalFields(currentWinner.prefill, type) &&
        currentLead >= (type === 'cccd_front' ? 18 : 24)
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
    throw new Error('Tất cả candidate Workers AI đều thất bại.');
  }

  successfulResults.sort((a, b) => b.score - a.score);

  const winner = successfulResults[0];
  arbitration.selectedImageId = winner.imageId;
  arbitration.selectedMode = winner.mode;
  arbitration.selectedLabel = winner.label;

  return {
    prefill: winner.prefill,
    model: 'WorkersAI/' + winner.debug.workersAIModel,
    debug: winner.debug,
    arbitration,
  };
}

/**
 * Score a prefill result for quality
 */
function scoreCandidatePrefill(prefill, type) {
  let score = 0;
  const fields = type === 'cccd_front'
    ? ['cccd', 'fullName', 'dateOfBirth', 'gender', 'ethnicity', 'nationality', 'placeOfOrigin', 'placeOfResidence']
    : ['issueDate'];

  const criticalFields = type === 'cccd_front'
    ? ['cccd', 'fullName', 'dateOfBirth']
    : ['issueDate'];

  for (const field of fields) {
    if (prefill[field]) {
      score += criticalFields.includes(field) ? 10 : 5;
    }
  }

  return score;
}

/**
 * Check if prefill has required critical fields
 */
function hasRequiredCriticalFields(prefill, type) {
  const critical = type === 'cccd_front'
    ? ['cccd', 'fullName']
    : ['issueDate'];

  return critical.every(field => Boolean(prefill[field]));
}
