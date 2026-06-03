import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical, X, Check, RotateCcw, Loader2, SlidersHorizontal } from 'lucide-react';
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
  photo_3x4: 'Ảnh 3x4',
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ROTATION_STEP = 1;
const ROTATION_QUICK_STEP = 15;

function normalizeRotation(value: number) {
  return ((Math.round(value) % 360) + 360) % 360;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(3))));
}

export default function ImageEditor({ imageFile, type, onConfirm, onCancel }: ImageEditorProps) {
  const isPortraitPhoto = type === 'photo_3x4';
  // Crop aspect ratio derived from the same overlay ratios the old editor used,
  // so the cropped output keeps the expected document/photo proportions.
  const aspect = useMemo(() => {
    const ratio = getOverlayRatio(type);
    return ratio.aspect; // photo_3x4 -> 3/4 (0.75), CCCD -> 1.585
  }, [type]);

  // Base (EXIF-normalized) image and the currently-displayed image (with flips
  // baked in). Keeping flips baked means what you see is exactly what is cropped.
  const baseUrlRef = useRef<string | null>(null);
  const displayUrlRef = useRef<string | null>(null);
  const [flipError, setFlipError] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [preparing, setPreparing] = useState(true);

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const croppedAreaPixelsRef = useRef<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const [photoValidation, setPhotoValidation] = useState<PhotoValidationState>({
    isValid: !isPortraitPhoto,
    blockingReasons: [],
    warnings: [],
    checking: isPortraitPhoto,
  });

  // --- Prepare: normalize EXIF once, then bake flips on toggle ----------------
  useEffect(() => {
    let cancelled = false;
    setPreparing(true);
    setLoadError('');

    (async () => {
      try {
        const normalized = await normalizeImageFile(imageFile);
        if (cancelled) {
          URL.revokeObjectURL(normalized.url);
          return;
        }
        baseUrlRef.current = normalized.url;
        displayUrlRef.current = normalized.url;
        setDisplayUrl(normalized.url);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Không thể mở ảnh đã chọn.');
        }
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageFile]);

  // Revoke any object URLs when unmounting.
  useEffect(() => () => {
    if (baseUrlRef.current) URL.revokeObjectURL(baseUrlRef.current);
    if (displayUrlRef.current && displayUrlRef.current !== baseUrlRef.current) {
      URL.revokeObjectURL(displayUrlRef.current);
    }
  }, []);

  // Re-bake the displayed image whenever flips change.
  useEffect(() => {
    const base = baseUrlRef.current;
    if (!base) return;
    let cancelled = false;

    (async () => {
      try {
        const nextUrl = await buildFlippedImageUrl(base, flipHorizontal, flipVertical);
        if (cancelled) {
          if (nextUrl !== base) URL.revokeObjectURL(nextUrl);
          return;
        }
        // Revoke previous derived (flipped) URL, never the base.
        if (displayUrlRef.current && displayUrlRef.current !== base) {
          URL.revokeObjectURL(displayUrlRef.current);
        }
        displayUrlRef.current = nextUrl;
        setDisplayUrl(nextUrl);
      } catch (flipErr) {
        // Keep the current image on flip failure rather than blanking the editor.
        console.warn('Failed to bake flip into preview image:', flipErr);
        setFlipError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [flipHorizontal, flipVertical]);

  // Clear flip error when user toggles flips (new flip attempt)
  useEffect(() => {
    setFlipError(false);
  }, [flipHorizontal, flipVertical]);

  // Lock body scroll while the editor is open.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    croppedAreaPixelsRef.current = areaPixels;
  }, []);

  // --- Portrait validation: run on the live crop preview ----------------------
  useEffect(() => {
    if (!isPortraitPhoto) {
      setPhotoValidation({ isValid: true, blockingReasons: [], warnings: [], checking: false });
      return undefined;
    }
    const src = displayUrl;
    const area = croppedAreaPixelsRef.current;
    if (!src || !area) {
      setPhotoValidation((prev) => ({ ...prev, checking: true }));
      return undefined;
    }

    let cancelled = false;
    setPhotoValidation((prev) => ({ ...prev, checking: true }));
    const timer = window.setTimeout(async () => {
      try {
        const previewCanvas = await getCroppedCanvas(src, area, rotation, 480);
        const result = await validatePortraitPreviewCanvas(previewCanvas, { stage: 'editor' });
        if (!cancelled) {
          setPhotoValidation({
            isValid: result.isValid,
            blockingReasons: result.blockingReasons,
            warnings: result.warnings,
            checking: false,
          });
        }
      } catch {
        if (!cancelled) {
          setPhotoValidation({
            isValid: false,
            blockingReasons: ['Không thể kiểm tra ảnh 3x4 này. Vui lòng chọn ảnh nền xanh rõ hơn.'],
            warnings: [],
            checking: false,
          });
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isPortraitPhoto, displayUrl, rotation, zoom, crop.x, crop.y]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => normalizeRotation(prev + 90));
  }, []);

  const handleFineRotate = useCallback((delta: number) => {
    setRotation((prev) => normalizeRotation(prev + delta));
  }, []);

  const handleZoomDelta = useCallback((delta: number) => {
    setZoom((prev) => clampZoom(prev + delta));
  }, []);

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setFlipError(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    const src = displayUrlRef.current;
    const area = croppedAreaPixelsRef.current;
    if (!src || !area || saving) return;

    setSaving(true);
    setLoadError('');
    try {
      const file = await getCroppedImageFile(
        src,
        area,
        rotation,
        `cccd-${type}-${Date.now()}.jpg`,
        0.95,
      );
      await onConfirm(file);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không thể tạo ảnh sau khi cắt. Vui lòng thử lại.');
      setSaving(false);
    }
  }, [onConfirm, rotation, saving, type]);

  const portraitBlockingReason = isPortraitPhoto ? photoValidation.blockingReasons[0] : '';
  const statusVariant = isPortraitPhoto
    ? (photoValidation.checking ? 'checking' : photoValidation.isValid ? 'detected' : 'manual')
    : 'detected';
  const statusBadgeText = isPortraitPhoto
    ? (photoValidation.checking ? 'Đang kiểm tra' : photoValidation.isValid ? 'Đạt chuẩn sơ bộ' : 'Chưa đạt')
    : 'Căn khung';
  const displayStatusText = isPortraitPhoto
    ? (
        photoValidation.checking
          ? 'Đang kiểm tra nền xanh, độ rõ nét và bố cục đầu-vai trong khung 3x4.'
          : photoValidation.isValid
            ? 'Ảnh đã đạt kiểm tra cơ bản theo yêu cầu nền xanh, rõ nét và bố cục đầu-vai.'
            : portraitBlockingReason
              ? `${portraitBlockingReason} Bạn vẫn có thể gửi để AI thử chỉnh lại, nhưng kết quả không được đảm bảo đạt chuẩn.`
              : 'Ảnh chưa đạt yêu cầu. Bạn vẫn có thể gửi để AI thử chỉnh lại, nhưng nên thay ảnh gốc tốt hơn nếu có.'
      )
    : 'Kéo để di chuyển, chụm/zoom để phóng to. Căn cho toàn bộ thẻ nằm gọn trong khung.';
  const stageHint = isPortraitPhoto
    ? 'Giữ ảnh chân dung thẳng, không cắt đỉnh đầu hoặc phần cằm.'
    : 'Đảm bảo đủ 4 góc, không lóa sáng, không cắt mép và hạn chế nghiêng lệch quá nhiều.';
  const confirmButtonLabel = isPortraitPhoto && !photoValidation.checking && !photoValidation.isValid
    ? 'Thử AI chỉnh'
    : 'Xác nhận';

  const controlItems = [
    { key: 'zoom-out', label: 'Thu nhỏ', icon: ZoomOut, onClick: () => handleZoomDelta(-0.2), active: false },
    { key: 'zoom-in', label: 'Phóng to', icon: ZoomIn, onClick: () => handleZoomDelta(0.2), active: false },
    { key: 'rotate-left', label: 'Xoay trái', icon: RotateCcw, onClick: () => handleFineRotate(-90), active: false },
    { key: 'rotate', label: 'Xoay phải', icon: RotateCw, onClick: handleRotate, active: false },
    { key: 'flip-h', label: 'Lật ngang', icon: FlipHorizontal, onClick: () => setFlipHorizontal((v) => !v), active: flipHorizontal },
    { key: 'flip-v', label: 'Lật dọc', icon: FlipVertical, onClick: () => setFlipVertical((v) => !v), active: flipVertical },
    { key: 'reset', label: 'Đặt lại', icon: SlidersHorizontal, onClick: handleReset, active: false },
  ];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="image-editor-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel();
      }}
    >
      <div className="image-editor-content" onClick={(e) => e.stopPropagation()}>
        <div className="image-editor-header">
          <div className="image-editor-header-copy">
            <span className="image-editor-eyebrow">{isPortraitPhoto ? 'Ảnh thẻ' : 'Document Scan'}</span>
            <div className="image-editor-title-row">
              <h3>{`Chỉnh sửa ${TYPE_LABELS[type] || type}`}</h3>
              <span className={`image-editor-status-badge status-${statusVariant}`}>{statusBadgeText}</span>
            </div>
            <p className="image-editor-subtitle">{displayStatusText}</p>
          </div>
          <button type="button" className="editor-close-btn" onClick={onCancel} disabled={saving}>
            <X size={24} />
          </button>
        </div>

        <div className="image-editor-stage-summary">
          <div className="image-editor-guidance-card">
            <span className="image-editor-guidance-label">Mẹo căn khung</span>
            <p>{stageHint}</p>
          </div>
          <div className="image-editor-telemetry">
            <span>{Math.round(zoom * 100)}% zoom</span>
            <span>{rotation}° xoay</span>
            <span>{isPortraitPhoto ? 'Canh đầu và vai trong khung' : 'Kéo ảnh để canh'}</span>
          </div>
        </div>

        <div className="image-editor-canvas-container">
          {preparing || !displayUrl ? (
            <div className="image-editor-canvas-loading">
              <Loader2 className="animate-spin" size={32} />
              <span>Đang chuẩn bị ảnh...</span>
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
              <div className="image-editor-stage-hint" aria-hidden="true">
                Kéo ảnh để căn • Con lăn/chụm để zoom • Dùng thanh dưới để xoay mịn
              </div>
            </>
          )}
        </div>

        <div className="image-editor-fine-controls" aria-label="Tinh chỉnh ảnh">
          <label className="image-editor-slider-row">
            <span>Zoom</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(clampZoom(Number(event.target.value)))}
              disabled={preparing || saving}
            />
            <strong>{Math.round(zoom * 100)}%</strong>
          </label>
          <label className="image-editor-slider-row">
            <span>Xoay mịn</span>
            <input
              type="range"
              min="0"
              max="359"
              step={ROTATION_STEP}
              value={rotation}
              onChange={(event) => setRotation(normalizeRotation(Number(event.target.value)))}
              disabled={preparing || saving}
            />
            <strong>{rotation}°</strong>
          </label>
          <div className="image-editor-nudge-row" aria-label="Xoay nhanh">
            <button type="button" onClick={() => handleFineRotate(-ROTATION_QUICK_STEP)} disabled={preparing || saving}>−15°</button>
            <button type="button" onClick={() => handleFineRotate(-ROTATION_STEP)} disabled={preparing || saving}>−1°</button>
            <button type="button" onClick={() => handleFineRotate(ROTATION_STEP)} disabled={preparing || saving}>+1°</button>
            <button type="button" onClick={() => handleFineRotate(ROTATION_QUICK_STEP)} disabled={preparing || saving}>+15°</button>
          </div>
        </div>

        <div className="image-editor-controls">
          {controlItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={`editor-btn ${item.active ? 'active' : ''}`}
                onClick={item.onClick}
                disabled={preparing || saving}
                title={item.label}
              >
                <Icon size={20} />
                <span className="editor-btn-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        {loadError ? (
          <div className="image-editor-error" role="alert">{loadError}</div>
        ) : null}
        {flipError && !loadError ? (
          <div className="image-editor-error" role="alert" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
            Không thể áp dụng lật ảnh. Ảnh hiện tại vẫn được giữ nguyên, bạn vẫn có thể tiếp tục chỉnh sửa.
          </div>
        ) : null}

        <div className="image-editor-actions">
          <button type="button" className="editor-action-btn cancel-btn" onClick={onCancel} disabled={saving}>
            Hủy
          </button>
          <button
            type="button"
            className="editor-action-btn confirm-btn"
            onClick={handleConfirm}
            disabled={preparing || saving || (isPortraitPhoto && photoValidation.checking)}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
            {saving ? 'Đang xử lý...' : confirmButtonLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
