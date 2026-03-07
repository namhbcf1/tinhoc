import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Cropper from 'react-easy-crop';
import { X, RotateCw, Check, Move } from 'lucide-react';
import './ImageCropModal.css';

/**
 * Smart Image Crop Modal with Template Overlay
 * Shows template guides for CCCD and 3x4 photos
 */

// Aspect ratios for different document types
const ASPECT_RATIOS = {
    cccd_front: 85.6 / 54,  // CCCD card ratio
    cccd_back: 85.6 / 54,
    photo_3x4: 3 / 4        // Portrait photo ratio
};

// Template titles
const TEMPLATE_TITLES = {
    cccd_front: 'Căn chỉnh CCCD mặt trước vào khung',
    cccd_back: 'Căn chỉnh CCCD mặt sau vào khung',
    photo_3x4: 'Căn chỉnh ảnh 3x4 vào khung'
};

// Guide texts
const GUIDE_TEXTS = {
    cccd_front: 'Đặt CCCD nằm ngang, canh đều 4 góc',
    cccd_back: 'Đặt CCCD nằm ngang, canh đều 4 góc',
    photo_3x4: 'Đặt khuôn mặt vào giữa, vai nằm ở đáy khung'
};

export default function ImageCropModal({
    image,
    onCropComplete,
    onClose,
    type = 'cccd_front' // cccd_front, cccd_back, photo_3x4
}) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(0.7);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Get aspect ratio based on type
    const aspectRatio = ASPECT_RATIOS[type] || 4 / 3;
    const title = TEMPLATE_TITLES[type] || 'Chỉnh sửa ảnh';
    const guideText = GUIDE_TEXTS[type] || 'Di chuyển và zoom để căn chỉnh';

    const onCropChange = (newCrop) => {
        setCrop(newCrop);
    };

    const onZoomChange = (newZoom) => {
        setZoom(newZoom);
    };

    const onCropAreaChange = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const handleCropConfirm = async () => {
        if (!croppedAreaPixels) return;

        try {
            const croppedImage = await getCroppedImg(
                image,
                croppedAreaPixels,
                rotation
            );
            onCropComplete(croppedImage);
        } catch (error) {
            console.error('Crop failed:', error);
            alert('Không thể cắt ảnh. Vui lòng thử lại.');
        }
    };

    return (
        <div className="crop-modal-overlay" onClick={onClose}>
            <div className="crop-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="crop-modal-header">
                    <h3>{title}</h3>
                    <button className="crop-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Guide instruction */}
                <div className="crop-guide-banner">
                    <Move size={16} />
                    <span>{guideText}</span>
                </div>

                <div className="crop-container">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspectRatio}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onRotationChange={setRotation}
                        onCropComplete={onCropAreaChange}
                        minZoom={0.5}
                        maxZoom={3}
                        restrictPosition={false}
                        cropShape={type === 'photo_3x4' ? 'rect' : 'rect'}
                        showGrid={false}
                        style={{
                            containerStyle: {
                                background: '#000'
                            },
                            cropAreaStyle: {
                                border: '2px solid #f97316',
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.9)'
                            }
                        }}
                    />
                </div>

                <div className="crop-controls">
                    <div className="control-col">
                        <div className="control-group">
                            <label>Zoom: {zoom.toFixed(1)}x</label>
                            <input
                                type="range"
                                min={0.5}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="slider-input"
                            />
                        </div>
                        <div className="control-group">
                            <label>Xoay nghiêng: {rotation}°</label>
                            <input
                                type="range"
                                min={0}
                                max={360}
                                step={1}
                                value={rotation}
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="slider-input"
                            />
                        </div>
                    </div>

                    <div className="rotate-actions">
                        <button className="rotate-btn" onClick={handleRotate}>
                            <RotateCw size={18} />
                            +90°
                        </button>
                    </div>
                </div>

                {/* Tips section */}
                <div className="crop-tips">
                    {type === 'photo_3x4' ? (
                        <p>💡 Canh khuôn mặt nằm giữa khung, từ đỉnh đầu đến vai</p>
                    ) : (
                        <p>💡 Canh 4 góc CCCD nằm đều trong khung màu cam</p>
                    )}
                </div>

                <div className="crop-modal-footer">
                    <button className="crop-cancel-btn" onClick={onClose}>
                        Hủy
                    </button>
                    <button className="crop-confirm-btn" onClick={handleCropConfirm}>
                        <Check size={18} />
                        Xác nhận & Tải lên
                    </button>
                </div>
            </div>
        </div>
    );
}

ImageCropModal.propTypes = {
    image: PropTypes.string.isRequired,
    onCropComplete: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    type: PropTypes.oneOf(['cccd_front', 'cccd_back', 'photo_3x4'])
};

/**
 * Create cropped image from canvas
 */
/**
 * Create cropped image from canvas
 */
async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxSize = 2048;

    // Calculate bounding box of the rotated image
    const rotRad = (rotation * Math.PI) / 180;
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // Set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate context to center of canvas
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Draw the original image onto the rotated context
    ctx.drawImage(image, 0, 0);

    // Get the cropped image data from the rotated canvas
    const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    );

    // Create a new canvas for the final cropped output
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Put the cropped image data onto the new canvas
    ctx.putImageData(data, 0, 0);

    // Resize if too large (to avoid huge file uploads)
    if (canvas.width > maxSize || canvas.height > maxSize) {
        const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = canvas.width * scale;
        resizedCanvas.height = canvas.height * scale;
        const resizedCtx = resizedCanvas.getContext('2d');
        resizedCtx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);

        return new Promise((resolve) => {
            resizedCanvas.toBlob((blob) => {
                resolve(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.9);
        });
    }

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
    });
}

// Helper to calculate bounding box of rotated image
function rotateSize(width, height, rotation) {
    const rotRad = (rotation * Math.PI) / 180;

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

function createImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.src = url;
    });
}
