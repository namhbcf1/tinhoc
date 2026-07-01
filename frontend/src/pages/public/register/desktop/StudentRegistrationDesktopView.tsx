import { Loader2, User } from 'lucide-react';
import SEO from '../../../../components/common/SEO';
import type { StudentRegistrationViewProps } from '../shared/student-registration-types';
import StudentRegistrationDesktopUploadSection from './StudentRegistrationDesktopUploadSection';
import StudentRegistrationDesktopFormFields from './StudentRegistrationDesktopFormFields';
import StudentRegistrationDesktopFooterSection from './StudentRegistrationDesktopFooterSection';


export default function StudentRegistrationDesktopView({
  handleFormFocusCapture,
  handleSubmit,
  onSubmit,
  handleInvalidSubmit,
  isProcessingUploads,
  processingItems,
  imageErrors,
  imageIds,
  uploaderKeys,
  handleUploaderStatusChange,
  handleUploadSuccess,
  handleUploadError,
  watch,
  register,
  errors,
  fieldErrorId,
  fieldHintId,
  getFieldA11y,
  watchedBirthPlace,
  setValue,
  errorMsg,
  successMsg,
  loading
}: StudentRegistrationViewProps) {
  return (
    <div className="a4-registration-page vt-registration-page vt-registration-page-desktop">
      <SEO
        title="Dang ky du thi"
        description="Form dang ky du thi truc tuyen cua Van Trang Education cho hoc vien va thi sinh."
        url="/register"
        structuredData={{
          '@type': 'WebPage',
          name: 'Dang ky du thi',
          description: 'Phieu dang ky du thi truc tuyen cua Van Trang Education.',
          url: 'https://vantrangedu.com/register'
        }}
      />
      <div className="a4-form-wrapper vt-registration-paper">

        {/* Header */}
        <div className="a4-header">
          <div className="header-left">
            <p className="org-label">HỆ THỐNG GIÁO DỤC</p>
            <p className="org-name">CÔNG TY TNHH TƯ VẤN GIÁO DỤC SƠN TRANG</p>
          </div>
          <div className="header-right">
            <p className="brand-name">VAN TRANG EDUCATION</p>
            <p className="brand-subtitle">PROFESSIONAL COMMUNITY SUPPORT</p>
          </div>
        </div>

        <div className="a4-title">
          <h1>PHIẾU ĐĂNG KÝ DỰ THI</h1>
          <p className="a4-subtitle">Hệ thống thu thập hồ sơ và quản lý học viên trực tuyến</p>
        </div>

        <form noValidate onFocusCapture={handleFormFocusCapture} onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}>

          {/* ===== SECTION I: THÔNG TIN CÁ NHÂN ===== */}
          <div className="a4-section vt-registration-section">
            <div className="section-header-row">
              <div className="section-icon"><User size={18} /></div>
              <h2>I. THÔNG TIN CÁ NHÂN</h2>
            </div>
            <StudentRegistrationDesktopUploadSection
              isProcessingUploads={isProcessingUploads}
              processingItems={processingItems}
              imageErrors={imageErrors}
              imageIds={imageIds}
              uploaderKeys={uploaderKeys}
              handleUploaderStatusChange={handleUploaderStatusChange}
              handleUploadSuccess={handleUploadSuccess}
              handleUploadError={handleUploadError}
              watch={watch}
            />

            <StudentRegistrationDesktopFormFields
              register={register}
              errors={errors}
              fieldErrorId={fieldErrorId}
              fieldHintId={fieldHintId}
              getFieldA11y={getFieldA11y}
              watchedBirthPlace={watchedBirthPlace}
              setValue={setValue}
            />
          </div>
{/* ===== CAM KẾT ===== */}
           <StudentRegistrationDesktopFooterSection
            register={register}
            errors={errors}
            fieldErrorId={fieldErrorId}
            errorMsg={errorMsg}
            successMsg={successMsg}
            loading={loading}
          />
        </form>
      </div>

      {isProcessingUploads ? (
        <div className="register-processing-floating" role="status" aria-live="polite">
          <div className="register-processing-floating-card">
            <div className="register-processing-floating-head">
              <Loader2 size={18} className="animate-spin" />
              <div>
                <p className="register-processing-floating-title">Hệ thống đang xử lý ảnh hồ sơ</p>
                <p className="register-processing-floating-subtitle">Vui lòng chờ, đừng tắt trang trong lúc hệ thống đang xử lý ảnh.</p>
              </div>
            </div>
            <div className="register-processing-floating-list">
              {processingItems.map((item) => (
                <div key={`floating-${item.key}`} className="register-processing-floating-item">
                  <div className="register-processing-floating-item-head">
                    <span>{item.title}</span>
                    <strong>{Math.min(Math.round(item.progress), 99)}%</strong>
                  </div>
                  <p>{item.description}</p>
                  <div className="register-processing-floating-track" aria-hidden="true">
                    <div className="register-processing-floating-fill" style={{ width: `${Math.min(item.progress, 99)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}


