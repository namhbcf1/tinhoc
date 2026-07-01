/**
 * image-crop-core.ts
 *
 * Pure (React-free) image helpers shared by the unified ImageEditor.
 * This module deliberately fixes the failure modes of the old hand-written
 * canvas editors:
 *   1. EXIF orientation is baked into a clean JPEG once, up front, so every
 *      downstream measurement (display + crop) uses consistent pixels.
 *   2. Every output canvas is capped to a safe pixel budget so we never hit
 *      the iOS Safari canvas limit (~16.7M px) that made toBlob() return null.
 *   3. canvasToJpegFile() always resolves to a File or throws a clear error —
 *      it never silently swallows a null blob like the old desktop editor did.
 */

export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedImage {
  /** Object URL of an EXIF-normalized JPEG. Caller must revoke it. */
  url: string;
  width: number;
  height: number;
}

// Stay comfortably under the iOS Safari canvas limit (16,777,216 px) and the
// per-dimension limit some mobile GPUs enforce.
const MAX_CANVAS_EDGE = 4096;
const MAX_CANVAS_PIXELS = 12_000_000;
// Output resolution we actually need for the 3x4 pipeline (it re-renders at
// <=1536px anyway). Keeps files small and crops fast.
const TARGET_OUTPUT_EDGE = 1600;

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
    image.decoding = 'async';
    image.src = src;
  });
}

function getRadianAngle(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Axis-aligned bounding box of a (width x height) rect rotated by `rotation` degrees. */
function rotateSize(width: number, height: number, rotation: number) {
  const rad = getRadianAngle(rotation);
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: cos * width + sin * height,
    height: sin * width + cos * height,
  };
}

/**
 * Bake EXIF orientation into a fresh JPEG so the image the user sees and the
 * pixels we crop are always in the same coordinate space. Uses createImageBitmap
 * with `imageOrientation: 'from-image'` when available, with a graceful fallback.
 */
export async function normalizeImageFile(file: File | Blob): Promise<NormalizedImage> {
  let drawSource: ImageBitmap | HTMLImageElement | null = null;
  let sourceWidth = 0;
  let sourceHeight = 0;

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      drawSource = bitmap;
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
    } catch {
      drawSource = null;
    }
  }

  if (!drawSource) {
    // Fallback: rely on the browser auto-applying EXIF orientation to <img>.
    const tmpUrl = URL.createObjectURL(file);
    try {
      const img = await loadImageElement(tmpUrl);
      drawSource = img;
      sourceWidth = img.naturalWidth || img.width;
      sourceHeight = img.naturalHeight || img.height;
    } finally {
      URL.revokeObjectURL(tmpUrl);
    }
  }

  if (!sourceWidth || !sourceHeight) {
    throw new Error('Ảnh không hợp lệ hoặc bị hỏng.');
  }

  // Downscale on normalize if the source is enormous, keeping us within budget.
  const scale = Math.min(
    1,
    MAX_CANVAS_EDGE / Math.max(sourceWidth, sourceHeight),
    Math.sqrt(MAX_CANVAS_PIXELS / (sourceWidth * sourceHeight)),
  );
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if ('close' in drawSource) drawSource.close();
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh (canvas).');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(drawSource as CanvasImageSource, 0, 0, targetWidth, targetHeight);
  if ('close' in drawSource) drawSource.close();

  const file2 = await canvasToJpegFile(canvas, 'normalized.jpg', 0.95);
  return {
    url: URL.createObjectURL(file2),
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Bake horizontal/vertical flips from a clean base image into a new object URL.
 * The cropper then displays exactly what will be cropped, so flip never causes
 * a preview/output mismatch. Always derives from the passed base (non-cumulative),
 * so toggling flip twice restores original quality.
 */
export async function buildFlippedImageUrl(
  baseUrl: string,
  flipHorizontal: boolean,
  flipVertical: boolean,
): Promise<string> {
  if (!flipHorizontal && !flipVertical) return baseUrl;

  const image = await loadImageElement(baseUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh (canvas).');

  ctx.translate(flipHorizontal ? width : 0, flipVertical ? height : 0);
  ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0);

  const file = await canvasToJpegFile(canvas, 'flipped.jpg', 0.95);
  return URL.createObjectURL(file);
}

/**
 * Render the cropped region into a canvas following react-easy-crop's official
 * getCroppedImg pattern: draw the full image onto a rotation-sized stage, then
 * extract the crop rect that the cropper reported (already rotation-aware).
 *
 * The `imageSrc` MUST be the exact image shown in the cropper (flips already
 * baked in), so only rotation is reproduced here.
 *
 * Output is capped to a safe pixel budget so we never exceed the iOS canvas
 * limit that made the old editor's toBlob() silently return null.
 */
export async function getCroppedCanvas(
  imageSrc: string,
  pixelCrop: CropPixels,
  rotation: number,
  maxOutputEdge: number = TARGET_OUTPUT_EDGE,
): Promise<HTMLCanvasElement> {
  const image = await loadImageElement(imageSrc);
  const imgWidth = image.naturalWidth || image.width;
  const imgHeight = image.naturalHeight || image.height;

  const bbox = rotateSize(imgWidth, imgHeight, rotation);

  // Uniform draw scale satisfying BOTH the quality target (crop output edge) and
  // the hard safety budget (canvas edge + total pixels). Downscale only.
  const drawScale = Math.min(
    1,
    maxOutputEdge / Math.max(pixelCrop.width, pixelCrop.height),
    MAX_CANVAS_EDGE / Math.max(bbox.width, bbox.height),
    Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, bbox.width * bbox.height)),
  );

  const stageWidth = Math.max(1, Math.round(bbox.width * drawScale));
  const stageHeight = Math.max(1, Math.round(bbox.height * drawScale));

  const stage = document.createElement('canvas');
  stage.width = stageWidth;
  stage.height = stageHeight;
  const stageCtx = stage.getContext('2d');
  if (!stageCtx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh (canvas).');

  stageCtx.imageSmoothingEnabled = true;
  stageCtx.imageSmoothingQuality = 'high';
  stageCtx.translate(stageWidth / 2, stageHeight / 2);
  stageCtx.rotate(getRadianAngle(rotation));
  stageCtx.scale(drawScale, drawScale);
  stageCtx.translate(-imgWidth / 2, -imgHeight / 2);
  stageCtx.drawImage(image, 0, 0);

  const cropW = Math.max(1, Math.round(pixelCrop.width * drawScale));
  const cropH = Math.max(1, Math.round(pixelCrop.height * drawScale));
  const cropX = Math.round(pixelCrop.x * drawScale);
  const cropY = Math.round(pixelCrop.y * drawScale);

  const output = document.createElement('canvas');
  output.width = cropW;
  output.height = cropH;
  const outCtx = output.getContext('2d');
  if (!outCtx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh (canvas).');

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(stage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return output;
}

/**
 * Convert a canvas to a JPEG File. Always resolves to a File or throws — uses a
 * toDataURL fallback when toBlob returns null (older Safari / large canvases).
 */
export async function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality = 0.95,
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((value) => resolve(value), 'image/jpeg', quality);
    } catch {
      resolve(null);
    }
  });

  if (blob) {
    return new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() });
  }

  // Fallback for environments where toBlob fails/returns null.
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl && dataUrl.startsWith('data:image/jpeg')) {
      const response = await fetch(dataUrl);
      const fallbackBlob = await response.blob();
      if (fallbackBlob && fallbackBlob.size > 0) {
        return new File([fallbackBlob], fileName, { type: 'image/jpeg', lastModified: Date.now() });
      }
    }
  } catch {
    // fall through to the thrown error below
  }

  throw new Error('Không thể tạo ảnh sau khi cắt. Ảnh có thể quá lớn, vui lòng thử ảnh khác.');
}

/** Crop + export to a JPEG File in one call (used on confirm). */
export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: CropPixels,
  rotation: number,
  fileName: string,
  quality = 0.95,
): Promise<File> {
  const canvas = await getCroppedCanvas(imageSrc, pixelCrop, rotation, TARGET_OUTPUT_EDGE);
  return canvasToJpegFile(canvas, fileName, quality);
}
