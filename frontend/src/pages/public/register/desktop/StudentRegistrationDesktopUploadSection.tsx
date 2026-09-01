import { Loader2 } from 'lucide-react';
import CCCDUploader from '../../../../components/upload/CCCDUploader';
import type { StudentRegistrationUploadSectionProps } from '../shared/student-registration-types';

export default function StudentRegistrationDesktopUploadSection({
  isProcessingUploads,
  processingItems,
  imageErrors,
  uploaderKeys,
  handleUploaderStatusChange,
  handleUploadSuccess,
  handleUploadError,
  watch,
}: StudentRegistrationUploadSectionProps) {
  return (
    <div className="upload-section" style={{ marginBottom: '24px' }}>
      <div className="upload-waiting-note" role="note" style={{ marginBottom: '16px' }}>
        Upload ảnh có thể cần chờ trong lúc hệ thống lưu và xử lý ảnh. Vui lòng không thoát khỏi trang trong lúc đang xử lý.
      </div>

      {isProcessingUploads && (
        <div className="upload-processing-panel" role="status" aria-live="polite" style={{ marginBottom: '16px' }}>
          <div className="upload-processing-header">
            <Loader2 size={20} className="animate-spin" />
            <div>
              <p className="upload-processing-title">Hệ thống đang xử lý ảnh hồ sơ</p>
              <p className="upload-processing-subtitle">Quá trình này có thể mất tới vài phút. Vui lòng không tải lại trang, đóng form hoặc thoát ra trong lúc hệ thống đang xử lý ảnh.</p>
            </div>
          </div>
          <div className="upload-processing-list">
            {processingItems.map((item) => (
              <div key={item.key} className="upload-processing-item">
                <div className="upload-processing-item-head">
                  <span className="upload-processing-item-title">{item.title}</span>
                  <span className="upload-processing-item-progress">{Math.min(Math.round(item.progress), 99)}%</span>
                </div>
                <p className="upload-processing-item-copy">{item.description}</p>
                <div className="upload-processing-track" aria-hidden="true">
                  <div className="upload-processing-fill" style={{ width: `${Math.min(item.progress, 99)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="upload-grid">
        <div className="upload-card">
          <p className="upload-label">Ảnh mặt TRƯỚC thẻ CCCD <span className="required">*</span></p>
          <CCCDUploader key={`cccd-front-${uploaderKeys.cccd_front}`} type="cccd_front" allowCamera={false} onStatusChange={handleUploaderStatusChange} onUploadSuccess={handleUploadSuccess} onUploadError={handleUploadError} />
          {imageErrors.cccd_front && <p className="upload-error-text">{imageErrors.cccd_front}</p>}
        </div>

        <div className="upload-card">
          <p className="upload-label">Ảnh mặt SAU thẻ CCCD <span className="required">*</span></p>
          <CCCDUploader key={`cccd-back-${uploaderKeys.cccd_back}`} type="cccd_back" allowCamera={false} onStatusChange={handleUploaderStatusChange} onUploadSuccess={handleUploadSuccess} onUploadError={handleUploadError} />
          {imageErrors.cccd_back && <p className="upload-error-text">{imageErrors.cccd_back}</p>}
        </div>

        <div className="upload-card">
          <p className="upload-label">Ảnh thẻ 3×4 <span className="required">*</span></p>
          <CCCDUploader key={`photo-${uploaderKeys.photo_3x4}`} type="photo_3x4" allowCamera={false} photoGenderHint={watch('gioi_tinh')} onStatusChange={handleUploaderStatusChange} onUploadSuccess={handleUploadSuccess} onUploadError={handleUploadError} />
          {imageErrors.photo_3x4 && <p className="upload-error-text">{imageErrors.photo_3x4}</p>}
        </div>
      </div>
    </div>
  );
}
