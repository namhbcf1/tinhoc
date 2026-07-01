import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import {
  Check,
  X,
  RotateCw,
  RotateCcw,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getOverlayRatio } from './overlayUtils';
import { validatePortraitPreviewCanvas } from './portrait-photo-validation';
import {
  buildFlippedImageUrl,
  getCroppedCanvas,
  getCroppedImageFile,
  normalizeImageFile,
} from './image-crop-core';
import './ImageEditor.css';

interface ImageEditorProps {
  imageFile: File;
  type: 'cccd_front' | 'cccd_back' | 'photo_3x4';
  templateImage?: string;
  onConfirm: (file: File) => void | Promise<void>;
  onCancel: () => void;
}

interface PhotoValidationState {
  isValid: boolean;
  blockingReasons: string[];
  warnings: string[];
  checking: boolean;
}

const TYPE_LABELS: Record<ImageEditorProps['type'], string> = {
  cccd_front: 'CCCD mặt trước',
  cccd_back: 'CCCD mặt sau',
  photo_3x4: 'Ảnh thẻ 3x4',
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

function normalizeRotation(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(3))));
}

export default function ImageEditor({ imageFile, type, onConfirm, onCancel }: ImageEditorProps) {
  const isPortraitPhoto = type === 'photo_3x4';
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(null);
  const aspect = useMemo(() => {
    const ratio = getOverlayRatio(type);
    return ratio.aspect;
  }, [type]);

  const baseUrlRef = useRef<string | null>(null);
  const displayUrlRef = useRef<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const croppedAreaPixelsRef = useRef<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const [photoValidation, setPhotoValidation] = useState<PhotoValidationState>({
    isValid: !isPortraitPhoto,
    blockingReasons: [],
    warnings: [],
    checking: isPortraitPhoto,
  });

  useEffect(() => {
    let cancelled = false;
    setPreparing(true);
    setLoadError('');
    (async () => {
      try {
        const normalized = await normalizeImageFile(imageFile);
        if (cancelled) { URL.revokeObjectURL(normalized.url); return; }
        baseUrlRef.current = normalized.url;
        displayUrlRef.current = normalized.url;
        setDisplayUrl(normalized.url);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Không thể mở ảnh.');
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [imageFile]);

  useEffect(() => () => {
    if (baseUrlRef.current) URL.revokeObjectURL(baseUrlRef.current);
    if (displayUrlRef.current && displayUrlRef.current !== baseUrlRef.current) {
      URL.revokeObjectURL(displayUrlRef.current);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prev = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; document.documentElement.style.overflow = prevHtml; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => {
      const vv = window.visualViewport;
      setViewportSize({ width: Math.round(vv?.width || window.innerWidth), height: Math.round(vv?.height || window.innerHeight) });
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => { window.visualViewport?.removeEventListener('resize', update); window.removeEventListener('resize', update); };
  }, []);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    croppedAreaPixelsRef.current = areaPixels;
  }, []);

  useEffect(() => {
    if (!isPortraitPhoto) { setPhotoValidation({ isValid: true, blockingReasons: [], warnings: [], checking: false }); return undefined; }
    const src = displayUrl;
    const area = croppedAreaPixelsRef.current;
    if (!src || !area) { setPhotoValidation((p) => ({ ...p, checking: true })); return undefined; }
    let cancelled = false;
    setPhotoValidation((p) => ({ ...p, checking: true }));
    const timer = window.setTimeout(async () => {
      try {
        const canvas = await getCroppedCanvas(src, area, rotation, 480);
        const result = await validatePortraitPreviewCanvas(canvas, { stage: 'editor' });
        if (!cancelled) setPhotoValidation({ isValid: result.isValid, blockingReasons: result.blockingReasons, warnings: result.warnings, checking: false });
      } catch {
        if (!cancelled) setPhotoValidation({ isValid: false, blockingReasons: ['Không thể kiểm tra ảnh.'], warnings: [], checking: false });
      }
    }, 250);
    // Timeout fallback: sau tổng 2600ms, nếu vẫn checking, force thành công nếu không lỗi
    const fallbackTimer = window.setTimeout(() => {
      setPhotoValidation((p) => {
        if (p.checking) {
          return { ...p, checking: false, isValid: true, warnings: ['Xác nhận ảnh có thể bị sai lệch, vui lòng kiểm tra.'], blockingReasons: [] };
        }
        return p;
      });
    }, 2600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(fallbackTimer);
    };
  }, [isPortraitPhoto, displayUrl, rotation, zoom, crop.x, crop.y]);

  const handleRotateLeft = useCallback(() => setRotation((p) => normalizeRotation(p - 90)), []);
  const handleRotateRight = useCallback(() => setRotation((p) => normalizeRotation(p + 90)), []);
  const handleZoomDelta = useCallback((d: number) => setZoom((p) => clampZoom(p + d)), []);

  const handleConfirm = useCallback(async () => {
    const src = displayUrlRef.current;
    const area = croppedAreaPixelsRef.current;
    if (!src || !area || saving) return;
    setSaving(true);
    setLoadError('');
    try {
      const file = await getCroppedImageFile(src, area, rotation, `cccd-${type}-${Date.now()}.jpg`, 0.95);
      await onConfirm(file);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không thể cắt ảnh. Thử lại.');
      setSaving(false);
    }
  }, [onConfirm, rotation, saving, type]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="image-editor-modal"
      style={viewportSize ? ({ '--image-editor-vh': `${viewportSize.height}px`, '--image-editor-vw': `${viewportSize.width}px` } as CSSProperties) : undefined}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onCancel(); }}
    >
      <div className="image-editor-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="image-editor-header">
          <div className="image-editor-header-copy">
            <h3>{`Cắt ảnh — ${TYPE_LABELS[type]}`}</h3>
          </div>
          <button type="button" className="editor-close-btn" onClick={onCancel} disabled={saving}>
            <X size={20} />
          </button>
        </div>

        {/* Crop canvas */}
        <div className="image-editor-canvas-container">
          {preparing || !displayUrl ? (
            <div className="image-editor-canvas-loading">
              <Loader2 className="animate-spin" size={32} />
              <span>Đang tải ảnh...</span>
            </div>
          ) : (
            <>
              <Cropper
                image={displayUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                restrictPosition
                objectFit="contain"
                showGrid
                zoomSpeed={0.18}
                onCropChange={setCrop}
                onZoomChange={(value) => setZoom(clampZoom(value))}
                onRotationChange={(value) => setRotation(normalizeRotation(value))}
                onCropComplete={onCropComplete}
              />
              <div className="image-editor-canvas-hint">
                Kéo để căn • Cuộn/Chụm để zoom
              </div>
            </>
          )}
        </div>

        {/* Controls toolbar */}
        <div className="image-editor-toolbar">
          <div className="image-editor-tool-group">
            <button type="button" className="editor-tool-btn" onClick={() => handleZoomDelta(-0.2)} disabled={preparing || saving} title="Thu nhỏ">
              <ZoomOut size={18} />
            </button>
            <span className="image-editor-zoom-label">{Math.round(zoom * 100)}%</span>
            <button type="button" className="editor-tool-btn" onClick={() => handleZoomDelta(0.2)} disabled={preparing || saving} title="Phóng to">
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="image-editor-divider" />

          <div className="image-editor-tool-group">
            <button type="button" className="editor-tool-btn" onClick={handleRotateLeft} disabled={preparing || saving} title="Xoay trái 90°">
              <RotateCcw size={18} />
              <span>−90°</span>
            </button>
            <button type="button" className="editor-tool-btn" onClick={handleRotateRight} disabled={preparing || saving} title="Xoay phải 90°">
              <RotateCw size={18} />
              <span>+90°</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {loadError && <div className="image-editor-error" role="alert">{loadError}</div>}

        {/* Action buttons */}
        <div className="image-editor-actions">
          <button type="button" className="editor-action-btn cancel-btn" onClick={onCancel} disabled={saving}>
            Hủy
          </button>
          <button
            type="button"
            className="editor-action-btn confirm-btn"
            onClick={handleConfirm}
            disabled={preparing || saving}
            title={isPortraitPhoto && photoValidation.checking ? 'Đang kiểm tra ảnh...' : ''}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
            {saving ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
