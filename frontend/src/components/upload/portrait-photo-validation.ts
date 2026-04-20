export type PortraitValidationStage = 'editor' | 'upload';

export interface PortraitFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface PortraitPhotoMetrics {
  width: number;
  height: number;
  avgBrightness: number;
  sharpness: number;
  faceAvgBrightness: number;
  faceSharpness: number;
  faceContrast: number;
  highlightClippingScore: number;
  backgroundScore: number;
  whiteBackgroundScore: number;
  faceCount: number;
  faceDetectionMode: 'native' | 'estimated';
  faceBox: PortraitFaceBox | null;
  faceTiltDegrees: number | null;
}

export interface PortraitPhotoValidationResult {
  isValid: boolean;
  blockingReasons: string[];
  warnings: string[];
  metrics: PortraitPhotoMetrics;
}

interface ValidationOptions {
  stage?: PortraitValidationStage;
  useNativeFaceDetector?: boolean;
}

const ANALYSIS_WIDTH = 180;
const ANALYSIS_HEIGHT = 240;
const MIN_UPLOAD_WIDTH = 360;
const MIN_UPLOAD_HEIGHT = 480;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rgbToHsv(r: number, g: number, b: number) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === nr) h = ((ng - nb) / delta) % 6;
    else if (max === ng) h = (nb - nr) / delta + 2;
    else h = (nr - ng) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

function isBlueBackgroundPixel(r: number, g: number, b: number) {
  const { h, s, v } = rgbToHsv(r, g, b);
  return h >= 175 && h <= 250 && s >= 0.18 && v >= 0.28 && b > g && b > r;
}

function isWhiteBackgroundPixel(r: number, g: number, b: number) {
  const { s, v } = rgbToHsv(r, g, b);
  return s <= 0.12 && v >= 0.72;
}

function isSkinTone(r: number, g: number, b: number) {
  const rgbRule = (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
    Math.abs(r - g) > 15 &&
    r > g &&
    r > b
  );

  const sum = r + g + b;
  if (sum === 0) return false;

  const nr = r / sum;
  const ng = g / sum;
  const nb = b / sum;
  const normalizedRule = nr > 0.34 && nr < 0.56 && ng > 0.22 && ng < 0.38 && nb > 0.12 && nb < 0.32;

  return rgbRule || normalizedRule;
}

function computeImageQuality(imageData: ImageData) {
  const { data, width, height } = imageData;
  let totalLuminance = 0;
  let edgeSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = (y * width + x) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const left = 0.299 * data[(y * width + (x - 1)) * 4] + 0.587 * data[(y * width + (x - 1)) * 4 + 1] + 0.114 * data[(y * width + (x - 1)) * 4 + 2];
      const right = 0.299 * data[(y * width + (x + 1)) * 4] + 0.587 * data[(y * width + (x + 1)) * 4 + 1] + 0.114 * data[(y * width + (x + 1)) * 4 + 2];
      const top = 0.299 * data[((y - 1) * width + x) * 4] + 0.587 * data[((y - 1) * width + x) * 4 + 1] + 0.114 * data[((y - 1) * width + x) * 4 + 2];
      const bottom = 0.299 * data[((y + 1) * width + x) * 4] + 0.587 * data[((y + 1) * width + x) * 4 + 1] + 0.114 * data[((y + 1) * width + x) * 4 + 2];
      edgeSum += Math.abs(gray * 4 - left - right - top - bottom);
    }
  }

  return {
    avgBrightness: totalLuminance / (data.length / 4),
    sharpness: edgeSum / Math.max(1, (width - 2) * (height - 2)),
  };
}

function computeRegionQuality(imageData: ImageData, region: { x: number; y: number; width: number; height: number }) {
  const { data, width, height } = imageData;
  const startX = clamp(Math.floor(region.x * width), 0, width - 1);
  const startY = clamp(Math.floor(region.y * height), 0, height - 1);
  const endX = clamp(Math.ceil((region.x + region.width) * width), startX + 1, width);
  const endY = clamp(Math.ceil((region.y + region.height) * height), startY + 1, height);

  let totalLuminance = 0;
  let totalLuminanceSquared = 0;
  let highlightCount = 0;
  let sampleCount = 0;
  let edgeSum = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * width + x) * 4;
      const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      totalLuminance += luminance;
      totalLuminanceSquared += luminance * luminance;
      sampleCount += 1;
      if (luminance >= 245) highlightCount += 1;
    }
  }

  for (let y = Math.max(startY + 1, 1); y < Math.min(endY - 1, height - 1); y += 1) {
    for (let x = Math.max(startX + 1, 1); x < Math.min(endX - 1, width - 1); x += 1) {
      const idx = (y * width + x) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const left = 0.299 * data[(y * width + (x - 1)) * 4] + 0.587 * data[(y * width + (x - 1)) * 4 + 1] + 0.114 * data[(y * width + (x - 1)) * 4 + 2];
      const right = 0.299 * data[(y * width + (x + 1)) * 4] + 0.587 * data[(y * width + (x + 1)) * 4 + 1] + 0.114 * data[(y * width + (x + 1)) * 4 + 2];
      const top = 0.299 * data[((y - 1) * width + x) * 4] + 0.587 * data[((y - 1) * width + x) * 4 + 1] + 0.114 * data[((y - 1) * width + x) * 4 + 2];
      const bottom = 0.299 * data[((y + 1) * width + x) * 4] + 0.587 * data[((y + 1) * width + x) * 4 + 1] + 0.114 * data[((y + 1) * width + x) * 4 + 2];
      edgeSum += Math.abs(gray * 4 - left - right - top - bottom);
    }
  }

  const avgBrightness = sampleCount > 0 ? totalLuminance / sampleCount : 0;
  const variance = sampleCount > 0 ? Math.max(0, (totalLuminanceSquared / sampleCount) - avgBrightness * avgBrightness) : 0;

  return {
    avgBrightness,
    contrast: Math.sqrt(variance),
    sharpness: edgeSum / Math.max(1, Math.max(endX - startX - 2, 1) * Math.max(endY - startY - 2, 1)),
    highlightClippingScore: sampleCount > 0 ? highlightCount / sampleCount : 0,
  };
}

function computeBackgroundMetrics(imageData: ImageData) {
  const { data, width, height } = imageData;
  const topLimit = Math.max(6, Math.floor(height * 0.16));
  const sideLimit = Math.max(8, Math.floor(width * 0.12));
  let total = 0;
  let blueCount = 0;
  let whiteCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inTop = y < topLimit;
      const inLeft = x < sideLimit && y < height * 0.88;
      const inRight = x >= width - sideLimit && y < height * 0.88;

      if (!inTop && !inLeft && !inRight) continue;

      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      total += 1;
      if (isBlueBackgroundPixel(r, g, b)) blueCount += 1;
      if (isWhiteBackgroundPixel(r, g, b)) whiteCount += 1;
    }
  }

  return {
    backgroundScore: total > 0 ? blueCount / total : 0,
    whiteBackgroundScore: total > 0 ? whiteCount / total : 0,
  };
}

function estimateFaceFromSkinMask(imageData: ImageData) {
  const { data, width, height } = imageData;
  const startX = Math.floor(width * 0.14);
  const endX = Math.ceil(width * 0.86);
  const startY = Math.floor(height * 0.06);
  const endY = Math.ceil(height * 0.72);

  const roiWidth = endX - startX;
  const roiHeight = endY - startY;
  const mask = new Uint8Array(roiWidth * roiHeight);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * width + x) * 4;
      if (isSkinTone(data[idx], data[idx + 1], data[idx + 2])) {
        mask[(y - startY) * roiWidth + (x - startX)] = 1;
      }
    }
  }

  const visited = new Uint8Array(mask.length);
  const components: PortraitFaceBox[] = [];
  const minPixels = Math.max(120, Math.floor(roiWidth * roiHeight * 0.008));

  for (let y = 0; y < roiHeight; y += 1) {
    for (let x = 0; x < roiWidth; x += 1) {
      const index = y * roiWidth + x;
      if (!mask[index] || visited[index]) continue;

      const stack = [index];
      visited[index] = 1;
      let area = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      while (stack.length > 0) {
        const current = stack.pop()!;
        const cx = current % roiWidth;
        const cy = Math.floor(current / roiWidth);
        area += 1;
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);

        const neighbors = [
          current - 1,
          current + 1,
          current - roiWidth,
          current + roiWidth,
        ];

        for (const next of neighbors) {
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;

          const nx = next % roiWidth;
          const ny = Math.floor(next / roiWidth);
          if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;

          visited[next] = 1;
          stack.push(next);
        }
      }

      if (area < minPixels) continue;

      components.push({
        x: (minX + startX) / width,
        y: (minY + startY) / height,
        width: (maxX - minX + 1) / width,
        height: (maxY - minY + 1) / height,
        confidence: clamp(area / (roiWidth * roiHeight), 0.1, 0.99),
      });
    }
  }

  components.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  return {
    faceCount: components.length,
    faceBox: components[0] || null,
  };
}

async function detectNativeFaces(canvas: HTMLCanvasElement): Promise<{ faceCount: number; faceBox: PortraitFaceBox | null; faceTiltDegrees: number | null } | null> {
  type FaceDetectorInstance = {
    detect(input: HTMLCanvasElement): Promise<Array<{
      boundingBox?: { x: number; y: number; width: number; height: number };
      landmarks?: Array<{ type?: string; locations?: Array<{ x: number; y: number }> }>;
    }>>;
  };

  const FaceDetectorCtor = (globalThis as { FaceDetector?: new (options?: unknown) => FaceDetectorInstance }).FaceDetector;
  if (!FaceDetectorCtor) return null;

  try {
    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 5 });
    const faces = await detector.detect(canvas);
    if (!faces || faces.length === 0) {
      return { faceCount: 0, faceBox: null, faceTiltDegrees: null };
    }

    const width = canvas.width;
    const height = canvas.height;
    const primary = faces
      .map((face) => {
        const box = face.boundingBox || { x: 0, y: 0, width: 0, height: 0 };
        let faceTiltDegrees: number | null = null;

        const eyeLandmark = face.landmarks?.find((landmark) => landmark.type === 'eye');
        const leftEye = eyeLandmark?.locations?.[0];
        const rightEye = eyeLandmark?.locations?.[1];
        if (leftEye && rightEye) {
          faceTiltDegrees = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
        }

        return {
          area: box.width * box.height,
          faceBox: {
            x: box.x / width,
            y: box.y / height,
            width: box.width / width,
            height: box.height / height,
            confidence: 0.98,
          },
          faceTiltDegrees,
        };
      })
      .sort((a, b) => b.area - a.area)[0];

    return {
      faceCount: faces.length,
      faceBox: primary.faceBox,
      faceTiltDegrees: primary.faceTiltDegrees,
    };
  } catch {
    return null;
  }
}

function evaluatePortraitMetrics(metrics: PortraitPhotoMetrics, stage: PortraitValidationStage): PortraitPhotoValidationResult {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const isEditor = stage === 'editor';

  const minBrightness = isEditor ? 66 : 74;
  const maxBrightness = isEditor ? 224 : 216;
  const warnMinBrightness = isEditor ? 82 : 90;
  const warnMaxBrightness = isEditor ? 206 : 200;

  const minSharpness = isEditor ? 3.8 : 4.6;
  const warnSharpness = isEditor ? 6.5 : 7.8;

  const maxWhiteBackgroundScore = isEditor ? 0.64 : 0.58;
  const minBlueBackgroundScore = isEditor ? 0.24 : 0.3;
  const warnBlueBackgroundScore = isEditor ? 0.38 : 0.42;

  const minFaceWidth = isEditor ? 0.13 : 0.14;
  const minFaceHeight = isEditor ? 0.16 : 0.17;
  const maxFaceWidth = isEditor ? 0.56 : 0.5;
  const maxFaceHeight = isEditor ? 0.68 : 0.6;
  const maxFaceBottom = isEditor ? 0.8 : 0.74;
  const minCenterX = isEditor ? 0.34 : 0.36;
  const maxCenterX = isEditor ? 0.66 : 0.64;
  const minCenterY = isEditor ? 0.2 : 0.22;
  const maxCenterY = isEditor ? 0.6 : 0.57;
  const minFaceTop = isEditor ? -0.02 : 0;
  const maxTiltDegrees = isEditor ? 12 : 10;
  const maxFaceBrightness = isEditor ? 214 : 206;
  const warnFaceBrightness = isEditor ? 198 : 192;
  const minFaceContrast = isEditor ? 22 : 24;
  const warnFaceContrast = isEditor ? 28 : 30;
  const minFaceSharpness = isEditor ? 4.6 : 5.2;
  const warnFaceSharpness = isEditor ? 6.5 : 7.2;
  const maxHighlightClippingScore = isEditor ? 0.16 : 0.12;
  const warnHighlightClippingScore = isEditor ? 0.08 : 0.06;

  if (stage === 'upload' && (metrics.width < MIN_UPLOAD_WIDTH || metrics.height < MIN_UPLOAD_HEIGHT)) {
    blockingReasons.push('Ảnh 3x4 quá nhỏ hoặc bị vỡ. Vui lòng dùng file mềm rõ nét từ tiệm chụp.');
  }

  if (metrics.avgBrightness < minBrightness) {
    blockingReasons.push('Ảnh quá tối. Vui lòng dùng ảnh sáng rõ hơn.');
  } else if (metrics.avgBrightness > maxBrightness) {
    blockingReasons.push('Ảnh quá sáng hoặc bị lóa. Vui lòng dùng ảnh không chói sáng.');
  } else if (metrics.avgBrightness < warnMinBrightness || metrics.avgBrightness > warnMaxBrightness) {
    warnings.push('Ánh sáng ảnh chưa tối ưu, nên dùng ảnh sáng đều hơn.');
  }

  if (metrics.sharpness < minSharpness) {
    blockingReasons.push('Ảnh quá mờ. Vui lòng dùng ảnh rõ nét, không chụp lại từ ảnh giấy.');
  } else if (metrics.sharpness < warnSharpness) {
    warnings.push('Ảnh hơi mềm nét, nên thay bằng file rõ hơn nếu có.');
  }

  if (metrics.whiteBackgroundScore > maxWhiteBackgroundScore) {
    blockingReasons.push('Ảnh 3x4 không hợp lệ: nền trắng. Hệ thống chỉ nhận ảnh nền xanh.');
  } else if (metrics.backgroundScore < minBlueBackgroundScore) {
    blockingReasons.push('Ảnh 3x4 không hợp lệ: nền không phải nền xanh hoặc nền quá lẫn tạp.');
  } else if (metrics.backgroundScore < warnBlueBackgroundScore) {
    warnings.push('Nền xanh chưa đủ sạch, nên thay ảnh nền xanh đồng đều hơn.');
  }

  if (metrics.faceCount !== 1 || !metrics.faceBox) {
    blockingReasons.push('Ảnh phải có đúng 1 khuôn mặt rõ ràng, nhìn chính diện.');
  } else {
    const centerX = metrics.faceBox.x + metrics.faceBox.width / 2;
    const centerY = metrics.faceBox.y + metrics.faceBox.height / 2;
    const bottom = metrics.faceBox.y + metrics.faceBox.height;

    if (metrics.faceBox.width < minFaceWidth || metrics.faceBox.height < minFaceHeight) {
      blockingReasons.push('Khuôn mặt quá nhỏ trong khung ảnh. Vui lòng dùng ảnh đầu-vai gần hơn.');
    }

    if (metrics.faceBox.width > maxFaceWidth || metrics.faceBox.height > maxFaceHeight || bottom > maxFaceBottom) {
      blockingReasons.push('Ảnh giống selfie hoặc cận mặt quá mức, không đúng bố cục ảnh thẻ đầu-vai.');
    }

    if (centerX < minCenterX || centerX > maxCenterX) {
      blockingReasons.push('Khuôn mặt chưa nằm giữa khung ảnh thẻ.');
    }

    if (centerY < minCenterY || centerY > maxCenterY) {
      blockingReasons.push('Bố cục đầu-vai chưa đúng chuẩn ảnh thẻ.');
    }

    if (metrics.faceBox.y < minFaceTop) {
      blockingReasons.push('Đầu đang chạm mép trên. Vui lòng chừa khoảng trống phía trên đầu.');
    }

    if (metrics.faceTiltDegrees !== null && Math.abs(metrics.faceTiltDegrees) > maxTiltDegrees) {
      blockingReasons.push('Ảnh bị nghiêng. Vui lòng dùng ảnh nhìn thẳng chính diện.');
    }
  }

  if (metrics.faceCount === 1 && metrics.faceBox) {
    if (metrics.faceAvgBrightness > maxFaceBrightness || metrics.highlightClippingScore > maxHighlightClippingScore) {
      blockingReasons.push('Vùng khuôn mặt bị cháy sáng hoặc lóa mạnh. Vui lòng dùng ảnh sáng đều, không chiếu đèn trực tiếp.');
    } else if (metrics.faceAvgBrightness > warnFaceBrightness || metrics.highlightClippingScore > warnHighlightClippingScore) {
      warnings.push('Khuôn mặt hơi sáng gắt. Nên dùng ảnh ánh sáng mềm và đều hơn.');
    }

    if (metrics.faceContrast < minFaceContrast) {
      blockingReasons.push('Khuôn mặt thiếu tương phản nên không đủ rõ nét cho ảnh thẻ.');
    } else if (metrics.faceContrast < warnFaceContrast) {
      warnings.push('Chi tiết khuôn mặt còn hơi bệt, nên thay bằng file rõ hơn nếu có.');
    }

    if (metrics.faceSharpness < minFaceSharpness) {
      blockingReasons.push('Vùng khuôn mặt bị mềm hoặc mờ. Vui lòng dùng file ảnh rõ nét hơn.');
    } else if (metrics.faceSharpness < warnFaceSharpness) {
      warnings.push('Khuôn mặt hơi mềm nét, nên thay bằng file gốc rõ hơn.');
    }
  }

  return {
    isValid: blockingReasons.length === 0,
    blockingReasons: Array.from(new Set(blockingReasons)),
    warnings: Array.from(new Set(warnings)),
    metrics,
  };
}

function buildCanvasFromImage(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể khởi tạo canvas để kiểm tra ảnh thẻ.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

async function loadImage(file: Blob) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc ảnh thẻ đã chọn.'));
    };
    image.src = url;
  });
}

async function validatePortraitCanvasInternal(canvas: HTMLCanvasElement, sourceWidth: number, sourceHeight: number, options: ValidationOptions = {}): Promise<PortraitPhotoValidationResult> {
  const analysisCanvas = buildCanvasFromImage(canvas, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
  const ctx = analysisCanvas.getContext('2d');
  if (!ctx) throw new Error('Không thể kiểm tra ảnh thẻ.');
  const imageData = ctx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);

  const quality = computeImageQuality(imageData);
  const background = computeBackgroundMetrics(imageData);
  const estimatedFace = estimateFaceFromSkinMask(imageData);
  const nativeFace = options.useNativeFaceDetector === false ? null : await detectNativeFaces(analysisCanvas);

  const metrics: PortraitPhotoMetrics = {
    width: sourceWidth,
    height: sourceHeight,
    avgBrightness: quality.avgBrightness,
    sharpness: quality.sharpness,
    faceAvgBrightness: 0,
    faceSharpness: 0,
    faceContrast: 0,
    highlightClippingScore: 0,
    backgroundScore: background.backgroundScore,
    whiteBackgroundScore: background.whiteBackgroundScore,
    faceCount: nativeFace?.faceCount ?? estimatedFace.faceCount,
    faceDetectionMode: nativeFace ? 'native' : 'estimated',
    faceBox: nativeFace?.faceBox ?? estimatedFace.faceBox,
    faceTiltDegrees: nativeFace?.faceTiltDegrees ?? null,
  };

  const faceRegion = metrics.faceBox
    ? {
        x: clamp(metrics.faceBox.x - metrics.faceBox.width * 0.08, 0, 0.9),
        y: clamp(metrics.faceBox.y - metrics.faceBox.height * 0.06, 0, 0.9),
        width: clamp(metrics.faceBox.width * 1.16, 0.1, 0.9),
        height: clamp(metrics.faceBox.height * 1.12, 0.12, 0.9),
      }
    : {
        x: 0.26,
        y: 0.14,
        width: 0.48,
        height: 0.46,
      };

  const faceQuality = computeRegionQuality(imageData, faceRegion);
  metrics.faceAvgBrightness = faceQuality.avgBrightness;
  metrics.faceSharpness = faceQuality.sharpness;
  metrics.faceContrast = faceQuality.contrast;
  metrics.highlightClippingScore = faceQuality.highlightClippingScore;

  return evaluatePortraitMetrics(metrics, options.stage || 'upload');
}

export async function validatePortraitPhoto(file: File | Blob, options: ValidationOptions = {}): Promise<PortraitPhotoValidationResult> {
  const image = await loadImage(file);
  const canvas = buildCanvasFromImage(image, image.naturalWidth || image.width, image.naturalHeight || image.height);
  return validatePortraitCanvasInternal(canvas, image.naturalWidth || image.width, image.naturalHeight || image.height, options);
}

export async function validatePortraitPreviewCanvas(canvas: HTMLCanvasElement, options: ValidationOptions = {}): Promise<PortraitPhotoValidationResult> {
  return validatePortraitCanvasInternal(canvas, canvas.width, canvas.height, {
    ...options,
    useNativeFaceDetector: false,
    stage: options.stage || 'editor',
  });
}

export { evaluatePortraitMetrics };
