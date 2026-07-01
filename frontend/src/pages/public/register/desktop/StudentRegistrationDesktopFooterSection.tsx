import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { StudentRegistrationFooterSectionProps } from '../shared/student-registration-types';

export default function StudentRegistrationDesktopFooterSection({
  register,
  errors,
  fieldErrorId,
  errorMsg,
  successMsg,
  loading,
}: StudentRegistrationFooterSectionProps) {
  return (
    <>
    <div className="a4-section commitments-section">
      <label className="checkbox-row">
        <input type="checkbox" {...register('commit_accuracy')} aria-invalid={errors.commit_accuracy ? 'true' : 'false'} aria-describedby={errors.commit_accuracy ? fieldErrorId('commit_accuracy') : undefined} />
        <span>Tôi cam đoan và hoàn toàn chịu trách nhiệm về sự chính xác của ảnh và thông tin đã cung cấp trong Phiếu đăng ký dự thi.</span>
      </label>
      {errors.commit_accuracy && <p id={fieldErrorId('commit_accuracy')} className="error-text ml-6">{errors.commit_accuracy.message}</p>}

      <label className="checkbox-row">
        <input type="checkbox" {...register('commit_usage')} aria-invalid={errors.commit_usage ? 'true' : 'false'} aria-describedby={errors.commit_usage ? fieldErrorId('commit_usage') : undefined} />
        <span>Tôi đồng ý việc VAN TRANG EDU sử dụng các thông tin cá nhân này vào mục đích phục vụ các công tác liên quan đến kỳ thi.</span>
      </label>
      {errors.commit_usage && <p id={fieldErrorId('commit_usage')} className="error-text ml-6">{errors.commit_usage.message}</p>}
    </div>

    {/* ===== GHI CHÚ ===== */}
    <div className="a4-section notes-section">
      <p className="notes-title">Ghi chú:</p>
      <p className="note-item">
        <em>Thí sinh chỉ đủ điều kiện dự thi khi đã điền đầy đủ thông tin trên Phiếu đăng ký dự thi và chuyển khoản Phí dịch vụ thành công.</em>
      </p>
    </div>

    {/* Error / Success messages */}
    {errorMsg && (
      <div className="message-box error-box" role="alert" aria-live="assertive">
        <AlertCircle size={20} />
        <span>{errorMsg}</span>
      </div>
    )}
    {successMsg && (
      <div className="message-box success-box" role="status" aria-live="polite">
        <CheckCircle2 size={20} />
        <span>{successMsg}</span>
      </div>
    )}

    {/* Submit */}
    <div className="submit-container">
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? (
          <><Loader2 className="animate-spin mr-2" /> Đang gửi...</>
        ) : (
          'Hoàn tất đăng ký'
        )}
      </button>
    </div>

    <div className="back-link">
      <Link to="/login"><Info size={14} /> Quay lại Đăng nhập</Link>
    </div>
    </>
  );
}

