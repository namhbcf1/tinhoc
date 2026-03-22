import { detectDocumentFromImageData } from '../../utils/documentDetection';
import { getOverlayBox, getOverlayRatio } from './overlayUtils';

const MAX_DETECTION_EDGE = 1400;
const MIN_ANALYSIS_EDGE = 160;
const MIN_BOX_AREA_RATIO = 0.015;
const MAX_BOX_AREA_RATIO = 0.92;
const MAX_ASPECT_DELTA_RATIO = 0.28;

export interface DocumentAutoFitBox {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
}

export async function detectDocumentAutoFitBox(
    image: HTMLImageElement,
    type: 'cccd_front' | 'cccd_back' | 'photo_3x4'
): Promise<DocumentAutoFitBox | null> {
    if (typeof document === 'undefined' || type === 'photo_3x4') {
        return null;
    }

    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) {
        return null;
    }

    const downscale = Math.min(1, MAX_DETECTION_EDGE / Math.max(naturalWidth, naturalHeight));
    const analysisWidth = Math.max(MIN_ANALYSIS_EDGE, Math.round(naturalWidth * downscale));
    const analysisHeight = Math.max(MIN_ANALYSIS_EDGE, Math.round(naturalHeight * downscale));

    const canvas = document.createElement('canvas');
    canvas.width = analysisWidth;
    canvas.height = analysisHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        return null;
    }

    ctx.drawImage(image, 0, 0, analysisWidth, analysisHeight);

    const imageData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
    const overlay = getOverlayBox(type, analysisWidth, analysisHeight, { maxHeightRatio: 0.9 });
    const detection = detectDocumentFromImageData(imageData, {
        x: overlay.overlayX,
        y: overlay.overlayY,
        width: overlay.overlayWidth,
        height: overlay.overlayHeight,
    });

    if (!detection?.boundingBox) {
        return null;
    }

    const { boundingBox, confidence = 0 } = detection;
    const areaRatio = (boundingBox.width * boundingBox.height) / (analysisWidth * analysisHeight);
    if (areaRatio < MIN_BOX_AREA_RATIO || areaRatio > MAX_BOX_AREA_RATIO) {
        return null;
    }

    const expectedAspect = getOverlayRatio(type).aspect;
    const detectedAspect = boundingBox.width / Math.max(1, boundingBox.height);
    const aspectDeltaRatio = Math.abs(detectedAspect - expectedAspect) / expectedAspect;
    if (aspectDeltaRatio > MAX_ASPECT_DELTA_RATIO) {
        return null;
    }

    const fillsAlmostFullFrame =
        boundingBox.width / analysisWidth > 0.97 &&
        boundingBox.height / analysisHeight > 0.97;
    if (fillsAlmostFullFrame) {
        return null;
    }

    const scaleBack = naturalWidth / analysisWidth;

    return {
        x: boundingBox.x * scaleBack,
        y: boundingBox.y * scaleBack,
        width: boundingBox.width * scaleBack,
        height: boundingBox.height * scaleBack,
        confidence,
    };
}
