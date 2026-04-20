import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Loader2 } from 'lucide-react';
import './CameraWithOverlay.css';

/**
 * Camera Component với Overlay khuôn chụp ảnh
 * Đơn giản: Chỉ có overlay và chức năng cắt ảnh theo khuôn
 */

import { getOverlayRatio } from './overlayUtils';
import { detectDocumentFromImageData } from '../../utils/documentDetection';
import { detectPlatform } from '../../utils/deviceDetection';

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

    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 768;
    const capturePaddingScale = isMobileViewport ? 1.18 : 1.1;
    const paddedOverlayWidthPx = overlayWidthPx * capturePaddingScale;
    const paddedOverlayHeightPx = paddedOverlayWidthPx / ratio.aspect;
    const overlayCenterXPx = overlayLeftPx + overlayWidthPx / 2;
    const overlayCenterYPx = overlayTopPx + overlayHeightPx / 2;

    // Chuyển đổi kích thước overlay từ pixel màn hình sang pixel video
    const sw = Math.round(paddedOverlayWidthPx * scaleX);
    const sh = Math.round(paddedOverlayHeightPx * scaleY);

    // Đảm bảo aspect ratio chính xác
    const expectedSh = Math.round(sw / ratio.aspect);
    const finalSh = Math.max(expectedSh, sh);

    // Crop theo tâm khung nhưng lấy rộng hơn để editor/OCR vẫn còn ngữ cảnh quanh CCCD.
    const overlayCenterXInVideo = Math.round(visibleX + overlayCenterXPx * scaleX);
    const overlayCenterYInVideo = Math.round(visibleY + overlayCenterYPx * scaleY);
    const sx = Math.round(overlayCenterXInVideo - sw / 2);
    const sy = Math.round(overlayCenterYInVideo - finalSh / 2);

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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        video,
        finalSx, finalSy, finalSw, finalShClamped,  // Source: crop từ video
        0, 0, finalSw, finalShClamped                // Destination: fill canvas
    );

    return canvas;
}

async function canvasToJpegFile(canvas, fileName, quality = 0.95) {
    const blob = await new Promise((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/jpeg', quality);
    });

    if (blob) {
        return new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    }

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const response = await fetch(dataUrl);
    const fallbackBlob = await response.blob();
    return new File([fallbackBlob], fileName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
    });
}

function getOverlayRectInVideo(video, overlayElement, ratio) {
    if (!video?.videoWidth || !video?.videoHeight) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;
    const videoAspect = vw / vh;
    const containerAspect = cw / ch;

    let visibleX = 0;
    let visibleY = 0;
    let visibleW = vw;
    let visibleH = vh;

    if (videoAspect > containerAspect) {
        visibleW = vh * containerAspect;
        visibleX = (vw - visibleW) / 2;
    } else {
        visibleH = vw / containerAspect;
        visibleY = (vh - visibleH) / 2;
    }

    let overlayWidthPx;
    let overlayHeightPx;
    let overlayTopPx;
    let overlayLeftPx;

    if (overlayElement) {
        const overlayRect = overlayElement.getBoundingClientRect();
        const containerRect = video.parentElement?.getBoundingClientRect();
        overlayWidthPx = overlayRect.width;
        overlayHeightPx = overlayRect.height;

        if (containerRect) {
            overlayLeftPx = overlayRect.left - containerRect.left;
            overlayTopPx = overlayRect.top - containerRect.top;
        } else {
            overlayLeftPx = (cw - overlayWidthPx) / 2;
            overlayTopPx = (ch - overlayHeightPx) / 2;
        }
    } else {
        const isMobile = window.innerWidth <= 768;
        const overlayWidthPercent = isMobile ? 0.98 : 0.85;
        overlayWidthPx = overlayWidthPercent * cw;
        overlayHeightPx = overlayWidthPx / ratio.aspect;
        overlayLeftPx = (cw - overlayWidthPx) / 2;
        overlayTopPx = (ch - overlayHeightPx) / 2;
    }

    const scaleX = visibleW / cw;
    const scaleY = visibleH / ch;

    return {
        x: Math.round(visibleX + overlayLeftPx * scaleX),
        y: Math.round(visibleY + overlayTopPx * scaleY),
        width: Math.round(overlayWidthPx * scaleX),
        height: Math.round(overlayHeightPx * scaleY),
    };
}

function analyzeOverlayStats(ctx, rect) {
    const sampleX = Math.max(0, rect.x);
    const sampleY = Math.max(0, rect.y);
    const sampleW = Math.max(32, Math.min(ctx.canvas.width - sampleX, rect.width));
    const sampleH = Math.max(32, Math.min(ctx.canvas.height - sampleY, rect.height));
    const { data, width, height } = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);

    let totalBrightness = 0;
    let edgeAccumulator = 0;
    let pixels = 0;

    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const index = (y * width + x) * 4;
            const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
            const left = 0.299 * data[index - 4] + 0.587 * data[index - 3] + 0.114 * data[index - 2];
            const right = 0.299 * data[index + 4] + 0.587 * data[index + 5] + 0.114 * data[index + 6];
            const top = 0.299 * data[index - width * 4] + 0.587 * data[index - width * 4 + 1] + 0.114 * data[index - width * 4 + 2];
            const bottom = 0.299 * data[index + width * 4] + 0.587 * data[index + width * 4 + 1] + 0.114 * data[index + width * 4 + 2];
            totalBrightness += gray;
            edgeAccumulator += Math.abs(gray * 4 - left - right - top - bottom);
            pixels += 1;
        }
    }

    return {
        brightness: pixels > 0 ? totalBrightness / pixels : 0,
        sharpness: pixels > 0 ? edgeAccumulator / pixels : 0,
    };
}

function analyzeLiveFrame(video, overlayElement, ratio) {
    if (!video?.videoWidth || !video?.videoHeight) {
        return {
            mode: 'not-detected',
            ready: false,
            message: 'Dang mo camera...',
            subtitle: 'Cho video on dinh roi chup',
        };
    }

    const overlayRect = getOverlayRectInVideo(video, overlayElement, ratio);
    if (!overlayRect) {
        return {
            mode: 'not-detected',
            ready: false,
            message: 'Dat tron CCCD vao khung nay',
            subtitle: 'Giu dien thoai on dinh',
        };
    }

    const maxEdge = 960;
    const downscale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(240, Math.round(video.videoWidth * downscale));
    canvas.height = Math.max(180, Math.round(video.videoHeight * downscale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        return {
            mode: 'not-detected',
            ready: false,
            message: 'Khong the doc frame camera',
            subtitle: 'Thu lai trong giay lat',
        };
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const scaledOverlayRect = {
        x: Math.round(overlayRect.x * downscale),
        y: Math.round(overlayRect.y * downscale),
        width: Math.round(overlayRect.width * downscale),
        height: Math.round(overlayRect.height * downscale),
    };
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const detection = detectDocumentFromImageData(imageData, scaledOverlayRect);
    const stats = analyzeOverlayStats(ctx, scaledOverlayRect);

    if (stats.brightness < 48) {
        return {
            mode: 'partial',
            ready: false,
            message: 'Thieu sang, dua the ra noi sang hon',
            subtitle: 'Tranh bong den va loa chip',
        };
    }

    if (stats.sharpness < 6.2) {
        return {
            mode: 'partial',
            ready: false,
            message: 'Khung dang rung hoac mo',
            subtitle: 'Giu may yen them mot chut',
        };
    }

    if (detection?.detected && detection.confidence >= 0.78) {
        return {
            mode: 'detected',
            ready: true,
            message: 'Du khung, giu yen roi chup',
            subtitle: 'He thong da thay du 4 mep the',
        };
    }

    if (detection?.corners?.length === 4 || detection?.confidence >= 0.5) {
        return {
            mode: 'partial',
            ready: false,
            message: 'Can them de du 4 goc va giam nghieng',
            subtitle: 'Dat the gon trong khung trang',
        };
    }

    return {
        mode: 'not-detected',
        ready: false,
        message: 'Dat tron CCCD vao khung nay',
        subtitle: 'Giu may song song voi mat the',
    };
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
    const [captureAssist, setCaptureAssist] = useState({
        mode: 'not-detected',
        ready: false,
        message: 'Dat tron CCCD vao khung nay',
        subtitle: 'Giu dien thoai on dinh',
    });

    const buildConstraintCandidates = () => {
        const platform = detectPlatform();
        const sharedFallbacks = [
            { video: { facingMode: { ideal: 'environment' } } },
            { video: true },
        ];

        if (platform === 'ios') {
            return [
                {
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        aspectRatio: { ideal: 4 / 3 },
                    },
                },
                {
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                },
                ...sharedFallbacks,
            ];
        }

        return [
            {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 2560 },
                    height: { ideal: 1440 },
                    aspectRatio: { ideal: 16 / 9 },
                },
            },
            {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            },
            ...sharedFallbacks,
        ];
    };

    const bindStreamToVideo = async (stream) => {
        if (!videoRef.current) {
            throw new Error('Video element not available');
        }

        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute('muted', 'true');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        await new Promise((resolve, reject) => {
            const onLoadedMetadata = () => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('error', onError);
                resolve(null);
            };
            const onError = (err) => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('error', onError);
                reject(err);
            };

            if (video.readyState >= 2) {
                resolve(null);
                return;
            }

            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
            window.setTimeout(() => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.removeEventListener('error', onError);
                resolve(null);
            }, 5000);
        });

        try {
            await video.play();
        } catch {
            // iOS Safari can reject autoplay timing; metadata loaded is enough for manual capture flow.
        }
    };

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

    useEffect(() => {
        if (!mounted || !videoReady || uploading) return undefined;

        let cancelled = false;
        let timerId = null;
        const ratio = getOverlayRatio(type);

        const tick = () => {
            if (cancelled || !videoRef.current) return;
            try {
                const nextState = analyzeLiveFrame(videoRef.current, overlayRef.current, ratio);
                if (!cancelled) {
                    setCaptureAssist(nextState);
                }
            } catch {
                if (!cancelled) {
                    setCaptureAssist({
                        mode: 'not-detected',
                        ready: false,
                        message: 'Dat tron CCCD vao khung nay',
                        subtitle: 'Giu dien thoai on dinh',
                    });
                }
            }
            timerId = window.setTimeout(tick, 420);
        };

        timerId = window.setTimeout(tick, 200);
        return () => {
            cancelled = true;
            if (timerId) window.clearTimeout(timerId);
        };
    }, [mounted, type, uploading, videoReady]);

    const startCamera = async () => {
        try {
            stopCamera();
            setVideoReady(false);
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

            const candidates = buildConstraintCandidates();
            let stream = null;
            let lastError = null;

            for (const constraints of candidates) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                    break;
                } catch (candidateError) {
                    lastError = candidateError;
                }
            }

            if (!stream) {
                throw lastError || new Error('Camera constraints failed');
            }

            streamRef.current = stream;
            await bindStreamToVideo(stream);

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
                errorMessage += 'Camera không hỗ trợ cấu hình này trên thiết bị hiện tại.';
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
        if (videoRef.current) {
            videoRef.current.pause?.();
            videoRef.current.srcObject = null;
        }
        setVideoReady(false);
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

            if (!onCapture) {
                setUploading(false);
                return;
            }

            try {
                const file = await canvasToJpegFile(canvas, `cccd-${type}-${Date.now()}.jpg`, 0.95);
                await onCapture(file);
                stopCamera();
            } catch (error) {
                console.error('Upload error:', error);
                setError('Lỗi khi upload ảnh. Vui lòng thử lại.');
                setUploading(false);
            }
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
                    className={`camera-overlay-template ${captureAssist.mode}`}
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
                    <div className="template-overlay-guide" aria-live="polite">
                        <p>{captureAssist.message}</p>
                        <p className="guide-subtitle">{captureAssist.subtitle}</p>
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
                    className={`camera-capture-btn-inline ${captureAssist.ready ? 'enabled' : 'caution'}`}
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
                    className={`camera-capture-btn ${captureAssist.ready ? 'enabled' : 'caution'}`}
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
