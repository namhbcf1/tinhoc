import { useState, useRef, lazy, Suspense, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
    Camera, CheckCircle, XCircle, Loader2, AlertCircle,
    Eye, X, Upload, RefreshCw, Info, ImageOff
} from 'lucide-react';
import { trackError, trackSuccess } from '../../utils/errorTracker';
import { getOverlayRatio } from './overlayUtils';
import { useIsMobile } from '../../utils/deviceDetection';
import { resizeImage, compressImage } from '../../utils/imageUtils';
import './CCCDUploader.css';

const CameraWithOverlay = lazy(() => import('./CameraWithOverlay'));
const ImageEditor = lazy(() => import('./ImageEditor'));

// Template image URLs
const TEMPLATE_IMAGES = {
    cccd_front: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_front.jpg',
    cccd_back: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_back.jpg',
    photo_3x4: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/photo_3x4.jpg',
};

// Upload timeout: 60s
const UPLOAD_TIMEOUT_MS = 60000;
// Max retry attempts
const MAX_RETRIES = 2;

/** Detect basic image quality (brightness + blur proxy via sharpness) */
async function detectImageQuality(file) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                // Sample 200x200 for speed
                const size = 200;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);
                const { data } = ctx.getImageData(0, 0, size, size);

                // Brightness: average luminance
                let totalLuminance = 0;
                for (let i = 0; i < data.length; i += 4) {
                    totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                }
                const avgBrightness = totalLuminance / (data.length / 4);

                // Blur proxy: variance of Laplacian approximation (Sobelx edges)
                let edgeSum = 0;
                const w = size;
                for (let y = 1; y < size - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        const idx = (y * w + x) * 4;
                        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                        const left = 0.299 * data[((y) * w + (x - 1)) * 4] + 0.587 * data[((y) * w + (x - 1)) * 4 + 1] + 0.114 * data[((y) * w + (x - 1)) * 4 + 2];
                        const right = 0.299 * data[((y) * w + (x + 1)) * 4] + 0.587 * data[((y) * w + (x + 1)) * 4 + 1] + 0.114 * data[((y) * w + (x + 1)) * 4 + 2];
                        const top = 0.299 * data[((y - 1) * w + x) * 4] + 0.587 * data[((y - 1) * w + x) * 4 + 1] + 0.114 * data[((y - 1) * w + x) * 4 + 2];
                        const bottom = 0.299 * data[((y + 1) * w + x) * 4] + 0.587 * data[((y + 1) * w + x) * 4 + 1] + 0.114 * data[((y + 1) * w + x) * 4 + 2];
                        const laplacian = Math.abs(gray * 4 - left - right - top - bottom);
                        edgeSum += laplacian;
                    }
                }
                const sharpness = edgeSum / ((size - 2) * (size - 2));

                URL.revokeObjectURL(url);
                resolve({ avgBrightness, sharpness });
            } catch {
                URL.revokeObjectURL(url);
                resolve({ avgBrightness: 128, sharpness: 10 });
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ avgBrightness: 128, sharpness: 10 });
        };
        img.src = url;
    });
}

/** Convert HEIC/HEIF to JPEG using heic2any if available */
async function convertHeicIfNeeded(file) {
    const name = (file.name || '').toLowerCase();
    const isHeic = name.endsWith('.heic') || name.endsWith('.heif')
        || file.type === 'image/heic' || file.type === 'image/heif';
    if (!isHeic) return file;

    try {
        const { default: heic2any } = await import('heic2any');
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        const converted = Array.isArray(blob) ? blob[0] : blob;
        return new File([converted], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    } catch (err) {
        console.warn('heic2any failed:', err);
        throw new Error('Định dạng HEIC/HEIF không hỗ trợ. Vui lòng chuyển sang JPG hoặc PNG trước khi upload.');
    }
}

// -------------------------------------------------------
// STEP GUIDE PANEL
// -------------------------------------------------------
function StepGuide({ type, onClose }) {
    const steps = {
        cccd_front: [
            { icon: '☀️', text: 'Chụp ở nơi có đủ ánh sáng' },
            { icon: '📋', text: 'Đặt CCCD nằm NGANG trong khung hình' },
            { icon: '👁️', text: 'Đảm bảo 4 góc CCCD đều nhìn thấy' },
            { icon: '📸', text: 'Giữ điện thoại thẳng, chụp rõ' },
            { icon: '🔍', text: 'Đây là mặt CÓ ảnh và số CCCD' },
        ],
        cccd_back: [
            { icon: '☀️', text: 'Chụp ở nơi có đủ ánh sáng' },
            { icon: '📋', text: 'Đặt CCCD nằm NGANG trong khung hình' },
            { icon: '👁️', text: 'Đảm bảo 4 góc CCCD đều nhìn thấy' },
            { icon: '📸', text: 'Giữ điện thoại thẳng, chụp rõ' },
            { icon: '🔍', text: 'Đây là mặt CÓ mã QR và vân tay' },
        ],
        photo_3x4: [
            { icon: '👔', text: 'Mặc áo có cổ, trang phục lịch sự' },
            { icon: '☀️', text: 'Nền trắng hoặc sáng màu, đủ ánh sáng' },
            { icon: '😊', text: 'Nhìn thẳng, nét mặt tự nhiên, không cười lớn' },
            { icon: '👓', text: 'Không đeo kính màu, tai và trán để lộ' },
            { icon: '📷', text: 'Ảnh chụp trong 6 tháng gần nhất' },
        ],
    };
    return (
        <div className="step-guide-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="step-guide-content" onClick={e => e.stopPropagation()}>
                <div className="step-guide-header">
                    <Info size={18} color="#f97316" />
                    <h4>Hướng dẫn chụp ảnh</h4>
                    <button type="button" className="step-guide-close" onClick={onClose} aria-label="Đóng">
                        <X size={16} />
                    </button>
                </div>
                <ul className="step-guide-list">
                    {(steps[type] || []).map((s, i) => (
                        <li key={i}>
                            <span className="step-icon">{s.icon}</span>
                            <span>{s.text}</span>
                        </li>
                    ))}
                </ul>
                <button type="button" className="step-guide-ok" onClick={onClose}>Đã hiểu, tiếp tục</button>
            </div>
        </div>
    );
}

// -------------------------------------------------------
// QUALITY WARNING BANNER
// -------------------------------------------------------
function QualityWarning({ warnings, onDismiss, onRetry }) {
    if (!warnings || warnings.length === 0) return null;
    return (
        <div className="quality-warning-banner" role="alert">
            <div className="quality-warning-icon"><AlertCircle size={18} /></div>
            <div className="quality-warning-body">
                <strong>Ảnh có thể chưa đạt yêu cầu:</strong>
                <ul>
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
            </div>
            <div className="quality-warning-actions">
                <button type="button" className="btn-quality-retry" onClick={onRetry}>
                    <RefreshCw size={14} /> Chụp lại
                </button>
                <button type="button" className="btn-quality-dismiss" onClick={onDismiss}>
                    Vẫn dùng ảnh này
                </button>
            </div>
        </div>
    );
}

// -------------------------------------------------------
// UPLOAD PROGRESS BAR
// -------------------------------------------------------
function UploadProgressBar({ progress }) {
    return (
        <div className="upload-progress-wrapper" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="upload-progress-track">
                <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="upload-progress-label">{progress < 100 ? `Đang tải lên... ${progress}%` : 'Hoàn thành!'}</span>
        </div>
    );
}

// -------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------
export default function CCCDUploader({
    type,
    onUploadSuccess,
    onUploadError,
    existingImageUrl = null,
}) {
    const isMobile = useIsMobile();
    const fileInputRef = useRef(null);
    const dragCounterRef = useRef(0);

    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(existingImageUrl);
    const [status, setStatus] = useState(existingImageUrl ? 'success' : 'idle');
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    const [showCameraModal, setShowCameraModal] = useState(false);
    const [showFullPreview, setShowFullPreview] = useState(false);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [showStepGuide, setShowStepGuide] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Quality warnings (shown after upload, before dismissal)
    const [qualityWarnings, setQualityWarnings] = useState([]);
    const [retryFile, setRetryFile] = useState(null);

    // Retry state
    const [retryCount, setRetryCount] = useState(0);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        if (existingImageUrl) {
            setPreview(existingImageUrl);
            setStatus('success');
        } else if (!preview) {
            setStatus('idle');
        }
    }, [existingImageUrl]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const labels = {
        cccd_front: 'CCCD mặt trước',
        cccd_back: 'CCCD mặt sau',
        photo_3x4: 'Ảnh thẻ 3x4',
    };

    const typeHints = {
        cccd_front: 'Mặt CÓ ảnh và số CCCD (12 số)',
        cccd_back: 'Mặt CÓ mã QR và vân tay',
        photo_3x4: 'Phông trắng, áo cổ, chụp trong 6 tháng',
    };

    // ---- Camera ----
    const checkCameraAvailable = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Trình duyệt không hỗ trợ camera. Vui lòng dùng Chrome hoặc Safari mới nhất.');
            return false;
        }
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            setError('Camera chỉ hoạt động trên HTTPS. Vui lòng dùng kết nối bảo mật.');
            return false;
        }
        return true;
    };

    const handleOpenCamera = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setError('');
        const ok = await checkCameraAvailable();
        if (ok) setShowCameraModal(true);
    };

    const handleCameraCapture = async (file) => {
        setShowCameraModal(false);
        setError('');
        setRetryCount(0);
        await processAndUpload(file);
    };

    const handleCameraClose = () => setShowCameraModal(false);

    // ---- File input / drag-drop ----
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (fileInputRef.current) fileInputRef.current.value = '';
        await openEditorForFile(file);
    };

    const handleUploadClick = () => fileInputRef.current?.click();

    // Drag & Drop handlers (desktop + mobile)
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) setIsDragOver(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(async (e) => {
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
    const openEditorForFile = async (file) => {
        setError('');
        try {
            // Convert HEIC first
            let processedFile = await convertHeicIfNeeded(file);

            // Validate type after conversion
            if (!processedFile.type.startsWith('image/')) {
                setError('Vui lòng chọn file ảnh hợp lệ (JPG, PNG, HEIC...)');
                return;
            }

            // Pre-resize if too large
            try {
                const img = new Image();
                const url = URL.createObjectURL(processedFile);
                const needsResize = await new Promise((resolve) => {
                    img.onload = () => { URL.revokeObjectURL(url); resolve(img.width > 1920 || img.height > 1920); };
                    img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
                    img.src = url;
                });
                if (needsResize) {
                    processedFile = await resizeImage(processedFile, { maxWidth: 1920, maxHeight: 1920, quality: 0.9 });
                }
            } catch { /* continue */ }

            setSelectedFile(processedFile);
            setShowImageEditor(true);
        } catch (err) {
            setError(err.message || 'Không thể mở file ảnh. Vui lòng thử lại.');
        }
    };

    const handleEditorConfirm = async (croppedFile) => {
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

    // ---- Upload with progress + retry ----
    const processAndUpload = async (file, attempt = 0) => {
        setStatus('uploading');
        setUploading(true);
        setUploadProgress(0);
        setQualityWarnings([]);
        setError('');

        // Run quality check in parallel
        const qualityPromise = detectImageQuality(file).catch(() => null);

        try {
            let processedFile = file;

            // Simulate upload progress (XHR not available, fake it)
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
                const needsResize = await new Promise((resolve) => {
                    img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img.width > 1920 || img.height > 1920); };
                    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(false); };
                    img.src = objectUrl;
                });
                if (needsResize) {
                    processedFile = await resizeImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.9 });
                }
                if (processedFile.size > 1024 * 1024) {
                    processedFile = await compressImage(processedFile, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
                }
            } catch { /* use original */ }

            const formData = new FormData();
            formData.append('image', processedFile);
            formData.append('type', type);

            // Abort controller for timeout
            abortControllerRef.current = new AbortController();
            const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), UPLOAD_TIMEOUT_MS);

            let response;
            try {
                response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'https://vantrangedu-api.bangachieu2.workers.dev'}/cccd-upload`,
                    { method: 'POST', body: formData, signal: abortControllerRef.current.signal }
                );
            } finally {
                clearTimeout(timeoutId);
                clearInterval(progressInterval);
            }

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Upload thất bại');

            setUploadProgress(100);

            // Show preview
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(processedFile);

            setStatus('success');
            setRetryCount(0);

            // Evaluate quality warnings
            const quality = await qualityPromise;
            if (quality) {
                const warnings = [];
                if (quality.avgBrightness < 50) warnings.push('Ảnh quá tối — chụp lại ở nơi sáng hơn');
                if (quality.avgBrightness > 220) warnings.push('Ảnh quá sáng/chói — tránh ánh đèn trực tiếp');
                if (quality.sharpness < 3) warnings.push('Ảnh bị mờ — giữ tay thẳng và giữ yên khi chụp');
                if (warnings.length > 0) {
                    setQualityWarnings(warnings);
                    setRetryFile(processedFile);
                }
            }

            if (typeof trackSuccess === 'function') {
                trackSuccess({ component: 'CCCDUploader', action: 'uploadFile', context: { type, imageId: result.imageId } });
            }

            if (onUploadSuccess) {
                setTimeout(() => {
                    onUploadSuccess({ imageId: result.imageId, processingLogId: result.processingLogId, type });
                }, 0);
            }
        } catch (err) {
            // Retry logic
            if (attempt < MAX_RETRIES && err.name !== 'AbortError') {
                const nextAttempt = attempt + 1;
                setRetryCount(nextAttempt);
                setError(`Lỗi mạng, đang thử lại lần ${nextAttempt}/${MAX_RETRIES}...`);
                setTimeout(() => processAndUpload(file, nextAttempt), 2000);
                return;
            }

            if (typeof trackError === 'function') {
                trackError({ component: 'CCCDUploader', action: 'uploadFile', error: err, context: { type, fileSize: file.size } });
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
        setRetryFile(null);
        setRetryCount(0);
    };

    const handleQualityRetry = () => {
        setQualityWarnings([]);
        resetUpload();
    };

    const handleQualityDismiss = () => {
        setQualityWarnings([]);
    };

    // ---- Render ----
    const isIdle = status === 'idle' || status === 'error';
    const containerClass = [
        'upload-container',
        `status-${status}`,
        isDragOver ? 'drag-active' : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            <div
                className="cccd-uploader"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {/* Type hint badge */}
                <p className="upload-type-hint">
                    <Info size={12} />
                    {typeHints[type]}
                </p>

                <div className={containerClass}>
                    {!preview ? (
                        <div className="upload-trigger" onClick={handleOpenCamera} role="button" tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && handleOpenCamera(e)}
                            aria-label={`Chụp ${labels[type]}`}
                        >
                            <div className="upload-placeholder">
                                {status === 'uploading' ? (
                                    <>
                                        <Loader2 className="animate-spin icon-large" size={40} />
                                        <p className="upload-text">Đang xử lý...</p>
                                        {retryCount > 0 && (
                                            <p className="upload-hint upload-hint-retry">
                                                Đang thử lại ({retryCount}/{MAX_RETRIES})...
                                            </p>
                                        )}
                                    </>
                                ) : status === 'error' ? (
                                    <>
                                        <ImageOff className="icon-large icon-error" size={40} />
                                        <p className="upload-text upload-text-error">Upload thất bại</p>
                                        <p className="upload-hint">Click để thử lại</p>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="icon-large" size={40} />
                                        <p className="upload-text">Chụp {labels[type]}</p>
                                        <p className="upload-hint">Nhấn để mở camera</p>
                                        {isDragOver && (
                                            <p className="upload-hint upload-hint-drag">Thả ảnh vào đây!</p>
                                        )}
                                        {!isDragOver && !isMobile && (
                                            <p className="upload-hint upload-hint-small">hoặc kéo thả ảnh vào đây</p>
                                        )}
                                        {isMobile && (
                                            <p className="upload-hint upload-hint-tip">📱 Mở camera để chụp trực tiếp</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="preview-container">
                            <img src={preview} alt={`Preview ${labels[type]}`} />
                            <div className="preview-overlay">
                                {status === 'success' && (
                                    <div className="status-badge success">
                                        <CheckCircle size={18} />
                                        <span>Đã tải lên</span>
                                    </div>
                                )}
                                {status === 'uploading' && (
                                    <div className="status-badge uploading">
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>Đang tải...</span>
                                    </div>
                                )}
                                {status === 'error' && (
                                    <div className="status-badge error">
                                        <XCircle size={18} />
                                        <span>Lỗi</span>
                                    </div>
                                )}
                                {status === 'success' && (
                                    <button type="button" className="btn-view-image" onClick={() => setShowFullPreview(true)} title="Xem ảnh">
                                        <Eye size={18} />
                                    </button>
                                )}
                            </div>
                            {status === 'success' && (
                                <button type="button" className="btn-change" onClick={resetUpload}>
                                    <RefreshCw size={14} />
                                    {isMobile ? 'Chụp lại' : 'Tải ảnh mới'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Upload progress bar */}
                {status === 'uploading' && uploadProgress > 0 && (
                    <UploadProgressBar progress={uploadProgress} />
                )}

                {/* Quality warnings */}
                <QualityWarning
                    warnings={qualityWarnings}
                    onRetry={handleQualityRetry}
                    onDismiss={handleQualityDismiss}
                />

                {/* Action buttons row */}
                <div className="uploader-actions">
                    {/* Upload file button — both mobile and desktop */}
                    {isIdle && (
                        <button
                            type="button"
                            className="btn-upload-file"
                            onClick={handleUploadClick}
                            disabled={uploading}
                        >
                            <Upload size={16} />
                            <span>Chọn từ thư viện</span>
                        </button>
                    )}

                    {/* Step guide button */}
                    <button
                        type="button"
                        className="btn-step-guide"
                        onClick={() => setShowStepGuide(true)}
                        title="Hướng dẫn chụp ảnh"
                    >
                        <Info size={16} />
                        <span>Hướng dẫn</span>
                    </button>
                </div>

                {/* Hidden file input — accept HEIC too */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {/* Error message */}
                {error && (
                    <div className={`error-message ${error.includes('mạng') || error.includes('thử lại') ? 'warning' : ''}`} role="alert">
                        <AlertCircle size={16} />
                        <div className="error-message-body">
                            <span>{error}</span>
                            {(status === 'error' || (status !== 'uploading' && error)) && (
                                <button type="button" className="btn-retry-upload" onClick={resetUpload}>
                                    <RefreshCw size={13} /> Thử lại
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Camera modal */}
                {showCameraModal && typeof window !== 'undefined' && document?.body && (
                    <Suspense fallback={
                        createPortal(
                            <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999 }}>
                                <div style={{ textAlign: 'center', color: '#fff' }}>
                                    <Loader2 className="animate-spin" size={32} color="white" />
                                    <p style={{ marginTop: 12, fontSize: 14 }}>Đang khởi động camera...</p>
                                </div>
                            </div>,
                            document.body
                        )
                    }>
                        <CameraWithOverlay
                            type={type}
                            templateImage={TEMPLATE_IMAGES[type]}
                            onCapture={handleCameraCapture}
                            onClose={handleCameraClose}
                        />
                    </Suspense>
                )}

                {/* Image editor modal */}
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

                {/* Full preview modal */}
                {showFullPreview && preview && (
                    <div className="full-preview-overlay" onClick={() => setShowFullPreview(false)} role="dialog" aria-modal="true">
                        <div className="full-preview-content" onClick={e => e.stopPropagation()}>
                            <div className="full-preview-header">
                                <span>{labels[type]} — kiểm tra ảnh</span>
                                <button type="button" className="full-preview-close" onClick={() => setShowFullPreview(false)} aria-label="Đóng">
                                    <X size={22} />
                                </button>
                            </div>
                            <img src={preview} alt="Full Preview" className="full-preview-img" />
                            <div className="full-preview-checklist">
                                <p className="checklist-title">✅ Kiểm tra trước khi nộp:</p>
                                {type !== 'photo_3x4' ? (
                                    <ul>
                                        <li>Đúng mặt ({type === 'cccd_front' ? 'mặt có ảnh & số CCCD' : 'mặt có mã QR'})?</li>
                                        <li>Nhìn rõ 4 góc CCCD?</li>
                                        <li>Chữ số CCCD đọc được không?</li>
                                        <li>Ảnh không bị mờ, tối hay chói?</li>
                                    </ul>
                                ) : (
                                    <ul>
                                        <li>Phông nền trắng/sáng?</li>
                                        <li>Khuôn mặt rõ, nhìn thẳng?</li>
                                        <li>Không đeo kính màu?</li>
                                        <li>Ảnh trong 6 tháng gần nhất?</li>
                                    </ul>
                                )}
                            </div>
                            <div className="full-preview-actions">
                                <button type="button" className="btn-preview-retake" onClick={() => { setShowFullPreview(false); resetUpload(); }}>
                                    <RefreshCw size={15} /> Chụp lại
                                </button>
                                <button type="button" className="btn-preview-ok" onClick={() => setShowFullPreview(false)}>
                                    <CheckCircle size={15} /> Dùng ảnh này
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step guide modal */}
                {showStepGuide && (
                    <StepGuide type={type} onClose={() => setShowStepGuide(false)} />
                )}
            </div>
        </>
    );
}

CCCDUploader.propTypes = {
    type: PropTypes.oneOf(['cccd_front', 'cccd_back', 'photo_3x4']).isRequired,
    onUploadSuccess: PropTypes.func,
    onUploadError: PropTypes.func,
    existingImageUrl: PropTypes.string,
};
