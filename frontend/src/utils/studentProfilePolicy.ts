export const STUDENT_PROFILE_SELF_SERVICE_NOTE =
  'Sinh viên có thể tự cập nhật toàn bộ thông tin hồ sơ và ảnh giấy tờ trực tiếp từ màn này.';

export function buildStudentSelfServicePayload(formData) {
  return {
    cccd: formData?.cccd ?? '',
    ho: formData?.ho ?? '',
    ten_dem: formData?.ten_dem ?? '',
    ten: formData?.ten ?? '',
    ngay_sinh: formData?.ngay_sinh ?? '',
    gioi_tinh: formData?.gioi_tinh ?? '',
    noi_sinh: formData?.noi_sinh ?? '',
    dan_toc: formData?.dan_toc ?? '',
    quoc_tich: formData?.quoc_tich ?? '',
    sdt: formData?.sdt ?? '',
    email: formData?.email ?? '',
    dia_chi: formData?.dia_chi ?? '',
    ngay_cap_cccd: formData?.ngay_cap_cccd ?? '',
    don_vi_cong_tac: formData?.don_vi_cong_tac ?? '',
    cccd_front_image_id: formData?.cccd_front_image_id,
    cccd_back_image_id: formData?.cccd_back_image_id,
    photo_3x4_image_id: formData?.photo_3x4_image_id,
  };
}
