import { z } from 'zod';

export const viErrorMap: z.ZodErrorMap = (issue, ctx) => {
  let message = ctx.defaultError;

  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') {
        message = 'Trường này là bắt buộc';
      } else {
        message = `Kiểu dữ liệu không hợp lệ. Mong đợi ${issue.expected}, nhận được ${issue.received}`;
      }
      break;

    case z.ZodIssueCode.invalid_string:
      if (typeof issue.validation === 'string') {
        if (issue.validation === 'email') {
          message = 'Định dạng email không hợp lệ';
        } else if (issue.validation === 'url') {
          message = 'Đường dẫn URL không hợp lệ';
        } else if (issue.validation === 'uuid') {
          message = 'Định dạng UUID không hợp lệ';
        } else if (issue.validation === 'regex') {
          message = 'Định dạng không hợp lệ';
        } else {
          message = `Định dạng ${issue.validation} không hợp lệ`;
        }
      }
      break;

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        message = `Chuỗi phải chứa ít nhất ${issue.minimum} ký tự`;
      } else if (issue.type === 'number') {
        message = `Số phải lớn hơn ${issue.inclusive ? 'hoặc bằng ' : ''}${issue.minimum}`;
      } else if (issue.type === 'array') {
        message = `Mảng phải chứa ít nhất ${issue.minimum} phần tử`;
      } else if (issue.type === 'date') {
        message = `Ngày phải sau ${issue.inclusive ? 'hoặc bằng ' : ''}${new Date(Number(issue.minimum)).toLocaleDateString('vi-VN')}`;
      }
      break;

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        message = `Chuỗi không được vượt quá ${issue.maximum} ký tự`;
      } else if (issue.type === 'number') {
        message = `Số phải nhỏ hơn ${issue.inclusive ? 'hoặc bằng ' : ''}${issue.maximum}`;
      } else if (issue.type === 'array') {
        message = `Mảng không được vượt quá ${issue.maximum} phần tử`;
      } else if (issue.type === 'date') {
        message = `Ngày phải trước ${issue.inclusive ? 'hoặc bằng ' : ''}${new Date(Number(issue.maximum)).toLocaleDateString('vi-VN')}`;
      }
      break;

    case z.ZodIssueCode.custom:
      message = issue.message || 'Lỗi cấu hình không hợp lệ';
      break;

    case z.ZodIssueCode.invalid_date:
      message = 'Định dạng ngày không hợp lệ';
      break;

    case z.ZodIssueCode.invalid_enum_value:
      message = `Giá trị không hợp lệ. Các giá trị được chấp nhận: ${issue.options.map(String).join(', ')}`;
      break;

    case z.ZodIssueCode.unrecognized_keys:
      message = `Phát hiện khóa không được nhận dạng trong đối tượng: ${issue.keys.join(', ')}`;
      break;

    case z.ZodIssueCode.invalid_union:
      message = 'Dữ liệu không khớp với bất kỳ định dạng nào được cho phép';
      break;

    case z.ZodIssueCode.invalid_union_discriminator:
      message = `Giá trị phân biệt không hợp lệ. Mong đợi một trong: ${issue.options.join(', ')}`;
      break;

    case z.ZodIssueCode.invalid_arguments:
      message = 'Tham số hàm không hợp lệ';
      break;

    case z.ZodIssueCode.invalid_return_type:
      message = 'Kiểu trả về của hàm không hợp lệ';
      break;
  }

  return { message };
};

export const setupZodViErrorMap = () => {
  z.setErrorMap(viErrorMap);
};
