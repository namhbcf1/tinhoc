/**
 * Document Detection Utilities
 * AI-powered detection for CCCD and documents in camera frame
 */

/**
 * Convert image to grayscale
 */
function toGrayscale(imageData) {
    const gray = new Uint8ClampedArray(imageData.width * imageData.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    return gray;
}

/**
 * Apply Gaussian blur to reduce noise
 */
function gaussianBlur(gray, width, height, radius = 1) {
    const result = new Uint8ClampedArray(gray.length);
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const kernelSum = 16;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * width + (x + kx);
                    const kidx = (ky + 1) * 3 + (kx + 1);
                    sum += gray[idx] * kernel[kidx];
                }
            }
            result[y * width + x] = sum / kernelSum;
        }
    }
    return result;
}

/**
 * Simple edge detection using Sobel operator
 */
function detectEdges(gray, width, height) {
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    const edges = new Uint8ClampedArray(gray.length);
    const threshold = 50;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0;
            let gy = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * width + (x + kx);
                    const kidx = (ky + 1) * 3 + (kx + 1);
                    gx += gray[idx] * sobelX[kidx];
                    gy += gray[idx] * sobelY[kidx];
                }
            }

            const magnitude = Math.sqrt(gx * gx + gy * gy);
            edges[y * width + x] = magnitude > threshold ? 255 : 0;
        }
    }
    return edges;
}

/**
 * Find corners using Harris corner detection (simplified)
 */
function findCorners(edges, width, height) {
    const corners = [];
    const windowSize = 5;
    const threshold = 100000;

    for (let y = windowSize; y < height - windowSize; y += 10) {
        for (let x = windowSize; x < width - windowSize; x += 10) {
            let Ixx = 0, Iyy = 0, Ixy = 0;

            for (let dy = -windowSize; dy <= windowSize; dy++) {
                for (let dx = -windowSize; dx <= windowSize; dx++) {
                    const idx = (y + dy) * width + (x + dx);
                    const edge = edges[idx];
                    Ixx += dx * dx * edge;
                    Iyy += dy * dy * edge;
                    Ixy += dx * dy * edge;
                }
            }

            const det = Ixx * Iyy - Ixy * Ixy;
            const trace = Ixx + Iyy;
            const response = det - 0.04 * trace * trace;

            if (response > threshold) {
                corners.push({ x, y, response });
            }
        }
    }

    // Sort by response and return top corners
    corners.sort((a, b) => b.response - a.response);
    return corners.slice(0, 20); // Return top 20 corners
}

/**
 * Find document corners using edge detection and corner detection
 */
function findDocumentCorners(corners, width, height) {
    if (corners.length < 4) return null;

    // Find corners near the edges (likely document corners)
    const edgeThreshold = Math.min(width, height) * 0.1;
    const documentCorners = [];

    // Top-left
    let minDist = Infinity;
    let topLeft = null;
    for (const corner of corners) {
        const dist = Math.sqrt(corner.x * corner.x + corner.y * corner.y);
        if (dist < minDist && corner.x < width * 0.3 && corner.y < height * 0.3) {
            minDist = dist;
            topLeft = corner;
        }
    }

    // Top-right
    minDist = Infinity;
    let topRight = null;
    for (const corner of corners) {
        const dist = Math.sqrt((width - corner.x) ** 2 + corner.y ** 2);
        if (dist < minDist && corner.x > width * 0.7 && corner.y < height * 0.3) {
            minDist = dist;
            topRight = corner;
        }
    }

    // Bottom-left
    minDist = Infinity;
    let bottomLeft = null;
    for (const corner of corners) {
        const dist = Math.sqrt(corner.x ** 2 + (height - corner.y) ** 2);
        if (dist < minDist && corner.x < width * 0.3 && corner.y > height * 0.7) {
            minDist = dist;
            bottomLeft = corner;
        }
    }

    // Bottom-right
    minDist = Infinity;
    let bottomRight = null;
    for (const corner of corners) {
        const dist = Math.sqrt((width - corner.x) ** 2 + (height - corner.y) ** 2);
        if (dist < minDist && corner.x > width * 0.7 && corner.y > height * 0.7) {
            minDist = dist;
            bottomRight = corner;
        }
    }

    if (topLeft && topRight && bottomLeft && bottomRight) {
        return [topLeft, topRight, bottomRight, bottomLeft];
    }

    return null;
}

/**
 * Check if document is in frame based on corners
 */
function isDocumentInFrame(corners, overlayRect) {
    if (!corners || corners.length < 4) return { inFrame: false, confidence: 0 };

    // Calculate document bounding box
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const docCenterX = (minX + maxX) / 2;
    const docCenterY = (minY + maxY) / 2;
    const docWidth = maxX - minX;
    const docHeight = maxY - minY;

    // Check if document center is within overlay
    const overlayCenterX = overlayRect.x + overlayRect.width / 2;
    const overlayCenterY = overlayRect.y + overlayRect.height / 2;
    const overlayWidth = overlayRect.width;
    const overlayHeight = overlayRect.height;

    const centerDistance = Math.sqrt(
        (docCenterX - overlayCenterX) ** 2 + (docCenterY - overlayCenterY) ** 2
    );
    const maxDistance = Math.sqrt(overlayWidth ** 2 + overlayHeight ** 2) * 0.3;

    // Check size match (document should be similar size to overlay)
    const sizeMatch = Math.abs(docWidth - overlayWidth) / overlayWidth < 0.3 &&
                      Math.abs(docHeight - overlayHeight) / overlayHeight < 0.3;

    const inFrame = centerDistance < maxDistance && sizeMatch;
    const confidence = inFrame ? 0.9 : Math.max(0, 1 - centerDistance / maxDistance);

    return { inFrame, confidence, corners };
}

/**
 * Calculate perspective/skew angle
 */
function calculatePerspective(corners) {
    if (!corners || corners.length < 4) return 0;

    // Calculate angles between corners
    const topAngle = Math.atan2(
        corners[1].y - corners[0].y,
        corners[1].x - corners[0].x
    ) * 180 / Math.PI;

    return topAngle;
}

/**
 * Pure detection function (no DOM dependencies)
 * Can be used in Web Worker
 */
export function detectDocumentFromImageData(imageData, overlayRect) {
    try {
        const width = imageData.width;
        const height = imageData.height;

        // Convert to grayscale
        const gray = toGrayscale(imageData);

        // Apply blur
        const blurred = gaussianBlur(gray, width, height);

        // Detect edges
        const edges = detectEdges(blurred, width, height);

        // Find corners
        const corners = findCorners(edges, width, height);

        // Find document corners
        const documentCorners = findDocumentCorners(corners, width, height);

        if (!documentCorners) {
            return { detected: false, confidence: 0, corners: null, angle: 0 };
        }

        // Check if in frame
        const frameCheck = isDocumentInFrame(documentCorners, overlayRect);
        const angle = calculatePerspective(documentCorners);

        return {
            detected: frameCheck.inFrame,
            confidence: frameCheck.confidence,
            corners: documentCorners,
            angle,
            boundingBox: {
                x: Math.min(...documentCorners.map(c => c.x)),
                y: Math.min(...documentCorners.map(c => c.y)),
                width: Math.max(...documentCorners.map(c => c.x)) - Math.min(...documentCorners.map(c => c.x)),
                height: Math.max(...documentCorners.map(c => c.y)) - Math.min(...documentCorners.map(c => c.y))
            }
        };
    } catch (error) {
        console.error('Document detection error:', error);
        return { detected: false, confidence: 0, corners: null, angle: 0 };
    }
}

/**
 * Main function to detect document in frame (uses DOM)
 * Falls back to Worker if available
 */
export async function detectDocumentInFrame(video, overlayRect, useWorker = true) {
    if (!video || !video.videoWidth || !video.videoHeight) {
        return { detected: false, confidence: 0, corners: null, angle: 0 };
    }

    try {
        // Create canvas from video frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Use pure function (can be moved to Worker)
        return detectDocumentFromImageData(imageData, overlayRect);
    } catch (error) {
        console.error('Document detection error:', error);
        return { detected: false, confidence: 0, corners: null, angle: 0 };
    }
}

/**
 * Get document quality score
 */
export function getDocumentQuality(canvas, corners) {
    if (!corners || corners.length < 4) {
        return { score: 0, issues: ['Không phát hiện được document'] };
    }

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate average brightness
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
        totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    // Calculate contrast (standard deviation)
    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        variance += (brightness - avgBrightness) ** 2;
    }
    const contrast = Math.sqrt(variance / (data.length / 4));

    const issues = [];
    let score = 100;

    if (avgBrightness < 60) {
        issues.push('Ảnh quá tối');
        score -= 30;
    } else if (avgBrightness > 200) {
        issues.push('Ảnh quá sáng');
        score -= 20;
    }

    if (contrast < 30) {
        issues.push('Độ tương phản thấp');
        score -= 25;
    }

    // Check if corners form a rectangle
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const aspectRatio = width / height;

    if (aspectRatio < 1.3 || aspectRatio > 1.7) {
        issues.push('Tỷ lệ khung hình không đúng');
        score -= 15;
    }

    return { score: Math.max(0, score), issues };
}

