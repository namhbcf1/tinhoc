import { detectDocumentFromImageData } from '../../utils/documentDetection';

const DOCUMENT_ASPECT = 1.585;
const DOCUMENT_OUTPUT_WIDTH = 1920;
const DOCUMENT_OUTPUT_HEIGHT = Math.round(DOCUMENT_OUTPUT_WIDTH / DOCUMENT_ASPECT);
const ANALYSIS_MAX_EDGE = 1600;

export interface DocumentPoint {
  x: number;
  y: number;
}

export interface DocumentProcessingMeta {
  autoRectified: boolean;
  detectionConfidence: number;
  cornerCount: number;
  qualityWarnings: string[];
  blockingReasons: string[];
  validationStatus: 'accepted' | 'warning' | 'blocked';
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
  usedManualAdjust: boolean;
  qualityScore: number;
  avgBrightness: number;
  sharpness: number;
  matchedTemplate?: string;
  candidateSource?: string;
  candidateMatchScore?: number;
  candidateTotalScore?: number;
  restorationMode?: RestorationMode;
  restorationCandidates?: RestorationCandidateSummary[];
  recommendedCandidate?: RestorationMode;
  differenceGuardScore?: number;
  differenceGuardStatus?: 'pass' | 'warning' | 'fail';
  ocrArbitrationSummary?: string;
  retakeRequiredReason?: string;
}

export interface DocumentNormalizationResult {
  status: 'ready' | 'needs_review' | 'manual' | 'blocked';
  previewUrl: string | null;
  normalizedCanvas: HTMLCanvasElement | null;
  warnings: string[];
  blockingReasons: string[];
  qualityScore: number;
  detectionConfidence: number;
  documentCorners: DocumentPoint[] | null;
  processingMeta: DocumentProcessingMeta;
  artifacts?: DocumentRestorationArtifacts | null;
}

type SourceElement = HTMLImageElement | HTMLCanvasElement;
type UploadType = 'cccd_front' | 'cccd_back';
export type RestorationMode = 'normalized_original' | 'ocr_restore_balanced' | 'ocr_restore_text_priority';

interface DocumentRegionMetrics {
  avgBrightness: number;
  contrast: number;
  darkRatio: number;
  denseDarkRatio: number;
  highlightRatio: number;
  redRatio: number;
  goldRatio: number;
  skinRatio: number;
  sharpness: number;
}

interface DocumentLayoutAssessment {
  score: number;
  ocrUsefulnessScore: number;
  warnings: string[];
  blockingReasons: string[];
  template: string;
}

interface DetectionCandidate {
  corners: DocumentPoint[];
  score: number;
  source?: string;
  metrics?: {
    aspectError?: number;
    centerDistance?: number;
    areaRatio?: number;
    anglePenalty?: number;
  };
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RestorationCandidateSummary {
  mode: RestorationMode;
  label: string;
  selected: boolean;
  qualityScore: number;
  ocrUsefulnessScore: number;
  differenceGuardScore: number;
  differenceGuardStatus: 'pass' | 'warning' | 'fail';
  warnings: string[];
}

export interface DocumentRestorationArtifacts {
  normalizedOriginalCanvas: HTMLCanvasElement | null;
  ocrRestoreBalancedCanvas: HTMLCanvasElement | null;
  ocrRestoreTextPriorityCanvas: HTMLCanvasElement | null;
  recommendedCandidate: RestorationMode;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: DocumentPoint, b: DocumentPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleAt(prev: DocumentPoint, current: DocumentPoint, next: DocumentPoint) {
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

function quadArea(points: DocumentPoint[]) {
  if (!points || points.length !== 4) return 0;
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) * 0.5;
}

function orderCorners(points: DocumentPoint[]) {
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

function normalizeOrientation(points: DocumentPoint[]) {
  if (!points || points.length !== 4) return points;

  let ordered = points.slice();
  const topWidth = distance(ordered[0], ordered[1]);
  const leftHeight = distance(ordered[0], ordered[3]);

  if (topWidth < leftHeight) {
    ordered = [ordered[3], ordered[0], ordered[1], ordered[2]];
  }

  return ordered;
}

function createSourceCanvas(source: SourceElement, maxEdge = 2200) {
  const sourceWidth = source instanceof HTMLImageElement
    ? (source.naturalWidth || source.width)
    : source.width;
  const sourceHeight = source instanceof HTMLImageElement
    ? (source.naturalHeight || source.height)
    : source.height;

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);

  return {
    canvas,
    ctx,
    width,
    height,
    scaleX: sourceWidth / width,
    scaleY: sourceHeight / height,
    sourceWidth,
    sourceHeight,
  };
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivot]) < 1e-8) {
      return null;
    }

    if (maxRow !== pivot) {
      const temp = augmented[pivot];
      augmented[pivot] = augmented[maxRow];
      augmented[maxRow] = temp;
    }

    const pivotValue = augmented[pivot][pivot];
    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function computeInverseHomography(sourceQuad: DocumentPoint[], outputWidth: number, outputHeight: number) {
  const destinationQuad: DocumentPoint[] = [
    { x: 0, y: 0 },
    { x: outputWidth - 1, y: 0 },
    { x: outputWidth - 1, y: outputHeight - 1 },
    { x: 0, y: outputHeight - 1 },
  ];

  const matrix: number[][] = [];
  const vector: number[] = [];

  destinationQuad.forEach((destinationPoint, index) => {
    const sourcePoint = sourceQuad[index];
    const { x: u, y: v } = destinationPoint;
    const { x, y } = sourcePoint;

    matrix.push([u, v, 1, 0, 0, 0, -x * u, -x * v]);
    vector.push(x);
    matrix.push([0, 0, 0, u, v, 1, -y * u, -y * v]);
    vector.push(y);
  });

  const solution = solveLinearSystem(matrix, vector);
  if (!solution) return null;

  const [a, b, c, d, e, f, g, h] = solution;
  return { a, b, c, d, e, f, g, h };
}

function sampleChannel(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channelOffset: number,
) {
  const x0 = clamp(Math.floor(x), 0, width - 1);
  const y0 = clamp(Math.floor(y), 0, height - 1);
  const x1 = clamp(x0 + 1, 0, width - 1);
  const y1 = clamp(y0 + 1, 0, height - 1);
  const dx = x - x0;
  const dy = y - y0;

  const index00 = (y0 * width + x0) * 4 + channelOffset;
  const index10 = (y0 * width + x1) * 4 + channelOffset;
  const index01 = (y1 * width + x0) * 4 + channelOffset;
  const index11 = (y1 * width + x1) * 4 + channelOffset;

  const top = source[index00] * (1 - dx) + source[index10] * dx;
  const bottom = source[index01] * (1 - dx) + source[index11] * dx;
  return top * (1 - dy) + bottom * dy;
}

function warpDocument(
  sourceCanvas: HTMLCanvasElement,
  sourceQuad: DocumentPoint[],
  outputWidth: number,
  outputHeight: number,
) {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;

  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx || !outputCtx) return null;

  const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const outputImageData = outputCtx.createImageData(outputWidth, outputHeight);
  const coefficients = computeInverseHomography(sourceQuad, outputWidth, outputHeight);
  if (!coefficients) return null;

  const { a, b, c, d, e, f, g, h } = coefficients;
  const source = imageData.data;
  const destination = outputImageData.data;

  for (let y = 0; y < outputHeight; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      const denominator = g * x + h * y + 1;
      if (Math.abs(denominator) < 1e-8) continue;

      const sourceX = (a * x + b * y + c) / denominator;
      const sourceY = (d * x + e * y + f) / denominator;
      const destinationIndex = (y * outputWidth + x) * 4;

      if (
        sourceX < 0 || sourceX >= sourceCanvas.width - 1
        || sourceY < 0 || sourceY >= sourceCanvas.height - 1
      ) {
        destination[destinationIndex] = 255;
        destination[destinationIndex + 1] = 255;
        destination[destinationIndex + 2] = 255;
        destination[destinationIndex + 3] = 255;
        continue;
      }

      destination[destinationIndex] = sampleChannel(source, sourceCanvas.width, sourceCanvas.height, sourceX, sourceY, 0);
      destination[destinationIndex + 1] = sampleChannel(source, sourceCanvas.width, sourceCanvas.height, sourceX, sourceY, 1);
      destination[destinationIndex + 2] = sampleChannel(source, sourceCanvas.width, sourceCanvas.height, sourceX, sourceY, 2);
      destination[destinationIndex + 3] = 255;
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}

function resizeCanvas(sourceCanvas: HTMLCanvasElement, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.filter = 'brightness(1.03) contrast(1.07) saturate(1.02)';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  ctx.filter = 'none';
  return canvas;
}

function rotateCanvasToFit(sourceCanvas: HTMLCanvasElement, angleDeg: number) {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const radians = angleDeg * Math.PI / 180;
  const { width, height } = sourceCanvas;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const boundingWidth = Math.abs(width * cos) + Math.abs(height * sin);
  const boundingHeight = Math.abs(width * sin) + Math.abs(height * cos);
  const scale = Math.min(width / Math.max(boundingWidth, 1), height / Math.max(boundingHeight, 1)) * 0.998;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(radians);
  ctx.scale(scale, scale);
  ctx.drawImage(sourceCanvas, -width / 2, -height / 2, width, height);

  return canvas;
}

function cropCanvas(
  sourceCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const safeX = clamp(Math.round(x), 0, Math.max(sourceCanvas.width - safeWidth, 0));
  const safeY = clamp(Math.round(y), 0, Math.max(sourceCanvas.height - safeHeight, 0));

  const canvas = document.createElement('canvas');
  canvas.width = safeWidth;
  canvas.height = safeHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, safeWidth, safeHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    sourceCanvas,
    safeX,
    safeY,
    safeWidth,
    safeHeight,
    0,
    0,
    safeWidth,
    safeHeight,
  );
  return canvas;
}

function cropDocumentByBoundingBox(
  sourceCanvas: HTMLCanvasElement,
  boundingBox: { x: number; y: number; width: number; height: number },
  type: UploadType,
) {
  if (!boundingBox || boundingBox.width <= 0 || boundingBox.height <= 0) {
    return null;
  }

  const padX = boundingBox.width * (type === 'cccd_front' ? 0.12 : 0.1);
  const padTop = boundingBox.height * 0.1;
  const padBottom = boundingBox.height * (type === 'cccd_front' ? 0.18 : 0.15);
  let left = boundingBox.x - padX;
  let top = boundingBox.y - padTop;
  let width = boundingBox.width + padX * 2;
  let height = boundingBox.height + padTop + padBottom;

  const targetAspect = DOCUMENT_ASPECT;
  const currentAspect = width / Math.max(height, 1);
  if (currentAspect > targetAspect) {
    const targetHeight = width / targetAspect;
    const extraHeight = targetHeight - height;
    top -= extraHeight * 0.22;
    height = targetHeight;
  } else {
    const targetWidth = height * targetAspect;
    const extraWidth = targetWidth - width;
    left -= extraWidth / 2;
    width = targetWidth;
  }

  left = clamp(Math.round(left), 0, sourceCanvas.width - 1);
  top = clamp(Math.round(top), 0, sourceCanvas.height - 1);
  width = clamp(Math.round(width), 1, sourceCanvas.width - left);
  height = clamp(Math.round(height), 1, sourceCanvas.height - top);

  const cropped = cropCanvas(sourceCanvas, left, top, width, height);
  if (!cropped) return null;
  const resized = resizeCanvas(cropped, DOCUMENT_OUTPUT_WIDTH, DOCUMENT_OUTPUT_HEIGHT);
  if (!resized) return null;

  return {
    canvas: resized,
    cropRatio: (width * height) / Math.max(1, sourceCanvas.width * sourceCanvas.height),
  };
}

function cloneCanvas(sourceCanvas: HTMLCanvasElement) {
  return cropCanvas(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height);
}

interface NativeWindowCandidate {
  canvas: HTMLCanvasElement;
  source: string;
  score: number;
  cropRatio: number;
}

function buildNativeWindowCandidates(sourceCanvas: HTMLCanvasElement) {
  const candidates: NativeWindowCandidate[] = [];
  const seen = new Set<string>();
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;
  const sourceArea = Math.max(1, sourceWidth * sourceHeight);

  const pushRect = (
    x: number,
    y: number,
    width: number,
    height: number,
    source: string,
    bias = 0,
  ) => {
    const safeWidth = clamp(Math.round(width), 1, sourceWidth);
    const safeHeight = clamp(Math.round(height), 1, sourceHeight);
    const safeX = clamp(Math.round(x), 0, Math.max(sourceWidth - safeWidth, 0));
    const safeY = clamp(Math.round(y), 0, Math.max(sourceHeight - safeHeight, 0));
    const key = `${safeX}:${safeY}:${safeWidth}:${safeHeight}`;
    if (seen.has(key)) return;
    seen.add(key);

    const cropped = cropCanvas(sourceCanvas, safeX, safeY, safeWidth, safeHeight);
    if (!cropped) return;

    const cropRatio = (safeWidth * safeHeight) / sourceArea;
    const aspectScore = clamp(
      1 - Math.abs(safeWidth / Math.max(safeHeight, 1) - DOCUMENT_ASPECT) / 0.18,
      0,
      1,
    );
    const score = clamp(
      aspectScore * 0.7 +
      cropRatio * 0.2 +
      bias * 0.1,
      0,
      1,
    );

    candidates.push({
      canvas: cropped,
      source,
      score,
      cropRatio,
    });
  };

  pushRect(0, 0, sourceWidth, sourceHeight, 'native-frame', 0.88);

  for (const inset of [0.003, 0.006, 0.01, 0.015, 0.02, 0.03, 0.04]) {
    pushRect(
      sourceWidth * inset,
      sourceHeight * inset,
      sourceWidth * (1 - inset * 2),
      sourceHeight * (1 - inset * 2),
      `native-inset-${Math.round(inset * 1000)}`,
      0.84 - inset * 0.6,
    );
  }

  const baseTrimX = Math.max(0, (sourceWidth - sourceHeight * DOCUMENT_ASPECT) / 2);
  const baseTrimY = Math.max(0, (sourceHeight - sourceWidth / DOCUMENT_ASPECT) / 2);
  const shiftRatios = [-0.06, 0, 0.06];

  for (const inset of [0, 0.008, 0.015, 0.024]) {
    if (baseTrimX > 0) {
      const cropWidth = clamp(sourceWidth - (baseTrimX + sourceWidth * inset) * 2, 1, sourceWidth);
      const maxOffset = Math.max(0, sourceWidth - cropWidth);
      for (const shift of shiftRatios) {
        const x = maxOffset / 2 + maxOffset * shift * 0.5;
        pushRect(
          x,
          sourceHeight * inset,
          cropWidth,
          sourceHeight * (1 - inset * 2),
          `native-aspect-x-${Math.round(inset * 1000)}-${Math.round((shift + 0.2) * 100)}`,
          0.92 - inset * 2,
        );
      }
    } else if (baseTrimY > 0) {
      const cropHeight = clamp(sourceHeight - (baseTrimY + sourceHeight * inset) * 2, 1, sourceHeight);
      const maxOffset = Math.max(0, sourceHeight - cropHeight);
      for (const shift of shiftRatios) {
        const y = maxOffset / 2 + maxOffset * shift * 0.5;
        pushRect(
          sourceWidth * inset,
          y,
          sourceWidth * (1 - inset * 2),
          cropHeight,
          `native-aspect-y-${Math.round(inset * 1000)}-${Math.round((shift + 0.2) * 100)}`,
          0.92 - inset * 2,
        );
      }
    }
  }

  return candidates;
}

function collectRegionMetrics(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number },
): DocumentRegionMetrics {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      avgBrightness: 0,
      contrast: 0,
      darkRatio: 0,
      denseDarkRatio: 0,
      highlightRatio: 0,
      redRatio: 0,
      goldRatio: 0,
      skinRatio: 0,
      sharpness: 0,
    };
  }

  const x0 = clamp(Math.floor(region.x * canvas.width), 0, Math.max(canvas.width - 1, 0));
  const y0 = clamp(Math.floor(region.y * canvas.height), 0, Math.max(canvas.height - 1, 0));
  const x1 = clamp(Math.ceil((region.x + region.width) * canvas.width), x0 + 1, canvas.width);
  const y1 = clamp(Math.ceil((region.y + region.height) * canvas.height), y0 + 1, canvas.height);

  const imageData = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const { data, width, height } = imageData;
  let totalBrightness = 0;
  let totalBrightnessSquared = 0;
  let darkPixels = 0;
  let denseDarkPixels = 0;
  let highlightPixels = 0;
  let redPixels = 0;
  let goldPixels = 0;
  let skinPixels = 0;
  let sharpnessAccumulator = 0;
  let sampleCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += gray;
      totalBrightnessSquared += gray * gray;
      sampleCount += 1;

      if (gray < 132) darkPixels += 1;
      if (gray < 92) denseDarkPixels += 1;
      if (gray > 232) highlightPixels += 1;
      if (r > 118 && r > g * 1.1 && r > b * 1.18) redPixels += 1;
      if (r > 120 && g > 92 && b < 140 && r > b * 1.05) goldPixels += 1;
      if (r > 80 && g > 52 && b > 35 && r > g && g > b && (r - b) > 12) skinPixels += 1;

      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const leftIndex = index - 4;
        const rightIndex = index + 4;
        const topIndex = index - width * 4;
        const bottomIndex = index + width * 4;
        const left = 0.299 * data[leftIndex] + 0.587 * data[leftIndex + 1] + 0.114 * data[leftIndex + 2];
        const right = 0.299 * data[rightIndex] + 0.587 * data[rightIndex + 1] + 0.114 * data[rightIndex + 2];
        const top = 0.299 * data[topIndex] + 0.587 * data[topIndex + 1] + 0.114 * data[topIndex + 2];
        const bottom = 0.299 * data[bottomIndex] + 0.587 * data[bottomIndex + 1] + 0.114 * data[bottomIndex + 2];
        sharpnessAccumulator += Math.abs(gray * 4 - left - right - top - bottom);
      }
    }
  }

  const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 0;
  const contrast = sampleCount > 0
    ? Math.sqrt(Math.max(0, totalBrightnessSquared / sampleCount - avgBrightness * avgBrightness))
    : 0;

  return {
    avgBrightness,
    contrast,
    darkRatio: sampleCount > 0 ? darkPixels / sampleCount : 0,
    denseDarkRatio: sampleCount > 0 ? denseDarkPixels / sampleCount : 0,
    highlightRatio: sampleCount > 0 ? highlightPixels / sampleCount : 0,
    redRatio: sampleCount > 0 ? redPixels / sampleCount : 0,
    goldRatio: sampleCount > 0 ? goldPixels / sampleCount : 0,
    skinRatio: sampleCount > 0 ? skinPixels / sampleCount : 0,
    sharpness: sampleCount > 0 ? sharpnessAccumulator / sampleCount : 0,
  };
}

function compareRegionMetrics(edge: DocumentRegionMetrics, inner: DocumentRegionMetrics) {
  return clamp(
    Math.abs(edge.avgBrightness - inner.avgBrightness) / 255 * 0.36 +
    Math.abs(edge.contrast - inner.contrast) / 120 * 0.18 +
    Math.abs(edge.darkRatio - inner.darkRatio) * 0.18 +
    Math.abs(edge.highlightRatio - inner.highlightRatio) * 0.14 +
    Math.abs(edge.sharpness - inner.sharpness) / 120 * 0.14,
    0,
    1,
  );
}

function measureBorderContinuity(canvas: HTMLCanvasElement) {
  const regions = [
    {
      outer: { x: 0.03, y: 0.02, width: 0.94, height: 0.04 },
      inner: { x: 0.03, y: 0.06, width: 0.94, height: 0.04 },
    },
    {
      outer: { x: 0.03, y: 0.94, width: 0.94, height: 0.04 },
      inner: { x: 0.03, y: 0.90, width: 0.94, height: 0.04 },
    },
    {
      outer: { x: 0.02, y: 0.06, width: 0.04, height: 0.88 },
      inner: { x: 0.06, y: 0.06, width: 0.04, height: 0.88 },
    },
    {
      outer: { x: 0.94, y: 0.06, width: 0.04, height: 0.88 },
      inner: { x: 0.90, y: 0.06, width: 0.04, height: 0.88 },
    },
  ];

  const borderDiff = regions.reduce((sum, region) => (
    sum + compareRegionMetrics(
      collectRegionMetrics(canvas, region.outer),
      collectRegionMetrics(canvas, region.inner),
    )
  ), 0) / regions.length;

  return clamp(1 - borderDiff * 1.55, 0, 1);
}

function rangeScore(value: number, min: number, max: number, overshoot = 0.6) {
  if (max <= min) return value >= min ? 1 : 0;
  if (value < min) {
    return clamp(value / Math.max(min, 1e-6), 0, 1);
  }
  if (value > max) {
    const denominator = Math.max(max * overshoot, 1e-6);
    return clamp(1 - (value - max) / denominator, 0, 1);
  }
  return 1;
}

function scoreTextRegion(metrics: DocumentRegionMetrics) {
  return clamp(
    rangeScore(metrics.darkRatio, 0.035, 0.28) * 0.36 +
    rangeScore(metrics.sharpness, 4, 72) * 0.34 +
    rangeScore(metrics.contrast, 14, 96) * 0.22 +
    rangeScore(metrics.highlightRatio, 0, 0.12) * 0.08,
    0,
    1,
  );
}

function scoreQrRegion(metrics: DocumentRegionMetrics) {
  return clamp(
    rangeScore(metrics.denseDarkRatio, 0.08, 0.46) * 0.56 +
    rangeScore(metrics.sharpness, 10, 130) * 0.34 +
    rangeScore(metrics.highlightRatio, 0, 0.08) * 0.10,
    0,
    1,
  );
}

function scorePhotoRegion(metrics: DocumentRegionMetrics) {
  return clamp(
    rangeScore(metrics.contrast, 16, 90) * 0.34 +
    rangeScore(metrics.skinRatio, 0.01, 0.34) * 0.28 +
    rangeScore(metrics.avgBrightness, 68, 210) * 0.18 +
    rangeScore(metrics.sharpness, 3, 72) * 0.20,
    0,
    1,
  );
}

function scoreEmblemRegion(metrics: DocumentRegionMetrics) {
  return clamp(
    rangeScore(metrics.redRatio, 0.008, 0.16) * 0.56 +
    rangeScore(metrics.goldRatio, 0.008, 0.22) * 0.44,
    0,
    1,
  );
}

function scoreChipRegion(metrics: DocumentRegionMetrics) {
  return clamp(
    rangeScore(metrics.goldRatio, 0.03, 0.34) * 0.58 +
    rangeScore(metrics.contrast, 16, 95) * 0.22 +
    rangeScore(metrics.sharpness, 4, 90) * 0.20,
    0,
    1,
  );
}

function scoreFingerprintRegion(metrics: DocumentRegionMetrics) {
  return clamp(
    rangeScore(metrics.denseDarkRatio, 0.10, 0.68) * 0.42 +
    rangeScore(metrics.sharpness, 16, 150) * 0.40 +
    rangeScore(metrics.contrast, 20, 110) * 0.18,
    0,
    1,
  );
}

function measureEdgeCrowding(canvas: HTMLCanvasElement) {
  const bottomEdge = collectRegionMetrics(canvas, { x: 0.06, y: 0.93, width: 0.88, height: 0.04 });
  const bottomInner = collectRegionMetrics(canvas, { x: 0.06, y: 0.84, width: 0.88, height: 0.06 });
  const topEdge = collectRegionMetrics(canvas, { x: 0.06, y: 0.03, width: 0.88, height: 0.04 });
  const topInner = collectRegionMetrics(canvas, { x: 0.06, y: 0.10, width: 0.88, height: 0.06 });

  const bottomScore = clamp(
    (bottomEdge.darkRatio - bottomInner.darkRatio * 0.7) * 2.6
    + (bottomEdge.denseDarkRatio - bottomInner.denseDarkRatio * 0.72) * 2.1
    + (bottomEdge.sharpness - bottomInner.sharpness * 0.78) / 42,
    0,
    1,
  );
  const topScore = clamp(
    (topEdge.darkRatio - topInner.darkRatio * 0.72) * 2.2
    + (topEdge.denseDarkRatio - topInner.denseDarkRatio * 0.74) * 1.9
    + (topEdge.sharpness - topInner.sharpness * 0.8) / 46,
    0,
    1,
  );

  return {
    score: Math.max(bottomScore, topScore),
    bottomScore,
    topScore,
  };
}

type CriticalRegionSpec = {
  key: string;
  role: 'text' | 'qr' | 'mrz' | 'photo' | 'fingerprint' | 'chip' | 'header';
  weight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

function getCriticalRegions(type: UploadType): CriticalRegionSpec[] {
  if (type === 'cccd_front') {
    return [
      { key: 'title', role: 'header', weight: 0.12, x: 0.24, y: 0.10, width: 0.44, height: 0.14 },
      { key: 'qr', role: 'qr', weight: 0.22, x: 0.79, y: 0.03, width: 0.18, height: 0.24 },
      { key: 'portrait', role: 'photo', weight: 0.16, x: 0.02, y: 0.30, width: 0.27, height: 0.57 },
      { key: 'text_main', role: 'text', weight: 0.32, x: 0.33, y: 0.28, width: 0.62, height: 0.48 },
      { key: 'text_wide', role: 'text', weight: 0.18, x: 0.18, y: 0.28, width: 0.76, height: 0.50 },
    ];
  }

  return [
    { key: 'header', role: 'header', weight: 0.12, x: 0.02, y: 0.04, width: 0.48, height: 0.20 },
    { key: 'chip', role: 'chip', weight: 0.14, x: 0.04, y: 0.22, width: 0.22, height: 0.27 },
    { key: 'finger_left', role: 'fingerprint', weight: 0.16, x: 0.49, y: 0.04, width: 0.18, height: 0.35 },
    { key: 'finger_right', role: 'fingerprint', weight: 0.16, x: 0.71, y: 0.04, width: 0.18, height: 0.35 },
    { key: 'mrz', role: 'mrz', weight: 0.28, x: 0.05, y: 0.58, width: 0.90, height: 0.28 },
    { key: 'top_text', role: 'text', weight: 0.14, x: 0.06, y: 0.08, width: 0.62, height: 0.28 },
  ];
}

function restorationLabel(mode: RestorationMode) {
  if (mode === 'normalized_original') return 'normalized_original';
  if (mode === 'ocr_restore_balanced') return 'ocr_restore_balanced';
  return 'ocr_restore_text_priority';
}

function applyRegionCurve(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number },
  options: { contrastBoost?: number; shadowLift?: number; highlightCompress?: number },
) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const x0 = clamp(Math.floor(region.x * canvas.width), 0, Math.max(canvas.width - 1, 0));
  const y0 = clamp(Math.floor(region.y * canvas.height), 0, Math.max(canvas.height - 1, 0));
  const x1 = clamp(Math.ceil((region.x + region.width) * canvas.width), x0 + 1, canvas.width);
  const y1 = clamp(Math.ceil((region.y + region.height) * canvas.height), y0 + 1, canvas.height);
  const imageData = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const { data } = imageData;
  const contrastBoost = options.contrastBoost ?? 0;
  const shadowLift = options.shadowLift ?? 0;
  const highlightCompress = options.highlightCompress ?? 0;

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    let target = luminance;

    if (shadowLift > 0 && luminance < 148) {
      target += (148 - luminance) * shadowLift;
    }
    if (highlightCompress > 0 && luminance > 205) {
      target -= (luminance - 205) * highlightCompress;
    }

    const contrastScale = target >= 128
      ? 1 + contrastBoost * 0.72
      : 1 + contrastBoost * 0.36;
    target = 128 + (target - 128) * contrastScale;
    const gain = clamp(target / Math.max(luminance, 1), 0.82, 1.36);
    data[index] = clamp(Math.round(r * gain), 0, 255);
    data[index + 1] = clamp(Math.round(g * gain), 0, 255);
    data[index + 2] = clamp(Math.round(b * gain), 0, 255);
    data[index + 3] = 255;
  }

  ctx.putImageData(imageData, x0, y0);
}

function applyRestorationPass(
  canvas: HTMLCanvasElement,
  type: UploadType,
  mode: RestorationMode,
  baseSharpness: number,
) {
  if (mode === 'normalized_original') {
    return canvas;
  }

  const regions = getCriticalRegions(type);
  const regionOptions = mode === 'ocr_restore_text_priority'
    ? {
        text: { contrastBoost: 0.12, shadowLift: 0.12, highlightCompress: 0.22 },
        qr: { contrastBoost: 0.10, shadowLift: 0.05, highlightCompress: 0.20 },
        mrz: { contrastBoost: 0.14, shadowLift: 0.10, highlightCompress: 0.22 },
        photo: { contrastBoost: 0.03, shadowLift: 0.08, highlightCompress: 0.12 },
        fingerprint: { contrastBoost: 0.06, shadowLift: 0.05, highlightCompress: 0.14 },
        chip: { contrastBoost: 0.04, shadowLift: 0.05, highlightCompress: 0.12 },
        header: { contrastBoost: 0.09, shadowLift: 0.10, highlightCompress: 0.20 },
      }
    : {
        text: { contrastBoost: 0.08, shadowLift: 0.10, highlightCompress: 0.16 },
        qr: { contrastBoost: 0.06, shadowLift: 0.04, highlightCompress: 0.14 },
        mrz: { contrastBoost: 0.08, shadowLift: 0.08, highlightCompress: 0.16 },
        photo: { contrastBoost: 0.02, shadowLift: 0.06, highlightCompress: 0.08 },
        fingerprint: { contrastBoost: 0.04, shadowLift: 0.04, highlightCompress: 0.10 },
        chip: { contrastBoost: 0.03, shadowLift: 0.04, highlightCompress: 0.08 },
        header: { contrastBoost: 0.06, shadowLift: 0.08, highlightCompress: 0.14 },
      };

  regions.forEach((region) => {
    applyRegionCurve(canvas, region, regionOptions[region.role]);
  });

  applyAdaptiveUnsharpMask(
    canvas,
    mode === 'ocr_restore_text_priority'
      ? Math.max(baseSharpness - 1.8, 3.2)
      : Math.max(baseSharpness - 0.8, 3.4),
  );
  return canvas;
}

function computeRegionDifference(
  referenceCanvas: HTMLCanvasElement,
  candidateCanvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number },
) {
  const refCtx = referenceCanvas.getContext('2d', { willReadFrequently: true });
  const candidateCtx = candidateCanvas.getContext('2d', { willReadFrequently: true });
  if (!refCtx || !candidateCtx) return 1;

  const x0 = clamp(Math.floor(region.x * referenceCanvas.width), 0, Math.max(referenceCanvas.width - 1, 0));
  const y0 = clamp(Math.floor(region.y * referenceCanvas.height), 0, Math.max(referenceCanvas.height - 1, 0));
  const x1 = clamp(Math.ceil((region.x + region.width) * referenceCanvas.width), x0 + 1, referenceCanvas.width);
  const y1 = clamp(Math.ceil((region.y + region.height) * referenceCanvas.height), y0 + 1, referenceCanvas.height);
  const width = x1 - x0;
  const height = y1 - y0;

  const ref = refCtx.getImageData(x0, y0, width, height).data;
  const candidate = candidateCtx.getImageData(x0, y0, width, height).data;
  let delta = 0;
  let samples = 0;

  for (let index = 0; index < ref.length; index += 4) {
    const refLum = 0.299 * ref[index] + 0.587 * ref[index + 1] + 0.114 * ref[index + 2];
    const candidateLum = 0.299 * candidate[index] + 0.587 * candidate[index + 1] + 0.114 * candidate[index + 2];
    delta += Math.abs(refLum - candidateLum);
    samples += 1;
  }

  return samples > 0 ? delta / samples / 255 : 1;
}

function computeDifferenceGuard(
  referenceCanvas: HTMLCanvasElement,
  candidateCanvas: HTMLCanvasElement,
  type: UploadType,
) {
  const regions = getCriticalRegions(type);
  const regionDiffs = regions.map((region) => ({
    ...region,
    diff: computeRegionDifference(referenceCanvas, candidateCanvas, region),
  }));

  const weightedDiff = regionDiffs.reduce((sum, region) => sum + region.diff * region.weight, 0);
  const criticalFail = regionDiffs.some((region) => {
    if (region.role === 'text' || region.role === 'mrz' || region.role === 'qr') {
      return region.diff > 0.19;
    }
    if (region.role === 'photo') {
      return region.diff > 0.23;
    }
    return region.diff > 0.21;
  });

  const status = criticalFail || weightedDiff > 0.17
    ? 'fail'
    : weightedDiff > 0.11
      ? 'warning'
      : 'pass';
  const warnings = status === 'fail'
    ? ['Ban restore da thay doi qua manh vung du lieu quan trong, he thong se bo qua de tranh sai noi dung CCCD.']
    : status === 'warning'
      ? ['Ban restore thay doi kha nhieu so voi ban goc chuan hoa, chi duoc dung neu OCR tot hon ro rang.']
      : [];

  return {
    score: clamp(1 - weightedDiff * 2.8, 0, 1),
    status,
    warnings,
  };
}

function measureProjectionPeakiness(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number },
  axis: 'rows' | 'cols',
) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;

  const x0 = clamp(Math.floor(region.x * canvas.width), 0, Math.max(canvas.width - 1, 0));
  const y0 = clamp(Math.floor(region.y * canvas.height), 0, Math.max(canvas.height - 1, 0));
  const x1 = clamp(Math.ceil((region.x + region.width) * canvas.width), x0 + 1, canvas.width);
  const y1 = clamp(Math.ceil((region.y + region.height) * canvas.height), y0 + 1, canvas.height);
  const width = x1 - x0;
  const height = y1 - y0;
  const { data } = ctx.getImageData(x0, y0, width, height);
  const length = axis === 'rows' ? height : width;
  const projection = new Float32Array(Math.max(length, 1));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      const ink = Math.max(0, 214 - gray);
      projection[axis === 'rows' ? y : x] += ink;
    }
  }

  let sum = 0;
  let squaredSum = 0;
  for (let index = 0; index < projection.length; index += 1) {
    sum += projection[index];
    squaredSum += projection[index] * projection[index];
  }

  const mean = sum / Math.max(projection.length, 1);
  const variance = squaredSum / Math.max(projection.length, 1) - mean * mean;
  const normalizedSpread = Math.sqrt(Math.max(variance, 0)) / Math.max(mean, 1);
  return clamp(normalizedSpread / 0.72, 0, 1);
}

function measureAnchorCentroid(
  canvas: HTMLCanvasElement,
  region: { x: number; y: number; width: number; height: number },
  mode: 'emblem' | 'qr' | 'photo',
) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const x0 = clamp(Math.floor(region.x * canvas.width), 0, Math.max(canvas.width - 1, 0));
  const y0 = clamp(Math.floor(region.y * canvas.height), 0, Math.max(canvas.height - 1, 0));
  const x1 = clamp(Math.ceil((region.x + region.width) * canvas.width), x0 + 1, canvas.width);
  const y1 = clamp(Math.ceil((region.y + region.height) * canvas.height), y0 + 1, canvas.height);
  const width = x1 - x0;
  const height = y1 - y0;
  const { data } = ctx.getImageData(x0, y0, width, height);

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      let weight = 0;

      if (mode === 'emblem') {
        const redWeight = r > 116 && r > g * 1.08 && r > b * 1.16 ? (r - Math.max(g, b)) / 120 : 0;
        const goldWeight = r > 124 && g > 88 && b < 150 && r > b * 1.04 ? (r + g - b) / 300 : 0;
        weight = redWeight * 0.7 + goldWeight * 0.5;
      } else if (mode === 'qr') {
        const darkWeight = Math.max(0, 198 - gray) / 198;
        const contrastWeight = gray < 132 ? darkWeight * 1.2 : 0;
        weight = contrastWeight;
      } else {
        const skinWeight = r > 86 && g > 56 && b > 38 && r > g && g > b && (r - b) > 12
          ? (r + g - b) / 360
          : 0;
        const hairWeight = gray < 108 ? (108 - gray) / 108 : 0;
        weight = skinWeight * 0.8 + hairWeight * 0.45;
      }

      if (weight <= 0) continue;
      totalWeight += weight;
      weightedX += (x + 0.5) * weight;
      weightedY += (y + 0.5) * weight;
    }
  }

  if (totalWeight < width * height * 0.0045) {
    return null;
  }

  const normalizedX = clamp(weightedX / Math.max(totalWeight * width, 1), 0, 1);
  const normalizedY = clamp(weightedY / Math.max(totalWeight * height, 1), 0, 1);
  return {
    x: normalizedX,
    y: normalizedY,
    confidence: clamp(totalWeight / Math.max(width * height * 0.035, 1), 0, 1),
  };
}

function scoreAnchorPosition(
  anchor: { x: number; y: number; confidence: number } | null,
  expectedX: number,
  expectedY: number,
  toleranceX: number,
  toleranceY: number,
) {
  if (!anchor) return 0;
  return clamp(
    (1 - Math.abs(anchor.x - expectedX) / Math.max(toleranceX, 1e-6)) * 0.46 +
    (1 - Math.abs(anchor.y - expectedY) / Math.max(toleranceY, 1e-6)) * 0.44 +
    anchor.confidence * 0.10,
    0,
    1,
  );
}

function measureTemplateAnchorAlignment(canvas: HTMLCanvasElement, type: UploadType) {
  if (type !== 'cccd_front') {
    return 0.5;
  }

  const emblem = measureAnchorCentroid(canvas, { x: 0.02, y: 0.02, width: 0.16, height: 0.25 }, 'emblem');
  const qr = measureAnchorCentroid(canvas, { x: 0.79, y: 0.03, width: 0.18, height: 0.24 }, 'qr');
  const photo = measureAnchorCentroid(canvas, { x: 0.02, y: 0.30, width: 0.27, height: 0.57 }, 'photo');

  const emblemScore = scoreAnchorPosition(emblem, 0.46, 0.46, 0.22, 0.22);
  const qrScore = scoreAnchorPosition(qr, 0.5, 0.5, 0.18, 0.18);
  const photoScore = scoreAnchorPosition(photo, 0.46, 0.50, 0.20, 0.24);
  const rowAlignmentScore = emblem && qr
    ? clamp(1 - Math.abs(emblem.y - qr.y) / 0.20, 0, 1)
    : 0;

  return clamp(
    emblemScore * 0.24 +
    qrScore * 0.30 +
    photoScore * 0.24 +
    rowAlignmentScore * 0.22,
    0,
    1,
  );
}

function measureDeskewAnchorScore(canvas: HTMLCanvasElement, type: UploadType) {
  if (type === 'cccd_front') {
    return clamp(
      measureProjectionPeakiness(canvas, { x: 0.24, y: 0.10, width: 0.44, height: 0.14 }, 'rows') * 0.22 +
      measureProjectionPeakiness(canvas, { x: 0.33, y: 0.28, width: 0.62, height: 0.48 }, 'rows') * 0.40 +
      measureProjectionPeakiness(canvas, { x: 0.18, y: 0.28, width: 0.76, height: 0.50 }, 'rows') * 0.18 +
      measureProjectionPeakiness(canvas, { x: 0.79, y: 0.03, width: 0.18, height: 0.24 }, 'cols') * 0.12 +
      measureProjectionPeakiness(canvas, { x: 0.02, y: 0.02, width: 0.16, height: 0.25 }, 'rows') * 0.08,
      0,
      1,
    );
  }

  return clamp(
    measureProjectionPeakiness(canvas, { x: 0.02, y: 0.04, width: 0.48, height: 0.20 }, 'rows') * 0.18 +
    measureProjectionPeakiness(canvas, { x: 0.05, y: 0.58, width: 0.90, height: 0.28 }, 'rows') * 0.42 +
    measureProjectionPeakiness(canvas, { x: 0.06, y: 0.08, width: 0.62, height: 0.28 }, 'rows') * 0.22 +
    measureProjectionPeakiness(canvas, { x: 0.73, y: 0.12, width: 0.18, height: 0.22 }, 'cols') * 0.18,
    0,
    1,
  );
}

function applyTemplateDeskew(sourceCanvas: HTMLCanvasElement, type: UploadType) {
  const evaluateAngle = (angle: number) => {
    const canvas = Math.abs(angle) < 0.001 ? cloneCanvas(sourceCanvas) : rotateCanvasToFit(sourceCanvas, angle);
    if (!canvas) return null;

    const layout = assessVietnameseDocumentLayout(canvas, type);
    const borderContinuity = measureBorderContinuity(canvas);
    const edgeCrowding = measureEdgeCrowding(canvas);
    const anchorScore = measureDeskewAnchorScore(canvas, type);
    const templateAlignment = measureTemplateAnchorAlignment(canvas, type);
    const score = clamp(
      layout.score * 0.28 +
      layout.ocrUsefulnessScore * 0.22 +
      borderContinuity * 0.10 +
      anchorScore * 0.20 +
      templateAlignment * 0.28 -
      edgeCrowding.score * 0.10 -
      Math.abs(angle) * 0.012,
      0,
      1.5,
    );

    return {
      angle,
      canvas,
      layout,
      borderContinuity,
      edgeCrowding,
      anchorScore,
      templateAlignment,
      score,
    };
  };

  const coarseAngles = [0, -2.4, -1.8, -1.2, -0.8, -0.4, 0.4, 0.8, 1.2, 1.8, 2.4];
  const coarseEvaluations = coarseAngles
    .map((angle) => evaluateAngle(angle))
    .filter(Boolean);
  const coarseBest = coarseEvaluations.reduce((best, current) => (
    !best || current.score > best.score ? current : best
  ), null as (ReturnType<typeof evaluateAngle> extends infer T ? Exclude<T, null> : never) | null);

  if (!coarseBest) {
    return cloneCanvas(sourceCanvas);
  }

  const fineAngles = [
    coarseBest.angle - 0.35,
    coarseBest.angle - 0.18,
    coarseBest.angle,
    coarseBest.angle + 0.18,
    coarseBest.angle + 0.35,
  ];
  const fineEvaluations = fineAngles
    .filter((angle, index, list) => list.findIndex((value) => Math.abs(value - angle) < 0.01) === index)
    .map((angle) => evaluateAngle(angle))
    .filter(Boolean);
  const best = fineEvaluations.reduce((candidateBest, current) => (
    !candidateBest || current.score > candidateBest.score ? current : candidateBest
  ), coarseBest);
  const base = coarseEvaluations[0];

  if (
    !base
    || Math.abs(best.angle) < 0.08
    || best.score < base.score + 0.014
    || (best.anchorScore < base.anchorScore + 0.012 && best.templateAlignment < base.templateAlignment + 0.016)
  ) {
    return base?.canvas || cloneCanvas(sourceCanvas);
  }

  return best.canvas;
}

function assessVietnameseDocumentLayout(canvas: HTMLCanvasElement, type: UploadType): DocumentLayoutAssessment {
  const broadLeft = collectRegionMetrics(canvas, { x: 0.03, y: 0.18, width: 0.24, height: 0.64 });
  const broadCenter = collectRegionMetrics(canvas, { x: 0.29, y: 0.16, width: 0.42, height: 0.66 });
  const broadRight = collectRegionMetrics(canvas, { x: 0.73, y: 0.08, width: 0.22, height: 0.72 });
  const spreadScore = (
    scoreTextRegion(broadLeft) * 0.25 +
    scoreTextRegion(broadCenter) * 0.45 +
    scoreTextRegion(broadRight) * 0.30
  );

  let score = 0;
  let ocrUsefulnessScore = 0;
  let template = 'generic';

  if (type === 'cccd_front') {
    const emblem = collectRegionMetrics(canvas, { x: 0.02, y: 0.02, width: 0.16, height: 0.25 });
    const title = collectRegionMetrics(canvas, { x: 0.24, y: 0.10, width: 0.44, height: 0.14 });
    const qr = collectRegionMetrics(canvas, { x: 0.79, y: 0.03, width: 0.18, height: 0.24 });
    const photo = collectRegionMetrics(canvas, { x: 0.02, y: 0.30, width: 0.27, height: 0.57 });
    const textMain = collectRegionMetrics(canvas, { x: 0.33, y: 0.28, width: 0.62, height: 0.48 });
    const textWide = collectRegionMetrics(canvas, { x: 0.18, y: 0.28, width: 0.76, height: 0.50 });

    const frontAdultScore = (
      scoreEmblemRegion(emblem) * 0.18 +
      clamp(rangeScore(title.redRatio, 0.006, 0.08) * 0.72 + rangeScore(title.sharpness, 4, 72) * 0.28, 0, 1) * 0.14 +
      scoreQrRegion(qr) * 0.23 +
      scorePhotoRegion(photo) * 0.19 +
      scoreTextRegion(textMain) * 0.20 +
      spreadScore * 0.06
    );

    const frontChildScore = (
      scoreEmblemRegion(emblem) * 0.19 +
      clamp(rangeScore(title.redRatio, 0.006, 0.08) * 0.72 + rangeScore(title.sharpness, 4, 72) * 0.28, 0, 1) * 0.18 +
      scoreQrRegion(qr) * 0.26 +
      scoreTextRegion(textWide) * 0.31 +
      spreadScore * 0.06
    );

    const adultStructuralPass =
      scorePhotoRegion(photo) >= 0.22 &&
      scoreQrRegion(qr) >= 0.20 &&
      scoreTextRegion(textMain) >= 0.20 &&
      scoreEmblemRegion(emblem) >= 0.08;
    const childStructuralPass =
      scoreQrRegion(qr) >= 0.20 &&
      scoreTextRegion(textWide) >= 0.28 &&
      scoreEmblemRegion(emblem) >= 0.08;

    if (frontAdultScore >= frontChildScore) {
      score = frontAdultScore;
      ocrUsefulnessScore = (
        scoreTextRegion(textMain) * 0.40 +
        scoreQrRegion(qr) * 0.18 +
        scorePhotoRegion(photo) * 0.10 +
        scoreEmblemRegion(emblem) * 0.04 +
        spreadScore * 0.20 +
        clamp(rangeScore(title.redRatio, 0.006, 0.08) * 0.72 + rangeScore(title.sharpness, 4, 72) * 0.28, 0, 1) * 0.08
      );
      template = 'vietnam-cccd-front-adult';
      if (!adultStructuralPass) {
        score *= 0.42;
        ocrUsefulnessScore *= 0.54;
      }
    } else {
      score = frontChildScore;
      ocrUsefulnessScore = (
        scoreTextRegion(textWide) * 0.48 +
        scoreQrRegion(qr) * 0.18 +
        scoreEmblemRegion(emblem) * 0.05 +
        spreadScore * 0.21 +
        clamp(rangeScore(title.redRatio, 0.006, 0.08) * 0.72 + rangeScore(title.sharpness, 4, 72) * 0.28, 0, 1) * 0.08
      );
      template = 'vietnam-cccd-front-child';
      if (!childStructuralPass) {
        score *= 0.46;
        ocrUsefulnessScore *= 0.56;
      }
    }
  } else {
    const chip = collectRegionMetrics(canvas, { x: 0.04, y: 0.22, width: 0.22, height: 0.27 });
    const seal = collectRegionMetrics(canvas, { x: 0.24, y: 0.22, width: 0.18, height: 0.23 });
    const header = collectRegionMetrics(canvas, { x: 0.02, y: 0.04, width: 0.48, height: 0.20 });
    const fingerprintLeft = collectRegionMetrics(canvas, { x: 0.49, y: 0.04, width: 0.18, height: 0.35 });
    const fingerprintRight = collectRegionMetrics(canvas, { x: 0.71, y: 0.04, width: 0.18, height: 0.35 });
    const mrz = collectRegionMetrics(canvas, { x: 0.05, y: 0.58, width: 0.90, height: 0.28 });
    const genericQr = collectRegionMetrics(canvas, { x: 0.73, y: 0.12, width: 0.18, height: 0.22 });
    const genericTopText = collectRegionMetrics(canvas, { x: 0.06, y: 0.08, width: 0.62, height: 0.28 });
    const genericBottomText = collectRegionMetrics(canvas, { x: 0.08, y: 0.36, width: 0.82, height: 0.20 });

    const oldBackScore = (
      scoreTextRegion(header) * 0.12 +
      scoreChipRegion(chip) * 0.16 +
      clamp(rangeScore(seal.redRatio, 0.008, 0.16) * 0.65 + rangeScore(seal.sharpness, 6, 84) * 0.35, 0, 1) * 0.10 +
      ((scoreFingerprintRegion(fingerprintLeft) + scoreFingerprintRegion(fingerprintRight)) / 2) * 0.31 +
      scoreTextRegion(mrz) * 0.25 +
      spreadScore * 0.06
    );

    const newBackScore = (
      scoreTextRegion(genericTopText) * 0.24 +
      scoreChipRegion(chip) * 0.20 +
      scoreQrRegion(genericQr) * 0.18 +
      scoreTextRegion(genericBottomText) * 0.18 +
      scoreTextRegion(mrz) * 0.16 +
      spreadScore * 0.04
    );

    const oldBackStructuralPass =
      scoreChipRegion(chip) >= 0.18 &&
      scoreTextRegion(mrz) >= 0.28 &&
      scoreFingerprintRegion(fingerprintLeft) >= 0.28 &&
      scoreFingerprintRegion(fingerprintRight) >= 0.28;
    const newBackStructuralPass =
      scoreChipRegion(chip) >= 0.16 &&
      scoreQrRegion(genericQr) >= 0.18 &&
      scoreTextRegion(genericTopText) >= 0.24 &&
      scoreTextRegion(mrz) >= 0.16;

    if (oldBackScore >= newBackScore) {
      score = oldBackScore;
      ocrUsefulnessScore = (
        scoreTextRegion(mrz) * 0.42 +
        ((scoreFingerprintRegion(fingerprintLeft) + scoreFingerprintRegion(fingerprintRight)) / 2) * 0.18 +
        scoreChipRegion(chip) * 0.08 +
        scoreTextRegion(header) * 0.12 +
        spreadScore * 0.20
      );
      template = 'vietnam-cccd-back-chip';
      if (!oldBackStructuralPass) {
        score *= 0.40;
        ocrUsefulnessScore *= 0.52;
      }
    } else {
      score = newBackScore;
      ocrUsefulnessScore = (
        scoreTextRegion(genericTopText) * 0.28 +
        scoreTextRegion(mrz) * 0.28 +
        scoreQrRegion(genericQr) * 0.18 +
        scoreChipRegion(chip) * 0.08 +
        scoreTextRegion(genericBottomText) * 0.08 +
        spreadScore * 0.10
      );
      template = 'vietnam-can-cuoc-back-2024';
      if (!newBackStructuralPass) {
        score *= 0.44;
        ocrUsefulnessScore *= 0.55;
      }
    }
  }

  const warnings: string[] = [];
  const blockingReasons: string[] = [];

  if (score < 0.62) {
    warnings.push('He thong chua chac da bat dung tron bo the CCCD Viet Nam, ban nen kiem tra QR, anh chan dung, chip, van tay va dong MRZ.');
  }

  if (score < 0.48) {
    blockingReasons.push('He thong chua canh dung toan bo bo cuc CCCD Viet Nam, vui long chup lai hoac chinh tay.');
  }

  return {
    score: clamp(score, 0, 1),
    ocrUsefulnessScore: clamp(ocrUsefulnessScore, 0, 1),
    warnings,
    blockingReasons,
    template,
  };
}

function collectCanvasMetrics(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      avgBrightness: 0,
      sharpness: 0,
      contrast: 0,
      avgEdgeBrightness: 255,
      highlightRatio: 0,
      shadowRatio: 0,
    };
  }

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  let totalBrightness = 0;
  let contrastAccumulator = 0;
  let edgeAccumulator = 0;
  let highlightPixels = 0;
  let shadowPixels = 0;
  let sampleCount = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      totalBrightness += gray;
      sampleCount += 1;
      if (gray > 242) highlightPixels += 1;
      if (gray < 34) shadowPixels += 1;

      const left = 0.299 * data[index - 4] + 0.587 * data[index - 3] + 0.114 * data[index - 2];
      const right = 0.299 * data[index + 4] + 0.587 * data[index + 5] + 0.114 * data[index + 6];
      const top = 0.299 * data[index - width * 4] + 0.587 * data[index - width * 4 + 1] + 0.114 * data[index - width * 4 + 2];
      const bottom = 0.299 * data[index + width * 4] + 0.587 * data[index + width * 4 + 1] + 0.114 * data[index + width * 4 + 2];
      edgeAccumulator += Math.abs(gray * 4 - left - right - top - bottom);
    }
  }

  const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 0;
  const sharpness = sampleCount > 0 ? edgeAccumulator / sampleCount : 0;

  for (let index = 0; index < data.length; index += 4) {
    const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    contrastAccumulator += (gray - avgBrightness) ** 2;
  }

  const edgeMarginX = Math.max(8, Math.round(width * 0.02));
  const edgeMarginY = Math.max(8, Math.round(height * 0.02));
  let edgeBrightness = 0;
  let edgePixels = 0;

  const sampleStrip = (startX: number, startY: number, endX: number, endY: number) => {
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const index = (y * width + x) * 4;
        edgeBrightness += 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
        edgePixels += 1;
      }
    }
  };

  sampleStrip(0, 0, width, edgeMarginY);
  sampleStrip(0, height - edgeMarginY, width, height);
  sampleStrip(0, 0, edgeMarginX, height);
  sampleStrip(width - edgeMarginX, 0, width, height);

  return {
    avgBrightness,
    sharpness,
    contrast: Math.sqrt(contrastAccumulator / Math.max(1, data.length / 4)),
    avgEdgeBrightness: edgePixels > 0 ? edgeBrightness / edgePixels : 255,
    highlightRatio: sampleCount > 0 ? highlightPixels / sampleCount : 0,
    shadowRatio: sampleCount > 0 ? shadowPixels / sampleCount : 0,
  };
}

function percentileFromHistogram(histogram: Uint32Array, total: number, percentile: number) {
  const threshold = total * percentile;
  let cumulative = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value];
    if (cumulative >= threshold) {
      return value;
    }
  }
  return histogram.length - 1;
}

function applyAdaptiveToneMap(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const histogram = new Uint32Array(256);

  for (let index = 0; index < data.length; index += 4) {
    const luminance = Math.round(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]);
    histogram[luminance] += 1;
  }

  const totalPixels = data.length / 4;
  const low = percentileFromHistogram(histogram, totalPixels, 0.025);
  const median = percentileFromHistogram(histogram, totalPixels, 0.5);
  const high = percentileFromHistogram(histogram, totalPixels, 0.985);
  const dynamicRange = Math.max(32, high - low);
  const normalizedMedian = clamp((median - low) / dynamicRange, 0.08, 0.92);
  const gamma = clamp(Math.log(0.56) / Math.log(normalizedMedian), 0.82, 1.18);

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel - minChannel;
    const normalized = clamp((luminance - low) / dynamicRange, 0, 1);
    let mapped = Math.pow(normalized, gamma) * 255;

    if (luminance < 92) {
      mapped += 8;
    }

    if (luminance > 220) {
      mapped = 220 + (mapped - 220) * 0.45;
    }

    if (luminance > 232 && saturation < 42) {
      mapped = Math.min(mapped, 226 + (luminance - 226) * 0.2);
    }

    const gain = clamp(mapped / Math.max(luminance, 1), 0.78, luminance < 110 ? 1.42 : 1.22);
    data[index] = clamp(Math.round(r * gain), 0, 255);
    data[index + 1] = clamp(Math.round(g * gain), 0, 255);
    data[index + 2] = clamp(Math.round(b * gain), 0, 255);
    data[index + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function softenNoise(canvas: HTMLCanvasElement, amount = 0.08) {
  if (amount <= 0) return canvas;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const source = new Uint8ClampedArray(imageData.data);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        let blurred = 0;
        let weight = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const neighborIndex = ((y + ky) * width + (x + kx)) * 4 + channel;
            const kernelWeight = ky === 0 && kx === 0 ? 4 : (ky === 0 || kx === 0 ? 2 : 1);
            blurred += source[neighborIndex] * kernelWeight;
            weight += kernelWeight;
          }
        }
        const original = source[index + channel];
        const blended = original * (1 - amount) + (blurred / weight) * amount;
        data[index + channel] = clamp(Math.round(blended), 0, 255);
      }
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function applyAdaptiveUnsharpMask(canvas: HTMLCanvasElement, baseSharpness: number) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const amount = baseSharpness < 4.8
    ? 0.54
    : baseSharpness < 7.2
      ? 0.38
      : 0.24;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const source = new Uint8ClampedArray(imageData.data);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  const luminance = new Float32Array(width * height);
  const blurred = new Float32Array(width * height);

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    luminance[pixel] = 0.299 * source[index] + 0.587 * source[index + 1] + 0.114 * source[index + 2];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = y * width + x;
      let sum = 0;
      let weight = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const neighborIndex = (y + ky) * width + (x + kx);
          const kernelWeight = ky === 0 && kx === 0 ? 4 : (ky === 0 || kx === 0 ? 2 : 1);
          sum += luminance[neighborIndex] * kernelWeight;
          weight += kernelWeight;
        }
      }
      blurred[pixelIndex] = sum / weight;
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = y * width + x;
      const index = pixelIndex * 4;
      const detail = luminance[pixelIndex] - blurred[pixelIndex];
      const highlightPenalty = luminance[pixelIndex] > 220 ? 0.56 : 1;
      const shadowPenalty = luminance[pixelIndex] < 28 ? 0.45 : 1;
      const delta = clamp(detail * amount * highlightPenalty * shadowPenalty, -24, 24);

      for (let channel = 0; channel < 3; channel += 1) {
        data[index + channel] = clamp(Math.round(source[index + channel] + delta), 0, 255);
      }
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function smoothProfile(profile: Float32Array, radius = 4) {
  const result = new Float32Array(profile.length);
  for (let index = 0; index < profile.length; index += 1) {
    let sum = 0;
    let weight = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const sampleIndex = clamp(index + offset, 0, profile.length - 1);
      const kernel = radius + 1 - Math.abs(offset);
      sum += profile[sampleIndex] * kernel;
      weight += kernel;
    }
    result[index] = weight > 0 ? sum / weight : profile[index];
  }
  return result;
}

function findBoundaryFromSide(
  profile: Float32Array,
  start: number,
  end: number,
  fromStart: boolean,
) {
  const safeStart = clamp(Math.floor(start), 0, Math.max(profile.length - 1, 0));
  const safeEnd = clamp(Math.ceil(end), safeStart + 1, profile.length);
  let peakIndex = safeStart;
  let peakValue = -Infinity;
  let sum = 0;

  for (let index = safeStart; index < safeEnd; index += 1) {
    const value = profile[index];
    sum += value;
    if (value > peakValue) {
      peakValue = value;
      peakIndex = index;
    }
  }

  const mean = sum / Math.max(1, safeEnd - safeStart);
  const confidence = peakValue > 0 ? clamp((peakValue - mean) / Math.max(peakValue, 1), 0, 1) : 0;
  if (!(peakValue > 0)) {
    return { index: peakIndex, value: peakValue, mean, confidence };
  }

  const threshold = Math.max(mean + Math.max(peakValue - mean, 0) * 0.34, mean + 1.1);
  const runLength = Math.max(2, Math.round(profile.length * 0.0035));
  let consecutive = 0;

  if (fromStart) {
    for (let index = safeStart; index < safeEnd; index += 1) {
      consecutive = profile[index] >= threshold ? consecutive + 1 : 0;
      if (consecutive >= runLength) {
        const boundaryIndex = clamp(index - consecutive + 1, safeStart, safeEnd - 1);
        const boundaryValue = profile[boundaryIndex];
        return {
          index: boundaryIndex,
          value: peakValue,
          mean,
          confidence: clamp(
            confidence * 0.7 + clamp(boundaryValue / Math.max(peakValue, 1), 0, 1) * 0.3,
            0,
            1,
          ),
        };
      }
    }
  } else {
    for (let index = safeEnd - 1; index >= safeStart; index -= 1) {
      consecutive = profile[index] >= threshold ? consecutive + 1 : 0;
      if (consecutive >= runLength) {
        const boundaryIndex = clamp(index + consecutive - 1, safeStart, safeEnd - 1);
        const boundaryValue = profile[boundaryIndex];
        return {
          index: boundaryIndex,
          value: peakValue,
          mean,
          confidence: clamp(
            confidence * 0.7 + clamp(boundaryValue / Math.max(peakValue, 1), 0, 1) * 0.3,
            0,
            1,
          ),
        };
      }
    }
  }

  return { index: peakIndex, value: peakValue, mean, confidence };
}

function autoTrimAlignedDocumentCanvas(sourceCanvas: HTMLCanvasElement) {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const { data } = ctx.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    gray[pixel] = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
  }

  const y0 = Math.floor(height * 0.12);
  const y1 = Math.ceil(height * 0.88);
  const x0 = Math.floor(width * 0.08);
  const x1 = Math.ceil(width * 0.92);

  const verticalProfile = new Float32Array(Math.max(1, width - 1));
  const horizontalProfile = new Float32Array(Math.max(1, height - 1));

  for (let x = 0; x < width - 1; x += 1) {
    let diff = 0;
    for (let y = y0; y < y1; y += 1) {
      const pixelIndex = y * width + x;
      diff += Math.abs(gray[pixelIndex] - gray[pixelIndex + 1]);
    }
    verticalProfile[x] = diff / Math.max(1, y1 - y0);
  }

  for (let y = 0; y < height - 1; y += 1) {
    let diff = 0;
    for (let x = x0; x < x1; x += 1) {
      const pixelIndex = y * width + x;
      diff += Math.abs(gray[pixelIndex] - gray[pixelIndex + width]);
    }
    horizontalProfile[y] = diff / Math.max(1, x1 - x0);
  }

  const vertical = smoothProfile(verticalProfile, 5);
  const horizontal = smoothProfile(horizontalProfile, 5);

  const left = findBoundaryFromSide(vertical, width * 0.01, width * 0.24, true);
  const right = findBoundaryFromSide(vertical, width * 0.76, width * 0.99, false);
  const top = findBoundaryFromSide(horizontal, height * 0.01, height * 0.22, true);
  const bottom = findBoundaryFromSide(horizontal, height * 0.78, height * 0.99, false);

  const trimConfidence = (left.confidence + right.confidence + top.confidence + bottom.confidence) / 4;
  if (trimConfidence < 0.22) return null;

  const safetyPadX = Math.max(3, Math.round(width * 0.016));
  const safetyPadTop = Math.max(3, Math.round(height * 0.012));
  const safetyPadBottom = Math.max(4, Math.round(height * 0.028));
  let cropLeft = clamp(left.index - safetyPadX, 0, width - 2);
  let cropRight = clamp(right.index + 1 + safetyPadX, cropLeft + 8, width);
  let cropTop = clamp(top.index - safetyPadTop, 0, height - 2);
  let cropBottom = clamp(bottom.index + 1 + safetyPadBottom, cropTop + 8, height);

  let cropWidth = cropRight - cropLeft;
  let cropHeight = cropBottom - cropTop;
  const cropRatio = (cropWidth * cropHeight) / Math.max(1, width * height);

  if (cropRatio < 0.64 || cropWidth < width * 0.72 || cropHeight < height * 0.72) {
    return null;
  }

  const currentAspect = cropWidth / Math.max(cropHeight, 1);
  if (Math.abs(currentAspect - DOCUMENT_ASPECT) > 0.18) {
    return null;
  }

  if (currentAspect > DOCUMENT_ASPECT) {
    cropWidth = Math.round(cropHeight * DOCUMENT_ASPECT);
  } else {
    cropHeight = Math.round(cropWidth / DOCUMENT_ASPECT);
  }

  const centerX = (cropLeft + cropRight) / 2;
  const centerY = (cropTop + cropBottom) / 2;
  cropLeft = clamp(Math.round(centerX - cropWidth / 2), 0, Math.max(width - cropWidth, 0));
  cropTop = clamp(Math.round(centerY - cropHeight / 2), 0, Math.max(height - cropHeight, 0));

  const cropped = cropCanvas(sourceCanvas, cropLeft, cropTop, cropWidth, cropHeight);
  if (!cropped) return null;

  const resized = resizeCanvas(cropped, DOCUMENT_OUTPUT_WIDTH, DOCUMENT_OUTPUT_HEIGHT);
  if (!resized) return null;

  return {
    canvas: resized,
    confidence: trimConfidence,
    cropRatio,
  };
}

function autoRecropDocumentCanvas(sourceCanvas: HTMLCanvasElement, type: UploadType) {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const overlayWidth = sourceCanvas.width * (type === 'cccd_front' ? 0.78 : 0.8);
  const overlayHeight = Math.min(sourceCanvas.height * 0.78, overlayWidth / DOCUMENT_ASPECT);
  const overlayRect = {
    x: (sourceCanvas.width - overlayWidth) / 2,
    y: (sourceCanvas.height - overlayHeight) / 2,
    width: overlayWidth,
    height: overlayHeight,
  };

  const detection = detectDocumentFromImageData(
    ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height),
    overlayRect,
  );
  const candidates = getDetectionCandidates(detection)
    .map((candidate) => {
      const ordered = orderCorners(candidate.corners);
      if (!ordered) return null;

      const normalizedCorners = normalizeOrientation(ordered);
      const expandedCorners = expandDetectedQuad(normalizedCorners, sourceCanvas.width, sourceCanvas.height, {
        confidence: Number(candidate.score || detection?.confidence || 0),
        source: 'native-tight',
        type,
      });
      const geometry = assessQuadGeometry(expandedCorners, sourceCanvas.width, sourceCanvas.height, candidate.metrics);
      const coverageRatio = quadArea(normalizedCorners) / Math.max(1, sourceCanvas.width * sourceCanvas.height);
      const targetCoverage = type === 'cccd_front' ? 0.56 : 0.6;
      const coverageScore = clamp(1 - Math.abs(coverageRatio - targetCoverage) / 0.28, 0, 1);
      const selectionScore = clamp(
        Number(candidate.score || detection?.confidence || 0) * 0.42
        + geometry.score * 0.36
        + coverageScore * 0.22,
        0,
        1.2,
      );

      return {
        candidate,
        normalizedCorners,
        expandedCorners,
        geometry,
        coverageRatio,
        selectionScore,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.selectionScore - a.selectionScore);

  const bestCandidate = candidates[0];
  if (!bestCandidate) return null;
  if (bestCandidate.coverageRatio < 0.22) return null;
  if (bestCandidate.coverageRatio > 0.82) return null;
  if (bestCandidate.selectionScore < 0.48 && bestCandidate.geometry.score < 0.62) return null;

  const warped = warpDocument(sourceCanvas, bestCandidate.expandedCorners, DOCUMENT_OUTPUT_WIDTH, DOCUMENT_OUTPUT_HEIGHT);
  if (!warped) return null;

  const trimmed = autoTrimAlignedDocumentCanvas(warped);
  const recroppedCanvas = trimmed?.canvas || warped;

  return {
    canvas: recroppedCanvas,
    confidence: Number(bestCandidate.candidate.score || detection?.confidence || 0),
    coverageRatio: bestCandidate.coverageRatio,
    selectionScore: bestCandidate.selectionScore,
    geometryScore: bestCandidate.geometry.score,
  };
}

function sampleDominantBorderPalette(data: Uint8ClampedArray, width: number, height: number) {
  const border = Math.max(6, Math.round(Math.min(width, height) * 0.055));
  const step = Math.max(2, Math.round(Math.min(width, height) / 140));
  const buckets = new Map<string, { r: number; g: number; b: number; gray: number; count: number }>();

  const sample = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const key = `${Math.round(r / 22)}-${Math.round(g / 22)}-${Math.round(b / 22)}`;
    const entry = buckets.get(key) || { r: 0, g: 0, b: 0, gray: 0, count: 0 };
    entry.r += r;
    entry.g += g;
    entry.b += b;
    entry.gray += gray;
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
    .slice(0, 5)
    .map((entry) => ({
      r: entry.r / entry.count,
      g: entry.g / entry.count,
      b: entry.b / entry.count,
      gray: entry.gray / entry.count,
    }));

  return palette.length > 0
    ? palette
    : [{ r: 255, g: 255, b: 255, gray: 255 }];
}

function minPaletteDelta(
  r: number,
  g: number,
  b: number,
  gray: number,
  palette: Array<{ r: number; g: number; b: number; gray: number }>,
) {
  let minColor = Number.POSITIVE_INFINITY;
  let minGray = Number.POSITIVE_INFINITY;

  for (const sample of palette) {
    const colorDelta = Math.abs(r - sample.r) + Math.abs(g - sample.g) + Math.abs(b - sample.b);
    const grayDelta = Math.abs(gray - sample.gray);
    if (colorDelta < minColor) minColor = colorDelta;
    if (grayDelta < minGray) minGray = grayDelta;
  }

  return { colorDelta: minColor, grayDelta: minGray };
}

function dilateMask(mask: Uint8Array, width: number, height: number, iterations = 1) {
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

function erodeMask(mask: Uint8Array, width: number, height: number, iterations = 1) {
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

function autoCropForegroundDocumentCanvas(sourceCanvas: HTMLCanvasElement, type: UploadType) {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const { data } = ctx.getImageData(0, 0, width, height);
  const palette = sampleDominantBorderPalette(data, width, height);
  const mask = new Uint8Array(width * height);
  const centerWeightX = width / 2;
  const centerWeightY = height / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const { colorDelta, grayDelta } = minPaletteDelta(r, g, b, gray, palette);
      const centerBias = 1 - Math.min(1, Math.hypot(x - centerWeightX, y - centerWeightY) / Math.hypot(centerWeightX, centerWeightY));
      const isForeground = colorDelta > 34 || grayDelta > 16 || (centerBias > 0.58 && colorDelta > 24);
      mask[index] = isForeground ? 1 : 0;
    }
  }

  const closedMask = erodeMask(dilateMask(mask, width, height, 2), width, height, 1);
  const visited = new Uint8Array(closedMask.length);
  const queue = new Int32Array(closedMask.length);
  let bestComponent: null | {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    area: number;
    score: number;
  } = null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (!closedMask[start] || visited[start]) continue;

      let head = 0;
      let tail = 0;
      let area = 0;
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;

      visited[start] = 1;
      queue[tail++] = start;

      while (head < tail) {
        const current = queue[head++];
        const cy = Math.floor(current / width);
        const cx = current - cy * width;
        area += 1;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let ny = Math.max(0, cy - 1); ny <= Math.min(height - 1, cy + 1); ny += 1) {
          for (let nx = Math.max(0, cx - 1); nx <= Math.min(width - 1, cx + 1); nx += 1) {
            const next = ny * width + nx;
            if (visited[next] || !closedMask[next]) continue;
            visited[next] = 1;
            queue[tail++] = next;
          }
        }
      }

      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const boxArea = boxWidth * boxHeight;
      if (area < width * height * 0.035 || boxArea <= 0) continue;

      const fillRatio = area / boxArea;
      const aspect = boxWidth / Math.max(boxHeight, 1);
      const areaRatio = boxArea / Math.max(width * height, 1);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerScore = 1 - Math.min(1, Math.hypot(centerX - width / 2, centerY - height / 2) / Math.hypot(width / 2, height / 2));
      const aspectScore = 1 - Math.min(1, Math.abs(aspect - DOCUMENT_ASPECT) / 0.42);
      const areaScore = 1 - Math.min(1, Math.abs(areaRatio - 0.42) / 0.34);
      const fillScore = Math.min(1, fillRatio / 0.68);
      const score = aspectScore * 0.34 + areaScore * 0.28 + centerScore * 0.20 + fillScore * 0.18;

      if (score < 0.52) continue;

      if (!bestComponent || score > bestComponent.score) {
        bestComponent = { minX, minY, maxX, maxY, area, score };
      }
    }
  }

  if (!bestComponent) return null;

  let cropLeft = bestComponent.minX;
  let cropTop = bestComponent.minY;
  let cropWidth = bestComponent.maxX - bestComponent.minX + 1;
  let cropHeight = bestComponent.maxY - bestComponent.minY + 1;
  const padX = Math.round(cropWidth * 0.035);
  const padY = Math.round(cropHeight * 0.04);
  cropLeft = clamp(cropLeft - padX, 0, width - 1);
  cropTop = clamp(cropTop - padY, 0, height - 1);
  cropWidth = clamp(cropWidth + padX * 2, 8, width - cropLeft);
  cropHeight = clamp(cropHeight + padY * 2, 8, height - cropTop);

  const currentAspect = cropWidth / Math.max(cropHeight, 1);
  if (currentAspect > DOCUMENT_ASPECT) {
    cropHeight = Math.round(cropWidth / DOCUMENT_ASPECT);
  } else {
    cropWidth = Math.round(cropHeight * DOCUMENT_ASPECT);
  }

  cropLeft = clamp(Math.round((bestComponent.minX + bestComponent.maxX) / 2 - cropWidth / 2), 0, Math.max(width - cropWidth, 0));
  cropTop = clamp(Math.round((bestComponent.minY + bestComponent.maxY) / 2 - cropHeight / 2), 0, Math.max(height - cropHeight, 0));

  const cropRatio = (cropWidth * cropHeight) / Math.max(width * height, 1);
  if (cropRatio > 0.9 || cropRatio < 0.18) return null;

  const cropped = cropCanvas(sourceCanvas, cropLeft, cropTop, cropWidth, cropHeight);
  if (!cropped) return null;

  const resized = resizeCanvas(cropped, DOCUMENT_OUTPUT_WIDTH, DOCUMENT_OUTPUT_HEIGHT);
  if (!resized) return null;

  return {
    canvas: resized,
    confidence: bestComponent.score,
    cropRatio,
  };
}

function forceFillDocumentCanvas(sourceCanvas: HTMLCanvasElement) {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const { data } = ctx.getImageData(0, 0, width, height);
  const palette = sampleDominantBorderPalette(data, width, height);
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const { colorDelta, grayDelta } = minPaletteDelta(r, g, b, gray, palette);
      mask[index] = colorDelta > 26 || grayDelta > 14 ? 1 : 0;
    }
  }

  const refinedMask = erodeMask(dilateMask(mask, width, height, 2), width, height, 1);
  const rowCounts = new Uint16Array(height);
  const colCounts = new Uint16Array(width);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!refinedMask[y * width + x]) continue;
      rowCounts[y] += 1;
      colCounts[x] += 1;
    }
  }

  const minRowCount = Math.max(8, Math.round(width * 0.22));
  const minColCount = Math.max(8, Math.round(height * 0.18));
  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  while (top < height && rowCounts[top] < minRowCount) top += 1;
  while (bottom > top && rowCounts[bottom] < minRowCount) bottom -= 1;
  while (left < width && colCounts[left] < minColCount) left += 1;
  while (right > left && colCounts[right] < minColCount) right -= 1;

  if (bottom - top < height * 0.34 || right - left < width * 0.34) {
    return null;
  }

  let cropWidth = right - left + 1;
  let cropHeight = bottom - top + 1;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const currentAspect = cropWidth / Math.max(cropHeight, 1);

  if (currentAspect > DOCUMENT_ASPECT) {
    cropHeight = Math.round(cropWidth / DOCUMENT_ASPECT);
  } else {
    cropWidth = Math.round(cropHeight * DOCUMENT_ASPECT);
  }

  const padX = Math.max(1, Math.round(cropWidth * 0.008));
  const padY = Math.max(1, Math.round(cropHeight * 0.008));
  cropWidth = clamp(cropWidth + padX * 2, 8, width);
  cropHeight = clamp(cropHeight + padY * 2, 8, height);

  const cropLeft = clamp(Math.round(centerX - cropWidth / 2), 0, Math.max(width - cropWidth, 0));
  const cropTop = clamp(Math.round(centerY - cropHeight / 2), 0, Math.max(height - cropHeight, 0));
  const cropRatio = (cropWidth * cropHeight) / Math.max(width * height, 1);
  if (cropRatio > 0.94 || cropRatio < 0.22) return null;

  const cropped = cropCanvas(sourceCanvas, cropLeft, cropTop, cropWidth, cropHeight);
  if (!cropped) return null;

  const resized = resizeCanvas(cropped, DOCUMENT_OUTPUT_WIDTH, DOCUMENT_OUTPUT_HEIGHT);
  if (!resized) return null;

  return {
    canvas: resized,
    cropRatio,
    confidence: clamp(1 - Math.abs(cropRatio - 0.62) / 0.32, 0, 1),
  };
}

function forceCropByBackgroundContrast(sourceCanvas: HTMLCanvasElement) {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const { data } = ctx.getImageData(0, 0, width, height);
  const palette = sampleDominantBorderPalette(data, width, height);
  const colCounts = new Uint16Array(width);
  const rowCounts = new Uint16Array(height);
  const sampleTop = Math.floor(height * 0.08);
  const sampleBottom = Math.ceil(height * 0.92);
  const sampleLeft = Math.floor(width * 0.06);
  const sampleRight = Math.ceil(width * 0.94);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const { colorDelta, grayDelta } = minPaletteDelta(r, g, b, gray, palette);
      if (colorDelta <= 22 && grayDelta <= 11) continue;
      if (y >= sampleTop && y < sampleBottom) colCounts[x] += 1;
      if (x >= sampleLeft && x < sampleRight) rowCounts[y] += 1;
    }
  }

  const minColCount = Math.max(12, Math.round((sampleBottom - sampleTop) * 0.30));
  const minRowCount = Math.max(12, Math.round((sampleRight - sampleLeft) * 0.24));

  let left = 0;
  let right = width - 1;
  let top = 0;
  let bottom = height - 1;

  while (left < width && colCounts[left] < minColCount) left += 1;
  while (right > left && colCounts[right] < minColCount) right -= 1;
  while (top < height && rowCounts[top] < minRowCount) top += 1;
  while (bottom > top && rowCounts[bottom] < minRowCount) bottom -= 1;

  if (right - left < width * 0.46 || bottom - top < height * 0.46) return null;

  let cropWidth = right - left + 1;
  let cropHeight = bottom - top + 1;
  const cropRatio = (cropWidth * cropHeight) / Math.max(width * height, 1);
  if (cropRatio > 0.88 || cropRatio < 0.24) return null;

  const currentAspect = cropWidth / Math.max(cropHeight, 1);
  if (currentAspect > DOCUMENT_ASPECT) {
    cropWidth = Math.round(cropHeight * DOCUMENT_ASPECT);
  } else {
    cropHeight = Math.round(cropWidth / DOCUMENT_ASPECT);
  }

  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const cropLeft = clamp(Math.round(centerX - cropWidth / 2), 0, Math.max(width - cropWidth, 0));
  const cropTop = clamp(Math.round(centerY - cropHeight / 2), 0, Math.max(height - cropHeight, 0));
  const cropped = cropCanvas(sourceCanvas, cropLeft, cropTop, cropWidth, cropHeight);
  if (!cropped) return null;

  const resized = resizeCanvas(cropped, DOCUMENT_OUTPUT_WIDTH, DOCUMENT_OUTPUT_HEIGHT);
  if (!resized) return null;

  return {
    canvas: resized,
    cropRatio,
    confidence: clamp(1 - Math.abs(cropRatio - 0.58) / 0.22, 0, 1),
  };
}

function sampleCornerSeeds(data: Uint8ClampedArray, width: number, height: number) {
  const sampleRadius = Math.max(2, Math.round(Math.min(width, height) * 0.018));
  const corners = [
    { x: sampleRadius, y: sampleRadius },
    { x: width - 1 - sampleRadius, y: sampleRadius },
    { x: sampleRadius, y: height - 1 - sampleRadius },
    { x: width - 1 - sampleRadius, y: height - 1 - sampleRadius },
  ];

  return corners.map((corner) => {
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalGray = 0;
    let count = 0;

    for (let y = Math.max(0, corner.y - sampleRadius); y <= Math.min(height - 1, corner.y + sampleRadius); y += 1) {
      for (let x = Math.max(0, corner.x - sampleRadius); x <= Math.min(width - 1, corner.x + sampleRadius); x += 1) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        totalR += r;
        totalG += g;
        totalB += b;
        totalGray += 0.299 * r + 0.587 * g + 0.114 * b;
        count += 1;
      }
    }

    return {
      r: totalR / Math.max(count, 1),
      g: totalG / Math.max(count, 1),
      b: totalB / Math.max(count, 1),
      gray: totalGray / Math.max(count, 1),
    };
  });
}

function buildCornerBackgroundFloodMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seeds = sampleCornerSeeds(data, width, height),
) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const push = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    visited[index] = 1;
    queue[tail++] = index;
  };

  push(0, 0);
  push(width - 1, 0);
  push(0, height - 1);
  push(width - 1, height - 1);

  while (head < tail) {
    const current = queue[head++];
    const y = Math.floor(current / width);
    const x = current - y * width;
    const pixelIndex = current * 4;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const { colorDelta, grayDelta } = minPaletteDelta(r, g, b, gray, seeds);

    if (colorDelta > 42 || grayDelta > 20) {
      visited[current] = 0;
      continue;
    }

    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  return visited;
}

function measureFloodInsets(
  backgroundMask: Uint8Array,
  width: number,
  height: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) {
  const cropWidth = bounds.maxX - bounds.minX + 1;
  const cropHeight = bounds.maxY - bounds.minY + 1;
  const bandHeight = Math.max(6, Math.round(cropHeight * 0.14));
  const bandWidth = Math.max(6, Math.round(cropWidth * 0.14));
  let leftInset = 0;
  let rightInset = 0;
  let topInset = 0;
  let bottomInset = 0;

  for (let y = bounds.minY; y <= Math.min(bounds.maxY, bounds.minY + bandHeight); y += 1) {
    let leftDepth = 0;
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (!backgroundMask[y * width + x]) break;
      leftDepth += 1;
    }
    let rightDepth = 0;
    for (let x = bounds.maxX; x >= bounds.minX; x -= 1) {
      if (!backgroundMask[y * width + x]) break;
      rightDepth += 1;
    }
    leftInset = Math.max(leftInset, leftDepth);
    rightInset = Math.max(rightInset, rightDepth);
  }

  for (let y = Math.max(bounds.minY, bounds.maxY - bandHeight); y <= bounds.maxY; y += 1) {
    let leftDepth = 0;
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (!backgroundMask[y * width + x]) break;
      leftDepth += 1;
    }
    let rightDepth = 0;
    for (let x = bounds.maxX; x >= bounds.minX; x -= 1) {
      if (!backgroundMask[y * width + x]) break;
      rightDepth += 1;
    }
    leftInset = Math.max(leftInset, leftDepth);
    rightInset = Math.max(rightInset, rightDepth);
  }

  for (let x = bounds.minX; x <= Math.min(bounds.maxX, bounds.minX + bandWidth); x += 1) {
    let topDepth = 0;
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      if (!backgroundMask[y * width + x]) break;
      topDepth += 1;
    }
    let bottomDepth = 0;
    for (let y = bounds.maxY; y >= bounds.minY; y -= 1) {
      if (!backgroundMask[y * width + x]) break;
      bottomDepth += 1;
    }
    topInset = Math.max(topInset, topDepth);
    bottomInset = Math.max(bottomInset, bottomDepth);
  }

  for (let x = Math.max(bounds.minX, bounds.maxX - bandWidth); x <= bounds.maxX; x += 1) {
    let topDepth = 0;
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      if (!backgroundMask[y * width + x]) break;
      topDepth += 1;
    }
    let bottomDepth = 0;
    for (let y = bounds.maxY; y >= bounds.minY; y -= 1) {
      if (!backgroundMask[y * width + x]) break;
      bottomDepth += 1;
    }
    topInset = Math.max(topInset, topDepth);
    bottomInset = Math.max(bottomInset, bottomDepth);
  }

  return { leftInset, rightInset, topInset, bottomInset };
}

function forceCropFromCornerBackground(sourceCanvas: HTMLCanvasElement) {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const { data } = ctx.getImageData(0, 0, width, height);
  const seeds = sampleCornerSeeds(data, width, height);
  const visited = buildCornerBackgroundFloodMask(data, width, height, seeds);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let foregroundCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (visited[index]) continue;
      foregroundCount += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (foregroundCount < width * height * 0.22 || maxX <= minX || maxY <= minY) return null;

  const insets = measureFloodInsets(visited, width, height, { minX, minY, maxX, maxY });
  const safetyInsetX = Math.max(1, Math.round((maxX - minX + 1) * 0.004));
  const safetyInsetY = Math.max(1, Math.round((maxY - minY + 1) * 0.004));
  minX = clamp(minX + Math.max(insets.leftInset, safetyInsetX), 0, width - 2);
  minY = clamp(minY + Math.max(insets.topInset, safetyInsetY), 0, height - 2);
  maxX = clamp(maxX - Math.max(insets.rightInset, safetyInsetX), minX + 8, width - 1);
  maxY = clamp(maxY - Math.max(insets.bottomInset, safetyInsetY), minY + 8, height - 1);

  let cropWidth = maxX - minX + 1;
  let cropHeight = maxY - minY + 1;
  const cropRatio = (cropWidth * cropHeight) / Math.max(width * height, 1);
  if (cropRatio > 0.9 || cropRatio < 0.2) return null;

  const cropLeft = minX;
  const cropTop = minY;
  const cropped = cropCanvas(sourceCanvas, cropLeft, cropTop, cropWidth, cropHeight);
  if (!cropped) return null;

  const resized = resizeCanvas(cropped, DOCUMENT_OUTPUT_WIDTH, DOCUMENT_OUTPUT_HEIGHT);
  if (!resized) return null;

  return {
    canvas: resized,
    cropRatio,
    confidence: clamp(1 - Math.abs(cropRatio - 0.58) / 0.18, 0, 1),
  };
}

function analyzeDocumentCanvas(canvas: HTMLCanvasElement, detectionConfidence: number, autoRectified: boolean) {
  const metrics = collectCanvasMetrics(canvas);
  if (!metrics) {
    return {
      warnings: ['Khong the phan tich chat luong anh CCCD.'],
      blockingReasons: ['Khong the phan tich chat luong anh CCCD.'],
      avgBrightness: 0,
      sharpness: 0,
      qualityScore: 0,
    };
  }
  const warnings: string[] = [];
  const blockingReasons: string[] = [];
  const {
    avgBrightness,
    sharpness,
    contrast,
    avgEdgeBrightness,
    highlightRatio,
    shadowRatio,
  } = metrics;

  if (avgBrightness < 58) warnings.push('Anh hoi toi, nen chup o noi sang hon de OCR on dinh.');
  if (avgBrightness < 42) blockingReasons.push('Anh qua toi, chua doc an toan duoc thong tin CCCD.');
  if (avgBrightness > 214) warnings.push('Anh hoi loa, tranh den chieu truc tiep vao the.');
  if (avgBrightness > 236) blockingReasons.push('Anh bi loa manh, chi tiet tren CCCD dang mat.');
  if (highlightRatio > 0.035) warnings.push('Anh van con vung choi sang, nen nghieng the tranh phan xa den.');
  if (highlightRatio > 0.105) blockingReasons.push('Anh bi choi o vung quan trong, chu hoac QR co the bi mat.');
  if (shadowRatio > 0.12) warnings.push('Anh co nhieu vung toi, nen dua the ra noi sang hon hoac gan camera hon.');

  if (sharpness < 8.5) warnings.push('Anh chua that net, ban nen giu may vung hon neu chup lai.');
  if (sharpness < 4.2) blockingReasons.push('Anh bi mo, OCR se de sai so CCCD hoac ngay cap.');

  if (contrast < 26) warnings.push('Do tuong phan thap, chu va QR co the kho doc.');
  if (contrast < 15) blockingReasons.push('Anh thieu tuong phan, thong tin CCCD khong du ro.');

  if (avgEdgeBrightness < 20) {
    blockingReasons.push('Anh con vien den o mep sau khi canh, vui long chinh lai hoac chup lai.');
  } else if (avgEdgeBrightness < 42) {
    warnings.push('Mep anh van hoi toi, nen kiem tra lai truoc khi luu.');
  }

  if (detectionConfidence < 0.52 && autoRectified) {
    warnings.push('Do tin cay tu dong canh khung chua cao, hay kiem tra lai anh da phang chua.');
  }

  let qualityScore = 100;
  if (avgBrightness < 58 || avgBrightness > 214) qualityScore -= 10;
  if (sharpness < 8.5) qualityScore -= 15;
  if (contrast < 26) qualityScore -= 10;
  if (avgEdgeBrightness < 42) qualityScore -= 14;
  if (blockingReasons.length > 0) qualityScore -= blockingReasons.length * 18;
  qualityScore = clamp(Math.round(qualityScore), 0, 100);

  return {
    warnings,
    blockingReasons,
    avgBrightness,
    sharpness,
    qualityScore,
  };
}

function buildProcessingMeta(
  sourceWidth: number,
  sourceHeight: number,
  outputWidth: number,
  outputHeight: number,
  detectionConfidence: number,
  cornerCount: number,
  usedManualAdjust: boolean,
  autoRectified: boolean,
  analysis: ReturnType<typeof analyzeDocumentCanvas>,
): DocumentProcessingMeta {
  const validationStatus = analysis.blockingReasons.length > 0
    ? 'blocked'
    : analysis.warnings.length > 0
      ? 'warning'
      : 'accepted';

  return {
    autoRectified,
    detectionConfidence: Number(detectionConfidence || 0),
    cornerCount,
    qualityWarnings: analysis.warnings,
    blockingReasons: analysis.blockingReasons,
    validationStatus,
    sourceWidth,
    sourceHeight,
    outputWidth,
    outputHeight,
    usedManualAdjust,
    qualityScore: analysis.qualityScore,
    avgBrightness: analysis.avgBrightness,
    sharpness: analysis.sharpness,
  };
}

async function canvasToPreviewUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL('image/jpeg', 0.97);
}

export async function canvasToFile(canvas: HTMLCanvasElement, type: 'cccd_front' | 'cccd_back') {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.98);
  });

  if (!blob) throw new Error('Khong the tao file tu anh da canh.');
  return new File([blob], `cccd-${type}-${Date.now()}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export function buildManualCropOcrVariants(
  cropCanvas: HTMLCanvasElement,
  type: UploadType,
): {
  processingMeta: DocumentProcessingMeta | null;
  artifacts: DocumentRestorationArtifacts | null;
} {
  const processed = processDocumentCanvas(cropCanvas, cropCanvas.width, cropCanvas.height, {
    type,
    autoRectified: false,
    detectionConfidence: 0,
    cornerCount: 0,
    usedManualAdjust: true,
    preserveCrop: true,
  });

  const restored = applySafeRestorationPipeline(processed, type);
  return {
    processingMeta: restored.processingMeta,
    artifacts: restored.artifacts,
  };
}

function processDocumentCanvas(
  sourceCanvas: HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
  options: {
    type: UploadType;
    autoRectified: boolean;
    detectionConfidence?: number;
    cornerCount?: number;
    usedManualAdjust?: boolean;
    preserveCrop?: boolean;
  },
): DocumentNormalizationResult {
  const resized = resizeCanvas(sourceCanvas, DOCUMENT_OUTPUT_WIDTH, DOCUMENT_OUTPUT_HEIGHT);
  if (!resized) {
    return {
      status: 'blocked',
      previewUrl: null,
      normalizedCanvas: null,
      warnings: [],
      blockingReasons: ['Khong the xu ly anh CCCD nay.'],
      qualityScore: 0,
      detectionConfidence: Number(options.detectionConfidence || 0),
      documentCorners: null,
      processingMeta: buildProcessingMeta(
        sourceWidth,
        sourceHeight,
        0,
        0,
        Number(options.detectionConfidence || 0),
        Number(options.cornerCount || 0),
        Boolean(options.usedManualAdjust),
        options.autoRectified,
        {
          warnings: [],
          blockingReasons: ['Khong the xu ly anh CCCD nay.'],
          avgBrightness: 0,
          sharpness: 0,
          qualityScore: 0,
        },
      ),
    };
  }

  let workingCanvas = resized;
  if (!options.preserveCrop) {
    const recropped = autoRecropDocumentCanvas(resized, options.type);
    if (recropped) {
      const originalBorder = measureBorderContinuity(resized);
      const recroppedBorder = measureBorderContinuity(recropped.canvas);
      if (
        recropped.coverageRatio < 0.9
        && (
          recroppedBorder > originalBorder + 0.025
          || recropped.confidence > 0.46
          || recropped.selectionScore > 0.62
        )
      ) {
        workingCanvas = recropped.canvas;
      }
    }

    const trimmed = autoTrimAlignedDocumentCanvas(workingCanvas);
    if (trimmed) {
      const originalBorder = measureBorderContinuity(workingCanvas);
      const trimmedBorder = measureBorderContinuity(trimmed.canvas);
      if (
        trimmedBorder > originalBorder + 0.035
        || (trimmed.cropRatio < 0.97 && trimmedBorder >= originalBorder - 0.01)
        || (trimmed.confidence > 0.34 && trimmed.cropRatio < 0.93)
      ) {
        workingCanvas = trimmed.canvas;
      }
    }

    const foregroundCrop = autoCropForegroundDocumentCanvas(workingCanvas, options.type);
    if (foregroundCrop && foregroundCrop.confidence > 0.56 && foregroundCrop.cropRatio < 0.88) {
      workingCanvas = foregroundCrop.canvas;
    }

    const filledDocument = forceFillDocumentCanvas(workingCanvas);
    if (filledDocument && filledDocument.confidence > 0.34) {
      workingCanvas = filledDocument.canvas;
    }

    const backgroundContrastCrop = forceCropByBackgroundContrast(workingCanvas);
    if (backgroundContrastCrop && backgroundContrastCrop.confidence > 0.18) {
      workingCanvas = backgroundContrastCrop.canvas;
    }

    const cornerBackgroundCrop = forceCropFromCornerBackground(workingCanvas);
    if (cornerBackgroundCrop && cornerBackgroundCrop.confidence > 0.22) {
      workingCanvas = cornerBackgroundCrop.canvas;
    }
  }

  const preEnhancement = collectCanvasMetrics(workingCanvas);
  applyAdaptiveToneMap(workingCanvas);
  const noiseBlend = preEnhancement.sharpness < 5.4
    ? 0.08
    : preEnhancement.sharpness < 8
      ? 0.05
      : 0.02;
  softenNoise(workingCanvas, noiseBlend);
  applyAdaptiveUnsharpMask(workingCanvas, Math.max(preEnhancement.sharpness - 0.35, 2.8));
  const analysis = analyzeDocumentCanvas(
    workingCanvas,
    Number(options.detectionConfidence || 0),
    options.autoRectified,
  );
  const processingMeta = buildProcessingMeta(
    sourceWidth,
    sourceHeight,
    workingCanvas.width,
    workingCanvas.height,
    Number(options.detectionConfidence || 0),
    Number(options.cornerCount || 0),
    Boolean(options.usedManualAdjust),
    options.autoRectified,
    analysis,
  );

  return {
    status: analysis.blockingReasons.length > 0
      ? 'blocked'
      : analysis.warnings.length > 0
        ? 'needs_review'
        : 'ready',
    previewUrl: null,
    normalizedCanvas: workingCanvas,
    warnings: analysis.warnings,
    blockingReasons: analysis.blockingReasons,
    qualityScore: analysis.qualityScore,
    detectionConfidence: Number(options.detectionConfidence || 0),
    documentCorners: null,
    processingMeta,
  };
}

function uniqueMessages(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function getDetectionCandidates(detection: any): DetectionCandidate[] {
  if (Array.isArray(detection?.candidates) && detection.candidates.length > 0) {
    return detection.candidates
      .map((candidate: any) => ({
        corners: Array.isArray(candidate?.corners) ? candidate.corners : [],
        score: Number(candidate?.score || 0),
        source: typeof candidate?.source === 'string' ? candidate.source : 'candidate',
        metrics: candidate?.metrics && typeof candidate.metrics === 'object'
          ? {
              aspectError: Number(candidate.metrics.aspectError || 0),
              centerDistance: Number(candidate.metrics.centerDistance || 0),
              areaRatio: Number(candidate.metrics.areaRatio || 0),
              anglePenalty: Number(candidate.metrics.anglePenalty || 0),
            }
          : undefined,
        boundingBox: candidate?.boundingBox && typeof candidate.boundingBox === 'object'
          ? {
              x: Number(candidate.boundingBox.x || 0),
              y: Number(candidate.boundingBox.y || 0),
              width: Number(candidate.boundingBox.width || 0),
              height: Number(candidate.boundingBox.height || 0),
            }
          : undefined,
      }))
      .filter((candidate: DetectionCandidate) => candidate.corners.length === 4);
  }

  if (Array.isArray(detection?.corners) && detection.corners.length === 4) {
    return [{
      corners: detection.corners,
      score: Number(detection?.rawScore || detection?.confidence || 0),
      source: typeof detection?.source === 'string' ? detection.source : 'primary',
      metrics: undefined,
      boundingBox: detection?.boundingBox && typeof detection.boundingBox === 'object'
        ? {
            x: Number(detection.boundingBox.x || 0),
            y: Number(detection.boundingBox.y || 0),
            width: Number(detection.boundingBox.width || 0),
            height: Number(detection.boundingBox.height || 0),
          }
        : undefined,
    }];
  }

  return [];
}

function assessQuadGeometry(
  points: DocumentPoint[] | null | undefined,
  sourceWidth: number,
  sourceHeight: number,
  fallbackMetrics?: DetectionCandidate['metrics'],
) {
  if (!points || points.length !== 4 || !sourceWidth || !sourceHeight) {
    return {
      score: 0,
      edgeBalance: 0,
      angleScore: 0,
      centerScore: 0,
      aspectScore: 0,
      areaScore: 0,
    };
  }

  const ordered = orderCorners(points);
  if (!ordered) {
    return {
      score: 0,
      edgeBalance: 0,
      angleScore: 0,
      centerScore: 0,
      aspectScore: 0,
      areaScore: 0,
    };
  }

  const [tl, tr, br, bl] = ordered;
  const topWidth = distance(tl, tr);
  const bottomWidth = distance(bl, br);
  const leftHeight = distance(tl, bl);
  const rightHeight = distance(tr, br);
  const avgWidth = (topWidth + bottomWidth) / 2;
  const avgHeight = (leftHeight + rightHeight) / 2;
  const aspect = avgWidth / Math.max(avgHeight, 1);
  const aspectError = typeof fallbackMetrics?.aspectError === 'number' && fallbackMetrics.aspectError > 0
    ? fallbackMetrics.aspectError
    : Math.abs(aspect - DOCUMENT_ASPECT) / DOCUMENT_ASPECT;
  const areaRatio = typeof fallbackMetrics?.areaRatio === 'number' && fallbackMetrics.areaRatio > 0
    ? fallbackMetrics.areaRatio
    : quadArea(ordered) / Math.max(sourceWidth * sourceHeight, 1);

  const centerX = (tl.x + tr.x + br.x + bl.x) / 4;
  const centerY = (tl.y + tr.y + br.y + bl.y) / 4;
  const centerDistance = typeof fallbackMetrics?.centerDistance === 'number' && fallbackMetrics.centerDistance > 0
    ? fallbackMetrics.centerDistance
    : Math.hypot(centerX - sourceWidth / 2, centerY - sourceHeight / 2);
  const maxCenterDistance = Math.hypot(sourceWidth, sourceHeight) * 0.42;

  const anglePenalty = typeof fallbackMetrics?.anglePenalty === 'number' && fallbackMetrics.anglePenalty > 0
    ? fallbackMetrics.anglePenalty
    : [
        angleAt(bl, tl, tr),
        angleAt(tl, tr, br),
        angleAt(tr, br, bl),
        angleAt(br, bl, tl),
      ].reduce((sum, angle) => sum + Math.abs(90 - angle), 0) / 4;

  const widthBalance = 1 - Math.min(1, Math.abs(topWidth - bottomWidth) / Math.max(avgWidth, 1) / 0.24);
  const heightBalance = 1 - Math.min(1, Math.abs(leftHeight - rightHeight) / Math.max(avgHeight, 1) / 0.22);
  const edgeBalance = clamp((widthBalance + heightBalance) / 2, 0, 1);
  const angleScore = clamp(1 - anglePenalty / 20, 0, 1);
  const centerScore = clamp(1 - centerDistance / Math.max(maxCenterDistance, 1), 0, 1);
  const aspectScore = clamp(1 - aspectError / 0.16, 0, 1);
  const areaScore = clamp(1 - Math.abs(areaRatio - 0.62) / 0.30, 0, 1);

  return {
    score: clamp(
      edgeBalance * 0.28 +
      angleScore * 0.24 +
      centerScore * 0.18 +
      aspectScore * 0.18 +
      areaScore * 0.12,
      0,
      1,
    ),
    edgeBalance,
    angleScore,
    centerScore,
    aspectScore,
    areaScore,
  };
}

function evaluateCandidateResult(
  processed: DocumentNormalizationResult,
  type: UploadType,
  candidateScore: number,
  candidateSource: string,
  sourceWidth: number,
  sourceHeight: number,
  coverageRatio = 1,
  geometry = assessQuadGeometry(null, 0, 0),
) {
  const layoutCanvas = processed.normalizedCanvas;
  const layout = layoutCanvas
    ? assessVietnameseDocumentLayout(layoutCanvas, type)
    : {
        score: 0,
        warnings: ['Khong the danh gia bo cuc CCCD sau khi xu ly.'],
        blockingReasons: ['Khong the danh gia bo cuc CCCD sau khi xu ly.'],
        template: 'unknown',
      };
  const borderContinuity = layoutCanvas ? measureBorderContinuity(layoutCanvas) : 0.5;
  const edgeCrowding = layoutCanvas ? measureEdgeCrowding(layoutCanvas) : { score: 0, bottomScore: 0, topScore: 0 };
  const normalizedCandidateScore = clamp(candidateScore, 0, 1);
  const isNativeCandidate = candidateSource.startsWith('native');
  const totalScore = clamp(
    layout.score * 0.32 +
    layout.ocrUsefulnessScore * 0.23 +
    normalizedCandidateScore * 0.10 +
    (processed.qualityScore / 100) * 0.18 +
    borderContinuity * 0.08 +
    geometry.score * 0.09,
    0,
    1,
  );
  const nativeBoost = isNativeCandidate
    ? clamp(
        layout.score >= 0.58
          ? 0.10 + normalizedCandidateScore * 0.04 + coverageRatio * 0.03 + borderContinuity * 0.06
          : 0.03 + normalizedCandidateScore * 0.02 + borderContinuity * 0.05,
        0,
        0.24,
      )
    : 0;
  const cropPenalty = !isNativeCandidate
    ? coverageRatio < 0.26
      ? 0.26
      : coverageRatio < 0.38
        ? 0.16
        : coverageRatio < 0.52
          ? 0.08
        : 0
    : 0;
  const borderPenalty = borderContinuity < 0.74
    ? (0.74 - borderContinuity) * 0.30
    : 0;
  const tightCropBonus = borderContinuity > 0.86 && coverageRatio >= 0.78
    ? 0.03
    : borderContinuity > 0.80
      ? 0.015
      : 0;
  const looseNativePenalty = isNativeCandidate
    ? clamp(
        Math.max(0, coverageRatio - 0.92) * 0.45
        + Math.max(0, 0.84 - borderContinuity) * 0.18,
        0,
        0.14,
      )
    : 0;
  const tightNativeBonus = isNativeCandidate && coverageRatio < 0.9 && borderContinuity > 0.82
    ? 0.018
    : 0;
  const edgeCrowdingPenalty = !isNativeCandidate && edgeCrowding.score > 0.18
    ? clamp(edgeCrowding.score * 0.24 + edgeCrowding.bottomScore * 0.12, 0, 0.22)
    : 0;
  const geometryBonus = clamp(
    geometry.edgeBalance * 0.04 + geometry.angleScore * 0.03 + geometry.centerScore * 0.025,
    0,
    0.095,
  );
  const geometryPenalty = geometry.score < 0.62 ? (0.62 - geometry.score) * 0.18 : 0;
  const selectionScore = clamp(
    totalScore + nativeBoost + tightCropBonus + tightNativeBonus + geometryBonus - cropPenalty - borderPenalty - geometryPenalty - looseNativePenalty - edgeCrowdingPenalty,
    0,
    1.3,
  );

  return {
    candidate: {
      corners: [] as DocumentPoint[],
      score: normalizedCandidateScore,
      source: candidateSource,
    },
    processed,
    layout,
    totalScore,
    selectionScore,
    coverageRatio,
    borderContinuity,
    geometry,
    normalizedCorners: null as DocumentPoint[] | null,
    sourceWidth,
    sourceHeight,
  };
}

interface RestorationCandidateEvaluation {
  mode: RestorationMode;
  label: string;
  canvas: HTMLCanvasElement;
  analysis: ReturnType<typeof analyzeDocumentCanvas>;
  layout: DocumentLayoutAssessment;
  differenceGuardScore: number;
  differenceGuardStatus: 'pass' | 'warning' | 'fail';
  warnings: string[];
  blockingReasons: string[];
  qualityScore: number;
  selectionScore: number;
}

interface DocumentCandidateEvaluation extends ReturnType<typeof evaluateCandidateResult> {
  candidate?: DetectionCandidate;
}

function choosePreferredDocumentCandidate(candidates: DocumentCandidateEvaluation[]) {
  const fallbackCandidate = candidates[0] || null;
  if (!fallbackCandidate) return null;

  const foregroundCandidate = candidates.find((candidate) => candidate.candidate?.source === 'native-foreground');
  const bboxCandidate = candidates.find((candidate) => String(candidate.candidate?.source || '').includes('-bbox'));
  const portraitSource = fallbackCandidate.sourceHeight > fallbackCandidate.sourceWidth * 1.1;

  if (
    portraitSource
    && bboxCandidate
    && bboxCandidate.selectionScore >= 0.34
    && bboxCandidate.coverageRatio >= 0.14
    && bboxCandidate.coverageRatio <= 0.82
  ) {
    return bboxCandidate;
  }

  if (
    foregroundCandidate
    && foregroundCandidate.borderContinuity >= Math.max(0.78, fallbackCandidate.borderContinuity - 0.03)
    && foregroundCandidate.selectionScore >= fallbackCandidate.selectionScore - 0.06
    && foregroundCandidate.coverageRatio < Math.min(0.78, fallbackCandidate.coverageRatio - 0.08)
  ) {
    return foregroundCandidate;
  }

  if (
    bboxCandidate
    && bboxCandidate.borderContinuity >= Math.max(0.8, fallbackCandidate.borderContinuity - 0.02)
    && bboxCandidate.selectionScore >= fallbackCandidate.selectionScore - 0.05
    && bboxCandidate.coverageRatio >= 0.2
    && bboxCandidate.coverageRatio <= 0.78
  ) {
    return bboxCandidate;
  }

  const bestAutoRectifiedCandidate = candidates.find((candidate) => (
    Boolean(candidate.processed.processingMeta?.autoRectified)
  ));

  if (!bestAutoRectifiedCandidate || fallbackCandidate.processed.processingMeta?.autoRectified) {
    return fallbackCandidate;
  }

  const selectionScoreGap = fallbackCandidate.selectionScore - bestAutoRectifiedCandidate.selectionScore;
  const fallbackSource = String(fallbackCandidate.candidate?.source || '');
  const fallbackIsNative = fallbackSource.startsWith('native');
  const autoRectifiedLooksReliable =
    bestAutoRectifiedCandidate.geometry.score >= 0.64
    && bestAutoRectifiedCandidate.borderContinuity >= 0.72
    && Number(bestAutoRectifiedCandidate.candidate?.score || 0) >= 0.54;
  const nativeCropLooksLoose =
    fallbackCandidate.coverageRatio >= 0.84
    || fallbackCandidate.borderContinuity < 0.84;
  const autoRectifiedHasMeaningfulAdvantage =
    bestAutoRectifiedCandidate.geometry.score >= fallbackCandidate.geometry.score + 0.10
    || bestAutoRectifiedCandidate.geometry.angleScore >= fallbackCandidate.geometry.angleScore + 0.10
    || bestAutoRectifiedCandidate.geometry.edgeBalance >= fallbackCandidate.geometry.edgeBalance + 0.08;
  const fallbackLooksLikeFrameZoom = fallbackIsNative && (
    fallbackSource === 'native-frame'
    || fallbackSource.startsWith('native-inset')
    || fallbackCandidate.coverageRatio >= 0.88
  );
  const autoRectifiedLooksCardFocused =
    bestAutoRectifiedCandidate.coverageRatio >= 0.2
    && bestAutoRectifiedCandidate.coverageRatio <= 0.82;
  const autoRectifiedMuchTighterThanFallback =
    bestAutoRectifiedCandidate.coverageRatio <= fallbackCandidate.coverageRatio - 0.12;

  if (
    autoRectifiedLooksReliable
    && fallbackLooksLikeFrameZoom
    && autoRectifiedLooksCardFocused
    && autoRectifiedMuchTighterThanFallback
    && selectionScoreGap <= 0.18
  ) {
    return bestAutoRectifiedCandidate;
  }

  if (
    foregroundCandidate
    && bestAutoRectifiedCandidate
    && bestAutoRectifiedCandidate.processed.processingMeta?.autoRectified
    && foregroundCandidate.borderContinuity >= 0.82
    && foregroundCandidate.coverageRatio >= 0.2
    && foregroundCandidate.coverageRatio <= 0.76
    && foregroundCandidate.selectionScore >= bestAutoRectifiedCandidate.selectionScore - 0.1
    && (
      bestAutoRectifiedCandidate.borderContinuity < 0.8
      || bestAutoRectifiedCandidate.coverageRatio < 0.28
      || bestAutoRectifiedCandidate.coverageRatio > 0.72
    )
  ) {
    return foregroundCandidate;
  }

  if (
    autoRectifiedLooksReliable
    && selectionScoreGap <= 0.12
    && (nativeCropLooksLoose || autoRectifiedHasMeaningfulAdvantage || selectionScoreGap <= 0.03)
  ) {
    return bestAutoRectifiedCandidate;
  }

  return fallbackCandidate;
}

function chooseRecommendedRestorationCandidate(
  candidates: RestorationCandidateEvaluation[],
  baseCandidate: RestorationCandidateEvaluation,
) {
  let recommended = baseCandidate;

  for (const candidate of candidates) {
    if (candidate.mode === 'normalized_original') continue;
    if (candidate.differenceGuardStatus === 'fail') continue;

    const saferThanCurrent = recommended.differenceGuardStatus === 'fail' && candidate.differenceGuardStatus !== 'fail';
    const unblocksCurrent = recommended.blockingReasons.length > 0 && candidate.blockingReasons.length === 0;
    const materiallyImprovesOcr =
      candidate.layout.ocrUsefulnessScore > recommended.layout.ocrUsefulnessScore + 0.03
      || candidate.qualityScore > recommended.qualityScore + 6;
    const clearlyBetterScore = candidate.selectionScore > recommended.selectionScore + 0.035;

    if (saferThanCurrent || unblocksCurrent) {
      recommended = candidate;
      continue;
    }

    if (clearlyBetterScore && materiallyImprovesOcr) {
      recommended = candidate;
    }
  }

  return recommended;
}

function applySafeRestorationPipeline(
  baseResult: DocumentNormalizationResult,
  type: UploadType,
): DocumentNormalizationResult {
  if (!baseResult.normalizedCanvas || !baseResult.processingMeta) {
    return {
      ...baseResult,
      artifacts: null,
    };
  }

  const normalizedBaseCanvas = cloneCanvas(baseResult.normalizedCanvas);
  if (!normalizedBaseCanvas) {
    return {
      ...baseResult,
      artifacts: null,
    };
  }

  const normalizedOriginalCanvas = applyTemplateDeskew(normalizedBaseCanvas, type);
  const balancedCanvas = cloneCanvas(normalizedOriginalCanvas);
  const textPriorityCanvas = cloneCanvas(normalizedOriginalCanvas);

  if (!balancedCanvas || !textPriorityCanvas) {
    return {
      ...baseResult,
      artifacts: null,
      normalizedCanvas: normalizedOriginalCanvas,
    };
  }

  const baseSharpness = Number(baseResult.processingMeta.sharpness || 0);
  applyRestorationPass(balancedCanvas, type, 'ocr_restore_balanced', baseSharpness);
  applyRestorationPass(textPriorityCanvas, type, 'ocr_restore_text_priority', baseSharpness);

  const candidateCanvases: Array<{ mode: RestorationMode; canvas: HTMLCanvasElement }> = [
    { mode: 'normalized_original', canvas: normalizedOriginalCanvas },
    { mode: 'ocr_restore_balanced', canvas: balancedCanvas },
    { mode: 'ocr_restore_text_priority', canvas: textPriorityCanvas },
  ];

  const evaluations = candidateCanvases.map(({ mode, canvas }) => {
    const analysis = analyzeDocumentCanvas(
      canvas,
      Number(baseResult.processingMeta?.detectionConfidence || 0),
      Boolean(baseResult.processingMeta?.autoRectified),
    );
    const layout = assessVietnameseDocumentLayout(canvas, type);
    const differenceGuard = mode === 'normalized_original'
      ? { score: 1, status: 'pass' as const, warnings: [] as string[] }
      : computeDifferenceGuard(normalizedOriginalCanvas, canvas, type);

    const blockingReasons = uniqueMessages([
      ...analysis.blockingReasons,
      ...layout.blockingReasons,
      ...(differenceGuard.status === 'fail'
        ? ['Ban phuc hoi thay doi qua muc an toan OCR, he thong se khong chon ban nay.']
        : []),
    ]);
    const warnings = uniqueMessages([
      ...analysis.warnings,
      ...layout.warnings,
      ...differenceGuard.warnings,
      ...(mode !== 'normalized_original'
        ? ['He thong khong tao lai noi dung CCCD, chi cai thien sang/net trong gioi han an toan.']
        : []),
    ]);

    const qualityScore = clamp(
      Math.round(
        analysis.qualityScore * 0.52
        + layout.score * 18
        + layout.ocrUsefulnessScore * 22
        + differenceGuard.score * 8,
      ),
      0,
      100,
    );

    let selectionScore = clamp(
      layout.ocrUsefulnessScore * 0.42
      + layout.score * 0.22
      + (analysis.qualityScore / 100) * 0.22
      + differenceGuard.score * 0.14,
      0,
      1.2,
    );

    if (mode === 'normalized_original') {
      selectionScore += 0.03;
    }
    if (differenceGuard.status === 'warning') {
      selectionScore -= 0.04;
    }
    if (differenceGuard.status === 'fail') {
      selectionScore -= 0.25;
    }
    if (blockingReasons.length > 0) {
      selectionScore -= 0.08;
    }

    return {
      mode,
      label: restorationLabel(mode),
      canvas,
      analysis,
      layout,
      differenceGuardScore: differenceGuard.score,
      differenceGuardStatus: differenceGuard.status,
      warnings,
      blockingReasons,
      qualityScore,
      selectionScore,
    } satisfies RestorationCandidateEvaluation;
  });

  const baseCandidate = evaluations.find((candidate) => candidate.mode === 'normalized_original') || evaluations[0];
  const recommended = chooseRecommendedRestorationCandidate(evaluations, baseCandidate);
  const validationStatus = recommended.blockingReasons.length > 0
    ? 'blocked'
    : recommended.warnings.length > 0
      ? 'warning'
      : 'accepted';

  const processingMeta: DocumentProcessingMeta = {
    ...baseResult.processingMeta,
    validationStatus,
    qualityWarnings: recommended.warnings,
    blockingReasons: recommended.blockingReasons,
    qualityScore: recommended.qualityScore,
    restorationMode: recommended.mode,
    restorationCandidates: evaluations.map((candidate) => ({
      mode: candidate.mode,
      label: candidate.label,
      selected: candidate.mode === recommended.mode,
      qualityScore: candidate.qualityScore,
      ocrUsefulnessScore: Math.round(candidate.layout.ocrUsefulnessScore * 100),
      differenceGuardScore: Number(candidate.differenceGuardScore.toFixed(3)),
      differenceGuardStatus: candidate.differenceGuardStatus,
      warnings: candidate.warnings,
    })),
    recommendedCandidate: recommended.mode,
    differenceGuardScore: Number(recommended.differenceGuardScore.toFixed(3)),
    differenceGuardStatus: recommended.differenceGuardStatus,
    ocrArbitrationSummary: `Client recommended ${recommended.mode} after OCR-safe restoration scoring.`,
    retakeRequiredReason: recommended.blockingReasons[0] || undefined,
  };

  return {
    ...baseResult,
    status: recommended.blockingReasons.length > 0
      ? 'blocked'
      : recommended.warnings.length > 0
        ? 'needs_review'
        : 'ready',
    normalizedCanvas: recommended.canvas,
    warnings: recommended.warnings,
    blockingReasons: recommended.blockingReasons,
    qualityScore: recommended.qualityScore,
    processingMeta,
    artifacts: {
      normalizedOriginalCanvas,
      ocrRestoreBalancedCanvas: balancedCanvas,
      ocrRestoreTextPriorityCanvas: textPriorityCanvas,
      recommendedCandidate: recommended.mode,
    },
  };
}

function normalizeVector(vector: DocumentPoint) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function fitExpandedQuadWithinBounds(
  center: DocumentPoint,
  expandedPoints: DocumentPoint[],
  maxWidth: number,
  maxHeight: number,
) {
  const maxXBound = Math.max(maxWidth - 1, 0);
  const maxYBound = Math.max(maxHeight - 1, 0);
  const bounds = expandedPoints.reduce((acc, point) => ({
    minX: Math.min(acc.minX, point.x),
    maxX: Math.max(acc.maxX, point.x),
    minY: Math.min(acc.minY, point.y),
    maxY: Math.max(acc.maxY, point.y),
  }), {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });

  const shiftX = bounds.minX < 0
    ? -bounds.minX
    : bounds.maxX > maxXBound
      ? maxXBound - bounds.maxX
      : 0;
  const shiftY = bounds.minY < 0
    ? -bounds.minY
    : bounds.maxY > maxYBound
      ? maxYBound - bounds.maxY
      : 0;

  const translatedCenter = {
    x: clamp(center.x + shiftX, 0, maxXBound),
    y: clamp(center.y + shiftY, 0, maxYBound),
  };
  const translatedPoints = expandedPoints.map((point) => ({
    x: point.x + shiftX,
    y: point.y + shiftY,
  }));

  let scale = 1;

  for (const point of translatedPoints) {
    const offsetX = point.x - translatedCenter.x;
    const offsetY = point.y - translatedCenter.y;

    if (offsetX > 0) {
      scale = Math.min(scale, (maxXBound - translatedCenter.x) / Math.max(offsetX, 1e-6));
    } else if (offsetX < 0) {
      scale = Math.min(scale, translatedCenter.x / Math.max(-offsetX, 1e-6));
    }

    if (offsetY > 0) {
      scale = Math.min(scale, (maxYBound - translatedCenter.y) / Math.max(offsetY, 1e-6));
    } else if (offsetY < 0) {
      scale = Math.min(scale, translatedCenter.y / Math.max(-offsetY, 1e-6));
    }
  }

  const safeScale = clamp(scale, 0, 1);
  return translatedPoints.map((point) => ({
    x: clamp(translatedCenter.x + (point.x - translatedCenter.x) * safeScale, 0, maxXBound),
    y: clamp(translatedCenter.y + (point.y - translatedCenter.y) * safeScale, 0, maxYBound),
  }));
}

function expandDetectedQuad(
  points: DocumentPoint[],
  sourceWidth: number,
  sourceHeight: number,
  options: {
    confidence?: number;
    source?: string;
    type?: UploadType;
  } = {},
) {
  if (!points || points.length !== 4) return points;

  const confidence = clamp(Number(options.confidence || 0), 0, 1);
  const source = String(options.source || 'candidate');
  const type = options.type || 'cccd_front';
  const sourcePaddingBoost = source.startsWith('mask')
    ? 0.010
    : source.startsWith('edge')
      ? 0.009
      : source.startsWith('native')
        ? -0.004
        : 0.006;
  const confidencePaddingBoost = (1 - confidence) * 0.012;
  const paddingX = clamp(0.02 + sourcePaddingBoost + confidencePaddingBoost, 0.014, 0.05);
  const paddingY = clamp((type === 'cccd_front' ? 0.03 : 0.024) + sourcePaddingBoost + confidencePaddingBoost * 1.2, 0.02, 0.065);

  const center = points.reduce((acc, point) => ({
    x: acc.x + point.x / 4,
    y: acc.y + point.y / 4,
  }), { x: 0, y: 0 });

  const axisX = normalizeVector({
    x: ((points[1].x + points[2].x) - (points[0].x + points[3].x)) / 2,
    y: ((points[1].y + points[2].y) - (points[0].y + points[3].y)) / 2,
  });
  const axisY = normalizeVector({
    x: ((points[2].x + points[3].x) - (points[0].x + points[1].x)) / 2,
    y: ((points[2].y + points[3].y) - (points[0].y + points[1].y)) / 2,
  });

  const expandedPoints = points.map((point) => {
    const dx = (point.x - center.x) * axisX.x + (point.y - center.y) * axisX.y;
    const dy = (point.x - center.x) * axisY.x + (point.y - center.y) * axisY.y;
    const verticalPadding = dy >= 0
      ? paddingY * (type === 'cccd_front' ? 2.2 : 1.75)
      : paddingY * 1.18;

    return {
      x: center.x + axisX.x * dx * (1 + paddingX * 2) + axisY.x * dy * (1 + verticalPadding * 2),
      y: center.y + axisX.y * dx * (1 + paddingX * 2) + axisY.y * dy * (1 + verticalPadding * 2),
    };
  });

  return fitExpandedQuadWithinBounds(center, expandedPoints, sourceWidth, sourceHeight);
}

export async function normalizeDocumentSource(
  source: SourceElement,
  type: UploadType,
  options: { usedManualAdjust?: boolean } = {},
): Promise<DocumentNormalizationResult> {
  const prepared = createSourceCanvas(source, ANALYSIS_MAX_EDGE);
  if (!prepared) {
    return {
      status: 'manual',
      previewUrl: null,
      normalizedCanvas: null,
      warnings: [],
      blockingReasons: [],
      qualityScore: 0,
      detectionConfidence: 0,
      documentCorners: null,
      processingMeta: buildProcessingMeta(0, 0, 0, 0, 0, 0, Boolean(options.usedManualAdjust), false, {
        warnings: [],
        blockingReasons: [],
        avgBrightness: 0,
        sharpness: 0,
        qualityScore: 0,
      }),
    };
  }

  const overlayRect = {
    x: prepared.width * 0.05,
    y: prepared.height * 0.05,
    width: prepared.width * 0.9,
    height: prepared.height * 0.9,
  };
  const detection = detectDocumentFromImageData(
    prepared.ctx.getImageData(0, 0, prepared.width, prepared.height),
    overlayRect,
  );
  const detectionCandidates = getDetectionCandidates(detection);
  const sourceFull = createSourceCanvas(source, 2200);
  if (!sourceFull) {
    const fallbackCorners = detectionCandidates[0]?.corners
      ? normalizeOrientation(detectionCandidates[0].corners.map((point) => ({
        x: point.x * prepared.scaleX,
        y: point.y * prepared.scaleY,
      })))
      : null;
    return {
      status: 'manual',
      previewUrl: null,
      normalizedCanvas: null,
      warnings: ['Khong the mo anh de canh lai CCCD.'],
      blockingReasons: [],
      qualityScore: 0,
      detectionConfidence: Number(detection?.confidence || 0),
      documentCorners: fallbackCorners,
      processingMeta: buildProcessingMeta(
        prepared.sourceWidth,
        prepared.sourceHeight,
        0,
        0,
        Number(detection?.confidence || 0),
        fallbackCorners?.length || 0,
        Boolean(options.usedManualAdjust),
        false,
        {
          warnings: ['Khong the mo anh de canh lai CCCD.'],
          blockingReasons: [],
          avgBrightness: 0,
          sharpness: 0,
          qualityScore: 0,
        },
      ),
    };
  }
  const evaluatedCandidates = buildNativeWindowCandidates(sourceFull.canvas)
    .map((candidate) => {
      const processed = processDocumentCanvas(candidate.canvas, sourceFull.sourceWidth, sourceFull.sourceHeight, {
        type,
        autoRectified: false,
        detectionConfidence: candidate.score,
        cornerCount: 0,
        usedManualAdjust: Boolean(options.usedManualAdjust),
      });

      return {
        ...evaluateCandidateResult(
          processed,
          type,
          candidate.score,
          candidate.source,
          sourceFull.sourceWidth,
          sourceFull.sourceHeight,
          candidate.cropRatio,
          assessQuadGeometry(null, sourceFull.sourceWidth, sourceFull.sourceHeight),
        ),
        normalizedCorners: null,
      };
    });

  const fullResForegroundCrop = autoCropForegroundDocumentCanvas(sourceFull.canvas, type);
  if (fullResForegroundCrop) {
    const processed = processDocumentCanvas(fullResForegroundCrop.canvas, sourceFull.sourceWidth, sourceFull.sourceHeight, {
      type,
      autoRectified: false,
      detectionConfidence: Math.max(0.72, fullResForegroundCrop.confidence),
      cornerCount: 0,
      usedManualAdjust: Boolean(options.usedManualAdjust),
    });

    evaluatedCandidates.push({
      ...evaluateCandidateResult(
        processed,
        type,
        Math.max(0.72, fullResForegroundCrop.confidence),
        'native-foreground',
        sourceFull.sourceWidth,
        sourceFull.sourceHeight,
        fullResForegroundCrop.cropRatio,
        assessQuadGeometry(null, sourceFull.sourceWidth, sourceFull.sourceHeight),
      ),
      normalizedCorners: null,
    });
  }

  detectionCandidates
    .slice(0, 6)
    .map((candidate) => {
      if (candidate.boundingBox) {
        const bboxCrop = cropDocumentByBoundingBox(sourceFull.canvas, candidate.boundingBox, type);
        if (bboxCrop) {
          const processed = processDocumentCanvas(bboxCrop.canvas, sourceFull.sourceWidth, sourceFull.sourceHeight, {
            type,
            autoRectified: false,
            detectionConfidence: Number(candidate.score || detection?.confidence || 0),
            cornerCount: 0,
            usedManualAdjust: Boolean(options.usedManualAdjust),
            preserveCrop: true,
          });

          evaluatedCandidates.push({
            ...evaluateCandidateResult(
              processed,
              type,
              Number(candidate.score || detection?.confidence || 0),
              `${candidate.source || 'candidate'}-bbox`,
              sourceFull.sourceWidth,
              sourceFull.sourceHeight,
              bboxCrop.cropRatio,
              assessQuadGeometry(null, sourceFull.sourceWidth, sourceFull.sourceHeight, candidate.metrics),
            ),
            candidate,
            normalizedCorners: null,
          });
        }
      }

      const scaledCorners = candidate.corners.map((point) => ({
        x: point.x * prepared.scaleX,
        y: point.y * prepared.scaleY,
      }));
      const ordered = orderCorners(scaledCorners);
      if (!ordered) {
        return null;
      }

      const normalizedCandidateCorners = normalizeOrientation(ordered);
      const expandedCorners = expandDetectedQuad(normalizedCandidateCorners, sourceFull.sourceWidth, sourceFull.sourceHeight, {
        confidence: Number(candidate.score || detection?.confidence || 0),
        source: candidate.source || 'candidate',
        type,
      });
      const warpCorners = expandedCorners.map((point) => ({
        x: point.x / sourceFull.scaleX,
        y: point.y / sourceFull.scaleY,
      }));
      const warped = warpDocument(sourceFull.canvas, warpCorners, DOCUMENT_OUTPUT_WIDTH, DOCUMENT_OUTPUT_HEIGHT);
      if (!warped) {
        return null;
      }

      const processed = processDocumentCanvas(warped, sourceFull.sourceWidth, sourceFull.sourceHeight, {
        type,
        autoRectified: true,
        detectionConfidence: Number(candidate.score || detection?.confidence || 0),
        cornerCount: normalizedCandidateCorners.length,
        usedManualAdjust: Boolean(options.usedManualAdjust),
      });
      const coverageRatio = quadArea(normalizedCandidateCorners) / Math.max(1, sourceFull.sourceWidth * sourceFull.sourceHeight);
      const geometry = assessQuadGeometry(
        expandedCorners,
        sourceFull.sourceWidth,
        sourceFull.sourceHeight,
        candidate.metrics,
      );
      return {
        ...evaluateCandidateResult(
          processed,
          type,
          Number(candidate.score || detection?.confidence || 0),
          candidate.source || 'candidate',
          sourceFull.sourceWidth,
          sourceFull.sourceHeight,
          coverageRatio,
          geometry,
        ),
        candidate,
        normalizedCorners: normalizedCandidateCorners,
      };
    })
    .filter(Boolean)
    .forEach((candidate) => {
      evaluatedCandidates.push(candidate);
    });

  evaluatedCandidates
    .sort((a, b) => {
      if (b.selectionScore !== a.selectionScore) {
        return b.selectionScore - a.selectionScore;
      }
      return b.totalScore - a.totalScore;
    });

  const bestCandidate = choosePreferredDocumentCandidate(evaluatedCandidates as DocumentCandidateEvaluation[]);
  if (!bestCandidate) {
    return {
      status: 'manual',
      previewUrl: null,
      normalizedCanvas: null,
      warnings: detectionCandidates.length === 0
        ? ['He thong chua tu nhan du 4 goc hoac bo cuc the, vui long chup lai gan hon hoac chinh tay.']
        : ['Khong the lam phang anh CCCD tu dong.'],
      blockingReasons: [],
      qualityScore: 0,
      detectionConfidence: Number(detection?.confidence || 0),
      documentCorners: null,
      processingMeta: buildProcessingMeta(
        prepared.sourceWidth,
        prepared.sourceHeight,
        0,
        0,
        Number(detection?.confidence || 0),
        0,
        Boolean(options.usedManualAdjust),
        false,
        {
          warnings: detectionCandidates.length === 0
            ? ['He thong chua tu nhan du 4 goc hoac bo cuc the, vui long chup lai gan hon hoac chinh tay.']
            : ['Khong the lam phang anh CCCD tu dong.'],
          blockingReasons: [],
          avgBrightness: 0,
          sharpness: 0,
          qualityScore: 0,
        },
      ),
    };
  }

  const combinedWarnings = uniqueMessages([
    ...bestCandidate.processed.warnings,
    ...bestCandidate.layout.warnings,
    bestCandidate.totalScore < 0.66
      ? `Ung vien tot nhat moi khop ${Math.round(bestCandidate.totalScore * 100)}% voi bo cuc CCCD Viet Nam, ban nen xem ky truoc khi luu.`
      : '',
  ]);
  const combinedBlockingReasons = uniqueMessages([
    ...bestCandidate.processed.blockingReasons,
    ...bestCandidate.layout.blockingReasons,
  ]);
  const finalQualityScore = clamp(
    Math.round(bestCandidate.processed.qualityScore * 0.72 + bestCandidate.layout.score * 28),
    0,
    100,
  );
  const processingMeta = {
    ...bestCandidate.processed.processingMeta,
    detectionConfidence: Number(bestCandidate.candidate.score || detection?.confidence || 0),
    qualityWarnings: combinedWarnings,
    blockingReasons: combinedBlockingReasons,
    validationStatus: combinedBlockingReasons.length > 0
      ? 'blocked'
      : combinedWarnings.length > 0
        ? 'warning'
        : 'accepted',
    qualityScore: finalQualityScore,
    matchedTemplate: bestCandidate.layout.template,
    candidateSource: bestCandidate.candidate.source || 'candidate',
    candidateMatchScore: bestCandidate.layout.score,
    candidateTotalScore: bestCandidate.totalScore,
  };

  if (bestCandidate.layout.score < 0.48) {
    return {
      status: 'manual',
      previewUrl: null,
      normalizedCanvas: null,
      warnings: combinedWarnings,
      blockingReasons: combinedBlockingReasons,
      qualityScore: finalQualityScore,
      detectionConfidence: Number(bestCandidate.candidate.score || detection?.confidence || 0),
      documentCorners: bestCandidate.normalizedCorners,
      processingMeta,
    };
  }

  const restoredResult = applySafeRestorationPipeline({
    ...bestCandidate.processed,
    processingMeta,
  }, type);

  const restoredWarnings = uniqueMessages([
    ...combinedWarnings,
    ...restoredResult.warnings,
  ]);
  const restoredBlockingReasons = uniqueMessages([
    ...combinedBlockingReasons,
    ...restoredResult.blockingReasons,
  ]);
  const finalStatus = restoredBlockingReasons.length > 0
    ? 'blocked'
    : restoredWarnings.length > 0
      ? 'needs_review'
      : 'ready';
  const previewUrl = restoredResult.normalizedCanvas
    ? await canvasToPreviewUrl(restoredResult.normalizedCanvas)
    : null;

  return {
    ...restoredResult,
    status: finalStatus,
    previewUrl,
    warnings: restoredWarnings,
    blockingReasons: restoredBlockingReasons,
    qualityScore: restoredResult.qualityScore,
    detectionConfidence: Number(bestCandidate.candidate.score || detection?.confidence || 0),
    documentCorners: bestCandidate.normalizedCorners,
    processingMeta: {
      ...restoredResult.processingMeta,
      qualityWarnings: restoredWarnings,
      blockingReasons: restoredBlockingReasons,
      validationStatus: restoredBlockingReasons.length > 0
        ? 'blocked'
        : restoredWarnings.length > 0
          ? 'warning'
          : 'accepted',
      qualityScore: restoredResult.qualityScore,
    },
  };
}

export async function finalizeManualDocumentCanvas(
  sourceCanvas: HTMLCanvasElement,
  type: 'cccd_front' | 'cccd_back',
  options: { usedManualAdjust?: boolean; sourceWidth?: number; sourceHeight?: number } = {},
): Promise<DocumentNormalizationResult> {
  const processed = processDocumentCanvas(
    sourceCanvas,
    options.sourceWidth || sourceCanvas.width,
    options.sourceHeight || sourceCanvas.height,
    {
      type,
      autoRectified: false,
      detectionConfidence: 0,
      cornerCount: 0,
      usedManualAdjust: Boolean(options.usedManualAdjust),
    },
  );

  const restored = applySafeRestorationPipeline(processed, type);
  const previewUrl = restored.normalizedCanvas ? await canvasToPreviewUrl(restored.normalizedCanvas) : null;
  return {
    ...restored,
    previewUrl,
  };
}

export function getDocumentOutputSize() {
  return {
    width: DOCUMENT_OUTPUT_WIDTH,
    height: DOCUMENT_OUTPUT_HEIGHT,
    aspect: DOCUMENT_ASPECT,
  };
}
