export const REGISTER_ERROR_COPY = {
  invalidForm: 'Vui lòng kiểm tra lại các mục đang được đánh dấu đỏ trước khi gửi hồ sơ.',
  missingFront: 'Vui lòng tải lên ảnh CCCD mặt trước',
  missingBack: 'Vui lòng tải lên ảnh CCCD mặt sau',
  missingPhoto: 'Vui lòng tải lên ảnh thẻ 3x4',
  missingAllImages: 'Vui lòng tải lên đầy đủ 3 ảnh: CCCD mặt trước, CCCD mặt sau và ảnh thẻ 3x4',
  submitFailed: 'Đăng ký thất bại. Vui lòng thử lại.',
} as const;

export const REGISTER_SUCCESS_COPY = {
  submitted: 'Đăng ký thành công! Thông tin của bạn đã được ghi nhận.',
} as const;
