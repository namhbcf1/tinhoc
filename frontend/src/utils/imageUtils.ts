import imageCompression from 'browser-image-compression';
import heic2any from 'heic2any';

/**
 * Smart Image Processing Utilities for CCCD Upload
 * 
 * Features:
 * - Auto-compression (reduce file size while maintaining quality)
 * - HEIC to JPEG conversion (iPhone support)
 * - Blur detection (Laplacian variance)
 * - Glare detection (brightness analysis)
 * - Dimension validation
 */

/**
 * Convert HEIC image to JPEG
 * @param {File} file - HEIC file
 * @returns {Promise<File>} - Converted JPEG file
 */
export async function convertHeicToJpeg(file) {
    try {
        const blob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9
        });

        // Convert blob to File
        return new File([blob], file.name.replace(/\.heic$/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
        });
    } catch (error) {
        console.error('HEIC conversion failed:', error);
        throw new Error('Không thể chuyển đổi ảnh HEIC. Vui lòng thử lại.');
    }
}

/**
 * Resize image to fit within max dimensions while maintaining aspect ratio
 * @param {File} file - Image file
 * @param {Object} options - Resize options
 * @returns {Promise<File>} - Resized file
 */
export async function resizeImage(file, options = {}) {
    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 0.9,
        maintainAspectRatio = true
    } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            try {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions if image is too large
                if (width > maxWidth || height > maxHeight) {
                    const aspectRatio = width / height;

                    if (width > height) {
                        width = Math.min(width, maxWidth);
                        height = maintainAspectRatio ? width / aspectRatio : Math.min(height, maxHeight);
                    } else {
                        height = Math.min(height, maxHeight);
                        width = maintainAspectRatio ? height * aspectRatio : Math.min(width, maxWidth);
                    }

                    // Ensure dimensions are integers
                    width = Math.round(width);
                    height = Math.round(height);
                }

                // Create canvas and resize
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Enable high quality image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw resized image
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(objectUrl);
                    if (blob) {
                        const resizedFile = new File(
                            [blob],
                            file.name,
                            { type: 'image/jpeg', lastModified: Date.now() }
                        );
                        console.log('Image resized:', {
                            original: `${img.width}x${img.height}`,
                            resized: `${width}x${height}`,
                            originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                            resizedSize: `${(resizedFile.size / 1024 / 1024).toFixed(2)}MB`
                        });
                        resolve(resizedFile);
                    } else {
                        reject(new Error('Không thể resize ảnh'));
                    }
                }, 'image/jpeg', quality);
            } catch (error) {
                URL.revokeObjectURL(objectUrl);
                reject(error);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Không thể đọc ảnh'));
        };

        img.src = objectUrl;
    });
}

/**
 * Compress image to reduce file size
 * @param {File} file - Image file
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed file
 */
export async function compressImage(file, options = {}) {
    const defaultOptions = {
        maxSizeMB: 1, // Target 1MB
        maxWidthOrHeight: 1920, // Max dimension (reduced from 2048)
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.85
    };

    try {
        const compressedFile = await imageCompression(file, {
            ...defaultOptions,
            ...options
        });

        console.log('Compression result:', {
            original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
            compressed: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
            reduction: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`
        });

        return compressedFile;
    } catch (error) {
        console.error('Compression failed:', error);
        throw new Error('Không thể nén ảnh. Vui lòng thử lại.');
    }
}

/**
 * Detect if image is blurry using Laplacian variance
 * @param {File} file - Image file
 * @returns {Promise<{isBlurry: boolean, score: number}>}
 */
export async function detectBlur(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            // Resize for faster processing
            const maxSize = 500;
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Convert to grayscale and calculate Laplacian variance
            const gray = toGrayscale(imageData);
            const variance = calculateLaplacianVariance(gray, canvas.width, canvas.height);

            // Threshold: < 100 is blurry, 100-300 is acceptable, > 300 is sharp
            const isBlurry = variance < 100;

            console.log('Blur detection:', { variance, isBlurry });

            resolve({
                isBlurry,
                score: variance,
                quality: variance > 300 ? 'excellent' : variance > 150 ? 'good' : variance > 100 ? 'acceptable' : 'poor'
            });
        };

        img.onerror = () => reject(new Error('Không thể đọc ảnh'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Detect glare/overexposure in image
 * @param {File} file - Image file
 * @returns {Promise<{hasGlare: boolean, brightness: number}>}
 */
export async function detectGlare(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            const maxSize = 500;
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Calculate average brightness and count overexposed pixels
            let totalBrightness = 0;
            let overexposedPixels = 0;
            const threshold = 240; // Pixels brighter than this are considered overexposed

            for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                const brightness = (r + g + b) / 3;

                totalBrightness += brightness;
                if (brightness > threshold) overexposedPixels++;
            }

            const avgBrightness = totalBrightness / (imageData.data.length / 4);
            const overexposedPercentage = (overexposedPixels / (imageData.data.length / 4)) * 100;

            // Has glare if > 15% pixels are overexposed or avg brightness > 200
            const hasGlare = overexposedPercentage > 15 || avgBrightness > 200;

            console.log('Glare detection:', { avgBrightness, overexposedPercentage, hasGlare });

            resolve({
                hasGlare,
                brightness: avgBrightness,
                overexposedPercentage
            });
        };

        img.onerror = () => reject(new Error('Không thể đọc ảnh'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Validate image dimensions
 * @param {File} file - Image file
 * @param {Object} minDimensions - Minimum width and height
 * @returns {Promise<{isValid: boolean, width: number, height: number}>}
 */
export async function validateDimensions(file, minDimensions = { width: 600, height: 400 }) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const isValid = img.width >= minDimensions.width && img.height >= minDimensions.height;

            resolve({
                isValid,
                width: img.width,
                height: img.height,
                message: isValid
                    ? 'Kích thước ảnh hợp lệ'
                    : `Ảnh quá nhỏ. Tối thiểu ${minDimensions.width}x${minDimensions.height}px`
            });
        };

        img.onerror = () => reject(new Error('Không thể đọc ảnh'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Process image with all validations and optimizations
 * @param {File} file - Original file
 * @param {Object} options - Processing options
 * @returns {Promise<{file: File, validations: Object}>}
 */
export async function processImage(file, options = {}) {
    const {
        skipCompression = false,
        skipBlurDetection = false,
        skipGlareDetection = false,
        minDimensions = { width: 600, height: 400 }
    } = options;

    let processedFile = file;
    const validations = {};

    try {
        // Step 1: Convert HEIC if needed
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
            console.log('Converting HEIC to JPEG...');
            processedFile = await convertHeicToJpeg(file);
            validations.heicConverted = true;
        }

        // Step 2: Validate dimensions
        const dimensionCheck = await validateDimensions(processedFile, minDimensions);
        validations.dimensions = dimensionCheck;

        if (!dimensionCheck.isValid) {
            throw new Error(dimensionCheck.message);
        }

        // Step 3: Compress image
        if (!skipCompression && processedFile.size > 1024 * 1024) { // > 1MB
            console.log('Compressing image...');
            const originalSize = processedFile.size;
            processedFile = await compressImage(processedFile);
            validations.compressed = {
                originalSize,
                compressedSize: processedFile.size,
                reduction: ((originalSize - processedFile.size) / originalSize * 100).toFixed(1) + '%'
            };
        }

        // Step 4: Blur detection
        if (!skipBlurDetection) {
            console.log('Checking image quality...');
            const blurCheck = await detectBlur(processedFile);
            validations.blur = blurCheck;

            if (blurCheck.isBlurry) {
                console.warn('Image appears blurry');
            }
        }

        // Step 5: Glare detection
        if (!skipGlareDetection) {
            console.log('Checking for glare...');
            const glareCheck = await detectGlare(processedFile);
            validations.glare = glareCheck;

            if (glareCheck.hasGlare) {
                console.warn('Image has glare/overexposure');
            }
        }

        return {
            file: processedFile,
            validations
        };

    } catch (error) {
        console.error('Image processing failed:', error);
        throw error;
    }
}

// Helper functions

function toGrayscale(imageData) {
    const gray = new Uint8ClampedArray(imageData.width * imageData.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return gray;
}

function calculateLaplacianVariance(gray, width, height) {
    // Laplacian kernel
    const kernel = [
        0, 1, 0,
        1, -4, 1,
        0, 1, 0
    ];

    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let value = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * width + (x + kx);
                    const kidx = (ky + 1) * 3 + (kx + 1);
                    value += gray[idx] * kernel[kidx];
                }
            }
            sum += value;
            sumSq += value * value;
            count++;
        }
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);

    return variance;
}
