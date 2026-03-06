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








