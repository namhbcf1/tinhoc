import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical, X, Check, RotateCcw, Loader2 } from 'lucide-react';
import { getOverlayRatio } from './overlayUtils';
import { useIsMobile } from '../../utils/deviceDetection';
import './ImageEditor.css';

const ImageEditorMobile = lazy(() => import('./ImageEditorMobile'));

export default function ImageEditor({
    imageFile,
    type,
    templateImage,
    onConfirm,
    onCancel
}) {
    const isMobile = useIsMobile();
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
            
            // Calculate initial scale to fit image in container
            const container = containerRef.current;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const containerWidth = containerRect.width;
                const containerHeight = containerRect.height;
                
                // Calculate scale to fit image in container (show full image)
                // Use smaller scale to ensure image fits both width and height
                const scaleByWidth = containerWidth * 0.95 / img.width;
                const scaleByHeight = containerHeight * 0.95 / img.height;
                // Use the smaller scale to ensure image fits completely
                const initialScale = Math.min(scaleByWidth, scaleByHeight);
                
                setScale(initialScale);
                scaleRef.current = initialScale;
            } else {
                setScale(1);
                scaleRef.current = 1;
            }
            
            // Reset transformations
            setTranslateX(0);
            setTranslateY(0);
            translateXRef.current = 0;
            translateYRef.current = 0;
            setRotation(0);
            setFlipHorizontal(false);
            setFlipVertical(false);
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

    // Helper function để tính overlay dimensions và position - DÙNG CHUNG cho drawOverlay và handleConfirm
    const calculateOverlay = useCallback((containerWidth, containerHeight, canvasWidth, canvasHeight) => {
        const ratio = getOverlayRatio(type);
        
        // Tất cả đều fit by height để to hơn và dễ nhìn
        let overlayWidth, overlayHeight;
        overlayHeight = containerHeight * 0.98; // 98% of container height
        overlayWidth = overlayHeight * ratio.aspect;
        // If too wide, fit by width instead
        if (overlayWidth > containerWidth * 0.98) {
            overlayWidth = containerWidth * 0.98;
            overlayHeight = overlayWidth / ratio.aspect;
        }

        // Center overlay horizontally, align to top for better visibility
        const overlayX = (canvasWidth - overlayWidth) / 2;
        const overlayY = (canvasHeight - overlayHeight) * 0.05; // 5% from top
        
        return { overlayWidth, overlayHeight, overlayX, overlayY };
    }, [type]);

    // Helper function để tính minimum scale để ảnh phủ toàn bộ overlay
    const computeCoverScaleForOverlay = useCallback((overlayWidth, overlayHeight, imgWidth, imgHeight) => {
        // Minimum scale so the image fully covers the overlay rect
        const s = Math.max(overlayWidth / imgWidth, overlayHeight / imgHeight);
        // small epsilon to avoid rounding gaps
        return s * 1.002;
    }, []);

    // Helper function để clamp translation để đảm bảo overlay luôn được phủ đầy
    const clampTranslateToCoverOverlay = useCallback((nextScale, nextTx, nextTy, overlayX, overlayY, overlayWidth, overlayHeight, canvasWidth, canvasHeight, imgWidth, imgHeight) => {
        const effectiveW = imgWidth * nextScale;
        const effectiveH = imgHeight * nextScale;

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        const overlayLeft = overlayX;
        const overlayRight = overlayX + overlayWidth;
        const overlayTop = overlayY;
        const overlayBottom = overlayY + overlayHeight;

        // image rect is centered at (centerX + tx, centerY + ty)
        const upperTx = overlayLeft - centerX + effectiveW / 2;
        const lowerTx = overlayRight - centerX - effectiveW / 2;
        const upperTy = overlayTop - centerY + effectiveH / 2;
        const lowerTy = overlayBottom - centerY - effectiveH / 2;

        // If the image is smaller than overlay in any direction, don't clamp (caller should scale up first)
        let tx = nextTx;
        let ty = nextTy;
        if (lowerTx <= upperTx) tx = Math.max(lowerTx, Math.min(upperTx, tx));
        if (lowerTy <= upperTy) ty = Math.max(lowerTy, Math.min(upperTy, ty));

        return { tx, ty };
    }, []);

    // Draw overlay template guide
    const drawOverlay = useCallback((ctx, canvasWidth, canvasHeight) => {
        const container = containerRef.current;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        const { overlayWidth, overlayHeight, overlayX, overlayY } = calculateOverlay(
            containerWidth, containerHeight, canvasWidth, canvasHeight
        );

        // Draw dark overlay (outside crop area) - vùng ngoài mờ
        // Chỉ vẽ bên trái và phải, không vẽ trên và dưới để overlay to hơn
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        
        // Draw 2 rectangles on left and right sides only (no top/bottom)
        // Left
        ctx.fillRect(0, 0, overlayX, canvasHeight);
        // Right
        ctx.fillRect(overlayX + overlayWidth, 0, canvasWidth - (overlayX + overlayWidth), canvasHeight);

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
    }, [calculateOverlay]);

    // Draw image with transformations
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

        // Calculate image dimensions after rotation
        const rad = (rotation * Math.PI) / 180;
        
        let imgWidth = img.width;
        let imgHeight = img.height;
        
        // Account for rotation
        if (rotation === 90 || rotation === 270) {
            [imgWidth, imgHeight] = [imgHeight, imgWidth];
        }

        // Calculate scaled dimensions
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;

        // Set canvas size to be large enough to contain the full scaled image
        // Add padding to ensure all edges are visible
        const padding = 50;
        const canvasWidth = Math.max(containerWidth, scaledWidth + padding * 2);
        const canvasHeight = Math.max(containerHeight, scaledHeight + padding * 2);
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Center point of canvas
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // Save context
        ctx.save();

        // Move to center
        ctx.translate(centerX, centerY);

        // Apply rotation
        ctx.rotate(rad);

        // Apply flip
        ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);

        // Apply translation (pan)
        ctx.translate(translateX, translateY);

        // Draw image centered
        ctx.drawImage(
            img,
            -scaledWidth / 2,
            -scaledHeight / 2,
            scaledWidth,
            scaledHeight
        );

        // Restore context
        ctx.restore();

        // Draw overlay template guide
        drawOverlay(ctx, canvasWidth, canvasHeight);
    }, [scale, translateX, translateY, rotation, flipHorizontal, flipVertical, type, drawOverlay]);

    // Redraw when transformations change
    useEffect(() => {
        drawImage();
    }, [drawImage]);

    // Handle zoom
    const handleZoom = (delta) => {
        const newScale = Math.max(0.5, Math.min(5, scale + delta));
        setScale(newScale);
    };

    // Handle rotate
    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
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
        setScale(1);
        setTranslateX(0);
        setTranslateY(0);
        setRotation(0);
        setFlipHorizontal(false);
        setFlipVertical(false);
    };

    // Mouse drag handlers
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left mouse button
        setIsDragging(true);
        setLastTouch({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !lastTouch) return;
        
        const deltaX = e.clientX - lastTouch.x;
        const deltaY = e.clientY - lastTouch.y;
        
        setTranslateX((prev) => prev + deltaX);
        setTranslateY((prev) => prev + deltaY);
        setLastTouch({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setLastTouch(null);
    };

    // Register touch event listeners with passive: false to allow preventDefault
    // Use refs to avoid dependency issues and stale closures
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
            // Use refs to check state - this avoids stale closures
            if (isDraggingRef.current || initialPinchDistanceRef.current) {
                e.preventDefault();
            }
            
            if (e.touches.length === 1 && isDraggingRef.current && lastTouchRef.current) {
                const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
                const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
                
                const newTranslateX = translateXRef.current + deltaX;
                const newTranslateY = translateYRef.current + deltaY;
                
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
                    const newScale = Math.max(0.5, Math.min(5, initialScaleRef.current * scaleChange));
                    scaleRef.current = newScale;
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
    }, []); // Empty deps - handlers use refs

    // Wheel zoom
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        handleZoom(delta);
    };

    // Confirm and crop - Crop trực tiếp từ canvas đã vẽ để đảm bảo khớp 100%
    const handleConfirm = async () => {
        const img = imageRef.current;
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!img || !container || !canvas) return;

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        // Tính image dimensions sau rotation
        const rad = (rotation * Math.PI) / 180;
        let imgWidth = img.width;
        let imgHeight = img.height;
        if (rotation === 90 || rotation === 270) {
            [imgWidth, imgHeight] = [imgHeight, imgWidth];
        }

        // Tính overlay dimensions trước
        const padding = 50;
        const tempCanvasWidth = Math.max(containerWidth, imgWidth * scale + padding * 2);
        const tempCanvasHeight = Math.max(containerHeight, imgHeight * scale + padding * 2);
        const { overlayWidth, overlayHeight, overlayX, overlayY } = calculateOverlay(
            containerWidth, containerHeight, tempCanvasWidth, tempCanvasHeight
        );

        // Enforce: NO EMPTY AREA on confirm (auto cover + clamp)
        const minCover = computeCoverScaleForOverlay(overlayWidth, overlayHeight, imgWidth, imgHeight);
        let finalScale = scale;
        if (finalScale < minCover) finalScale = minCover;

        // Clamp translation để đảm bảo overlay luôn được phủ đầy
        const clamped = clampTranslateToCoverOverlay(
            finalScale, translateX, translateY,
            overlayX, overlayY, overlayWidth, overlayHeight,
            tempCanvasWidth, tempCanvasHeight, imgWidth, imgHeight
        );
        const finalTx = clamped.tx;
        const finalTy = clamped.ty;

        // Vẽ lại canvas CHỈ CÓ IMAGE (không có overlay) để crop
        const ctx = canvas.getContext('2d');
        const scaledWidth = imgWidth * finalScale;
        const scaledHeight = imgHeight * finalScale;

        const canvasWidth = Math.max(containerWidth, scaledWidth + padding * 2);
        const canvasHeight = Math.max(containerHeight, scaledHeight + padding * 2);
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rad);
        ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
        ctx.translate(finalTx, finalTy);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            img,
            -scaledWidth / 2,
            -scaledHeight / 2,
            scaledWidth,
            scaledHeight
        );
        ctx.restore();

        // Recalculate overlay position với canvas size mới
        const { overlayWidth: finalOverlayWidth, overlayHeight: finalOverlayHeight, overlayX: finalOverlayX, overlayY: finalOverlayY } = calculateOverlay(
            containerWidth, containerHeight, canvasWidth, canvasHeight
        );

        // Crop trực tiếp từ canvas đã vẽ (high quality)
        const qualityScale = 2;
        const finalWidth = finalOverlayWidth * qualityScale;
        const finalHeight = finalOverlayHeight * qualityScale;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = finalWidth;
        tempCanvas.height = finalHeight;

        // Draw cropped area từ canvas
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(
            canvas,
            finalOverlayX, finalOverlayY, finalOverlayWidth, finalOverlayHeight,
            0, 0, finalWidth, finalHeight
        );

        // Convert to blob
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

    // Mobile: Use completely separate component
    if (isMobile) {
        return (
            <Suspense fallback={
                <div style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    background: '#000', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    zIndex: 999999
                }}>
                    <Loader2 className="animate-spin" size={32} color="white" />
                </div>
            }>
                <ImageEditorMobile
                    imageFile={imageFile}
                    type={type}
                    templateImage={templateImage}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                />
            </Suspense>
        );
    }

    // Desktop: Modal structure
    return (
        <div className="image-editor-modal" onClick={(e) => {
            if (e.target === e.currentTarget) {
                onCancel();
            }
        }}>
            <div className="image-editor-content" onClick={(e) => e.stopPropagation()}>
                <div className="image-editor-header">
                    <h3>Chỉnh sửa {typeLabels[type] || type}</h3>
                    <button type="button" className="editor-close-btn" onClick={onCancel}>
                        <X size={24} />
                    </button>
                </div>

                <div 
                    ref={containerRef}
                    className="image-editor-canvas-container"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    <canvas ref={canvasRef} className="image-editor-canvas" />
                </div>

                <div className="image-editor-controls">
                <button
                    type="button"
                    className="editor-btn"
                    onClick={() => handleZoom(-0.2)}
                    title="Thu nhỏ"
                >
                    <ZoomOut size={22} />
                </button>
                <button
                    type="button"
                    className="editor-btn"
                    onClick={() => handleZoom(0.2)}
                    title="Phóng to"
                >
                    <ZoomIn size={22} />
                </button>
                <button
                    type="button"
                    className="editor-btn"
                    onClick={handleRotate}
                    title="Xoay"
                >
                    <RotateCw size={22} />
                </button>
                <button
                    type="button"
                    className={`editor-btn ${flipHorizontal ? 'active' : ''}`}
                    onClick={handleFlipHorizontal}
                    title="Lật ngang"
                >
                    <FlipHorizontal size={22} />
                </button>
                <button
                    type="button"
                    className={`editor-btn ${flipVertical ? 'active' : ''}`}
                    onClick={handleFlipVertical}
                    title="Lật dọc"
                >
                    <FlipVertical size={22} />
                </button>
                <button
                    type="button"
                    className="editor-btn"
                    onClick={handleReset}
                    title="Đặt lại"
                >
                    <RotateCcw size={22} />
                </button>
            </div>

            <div className="image-editor-actions">
                <button type="button" className="editor-action-btn cancel-btn" onClick={onCancel}>
                    Hủy
                </button>
                <button type="button" className="editor-action-btn confirm-btn" onClick={handleConfirm}>
                    <Check size={18} />
                    Xác nhận
                </button>
            </div>
            </div>
        </div>
    );
}

