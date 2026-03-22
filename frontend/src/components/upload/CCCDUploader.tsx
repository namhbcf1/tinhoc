import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import {
    CheckCircle, XCircle, Loader2, AlertCircle,
    Eye, Upload, RefreshCw, ImageOff, Camera
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
import './CCCDUploader.css';

const ImageEditor = lazyWithChunkReload(() => import('./ImageEditor'));
const CameraWithOverlay = lazyWithChunkReload(() => import('./CameraWithOverlay'));

// Template image URLs
const TEMPLATE_IMAGES: Record<string, string> = {
    cccd_front: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_front.jpg',
    cccd_back: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_back.jpg',
    photo_3x4: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/photo_3x4.jpg',
};

const UPLOAD_TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;

const TYPE_LABELS: Record<string, string> = {
    cccd_front: 'CCCD mặt trước',
    cccd_back: 'CCCD mặt sau',
    photo_3x4: 'Ảnh thẻ 3x4',
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
    cccd_front: 'Mặt CÓ ảnh và số CCCD (12 số)',
    cccd_back: 'Mặt CÓ mã QR và vân tay',
    photo_3x4: 'Phông trắng, áo cổ, 3x4 cm',
};

interface CCCDUploaderProps {
    type: 'cccd_front' | 'cccd_back' | 'photo_3x4';
    onUploadSuccess?: (data: { imageId: string; processingLogId?: string; type: string }) => void;
    onUploadError?: (err: Error) => void;
    existingImageUrl?: string | null;
}

export default function CCCDUploader({
    type,
    onUploadSuccess,
    onUploadError,
    existingImageUrl = null,
}: CCCDUploaderProps) {
    const isMobile = useIsMobile();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);

    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(existingImageUrl);
    const [status, setStatus] = useState(existingImageUrl ? 'success' : 'idle');
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    const [showFullPreview, setShowFullPreview] = useState(false);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const [qualityWarnings, setQualityWarnings] = useState<string[]>([]);
    const [retryCount, setRetryCount] = useState(0);
    const [showCamera, setShowCamera] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (existingImageUrl) {
            setPreview(existingImageUrl);
            setStatus('success');
        } else if (!preview) {
            setStatus('idle');
        }
    }, [existingImageUrl]);

    useEffect(() => {
        return () => { abortControllerRef.current?.abort(); };
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        if (!showImageEditor && !showFullPreview && !showCamera) return;

        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyTouchAction = document.body.style.touchAction;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
            document.body.style.touchAction = previousBodyTouchAction;
        };
    }, [showImageEditor, showFullPreview, showCamera]);

    // ---- File input / drag-drop ----
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (fileInputRef.current) fileInputRef.current.value = '';
        await openEditorForFile(file);
    };

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) setIsDragOver(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/') && !file.name?.toLowerCase().match(/\.(heic|heif)$/)) {
            setError('Vui lòng kéo thả file ảnh hợp lệ (JPG, PNG, HEIC...)');
            return;
        }
        await openEditorForFile(file);
    }, []);

    // ---- Pre-process before editor ----
    const openEditorForFile = async (file: File) => {
        setError('');
        try {
            const processedFile = await convertHeicIfNeeded(file);
            if (!processedFile.type.startsWith('image/')) {
                setError('Vui lòng chọn file ảnh hợp lệ (JPG, PNG, HEIC...)');
                return;
            }
            setSelectedFile(processedFile);
            setShowImageEditor(true);
        } catch (err: any) {
            setError(err.message || 'Không thể mở file ảnh. Vui lòng thử lại.');
        }
    };

    const handleEditorConfirm = async (croppedFile: File) => {
        setShowImageEditor(false);
        setSelectedFile(null);
        setRetryCount(0);
        setError('');
        await processAndUpload(croppedFile);
    };

    const handleEditorCancel = () => {
        setShowImageEditor(false);
        setSelectedFile(null);
    };

    const handleCameraCapture = async (file: File) => {
        setShowCamera(false);
        await openEditorForFile(file);
    };

    const handleCameraClose = () => {
        setShowCamera(false);
    };

    // ---- Upload with progress + retry ----
    const processAndUpload = async (file: File, attempt = 0) => {
        setStatus('uploading');
        setUploading(true);
        setUploadProgress(0);
        setQualityWarnings([]);
        setError('');

        const qualityPromise = detectImageQuality(file).catch(() => null);

        try {
            let processedFile = file;

            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 85) { clearInterval(progressInterval); return prev; }
                    return prev + Math.floor(Math.random() * 8) + 3;
                });
            }, 400);

            // Resize + compress
            try {
                const img = new Image();
                const objectUrl = URL.createObjectURL(file);
                const needsResize = await new Promise<boolean>((resolve) => {
                    img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img.width > 1920 || img.height > 1920); };
                    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(false); };
                    img.src = objectUrl;
                });
                if (needsResize) {
                    processedFile = await resizeImage(processedFile, { maxWidth: 1920, maxHeight: 1920, quality: 0.9 }) as File;
                }
                if (processedFile.size > 1024 * 1024) {
                    processedFile = await compressImage(processedFile, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
                }
            } catch { /* use original */ }

            const formData = new FormData();
            formData.append('image', processedFile);
            formData.append('type', type);

            abortControllerRef.current = new AbortController();
            const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), UPLOAD_TIMEOUT_MS);

            let response: Response;
            try {
                response = await fetch(
                    buildApiUrl('/cccd-upload'),
                    { method: 'POST', body: formData, signal: abortControllerRef.current.signal }
                );
            } finally {
                clearTimeout(timeoutId);
                clearInterval(progressInterval);
            }

            const result = await response!.json();
            if (!result.success) throw new Error(result.error || 'Upload thất bại');

            setUploadProgress(100);

            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(processedFile);

            setStatus('success');
            setRetryCount(0);

            const quality = await qualityPromise;
            if (quality) {
                const warnings: string[] = [];
                if (quality.avgBrightness < 50) warnings.push('Ảnh quá tối — chụp lại ở nơi sáng hơn');
                if (quality.avgBrightness > 220) warnings.push('Ảnh quá sáng/chói — tránh ánh đèn trực tiếp');
                if (quality.sharpness < 3) warnings.push('Ảnh bị mờ — giữ tay thẳng và giữ yên khi chụp');
                if (warnings.length > 0) setQualityWarnings(warnings);
            }

            if (typeof trackSuccess === 'function') {
                trackSuccess({ component: 'CCCDUploader', action: 'uploadFile', context: { type, imageId: result.imageId } });
            }

            if (onUploadSuccess) {
                setTimeout(() => {
                    onUploadSuccess({ imageId: result.imageId, processingLogId: result.processingLogId, type });
                }, 0);
            }
        } catch (err: any) {
            if (attempt < MAX_RETRIES && err.name !== 'AbortError') {
                const nextAttempt = attempt + 1;
                setRetryCount(nextAttempt);
                setError(`Lỗi mạng, đang thử lại lần ${nextAttempt}/${MAX_RETRIES}...`);
                setTimeout(() => processAndUpload(file, nextAttempt), 2000);
                return;
            }

            if (typeof trackError === 'function') {
                trackError({ component: 'CCCDUploader', action: 'uploadFile', error: err, stack: err?.stack, context: { type, fileSize: file.size }, severity: 'error' });
            }

            let errorMsg = err.message || 'Upload thất bại. Vui lòng thử lại.';
            if (err.name === 'AbortError') errorMsg = 'Quá thời gian tải lên. Kiểm tra kết nối mạng và thử lại.';
            else if (!navigator.onLine) errorMsg = 'Mất kết nối internet. Kiểm tra WiFi/4G rồi thử lại.';

            setError(errorMsg);
            setStatus('error');
            setPreview(null);
            setUploadProgress(0);
            if (onUploadError) onUploadError(err);
        } finally {
            setUploading(false);
        }
    };

    const resetUpload = () => {
        abortControllerRef.current?.abort();
        setPreview(null);
        setStatus('idle');
        setError('');
        setUploadProgress(0);
        setQualityWarnings([]);
        setRetryCount(0);
    };

    // ---- Render ----
    const isIdle = status === 'idle';
    const isError = status === 'error';
    const isPhoto = type === 'photo_3x4';
    const containerClass = [
        'upload-container',
        `status-${status}`,
        isDragOver ? 'drag-active' : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            className="cccd-uploader"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className={containerClass}>
                {!preview ? (
                    <div
                        className="upload-trigger"
                        onClick={handleUploadClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && handleUploadClick()}
                        aria-label={`Tải ảnh ${TYPE_LABELS[type]}`}
                    >
                        {status === 'uploading' ? (
                            <div className="upload-placeholder upload-placeholder-loading">
                                <Loader2 className="animate-spin icon-large" size={36} />
                                <p className="upload-text">Đang xử lý...</p>
                                {retryCount > 0 && (
                                    <p className="upload-hint upload-hint-retry">
                                        Đang thử lại ({retryCount}/{MAX_RETRIES})...
                                    </p>
                                )}
                            </div>
                        ) : isError ? (
                            <div className="upload-placeholder">
                                <ImageOff className="icon-large icon-error" size={36} />
                                <p className="upload-text upload-text-error">Upload thất bại</p>
                                <p className="upload-hint">Nhấn để thử lại</p>
                            </div>
                        ) : (
                            /* Idle state: show template image as visual guide */
                            <div className={`upload-idle-guide ${isPhoto ? 'photo-type' : 'cccd-type'}`}>
                                <div className="upload-template-preview">
                                    <img
                                        src={TEMPLATE_IMAGES[type]}
                                        alt={TYPE_LABELS[type]}
                                        className="template-preview-img"
                                        draggable={false}
                                    />
                                    <div className="template-upload-overlay">
                                        <Upload size={24} />
                                    </div>
                                </div>
                                <div className="upload-idle-info">
                                    <p className="upload-idle-desc">{TYPE_DESCRIPTIONS[type]}</p>
                                    <div className="upload-idle-actions">
                                        <span className="upload-idle-action" role="button" tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}
                                            onKeyDown={e => e.key === 'Enter' && handleUploadClick()}
                                        >
                                            <Upload size={14} />
                                            Chọn ảnh
                                        </span>
                                        {!isPhoto && (
                                            <span className="upload-idle-action camera-action" role="button" tabIndex={0}
                                                onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                                                onKeyDown={e => e.key === 'Enter' && setShowCamera(true)}
                                            >
                                                <Camera size={14} />
                                                Chụp ảnh
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {isDragOver && (
                                    <div className="upload-drag-overlay">
                                        <Upload size={28} />
                                        <span>Thả ảnh vào đây!</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`preview-container ${isPhoto ? 'photo-type' : 'cccd-type'}`}>
                        <img src={preview} alt={`Preview ${TYPE_LABELS[type]}`} />
                        <div className="preview-overlay">
                            {status === 'success' && (
                                <div className="status-badge success">
                                    <CheckCircle size={16} />
                                    <span>OK</span>
                                </div>
                            )}
                            {status === 'uploading' && (
                                <div className="status-badge uploading">
                                    <Loader2 className="animate-spin" size={16} />
                                    <span>Tải...</span>
                                </div>
                            )}
                            {status === 'error' && (
                                <div className="status-badge error">
                                    <XCircle size={16} />
                                    <span>Lỗi</span>
                                </div>
                            )}
                        </div>
                        <div className="preview-bottom-actions">
                            {status === 'success' && (
                                <>
                                    <button type="button" className="btn-preview-view" onClick={() => setShowFullPreview(true)} title="Xem ảnh">
                                        <Eye size={14} />
                                        <span>Xem</span>
                                    </button>
                                    <button type="button" className="btn-preview-change" onClick={resetUpload}>
                                        <RefreshCw size={14} />
                                        <span>Đổi ảnh</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {status === 'uploading' && uploadProgress > 0 && (
                <UploadProgressBar progress={uploadProgress} />
            )}

            <QualityWarning
                warnings={qualityWarnings}
                onRetry={() => { setQualityWarnings([]); resetUpload(); }}
                onDismiss={() => setQualityWarnings([])}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {error && (
                <div className={`error-message ${error.includes('mạng') || error.includes('thử lại') ? 'warning' : ''}`} role="alert">
                    <AlertCircle size={14} />
                    <div className="error-message-body">
                        <span>{error}</span>
                        {(isError || (status !== 'uploading' && error)) && (
                            <button type="button" className="btn-retry-upload" onClick={resetUpload}>
                                <RefreshCw size={12} /> Thử lại
                            </button>
                        )}
                    </div>
                </div>
            )}

            {showImageEditor && selectedFile && (
                <Suspense fallback={
                    <div className="upload-loading">
                        <Loader2 className="animate-spin" size={24} />
                        <span>Đang tải trình chỉnh ảnh...</span>
                    </div>
                }>
                    <ImageEditor
                        imageFile={selectedFile}
                        type={type}
                        templateImage={TEMPLATE_IMAGES[type]}
                        onConfirm={handleEditorConfirm}
                        onCancel={handleEditorCancel}
                    />
                </Suspense>
            )}

            {showFullPreview && preview && (
                <FullPreview
                    type={type}
                    preview={preview}
                    label={TYPE_LABELS[type]}
                    onClose={() => setShowFullPreview(false)}
                    onRetake={resetUpload}
                />
            )}

            {showCamera && (
                <Suspense fallback={
                    <div className="upload-loading">
                        <Loader2 className="animate-spin" size={24} />
                        <span>Đang mở camera...</span>
                    </div>
                }>
                    <CameraWithOverlay
                        type={type}
                        templateImage={TEMPLATE_IMAGES[type]}
                        onCapture={handleCameraCapture}
                        onClose={handleCameraClose}
                    />
                </Suspense>
            )}
        </div>
    );
}
