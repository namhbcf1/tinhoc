import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical, X, Check, RotateCcw } from 'lucide-react';
import { getOverlayBox } from './overlayUtils';
import { detectDocumentAutoFitBox } from './documentAutoFit';
import { validatePortraitPreviewCanvas } from './portrait-photo-validation';
import './ImageEditorMobile.css';

function getIntrinsicImageSize(img) {
    return {
        width: img?.naturalWidth || img?.width || 1,
        height: img?.naturalHeight || img?.height || 1,
    };
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

/**
 * Mobile-only ImageEditor component
 * Fullscreen native-like experience with fixed controls at bottom
 */
export default function ImageEditorMobile({
    imageFile,
    type,
    templateImage,
    onConfirm,
    onCancel
}) {
    const isPortraitPhoto = type === 'photo_3x4';
    const requiresDocumentDetection = type === 'cccd_front' || type === 'cccd_back';
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    
    const [scale, setScale] = useState(1);
    const [translateX, setTranslateX] = useState(0);
    const [translateY, setTranslateY] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);
    const [documentCheckState, setDocumentCheckState] = useState(
        requiresDocumentDetection ? 'checking' : 'detected'
    );
    const [photoValidation, setPhotoValidation] = useState(() => ({
        isValid: !isPortraitPhoto,
        blockingReasons: [],
        warnings: [],
        metrics: null,
        checking: isPortraitPhoto,
    }));
    
    // Touch gesture state - use refs to avoid dependency issues
    const [isDragging, setIsDragging] = useState(false);
    const [lastTouch, setLastTouch] = useState(null);
    const [initialPinchDistance, setInitialPinchDistance] = useState(null);
    const [initialScale, setInitialScale] = useState(1);
    
    // Refs for touch state to avoid stale closures
    const isDraggingRef = useRef(false);
    const lastTouchRef = useRef(null);
    const initialPinchDistanceRef = useRef(null);
    const initialScaleRef = useRef(1);
    const scaleRef = useRef(1);
    const translateXRef = useRef(0);
    const translateYRef = useRef(0);
    const initialTransformRef = useRef({ scale: 1, tx: 0, ty: 0 });

    const getBaseDimsAfterRotation = useCallback(() => {
        const img = imageRef.current;
        if (!img) return { baseW: 1, baseH: 1 };
        const intrinsic = getIntrinsicImageSize(img);
        // With 90/270, the axis-aligned extents swap.
        if (rotation === 90 || rotation === 270) return { baseW: intrinsic.height, baseH: intrinsic.width };
        return { baseW: intrinsic.width, baseH: intrinsic.height };
    }, [rotation]);

    const getOverlayRect = useCallback(() => {
        const container = containerRef.current;
        if (!container) return null;
        const { width: cw, height: ch } = container.getBoundingClientRect();
        const overlay = getOverlayBox(type, cw, ch, {
            maxHeightRatio: 0.88,
            centerYOffset: type === 'photo_3x4' ? -0.05 : -0.04,
        });
        const ow = overlay.overlayWidth;
        const oh = overlay.overlayHeight;
        const ox = overlay.overlayX;
        const oy = overlay.overlayY;
        return { cw, ch, ox, oy, ow, oh };
    }, [type]);

    const computeCoverScaleForOverlay = useCallback(() => {
        const overlay = getOverlayRect();
        const { baseW, baseH } = getBaseDimsAfterRotation();
        if (!overlay) return 1;
        // Minimum scale so the (rotated) image fully covers the overlay rect.
        const s = Math.max(overlay.ow / baseW, overlay.oh / baseH);
        // small epsilon to avoid rounding gaps
        return s * 1.002;
    }, [getOverlayRect, getBaseDimsAfterRotation]);

    const clampTranslateToCoverOverlay = useCallback((nextScale, nextTx, nextTy) => {
        const overlay = getOverlayRect();
        const { baseW, baseH } = getBaseDimsAfterRotation();
        if (!overlay) return { tx: nextTx, ty: nextTy };

        const effectiveW = baseW * nextScale;
        const effectiveH = baseH * nextScale;

        const overlayLeft = overlay.ox;
        const overlayRight = overlay.ox + overlay.ow;
        const overlayTop = overlay.oy;
        const overlayBottom = overlay.oy + overlay.oh;

        // image rect is centered at (cw/2 + tx, ch/2 + ty)
        const upperTx = overlayLeft - overlay.cw / 2 + effectiveW / 2;
        const lowerTx = overlayRight - overlay.cw / 2 - effectiveW / 2;
        const upperTy = overlayTop - overlay.ch / 2 + effectiveH / 2;
        const lowerTy = overlayBottom - overlay.ch / 2 - effectiveH / 2;

        // If the image is smaller than overlay in any direction, don't clamp (caller should scale up first)
        let tx = nextTx;
        let ty = nextTy;
        if (lowerTx <= upperTx) tx = Math.max(lowerTx, Math.min(upperTx, tx));
        if (lowerTy <= upperTy) ty = Math.max(lowerTy, Math.min(upperTy, ty));

        return { tx, ty };
    }, [getOverlayRect, getBaseDimsAfterRotation]);

    const computeInitialTransform = useCallback(async (img) => {
        const overlay = getOverlayRect();
        if (!overlay) {
            return { scale: 1, tx: 0, ty: 0, detected: false };
        }

        let nextScale = computeCoverScaleForOverlay();
        let nextTx = 0;
        let nextTy = 0;
        let detected = false;

        const detectedBox = await detectDocumentAutoFitBox(img, type);
        if (detectedBox) {
            detected = true;
            const detectedScale = Math.max(
                overlay.ow / detectedBox.width,
                overlay.oh / detectedBox.height
            ) * 1.02;

            nextScale = Math.max(nextScale, detectedScale);
            const intrinsic = getIntrinsicImageSize(img);
            nextTx = (intrinsic.width / 2 - (detectedBox.x + detectedBox.width / 2)) * nextScale;
            nextTy = (intrinsic.height / 2 - (detectedBox.y + detectedBox.height / 2)) * nextScale;
        }

        const clamped = clampTranslateToCoverOverlay(nextScale, nextTx, nextTy);
        return {
            scale: nextScale,
            tx: clamped.tx,
            ty: clamped.ty,
            detected,
        };
    }, [clampTranslateToCoverOverlay, computeCoverScaleForOverlay, getOverlayRect, type]);

    const buildPortraitPreviewCanvas = useCallback(() => {
        const img = imageRef.current;
        const overlay = getOverlayRect();
        if (!img || !overlay) return null;

        const intrinsic = getIntrinsicImageSize(img);
        let imgWidth = intrinsic.width;
        let imgHeight = intrinsic.height;
        if (rotation === 90 || rotation === 270) {
            [imgWidth, imgHeight] = [imgHeight, imgWidth];
        }

        const finalScale = Math.max(scale, computeCoverScaleForOverlay());
        const clamped = clampTranslateToCoverOverlay(finalScale, translateX, translateY);
        const previewScale = Math.max(2, Math.min(4, Math.ceil(480 / Math.max(overlay.oh, 1))));
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = Math.max(360, Math.round(overlay.ow * previewScale));
        previewCanvas.height = Math.max(480, Math.round(overlay.oh * previewScale));

        const previewCtx = previewCanvas.getContext('2d');
        if (!previewCtx) return null;

        const rad = (rotation * Math.PI) / 180;
        const drawWidth = imgWidth * finalScale * previewScale;
        const drawHeight = imgHeight * finalScale * previewScale;

        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.save();
        previewCtx.translate(
            previewCanvas.width / 2 + clamped.tx * previewScale,
            previewCanvas.height / 2 + clamped.ty * previewScale
        );
        previewCtx.rotate(rad);
        previewCtx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
        previewCtx.imageSmoothingEnabled = true;
        previewCtx.imageSmoothingQuality = 'high';
        previewCtx.drawImage(
            img,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
        );
        previewCtx.restore();

        return previewCanvas;
    }, [
        clampTranslateToCoverOverlay,
        computeCoverScaleForOverlay,
        flipHorizontal,
        flipVertical,
        getOverlayRect,
        rotation,
        scale,
        translateX,
        translateY,
    ]);
    
    // Sync refs with state
    useEffect(() => {
        isDraggingRef.current = isDragging;
    }, [isDragging]);
    
    useEffect(() => {
        lastTouchRef.current = lastTouch;
    }, [lastTouch]);
    
    useEffect(() => {
        initialPinchDistanceRef.current = initialPinchDistance;
    }, [initialPinchDistance]);
    
    useEffect(() => {
        initialScaleRef.current = initialScale;
    }, [initialScale]);
    
    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);
    
    useEffect(() => {
        translateXRef.current = translateX;
    }, [translateX]);
    
    useEffect(() => {
        translateYRef.current = translateY;
    }, [translateY]);

    // Load image
    useEffect(() => {
        if (!imageFile) return;
        let cancelled = false;

        const img = new Image();
        img.onload = () => {
            if (cancelled) return;
            imageRef.current = img;
            setDocumentCheckState(requiresDocumentDetection ? 'checking' : 'detected');

            const initializeTransform = async () => {
                const initialTransform = await computeInitialTransform(img);
                if (cancelled) return;

                setDocumentCheckState(
                    requiresDocumentDetection
                        ? (initialTransform.detected ? 'detected' : 'manual')
                        : 'detected'
                );
                initialTransformRef.current = initialTransform;
                setTranslateX(initialTransform.tx);
                setTranslateY(initialTransform.ty);
                translateXRef.current = initialTransform.tx;
                translateYRef.current = initialTransform.ty;
                setRotation(0);
                setFlipHorizontal(false);
                setFlipVertical(false);
                setScale(initialTransform.scale);
                scaleRef.current = initialTransform.scale;

                setTimeout(() => {
                    if (!cancelled) {
                        drawImage();
                    }
                }, 100);
            };

            void initializeTransform();
        };
        img.onerror = () => {
            console.error('Failed to load image');
        };
        img.src = URL.createObjectURL(imageFile);

        return () => {
            cancelled = true;
            if (img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        };
    }, [computeInitialTransform, imageFile, requiresDocumentDetection]);

    useEffect(() => {
        if (!isPortraitPhoto) {
            setPhotoValidation({
                isValid: true,
                blockingReasons: [],
                warnings: [],
                metrics: null,
                checking: false,
            });
            return;
        }

        if (!imageRef.current || !containerRef.current) {
            setPhotoValidation((prev) => ({
                ...prev,
                isValid: false,
                checking: true,
            }));
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            const previewCanvas = buildPortraitPreviewCanvas();
            if (!previewCanvas) return;

            setPhotoValidation((prev) => ({
                ...prev,
                checking: true,
            }));

            try {
                const result = await validatePortraitPreviewCanvas(previewCanvas, { stage: 'editor' });
                if (!cancelled) {
                    setPhotoValidation({
                        ...result,
                        checking: false,
                    });
                }
            } catch {
                if (!cancelled) {
                    setPhotoValidation({
                        isValid: false,
                        blockingReasons: ['Không thể kiểm tra ảnh 3x4 này. Vui lòng chọn ảnh nền xanh rõ hơn.'],
                        warnings: [],
                        metrics: null,
                        checking: false,
                    });
                }
            }
        }, 120);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [
        buildPortraitPreviewCanvas,
        imageFile,
        isPortraitPhoto,
        scale,
        translateX,
        translateY,
        rotation,
        flipHorizontal,
        flipVertical,
    ]);

    // Draw image with transformations (mobile: canvas = container size, no scroll)
    const drawImage = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${containerHeight}px`;
        canvas.width = Math.round(containerWidth * dpr);
        canvas.height = Math.round(containerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear canvas
        ctx.clearRect(0, 0, containerWidth, containerHeight);

        // Center point of container (in CSS pixels)
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        // Save context
        ctx.save();

        // Translation is in container coordinates (stable regardless of rotation)
        ctx.translate(centerX + translateX, centerY + translateY);

        const rad = (rotation * Math.PI) / 180;
        ctx.rotate(rad);
        ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);

        // Draw original image scaled (rotation handled by ctx.rotate)
        const intrinsic = getIntrinsicImageSize(img);
        const drawW = intrinsic.width * scale;
        const drawH = intrinsic.height * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            img,
            -drawW / 2,
            -drawH / 2,
            drawW,
            drawH
        );

        // Restore context
        ctx.restore();

        // Draw overlay template guide
        drawOverlay(ctx, containerWidth, containerHeight);
    }, [scale, translateX, translateY, rotation, flipHorizontal, flipVertical, type]);

    // Draw overlay template guide
    const drawOverlay = (ctx, canvasWidth, canvasHeight) => {
        const overlay = getOverlayRect();
        if (!overlay) return;
        const overlayWidth = overlay.ow;
        const overlayHeight = overlay.oh;
        const overlayX = overlay.ox;
        const overlayY = overlay.oy;

        // Draw dark overlay (outside crop area) - vùng ngoài mờ
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        
        // Draw 4 rectangles around the crop area
        // Top
        ctx.fillRect(0, 0, canvasWidth, overlayY);
        // Bottom
        ctx.fillRect(0, overlayY + overlayHeight, canvasWidth, canvasHeight - (overlayY + overlayHeight));
        // Left
        ctx.fillRect(0, overlayY, overlayX, overlayHeight);
        // Right
        ctx.fillRect(overlayX + overlayWidth, overlayY, canvasWidth - (overlayX + overlayWidth), overlayHeight);

        // Draw border around crop area (vùng trong sáng)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 3;
        ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);

        // Draw corner guides
        const cornerSize = 20;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 3;
        
        // Top-left
        ctx.beginPath();
        ctx.moveTo(overlayX, overlayY + cornerSize);
        ctx.lineTo(overlayX, overlayY);
        ctx.lineTo(overlayX + cornerSize, overlayY);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(overlayX + overlayWidth - cornerSize, overlayY);
        ctx.lineTo(overlayX + overlayWidth, overlayY);
        ctx.lineTo(overlayX + overlayWidth, overlayY + cornerSize);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(overlayX, overlayY + overlayHeight - cornerSize);
        ctx.lineTo(overlayX, overlayY + overlayHeight);
        ctx.lineTo(overlayX + cornerSize, overlayY + overlayHeight);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(overlayX + overlayWidth - cornerSize, overlayY + overlayHeight);
        ctx.lineTo(overlayX + overlayWidth, overlayY + overlayHeight);
        ctx.lineTo(overlayX + overlayWidth, overlayY + overlayHeight - cornerSize);
        ctx.stroke();

        if (type === 'photo_3x4') {
            const centerLineX = overlayX + overlayWidth / 2;
            const headGuideY = overlayY + overlayHeight * 0.12;
            const shoulderGuideY = overlayY + overlayHeight * 0.62;

            ctx.save();
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = 'rgba(167, 243, 208, 0.95)';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(centerLineX, overlayY + 10);
            ctx.lineTo(centerLineX, overlayY + overlayHeight - 10);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
            ctx.beginPath();
            ctx.moveTo(overlayX + 12, headGuideY);
            ctx.lineTo(overlayX + overlayWidth - 12, headGuideY);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(253, 224, 71, 0.9)';
            ctx.beginPath();
            ctx.moveTo(overlayX + 18, shoulderGuideY);
            ctx.lineTo(overlayX + overlayWidth - 18, shoulderGuideY);
            ctx.stroke();
            ctx.restore();
        }
    };

    // Redraw on state changes
    useEffect(() => {
        drawImage();
    }, [drawImage]);

    useEffect(() => {
        const handleResize = () => {
            drawImage();
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        window.visualViewport?.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            window.visualViewport?.removeEventListener('resize', handleResize);
        };
    }, [drawImage]);

    // Zoom in/out
    const handleZoom = (delta) => {
        setScale((prev) => {
            const minCover = computeCoverScaleForOverlay();
            const next = Math.max(minCover, Math.min(5, prev + delta));
            scaleRef.current = next;
            const { tx, ty } = clampTranslateToCoverOverlay(next, translateXRef.current, translateYRef.current);
            translateXRef.current = tx;
            translateYRef.current = ty;
            setTranslateX(tx);
            setTranslateY(ty);
            return next;
        });
    };

    // Handle rotate
    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
        // After rotation, keep the preview in a valid crop state immediately.
        setTimeout(() => {
            const s = computeCoverScaleForOverlay();
            setScale(s);
            scaleRef.current = s;
            const { tx, ty } = clampTranslateToCoverOverlay(s, 0, 0);
            translateXRef.current = tx;
            translateYRef.current = ty;
            setTranslateX(tx);
            setTranslateY(ty);
        }, 0);
    };

    // Handle flip horizontal
    const handleFlipHorizontal = () => {
        setFlipHorizontal((prev) => !prev);
    };

    // Handle flip vertical
    const handleFlipVertical = () => {
        setFlipVertical((prev) => !prev);
    };

    // Reset transformations
    const handleReset = () => {
        const initialTransform = initialTransformRef.current;
        setScale(initialTransform.scale);
        scaleRef.current = initialTransform.scale;
        setTranslateX(initialTransform.tx);
        setTranslateY(initialTransform.ty);
        translateXRef.current = initialTransform.tx;
        translateYRef.current = initialTransform.ty;
        setRotation(0);
        setFlipHorizontal(false);
        setFlipVertical(false);
    };

    // Mouse drag handlers (for desktop testing on mobile)
    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        isDraggingRef.current = true;
        lastTouchRef.current = { x: e.clientX, y: e.clientY };
        setIsDragging(true);
        setLastTouch({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current || !lastTouchRef.current) return;
        
        const deltaX = e.clientX - lastTouchRef.current.x;
        const deltaY = e.clientY - lastTouchRef.current.y;
        
        const clamped = clampTranslateToCoverOverlay(
            scaleRef.current,
            translateXRef.current + deltaX,
            translateYRef.current + deltaY
        );
        const newTranslateX = clamped.tx;
        const newTranslateY = clamped.ty;
        
        translateXRef.current = newTranslateX;
        translateYRef.current = newTranslateY;
        setTranslateX(newTranslateX);
        setTranslateY(newTranslateY);
        
        lastTouchRef.current = { x: e.clientX, y: e.clientY };
        setLastTouch({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        lastTouchRef.current = null;
        setIsDragging(false);
        setLastTouch(null);
    };

    // Register touch event listeners with passive: false to allow preventDefault
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const getTouchDistance = (touches) => {
            if (touches.length < 2) return null;
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const touchStartHandler = (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                isDraggingRef.current = true;
                lastTouchRef.current = touch;
                setIsDragging(true);
                setLastTouch(touch);
            } else if (e.touches.length === 2) {
                const distance = getTouchDistance(e.touches);
                if (distance) {
                    initialPinchDistanceRef.current = distance;
                    initialScaleRef.current = scaleRef.current;
                    setInitialPinchDistance(distance);
                    setInitialScale(scaleRef.current);
                }
            }
        };

        const touchMoveHandler = (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && isDraggingRef.current && lastTouchRef.current) {
                const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
                const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
                
                let newTranslateX = translateXRef.current + deltaX;
                let newTranslateY = translateYRef.current + deltaY;

                const clamped = clampTranslateToCoverOverlay(scaleRef.current, newTranslateX, newTranslateY);
                newTranslateX = clamped.tx;
                newTranslateY = clamped.ty;
                
                translateXRef.current = newTranslateX;
                translateYRef.current = newTranslateY;
                setTranslateX(newTranslateX);
                setTranslateY(newTranslateY);
                
                const touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                lastTouchRef.current = touch;
                setLastTouch(touch);
            } else if (e.touches.length === 2 && initialPinchDistanceRef.current) {
                const distance = getTouchDistance(e.touches);
                if (distance && initialPinchDistanceRef.current) {
                    const scaleChange = distance / initialPinchDistanceRef.current;
                    const minCover = computeCoverScaleForOverlay();
                    const newScale = Math.max(minCover, Math.min(5, initialScaleRef.current * scaleChange));
                    scaleRef.current = newScale;
                    const { tx, ty } = clampTranslateToCoverOverlay(newScale, translateXRef.current, translateYRef.current);
                    translateXRef.current = tx;
                    translateYRef.current = ty;
                    setTranslateX(tx);
                    setTranslateY(ty);
                    setScale(newScale);
                }
            }
        };

        const touchEndHandler = (e) => {
            if (e.touches.length === 0) {
                isDraggingRef.current = false;
                lastTouchRef.current = null;
                initialPinchDistanceRef.current = null;
                setIsDragging(false);
                setLastTouch(null);
                setInitialPinchDistance(null);
            } else if (e.touches.length === 1) {
                initialPinchDistanceRef.current = null;
                setInitialPinchDistance(null);
            }
        };

        const touchCancelHandler = () => {
            isDraggingRef.current = false;
            lastTouchRef.current = null;
            initialPinchDistanceRef.current = null;
            setIsDragging(false);
            setLastTouch(null);
            setInitialPinchDistance(null);
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
    }, []);

    // Confirm and crop
    const handleConfirm = async () => {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!img || !container) return;

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const overlay = getOverlayRect();
        if (!overlay) return;

        // Calculate overlay dimensions (same as displayed)
        const overlayWidth = overlay.ow;
        const overlayHeight = overlay.oh;
        const rad = (rotation * Math.PI) / 180;

        // Enforce: NO EMPTY AREA on confirm (auto cover + clamp)
        const minCover = computeCoverScaleForOverlay();
        let finalScale = scaleRef.current;
        if (finalScale < minCover) finalScale = minCover;

        const clamped = clampTranslateToCoverOverlay(finalScale, translateXRef.current, translateYRef.current);
        const finalTx = clamped.tx;
        const finalTy = clamped.ty;

        // Create a canvas to render the transformed image at high resolution
        const sourceToOverlayRatio = Math.min(
            (img.naturalWidth || img.width || 1) / Math.max(overlayWidth, 1),
            (img.naturalHeight || img.height || 1) / Math.max(overlayHeight, 1)
        );
        const qualityScale = Math.max(2, Math.min(6, Math.ceil(sourceToOverlayRatio)));
        const finalWidth = overlayWidth * qualityScale;
        const finalHeight = overlayHeight * qualityScale;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = finalWidth;
        tempCanvas.height = finalHeight;

        const centerX = tempCanvas.width / 2;
        const centerY = tempCanvas.height / 2;
        const scaleFactor = qualityScale; // finalWidth/overlayWidth

        const intrinsic = getIntrinsicImageSize(img);
        const drawW = intrinsic.width * finalScale * scaleFactor;
        const drawH = intrinsic.height * finalScale * scaleFactor;

        // translate in container coords -> overlay coords (overlay center == container center)
        const tx = finalTx * scaleFactor;
        const ty = finalTy * scaleFactor;

        tempCtx.save();
        tempCtx.translate(centerX + tx, centerY + ty);
        tempCtx.rotate(rad);
        tempCtx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(
            img,
            -drawW / 2,
            -drawH / 2,
            drawW,
            drawH
        );
        tempCtx.restore();

        const croppedFile = await canvasToJpegFile(
            tempCanvas,
            `cccd-${type}-${Date.now()}.jpg`,
            0.95,
        );
        onConfirm(croppedFile);
    };

    const typeLabels = {
        cccd_front: 'CCCD mặt trước',
        cccd_back: 'CCCD mặt sau',
        photo_3x4: 'Ảnh 3x4'
    };

    const portraitBlockingReason = isPortraitPhoto ? photoValidation.blockingReasons[0] : '';
    const canConfirm = isPortraitPhoto
        ? !photoValidation.checking
        : !documentCheckState || documentCheckState !== 'checking';
    const statusVariant = isPortraitPhoto
        ? (photoValidation.checking ? 'checking' : photoValidation.isValid ? 'detected' : 'manual')
        : documentCheckState;
    const statusBadgeText = isPortraitPhoto
        ? (photoValidation.checking ? 'Đang kiểm tra' : photoValidation.isValid ? 'Đạt chuẩn sơ bộ' : 'Chưa đạt')
        : (documentCheckState === 'detected' ? 'Auto-fit' : documentCheckState === 'checking' ? 'Đang đọc' : 'Chỉnh tay');
    const statusText = isPortraitPhoto
        ? (
            photoValidation.checking
                ? 'Đang kiểm tra nền xanh, độ rõ nét và bố cục đầu-vai.'
                : photoValidation.isValid
                    ? 'Ảnh đã đạt kiểm tra cơ bản. Kéo 1 ngón để di chuyển, chụm 2 ngón để zoom canh đầu-vai trong khung.'
                    : portraitBlockingReason
                        ? `${portraitBlockingReason} Bạn vẫn có thể kéo/chụm để căn lại rồi gửi AI thử chỉnh.`
                        : 'Ảnh chưa đạt yêu cầu. Kéo 1 ngón để di chuyển, chụm 2 ngón để zoom rồi căn lại trong khung.'
        )
        : !requiresDocumentDetection
            ? 'Căn ảnh chân dung trong khung 3x4'
            : documentCheckState === 'checking'
                ? 'Đang tự căn khung thông minh...'
                : documentCheckState === 'detected'
                    ? 'Đã tự căn gần đúng, kéo nhẹ để chỉnh lại nếu cần'
                    : 'Không nhận ra 4 góc rõ ràng, kéo và zoom để tự căn';
    const confirmButtonLabel = isPortraitPhoto && !photoValidation.checking && !photoValidation.isValid
        ? 'Thử AI chỉnh'
        : 'Xác nhận';

    return (
        <div className="image-editor-mobile-wrapper">
            <div className="image-editor-mobile-header">
                <h3>Chỉnh sửa {typeLabels[type] || type}</h3>
                <button type="button" className="image-editor-mobile-close" onClick={onCancel}>
                    <X size={24} />
                </button>
            </div>

            <div 
                ref={containerRef}
                className="image-editor-mobile-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <canvas ref={canvasRef} className="image-editor-mobile-canvas-element" />
            </div>

            <div className={`image-editor-mobile-status status-${statusVariant}`}>
                <span className="image-editor-mobile-status-badge">
                    {statusBadgeText}
                </span>
                <p>{statusText}</p>
            </div>

            <div className="image-editor-mobile-controls">
                <button
                    type="button"
                    className="image-editor-mobile-btn"
                    onClick={() => handleZoom(-0.2)}
                    title="Thu nhỏ"
                >
                    <ZoomOut size={24} />
                </button>
                <button
                    type="button"
                    className="image-editor-mobile-btn"
                    onClick={() => handleZoom(0.2)}
                    title="Phóng to"
                >
                    <ZoomIn size={24} />
                </button>
                <button
                    type="button"
                    className="image-editor-mobile-btn"
                    onClick={handleRotate}
                    title="Xoay"
                >
                    <RotateCw size={24} />
                </button>
                <button
                    type="button"
                    className={`image-editor-mobile-btn ${flipHorizontal ? 'active' : ''}`}
                    onClick={handleFlipHorizontal}
                    title="Lật ngang"
                >
                    <FlipHorizontal size={24} />
                </button>
                <button
                    type="button"
                    className={`image-editor-mobile-btn ${flipVertical ? 'active' : ''}`}
                    onClick={handleFlipVertical}
                    title="Lật dọc"
                >
                    <FlipVertical size={24} />
                </button>
                <button
                    type="button"
                    className="image-editor-mobile-btn"
                    onClick={handleReset}
                    title="Đặt lại"
                >
                    <RotateCcw size={24} />
                </button>
            </div>

            <div className="image-editor-mobile-actions">
                <button type="button" className="image-editor-mobile-action-cancel" onClick={onCancel}>
                    Hủy
                </button>
                <button type="button" className="image-editor-mobile-action-confirm" onClick={handleConfirm} disabled={!canConfirm}>
                    <Check size={18} />
                    {confirmButtonLabel}
                </button>
            </div>
        </div>
    );
}
