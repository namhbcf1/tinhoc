// @ts-nocheck
/**
 * Utility functions for overlay calculations.
 * Kept separate to avoid circular dependencies between the upload helpers.
 */

export const getOverlayRatio = (type) => {
  if (type === 'photo_3x4') {
    return {
      w: 0.74,
      aspect: 3 / 4,
    };
  }

  return {
    w: 0.9,
    aspect: 1.585,
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
