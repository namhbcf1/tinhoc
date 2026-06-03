// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  Loader2,
  Maximize2,
  RotateCcw,
  RotateCw,
  ScanSearch,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useIsMobile } from '../../utils/deviceDetection';
import { detectDocumentAutoFitBox } from './documentAutoFit';
import { getOverlayBox } from './overlayUtils';
import {
  buildManualCropOcrVariants,
  canvasToFile,
  cropTightDocumentCanvas,
  type DocumentProcessingMeta,
  getDocumentOutputSize,
} from './document-normalization';
import './DocumentSmartEditor.css';

type UploadType = 'cccd_front' | 'cccd_back';
type CCCDAuxiliaryFiles = Partial<Record<
  'sourceOriginal' | 'normalizedOriginal' | 'ocrRestoreBalanced' | 'ocrRestoreTextPriority',
  File
>>;

type ConfirmPayload = {
  file: File;
  processingMeta?: DocumentProcessingMeta | null;
  auxiliaryFiles?: CCCDAuxiliaryFiles | null;
};

interface Props {
  imageFile: File;
  type: UploadType;
  templateImage?: string;
  onConfirm: (payload: ConfirmPayload | File) => void | Promise<void>;
  onCancel: () => void;
}

async function canvasToNamedFile(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.98);
  });

  if (!blob) {
    throw new Error('Khong the tao file OCR tu anh da cat.');
  }

  return new File([blob], filename, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

async function imageFileToCanvas(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return canvas;
}

type NormalizationState =
  | {
      status: 'checking';
      previewUrl: null;
      normalizedCanvas: null;
      warnings: string[];
      blockingReasons: string[];
      qualityScore: number;
      detectionConfidence: number;
      documentCorners: null;
      processingMeta: null;
      artifacts: null;
    }
  | {
      status: 'ready' | 'needs_review' | 'manual' | 'blocked';
      previewUrl: string | null;
      normalizedCanvas: HTMLCanvasElement | null;
      warnings: string[];
      blockingReasons: string[];
      qualityScore: number;
      detectionConfidence: number;
      documentCorners: Array<{ x: number; y: number }> | null;
      processingMeta: null;
      artifacts: null;
    };

const TYPE_LABELS: Record<UploadType, string> = {
  cccd_front: 'CCCD mặt trước',
  cccd_back: 'CCCD mặt sau',
};

const AUTO_STATUS_TEXT: Record<'ready' | 'needs_review' | 'manual' | 'blocked', string> = {
  ready: 'Đã tự căn tốt',
  needs_review: 'Đã cải thiện, cần xem lại',
  manual: 'Cần chỉnh tay',
  blocked: 'Chưa đủ an toàn OCR',
};

function statusTone(status: NormalizationState['status']) {
  if (status === 'ready') return 'ready';
  if (status === 'needs_review') return 'review';
  if (status === 'blocked') return 'blocked';
  if (status === 'manual') return 'manual';
  return 'checking';
}

function buildStageMessage(result: NormalizationState) {
  if (result.status === 'checking') return 'Hệ thống đang nhận diện 4 góc thẻ, dựng ảnh phẳng và tạo bản OCR an toàn. Quá trình này có thể mất tới 3 phút, vui lòng không thoát ra.';
  if (result.status === 'ready') return 'Ảnh đã được cân lại khung, làm phẳng và tối ưu sáng để OCR ổn định hơn.';
  if (result.status === 'needs_review') return 'Hệ thống đã cố cân khung, giảm chói và làm rõ hơn. Bạn xem lại nhanh trước khi lưu.';
  if (result.status === 'manual') return 'Chưa nhận đủ 4 góc thẻ. Bạn có thể chỉnh tay để lấy ảnh dùng được.';
  return 'Hệ thống đã thử cân khung và cứu sáng, nhưng ảnh gốc vẫn thiếu chi tiết hoặc bị chói. Bạn nên chụp lại gần hơn hoặc đủ sáng hơn.';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildDocumentBoxFromCorners(
  corners: Array<{ x: number; y: number }> | null | undefined,
  sourceWidth: number,
  sourceHeight: number,
  type: UploadType,
) {
  if (!corners || corners.length !== 4 || !sourceWidth || !sourceHeight) {
    return null;
  }

  const xs = corners.map((corner) => Number(corner.x || 0));
  const ys = corners.map((corner) => Number(corner.y || 0));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rawWidth = maxX - minX;
  const rawHeight = maxY - minY;

  if (rawWidth < 20 || rawHeight < 20) {
    return null;
  }

  const paddingX = rawWidth * (type === 'cccd_front' ? 0.1 : 0.085);
  const paddingTop = rawHeight * 0.08;
  const paddingBottom = rawHeight * (type === 'cccd_front' ? 0.2 : 0.16);
  const x = clamp(minX - paddingX, 0, Math.max(sourceWidth - 1, 0));
  const y = clamp(minY - paddingTop, 0, Math.max(sourceHeight - 1, 0));
  const right = clamp(maxX + paddingX, x + 1, sourceWidth);
  const bottom = clamp(maxY + paddingBottom, y + 1, sourceHeight);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    confidence: 1,
  };
}

function buildSafeStageMessage(result: NormalizationState) {
  if (result.status === 'checking') return 'He thong dang nhan dien the, can bo cuc va tao ban phuc hoi an toan OCR. Qua trinh nay co the mat toi 3 phut, vui long khong thoat ra.';
  if (result.status === 'ready') return 'He thong da can khung va cai thien anh trong gioi han an toan cho OCR.';
  if (result.status === 'needs_review') return 'He thong da can khung va phuc hoi sang/net an toan. Ban xem nhanh truoc khi luu.';
  if (result.status === 'manual') return 'He thong chua tu can duoc an toan. Ban co the chinh tay roi luu ban da chuan hoa.';
  return 'Anh van chua du chi tiet de OCR an toan. He thong khong tao lai noi dung CCCD, ban nen chup lai ro hon.';
}

function DocumentPreview({
  title,
  imageUrl,
  badge,
}: {
  title: string;
  imageUrl: string | null;
  badge?: string;
}) {
  return (
    <div className="document-smart-preview-card">
      <div className="document-smart-preview-header">
        <span>{title}</span>
        {badge ? <span className="document-smart-preview-badge">{badge}</span> : null}
      </div>
      <div className="document-smart-preview-frame">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="document-smart-preview-image" />
        ) : (
          <div className="document-smart-preview-empty">
            <ScanSearch size={24} />
            <span>Chưa có bản xem trước</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentSmartEditor({
  imageFile,
  type,
  onConfirm,
  onCancel,
}: Props) {
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourcePreviewRef = useRef<string | null>(null);
  const initialTransformRef = useRef({ scale: 1, tx: 0, ty: 0 });
  const dragStateRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const pinchStateRef = useRef<{
    distance: number;
    scale: number;
    tx: number;
    ty: number;
    focusX: number;
    focusY: number;
  } | null>(null);
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });

  const [mounted, setMounted] = useState(false);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [normalization, setNormalization] = useState<NormalizationState>({
    status: 'checking',
    previewUrl: null,
    normalizedCanvas: null,
    warnings: [],
    blockingReasons: [],
    qualityScore: 0,
    detectionConfidence: 0,
    documentCorners: null,
    processingMeta: null,
    artifacts: null,
  });
  const [manualMode, setManualMode] = useState(false);
  const [manualError, setManualError] = useState('');
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [rotation, setRotation] = useState(0);

  const overlayConfig = useMemo(() => ({
    maxHeightRatio: isMobile ? 0.82 : 0.88,
    centerYOffset: -0.03,
  }), [isMobile]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    translateRef.current = { x: translateX, y: translateY };
  }, [translateX, translateY]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return undefined;
    }

    let cancelled = false;

    const refreshIfStaleBuild = async () => {
      try {
        const response = await fetch(`/index.html?vt-build-check=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const html = await response.text();
        if (!cancelled && typeof __VT_BUILD_ID__ !== 'undefined' && __VT_BUILD_ID__ && !html.includes(`-${__VT_BUILD_ID__}-`)) {
          window.location.reload();
        }
      } catch {
        // Ignore version check failures and continue with the current bundle.
      }
    };

    void refreshIfStaleBuild();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const previewUrl = URL.createObjectURL(imageFile);
    sourcePreviewRef.current = previewUrl;
    setSourcePreviewUrl(previewUrl);
    return () => {
      URL.revokeObjectURL(previewUrl);
      sourcePreviewRef.current = null;
    };
  }, [imageFile]);

  const calculateOverlay = useCallback((containerWidth: number, containerHeight: number) => (
    getOverlayBox(type, containerWidth, containerHeight, overlayConfig)
  ), [overlayConfig, type]);

  const getImageDimensions = useCallback(() => {
    const image = imageRef.current;
    if (!image) return { width: 1, height: 1 };
    const naturalWidth = image.naturalWidth || image.width || 1;
    const naturalHeight = image.naturalHeight || image.height || 1;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    return {
      width: naturalWidth * cos + naturalHeight * sin,
      height: naturalWidth * sin + naturalHeight * cos,
    };
  }, [rotation]);

  const computeCoverScale = useCallback((overlayWidth: number, overlayHeight: number) => {
    const dimensions = getImageDimensions();
    return Math.max(overlayWidth / dimensions.width, overlayHeight / dimensions.height) * 1.002;
  }, [getImageDimensions]);

  const clampTranslate = useCallback((nextScale: number, nextTx: number, nextTy: number) => {
    const container = containerRef.current;
    if (!container) return { tx: nextTx, ty: nextTy };

    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const overlay = calculateOverlay(containerWidth, containerHeight);
    const dimensions = getImageDimensions();
    const effectiveWidth = dimensions.width * nextScale;
    const effectiveHeight = dimensions.height * nextScale;

    const overlayLeft = overlay.overlayX;
    const overlayRight = overlay.overlayX + overlay.overlayWidth;
    const overlayTop = overlay.overlayY;
    const overlayBottom = overlay.overlayY + overlay.overlayHeight;

    const minTx = overlayRight - containerWidth / 2 - effectiveWidth / 2;
    const maxTx = overlayLeft - containerWidth / 2 + effectiveWidth / 2;
    const minTy = overlayBottom - containerHeight / 2 - effectiveHeight / 2;
    const maxTy = overlayTop - containerHeight / 2 + effectiveHeight / 2;

    return {
      tx: clamp(nextTx, minTx, maxTx),
      ty: clamp(nextTy, minTy, maxTy),
    };
  }, [calculateOverlay, getImageDimensions]);

  const computeInitialTransform = useCallback(async (image: HTMLImageElement) => {
    const container = containerRef.current;
    if (!container) return { scale: 1, tx: 0, ty: 0 };
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const overlay = calculateOverlay(containerWidth, containerHeight);
    const imageWidth = image.naturalWidth || image.width || 1;
    const imageHeight = image.naturalHeight || image.height || 1;
    let nextScale = Math.max(overlay.overlayWidth / imageWidth, overlay.overlayHeight / imageHeight) * 1.002;
    let nextTx = 0;
    let nextTy = 0;

    const detectedBox = buildDocumentBoxFromCorners(
      normalization.documentCorners,
      imageWidth,
      imageHeight,
      type,
    ) || await detectDocumentAutoFitBox(image, type);
    if (detectedBox) {
      const detectedScale = Math.max(
        overlay.overlayWidth / detectedBox.width,
        overlay.overlayHeight / detectedBox.height,
      ) * 1.02;
      nextScale = Math.max(nextScale, detectedScale);
      nextTx = (imageWidth / 2 - (detectedBox.x + detectedBox.width / 2)) * nextScale;
      nextTy = (imageHeight / 2 - (detectedBox.y + detectedBox.height / 2)) * nextScale;
    }

    return {
      scale: nextScale,
      ...clampTranslate(nextScale, nextTx, nextTy),
    };
  }, [calculateOverlay, clampTranslate, normalization.documentCorners, type]);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();

    image.onload = async () => {
      if (cancelled) return;
      imageRef.current = image;
      setRotation(0);

      setNormalization({
        status: 'manual',
        previewUrl: null,
        normalizedCanvas: null,
        warnings: [],
        blockingReasons: [],
        qualityScore: 0,
        detectionConfidence: 0,
        documentCorners: null,
        processingMeta: null,
        artifacts: null,
      });
      setManualMode(true);
    };

    image.onerror = () => {
      if (!cancelled) {
        setNormalization({
          status: 'blocked',
          previewUrl: null,
          normalizedCanvas: null,
          warnings: [],
          blockingReasons: ['Không thể mở ảnh CCCD này.'],
          qualityScore: 0,
          detectionConfidence: 0,
          documentCorners: null,
          processingMeta: null,
          artifacts: null,
        });
        setManualMode(false);
      }
    };

    image.src = URL.createObjectURL(imageFile);
    return () => {
      cancelled = true;
      if (image.src.startsWith('blob:')) URL.revokeObjectURL(image.src);
    };
  }, [computeInitialTransform, imageFile, type]);

  useEffect(() => {
    if (!manualMode || !imageRef.current || !containerRef.current) return undefined;
    let cancelled = false;

    const initializeManualTransform = async () => {
      const initialTransform = await computeInitialTransform(imageRef.current as HTMLImageElement);
      if (cancelled) return;
      initialTransformRef.current = initialTransform;
      setScale(initialTransform.scale);
      setTranslateX(initialTransform.tx);
      setTranslateY(initialTransform.ty);
      scaleRef.current = initialTransform.scale;
      translateRef.current = { x: initialTransform.tx, y: initialTransform.ty };
      setRotation(0);
      setManualError('');
    };

    void initializeManualTransform();
    return () => {
      cancelled = true;
    };
  }, [computeInitialTransform, manualMode]);

  const drawManualCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const image = imageRef.current;
    if (!canvas || !container || !image) return;

    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    canvas.width = Math.round(containerWidth * dpr);
    canvas.height = Math.round(containerHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    const overlay = calculateOverlay(containerWidth, containerHeight);
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const imageWidth = image.naturalWidth || image.width || 1;
    const imageHeight = image.naturalHeight || image.height || 1;
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

    ctx.save();
    ctx.translate(centerX + translateX, centerY + translateY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.76)';
    ctx.fillRect(0, 0, containerWidth, overlay.overlayY);
    ctx.fillRect(0, overlay.overlayY + overlay.overlayHeight, containerWidth, containerHeight - overlay.overlayY - overlay.overlayHeight);
    ctx.fillRect(0, overlay.overlayY, overlay.overlayX, overlay.overlayHeight);
    ctx.fillRect(overlay.overlayX + overlay.overlayWidth, overlay.overlayY, containerWidth - overlay.overlayX - overlay.overlayWidth, overlay.overlayHeight);

    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.lineWidth = 3;
    ctx.strokeRect(overlay.overlayX, overlay.overlayY, overlay.overlayWidth, overlay.overlayHeight);

    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.92)';
    ctx.lineWidth = 2;
    ctx.strokeRect(overlay.overlayX + 12, overlay.overlayY + 12, overlay.overlayWidth - 24, overlay.overlayHeight - 24);
    ctx.setLineDash([]);
  }, [calculateOverlay, getImageDimensions, rotation, scale, translateX, translateY]);

  useEffect(() => {
    if (!manualMode) return undefined;
    drawManualCanvas();
    const onResize = () => drawManualCanvas();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [drawManualCanvas, manualMode]);

  const handleZoom = useCallback((delta: number) => {
    const container = containerRef.current;
    if (!container) return;
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const overlay = calculateOverlay(containerWidth, containerHeight);
    const minScale = computeCoverScale(overlay.overlayWidth, overlay.overlayHeight);
    const nextScale = clamp(scale + delta, minScale, 5);
    const clamped = clampTranslate(nextScale, translateX, translateY);
    setScale(nextScale);
    setTranslateX(clamped.tx);
    setTranslateY(clamped.ty);
    scaleRef.current = nextScale;
    translateRef.current = { x: clamped.tx, y: clamped.ty };
  }, [calculateOverlay, clampTranslate, computeCoverScale, scale, translateX, translateY]);

  const applyRotation = useCallback((nextRotation: number, resetPosition = false) => {
    const normalized = ((nextRotation % 360) + 360) % 360;
    setRotation(normalized);

    window.setTimeout(() => {
      const container = containerRef.current;
      const image = imageRef.current;
      if (!container || !image) return;

      const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
      const overlay = calculateOverlay(containerWidth, containerHeight);
      const imageWidth = image.naturalWidth || image.width || 1;
      const imageHeight = image.naturalHeight || image.height || 1;
      const rad = (normalized * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const effectiveWidth = imageWidth * cos + imageHeight * sin;
      const effectiveHeight = imageWidth * sin + imageHeight * cos;
      const minScale = Math.max(overlay.overlayWidth / effectiveWidth, overlay.overlayHeight / effectiveHeight) * 1.002;

      if (resetPosition) {
        const clamped = clampTranslate(minScale, 0, 0);
        setScale(minScale);
        setTranslateX(clamped.tx);
        setTranslateY(clamped.ty);
        scaleRef.current = minScale;
        translateRef.current = { x: clamped.tx, y: clamped.ty };
      } else {
        const currentScale = scaleRef.current;
        if (currentScale < minScale) {
          const clamped = clampTranslate(minScale, translateRef.current.x, translateRef.current.y);
          setScale(minScale);
          setTranslateX(clamped.tx);
          setTranslateY(clamped.ty);
          scaleRef.current = minScale;
          translateRef.current = { x: clamped.tx, y: clamped.ty };
        }
      }
    }, 0);
  }, [calculateOverlay, clampTranslate]);

  const handleRotate = useCallback(() => {
    applyRotation(rotation + 90, true);
  }, [applyRotation, rotation]);

  const handleRotateCCW = useCallback(() => {
    applyRotation(rotation - 90, true);
  }, [applyRotation, rotation]);

  const handleFineTune = useCallback((delta: number) => {
    applyRotation(rotation + delta, false);
  }, [applyRotation, rotation]);

  const handleReset = useCallback(() => {
    const initial = initialTransformRef.current;
    setScale(initial.scale);
    setTranslateX(initial.tx);
    setTranslateY(initial.ty);
    scaleRef.current = initial.scale;
    translateRef.current = { x: initial.tx, y: initial.ty };
    setRotation(0);
    setManualError('');
  }, []);

  const updateDragPosition = useCallback((clientX: number, clientY: number) => {
    const deltaX = clientX - dragStateRef.current.x;
    const deltaY = clientY - dragStateRef.current.y;
    dragStateRef.current.x = clientX;
    dragStateRef.current.y = clientY;
    const clamped = clampTranslate(scale, translateX + deltaX, translateY + deltaY);
    setTranslateX(clamped.tx);
    setTranslateY(clamped.ty);
    translateRef.current = { x: clamped.tx, y: clamped.ty };
  }, [clampTranslate, scale, translateX, translateY]);

  const onPointerDown = useCallback((event: any) => {
    if (!manualMode) return;
    if (event.pointerType === 'touch') return;
    event.preventDefault?.();
    dragStateRef.current = { active: true, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [manualMode]);

  const onPointerMove = useCallback((event: any) => {
    if (!dragStateRef.current.active || !manualMode) return;
    if (event.pointerType === 'touch') return;
    event.preventDefault?.();
    updateDragPosition(event.clientX, event.clientY);
  }, [manualMode, updateDragPosition]);

  const onPointerUp = useCallback((event: any) => {
    if (event.pointerType === 'touch') return;
    dragStateRef.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const onWheel = useCallback((event: any) => {
    if (!manualMode) return;
    event.preventDefault();
    handleZoom(event.deltaY > 0 ? -0.08 : 0.08);
  }, [handleZoom, manualMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !manualMode) return undefined;

    const getTouchDistance = (touches: TouchList) => {
      if (touches.length < 2) return null;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchMidpoint = (touches: TouchList, rect: DOMRect) => {
      if (touches.length < 2) return null;
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
        y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
      };
    };

    const touchStartHandler = (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1) {
        dragStateRef.current = {
          active: true,
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
        pinchStateRef.current = null;
        return;
      }

      if (event.touches.length === 2) {
        const containerRect = container.getBoundingClientRect();
        const distance = getTouchDistance(event.touches);
        const midpoint = getTouchMidpoint(event.touches, containerRect);
        if (distance) {
          dragStateRef.current.active = false;
          pinchStateRef.current = {
            distance,
            scale: scaleRef.current,
            tx: translateRef.current.x,
            ty: translateRef.current.y,
            focusX: midpoint?.x || 0,
            focusY: midpoint?.y || 0,
          };
        }
      }
    };

    const touchMoveHandler = (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1 && dragStateRef.current.active) {
        const deltaX = event.touches[0].clientX - dragStateRef.current.x;
        const deltaY = event.touches[0].clientY - dragStateRef.current.y;
        const clamped = clampTranslate(
          scaleRef.current,
          translateRef.current.x + deltaX,
          translateRef.current.y + deltaY,
        );
        translateRef.current = { x: clamped.tx, y: clamped.ty };
        dragStateRef.current.x = event.touches[0].clientX;
        dragStateRef.current.y = event.touches[0].clientY;
        setTranslateX(clamped.tx);
        setTranslateY(clamped.ty);
        return;
      }

      if (event.touches.length === 2 && pinchStateRef.current) {
        const distance = getTouchDistance(event.touches);
        const containerRect = container.getBoundingClientRect();
        const midpoint = getTouchMidpoint(event.touches, containerRect);
        if (!distance || !midpoint) return;

        const overlay = calculateOverlay(containerRect.width, containerRect.height);
        const minScale = computeCoverScale(overlay.overlayWidth, overlay.overlayHeight);
        const nextScale = clamp((distance / pinchStateRef.current.distance) * pinchStateRef.current.scale, minScale, 5);
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        const scaleRatio = nextScale / Math.max(pinchStateRef.current.scale, 0.0001);
        const nextTx = midpoint.x - centerX - scaleRatio * (pinchStateRef.current.focusX - centerX - pinchStateRef.current.tx);
        const nextTy = midpoint.y - centerY - scaleRatio * (pinchStateRef.current.focusY - centerY - pinchStateRef.current.ty);
        const clamped = clampTranslate(nextScale, nextTx, nextTy);
        scaleRef.current = nextScale;
        translateRef.current = { x: clamped.tx, y: clamped.ty };
        setScale(nextScale);
        setTranslateX(clamped.tx);
        setTranslateY(clamped.ty);
      }
    };

    const touchEndHandler = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        dragStateRef.current.active = false;
        pinchStateRef.current = null;
        return;
      }

      if (event.touches.length === 1) {
        pinchStateRef.current = null;
        dragStateRef.current = {
          active: true,
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }
    };

    const touchCancelHandler = () => {
      dragStateRef.current.active = false;
      pinchStateRef.current = null;
    };

    container.addEventListener('touchstart', touchStartHandler, { passive: false });
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    container.addEventListener('touchend', touchEndHandler, { passive: false });
    container.addEventListener('touchcancel', touchCancelHandler, { passive: false });

    return () => {
      container.removeEventListener('touchstart', touchStartHandler);
      container.removeEventListener('touchmove', touchMoveHandler);
      container.removeEventListener('touchend', touchEndHandler);
      container.removeEventListener('touchcancel', touchCancelHandler);
    };
  }, [calculateOverlay, clampTranslate, computeCoverScale, manualMode]);

  const createManualCropCanvas = useCallback(() => {
    const image = imageRef.current;
    const container = containerRef.current;
    if (!image || !container) return null;

    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const overlay = calculateOverlay(containerWidth, containerHeight);
    const minScale = computeCoverScale(overlay.overlayWidth, overlay.overlayHeight);
    const finalScale = Math.max(scale, minScale);
    const clamped = clampTranslate(finalScale, translateX, translateY);
    const output = getDocumentOutputSize();
    const canvas = document.createElement('canvas');
    canvas.width = output.width;
    canvas.height = output.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scaleFactor = output.width / overlay.overlayWidth;
    const imageWidth = image.naturalWidth || image.width || 1;
    const imageHeight = image.naturalHeight || image.height || 1;
    const drawWidth = imageWidth * finalScale * scaleFactor;
    const drawHeight = imageHeight * finalScale * scaleFactor;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 + clamped.tx * scaleFactor, canvas.height / 2 + clamped.ty * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
    return canvas;
  }, [calculateOverlay, clampTranslate, computeCoverScale, getImageDimensions, rotation, scale, translateX, translateY]);

  const handleManualConfirm = useCallback(async () => {
    setManualError('');
    const cropCanvas = createManualCropCanvas();
    if (!cropCanvas) {
      setManualError('Không thể tạo ảnh CCCD sau khi chỉnh tay.');
      return;
    }

    setSaving(true);
    try {
      const overlayFile = await canvasToNamedFile(cropCanvas, `cccd-${type}-manual-overlay.jpg`);
      let finalCanvas = cropCanvas;
      let autoWarped = false;
      let autoWarpConfidence = 0;

      try {
        const { autoWarpCCCD } = await import('./cccd-auto-warp');
        const warped = await autoWarpCCCD(overlayFile, {
          targetWidth: getDocumentOutputSize().width,
          targetHeight: getDocumentOutputSize().height,
        });
        autoWarped = warped.detected;
        autoWarpConfidence = warped.confidence;
        if (warped.detected) {
          const warpedCanvas = await imageFileToCanvas(warped.file);
          if (warpedCanvas) finalCanvas = warpedCanvas;
        }
      } catch (warpError) {
        console.warn('Manual CCCD auto-warp skipped:', warpError);
      }

      const tightCanvas = cropTightDocumentCanvas(finalCanvas, type);
      const file = await canvasToFile(tightCanvas, type);
      const variants = buildManualCropOcrVariants(tightCanvas, type);
      const auxiliaryFiles: CCCDAuxiliaryFiles = {
        sourceOriginal: overlayFile,
      };

      if (variants.artifacts?.normalizedOriginalCanvas) {
        auxiliaryFiles.normalizedOriginal = await canvasToNamedFile(
          variants.artifacts.normalizedOriginalCanvas,
          `cccd-${type}-normalized-original.jpg`,
        );
      }
      if (variants.artifacts?.ocrRestoreBalancedCanvas) {
        auxiliaryFiles.ocrRestoreBalanced = await canvasToNamedFile(
          variants.artifacts.ocrRestoreBalancedCanvas,
          `cccd-${type}-ocr-restore-balanced.jpg`,
        );
      }
      if (variants.artifacts?.ocrRestoreTextPriorityCanvas) {
        auxiliaryFiles.ocrRestoreTextPriority = await canvasToNamedFile(
          variants.artifacts.ocrRestoreTextPriorityCanvas,
          `cccd-${type}-ocr-restore-text-priority.jpg`,
        );
      }

      await onConfirm({
        file,
        processingMeta: {
          ...variants.processingMeta,
          autoRectified: autoWarped || Boolean(variants.processingMeta?.autoRectified),
          detectionConfidence: Math.max(Number(variants.processingMeta?.detectionConfidence || 0), autoWarpConfidence),
          cornerCount: autoWarped ? 4 : Number(variants.processingMeta?.cornerCount || 0),
        },
        auxiliaryFiles,
      });
    } finally {
      setSaving(false);
    }
  }, [createManualCropCanvas, onConfirm, type]);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const stageMessage = '';

  const manualPanel = (
    <div className="document-smart-manual-layout">
      <div
        ref={containerRef}
        className="document-smart-canvas-shell"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <canvas ref={canvasRef} className="document-smart-canvas" />
      </div>

      <div className="document-smart-manual-controls">
        <button type="button" className="document-smart-control-btn" onClick={() => handleZoom(-0.1)}>
          <ZoomOut size={18} />
          <span>Thu nhỏ</span>
        </button>
        <button type="button" className="document-smart-control-btn" onClick={() => handleZoom(0.1)}>
          <ZoomIn size={18} />
          <span>Phóng to</span>
        </button>
        <button type="button" className="document-smart-control-btn" onClick={handleRotateCCW}>
          <RotateCcw size={18} />
          <span>Xoay trái 90°</span>
        </button>
        <button type="button" className="document-smart-control-btn" onClick={handleRotate}>
          <RotateCw size={18} />
          <span>Xoay phải 90°</span>
        </button>
        <button type="button" className="document-smart-control-btn document-smart-control-btn--fine" onClick={() => handleFineTune(-15)}>
          <RotateCcw size={16} />
          <span>−15°</span>
        </button>
        <button type="button" className="document-smart-control-btn document-smart-control-btn--fine" onClick={() => handleFineTune(15)}>
          <RotateCw size={16} />
          <span>+15°</span>
        </button>
        <button type="button" className="document-smart-control-btn" onClick={handleReset}>
          <Maximize2 size={18} />
          <span>Canh vừa thẻ</span>
        </button>
      </div>

      {manualError ? (
        <div className="document-smart-inline-error">
          <AlertCircle size={16} />
          <span>{manualError}</span>
        </div>
      ) : null}

      <div className="document-smart-manual-actions">
        <button type="button" className="document-smart-ghost-btn" onClick={onCancel}>
          <Upload size={16} />
          <span>Ảnh khác</span>
        </button>
        <button type="button" className="document-smart-primary-btn" onClick={() => { void handleManualConfirm(); }} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
          <span>Xác nhận vùng CCCD và OCR</span>
        </button>
      </div>
    </div>
  );

  return createPortal(
    <div className={`document-smart-modal ${isMobile ? 'is-mobile' : ''}`} onClick={(event) => {
      if (event.target === event.currentTarget && !saving) onCancel();
    }}>
      <div className="document-smart-card" onClick={(event) => event.stopPropagation()}>
        <div className="document-smart-header">
          <div className="document-smart-header-copy">
            <span className="document-smart-eyebrow">Smart crop-first</span>
            <h3>{TYPE_LABELS[type]}</h3>
          </div>
          <button type="button" className="document-smart-close-btn" onClick={onCancel} disabled={saving}>
            <X size={20} />
          </button>
        </div>
        <div className="document-smart-body">
          {normalization.status === 'checking' ? (
            <div className="document-smart-loading">
              <Loader2 className="animate-spin" size={28} />
              <span>Đang tự nhận diện 4 góc, làm phẳng và kiểm tra độ rõ của thẻ. Quá trình này có thể mất tới 3 phút, vui lòng không thoát ra.</span>
            </div>
          ) : manualPanel}
        </div>
      </div>
    </div>,
    document.body,
  );
}
