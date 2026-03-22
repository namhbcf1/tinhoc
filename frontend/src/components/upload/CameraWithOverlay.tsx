import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Loader2 } from 'lucide-react';
import './CameraWithOverlay.css';

/**
 * Camera Component với Overlay khuôn chụp ảnh
 * Đơn giản: Chỉ có overlay và chức năng cắt ảnh theo khuôn
 */

import { getOverlayRatio } from './overlayUtils';

// Re-export for backward compatibility
export { getOverlayRatio };

/**
 * Crop ảnh từ video theo khuôn overlay
 * Tính toán chính xác dựa trên kích thước overlay thực tế hiển thị trên màn hình
 */
function cropFromVideo(video, ratio, overlayElement) {
    if (!video.videoWidth || !video.videoHeight) {
        throw new Error('Video not ready');
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;

    // Tính visible video rect do object-fit: cover
    const videoAspect = vw / vh;
    const containerAspect = cw / ch;

    let visibleX = 0;
    let visibleY = 0;
    let visibleW = vw;
    let visibleH = vh;

    if (videoAspect > containerAspect) {
        // Video rộng hơn container → crop hai bên
        visibleW = vh * containerAspect;
        visibleX = (vw - visibleW) / 2;
    } else {
        // Video cao hơn container → crop trên/dưới
        visibleH = vw / containerAspect;
        visibleY = (vh - visibleH) / 2;
    }

    // Lấy kích thước và vị trí overlay thực tế trên màn hình
    let overlayWidthPx, overlayHeightPx, overlayTopPx, overlayLeftPx;
    if (overlayElement) {
        const overlayRect = overlayElement.getBoundingClientRect();
        const containerRect = video.parentElement?.getBoundingClientRect();
        
        overlayWidthPx = overlayRect.width;
        overlayHeightPx = overlayRect.height;
        
        // Tính vị trí overlay relative to container (không phải viewport)
        if (containerRect) {
            overlayLeftPx = overlayRect.left - containerRect.left;
            overlayTopPx = overlayRect.top - containerRect.top;
        } else {
            // Fallback: giả định center nếu không có container
            overlayLeftPx = (cw - overlayWidthPx) / 2;
            overlayTopPx = (ch - overlayHeightPx) / 2;
        }
    } else {
        // Fallback: dùng ratio.w nếu không có overlay element
        // Nhưng cần điều chỉnh theo CSS thực tế (85% desktop, 98% mobile)
        const isMobile = window.innerWidth <= 768;
        const overlayWidthPercent = isMobile ? 0.98 : 0.85;
        overlayWidthPx = overlayWidthPercent * cw;
        overlayHeightPx = overlayWidthPx / ratio.aspect;
        
        // Fallback: giả định center
        overlayLeftPx = (cw - overlayWidthPx) / 2;
        overlayTopPx = (ch - overlayHeightPx) / 2;
    }

    // Tính scale factor: tỉ lệ giữa video thực tế và container hiển thị
    const scaleX = visibleW / cw;
    const scaleY = visibleH / ch;

    // Chuyển đổi kích thước overlay từ pixel màn hình sang pixel video
    const sw = Math.round(overlayWidthPx * scaleX);
    const sh = Math.round(overlayHeightPx * scaleY);

    // Đảm bảo aspect ratio chính xác
    const expectedSh = Math.round(sw / ratio.aspect);
    const finalSh = expectedSh;

    // Tính vị trí crop dựa trên vị trí overlay thực tế trên màn hình
    // Chuyển đổi vị trí overlay từ pixel màn hình sang pixel video
    const overlayXInVideo = Math.round(overlayLeftPx * scaleX);
    const overlayYInVideo = Math.round(overlayTopPx * scaleY);
    
    // Crop từ vị trí overlay thực tế, không phải center
    const sx = Math.round(visibleX + overlayXInVideo);
    const sy = Math.round(visibleY + overlayYInVideo);

    // Clamp để đảm bảo không vượt biên video
    const finalSx = Math.max(0, Math.min(sx, vw - sw));
    const finalSy = Math.max(0, Math.min(sy, vh - finalSh));
    const finalSw = Math.min(sw, vw - finalSx);
    const finalShClamped = Math.min(finalSh, vh - finalSy);

    // Validation: Đảm bảo kích thước tối thiểu
    const minSize = 200;
    if (finalSw < minSize || finalShClamped < minSize) {
        throw new Error('Kích thước ảnh quá nhỏ. Vui lòng chụp gần hơn.');
    }

    // Tạo canvas với kích thước crop (đảm bảo aspect ratio chính xác)
    const canvas = document.createElement('canvas');
    canvas.width = finalSw;
    canvas.height = finalShClamped;

    // Draw từ video stream với high quality
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        video,
        finalSx, finalSy, finalSw, finalShClamped,  // Source: crop từ video
        0, 0, finalSw, finalShClamped                // Destination: fill canvas
    );

    return canvas;
}

export default function CameraWithOverlay({
    type,
    templateImage,
    onCapture,
    onClose
}) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const overlayRef = useRef(null);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [templateLoaded, setTemplateLoaded] = useState(false);
    const [templateError, setTemplateError] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [videoReady, setVideoReady] = useState(false);

    // Ensure component is mounted before rendering portal
    useEffect(() => {
        setMounted(true);
        return () => {
            setMounted(false);
            stopCamera();
        };
    }, []);

    // Start camera on mount (after component is mounted)
    useEffect(() => {
        if (!mounted) return;
        
        let mountedFlag = true;
        
        const initCamera = async () => {
            try {
                await startCamera();
                if (mountedFlag) {
                    setVideoReady(true);
                }
            } catch (err) {
                if (mountedFlag) {
                    setError('Không thể khởi động camera: ' + (err.message || 'Unknown error'));
                }
            }
        };
        
        initCamera();

        return () => {
            mountedFlag = false;
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    // Load template image
    useEffect(() => {
        if (templateImage) {
            setTemplateLoaded(false);
            setTemplateError(false);

            const img = new Image();
            img.onload = () => {
                setTemplateLoaded(true);
                setTemplateError(false);
            };
            img.onerror = () => {
                setTemplateError(true);
                setTemplateLoaded(false);
            };
            img.src = templateImage;
        }
    }, [templateImage]);

    const startCamera = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Trình duyệt không hỗ trợ camera. Vui lòng sử dụng trình duyệt hiện đại như Chrome, Firefox, hoặc Safari.');
                return;
            }

            // Wait for video element to be available
            if (!videoRef.current) {
                // Retry after a short delay
                setTimeout(() => {
                    if (videoRef.current) {
                        startCamera();
                    } else {
                        setError('Video element không sẵn sàng. Vui lòng thử lại.');
                    }
                }, 100);
                return;
            }

            const constraints = {
                video: {
                    facingMode: 'environment', // Tất cả đều dùng camera sau
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for video to be ready
                await new Promise((resolve, reject) => {
                    if (!videoRef.current) {
                        reject(new Error('Video element not available'));
                        return;
                    }
                    
                    const video = videoRef.current;
                    const onLoadedMetadata = () => {
                        video.removeEventListener('loadedmetadata', onLoadedMetadata);
                        video.removeEventListener('error', onError);
                        resolve();
                    };
                    const onError = (err) => {
                        video.removeEventListener('loadedmetadata', onLoadedMetadata);
                        video.removeEventListener('error', onError);
                        reject(err);
                    };
                    
                    if (video.readyState >= 2) {
                        // Video already loaded
                        resolve();
                    } else {
                        video.addEventListener('loadedmetadata', onLoadedMetadata);
                        video.addEventListener('error', onError);
                        // Timeout after 5 seconds
                        setTimeout(() => {
                            video.removeEventListener('loadedmetadata', onLoadedMetadata);
                            video.removeEventListener('error', onError);
                            reject(new Error('Video load timeout'));
                        }, 5000);
                    }
                });
            }

            setError('');
            setVideoReady(true);
        } catch (err) {

            let errorMessage = 'Không thể truy cập camera. ';

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage += 'Vui lòng cho phép quyền truy cập camera trong cài đặt trình duyệt.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage += 'Không tìm thấy camera. Vui lòng kiểm tra kết nối camera.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage += 'Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng khác và thử lại.';
            } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
                errorMessage += 'Camera không hỗ trợ yêu cầu. Đang thử cài đặt thấp hơn...';
                // Try with lower constraints
                try {
                    const fallbackConstraints = {
                        video: {
                            facingMode: 'environment' // Tất cả đều dùng camera sau
                        }
                    };
                    const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        // Wait for video to be ready
                        await new Promise((resolve) => {
                            if (!videoRef.current) {
                                resolve();
                                return;
                            }
                            const video = videoRef.current;
                            if (video.readyState >= 2) {
                                resolve();
                            } else {
                                const onLoadedMetadata = () => {
                                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                                    resolve();
                                };
                                video.addEventListener('loadedmetadata', onLoadedMetadata);
                                setTimeout(() => {
                                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                                    resolve();
                                }, 3000);
                            }
                        });
                    }
                    setError('');
                    setVideoReady(true);
                    return;
                } catch (fallbackErr) {
                    errorMessage = 'Camera không tương thích. Vui lòng thử thiết bị khác.';
                }
            } else {
                errorMessage += 'Vui lòng thử lại hoặc làm mới trang.';
            }

            setError(errorMessage);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capturePhoto = async () => {
        const video = videoRef.current;
        if (!video) {
            setError('Video element không tồn tại. Vui lòng thử lại.');
            return;
        }
        
        if (!videoReady) {
            setError('Video chưa sẵn sàng. Vui lòng đợi một chút.');
            return;
        }
        
        if (!video.videoWidth || !video.videoHeight) {
            setError('Video chưa sẵn sàng. Vui lòng đợi một chút.');
            return;
        }
        
        if (!video.srcObject) {
            setError('Camera stream không tồn tại. Vui lòng thử lại.');
            return;
        }

        if (uploading) return; // Prevent multiple captures

        try {
            setUploading(true);
            setError('');
            
            const ratio = getOverlayRatio(type);
            const overlayElement = overlayRef.current;
            const canvas = cropFromVideo(video, ratio, overlayElement);

            // Convert canvas to blob and upload immediately
            canvas.toBlob(async (blob) => {
                if (blob && onCapture) {
                    try {
                        const file = new File([blob], `cccd-${type}-${Date.now()}.jpg`, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });

                        // Upload immediately
                        await onCapture(file);
                        stopCamera();
                    } catch (error) {
                        console.error('Upload error:', error);
                        setError('Lỗi khi upload ảnh. Vui lòng thử lại.');
                        setUploading(false);
                    }
                } else {
                    setUploading(false);
                }
            }, 'image/jpeg', 0.95);
        } catch (err) {
            console.error('Capture error:', err);
            setError(err.message || 'Lỗi khi chụp ảnh. Vui lòng thử lại.');
            setUploading(false);
        }
    };


    const currentRatio = getOverlayRatio(type);
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 768;
    const overlayWidth = `${Math.round(currentRatio.w * 100)}%`;
    const overlayTop = isMobileViewport ? '38%' : '50%';
    const overlayMaxHeight = isMobileViewport ? '52vh' : '72vh';
    const typeLabels = {
        cccd_front: 'CCCD mặt trước',
        cccd_back: 'CCCD mặt sau',
        photo_3x4: 'Ảnh 3x4'
    };

    // Early return if not mounted
    if (!mounted) {
        return null;
    }

    // Ensure document.body exists
    if (typeof document === 'undefined' || !document.body) {
        return null;
    }

    const modalContent = (
        <div className="camera-with-overlay">
            <div className="camera-header">
                <h3>Chụp {typeLabels[type] || type}</h3>
                <button className="camera-close-btn" onClick={() => {
                    stopCamera();
                    onClose();
                }}>
                    <X size={24} />
                </button>
            </div>

            <div className="camera-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video"
                    onLoadedMetadata={() => {
                        if (videoRef.current) {
                            setVideoReady(true);
                        }
                    }}
                    onError={(e) => {
                        console.error('Video element error:', e);
                        setError('Lỗi khi tải video stream. Vui lòng thử lại.');
                    }}
                />

                {/* Overlay khuôn chụp ảnh - Căn giữa hoàn hảo */}
                <div
                    ref={overlayRef}
                    className="camera-overlay-template"
                    style={{
                        aspectRatio: `${currentRatio.aspect} / 1`,
                        '--overlay-width': overlayWidth,
                        '--overlay-top': overlayTop,
                        '--overlay-max-height': overlayMaxHeight,
                    }}
                    data-overlay-width={currentRatio.w}
                >
                    {templateImage && (
                        <img
                            src={templateImage}
                            alt="Template mẫu"
                            className={`template-overlay-image ${templateLoaded ? 'loaded' : ''} ${templateError ? 'error' : ''}`}
                            onLoad={() => {
                                setTemplateLoaded(true);
                                setTemplateError(false);
                            }}
                            onError={(e) => {
                                e.target.onerror = null;
                                setTemplateError(true);
                                setTemplateLoaded(false);
                            }}
                        />
                    )}
                    <div className="template-overlay-guide">
                        <p>📷 {type === 'photo_3x4' ? 'Đặt khuôn mặt vào khung' : 'Đặt CCCD vào khung này'}</p>
                        <p className="guide-subtitle">Giữ điện thoại ổn định</p>
                    </div>
                    {!templateLoaded && !templateError && templateImage && (
                        <div className="template-loading">
                            <div className="template-loading-spinner"></div>
                            <p>Đang tải mẫu...</p>
                        </div>
                    )}
                </div>

                {/* Nút chụp ngay dưới overlay - chỉ hiện trên mobile */}
                <button
                    className="camera-capture-btn-inline"
                    onClick={capturePhoto}
                    title="Chụp ảnh"
                    aria-label="Chụp ảnh"
                    disabled={uploading}
                >
                    {uploading ? (
                        <Loader2 className="animate-spin" size={48} />
                    ) : (
                        <Camera size={48} />
                    )}
                </button>
            </div>

            {error && (
                <div className="camera-error">
                    {error}
                </div>
            )}

            {/* Controls ở dưới cùng - chỉ hiện trên desktop */}
            <div className="camera-controls">
                <button
                    className="camera-capture-btn"
                    onClick={capturePhoto}
                    title="Chụp ảnh"
                    aria-label="Chụp ảnh"
                    disabled={uploading}
                >
                    {uploading ? (
                        <Loader2 className="animate-spin" size={48} />
                    ) : (
                        <Camera size={48} />
                    )}
                </button>
            </div>
        </div>
    );

    // Render modal directly to body using portal to avoid parent container constraints
    // Only render portal after component is mounted and document.body exists
    try {
        return createPortal(modalContent, document.body);
    } catch (err) {
        // Fallback: render directly (may have layout issues but at least works)
        return modalContent;
    }
}
