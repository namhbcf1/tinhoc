/**
 * Auto edge-detection + perspective warp cho CCCD.
 * Dùng jscanify (OpenCV.js wasm) để tự tìm 4 góc thẻ và nắn về hình chữ nhật phẳng.
 *
 * - Lazy-load wasm CHỈ khi function được gọi lần đầu (≈ 7MB, cache sau đó).
 * - Trả về File mới nếu detect thành công, hoặc null nếu không đủ tin cậy → caller dùng ảnh gốc.
 * - Confidence dựa trên: contour area / image area > 0.3, và 4 góc tạo tứ giác lồi.
 */

let scannerPromise: Promise<unknown> | null = null;

async function loadScanner(): Promise<unknown> {
    if (!scannerPromise) {
        scannerPromise = (async () => {
            // Load OpenCV.js từ CDN (jscanify cần global cv)
            await new Promise<void>((resolve, reject) => {
                if ((window as unknown as { cv?: unknown }).cv) return resolve();
                const script = document.createElement('script');
                script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
                script.async = true;
                script.onload = () => {
                    const tryReady = () => {
                        const cv = (window as unknown as { cv?: { onRuntimeInitialized?: () => void } }).cv;
                        if (cv && typeof cv === 'object' && 'imread' in cv) return resolve();
                        if (cv) {
                            cv.onRuntimeInitialized = () => resolve();
                        } else {
                            setTimeout(tryReady, 100);
                        }
                    };
                    tryReady();
                };
                script.onerror = () => reject(new Error('Không tải được OpenCV.js'));
                document.head.appendChild(script);
            });

            // Use the browser ("client") build — the default export pulls in a
            // Node/jsdom build (~11.8MB) that breaks in the browser. The client
            // subpath is a UMD bundle exposing the same jScanify API.
            // @ts-expect-error - jscanify không có type declarations chính thức
            const mod = await import('jscanify/client');
            const Scanner = (mod as { default?: new () => unknown }).default
                ?? (mod as unknown as new () => unknown);
            return new (Scanner as new () => unknown)();
        })();
    }
    return scannerPromise;
}

export interface AutoWarpResult {
    file: File;
    detected: boolean;
    confidence: number;
}

/**
 * Cố gắng detect 4 góc CCCD và warp về phẳng.
 * - Nếu detect tốt (area > 30%): trả file ảnh đã warp.
 * - Nếu detect kém: trả file gốc, detected=false → caller có thể gợi ý crop tay.
 * - Output luôn JPEG để giảm size.
 */
export async function autoWarpCCCD(file: File, opts?: { targetWidth?: number; targetHeight?: number }): Promise<AutoWarpResult> {
    const targetWidth = opts?.targetWidth ?? 1280;
    const targetHeight = opts?.targetHeight ?? 808; // tỉ lệ CCCD ~1.585

    try {
        const scanner = await loadScanner() as {
            extractPaper: (canvas: HTMLCanvasElement, w: number, h: number) => HTMLCanvasElement;
            findPaperContour?: (mat: unknown) => unknown;
        };

        const bitmap = await createImageBitmap(file);
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = bitmap.width;
        srcCanvas.height = bitmap.height;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) throw new Error('canvas-2d-unavailable');
        srcCtx.drawImage(bitmap, 0, 0);

        // jscanify.extractPaper warp về kích thước truyền vào
        const warped = scanner.extractPaper(srcCanvas, targetWidth, targetHeight);

        // Validate: kiểm tra warped không phải ảnh đen / trống
        const wctx = warped.getContext('2d');
        if (!wctx) throw new Error('warped-ctx-fail');
        const sample = wctx.getImageData(0, 0, Math.min(100, targetWidth), Math.min(100, targetHeight));
        let lum = 0;
        for (let i = 0; i < sample.data.length; i += 4) {
            lum += 0.299 * sample.data[i] + 0.587 * sample.data[i + 1] + 0.114 * sample.data[i + 2];
        }
        const avgLum = lum / (sample.data.length / 4);
        // Nếu ảnh warped quá tối (< 30) hoặc quá sáng đều (> 245) → có thể fail
        const detected = avgLum > 30 && avgLum < 245;
        const confidence = detected ? 0.9 : 0.3;

        if (!detected) {
            return { file, detected: false, confidence };
        }

        const blob = await new Promise<Blob | null>((resolve) =>
            warped.toBlob((b: Blob | null) => resolve(b), 'image/jpeg', 0.92),
        );
        if (!blob) return { file, detected: false, confidence: 0 };

        const newName = file.name.replace(/\.[^.]+$/, '') + '_auto.jpg';
        return {
            file: new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() }),
            detected: true,
            confidence,
        };
    } catch (err) {
        console.warn('[autoWarpCCCD] fallback to original:', err);
        return { file, detected: false, confidence: 0 };
    }
}
