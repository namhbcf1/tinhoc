/**
 * Google Cloud Vision API — TEXT_DETECTION for CCCD images.
 * Uses Service Account auth via shared google-auth module.
 *
 * Free tier: 1,000 requests/month.
 * Pricing after: $1.50 per 1,000 requests.
 */
import { getGoogleAccessToken } from './google-auth.js';
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
const VISION_SCOPES = ['https://www.googleapis.com/auth/cloud-vision'];
/** Convert Uint8Array to standard base64 (chunked, no stack overflow) */
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
 * Call Google Cloud Vision TEXT_DETECTION and return raw OCR text.
 * Throws on API error or empty result.
 */
export async function extractTextWithGoogleVision(env, imageBytes) {
    const accessToken = await getGoogleAccessToken(env, VISION_SCOPES);
    const base64Image = uint8ToBase64(imageBytes);
    const body = {
        requests: [{
                image: { content: base64Image },
                features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
                imageContext: { languageHints: ['vi'] },
            }],
    };
    const response = await fetch(VISION_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vision API HTTP ${response.status}: ${errorText.slice(0, 500)}`);
    }
    const result = await response.json();
    const firstResponse = result.responses?.[0];
    if (firstResponse?.error) {
        throw new Error(`Vision API error: ${firstResponse.error.message}`);
    }
    // fullTextAnnotation.text has the complete OCR text with layout preserved
    const fullText = firstResponse?.fullTextAnnotation?.text
        || firstResponse?.textAnnotations?.[0]?.description
        || '';
    if (!fullText.trim()) {
        throw new Error('Google Vision: no text detected');
    }
    return fullText;
}
