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
