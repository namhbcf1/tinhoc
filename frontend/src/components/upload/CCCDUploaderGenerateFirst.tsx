import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Eye,
  ImageOff,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { trackError, trackSuccess } from '../../utils/errorTracker';
import { useIsMobile } from '../../utils/deviceDetection';
import { resizeImage, compressImage } from '../../utils/imageUtils';
import { detectImageQuality, convertHeicIfNeeded } from './cccd-image-quality';
import QualityWarning from './cccd-quality-warning';
import UploadProgressBar from './cccd-upload-progress';
import FullPreview from './cccd-full-preview';
import { buildApiUrl } from '../../utils/api-base-url.js';
import { lazyWithChunkReload } from '../../utils/lazyWithChunkReload';
import { validatePortraitPhoto } from './portrait-photo-validation';
import './CCCDUploader.css';

const ImageEditor = lazyWithChunkReload(() => import('./ImageEditor'));
const DocumentSmartEditor = lazyWithChunkReload(() => import('./DocumentSmartEditor'));
const CameraWithOverlay = lazyWithChunkReload(() => import('./CameraWithOverlay'));

const TEMPLATE_IMAGES = {
  cccd_front: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_front.jpg',
  cccd_back: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_back.jpg',
  photo_3x4: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/photo_3x4.jpg',
} as const;

const GUIDE_IMAGES = { valid: '/photo-guides/photo-3x4-valid.jpg', invalid: '/photo-guides/photo-3x4-invalid.jpg' };
const TYPE_LABELS = { cccd_front: 'CCCD mat truoc', cccd_back: 'CCCD mat sau', photo_3x4: 'Anh the 3x4' } as const;
const TYPE_DESCRIPTIONS = {
  cccd_front: 'Mat co anh va so CCCD 12 so',
  cccd_back: 'Mat co ma QR va van tay',
  photo_3x4: 'Anh ro mat se cho ket qua AI tot hon. He thong tao 3 phuong an nen xanh de ban chon.',
} as const;
const PHOTO_RULES = [
  'Anh ro mat, du sang, thay ro dau va hai vai thi AI giu giong tot hon.',
  'Selfie dung may, chan dung thuong hoac anh studio 4x6 deu co the thu tao lai thanh anh nen xanh.',
  'He thong tra 3 phuong an de ban tu chon truoc khi luu.',
];
const PHOTO_BAD_INPUTS = [
  'Anh scan tu anh giay, anh chup lai man hinh hoac bi loe/man de.',
  'Anh bi lech, mat dau, mat vai, toc che mat hoac dung qua xa.',
  'Anh mo, rung tay, thieu sang, da bi nen qua manh tu app camera.',
];

const DEFAULT_UPLOAD_TIMEOUT_MS = 60000;
const PHOTO_UPLOAD_TIMEOUT_MS = 300000;
const PHOTO_STATUS_POLL_INTERVAL_MS = 1500;
const PHOTO_STATUS_MAX_ATTEMPTS = 1200;
const PHOTO_STATUS_SLOW_POLL_INTERVAL_MS = 5000;
const MAX_RETRIES = 2;
const DOCUMENT_OCRSPACE_TARGET_MB = 0.92;
const DOCUMENT_OCRSPACE_MAX_EDGE = 2200;

type UploadType = 'cccd_front' | 'cccd_back' | 'photo_3x4';
type UploadStatus = 'idle' | 'uploading' | 'processing' | 'selection' | 'success' | 'error';

export interface UploadStatusSnapshot {
  type: UploadType;
  status: UploadStatus;
  progress: number;
  stage: string | null;
  message: string | null;
}

interface VariantOption {
  variantId: number;
  variantSlot: number;
  imageId: string;
  previewUrl: string | null;
  score: number;
  recommended: boolean;
  warnings: string[];
  generationMode: string | null;
  label: string;
}

interface PhotoStatusPayload {
  success: boolean;
  error?: string | null;
  errorMessage?: string | null;
  status?: string;
  stage?: string;
  progress?: number;
  processingLogId?: string | number;
  selectionRequired?: boolean;
  previewUrl?: string | null;
  sourcePreviewUrl?: string | null;
  finalPreviewUrl?: string | null;
  finalImageId?: string | null;
  previewImageId?: string | null;
  originalImageId?: string | null;
  selectedVariantId?: number | null;
  recommendedVariantId?: number | null;
  warnings?: string[];
  variants?: VariantOption[];
}

interface Props {
  type: UploadType;
  onUploadSuccess?: (data: { imageId: string; processingLogId?: string; type: string; imageUrl?: string }) => void;
  onUploadError?: (err: Error) => void;
  onStatusChange?: (state: UploadStatusSnapshot) => void;
  existingImageUrl?: string | null;
  photoGenderHint?: string | null;
}

interface DocumentProcessingMetaPayload {
  autoRectified?: boolean;
  detectionConfidence?: number;
  cornerCount?: number;
  qualityWarnings?: string[];
  blockingReasons?: string[];
  validationStatus?: string;
  sourceWidth?: number;
  sourceHeight?: number;
  outputWidth?: number;
  outputHeight?: number;
  usedManualAdjust?: boolean;
  qualityScore?: number;
  avgBrightness?: number;
  sharpness?: number;
  restorationMode?: string;
  restorationCandidates?: Array<{
    mode: string;
    label: string;
    selected: boolean;
    qualityScore: number;
    ocrUsefulnessScore: number;
    differenceGuardScore: number;
    differenceGuardStatus: string;
    warnings: string[];
  }>;
  recommendedCandidate?: string;
  differenceGuardScore?: number;
  differenceGuardStatus?: string;
  ocrArbitrationSummary?: string;
  retakeRequiredReason?: string;
}

type CCCDAuxiliaryFiles = Partial<Record<
  'sourceOriginal' | 'normalizedOriginal' | 'ocrRestoreBalanced' | 'ocrRestoreTextPriority',
  File
>>;

const modeLabel = (mode: string | null | undefined) => mode === 'original_fallback' ? 'Anh goc' : mode === 'transform_fallback' ? 'AI can lai' : 'AI variant';
const processText = (stage: string, progress?: number) => {
  const p = typeof progress === 'number' ? ` (${Math.round(progress)}%)` : '';
  if (stage === 'preprocessing') return `AI dang can lai khung anh${p}.`;
  if (stage === 'ai_generate') return `AI dang tao 3 phuong an anh 3x4${p}.`;
  if (stage === 'ranking') return `AI dang cham diem va de xuat anh${p}.`;
  if (stage === 'awaiting_selection') return 'AI da tao xong. Chon 1 phuong an ben duoi.';
  if (stage === 'selected' || stage === 'completed') return 'Anh 3x4 da san sang.';
  if (stage === 'failed') return 'AI 3x4 gap loi.';
  return `Da tai anh goc. AI dang xu ly${p}.`;
};

async function optimizeDocumentForOCRSpace(file: File) {
  let optimized = file;
  optimized = await resizeImage(optimized, {
    maxWidth: DOCUMENT_OCRSPACE_MAX_EDGE,
    maxHeight: DOCUMENT_OCRSPACE_MAX_EDGE,
    quality: 0.94,
  }) as File;

  if (optimized.size > DOCUMENT_OCRSPACE_TARGET_MB * 1024 * 1024) {
    optimized = await compressImage(optimized, {
      maxSizeMB: DOCUMENT_OCRSPACE_TARGET_MB,
      maxWidthOrHeight: DOCUMENT_OCRSPACE_MAX_EDGE,
      initialQuality: 0.92,
    }) as File;
  }

  return optimized;
}

async function optimizeDocumentAuxiliaryFiles(auxiliaryFiles: CCCDAuxiliaryFiles | null) {
  if (!auxiliaryFiles) {
    return null;
  }

  const optimizedEntries = await Promise.all(
    Object.entries(auxiliaryFiles).map(async ([key, value]) => {
      if (!value) {
        return [key, value] as const;
      }

      if (key === 'sourceOriginal') {
        return [key, value] as const;
      }

      return [key, await optimizeDocumentForOCRSpace(value)] as const;
    }),
  );

  return Object.fromEntries(optimizedEntries) as CCCDAuxiliaryFiles;
}

function GuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="photo-guide-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Huong dan anh the 3x4">
      <div className="photo-guide-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="photo-guide-header">
          <div><p className="photo-guide-eyebrow">Anh the 3x4</p><h3>Input nen uu tien va can tranh</h3></div>
          <button type="button" className="photo-guide-close" onClick={onClose} aria-label="Dong"><X size={18} /></button>
        </div>
        <div className="photo-guide-grid">
          <section className="photo-guide-card success">
            <div className="photo-guide-card-title"><ShieldCheck size={18} /><span>Input nen uu tien</span></div>
            <img src={GUIDE_IMAGES.valid} alt="Anh nen uu tien" className="photo-guide-sample" />
            <ul>{PHOTO_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul>
          </section>
          <section className="photo-guide-card danger">
            <div className="photo-guide-card-title"><AlertCircle size={18} /><span>Input de AI huot</span></div>
            <img src={GUIDE_IMAGES.invalid} alt="Anh de AI huot" className="photo-guide-sample" />
            <div className="photo-guide-invalid-list">
              {PHOTO_BAD_INPUTS.map((item) => <div key={item} className="photo-guide-invalid-item"><XCircle size={16} /><span>{item}</span></div>)}
            </div>
            <p className="photo-guide-note">Khong can tai san anh nen xanh ngay tu dau. Anh ro mat va giu duoc dau-vai se cho ket qua on dinh hon.</p>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PhotoSelectionDialog({
  open,
  onClose,
  sourcePreview,
  variants,
  recommendedVariantId,
  selectedVariantId,
  selectingVariantId,
  regenerating,
  onRegenerate,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  sourcePreview: string | null;
  variants: VariantOption[];
  recommendedVariantId: number | null;
  selectedVariantId: number | null;
  selectingVariantId: number | null;
  regenerating: boolean;
  onRegenerate: () => void;
  onChoose: (variant: VariantOption) => void;
}) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="photo-selection-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Chon phuong an anh 3x4"
    >
      <div className="photo-selection-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="photo-selection-dialog-header">
          <div>
            <p className="photo-selection-eyebrow">AI generate-first</p>
            <h3>Chon 1 phuong an anh 3x4</h3>
            <p className="photo-selection-description">
              Bo chon anh mo rong de ban xem ro 3 phuong an truoc khi luu vao ho so.
            </p>
          </div>
          <div className="photo-selection-dialog-actions">
            <button type="button" className="photo-selection-close" onClick={onClose}>
              <X size={16} />
              <span>Dong</span>
            </button>
            <button type="button" className="photo-selection-regenerate" onClick={onRegenerate} disabled={regenerating || selectingVariantId !== null}>
              {regenerating ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              <span>Tao lai 3 anh</span>
            </button>
          </div>
        </div>

        <div className="photo-selection-dialog-body">
          {sourcePreview && (
            <aside className="photo-source-reference photo-source-reference-dialog">
              <div className="photo-source-reference-text">
                <span className="photo-source-label">Anh tham chieu</span>
                <span className="photo-source-subtitle">
                  AI co gang giu guong mat, toc va bo cuc tu anh nay.
                </span>
              </div>
              <img src={sourcePreview} alt="Anh tham chieu" className="photo-source-reference-image" />
            </aside>
          )}

          <div className="photo-variant-grid photo-variant-grid-dialog">
            {variants.map((variant) => {
              const recommended = variant.recommended || variant.variantId === recommendedVariantId;
              const selected = variant.variantId === selectedVariantId;
              const loading = selectingVariantId === variant.variantId;
              return (
                <article
                  key={variant.variantId}
                  className={['photo-variant-card', recommended ? 'recommended' : '', selected ? 'selected' : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="photo-variant-preview">
                    {variant.previewUrl ? (
                      <img src={variant.previewUrl} alt={variant.label || `Phuong an ${variant.variantSlot}`} />
                    ) : (
                      <div className="photo-variant-empty">
                        <ImageOff size={18} />
                        <span>Khong co preview</span>
                      </div>
                    )}
                    <div className="photo-variant-badges">
                      {recommended && <span className="photo-variant-badge recommended">De xuat</span>}
                      {selected && <span className="photo-variant-badge selected">Da chon</span>}
                      <span className="photo-variant-badge neutral">{modeLabel(variant.generationMode)}</span>
                    </div>
                  </div>
                  <div className="photo-variant-body">
                    <div className="photo-variant-meta">
                      <div>
                        <p className="photo-variant-title">{variant.label || `Phuong an ${variant.variantSlot}`}</p>
                        <p className="photo-variant-subtitle">Lua chon {variant.variantSlot}</p>
                      </div>
                      <span className="photo-variant-score">Diem {Math.round(variant.score)}</span>
                    </div>
                    {variant.warnings.length > 0 ? (
                      <ul className="photo-variant-warnings">
                        {variant.warnings.slice(0, 3).map((warning) => <li key={warning}>{warning}</li>)}
                      </ul>
                    ) : (
                      <p className="photo-variant-note">
                        {variant.generationMode === 'original_fallback'
                          ? 'Giu anh goc hien tai.'
                          : variant.generationMode === 'transform_fallback'
                            ? 'Dung ban AI can lai khung.'
                            : 'Anh AI da can nen xanh va bo cuc dau-vai.'}
                      </p>
                    )}
                    <button
                      type="button"
                      className="photo-variant-cta"
                      disabled={selectingVariantId !== null || regenerating}
                      onClick={() => onChoose(variant)}
                    >
                      {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                      <span>
                        {variant.generationMode === 'original_fallback'
                          ? 'Giu anh goc'
                          : variant.generationMode === 'transform_fallback'
                            ? 'Dung ban AI can lai'
                            : 'Dung anh nay'}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function CCCDUploaderGenerateFirst({ type, onUploadSuccess, onUploadError, onStatusChange, existingImageUrl = null, photoGenderHint = null }: Props) {
  const isPhoto = type === 'photo_3x4';
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localPreviewUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>(existingImageUrl ? 'success' : 'idle');
  const [preview, setPreview] = useState<string | null>(existingImageUrl);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [qualityWarnings, setQualityWarnings] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [processingMessage, setProcessingMessage] = useState('');
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [photoLogId, setPhotoLogId] = useState<string | null>(null);
  const [photoSourcePreview, setPhotoSourcePreview] = useState<string | null>(existingImageUrl);
  const [photoVariants, setPhotoVariants] = useState<VariantOption[]>([]);
  const [recommendedVariantId, setRecommendedVariantId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectingVariantId, setSelectingVariantId] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showPhotoSelectionDialog, setShowPhotoSelectionDialog] = useState(false);
  const [fileCaptureMode, setFileCaptureMode] = useState<'' | 'user'>('');

  const clearPolling = useCallback(() => { if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current); pollingTimeoutRef.current = null; }, []);
  const resetPhotoState = useCallback((source: string | null = null) => { setPhotoLogId(null); setPhotoSourcePreview(source); setPhotoVariants([]); setRecommendedVariantId(null); setSelectedVariantId(null); setSelectingVariantId(null); setRegenerating(false); setShowPhotoSelectionDialog(false); }, []);
  const resetUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    clearPolling();
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
    setStatus('idle');
    setPreview(null);
    setError('');
    setUploadProgress(0);
    setQualityWarnings([]);
    setRetryCount(0);
    setProcessingStage('');
    setProcessingMessage('');
    resetPhotoState(null);
  }, [clearPolling, resetPhotoState]);

  useEffect(() => { if (existingImageUrl) { setStatus('success'); setPreview(existingImageUrl); setUploadProgress(100); setError(''); setQualityWarnings([]); resetPhotoState(existingImageUrl); } else { resetUpload(); } }, [existingImageUrl, resetPhotoState, resetUpload]);
  useEffect(() => () => { abortControllerRef.current?.abort(); clearPolling(); }, [clearPolling]);
  useEffect(() => { if (typeof document === 'undefined' || (!showImageEditor && !showFullPreview && !showCamera && !showPhotoGuide && !showPhotoSelectionDialog)) return undefined; const b = document.body.style.overflow; const h = document.documentElement.style.overflow; document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'; return () => { document.body.style.overflow = b; document.documentElement.style.overflow = h; }; }, [showCamera, showFullPreview, showImageEditor, showPhotoGuide, showPhotoSelectionDialog]);
  useEffect(() => { onStatusChange?.({ type, status, progress: Math.round(uploadProgress), stage: processingStage || null, message: processingMessage || null }); }, [onStatusChange, processingMessage, processingStage, status, type, uploadProgress]);
  useEffect(() => () => { if (localPreviewUrlRef.current) URL.revokeObjectURL(localPreviewUrlRef.current); }, []);

  const setDocumentPreviewFromFile = useCallback((file: File) => {
    if (isPhoto) return;
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    localPreviewUrlRef.current = objectUrl;
    setPreview(objectUrl);
  }, [isPhoto]);

  const hydratePhoto = useCallback((payload: PhotoStatusPayload, logId?: string) => {
    if (logId) setPhotoLogId(logId);
    setPhotoSourcePreview(payload.sourcePreviewUrl || null);
    setPhotoVariants(Array.isArray(payload.variants) ? payload.variants : []);
    setRecommendedVariantId(typeof payload.recommendedVariantId === 'number' ? payload.recommendedVariantId : null);
    setSelectedVariantId(typeof payload.selectedVariantId === 'number' ? payload.selectedVariantId : null);
    if (Array.isArray(payload.warnings)) setQualityWarnings(payload.warnings.filter(Boolean));
  }, []);

  const finishPhoto = useCallback((imageId: string, imageUrl: string | null | undefined, logId: string, warnings: string[], chosenVariantId: number | null) => {
    clearPolling(); setStatus('success'); setUploadProgress(100); setProcessingStage('selected'); setProcessingMessage(''); setSelectingVariantId(null); setRegenerating(false); setSelectedVariantId(chosenVariantId); setQualityWarnings(warnings); setShowPhotoSelectionDialog(false); if (imageUrl) setPreview(imageUrl); onUploadSuccess?.({ imageId, processingLogId: logId, type, imageUrl: imageUrl || undefined });
  }, [clearPolling, onUploadSuccess, type]);

  const enterSelection = useCallback((payload: PhotoStatusPayload, logId: string) => {
    clearPolling(); hydratePhoto(payload, logId); setStatus('selection'); setUploadProgress(100); setProcessingStage('awaiting_selection'); setProcessingMessage(''); setError(''); setShowPhotoSelectionDialog(true); if (payload.previewUrl || payload.sourcePreviewUrl) setPreview(payload.previewUrl || payload.sourcePreviewUrl || null);
  }, [clearPolling, hydratePhoto]);

  const pollPhoto = useCallback(async (logId: string, attempt = 0) => {
    try {
      const response = await fetch(buildApiUrl(`/cccd-upload/status/${logId}`));
      const result = await response.json() as PhotoStatusPayload;
      if (!result?.success) throw new Error(result?.error || 'Khong the kiem tra trang thai anh 3x4.');
      hydratePhoto(result, logId); setProcessingStage(String(result.stage || 'uploaded')); setProcessingMessage(processText(String(result.stage || 'uploaded'), result.progress)); setUploadProgress(typeof result.progress === 'number' ? result.progress : 0);
      if (result.selectionRequired && Array.isArray(result.variants) && result.variants.length) return enterSelection(result, logId);
      if (result.status === 'success' || result.stage === 'selected' || result.stage === 'completed') {
        const imageId = result.finalImageId || result.previewImageId || result.originalImageId; if (!imageId) throw new Error('Khong tim thay anh sau khi xu ly.');
        return finishPhoto(imageId, result.finalPreviewUrl || result.previewUrl || result.sourcePreviewUrl, logId, Array.isArray(result.warnings) ? result.warnings : [], typeof result.selectedVariantId === 'number' ? result.selectedVariantId : null);
      }
      if (result.status === 'failed' || result.stage === 'failed') throw new Error(result.errorMessage || 'AI khong the hoan tat anh 3x4.');
      const nextInterval = attempt >= 120 ? PHOTO_STATUS_SLOW_POLL_INTERVAL_MS : PHOTO_STATUS_POLL_INTERVAL_MS;
      if (attempt >= PHOTO_STATUS_MAX_ATTEMPTS) {
        setProcessingMessage('AI dang xu ly lau hon binh thuong. Ban co the tiep tuc cho, he thong van dang thu tao 3 anh.');
      }
      clearPolling(); pollingTimeoutRef.current = setTimeout(() => { void pollPhoto(logId, Math.min(attempt + 1, PHOTO_STATUS_MAX_ATTEMPTS)); }, nextInterval);
    } catch (err: unknown) {
      clearPolling(); setStatus('error'); setPreview(null); setUploadProgress(0); setProcessingStage('failed'); setProcessingMessage(''); const message = err instanceof Error ? err.message : 'Khong the xu ly anh 3x4.'; setError(message); onUploadError?.(err instanceof Error ? err : new Error(message));
    }
  }, [clearPolling, enterSelection, finishPhoto, hydratePhoto, onUploadError]);

  const sendFile = async (
    file: File,
    processingMeta: DocumentProcessingMetaPayload | null = null,
    auxiliaryFiles: CCCDAuxiliaryFiles | null = null,
    attempt = 0,
  ): Promise<void> => {
    setStatus('uploading'); setUploadProgress(0); setError(''); setProcessingStage(''); setProcessingMessage(''); setQualityWarnings([]); resetPhotoState(null);
    const qualityPromise = detectImageQuality(file).catch(() => null);
    try {
      let processed = await convertHeicIfNeeded(file);
      let optimizedAuxiliaryFiles = auxiliaryFiles;
      if (!processed.type.startsWith('image/')) throw new Error('Vui long chon file anh hop le.');
      const editorBlockingReasons = !isPhoto && Array.isArray(processingMeta?.blockingReasons)
        ? processingMeta.blockingReasons.filter(Boolean)
        : [];
      if (editorBlockingReasons.length > 0) {
        setQualityWarnings(editorBlockingReasons);
      }
      if (isPhoto) { processed = processed.size > 1024 * 1024 ? await compressImage(await resizeImage(processed, { maxWidth: 1920, maxHeight: 1920, quality: 0.92 }) as File, { maxSizeMB: 1.2, maxWidthOrHeight: 1920, initialQuality: 0.9 }) : processed; const v = await validatePortraitPhoto(processed, { stage: 'upload', useNativeFaceDetector: true }); setQualityWarnings([...v.warnings, ...(!v.isValid ? v.blockingReasons : [])]); }
      if (!isPhoto) {
        processed = await optimizeDocumentForOCRSpace(processed);
        optimizedAuxiliaryFiles = await optimizeDocumentAuxiliaryFiles(auxiliaryFiles);
      }
      const formData = new FormData(); formData.append('image', processed); formData.append('type', type); if (isPhoto && photoGenderHint) formData.append('genderHint', photoGenderHint); if (!isPhoto && processingMeta) formData.append('processingMeta', JSON.stringify(processingMeta)); if (!isPhoto && optimizedAuxiliaryFiles) { if (optimizedAuxiliaryFiles.sourceOriginal) formData.append('sourceOriginal', optimizedAuxiliaryFiles.sourceOriginal); if (optimizedAuxiliaryFiles.normalizedOriginal) formData.append('normalizedOriginal', optimizedAuxiliaryFiles.normalizedOriginal); if (optimizedAuxiliaryFiles.ocrRestoreBalanced) formData.append('ocrRestoreBalanced', optimizedAuxiliaryFiles.ocrRestoreBalanced); if (optimizedAuxiliaryFiles.ocrRestoreTextPriority) formData.append('ocrRestoreTextPriority', optimizedAuxiliaryFiles.ocrRestoreTextPriority); }
      abortControllerRef.current = new AbortController(); const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), isPhoto ? PHOTO_UPLOAD_TIMEOUT_MS : DEFAULT_UPLOAD_TIMEOUT_MS);
      const response = await fetch(buildApiUrl('/cccd-upload'), { method: 'POST', body: formData, signal: abortControllerRef.current.signal }).finally(() => clearTimeout(timeoutId));
      const result = await response.json() as PhotoStatusPayload & { imageId?: string | null };
      if (!result.success) throw new Error(result.error || 'Upload that bai.');
      if (isPhoto && (result.previewUrl || result.finalPreviewUrl)) setPreview(result.finalPreviewUrl || result.previewUrl || null);
      if (!isPhoto) {
        const editorWarnings = Array.isArray(processingMeta?.qualityWarnings) ? processingMeta.qualityWarnings : [];
        const editorBlockingReasons = Array.isArray(processingMeta?.blockingReasons) ? processingMeta.blockingReasons : [];
        const backendWarnings = Array.isArray(result.warnings) ? result.warnings : [];
        const q = await qualityPromise;
        const fallbackWarnings: string[] = [];
        if (q) {
          if (q.avgBrightness < 50) fallbackWarnings.push('Anh qua toi. Hay chup lai o noi sang hon.');
          if (q.avgBrightness > 220) fallbackWarnings.push('Anh qua sang hoac bi loa. Tranh den chieu truc tiep.');
          if (q.sharpness < 3) fallbackWarnings.push('Anh bi mo. Giu tay chac va giu yen khi chup.');
        }
        const combinedWarnings = [...new Set([...editorWarnings, ...editorBlockingReasons, ...backendWarnings, ...fallbackWarnings])];
        if (combinedWarnings.length) setQualityWarnings(combinedWarnings);
        setStatus('success'); setUploadProgress(100); onUploadSuccess?.({ imageId: String(result.imageId || ''), processingLogId: result.processingLogId ? String(result.processingLogId) : undefined, type, imageUrl: localPreviewUrlRef.current || undefined }); return;
      }
      const logId = result.processingLogId ? String(result.processingLogId) : null; if (!logId) throw new Error('Khong tao duoc phien xu ly anh 3x4.');
      hydratePhoto(result, logId); if (result.selectionRequired && Array.isArray(result.variants) && result.variants.length) return enterSelection(result, logId);
      setPhotoLogId(logId); setStatus('processing'); setProcessingStage(String(result.stage || 'queued')); setProcessingMessage(processText(String(result.stage || 'queued'), result.progress)); setUploadProgress(typeof result.progress === 'number' ? result.progress : 8); void pollPhoto(logId);
      trackSuccess?.({ component: 'CCCDUploader', action: 'uploadFile', context: { type, imageId: result.imageId } });
    } catch (err: unknown) {
      if (attempt < MAX_RETRIES && !(err instanceof Error && err.name === 'AbortError')) { const next = attempt + 1; setRetryCount(next); setError(`Loi mang, dang thu lai lan ${next}/${MAX_RETRIES}...`); setTimeout(() => { void sendFile(file, processingMeta, auxiliaryFiles, next); }, 2000); return; }
      trackError?.({ component: 'CCCDUploader', action: 'uploadFile', error: err, stack: err instanceof Error ? err.stack : undefined, context: { type, fileSize: file.size }, severity: 'error' });
      let message = err instanceof Error ? err.message : 'Upload that bai.'; if (err instanceof Error && err.name === 'AbortError') message = 'Qua thoi gian tai len. Kiem tra ket noi mang roi thu lai.'; if (typeof navigator !== 'undefined' && !navigator.onLine) message = 'Mat ket noi internet. Kiem tra Wi-Fi/4G roi thu lai.';
      setError(message); setStatus('error'); setPreview(null); setUploadProgress(0); setProcessingStage('failed'); setProcessingMessage(''); onUploadError?.(err instanceof Error ? err : new Error(message));
    }
  };

  const openEditorForFile = async (file: File) => { try { setError(''); setQualityWarnings([]); const processed = await convertHeicIfNeeded(file); if (!processed.type.startsWith('image/')) throw new Error('Vui long chon file anh hop le.'); setSelectedFile(processed); setShowImageEditor(true); } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Khong the mo file anh.'); } };
  const openNativePicker = (captureMode: '' | 'user' = '') => {
    setFileCaptureMode(captureMode);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };
  const chooseFile = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; setFileCaptureMode(''); if (!file) return; if (fileInputRef.current) fileInputRef.current.value = ''; await openEditorForFile(file); };
  const onDrop = useCallback(async (event: React.DragEvent) => { event.preventDefault(); event.stopPropagation(); dragCounterRef.current = 0; setIsDragOver(false); const file = event.dataTransfer?.files?.[0]; if (file) await openEditorForFile(file); }, []);
  const chooseVariant = async (variant: VariantOption) => {
    if (!photoLogId) return setError('Khong tim thay phien xu ly de chon anh.');
    try { setSelectingVariantId(variant.variantId); const response = await fetch(buildApiUrl(`/cccd-upload/photo-3x4/${photoLogId}/select`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variantId: variant.variantId }) }); const result = await response.json() as { success?: boolean; error?: string; imageId?: string; previewUrl?: string | null; imageUrl?: string | null; warnings?: string[]; selectedVariantId?: number | null; }; if (!result.success || !result.imageId) throw new Error(result.error || 'Khong the luu anh da chon.'); finishPhoto(result.imageId, result.previewUrl || result.imageUrl || variant.previewUrl, photoLogId, Array.isArray(result.warnings) ? result.warnings : variant.warnings, typeof result.selectedVariantId === 'number' ? result.selectedVariantId : variant.variantId); } catch (err: unknown) { const message = err instanceof Error ? err.message : 'Khong the chon anh.'; setError(message); onUploadError?.(err instanceof Error ? err : new Error(message)); } finally { setSelectingVariantId(null); }
  };
  const regenerate = async () => {
    if (!photoLogId) return setError('Khong tim thay phien xu ly de tao lai anh.');
    try { setRegenerating(true); setStatus('processing'); setUploadProgress(8); setProcessingStage('queued'); setProcessingMessage('AI dang tao lai 3 phuong an moi...'); const response = await fetch(buildApiUrl(`/cccd-upload/photo-3x4/${photoLogId}/regenerate`), { method: 'POST' }); const result = await response.json() as PhotoStatusPayload; if (!result.success) throw new Error(result.error || 'Khong the tao lai anh 3x4.'); hydratePhoto(result, photoLogId); if (result.selectionRequired && Array.isArray(result.variants) && result.variants.length) return enterSelection(result, photoLogId); void pollPhoto(photoLogId); } catch (err: unknown) { const message = err instanceof Error ? err.message : 'Khong the tao lai anh 3x4.'; setError(message); setStatus('error'); setUploadProgress(0); onUploadError?.(err instanceof Error ? err : new Error(message)); } finally { setRegenerating(false); }
  };

  const containerClass = ['upload-container', `status-${status}`, isDragOver ? 'drag-active' : ''].filter(Boolean).join(' ');
  const photoSelection = isPhoto && status === 'selection';
  const photoSelectionCount = photoVariants.length || 3;
  const recommendedPhotoVariant = photoVariants.find((variant) => variant.recommended || variant.variantId === recommendedVariantId) || null;
  const processingOverlayActive = status === 'uploading' || status === 'processing';
  const processingOverlayProgress = Math.min(Math.max(Math.round(uploadProgress || (status === 'uploading' ? 12 : 18)), 6), 99);
  const processingOverlayTitle = status === 'uploading'
    ? 'Đang tải ảnh lên hệ thống'
    : isPhoto
      ? 'AI đang tạo ảnh 3x4'
      : 'Đang xử lý ảnh CCCD';
  const processingOverlayMessage = processingMessage || (status === 'uploading'
    ? 'Vui lòng chờ trong giây lát, đừng đóng khung tải ảnh.'
    : isPhoto
      ? 'Hệ thống đang canh nền, tạo phương án và chấm điểm tự động.'
      : 'Hệ thống đang tối ưu ảnh để vẫn cố gắng lấy được CCCD cho bạn.');

  return (
    <div className="cccd-uploader" onDragEnter={(e) => { e.preventDefault(); dragCounterRef.current += 1; setIsDragOver(true); }} onDragLeave={(e) => { e.preventDefault(); dragCounterRef.current -= 1; if (dragCounterRef.current === 0) setIsDragOver(false); }} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className={containerClass}>
        {!preview ? (
          <div className="upload-trigger" onClick={() => openNativePicker()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openNativePicker()} aria-label={`Tai anh ${TYPE_LABELS[type]}`}>
            {status === 'uploading' ? <div className="upload-placeholder upload-placeholder-loading"><Loader2 className="animate-spin icon-large" size={36} /><p className="upload-text">Dang xu ly...</p>{retryCount > 0 && <p className="upload-hint upload-hint-retry">Dang thu lai ({retryCount}/{MAX_RETRIES})...</p>}</div> : status === 'error' ? <div className="upload-placeholder"><ImageOff className="icon-large icon-error" size={36} /><p className="upload-text upload-text-error">{isPhoto ? 'Anh 3x4 khong xu ly duoc' : 'Upload that bai'}</p><p className="upload-hint">Nhan de chon anh khac</p></div> : <div className={`upload-idle-guide ${isPhoto ? 'photo-type' : 'cccd-type'} ${isPhoto && isMobile ? 'photo-mobile' : ''}`}><div className="upload-template-preview"><img src={TEMPLATE_IMAGES[type]} alt={TYPE_LABELS[type]} className="template-preview-img" draggable={false} /><div className="template-upload-overlay"><Upload size={24} /></div></div><div className="upload-idle-info"><p className="upload-idle-desc">{TYPE_DESCRIPTIONS[type]}</p>{isPhoto && <ul className="upload-idle-checklist">{PHOTO_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul>}{isPhoto && isMobile && <p className="upload-mobile-tip">Mobile nen uu tien chup selfie ro mat hoac chon anh tu thu vien roi canh lai trong khung.</p>}<div className={`upload-idle-actions ${isPhoto && isMobile ? 'photo-mobile-actions' : ''}`}><span className="upload-idle-action" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); openNativePicker(); }}><Upload size={14} />Chon anh</span>{!isPhoto && <span className="upload-idle-action camera-action" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}><Camera size={14} />Chup anh</span>}{isPhoto && isMobile && <span className="upload-idle-action camera-action" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); openNativePicker('user'); }}><Camera size={14} />Chup selfie</span>}{isPhoto && <span className="upload-idle-action secondary" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setShowPhotoGuide(true); }}><Eye size={14} />Xem huong dan</span>}</div></div>{isDragOver && <div className="upload-drag-overlay"><Upload size={28} /><span>Tha anh vao day</span></div>}</div>}
          </div>
        ) : (
          <div className={`preview-container ${isPhoto ? 'photo-type' : 'cccd-type'}`}>
            <div className="preview-frame">
              <img src={preview} alt={`Preview ${TYPE_LABELS[type]}`} />
              <div className="preview-overlay">
                {(status === 'success' || status === 'selection') && <div className="status-badge success"><CheckCircle size={16} /><span>{status === 'selection' ? 'Cho chon' : 'OK'}</span></div>}
                {status === 'uploading' && <div className="status-badge uploading"><Loader2 className="animate-spin" size={16} /><span>Tai...</span></div>}
                {status === 'processing' && <div className="status-badge uploading"><Loader2 className="animate-spin" size={16} /><span>AI xu ly</span></div>}
                {status === 'error' && <div className="status-badge error"><XCircle size={16} /><span>Loi</span></div>}
              </div>
            </div>
            {(status === 'success' || status === 'selection') && <div className="preview-bottom-actions">{photoSelection && <button type="button" className="btn-preview-select" onClick={() => setShowPhotoSelectionDialog(true)}><CheckCircle size={14} /><span>Chon anh</span></button>}<button type="button" className="btn-preview-view" onClick={() => setShowFullPreview(true)}><Eye size={14} /><span>Xem</span></button><button type="button" className="btn-preview-change" onClick={resetUpload}><RefreshCw size={14} /><span>Doi anh</span></button></div>}
          </div>
        )}

        {processingOverlayActive ? (
          <div className="upload-processing-overlay" role="status" aria-live="polite">
            <div className="upload-processing-overlay-card">
              <Loader2 className="animate-spin" size={24} />
              <div className="upload-processing-overlay-copy">
                <p className="upload-processing-overlay-title">{processingOverlayTitle}</p>
                <p className="upload-processing-overlay-text">{processingOverlayMessage}</p>
                <div className="upload-processing-overlay-track" aria-hidden="true">
                  <div className="upload-processing-overlay-fill" style={{ width: `${processingOverlayProgress}%` }} />
                </div>
                <span className="upload-processing-overlay-progress">{processingOverlayProgress}%</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {(status === 'uploading' || status === 'processing') && uploadProgress > 0 && (
        <UploadProgressBar
          progress={uploadProgress}
          label={status === 'processing' && processingMessage ? processingMessage : undefined}
          completionLabel={status === 'processing' ? 'AI da xu ly xong.' : undefined}
        />
      )}
      {isPhoto && status === 'processing' && processingMessage && <div className="error-message warning" role="status"><Loader2 className="animate-spin" size={14} /><div className="error-message-body"><span>{processingMessage}</span></div></div>}
      {!isPhoto && <QualityWarning warnings={qualityWarnings} onRetry={resetUpload} onDismiss={() => setQualityWarnings([])} />}
      {isPhoto && qualityWarnings.length > 0 && status !== 'idle' && status !== 'uploading' && <div className="photo-warning-panel"><div className="photo-warning-panel-title"><AlertCircle size={14} /><span>Luu y cho anh 3x4</span></div><ul className="photo-warning-list">{qualityWarnings.slice(0, 5).map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}

      {photoSelection && (
        <div className="photo-selection-panel">
          <div className="photo-selection-summary">
            <div className="photo-selection-summary-copy">
              <span className="photo-selection-chip">{photoSelectionCount} phuong an san sang</span>
              <h4>Anh 3x4 da tao xong</h4>
              <p className="photo-selection-description">Mo bo chon anh de xem ban lon va luu 1 phuong an cuoi cung.</p>
            </div>
            <div className="photo-selection-summary-actions">
              {recommendedPhotoVariant && <button type="button" className="photo-selection-open primary" onClick={() => { void chooseVariant(recommendedPhotoVariant); }} disabled={selectingVariantId !== null || regenerating}><CheckCircle size={14} /><span>Dung anh de xuat</span></button>}
              <button type="button" className="photo-selection-open" onClick={() => setShowPhotoSelectionDialog(true)}><Eye size={14} /><span>Mo bo chon anh</span></button>
              <button type="button" className="photo-selection-regenerate" onClick={() => { void regenerate(); }} disabled={!photoLogId || selectingVariantId !== null || regenerating}>{regenerating ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}<span>Tao lai</span></button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" capture={fileCaptureMode || undefined} onChange={chooseFile} style={{ display: 'none' }} />
      {error && <div className={`error-message ${error.includes('mang') || error.includes('thu lai') ? 'warning' : ''}`} role="alert"><AlertCircle size={14} /><div className="error-message-body"><span>{error}</span><div className="error-action-row"><button type="button" className="btn-retry-upload" onClick={resetUpload}><RefreshCw size={12} /> Thu lai</button>{isPhoto && isMobile && <button type="button" className="btn-guide-upload" onClick={() => openNativePicker('user')}><Camera size={12} /> Chup selfie</button>}{isPhoto && <button type="button" className="btn-guide-upload" onClick={() => setShowPhotoGuide(true)}><Eye size={12} /> Xem huong dan</button>}</div></div></div>}

      {showImageEditor && selectedFile && <Suspense fallback={<div className="upload-loading"><Loader2 className="animate-spin" size={24} /><span>Dang tai trinh chinh anh...</span></div>}>{isPhoto ? <ImageEditor imageFile={selectedFile} type={type} templateImage={TEMPLATE_IMAGES[type]} onConfirm={async (croppedFile: File) => { setShowImageEditor(false); setSelectedFile(null); setRetryCount(0); await sendFile(croppedFile); }} onCancel={() => { setShowImageEditor(false); setSelectedFile(null); }} /> : <DocumentSmartEditor imageFile={selectedFile} type={type as 'cccd_front' | 'cccd_back'} templateImage={TEMPLATE_IMAGES[type]} onConfirm={async (payload: File | { file: File; processingMeta?: DocumentProcessingMetaPayload | null; auxiliaryFiles?: CCCDAuxiliaryFiles | null }) => { setShowImageEditor(false); setSelectedFile(null); setRetryCount(0); if (payload instanceof File) { setDocumentPreviewFromFile(payload); await sendFile(payload); return; } setDocumentPreviewFromFile(payload.file); await sendFile(payload.file, payload.processingMeta || null, payload.auxiliaryFiles || null); }} onCancel={() => { setShowImageEditor(false); setSelectedFile(null); }} />}</Suspense>}
      {showFullPreview && preview && <FullPreview type={type} preview={preview} label={TYPE_LABELS[type]} onClose={() => setShowFullPreview(false)} onRetake={resetUpload} />}
      {showCamera && !isPhoto && <Suspense fallback={<div className="upload-loading"><Loader2 className="animate-spin" size={24} /><span>Dang mo camera...</span></div>}><CameraWithOverlay type={type} templateImage={TEMPLATE_IMAGES[type]} onCapture={async (file: File) => { setShowCamera(false); await openEditorForFile(file); }} onClose={() => setShowCamera(false)} /></Suspense>}
      <GuideDialog open={showPhotoGuide} onClose={() => setShowPhotoGuide(false)} />
      <PhotoSelectionDialog open={showPhotoSelectionDialog && photoSelection} onClose={() => setShowPhotoSelectionDialog(false)} sourcePreview={photoSourcePreview} variants={photoVariants} recommendedVariantId={recommendedVariantId} selectedVariantId={selectedVariantId} selectingVariantId={selectingVariantId} regenerating={regenerating} onRegenerate={() => { void regenerate(); }} onChoose={(variant) => { void chooseVariant(variant); }} />
    </div>
  );
}
