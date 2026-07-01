/** Detect basic image quality (brightness + blur proxy via sharpness) */
export async function detectImageQuality(file: File): Promise<{ avgBrightness: number; sharpness: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const size = 200;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, size, size);
                const { data } = ctx.getImageData(0, 0, size, size);

                let totalLuminance = 0;
                for (let i = 0; i < data.length; i += 4) {
                    totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                }
                const avgBrightness = totalLuminance / (data.length / 4);

                let edgeSum = 0;
                const w = size;
                for (let y = 1; y < size - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        const idx = (y * w + x) * 4;
                        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                        const left = 0.299 * data[((y) * w + (x - 1)) * 4] + 0.587 * data[((y) * w + (x - 1)) * 4 + 1] + 0.114 * data[((y) * w + (x - 1)) * 4 + 2];
                        const right = 0.299 * data[((y) * w + (x + 1)) * 4] + 0.587 * data[((y) * w + (x + 1)) * 4 + 1] + 0.114 * data[((y) * w + (x + 1)) * 4 + 2];
                        const top = 0.299 * data[((y - 1) * w + x) * 4] + 0.587 * data[((y - 1) * w + x) * 4 + 1] + 0.114 * data[((y - 1) * w + x) * 4 + 2];
                        const bottom = 0.299 * data[((y + 1) * w + x) * 4] + 0.587 * data[((y + 1) * w + x) * 4 + 1] + 0.114 * data[((y + 1) * w + x) * 4 + 2];
                        const laplacian = Math.abs(gray * 4 - left - right - top - bottom);
                        edgeSum += laplacian;
                    }
                }
                const sharpness = edgeSum / ((size - 2) * (size - 2));

                URL.revokeObjectURL(url);
                resolve({ avgBrightness, sharpness });
            } catch {
                URL.revokeObjectURL(url);
                resolve({ avgBrightness: 128, sharpness: 10 });
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ avgBrightness: 128, sharpness: 10 });
        };
        img.src = url;
    });
}

export type CCCDQualityIssue =
    | 'too_small'
    | 'too_large'
    | 'too_dark'
    | 'too_bright'
    | 'blurry'
    | 'wrong_ratio';

export interface CCCDQualityReport {
    width: number;
    height: number;
    sizeBytes: number;
    aspectRatio: number;
    avgBrightness: number;
    sharpness: number;
    issues: CCCDQualityIssue[];
    blocking: boolean;
    messages: string[];
}

const QUALITY_THRESHOLDS = {
    minWidth: 600,
    minHeight: 400,
    maxBytes: 8 * 1024 * 1024,
    minBrightness: 60,
    maxBrightness: 240,
    minSharpness: 4.5,
    cccdRatioMin: 1.2,
    cccdRatioMax: 2.0,
};

/** Full quality assessment cho CCCD trước khi upload — dùng `kind` để chọn check phù hợp. */
export async function assessImageQuality(
    file: File,
    kind: 'cccd_front' | 'cccd_back' | 'photo_3x4',
): Promise<CCCDQualityReport> {
    const dims = await readImageDimensions(file);
    const { avgBrightness, sharpness } = await detectImageQuality(file);

    const issues: CCCDQualityIssue[] = [];
    const messages: string[] = [];
    const aspectRatio = dims.width && dims.height ? dims.width / dims.height : 0;

    if (dims.width < QUALITY_THRESHOLDS.minWidth || dims.height < QUALITY_THRESHOLDS.minHeight) {
        issues.push('too_small');
        messages.push(`Ảnh quá nhỏ (${dims.width}×${dims.height}px). Cần tối thiểu ${QUALITY_THRESHOLDS.minWidth}×${QUALITY_THRESHOLDS.minHeight}px.`);
    }
    if (file.size > QUALITY_THRESHOLDS.maxBytes) {
        issues.push('too_large');
        messages.push(`Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB > 8MB). Hệ thống sẽ tự nén nhưng nên chụp ở độ phân giải vừa phải.`);
    }
    if (avgBrightness < QUALITY_THRESHOLDS.minBrightness) {
        issues.push('too_dark');
        messages.push('Ảnh thiếu sáng. Vui lòng chụp ở nơi đủ ánh sáng tự nhiên.');
    } else if (avgBrightness > QUALITY_THRESHOLDS.maxBrightness) {
        issues.push('too_bright');
        messages.push('Ảnh quá chói/lóa. Tránh đèn flash trực tiếp lên CCCD.');
    }
    if (sharpness < QUALITY_THRESHOLDS.minSharpness) {
        issues.push('blurry');
        messages.push('Ảnh có vẻ mờ. Giữ máy chắc tay, lấy nét trước khi chụp.');
    }
    if ((kind === 'cccd_front' || kind === 'cccd_back') && aspectRatio > 0) {
        const normalized = aspectRatio < 1 ? 1 / aspectRatio : aspectRatio;
        if (normalized < QUALITY_THRESHOLDS.cccdRatioMin || normalized > QUALITY_THRESHOLDS.cccdRatioMax) {
            issues.push('wrong_ratio');
            messages.push('Tỉ lệ ảnh lệch nhiều so với CCCD chuẩn (~1.58:1). Nên crop sát viền thẻ.');
        }
    }

    const blocking = issues.includes('too_small');

    return {
        width: dims.width,
        height: dims.height,
        sizeBytes: file.size,
        aspectRatio,
        avgBrightness,
        sharpness,
        issues,
        blocking,
        messages,
    };
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const result = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
            URL.revokeObjectURL(url);
            resolve(result);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ width: 0, height: 0 });
        };
        img.src = url;
    });
}

/** Auto-rotate ảnh theo EXIF orientation (iPhone hay set orientation=6 → ảnh nằm ngang trong file nhưng phải xoay 90°). */
export async function autoRotateByExif(file: File): Promise<File> {
    if (!file.type.startsWith('image/jpeg')) return file;
    try {
        const orientation = await readExifOrientation(file);
        if (!orientation || orientation === 1) return file;

        const bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;
        const swap = orientation >= 5 && orientation <= 8;
        const canvas = document.createElement('canvas');
        canvas.width = swap ? height : width;
        canvas.height = swap ? width : height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;

        switch (orientation) {
            case 2: ctx.translate(width, 0); ctx.scale(-1, 1); break;
            case 3: ctx.translate(width, height); ctx.rotate(Math.PI); break;
            case 4: ctx.translate(0, height); ctx.scale(1, -1); break;
            case 5: ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); break;
            case 6: ctx.rotate(0.5 * Math.PI); ctx.translate(0, -height); break;
            case 7: ctx.rotate(0.5 * Math.PI); ctx.translate(width, -height); ctx.scale(-1, 1); break;
            case 8: ctx.rotate(-0.5 * Math.PI); ctx.translate(-width, 0); break;
        }
        ctx.drawImage(bitmap, 0, 0);
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!blob) return file;
        return new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (err) {
        console.warn('autoRotateByExif failed:', err);
        return file;
    }
}

async function readExifOrientation(file: File): Promise<number | null> {
    try {
        const head = await file.slice(0, 65536).arrayBuffer();
        const view = new DataView(head);
        if (view.getUint16(0, false) !== 0xffd8) return null;
        const length = view.byteLength;
        let offset = 2;
        while (offset < length) {
            const marker = view.getUint16(offset, false);
            offset += 2;
            if (marker === 0xffe1) {
                if (view.getUint32(offset + 2, false) !== 0x45786966) return null;
                const little = view.getUint16(offset + 8, false) === 0x4949;
                const tagsStart = offset + 8 + view.getUint32(offset + 12, little);
                const tagCount = view.getUint16(tagsStart, little);
                for (let i = 0; i < tagCount; i += 1) {
                    const entry = tagsStart + 2 + i * 12;
                    if (view.getUint16(entry, little) === 0x0112) {
                        return view.getUint16(entry + 8, little);
                    }
                }
                return null;
            }
            if ((marker & 0xff00) !== 0xff00) break;
            offset += view.getUint16(offset, false);
        }
        return null;
    } catch {
        return null;
    }
}

/** Convert HEIC/HEIF to JPEG using heic2any if available */
export async function convertHeicIfNeeded(file: File): Promise<File> {
    const name = (file.name || '').toLowerCase();
    const isHeic = name.endsWith('.heic') || name.endsWith('.heif')
        || file.type === 'image/heic' || file.type === 'image/heif';
    if (!isHeic) return file;

    try {
        const { default: heic2any } = await import('heic2any');
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        const converted = Array.isArray(blob) ? blob[0] : blob;
        return new File([converted], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    } catch (err) {
        console.warn('heic2any failed:', err);
        throw new Error('Định dạng HEIC/HEIF không hỗ trợ. Vui lòng chuyển sang JPG hoặc PNG trước khi upload.');
    }
}
