import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical, X, Check, RotateCcw } from 'lucide-react';
import { getOverlayRatio } from './overlayUtils';
import './ImageEditorMobile.css';

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
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    
    const [scale, setScale] = useState(1);
    const [translateX, setTranslateX] = useState(0);
    const [translateY, setTranslateY] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);
    
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

    const getBaseDimsAfterRotation = useCallback(() => {
        const img = imageRef.current;
        if (!img) return { baseW: 1, baseH: 1 };
        // With 90/270, the axis-aligned extents swap.
        if (rotation === 90 || rotation === 270) return { baseW: img.height, baseH: img.width };
        return { baseW: img.width, baseH: img.height };
    }, [rotation]);

    const getOverlayRect = useCallback(() => {
        const container = containerRef.current;
        if (!container) return null;
        const { width: cw, height: ch } = container.getBoundingClientRect();
        const ratio = getOverlayRatio(type);
        const ow = cw * ratio.w;
        const oh = ow / ratio.aspect;
        const ox = (cw - ow) / 2;
        const oy = (ch - oh) / 2;
        return { cw, ch, ox, oy, ow, oh };
    }, [type]);

    const computeContainScale = useCallback(() => {
        const overlay = getOverlayRect();
        const { baseW, baseH } = getBaseDimsAfterRotation();
        if (!overlay) return 1;
        const scaleByWidth = (overlay.cw * 0.98) / baseW;
        const scaleByHeight = (overlay.ch * 0.98) / baseH;
        return Math.max(0.05, Math.min(scaleByWidth, scaleByHeight));
    }, [getOverlayRect, getBaseDimsAfterRotation]);

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

        const img = new Image();
        img.onload = () => {
            imageRef.current = img;

            // Reset transforms first
            setTranslateX(0);
            setTranslateY(0);
            translateXRef.current = 0;
            translateYRef.current = 0;
            setRotation(0);
            setFlipHorizontal(false);
            setFlipVertical(false);

            // Initial view on mobile: show full image (contain)
            const initialScale = computeContainScale();
            setScale(initialScale);
            scaleRef.current = initialScale;

            // Initial render
            setTimeout(() => drawImage(), 100);
        };
        img.onerror = () => {
            console.error('Failed to load image');
        };
        img.src = URL.createObjectURL(imageFile);

        return () => {
            if (img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        };
    }, [imageFile]);

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
        const drawW = img.width * scale;
        const drawH = img.height * scale;
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
        const ratio = getOverlayRatio(type);
        const overlayWidth = canvasWidth * ratio.w;
        const overlayHeight = overlayWidth / ratio.aspect;

        const overlayX = (canvasWidth - overlayWidth) / 2;
        const overlayY = (canvasHeight - overlayHeight) / 2;

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
    };

    // Redraw on state changes
    useEffect(() => {
        drawImage();
    }, [drawImage]);

    // Zoom in/out
    const handleZoom = (delta) => {
        setScale((prev) => {
            const next = Math.max(0.2, Math.min(5, prev + delta));
            scaleRef.current = next;
            // If we're already large enough to cover overlay, keep translate clamped to avoid nonsense.
            const minCover = computeCoverScaleForOverlay();
            if (next >= minCover) {
                const { tx, ty } = clampTranslateToCoverOverlay(next, translateXRef.current, translateYRef.current);
                translateXRef.current = tx;
                translateYRef.current = ty;
                setTranslateX(tx);
                setTranslateY(ty);
            }
            return next;
        });
    };

    // Handle rotate
    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
        // After rotation, reset to contain view (user expects to reframe)
        setTimeout(() => {
            const s = computeContainScale();
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
        const s = computeContainScale();
        setScale(s);
        scaleRef.current = s;
        setTranslateX(0);
        setTranslateY(0);
        translateXRef.current = 0;
        translateYRef.current = 0;
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
        
        const newTranslateX = translateXRef.current + deltaX;
        const newTranslateY = translateYRef.current + deltaY;
        
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
            if (isDraggingRef.current || initialPinchDistanceRef.current) {
                e.preventDefault();
            }
            
            if (e.touches.length === 1 && isDraggingRef.current && lastTouchRef.current) {
                const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
                const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
                
                let newTranslateX = translateXRef.current + deltaX;
                let newTranslateY = translateYRef.current + deltaY;

                // If we are in cover mode, clamp translate so overlay never shows empty area.
                const minCover = computeCoverScaleForOverlay();
                if (scaleRef.current >= minCover) {
                    const clamped = clampTranslateToCoverOverlay(scaleRef.current, newTranslateX, newTranslateY);
                    newTranslateX = clamped.tx;
                    newTranslateY = clamped.ty;
                }
                
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
                    const newScale = Math.max(0.2, Math.min(5, initialScaleRef.current * scaleChange));
                    scaleRef.current = newScale;
                    // If in cover mode, clamp translate too
                    const minCover = computeCoverScaleForOverlay();
                    if (newScale >= minCover) {
                        const { tx, ty } = clampTranslateToCoverOverlay(newScale, translateXRef.current, translateYRef.current);
                        translateXRef.current = tx;
                        translateYRef.current = ty;
                        setTranslateX(tx);
                        setTranslateY(ty);
                    }
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

        container.addEventListener('touchstart', touchStartHandler, { passive: false });
        container.addEventListener('touchmove', touchMoveHandler, { passive: false });
        container.addEventListener('touchend', touchEndHandler, { passive: false });

        return () => {
            container.removeEventListener('touchstart', touchStartHandler);
            container.removeEventListener('touchmove', touchMoveHandler);
            container.removeEventListener('touchend', touchEndHandler);
        };
    }, []);

    // Confirm and crop
    const handleConfirm = async () => {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!img || !container) return;

        const ratio = getOverlayRatio(type);
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        // Calculate overlay dimensions (same as displayed)
        const overlayWidth = containerWidth * ratio.w;
        const overlayHeight = overlayWidth / ratio.aspect;
        const rad = (rotation * Math.PI) / 180;

        // Enforce: NO EMPTY AREA on confirm (auto cover + clamp)
        const minCover = computeCoverScaleForOverlay();
        let finalScale = scaleRef.current;
        if (finalScale < minCover) finalScale = minCover;

        const clamped = clampTranslateToCoverOverlay(finalScale, translateXRef.current, translateYRef.current);
        const finalTx = clamped.tx;
        const finalTy = clamped.ty;

        // Create a canvas to render the transformed image at high resolution
        const qualityScale = 2;
        const finalWidth = overlayWidth * qualityScale;
        const finalHeight = overlayHeight * qualityScale;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = finalWidth;
        tempCanvas.height = finalHeight;

        const centerX = tempCanvas.width / 2;
        const centerY = tempCanvas.height / 2;
        const scaleFactor = qualityScale; // finalWidth/overlayWidth

        const drawW = img.width * finalScale * scaleFactor;
        const drawH = img.height * finalScale * scaleFactor;

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

        tempCanvas.toBlob((blob) => {
            if (blob) {
                const croppedFile = new File(
                    [blob],
                    `cccd-${type}-${Date.now()}.jpg`,
                    { type: 'image/jpeg', lastModified: Date.now() }
                );
                onConfirm(croppedFile);
            }
        }, 'image/jpeg', 0.95);
    };

    const typeLabels = {
        cccd_front: 'CCCD mặt trước',
        cccd_back: 'CCCD mặt sau',
        photo_3x4: 'Ảnh 3x4'
    };

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
                <button type="button" className="image-editor-mobile-action-confirm" onClick={handleConfirm}>
                    <Check size={18} />
                    Xác nhận
                </button>
            </div>
        </div>
    );
}

