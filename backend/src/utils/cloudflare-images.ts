/**
 * Cloudflare Images Utilities
 * Helper functions for uploading, managing, and generating signed URLs
 * for images stored in Cloudflare Images
 */

import type { Env } from '../types/env.js';

function getAuthHeaders(env: Env): Record<string, string> {
    if ((env as any).CLOUDFLARE_EMAIL) {
        return {
            'X-Auth-Email': (env as any).CLOUDFLARE_EMAIL,
            'X-Auth-Key': env.CLOUDFLARE_IMAGES_API_TOKEN
        };
    }
    return {
        'Authorization': `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}`
    };
}


/**
 * Upload an image to Cloudflare Images
 * @param {Object} env - Worker environment bindings
 * @param {File|Blob} file - Image file to upload
 * @param {Object} metadata - Additional metadata
 * @param {boolean} requireSignedURLs - If true, images are private
 * @returns {Promise<Object>} Upload result with imageId and variants
 */
export async function uploadToCloudflareImages(
    env: Env,
    file: File | Blob,
    metadata: Record<string, string> = {},
    requireSignedURLs = true
): Promise<{ success: boolean; imageId: string; variants: string[]; uploaded: string; metadata: unknown }> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('requireSignedURLs', requireSignedURLs.toString());

        // Add metadata
        if (Object.keys(metadata).length > 0) {
            formData.append('metadata', JSON.stringify(metadata));
        }

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
            {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(env)
                },
                body: formData
            }
        );

        const result = await response.json() as any;

        if (!result.success) {
            throw new Error(result.errors?.[0]?.message || 'Upload to Cloudflare Images failed');
        }

        return {
            success: true,
            imageId: result.result.id,
            variants: result.result.variants,
            uploaded: result.result.uploaded,
            metadata: result.result.meta
        };
    } catch (error) {
        console.error('Cloudflare Images upload error:', error);
        throw error;
    }
}

/**
 * Generate a signed URL for a private image
 * @param {Object} env - Worker environment bindings
 * @param {string} imageId - Cloudflare Images ID
 * @param {number} expiryMinutes - URL expiry time in minutes (default: 60)
 * @returns {Promise<string>} Signed URL
 */
export async function generateSignedImageURL(env: Env, imageId: string, expiryMinutes = 60): Promise<string> {
    try {
        if (!imageId) {
            throw new Error('Image ID is required');
        }

        const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}/signed-url`,
            {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(env),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    expiry: expiryTimestamp
                })
            }
        );

        const result = await response.json() as any;

        if (!result.success) {
            throw new Error(result.errors?.[0]?.message || 'Failed to generate signed URL');
        }

        return result.result?.url;
    } catch (error) {
        console.error('Signed URL generation error:', error);
        throw error;
    }
}

/**
 * Delete an image from Cloudflare Images
 * @param {Object} env - Worker environment bindings
 * @param {string} imageId - Cloudflare Images ID to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCloudflareImage(env: Env, imageId: string): Promise<boolean> {
    try {
        if (!imageId) {
            return false;
        }

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
            {
                method: 'DELETE',
                headers: {
                    ...getAuthHeaders(env)
                }
            }
        );

        const result = await response.json() as any;
        return result.success;
    } catch (error) {
        console.error('Cloudflare Images delete error:', error);
        return false;
    }
}

/**
 * Get image details from Cloudflare Images
 * @param {Object} env - Worker environment bindings
 * @param {string} imageId - Cloudflare Images ID
 * @returns {Promise<Object>} Image details
 */
export async function getImageDetails(env: Env, imageId: string): Promise<unknown> {
    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
            {
                headers: {
                    ...getAuthHeaders(env)
                }
            }
        );

        const result = await response.json() as any;

        if (!result.success) {
            throw new Error('Failed to get image details');
        }

        return result.result;
    } catch (error) {
        console.error('Get image details error:', error);
        throw error;
    }
}

/**
 * Update image metadata
 * @param {Object} env - Worker environment bindings
 * @param {string} imageId - Cloudflare Images ID
 * @param {Object} metadata - New metadata object
 * @returns {Promise<boolean>} Success status
 */
export async function updateImageMetadata(env: Env, imageId: string, metadata: Record<string, string>): Promise<boolean> {
    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
            {
                method: 'PATCH',
                headers: {
                    ...getAuthHeaders(env),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    metadata
                })
            }
        );

        const result = await response.json() as any;
        return result.success;
    } catch (error) {
        console.error('Update metadata error:', error);
        return false;
    }
}

/**
 * Generate multiple signed URLs at once (for student profile with 3 images)
 * @param {Object} env - Worker environment bindings
 * @param {Object} imageIds - Object with keys: cccd_front, cccd_back, photo_3x4
 * @param {number} expiryMinutes - URL expiry time
 * @returns {Promise<Object>} Object with signed URLs for each image
 */
export async function generateMultipleSignedURLs(
    env: Env,
    imageIds: Record<string, string | null>,
    expiryMinutes = 60
): Promise<Record<string, string | null>> {
    try {
        const urls: Record<string, string | null> = {};

        for (const [key, imageId] of Object.entries(imageIds)) {
            if (imageId) {
                urls[key] = await generateSignedImageURL(env, imageId, expiryMinutes);
            } else {
                urls[key] = null;
            }
        }

        return urls;
    } catch (error) {
        console.error('Generate multiple URLs error:', error);
        throw error;
    }
}

/**
 * Validate image file before upload
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {Object} Validation result
 */
export function validateImageFile(file: File | null | undefined, maxSizeMB = 10): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if file exists
    if (!file) {
        errors.push('No file provided');
        return { valid: false, errors };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        errors.push(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP`);
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: ${maxSizeMB}MB`);
    }

    // Check minimum size (avoid tiny images)
    const minSizeBytes = 10 * 1024; // 10KB
    if (file.size < minSizeBytes) {
        errors.push('File too small. Minimum: 10KB');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Calculate expiry datetime for database storage
 * @param {number} expiryMinutes - Minutes until expiry
 * @returns {string} ISO datetime string
 */
export function calculateExpiryDatetime(expiryMinutes = 60): string {
    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000);
    return expiryDate.toISOString();
}

/**
 * Check if a signed URL has expired
 * @param {string} expiryDatetime - ISO datetime string from database
 * @returns {boolean} True if expired
 */
export function isURLExpired(expiryDatetime: string | null | undefined): boolean {
    if (!expiryDatetime) return true;
    return new Date(expiryDatetime) < new Date();
}
