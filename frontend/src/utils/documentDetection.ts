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

function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function orderCorners(points) {
    if (!points || points.length !== 4) return null;

    const sums = points.map((point) => point.x + point.y);
    const diffs = points.map((point) => point.x - point.y);

    const topLeft = points[sums.indexOf(Math.min(...sums))];
    const bottomRight = points[sums.indexOf(Math.max(...sums))];
    const topRight = points[diffs.indexOf(Math.max(...diffs))];
    const bottomLeft = points[diffs.indexOf(Math.min(...diffs))];

    const unique = new Set([topLeft, topRight, bottomRight, bottomLeft]);
    if (unique.size !== 4) return null;

    return [topLeft, topRight, bottomRight, bottomLeft];
}

function polygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        area += current.x * next.y - next.x * current.y;
    }
    return Math.abs(area) / 2;
}

function quadBoundingBox(points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

function boxIoU(a, b) {
    const left = Math.max(a.x, b.x);
    const top = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    const intersectionWidth = Math.max(0, right - left);
    const intersectionHeight = Math.max(0, bottom - top);
    const intersection = intersectionWidth * intersectionHeight;
    if (!intersection) return 0;

    const union = a.width * a.height + b.width * b.height - intersection;
    return union > 0 ? intersection / union : 0;
}

function pushUniqueCandidate(pool, candidate, limit = 6) {
    if (!candidate?.ordered) return;

    const box = quadBoundingBox(candidate.ordered);
    const nextCandidate = {
        ...candidate,
        boundingBox: box,
    };

    const duplicateIndex = pool.findIndex((entry) => boxIoU(entry.boundingBox, box) > 0.84);
    if (duplicateIndex >= 0) {
        if (nextCandidate.score > pool[duplicateIndex].score) {
            pool[duplicateIndex] = nextCandidate;
        }
    } else {
        pool.push(nextCandidate);
    }

    pool.sort((a, b) => b.score - a.score);
    if (pool.length > limit) {
        pool.length = limit;
    }
}

function angleAt(prev, current, next) {
    const v1x = prev.x - current.x;
    const v1y = prev.y - current.y;
    const v2x = next.x - current.x;
    const v2y = next.y - current.y;

    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (!mag1 || !mag2) return 0;

    const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cos) * 180 / Math.PI;
}

function estimateBackgroundPalette(imageData, width, height) {
    const { data } = imageData;
    const border = Math.max(6, Math.round(Math.min(width, height) * 0.05));
    const step = Math.max(2, Math.round(Math.min(width, height) / 120));
    const buckets = new Map();

    const sample = (x, y) => {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
        const entry = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
        entry.r += r;
        entry.g += g;
        entry.b += b;
        entry.count += 1;
        buckets.set(key, entry);
    };

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < border; x += step) sample(x, y);
        for (let x = Math.max(0, width - border); x < width; x += step) sample(x, y);
    }

    for (let x = 0; x < width; x += step) {
        for (let y = 0; y < border; y += step) sample(x, y);
        for (let y = Math.max(0, height - border); y < height; y += step) sample(x, y);
    }

    const palette = [...buckets.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .map((entry) => {
            const avgR = entry.r / entry.count;
            const avgG = entry.g / entry.count;
            const avgB = entry.b / entry.count;
            return {
                r: avgR,
                g: avgG,
                b: avgB,
                gray: 0.299 * avgR + 0.587 * avgG + 0.114 * avgB,
            };
        });

    if (palette.length === 0) {
        return [{ r: 255, g: 255, b: 255, gray: 255 }];
    }

    return palette;
}

function minPaletteDistance(r, g, b, grayValue, palette) {
    let minColorDistance = Infinity;
    let minGrayDistance = Infinity;

    for (const sample of palette) {
        const colorDistance = Math.abs(r - sample.r) + Math.abs(g - sample.g) + Math.abs(b - sample.b);
        const grayDistance = Math.abs(grayValue - sample.gray);
        if (colorDistance < minColorDistance) minColorDistance = colorDistance;
        if (grayDistance < minGrayDistance) minGrayDistance = grayDistance;
    }

    return { colorDistance: minColorDistance, grayDistance: minGrayDistance };
}

function dilateBinary(mask, width, height, iterations = 1) {
    let current = mask;

    for (let pass = 0; pass < iterations; pass += 1) {
        const next = new Uint8Array(current.length);
        for (let y = 1; y < height - 1; y += 1) {
            for (let x = 1; x < width - 1; x += 1) {
                let active = 0;
                for (let ky = -1; ky <= 1 && !active; ky += 1) {
                    for (let kx = -1; kx <= 1; kx += 1) {
                        if (current[(y + ky) * width + (x + kx)]) {
                            active = 1;
                            break;
                        }
                    }
                }
                next[y * width + x] = active;
            }
        }
        current = next;
    }

    return current;
}

function erodeBinary(mask, width, height, iterations = 1) {
    let current = mask;

    for (let pass = 0; pass < iterations; pass += 1) {
        const next = new Uint8Array(current.length);
        for (let y = 1; y < height - 1; y += 1) {
            for (let x = 1; x < width - 1; x += 1) {
                let keep = 1;
                for (let ky = -1; ky <= 1 && keep; ky += 1) {
                    for (let kx = -1; kx <= 1; kx += 1) {
                        if (!current[(y + ky) * width + (x + kx)]) {
                            keep = 0;
                            break;
                        }
                    }
                }
                next[y * width + x] = keep;
            }
        }
        current = next;
    }

    return current;
}

function buildDocumentMask(imageData, gray, edges, width, height, overlayRect) {
    const { data } = imageData;
    const palette = estimateBackgroundPalette(imageData, width, height);
    const backgroundMask = new Uint8Array(width * height);
    const visitedBackground = new Uint8Array(width * height);
    const mask = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    const expandX = overlayRect?.width ? overlayRect.width * 0.18 : width * 0.12;
    const expandY = overlayRect?.height ? overlayRect.height * 0.18 : height * 0.12;
    const minX = clamp(Math.floor((overlayRect?.x || 0) - expandX), 0, width - 1);
    const minY = clamp(Math.floor((overlayRect?.y || 0) - expandY), 0, height - 1);
    const maxX = clamp(Math.ceil((overlayRect?.x || 0) + (overlayRect?.width || width) + expandX), 0, width - 1);
    const maxY = clamp(Math.ceil((overlayRect?.y || 0) + (overlayRect?.height || height) + expandY), 0, height - 1);
    const backgroundColorThreshold = palette.length > 1 ? 64 : 48;
    const backgroundGrayThreshold = palette.length > 1 ? 26 : 18;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = y * width + x;
            const pixelIndex = index * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const grayValue = gray[index];
            const { colorDistance, grayDistance } = minPaletteDistance(r, g, b, grayValue, palette);
            const localEdge = edges[index];
            backgroundMask[index] = colorDistance <= backgroundColorThreshold
                && grayDistance <= backgroundGrayThreshold
                && localEdge < 255
                ? 1
                : 0;
        }
    }

    const enqueueIfBackground = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const index = y * width + x;
        if (visitedBackground[index] || !backgroundMask[index]) return;
        visitedBackground[index] = 1;
        queue[tail++] = index;
    };

    for (let x = 0; x < width; x += 1) {
        enqueueIfBackground(x, 0);
        enqueueIfBackground(x, height - 1);
    }

    for (let y = 0; y < height; y += 1) {
        enqueueIfBackground(0, y);
        enqueueIfBackground(width - 1, y);
    }

    while (head < tail) {
        const current = queue[head++];
        const cy = Math.floor(current / width);
        const cx = current - cy * width;

        for (let ny = Math.max(0, cy - 1); ny <= Math.min(height - 1, cy + 1); ny += 1) {
            for (let nx = Math.max(0, cx - 1); nx <= Math.min(width - 1, cx + 1); nx += 1) {
                const nextIndex = ny * width + nx;
                if (visitedBackground[nextIndex] || !backgroundMask[nextIndex]) continue;
                visitedBackground[nextIndex] = 1;
                queue[tail++] = nextIndex;
            }
        }
    }

    for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
            const index = y * width + x;
            mask[index] = visitedBackground[index] ? 0 : 1;
        }
    }

    return erodeBinary(dilateBinary(dilateBinary(mask, width, height, 1), width, height, 1), width, height, 2);
}

function computePcaQuad(points, expectedAspect) {
    if (!points || points.length < 60) return null;

    let meanX = 0;
    let meanY = 0;
    for (const point of points) {
        meanX += point.x;
        meanY += point.y;
    }
    meanX /= points.length;
    meanY /= points.length;

    let covXX = 0;
    let covYY = 0;
    let covXY = 0;
    for (const point of points) {
        const dx = point.x - meanX;
        const dy = point.y - meanY;
        covXX += dx * dx;
        covYY += dy * dy;
        covXY += dx * dy;
    }

    const angle = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
    let ux = Math.cos(angle);
    let uy = Math.sin(angle);
    let vx = -uy;
    let vy = ux;

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;

    for (const point of points) {
        const dx = point.x - meanX;
        const dy = point.y - meanY;
        const projectedU = dx * ux + dy * uy;
        const projectedV = dx * vx + dy * vy;
        if (projectedU < minU) minU = projectedU;
        if (projectedU > maxU) maxU = projectedU;
        if (projectedV < minV) minV = projectedV;
        if (projectedV > maxV) maxV = projectedV;
    }

    let width = maxU - minU;
    let height = maxV - minV;

    if (width < height) {
        const tempU = ux;
        const tempUy = uy;
        ux = vx;
        uy = vy;
        vx = -tempUy;
        vy = tempU;

        const nextMinU = minV;
        const nextMaxU = maxV;
        const nextMinV = minU;
        const nextMaxV = maxU;
        minU = nextMinU;
        maxU = nextMaxU;
        minV = nextMinV;
        maxV = nextMaxV;
        width = maxU - minU;
        height = maxV - minV;
    }

    if (!width || !height) return null;

    const currentAspect = width / height;
    if (currentAspect < expectedAspect) {
        width = height * expectedAspect;
    } else if (currentAspect > expectedAspect * 1.18) {
        height = width / expectedAspect;
    }

    width *= 1.06;
    height *= 1.08;

    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;
    const centerX = meanX + ux * centerU + vx * centerV;
    const centerY = meanY + uy * centerU + vy * centerV;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const corners = [
        { x: centerX - ux * halfWidth - vx * halfHeight, y: centerY - uy * halfWidth - vy * halfHeight },
        { x: centerX + ux * halfWidth - vx * halfHeight, y: centerY + uy * halfWidth - vy * halfHeight },
        { x: centerX + ux * halfWidth + vx * halfHeight, y: centerY + uy * halfWidth + vy * halfHeight },
        { x: centerX - ux * halfWidth + vx * halfHeight, y: centerY - uy * halfWidth + vy * halfHeight },
    ];

    return orderCorners(corners);
}

function quantile(sortedValues, ratio) {
    if (!sortedValues.length) return 0;
    const index = clamp(Math.round((sortedValues.length - 1) * ratio), 0, sortedValues.length - 1);
    return sortedValues[index];
}

function computeProjectedQuad(points, expectedAspect, trimRatio = 0.02) {
    if (!points || points.length < 80) return null;

    let meanX = 0;
    let meanY = 0;
    for (const point of points) {
        meanX += point.x;
        meanY += point.y;
    }
    meanX /= points.length;
    meanY /= points.length;

    let covXX = 0;
    let covYY = 0;
    let covXY = 0;
    for (const point of points) {
        const dx = point.x - meanX;
        const dy = point.y - meanY;
        covXX += dx * dx;
        covYY += dy * dy;
        covXY += dx * dy;
    }

    const angle = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
    let ux = Math.cos(angle);
    let uy = Math.sin(angle);
    let vx = -uy;
    let vy = ux;

    const projectedU = [];
    const projectedV = [];

    for (const point of points) {
        const dx = point.x - meanX;
        const dy = point.y - meanY;
        projectedU.push(dx * ux + dy * uy);
        projectedV.push(dx * vx + dy * vy);
    }

    projectedU.sort((a, b) => a - b);
    projectedV.sort((a, b) => a - b);

    let minU = quantile(projectedU, trimRatio);
    let maxU = quantile(projectedU, 1 - trimRatio);
    let minV = quantile(projectedV, trimRatio);
    let maxV = quantile(projectedV, 1 - trimRatio);

    let width = maxU - minU;
    let height = maxV - minV;
    if (width < height) {
        const nextMinU = minV;
        const nextMaxU = maxV;
        const nextMinV = minU;
        const nextMaxV = maxU;
        minU = nextMinU;
        maxU = nextMaxU;
        minV = nextMinV;
        maxV = nextMaxV;
        const tempUx = ux;
        const tempUy = uy;
        ux = vx;
        uy = vy;
        vx = -tempUy;
        vy = tempUx;
        width = maxU - minU;
        height = maxV - minV;
    }

    if (!width || !height) return null;

    const currentAspect = width / height;
    if (currentAspect < expectedAspect) {
        width = height * expectedAspect;
    } else if (currentAspect > expectedAspect * 1.18) {
        height = width / expectedAspect;
    }

    width *= 1.07;
    height *= 1.10;

    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;
    const centerX = meanX + ux * centerU + vx * centerV;
    const centerY = meanY + uy * centerU + vy * centerV;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return orderCorners([
        { x: centerX - ux * halfWidth - vx * halfHeight, y: centerY - uy * halfWidth - vy * halfHeight },
        { x: centerX + ux * halfWidth - vx * halfHeight, y: centerY + uy * halfWidth - vy * halfHeight },
        { x: centerX + ux * halfWidth + vx * halfHeight, y: centerY + uy * halfWidth + vy * halfHeight },
        { x: centerX - ux * halfWidth + vx * halfHeight, y: centerY - uy * halfWidth + vy * halfHeight },
    ]);
}

function scoreQuad(points, width, height, overlayRect) {
    const ordered = orderCorners(points);
    if (!ordered) return null;

    const [tl, tr, br, bl] = ordered;
    const topWidth = distance(tl, tr);
    const bottomWidth = distance(bl, br);
    const leftHeight = distance(tl, bl);
    const rightHeight = distance(tr, br);

    const minSide = Math.min(topWidth, bottomWidth, leftHeight, rightHeight);
    if (minSide < Math.min(width, height) * 0.08) {
        return null;
    }

    const avgWidth = (topWidth + bottomWidth) / 2;
    const avgHeight = (leftHeight + rightHeight) / 2;
    if (!avgWidth || !avgHeight) {
        return null;
    }

    const expectedAspect = overlayRect?.width && overlayRect?.height
        ? overlayRect.width / overlayRect.height
        : 1.585;
    const aspect = avgWidth / avgHeight;
    const aspectError = Math.abs(aspect - expectedAspect) / expectedAspect;
    if (aspectError > 0.5) {
        return null;
    }

    const area = polygonArea(ordered);
    const areaRatio = area / (width * height);
    if (areaRatio < 0.02 || areaRatio > 0.92) {
        return null;
    }

    const centerX = (tl.x + tr.x + br.x + bl.x) / 4;
    const centerY = (tl.y + tr.y + br.y + bl.y) / 4;
    const targetCenterX = overlayRect?.x !== undefined
        ? overlayRect.x + overlayRect.width / 2
        : width / 2;
    const targetCenterY = overlayRect?.y !== undefined
        ? overlayRect.y + overlayRect.height / 2
        : height / 2;
    const centerDistance = Math.sqrt((centerX - targetCenterX) ** 2 + (centerY - targetCenterY) ** 2);
    const maxCenterDistance = Math.sqrt(width ** 2 + height ** 2) * 0.42;
    if (centerDistance > maxCenterDistance) {
        return null;
    }

    const diag1 = distance(tl, br);
    const diag2 = distance(tr, bl);
    const sideBalance = 1 - Math.min(
        1,
        ((Math.abs(topWidth - bottomWidth) / avgWidth) + (Math.abs(leftHeight - rightHeight) / avgHeight)) / 0.78
    );
    const diagBalance = 1 - Math.min(1, Math.abs(diag1 - diag2) / Math.max(diag1, diag2, 1) / 0.4);

    const angles = [
        angleAt(bl, tl, tr),
        angleAt(tl, tr, br),
        angleAt(tr, br, bl),
        angleAt(br, bl, tl),
    ];
    const anglePenalty = angles.reduce((sum, angle) => sum + Math.abs(90 - angle), 0) / angles.length;
    const angleScore = 1 - Math.min(1, anglePenalty / 40);

    const aspectScore = 1 - Math.min(1, aspectError / 0.3);
    const centerScore = 1 - Math.min(1, centerDistance / maxCenterDistance);
    const areaScore = Math.min(1, areaRatio / 0.2);

    const score =
        aspectScore * 0.28 +
        angleScore * 0.22 +
        sideBalance * 0.15 +
        diagBalance * 0.11 +
        centerScore * 0.14 +
        areaScore * 0.10;

    if (score < 0.5) {
        return null;
    }

    return {
        ordered,
        score,
        metrics: {
            aspectError,
            centerDistance,
            areaRatio,
            anglePenalty,
        },
    };
}

function composeCandidateScore(scored, minX, minY, maxX, maxY, filledArea, width, height, overlayRect) {
    if (!scored) return null;

    const bboxWidth = maxX - minX + 1;
    const bboxHeight = maxY - minY + 1;
    const bboxArea = bboxWidth * bboxHeight;
    if (!bboxArea) return null;

    const fillRatio = filledArea / bboxArea;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const targetCenterX = overlayRect?.x !== undefined
        ? overlayRect.x + overlayRect.width / 2
        : width / 2;
    const targetCenterY = overlayRect?.y !== undefined
        ? overlayRect.y + overlayRect.height / 2
        : height / 2;
    const centerDistance = Math.sqrt((centerX - targetCenterX) ** 2 + (centerY - targetCenterY) ** 2);
    const maxCenterDistance = Math.sqrt(width ** 2 + height ** 2) * 0.45;
    const centerScore = 1 - Math.min(1, centerDistance / maxCenterDistance);
    const densityBoost = Math.min(1, fillRatio / 0.46);
    const areaBoost = Math.min(1, (bboxArea / (width * height)) / 0.32);
    const sizeAgainstOverlay = overlayRect?.width && overlayRect?.height
        ? Math.min(
            1,
            Math.min(bboxWidth / Math.max(overlayRect.width, 1), bboxHeight / Math.max(overlayRect.height, 1)) / 0.78,
        )
        : Math.min(1, (bboxArea / (width * height)) / 0.28);

    return {
        ...scored,
        score:
            scored.score * 0.54 +
            centerScore * 0.14 +
            densityBoost * 0.10 +
            areaBoost * 0.14 +
            sizeAgainstOverlay * 0.08,
        metrics: {
            ...scored.metrics,
            fillRatio,
            bboxAreaRatio: bboxArea / (width * height),
        },
    };
}

function findDocumentCorners(corners, width, height, overlayRect) {
    if (corners.length < 4) return null;

    const candidates = corners.slice(0, Math.min(corners.length, 18));
    let best = null;
    let bestScore = 0;

    for (let a = 0; a < candidates.length - 3; a += 1) {
        for (let b = a + 1; b < candidates.length - 2; b += 1) {
            for (let c = b + 1; c < candidates.length - 1; c += 1) {
                for (let d = c + 1; d < candidates.length; d += 1) {
                    const scored = scoreQuad(
                        [candidates[a], candidates[b], candidates[c], candidates[d]],
                        width,
                        height,
                        overlayRect,
                    );

                    if (scored && scored.score > bestScore) {
                        best = { ...scored, source: 'corner-clusters' };
                        bestScore = scored.score;
                    }
                }
            }
        }
    }

    return best;
}

function findMaskBasedDocumentQuad(imageData, gray, edges, width, height, overlayRect) {
    const mask = buildDocumentMask(imageData, gray, edges, width, height, overlayRect);
    const expectedAspect = overlayRect?.width && overlayRect?.height
        ? overlayRect.width / overlayRect.height
        : 1.585;
    const regionMinX = clamp(Math.floor((overlayRect?.x || 0) - (overlayRect?.width || width) * 0.18), 0, width - 1);
    const regionMinY = clamp(Math.floor((overlayRect?.y || 0) - (overlayRect?.height || height) * 0.18), 0, height - 1);
    const regionMaxX = clamp(Math.ceil((overlayRect?.x || 0) + (overlayRect?.width || width) * 1.18), 0, width - 1);
    const regionMaxY = clamp(Math.ceil((overlayRect?.y || 0) + (overlayRect?.height || height) * 1.18), 0, height - 1);

    const visited = new Uint8Array(mask.length);
    const queue = new Int32Array((regionMaxX - regionMinX + 1) * (regionMaxY - regionMinY + 1));
    const candidates = [];
    const globalPoints = [];
    let globalArea = 0;
    let globalMinX = width;
    let globalMinY = height;
    let globalMaxX = 0;
    let globalMaxY = 0;

    for (let y = regionMinY; y <= regionMaxY; y += 1) {
        for (let x = regionMinX; x <= regionMaxX; x += 1) {
            const index = y * width + x;
            if (!mask[index]) continue;

            globalArea += 1;
            if (globalArea % 3 === 0) {
                globalPoints.push({ x, y });
            }
            if (x < globalMinX) globalMinX = x;
            if (x > globalMaxX) globalMaxX = x;
            if (y < globalMinY) globalMinY = y;
            if (y > globalMaxY) globalMaxY = y;
        }
    }

    if (globalArea >= Math.max(1000, width * height * 0.018)) {
        const globalAxisCandidate = composeCandidateScore(
            scoreQuad([
                { x: globalMinX, y: globalMinY },
                { x: globalMaxX, y: globalMinY },
                { x: globalMaxX, y: globalMaxY },
                { x: globalMinX, y: globalMaxY },
            ], width, height, overlayRect),
            globalMinX,
            globalMinY,
            globalMaxX,
            globalMaxY,
            globalArea,
            width,
            height,
            overlayRect,
        );
        if (globalAxisCandidate) {
            pushUniqueCandidate(candidates, {
                ...globalAxisCandidate,
                source: 'mask-global-bbox',
            });
        }

        const globalPcaQuad = computePcaQuad(globalPoints, expectedAspect);
        const globalPcaCandidate = composeCandidateScore(
            globalPcaQuad ? scoreQuad(globalPcaQuad, width, height, overlayRect) : null,
            globalMinX,
            globalMinY,
            globalMaxX,
            globalMaxY,
            globalArea,
            width,
            height,
            overlayRect,
        );
        if (globalPcaCandidate) {
            pushUniqueCandidate(candidates, {
                ...globalPcaCandidate,
                source: 'mask-global-pca',
            });
        }
    }

    for (let y = regionMinY; y <= regionMaxY; y += 1) {
        for (let x = regionMinX; x <= regionMaxX; x += 1) {
            const start = y * width + x;
            if (!mask[start] || visited[start]) continue;

            let head = 0;
            let tail = 0;
            let area = 0;
            let minX = width;
            let minY = height;
            let maxX = 0;
            let maxY = 0;
            const points = [];

            visited[start] = 1;
            queue[tail++] = start;

            while (head < tail) {
                const current = queue[head++];
                const cy = Math.floor(current / width);
                const cx = current - cy * width;

                area += 1;
                if (area % 4 === 0) {
                    points.push({ x: cx, y: cy });
                }
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;

                for (let ny = Math.max(regionMinY, cy - 1); ny <= Math.min(regionMaxY, cy + 1); ny += 1) {
                    for (let nx = Math.max(regionMinX, cx - 1); nx <= Math.min(regionMaxX, cx + 1); nx += 1) {
                        const nextIndex = ny * width + nx;
                        if (visited[nextIndex] || !mask[nextIndex]) continue;
                        visited[nextIndex] = 1;
                        queue[tail++] = nextIndex;
                    }
                }
            }

            const bboxWidth = maxX - minX + 1;
            const bboxHeight = maxY - minY + 1;
            const bboxArea = bboxWidth * bboxHeight;
            if (area < Math.max(400, width * height * 0.012) || !bboxArea) continue;

            const fillRatio = area / bboxArea;
            if (fillRatio < 0.16) continue;

            const axisAligned = scoreQuad([
                { x: minX, y: minY },
                { x: maxX, y: minY },
                { x: maxX, y: maxY },
                { x: minX, y: maxY },
            ], width, height, overlayRect);

            const pcaQuad = computePcaQuad(points, expectedAspect);
            const pcaScored = pcaQuad ? scoreQuad(pcaQuad, width, height, overlayRect) : null;
            const variants = [
                {
                    scored: composeCandidateScore(axisAligned, minX, minY, maxX, maxY, area, width, height, overlayRect),
                    source: 'mask-bbox',
                },
                {
                    scored: composeCandidateScore(pcaScored, minX, minY, maxX, maxY, area, width, height, overlayRect),
                    source: 'mask-pca',
                },
            ];

            for (const variant of variants) {
                if (!variant.scored) continue;
                pushUniqueCandidate(candidates, {
                    ...variant.scored,
                    source: variant.source,
                });
            }
        }
    }

    return {
        best: candidates[0] || null,
        candidates,
    };
}

function findEdgeEnvelopeDocumentQuad(imageData, gray, edges, width, height, overlayRect) {
    const palette = estimateBackgroundPalette(imageData, width, height);
    const regionMinX = clamp(Math.floor((overlayRect?.x || 0) - (overlayRect?.width || width) * 0.14), 0, width - 1);
    const regionMinY = clamp(Math.floor((overlayRect?.y || 0) - (overlayRect?.height || height) * 0.14), 0, height - 1);
    const regionMaxX = clamp(Math.ceil((overlayRect?.x || 0) + (overlayRect?.width || width) * 1.14), 0, width - 1);
    const regionMaxY = clamp(Math.ceil((overlayRect?.y || 0) + (overlayRect?.height || height) * 1.14), 0, height - 1);
    const expectedAspect = overlayRect?.width && overlayRect?.height
        ? overlayRect.width / overlayRect.height
        : 1.585;

    const points = [];
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    for (let y = regionMinY; y <= regionMaxY; y += 1) {
        for (let x = regionMinX; x <= regionMaxX; x += 1) {
            const index = y * width + x;
            if (!edges[index]) continue;

            const pixelIndex = index * 4;
            const r = imageData.data[pixelIndex];
            const g = imageData.data[pixelIndex + 1];
            const b = imageData.data[pixelIndex + 2];
            const distances = minPaletteDistance(r, g, b, gray[index], palette);
            if (distances.colorDistance < 18 && distances.grayDistance < 8) continue;

            if ((x + y) % 2 === 0) {
                points.push({ x, y });
            }
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }

    if (points.length < 120 || maxX <= minX || maxY <= minY) {
        return null;
    }

    const bboxWidth = maxX - minX + 1;
    const bboxHeight = maxY - minY + 1;
    const bboxArea = bboxWidth * bboxHeight;
    if (bboxArea < width * height * 0.035) {
        return null;
    }

    const quantileQuad = computeProjectedQuad(points, expectedAspect, 0.02);
    const scored = quantileQuad ? scoreQuad(quantileQuad, width, height, overlayRect) : null;
    const composed = composeCandidateScore(
        scored,
        minX,
        minY,
        maxX,
        maxY,
        points.length,
        width,
        height,
        overlayRect,
    );

    return composed
        ? {
            ...composed,
            source: 'edge-envelope',
        }
        : null;
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

    const widthRatio = docWidth / Math.max(overlayWidth, 1);
    const heightRatio = docHeight / Math.max(overlayHeight, 1);
    const sizePenalty =
        Math.abs(1 - widthRatio) * 0.55 +
        Math.abs(1 - heightRatio) * 0.45;
    const centerScore = Math.max(0, 1 - centerDistance / maxDistance);
    const sizeScore = Math.max(0, 1 - sizePenalty / 0.85);
    const inFrame = centerScore > 0.55 && sizeScore > 0.42;
    const confidence = clamp(centerScore * 0.58 + sizeScore * 0.42, 0, 1);

    return { inFrame, confidence, corners, centerScore, sizeScore };
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

        // Build candidates from whole-card mask and corner clusters
        const maskCandidateResult = findMaskBasedDocumentQuad(imageData, blurred, edges, width, height, overlayRect);
        const maskCandidate = maskCandidateResult?.best || null;
        const corners = findCorners(edges, width, height);
        const cornerCandidate = findDocumentCorners(corners, width, height, overlayRect);
        const edgeEnvelopeCandidate = findEdgeEnvelopeDocumentQuad(imageData, blurred, edges, width, height, overlayRect);
        const candidates = [];
        for (const entry of maskCandidateResult?.candidates || []) {
            pushUniqueCandidate(candidates, entry);
        }
        if (cornerCandidate) {
            pushUniqueCandidate(candidates, cornerCandidate);
        }
        if (edgeEnvelopeCandidate) {
            pushUniqueCandidate(candidates, edgeEnvelopeCandidate);
        }

        const candidate = candidates[0] || maskCandidate || cornerCandidate || null;
        const documentCorners = candidate?.ordered || null;

        if (!documentCorners) {
            return { detected: false, confidence: 0, corners: null, angle: 0 };
        }

        // Check if in frame
        const frameCheck = isDocumentInFrame(documentCorners, overlayRect);
        const angle = calculatePerspective(documentCorners);
        const confidence = clamp(
            (candidate?.score || 0) * 0.74 + (frameCheck.confidence || 0) * 0.26,
            0,
            0.99,
        );

        return {
            detected: frameCheck.inFrame || confidence > 0.68,
            confidence,
            corners: documentCorners,
            angle,
            source: candidate?.source || 'unknown',
            rawScore: candidate?.score || 0,
            candidates: candidates.map((entry) => ({
                corners: entry.ordered,
                score: entry.score,
                source: entry.source,
                metrics: entry.metrics,
                boundingBox: entry.boundingBox,
            })),
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
