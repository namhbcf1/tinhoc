// @ts-nocheck
/**
 * Web Worker for Document Detection
 * Runs AI detection off main thread to prevent UI blocking
 */

// Import detection functions (they will be inlined by bundler)
// We need to copy the detection logic here since Workers can't import modules directly

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
function gaussianBlur(gray, width, height) {
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

    corners.sort((a, b) => b.response - a.response);
    return corners.slice(0, 20);
}

/**
 * Find document corners
 */
function findDocumentCorners(corners, width, height) {
    if (corners.length < 4) return null;

    let minDist = Infinity;
    let topLeft = null;
    for (const corner of corners) {
        const dist = Math.sqrt(corner.x * corner.x + corner.y * corner.y);
        if (dist < minDist && corner.x < width * 0.3 && corner.y < height * 0.3) {
            minDist = dist;
            topLeft = corner;
        }
    }

    minDist = Infinity;
    let topRight = null;
    for (const corner of corners) {
        const dist = Math.sqrt((width - corner.x) ** 2 + corner.y ** 2);
        if (dist < minDist && corner.x > width * 0.7 && corner.y < height * 0.3) {
            minDist = dist;
            topRight = corner;
        }
    }

    minDist = Infinity;
    let bottomLeft = null;
    for (const corner of corners) {
        const dist = Math.sqrt(corner.x ** 2 + (height - corner.y) ** 2);
        if (dist < minDist && corner.x < width * 0.3 && corner.y > height * 0.7) {
            minDist = dist;
            bottomLeft = corner;
        }
    }

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
 * Check if document is in frame
 */
function isDocumentInFrame(corners, overlayRect) {
    if (!corners || corners.length < 4) return { inFrame: false, confidence: 0 };

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

    const overlayCenterX = overlayRect.x + overlayRect.width / 2;
    const overlayCenterY = overlayRect.y + overlayRect.height / 2;
    const overlayWidth = overlayRect.width;
    const overlayHeight = overlayRect.height;

    const centerDistance = Math.sqrt(
        (docCenterX - overlayCenterX) ** 2 + (docCenterY - overlayCenterY) ** 2
    );
    const maxDistance = Math.sqrt(overlayWidth ** 2 + overlayHeight ** 2) * 0.3;

    const sizeMatch = Math.abs(docWidth - overlayWidth) / overlayWidth < 0.3 &&
                      Math.abs(docHeight - overlayHeight) / overlayHeight < 0.3;

    const inFrame = centerDistance < maxDistance && sizeMatch;
    const confidence = inFrame ? 0.9 : Math.max(0, 1 - centerDistance / maxDistance);

    return { inFrame, confidence, corners };
}

/**
 * Calculate perspective angle
 */
function calculatePerspective(corners) {
    if (!corners || corners.length < 4) return 0;
    const topAngle = Math.atan2(
        corners[1].y - corners[0].y,
        corners[1].x - corners[0].x
    ) * 180 / Math.PI;
    return topAngle;
}

/**
 * Main detection function
 */
function detectDocument(imageData, overlayRect) {
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
        return {
            detected: false,
            confidence: 0,
            corners: null,
            angle: 0,
            error: error.message
        };
    }
}

// Worker message handler
self.onmessage = function(e) {
    const { imageData, overlayRect } = e.data;
    
    try {
        const result = detectDocument(imageData, overlayRect);
        self.postMessage(result);
    } catch (error) {
        self.postMessage({
            detected: false,
            confidence: 0,
            corners: null,
            angle: 0,
            error: error.message
        });
    }
};
