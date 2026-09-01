import { Suspense, useCallback, useEffect, useRef, useState, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  Eye,
  ImageOff,
  Loader2,
  RefreshCw,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { trackError, trackSuccess } from '../../utils/errorTracker';
import { useIsMobile } from '../../utils/deviceDetection';
import { convertHeicIfNeeded } from './cccd-image-quality';
import UploadProgressBar from './cccd-upload-progress';
import FullPreview from './cccd-full-preview';
import { buildApiUrl } from '../../utils/api-base-url.js';
import { lazyWithChunkReload } from '../../utils/lazyWithChunkReload';
import './CCCDUploader.css';

const ImageEditor = lazyWithChunkReload(() => import('./ImageEditor'));
const DocumentSmartEditor = lazyWithChunkReload(() => import('./DocumentSmartEditor'));
const CameraWithOverlay = lazyWithChunkReload(() => import('./CameraWithOverlay'));

const TEMPLATE_IMAGES = {
  cccd_front: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_front.jpg',
  cccd_back: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_back.jpg',
  photo_3x4: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/photo_3x4.jpg',
} as const;

const TYPE_LABELS = { cccd_front: 'CCCD mat truoc', cccd_back: 'CCCD mat sau', photo_3x4: 'Anh the 3x4' } as const;
const TYPE_DESCRIPTIONS = {
  cccd_front: 'Mat co anh va so CCCD 12 so',
  cccd_back: 'Mat co ma QR va van tay',
  photo_3x4: 'Anh the 3x4 ro mat, du sang, that tu nhien.',
} as const;

const DEFAULT_UPLOAD_TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;

type UploadType = 'cccd_front' | 'cccd_back' | 'photo_3x4';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadStatusSnapshot {
  type: UploadType;
  status: UploadStatus;
  progress: number;
  stage: string | null;
  message: string | null;
}

interface Props {
  type: UploadType;
  onUploadSuccess?: (data: { imageId: string; processingLogId?: string; type: UploadType; imageUrl?: string }) => void;
  onUploadError?: (err: Error) => void;
  onStatusChange?: (state: UploadStatusSnapshot) => void;
  existingImageUrl?: string | null;
  /** Thông tin giới tính để gợi ý ảnh 3×4 — hiện chưa dùng trong implementation này, giữ cho các call-site (register/profile). */
  photoGenderHint?: string;
}

// Error boundary cho lazy-loaded editor components
class EditorErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { hasError: boolean; errorMessage: string }> {
  constructor(props: { children: ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Trình chỉnh ảnh gặp lỗi không mong muốn.' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[EditorErrorBoundary] Image editor crashed:', error, errorInfo);
    trackError?.({ component: 'EditorErrorBoundary', action: 'editor-crash', error, stack: error.stack, severity: 'error' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="upload-loading" style={{ flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: '#dc2626' }} />
          <span style={{ color: '#991b1b', fontWeight: 500 }}>{this.state.errorMessage}</span>
          <span style={{ color: '#64748b', fontSize: 13 }}>Trình chỉnh ảnh không thể khởi động. Trang có thể đang dùng phiên bản cũ, hoặc ảnh không tương thích với trình duyệt.</span>
          <button
            type="button"
            className="btn-retry-upload"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              this.props.onRetry();
            }}
            style={{ marginTop: 4 }}
          >
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CCCDUploaderGenerateFirst({ type, onUploadSuccess, onUploadError, onStatusChange, existingImageUrl = null }: Props) {
  const isPhoto = type === 'photo_3x4';
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const localPreviewUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>(existingImageUrl ? 'success' : 'idle');
  const [preview, setPreview] = useState<string | null>(existingImageUrl);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentEditorFile, setDocumentEditorFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [templateImageError, setTemplateImageError] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const resetUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
    setStatus('idle');
    setPreview(null);
    setError('');
    setUploadProgress(0);
    setRetryCount(0);
    setSelectedFile(null);
    setDocumentEditorFile(null);
    setUploadedImageId(null);
    setUploadedImageUrl(null);
  }, []);

  useEffect(() => {
    if (existingImageUrl) {
      setStatus('success');
      setPreview(existingImageUrl);
      setUploadProgress(100);
      setError('');
    } else {
      resetUpload();
    }
  }, [existingImageUrl, resetUpload]);

  useEffect(() => () => { abortControllerRef.current?.abort(); }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || !showFullPreview) return undefined;
    const b = document.body.style.overflow;
    const h = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = b;
      document.documentElement.style.overflow = h;
    };
  }, [showFullPreview]);

  useEffect(() => {
    onStatusChange?.({ type, status, progress: Math.round(uploadProgress), stage: null, message: null });
  }, [onStatusChange, status, type, uploadProgress]);

  useEffect(() => () => { if (localPreviewUrlRef.current) URL.revokeObjectURL(localPreviewUrlRef.current); }, []);

  const setLocalPreviewFromFile = useCallback((file: File) => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    localPreviewUrlRef.current = objectUrl;
    setPreview(objectUrl);
  }, []);

  const sendFile = async (file: File, attempt = 0): Promise<void> => {
    setStatus('uploading');
    setUploadProgress(0);
    setError('');
    try {
      let processed = await convertHeicIfNeeded(file);
      if (!processed.type.startsWith('image/')) {
        throw new Error('Vui long chon file anh hop le.');
      }

      const formData = new FormData();
      formData.append('image', processed);
      formData.append('type', type);

      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), DEFAULT_UPLOAD_TIMEOUT_MS);

      const response = await fetch(buildApiUrl('/cccd-upload'), {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      }).finally(() => clearTimeout(timeoutId));

      const result = await response.json() as { success?: boolean; error?: string; imageId?: string | null; previewUrl?: string | null; processingLogId?: string | number };

      if (!result.success) {
        throw new Error(result.error || 'Upload that bai.');
      }

      const imageId = String(result.imageId || '');
      const previewUrl = result.previewUrl || null;

      setStatus('success');
      setUploadProgress(100);
      setUploadedImageId(imageId);
      setUploadedImageUrl(previewUrl);

      // Server preview URL is authoritative for both CCCD (CF Images) and
      // photo 3x4 (R2). Fall back to the local cropped file preview so the
      // success state always shows a thumbnail even if the server omits it.
      if (previewUrl) {
        if (localPreviewUrlRef.current) {
          URL.revokeObjectURL(localPreviewUrlRef.current);
          localPreviewUrlRef.current = null;
        }
        setPreview(previewUrl);
      } else if (processed) {
        setLocalPreviewFromFile(processed);
      }

      onUploadSuccess?.({
        imageId,
        processingLogId: result.processingLogId ? String(result.processingLogId) : undefined,
        type,
        imageUrl: previewUrl || undefined,
      });

      trackSuccess?.({ component: 'CCCDUploader', action: 'uploadFile', context: { type, imageId } });
    } catch (err: unknown) {
      if (attempt < MAX_RETRIES && !(err instanceof Error && err.name === 'AbortError')) {
        const next = attempt + 1;
        setRetryCount(next);
        setError(`Loi mang, dang thu lai lan ${next}/${MAX_RETRIES}...`);
        setTimeout(() => { void sendFile(file, next); }, 2000);
        return;
      }
      trackError?.({
        component: 'CCCDUploader',
        action: 'uploadFile',
        error: err,
        stack: err instanceof Error ? err.stack : undefined,
        context: { type },
        severity: 'error',
      });
      let message = err instanceof Error ? err.message : 'Upload that bai.';
      if (err instanceof Error && err.name === 'AbortError') {
        message = 'Qua thoi gian tai len. Kiem tra ket noi mang roi thu lai.';
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        message = 'Mat ket noi internet. Kiem tra Wi-Fi/4G roi thu lai.';
      }
      setError(message);
      setStatus('error');
      setPreview(null);
      setUploadProgress(0);
      onUploadError?.(err instanceof Error ? err : new Error(message));
    }
  };

  const openEditorForFile = async (file: File) => {
    try {
      setError('');
      const processed = await convertHeicIfNeeded(file);
      if (!processed.type.startsWith('image/')) {
        throw new Error('Vui long chon file anh hop le.');
      }
      if (!isPhoto) setDocumentEditorFile(processed);
      setSelectedFile(processed);
      setShowImageEditor(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Khong the mo file anh.');
    }
  };

  const handleIncomingFile = useCallback(async (file: File) => {
    return openEditorForFile(file);
  }, [isPhoto]);

  const openDocumentEditor = useCallback(() => {
    if (isPhoto) return;
    const file = documentEditorFile || selectedFile;
    if (!file) {
      setError('Chua co anh CCCD de can chinh. Vui long chon hoac chup lai anh.');
      return;
    }
    setError('');
    setSelectedFile(file);
    setShowImageEditor(true);
  }, [documentEditorFile, isPhoto, selectedFile]);

  const openNativePicker = (captureMode: '' | 'user' = '') => {
    setFileCaptureMode(captureMode);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const fileCaptureModeRef = useRef<'' | 'user'>('');
  const [fileCaptureMode, setFileCaptureMode] = useState<'' | 'user'>('');

  const chooseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileCaptureMode('');
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    await handleIncomingFile(file);
  };

  const onDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) await handleIncomingFile(file);
  }, [handleIncomingFile]);

  const containerClass = ['upload-container', `status-${status}`, isDragOver ? 'drag-active' : ''].filter(Boolean).join(' ');

  const processingOverlayActive = status === 'uploading';
  const processingOverlayProgress = Math.min(Math.max(Math.round(uploadProgress || 12), 6), 99);

  return (
    <div className="cccd-uploader" onDragEnter={(e) => { e.preventDefault(); dragCounterRef.current += 1; setIsDragOver(true); }} onDragLeave={(e) => { e.preventDefault(); dragCounterRef.current -= 1; if (dragCounterRef.current === 0) setIsDragOver(false); }} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className={containerClass}>
        {!preview ? (
          <div className="upload-trigger" onClick={() => openNativePicker()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openNativePicker()} aria-label={`Tai anh ${TYPE_LABELS[type]}`}>
            {status === 'uploading' ? (
              <div className="upload-placeholder upload-placeholder-loading">
                <Loader2 className="animate-spin icon-large" size={36} />
                <p className="upload-text">Dang tai anh...</p>
                {retryCount > 0 && <p className="upload-hint upload-hint-retry">Dang thu lai ({retryCount}/{MAX_RETRIES})...</p>}
              </div>
            ) : status === 'error' ? (
              <div className="upload-placeholder">
                <ImageOff className="icon-large icon-error" size={36} />
                <p className="upload-text upload-text-error">{isPhoto ? 'Anh 3x4 khong upload duoc' : 'Upload that bai'}</p>
                <p className="upload-hint">Nhan de chon anh khac</p>
              </div>
            ) : (
              <div className={`upload-idle-guide ${isPhoto ? 'photo-type' : 'cccd-type'} ${isPhoto && isMobile ? 'photo-mobile' : ''}`}>
                <div className="upload-template-preview">
                  {templateImageError ? (
                    <div className="template-preview-fallback"><ImageOff size={24} /></div>
                  ) : (
                    <img src={TEMPLATE_IMAGES[type]} alt={TYPE_LABELS[type]} className="template-preview-img" draggable={false} onError={() => setTemplateImageError(true)} />
                  )}
                  <div className="template-upload-overlay"><Upload size={24} /></div>
                </div>
                <div className="upload-idle-info">
                  <p className="upload-idle-desc">{TYPE_DESCRIPTIONS[type]}</p>
                  <div className="upload-idle-actions">
                    <span className="upload-idle-action" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); openNativePicker(); }}>
                      <Upload size={14} />Chon anh
                    </span>
                    {!isPhoto && (
                      <span className="upload-idle-action camera-action" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); openNativePicker('user'); }}>
                        <Camera size={14} />Chup anh
                      </span>
                    )}
                    {isPhoto && isMobile && (
                      <span className="upload-idle-action camera-action" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); openNativePicker('user'); }}>
                        <Camera size={14} />Chup selfie
                      </span>
                    )}
                  </div>
                </div>
                {isDragOver && <div className="upload-drag-overlay"><Upload size={28} /><span>Tha anh vao day</span></div>}
              </div>
            )}
          </div>
        ) : (
          <div className={`preview-container ${isPhoto ? 'photo-type' : 'cccd-type'}`}>
            <div className="preview-frame">
              <img src={preview} alt={`Preview ${TYPE_LABELS[type]}`} />
              <div className="preview-overlay">
                {status === 'success' && <div className="status-badge success"><CheckCircle size={16} /><span>OK</span></div>}
                {status === 'uploading' && <div className="status-badge uploading"><Loader2 className="animate-spin" size={16} /><span>Tai...</span></div>}
                {status === 'error' && <div className="status-badge error"><XCircle size={16} /><span>Loi</span></div>}
              </div>
            </div>
            {(status === 'success') && (
              <div className="preview-bottom-actions">
                {!isPhoto && documentEditorFile && (
                  <button type="button" className="btn-preview-adjust" onClick={openDocumentEditor}>
                    <Eye size={14} /><span>Can chinh</span>
                  </button>
                )}
                <button type="button" className="btn-preview-view" onClick={() => setShowFullPreview(true)}>
                  <Eye size={14} /><span>Xem</span>
                </button>
                <button type="button" className="btn-preview-change" onClick={resetUpload}>
                  <RefreshCw size={14} /><span>Doi anh</span>
                </button>
              </div>
            )}
          </div>
        )}

        {processingOverlayActive ? (
          <div className="upload-processing-overlay" role="status" aria-live="polite">
            <div className="upload-processing-overlay-card">
              <Loader2 className="animate-spin" size={24} />
              <div className="upload-processing-overlay-copy">
                <p className="upload-processing-overlay-title">Dang tai anh len he thong</p>
                <p className="upload-processing-overlay-text">Vui long cho trong giay lat.</p>
                <div className="upload-processing-overlay-track" aria-hidden="true">
                  <div className="upload-processing-overlay-fill" style={{ width: `${processingOverlayProgress}%` }} />
                </div>
                <span className="upload-processing-overlay-progress">{processingOverlayProgress}%</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {status === 'uploading' && uploadProgress > 0 && (
        <UploadProgressBar
          progress={uploadProgress}
          label="Dang tai anh..."
          completionLabel="Da tai xong."
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" capture={fileCaptureMode || undefined} onChange={chooseFile} style={{ display: 'none' }} />

      {error && (
        <div className={`error-message ${error.includes('mang') || error.includes('thu lai') ? 'warning' : ''}`} role="alert">
          <AlertCircle size={14} />
          <div className="error-message-body">
            <span>{error}</span>
            <div className="error-action-row">
              <button type="button" className="btn-retry-upload" onClick={resetUpload}>
                <RefreshCw size={12} /> Thu lai
              </button>
              {isPhoto && isMobile && (
                <button type="button" className="btn-guide-upload" onClick={() => openNativePicker('user')}>
                  <Camera size={12} /> Chup selfie
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showImageEditor && selectedFile && (
        <EditorErrorBoundary onRetry={() => { setShowImageEditor(false); setSelectedFile(null); }}>
          <Suspense fallback={<div className="upload-loading"><Loader2 className="animate-spin" size={24} /><span>Dang tai trinh chinh anh...</span></div>}>
            <ImageEditor
              imageFile={selectedFile}
              type={type}
              templateImage={TEMPLATE_IMAGES[type]}
              onConfirm={async (croppedFile: File) => {
                setShowImageEditor(false);
                setSelectedFile(null);
                setRetryCount(0);
                if (!isPhoto) {
                  setDocumentEditorFile(croppedFile);
                }
                setLocalPreviewFromFile(croppedFile);
                await sendFile(croppedFile);
              }}
              onCancel={() => { setShowImageEditor(false); setSelectedFile(null); }}
            />
          </Suspense>
        </EditorErrorBoundary>
      )}

      {showFullPreview && preview && (
        <FullPreview type={type} preview={preview} label={TYPE_LABELS[type]} onClose={() => setShowFullPreview(false)} onRetake={resetUpload} />
      )}

      {showCamera && !isPhoto && !showImageEditor && (
        <EditorErrorBoundary onRetry={() => { setShowCamera?.(false); }}>
          <Suspense fallback={<div className="upload-loading"><Loader2 className="animate-spin" size={24} /><span>Dang mo camera...</span></div>}>
            <CameraWithOverlay
              type={type}
              templateImage={TEMPLATE_IMAGES[type]}
              onCapture={async (file: File) => {
                setShowCamera?.(false);
                await handleIncomingFile(file);
              }}
              onClose={() => setShowCamera?.(false)}
            />
          </Suspense>
        </EditorErrorBoundary>
      )}
    </div>
  );
}
