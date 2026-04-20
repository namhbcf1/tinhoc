export function hasProgramPlatformOperatorAccess(user) {
    const role = user?.role || user?.type || user?.user_type || null;
    return role === 'admin' || role === 'super_admin';
}
export function getProgramPlatformErrorMessage(error, fallback) {
    const message = error instanceof Error ? error.message : String(error || '').trim();
    if (!message) {
        return fallback;
    }
    if (/Organizer name and code are required/i.test(message)) {
        return 'Đơn vị phải có tên và mã';
    }
    if (/Program name and code are required/i.test(message)) {
        return 'Chương trình phải có tên và mã';
    }
    if (/Level name and code are required/i.test(message)) {
        return 'Trình độ phải có tên và mã';
    }
    if (/Field option label and value are required/i.test(message)) {
        return 'Field option phải có nhãn và giá trị';
    }
    if (/Field definition is required/i.test(message)) {
        return 'Field definition không tồn tại hoặc chưa được chọn';
    }
    if (/Organizer is required/i.test(message)) {
        return 'Vui lòng chọn đơn vị tổ chức hợp lệ';
    }
    if (/Organizer not found/i.test(message)) {
        return 'Không tìm thấy đơn vị tổ chức';
    }
    if (/Program is required/i.test(message)) {
        return 'Vui lòng chọn chương trình hợp lệ';
    }
    if (/Program not found/i.test(message)) {
        return 'Không tìm thấy chương trình';
    }
    if (/Level not found/i.test(message)) {
        return 'Không tìm thấy trình độ';
    }
    if (/Invalid delivery_mode/i.test(message)) {
        return 'delivery_mode không hợp lệ';
    }
    if (/Invalid assessment_mode/i.test(message)) {
        return 'assessment_mode không hợp lệ';
    }
    if (/Invalid schedule_model/i.test(message)) {
        return 'schedule_model không hợp lệ';
    }
    if (/Invalid field definition payload/i.test(message)) {
        return 'Field definition không hợp lệ';
    }
    if (/Invalid field_type/i.test(message)) {
        return 'field_type không hợp lệ';
    }
    if (/UNIQUE constraint failed: program_organizers\.code/i.test(message)) {
        return 'Mã đơn vị đã tồn tại';
    }
    if (/UNIQUE constraint failed: programs\.organizer_uuid, programs\.code/i.test(message) ||
        /idx_programs_organizer_code/i.test(message)) {
        return 'Mã chương trình đã tồn tại trong đơn vị này';
    }
    if (/UNIQUE constraint failed: program_levels\.program_uuid, program_levels\.code/i.test(message) ||
        /idx_program_levels_program_code/i.test(message)) {
        return 'Mã trình độ đã tồn tại trong chương trình này';
    }
    if (/UNIQUE constraint failed: field_definitions\.field_key/i.test(message)) {
        return 'Field key đã tồn tại';
    }
    if (/UNIQUE constraint failed: field_options\.field_definition_uuid, field_options\.value/i.test(message) ||
        /idx_field_options_definition_value/i.test(message)) {
        return 'Giá trị option đã tồn tại trong field này';
    }
    if (/FOREIGN KEY constraint failed/i.test(message)) {
        return 'Dữ liệu liên kết không hợp lệ hoặc đã bị xóa';
    }
    return message;
}
