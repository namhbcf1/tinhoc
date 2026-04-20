// ========================================
// FILE UTILITIES - Xử lý file types và MIME types
// ========================================
/**
 * Get MIME type từ file extension
 */
export function getMimeTypeFromExtension(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'ico': 'image/x-icon',
        // Videos
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'mkv': 'video/x-matroska',
        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'aac': 'audio/aac',
        'flac': 'audio/flac',
        'm4a': 'audio/mp4',
        // Documents
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'rtf': 'application/rtf',
        'csv': 'text/csv',
        // Archives
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',
        // Code
        'html': 'text/html',
        'css': 'text/css',
        'js': 'text/javascript',
        'json': 'application/json',
        'xml': 'application/xml',
        // Other
        'exe': 'application/x-msdownload',
        'msi': 'application/x-msdownload',
    };
    return mimeTypes[ext ?? ''] || 'application/octet-stream';
}
/**
 * Get content type cho file (ưu tiên file.type, fallback về extension)
 */
export function getContentType(file, fileName) {
    // Nếu file có type và không phải empty string, dùng nó
    if (file?.type && file.type !== '') {
        return file.type;
    }
    // Fallback về extension
    return getMimeTypeFromExtension(fileName || file?.name || '');
}
/**
 * Check nếu file là image
 */
export function isImage(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext ?? '');
}
/**
 * Check nếu file là video
 */
export function isVideo(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext ?? '');
}
/**
 * Check nếu file là audio
 */
export function isAudio(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext ?? '');
}
