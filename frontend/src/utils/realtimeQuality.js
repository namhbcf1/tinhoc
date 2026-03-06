/**
 * Real-time Quality Analysis Utilities
 * Analyze video frame quality in real-time
 */

/**
 * Analyze frame quality (blur, brightness, coverage)
 */
export async function analyzeFrameQuality(video, overlayRect) {
    if (!video || !video.videoWidth || !video.videoHeight) {
        return {
            blur: 0,
            brightness: 0,
            coverage: 0,
            score: 0,
            issues: []
        };
    }

    try {
        // Create canvas from video frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Get image data from overlay region
        const x = Math.max(0, Math.floor(overlayRect.x));
        const y = Math.max(0, Math.floor(overlayRect.y));
        const width = Math.min(canvas.width - x, Math.floor(overlayRect.width));
        const height = Math.min(canvas.height - y, Math.floor(overlayRect.height));

        if (width <= 0 || height <= 0) {
            return {
                blur: 0,
                brightness: 0,
                coverage: 0,
                score: 0,
                issues: ['Khung không hợp lệ']
            };
        }

        const imageData = ctx.getImageData(x, y, width, height);
        const data = imageData.data;

        // Calculate blur using Laplacian variance
        const blur = calculateBlur(imageData, width, height);

        // Calculate brightness
        const brightness = calculateBrightness(data);

        // Calculate coverage (how much of overlay is filled)
        const coverage = calculateCoverage(data, width, height);

        // Calculate overall score
        const score = getQualityScore(blur, brightness, coverage);

        // Get issues
        const issues = getQualityIssues(blur, brightness, coverage);

        return {
            blur,
            brightness,
            coverage,
            score,
            issues
        };
    } catch (error) {
        console.error('Quality analysis error:', error);
        return {
            blur: 0,
            brightness: 0,
            coverage: 0,
            score: 0,
            issues: ['Lỗi phân tích chất lượng']
        };
    }
}

/**
 * Calculate blur using Laplacian variance
 */
function calculateBlur(imageData, width, height) {
    const gray = new Float32Array(width * height);
    const data = imageData.data;

    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Calculate Laplacian variance
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            const lap =
                gray[i - 1] +
                gray[i + 1] +
                gray[i - width] +
                gray[i + width] -
                4 * gray[i];

            sum += lap;
            sumSq += lap * lap;
            count++;
        }
    }

    const variance = sumSq / count - (sum / count) ** 2;
    return variance;
}

/**
 * Calculate average brightness
 */
function calculateBrightness(data) {
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
        total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return total / (data.length / 4);
}

/**
 * Calculate coverage (how much of overlay contains content vs dark/empty)
 */
function calculateCoverage(data, width, height) {
    let nonDark = 0;
    const threshold = 30;

    for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness > threshold) {
            nonDark++;
        }
    }

    return nonDark / (data.length / 4);
}

/**
 * Calculate overall quality score (0-100)
 */
export function getQualityScore(blur, brightness, coverage) {
    let score = 100;

    // Blur score (higher variance = sharper)
    if (blur < 50) {
        score -= 40; // Very blurry
    } else if (blur < 100) {
        score -= 20; // Somewhat blurry
    } else if (blur < 150) {
        score -= 10; // Slightly blurry
    }

    // Brightness score
    if (brightness < 60) {
        score -= 30; // Too dark
    } else if (brightness < 80) {
        score -= 15; // A bit dark
    } else if (brightness > 200) {
        score -= 20; // Too bright
    } else if (brightness > 180) {
        score -= 10; // A bit bright
    }

    // Coverage score
    if (coverage < 0.5) {
        score -= 30; // Document not in frame
    } else if (coverage < 0.7) {
        score -= 15; // Partially in frame
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Get quality issues as array of strings
 */
export function getQualityIssues(blur, brightness, coverage) {
    const issues = [];

    if (blur < 50) {
        issues.push('Ảnh rất mờ - Giữ điện thoại ổn định');
    } else if (blur < 100) {
        issues.push('Ảnh hơi mờ - Giữ chặt điện thoại');
    }

    if (brightness < 60) {
        issues.push('Ảnh quá tối - Di chuyển đến nơi sáng hơn');
    } else if (brightness < 80) {
        issues.push('Ảnh hơi tối - Tăng độ sáng');
    } else if (brightness > 200) {
        issues.push('Ảnh quá sáng - Tránh ánh sáng trực tiếp');
    } else if (brightness > 180) {
        issues.push('Ảnh hơi sáng - Điều chỉnh góc chụp');
    }

    if (coverage < 0.5) {
        issues.push('Document chưa nằm trong khung - Di chuyển gần hơn');
    } else if (coverage < 0.7) {
        issues.push('Document chưa đầy đủ trong khung - Căn chỉnh lại');
    }

    return issues;
}

/**
 * Get quality feedback message
 */
export function getQualityFeedback(score, issues) {
    if (score >= 80) {
        return {
            status: 'good',
            message: 'Chất lượng tốt - Sẵn sàng chụp',
            icon: '✅',
            color: '#10b981'
        };
    } else if (score >= 60) {
        return {
            status: 'warning',
            message: issues.length > 0 ? issues[0] : 'Cần cải thiện chất lượng',
            icon: '⚠️',
            color: '#f59e0b'
        };
    } else {
        return {
            status: 'error',
            message: issues.length > 0 ? issues[0] : 'Chất lượng kém - Vui lòng chụp lại',
            icon: '❌',
            color: '#ef4444'
        };
    }
}









