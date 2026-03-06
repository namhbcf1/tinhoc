/**
 * Image Compression Utilities
 * Compress images before upload to reduce file size
 */

import imageCompression from 'browser-image-compression';

/**
 * Compress image with optimal settings
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed file
 */
export async function compressImage(file, options = {}) {
    const defaultOptions = {
        maxSizeMB: 1, // Target 1MB
        maxWidthOrHeight: 2048, // Max dimension
        useWebWorker: true, // Use Web Worker for compression
        fileType: 'image/jpeg',
        initialQuality: 0.85, // Good quality balance
        alwaysKeepResolution: false // Allow downscaling if needed
    };

    try {
        const compressedFile = await imageCompression(file, {
            ...defaultOptions,
            ...options
        });

        const originalSize = file.size;
        const compressedSize = compressedFile.size;
        const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

        console.log('Image compression:', {
            original: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
            compressed: `${(compressedSize / 1024 / 1024).toFixed(2)}MB`,
            reduction: `${reduction}%`
        });

        return compressedFile;
    } catch (error) {
        console.error('Image compression failed:', error);
        // Return original file if compression fails
        return file;
    }
}

/**
 * Compress image with progress callback
 * @param {File} file - Image file to compress
 * @param {Function} onProgress - Progress callback (0-100)
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed file
 */
export async function compressImageWithProgress(file, onProgress, options = {}) {
    // browser-image-compression doesn't support progress callback directly
    // We'll simulate progress for better UX
    if (onProgress) {
        onProgress(10); // Start
    }

    try {
        const compressedFile = await compressImage(file, options);
        
        if (onProgress) {
            onProgress(100); // Complete
        }
        
        return compressedFile;
    } catch (error) {
        if (onProgress) {
            onProgress(100); // Complete even on error
        }
        throw error;
    }
}

/**
 * Check if image needs compression
 * @param {File} file - Image file
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} - True if compression needed
 */
export function needsCompression(file, maxSizeMB = 1) {
    return file.size > maxSizeMB * 1024 * 1024;
}









