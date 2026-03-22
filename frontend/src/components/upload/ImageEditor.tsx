import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical, X, Check, RotateCcw, Loader2 } from 'lucide-react';
import { getOverlayBox } from './overlayUtils';
import { detectDocumentAutoFitBox } from './documentAutoFit';
import { useIsMobile } from '../../utils/deviceDetection';
import { lazyWithChunkReload } from '../../utils/lazyWithChunkReload';
import './ImageEditor.css';

const ImageEditorMobile = lazyWithChunkReload(() => import('./ImageEditorMobile'));

export default function ImageEditor({
    imageFile,
    type,
    templateImage,
    onConfirm,
    onCancel
}) {
    const isMobile = useIsMobile();
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
                setScale(initialTransform.scale);
                scaleRef.current = initialTransform.scale;
                setTranslateX(initialTransform.tx);
                setTranslateY(initialTransform.ty);
                translateXRef.current = initialTransform.tx;
                translateYRef.current = initialTransform.ty;
                setRotation(0);
                setFlipHorizontal(false);
                setFlipVertical(false);

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
    }, [imageFile, requiresDocumentDetection]);

    // Helper function để tính overlay dimensions và position - DÙNG CHUNG cho drawOverlay và handleConfirm
    const calculateOverlay = useCallback((containerWidth, containerHeight, canvasWidth, canvasHeight) => {
        const visibleOverlay = getOverlayBox(type, containerWidth, containerHeight, {
            maxHeightRatio: 0.86,
            centerYOffset: type === 'photo_3x4' ? -0.01 : -0.04,
        });
        const offsetX = (canvasWidth - containerWidth) / 2;
        const offsetY = (canvasHeight - containerHeight) / 2;
        
        // Tất cả đều fit by height để to hơn và dễ nhìn
        return {
            overlayWidth: visibleOverlay.overlayWidth,
            overlayHeight: visibleOverlay.overlayHeight,
            overlayX: visibleOverlay.overlayX + offsetX,
            overlayY: visibleOverlay.overlayY + offsetY,
        };
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

    const computeInitialTransform = useCallback(async (img) => {
        const container = containerRef.current;
        if (!container) {
            return { scale: 1, tx: 0, ty: 0 };
        }

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const padding = 50;

        const baseCanvasWidth = Math.max(containerWidth, img.width + padding * 2);
        const baseCanvasHeight = Math.max(containerHeight, img.height + padding * 2);
        const baseOverlay = calculateOverlay(containerWidth, containerHeight, baseCanvasWidth, baseCanvasHeight);

        let nextScale = computeCoverScaleForOverlay(
            baseOverlay.overlayWidth,
            baseOverlay.overlayHeight,
            img.width,
            img.height
        );
        let nextTx = 0;
        let nextTy = 0;
        let detected = false;

        const detectedBox = await detectDocumentAutoFitBox(img, type);
        if (detectedBox) {
            detected = true;
            const detectedScale = Math.max(
                baseOverlay.overlayWidth / detectedBox.width,
                baseOverlay.overlayHeight / detectedBox.height
            ) * 1.02;

            nextScale = Math.max(nextScale, detectedScale);
            nextTx = (img.width / 2 - (detectedBox.x + detectedBox.width / 2)) * nextScale;
            nextTy = (img.height / 2 - (detectedBox.y + detectedBox.height / 2)) * nextScale;
        }

        const canvasWidth = Math.max(containerWidth, img.width * nextScale + padding * 2);
        const canvasHeight = Math.max(containerHeight, img.height * nextScale + padding * 2);
        const overlay = calculateOverlay(containerWidth, containerHeight, canvasWidth, canvasHeight);
        const clamped = clampTranslateToCoverOverlay(
            nextScale,
            nextTx,
            nextTy,
            overlay.overlayX,
            overlay.overlayY,
            overlay.overlayWidth,
            overlay.overlayHeight,
            canvasWidth,
            canvasHeight,
            img.width,
            img.height
        );

        return {
            scale: nextScale,
            tx: clamped.tx,
            ty: clamped.ty,
            detected,
        };
    }, [calculateOverlay, clampTranslateToCoverOverlay, computeCoverScaleForOverlay, type]);

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
        ctx.fillRect(0, 0, canvasWidth, overlayY);
        ctx.fillRect(0, overlayY + overlayHeight, canvasWidth, canvasHeight - (overlayY + overlayHeight));
        ctx.fillRect(0, overlayY, overlayX, overlayHeight);
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

    // Handle zoom — enforce minimum cover scale and clamp translation
    const handleZoom = (delta) => {
        const container = containerRef.current;
        const img = imageRef.current;
        if (!container || !img) {
            setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        let imgWidth = img.width;
        let imgHeight = img.height;
        if (rotation === 90 || rotation === 270) {
            [imgWidth, imgHeight] = [imgHeight, imgWidth];
        }

        const padding = 50;
        const canvasWidth = Math.max(containerWidth, imgWidth * scale + padding * 2);
        const canvasHeight = Math.max(containerHeight, imgHeight * scale + padding * 2);
        const overlay = calculateOverlay(containerWidth, containerHeight, canvasWidth, canvasHeight);
        const minCover = computeCoverScaleForOverlay(overlay.overlayWidth, overlay.overlayHeight, imgWidth, imgHeight);

        const newScale = Math.max(minCover, Math.min(5, scale + delta));

        // Recompute canvas for new scale to clamp translation
        const newCanvasWidth = Math.max(containerWidth, imgWidth * newScale + padding * 2);
        const newCanvasHeight = Math.max(containerHeight, imgHeight * newScale + padding * 2);
        const newOverlay = calculateOverlay(containerWidth, containerHeight, newCanvasWidth, newCanvasHeight);
        const clamped = clampTranslateToCoverOverlay(
            newScale, translateX, translateY,
            newOverlay.overlayX, newOverlay.overlayY, newOverlay.overlayWidth, newOverlay.overlayHeight,
            newCanvasWidth, newCanvasHeight, imgWidth, imgHeight
        );

        setScale(newScale);
        scaleRef.current = newScale;
        setTranslateX(clamped.tx);
        setTranslateY(clamped.ty);
        translateXRef.current = clamped.tx;
        translateYRef.current = clamped.ty;
    };

    // Handle rotate — recalculate cover scale and clamp (match mobile behavior)
    const handleRotate = () => {
        setRotation((prev) => {
            const nextRotation = (prev + 90) % 360;

            // After rotation, recalculate cover scale (use setTimeout to allow state update)
            setTimeout(() => {
                const container = containerRef.current;
                const img = imageRef.current;
                if (!container || !img) return;

                const containerRect = container.getBoundingClientRect();
                const cw = containerRect.width;
                const ch = containerRect.height;
                let imgW = img.width;
                let imgH = img.height;
                if (nextRotation === 90 || nextRotation === 270) {
                    [imgW, imgH] = [imgH, imgW];
                }
                const padding = 50;
                const canW = Math.max(cw, imgW + padding * 2);
                const canH = Math.max(ch, imgH + padding * 2);
                const overlay = calculateOverlay(cw, ch, canW, canH);
                const minCover = computeCoverScaleForOverlay(overlay.overlayWidth, overlay.overlayHeight, imgW, imgH);

                setScale(minCover);
                scaleRef.current = minCover;
                const clamped = clampTranslateToCoverOverlay(
                    minCover, 0, 0,
                    overlay.overlayX, overlay.overlayY, overlay.overlayWidth, overlay.overlayHeight,
                    canW, canH, imgW, imgH
                );
                setTranslateX(clamped.tx);
                setTranslateY(clamped.ty);
                translateXRef.current = clamped.tx;
                translateYRef.current = clamped.ty;
            }, 0);

            return nextRotation;
        });
    };

    // Handle flip horizontal
    const handleFlipHorizontal = () => {
        setFlipHorizontal((prev) => !prev);
    };

    // Handle flip vertical
    const handleFlipVertical = () => {
        setFlipVertical((prev) => !prev);
    };

    // Reset transformations — compute cover scale like mobile
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

        const container = containerRef.current;
        const img = imageRef.current;
        let newTx = translateX + deltaX;
        let newTy = translateY + deltaY;

        if (container && img) {
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;
            let imgWidth = img.width;
            let imgHeight = img.height;
            if (rotation === 90 || rotation === 270) {
                [imgWidth, imgHeight] = [imgHeight, imgWidth];
            }
            const padding = 50;
            const canvasWidth = Math.max(containerWidth, imgWidth * scale + padding * 2);
            const canvasHeight = Math.max(containerHeight, imgHeight * scale + padding * 2);
            const overlay = calculateOverlay(containerWidth, containerHeight, canvasWidth, canvasHeight);
            const clamped = clampTranslateToCoverOverlay(
                scale, newTx, newTy,
                overlay.overlayX, overlay.overlayY, overlay.overlayWidth, overlay.overlayHeight,
                canvasWidth, canvasHeight, imgWidth, imgHeight
            );
            newTx = clamped.tx;
            newTy = clamped.ty;
        }

        setTranslateX(newTx);
        setTranslateY(newTy);
        translateXRef.current = newTx;
        translateYRef.current = newTy;
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
            if (e.touches.length === 1 && isDraggingRef.current && lastTouchRef.current) {
                const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
                const deltaY = e.touches[0].clientY - lastTouchRef.current.y;

                let newTranslateX = translateXRef.current + deltaX;
                let newTranslateY = translateYRef.current + deltaY;

                // Clamp translation to keep image covering overlay
                const img = imageRef.current;
                if (container && img) {
                    const containerRect = container.getBoundingClientRect();
                    const cw = containerRect.width;
                    const ch = containerRect.height;
                    let imgW = img.width;
                    let imgH = img.height;
                    if (rotation === 90 || rotation === 270) { [imgW, imgH] = [imgH, imgW]; }
                    const padding = 50;
                    const canW = Math.max(cw, imgW * scaleRef.current + padding * 2);
                    const canH = Math.max(ch, imgH * scaleRef.current + padding * 2);
                    const ov = calculateOverlay(cw, ch, canW, canH);
                    const clamped = clampTranslateToCoverOverlay(
                        scaleRef.current, newTranslateX, newTranslateY,
                        ov.overlayX, ov.overlayY, ov.overlayWidth, ov.overlayHeight,
                        canW, canH, imgW, imgH
                    );
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
                    // Compute min cover scale
                    const img = imageRef.current;
                    let minScale = 0.5;
                    if (container && img) {
                        const containerRect = container.getBoundingClientRect();
                        const cw = containerRect.width;
                        const ch = containerRect.height;
                        let imgW = img.width;
                        let imgH = img.height;
                        if (rotation === 90 || rotation === 270) { [imgW, imgH] = [imgH, imgW]; }
                        const padding = 50;
                        const canW = Math.max(cw, imgW * scaleRef.current + padding * 2);
                        const canH = Math.max(ch, imgH * scaleRef.current + padding * 2);
                        const ov = calculateOverlay(cw, ch, canW, canH);
                        minScale = computeCoverScaleForOverlay(ov.overlayWidth, ov.overlayHeight, imgW, imgH);
                    }
                    const newScale = Math.max(minScale, Math.min(5, initialScaleRef.current * scaleChange));
                    scaleRef.current = newScale;
                    // Clamp translation after zoom change
                    if (container && img) {
                        const containerRect = container.getBoundingClientRect();
                        const cw = containerRect.width;
                        const ch = containerRect.height;
                        let imgW = img.width;
                        let imgH = img.height;
                        if (rotation === 90 || rotation === 270) { [imgW, imgH] = [imgH, imgW]; }
                        const padding = 50;
                        const canW = Math.max(cw, imgW * newScale + padding * 2);
                        const canH = Math.max(ch, imgH * newScale + padding * 2);
                        const ov = calculateOverlay(cw, ch, canW, canH);
                        const clamped = clampTranslateToCoverOverlay(
                            newScale, translateXRef.current, translateYRef.current,
                            ov.overlayX, ov.overlayY, ov.overlayWidth, ov.overlayHeight,
                            canW, canH, imgW, imgH
                        );
                        translateXRef.current = clamped.tx;
                        translateYRef.current = clamped.ty;
                        setTranslateX(clamped.tx);
                        setTranslateY(clamped.ty);
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

    const statusText = !requiresDocumentDetection
        ? 'Căn khuôn mặt vào giữa khung, chừa khoảng thở phía trên đầu và hai bên vai.'
        : documentCheckState === 'checking'
            ? 'Hệ thống đang tự căn khung tài liệu để bạn chỉ cần chỉnh nhẹ nếu cần.'
            : documentCheckState === 'detected'
                ? 'Khung đã được auto-fit gần đúng. Kéo hoặc zoom thêm để 4 mép CCCD nằm gọn trong vùng sáng.'
                : 'Không nhận ra đủ 4 góc rõ ràng. Kéo và zoom thủ công đến khi toàn bộ CCCD nằm trọn trong khung.';

    const stageHint = type === 'photo_3x4'
        ? 'Giữ ảnh chân dung thẳng, không cắt đỉnh đầu hoặc phần cằm.'
        : 'Đảm bảo đủ 4 góc, không lóa sáng, không cắt mép và hạn chế nghiêng lệch quá nhiều.';

    const controlItems = [
        { key: 'zoom-out', label: 'Thu nhỏ', icon: ZoomOut, onClick: () => handleZoom(-0.2), active: false },
        { key: 'zoom-in', label: 'Phóng to', icon: ZoomIn, onClick: () => handleZoom(0.2), active: false },
        { key: 'rotate', label: 'Xoay', icon: RotateCw, onClick: handleRotate, active: false },
        { key: 'flip-h', label: 'Lật ngang', icon: FlipHorizontal, onClick: handleFlipHorizontal, active: flipHorizontal },
        { key: 'flip-v', label: 'Lật dọc', icon: FlipVertical, onClick: handleFlipVertical, active: flipVertical },
        { key: 'reset', label: 'Đặt lại', icon: RotateCcw, onClick: handleReset, active: false },
    ];

    if (typeof document === 'undefined') {
        return null;
    }

    // Mobile: Use completely separate component
    if (isMobile) {
        return createPortal(
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
            ,
            document.body
        );
    }

    // Desktop: Modal structure
    return createPortal(
        <div className="image-editor-modal" onClick={(e) => {
            if (e.target === e.currentTarget) {
                onCancel();
            }
        }}>
            <div className="image-editor-content" onClick={(e) => e.stopPropagation()}>
                <div className="image-editor-header">
                    <div className="image-editor-header-copy">
                        <span className="image-editor-eyebrow">Document Scan</span>
                        <div className="image-editor-title-row">
                            <h3>Chỉnh sửa {typeLabels[type] || type}</h3>
                            <span className={`image-editor-status-badge status-${documentCheckState}`}>
                                {documentCheckState === 'detected' ? 'Auto-fit' : documentCheckState === 'checking' ? 'Đang đọc' : 'Chỉnh tay'}
                            </span>
                        </div>
                        <p className="image-editor-subtitle">{statusText}</p>
                    </div>
                    <button type="button" className="editor-close-btn" onClick={onCancel}>
                        <X size={24} />
                    </button>
                </div>

                <div className="image-editor-stage-summary">
                    <div className="image-editor-guidance-card">
                        <span className="image-editor-guidance-label">Mẹo căn khung</span>
                        <p>{stageHint}</p>
                    </div>
                    <div className="image-editor-telemetry">
                        <span>{Math.round(scale * 100)}% zoom</span>
                        <span>{rotation}° xoay</span>
                        <span>Kéo ảnh để canh</span>
                    </div>
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
                    {controlItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                className={`editor-btn ${item.active ? 'active' : ''}`}
                                onClick={item.onClick}
                                title={item.label}
                            >
                                <Icon size={20} />
                                <span className="editor-btn-label">{item.label}</span>
                            </button>
                        );
                    })}
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
        ,
        document.body
    );
}
