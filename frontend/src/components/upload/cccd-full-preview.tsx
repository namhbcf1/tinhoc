import { X, RefreshCw, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface FullPreviewProps {
    type: string;
    preview: string;
    label: string;
    onClose: () => void;
    onRetake: () => void;
}

export default function FullPreview({ type, preview, label, onClose, onRetake }: FullPreviewProps) {
    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="full-preview-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="full-preview-content" onClick={e => e.stopPropagation()}>
                <div className="full-preview-header">
                    <span>{label} — kiểm tra ảnh</span>
                    <button type="button" className="full-preview-close" onClick={onClose} aria-label="Đóng">
                        <X size={22} />
                    </button>
                </div>
                <img src={preview} alt="Full Preview" className="full-preview-img" />
                <div className="full-preview-checklist">
                    <p className="checklist-title">Kiểm tra trước khi nộp:</p>
                    {type !== 'photo_3x4' ? (
                        <ul>
                            <li>Đúng mặt ({type === 'cccd_front' ? 'mặt có ảnh & số CCCD' : 'mặt có mã QR'})?</li>
                            <li>Nhìn rõ 4 góc CCCD?</li>
                            <li>Chữ số CCCD đọc được không?</li>
                            <li>Ảnh không bị mờ, tối hay chói?</li>
                        </ul>
                    ) : (
                        <ul>
                            <li>Phông nền trắng/sáng?</li>
                            <li>Khuôn mặt rõ, nhìn thẳng?</li>
                            <li>Không đeo kính màu?</li>
                            <li>Ảnh trong 6 tháng gần nhất?</li>
                        </ul>
                    )}
                </div>
                <div className="full-preview-actions">
                    <button type="button" className="btn-preview-retake" onClick={() => { onClose(); onRetake(); }}>
                        <RefreshCw size={15} /> Tải ảnh mới
                    </button>
                    <button type="button" className="btn-preview-ok" onClick={onClose}>
                        <CheckCircle size={15} /> Dùng ảnh này
                    </button>
                </div>
            </div>
        </div>
        ,
        document.body
    );
}
