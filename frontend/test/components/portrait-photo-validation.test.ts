import { describe, expect, it } from 'vitest';
import { evaluatePortraitMetrics, type PortraitPhotoMetrics } from '../../src/components/upload/portrait-photo-validation';

function createMetrics(overrides: Partial<PortraitPhotoMetrics> = {}): PortraitPhotoMetrics {
  return {
    width: 900,
    height: 1200,
    avgBrightness: 138,
    sharpness: 18,
    backgroundScore: 0.68,
    whiteBackgroundScore: 0.05,
    faceCount: 1,
    faceDetectionMode: 'estimated',
    faceBox: {
      x: 0.34,
      y: 0.11,
      width: 0.28,
      height: 0.32,
      confidence: 0.82,
    },
    faceTiltDegrees: 0,
    ...overrides,
  };
}

describe('evaluatePortraitMetrics', () => {
  it('accepts a clear blue-background portrait photo', () => {
    const result = evaluatePortraitMetrics(createMetrics(), 'upload');

    expect(result.isValid).toBe(true);
    expect(result.blockingReasons).toEqual([]);
  });

  it('rejects white-background photos', () => {
    const result = evaluatePortraitMetrics(createMetrics({
      backgroundScore: 0.08,
      whiteBackgroundScore: 0.74,
    }), 'upload');

    expect(result.isValid).toBe(false);
    expect(result.blockingReasons.some((reason) => reason.includes('nền trắng'))).toBe(true);
  });

  it('rejects selfie-like close-up photos', () => {
    const result = evaluatePortraitMetrics(createMetrics({
      faceBox: {
        x: 0.16,
        y: -0.01,
        width: 0.56,
        height: 0.66,
        confidence: 0.94,
      },
    }), 'upload');

    expect(result.isValid).toBe(false);
    expect(result.blockingReasons.some((reason) => reason.includes('selfie'))).toBe(true);
  });

  it('rejects blurry photos', () => {
    const result = evaluatePortraitMetrics(createMetrics({
      sharpness: 4,
    }), 'upload');

    expect(result.isValid).toBe(false);
    expect(result.blockingReasons.some((reason) => reason.includes('mờ'))).toBe(true);
  });

  it('accepts slightly soft photos with a warning', () => {
    const result = evaluatePortraitMetrics(createMetrics({
      sharpness: 5.4,
    }), 'upload');

    expect(result.isValid).toBe(true);
    expect(result.blockingReasons).toEqual([]);
    expect(result.warnings.some((reason) => reason.includes('mềm nét'))).toBe(true);
  });

  it('accepts borderline but usable editor-stage portraits', () => {
    const result = evaluatePortraitMetrics(createMetrics({
      avgBrightness: 80,
      sharpness: 7.2,
      backgroundScore: 0.31,
      whiteBackgroundScore: 0.12,
      faceBox: {
        x: 0.24,
        y: 0.02,
        width: 0.42,
        height: 0.5,
        confidence: 0.88,
      },
    }), 'editor');

    expect(result.isValid).toBe(true);
    expect(result.blockingReasons).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('still rejects obvious selfie framing in editor', () => {
    const result = evaluatePortraitMetrics(createMetrics({
      faceBox: {
        x: 0.16,
        y: -0.02,
        width: 0.62,
        height: 0.76,
        confidence: 0.96,
      },
    }), 'editor');

    expect(result.isValid).toBe(false);
    expect(result.blockingReasons.some((reason) => reason.includes('selfie'))).toBe(true);
  });
});
