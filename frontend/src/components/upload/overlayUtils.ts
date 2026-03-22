/**
 * Utility functions for overlay calculations
 * Separated to avoid circular dependencies
 */

// Dynamic Ratio based on type
export const getOverlayRatio = (type) => {
    if (type === 'photo_3x4') {
        const w = 0.80; // 80% width (tăng từ 75% để lớn hơn trên mobile)
        return {
            w: w,
            aspect: 3 / 4
        };
    }
    // Default CCCD
    const w = 0.90; // 90% width (tăng từ 85% để lớn hơn trên mobile)
    return {
        w: w,
        aspect: 1.585
    };
};

export const getOverlayBox = (type, containerWidth, containerHeight, options = {}) => {
    const ratio = getOverlayRatio(type);
    const widthRatio = options.widthRatio ?? ratio.w;
    const maxWidthRatio = options.maxWidthRatio ?? 0.98;
    const maxHeightRatio = options.maxHeightRatio ?? 0.9;
    const centerYOffset = options.centerYOffset ?? 0;

    let overlayWidth = Math.min(containerWidth * widthRatio, containerWidth * maxWidthRatio);
    let overlayHeight = overlayWidth / ratio.aspect;
    const maxHeight = containerHeight * maxHeightRatio;

    if (overlayHeight > maxHeight) {
        overlayHeight = maxHeight;
        overlayWidth = overlayHeight * ratio.aspect;
    }

    const centeredX = (containerWidth - overlayWidth) / 2;
    const centeredY = (containerHeight - overlayHeight) / 2 + (containerHeight * centerYOffset);
    const overlayY = Math.max(0, Math.min(centeredY, containerHeight - overlayHeight));

    return {
        overlayWidth,
        overlayHeight,
        overlayX: centeredX,
        overlayY,
    };
};




