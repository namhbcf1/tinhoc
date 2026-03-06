import { Hono } from 'hono';
import XLSX from 'xlsx-js-style';
import { errorResponse, formatDate } from '../utils/helpers.js';
import { getRegistrationsByClass, getClassById } from '../db/queries.js';

const exportRoute = new Hono();

// Format date as DD/MM/YYYY for Vietnamese locale Excel export
function formatDateVN(date) {
  if (!date) return '';
  try {
    // If already in dd/mm/yyyy format, return as is
    if (typeof date === 'string' && date.includes('/')) {
      const parts = date.split('/');
      if (parts.length === 3 && parts[0].length <= 2) {
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
    // Parse date and format as DD/MM/YYYY
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

// Border style chuẩn - đường viền đen mỏng 4 góc
const borderStyle = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } }
};

// ========================================
// GET /export/class/:class_id - Xuất Excel danh sách theo form chuẩn
// ========================================
exportRoute.get('/class/:class_id', async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));

    // 1. Lấy thông tin lớp
    const classInfo = await getClassById(c.env.DB, classId);
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    // 2. Lấy danh sách đăng ký
    const registrations = await getRegistrationsByClass(c.env.DB, classId);

    // 3. Tạo workbook
    const workbook = XLSX.utils.book_new();

    // Headers theo mẫu form chuẩn
    const headers = [
      'Họ và tên đệm',
      'Tên',
      'Ngày tháng năm sinh',
      'Giới tính',
      'Dân tộc',
      'SĐT',
      'Email',
      'Số CCCD',
      'Ngày cấp CCCD',
      'NƠI SINH\n(Chỉ ghi tên tỉnh/TP - ví dụ: Hà Nội)\n\nGHI THEO ĐỊA CHỈ TRÊN CCCD CÒN HIỆU LỰC',
      'ĐƠN VỊ CÔNG TÁC/HỌC TẬP\n(Ví dụ: Sinh viên trường Đại học Công nghiệp)',
      'BẢN CUNG CẤP THÔNG TIN CƯ THỂ VỀ NƠI ĐANG Ở HIỆN NAY\n(Ghi cụ thể: số nhà, tổ, khu phố, tên đường, ấp/xã/phường, tỉnh / TP ....)\nGHI THEO ĐỊA CHỈ MỚI SAU SÁP NHẬP'
    ];

    // 4. Tạo data rows
    const dataRows = registrations.map((reg) => {
      const hoVaTenDem = (reg.ho || '') + (reg.ten_dem ? ' ' + reg.ten_dem : '');
      return [
        hoVaTenDem,
        reg.ten || '',
        formatDateVN(reg.ngay_sinh),
        reg.gioi_tinh || '',
        reg.dan_toc || 'Kinh',
        reg.sdt || '',
        reg.email || '',
        reg.cccd || '',
        formatDateVN(reg.ngay_cap_cccd),
        reg.noi_sinh || '',
        reg.don_vi_cong_tac || reg.dia_chi || '',
        reg.don_vi_cong_tac ? (reg.dia_chi || '') : '',
      ];
    });

    // 5. Tạo worksheet
    const wsData = [headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // 6. Thiết lập độ rộng cột
    worksheet['!cols'] = [
      { wch: 22 },  // Họ và tên đệm
      { wch: 12 },  // Tên
      { wch: 18 },  // Ngày sinh
      { wch: 10 },  // Giới tính
      { wch: 10 },  // Dân tộc
      { wch: 15 },  // SĐT
      { wch: 28 },  // Email
      { wch: 18 },  // Số CCCD
      { wch: 18 },  // Ngày cấp CCCD
      { wch: 28 },  // Nơi sinh
      { wch: 32 },  // Đơn vị công tác
      { wch: 50 },  // Địa chỉ hiện tại
    ];

    // 7. Thiết lập chiều cao hàng
    worksheet['!rows'] = [{ hpt: 90 }]; // Header row cao

    // 8. Áp dụng style cho tất cả cells (borders + formatting)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { v: '', t: 's' };
        }

        // Style cho header row
        if (row === 0) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11, bold: true },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            fill: { fgColor: { rgb: 'E2EFDA' } } // Màu xanh nhạt như mẫu
          };
        } else {
          // Style cho data rows
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11 },
            border: borderStyle,
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách');

    // 9. Tạo buffer và return
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Danh-sach-${classInfo.ma_lop || classInfo.ten_lop.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Upload to R2
    try {
      await c.env.R2.put(filename, excelBuffer, {
        httpMetadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    } catch (r2Error) {
      console.error('R2 upload error:', r2Error);
    }


    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return errorResponse('Lỗi xuất Excel: ' + error.message, 500);
  }
});

// ========================================
// GET /export/class/:class_id/json - Xuất JSON (để preview)
// ========================================
exportRoute.get('/class/:class_id/json', async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));

    const classInfo = await getClassById(c.env.DB, classId);
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    const registrations = await getRegistrationsByClass(c.env.DB, classId);

    return new Response(JSON.stringify({
      success: true,
      class: classInfo,
      registrations,
      count: registrations.length,
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// GET /export/class/:class_id/csv - Xuất CSV
// ========================================
exportRoute.get('/class/:class_id/csv', async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));
    const classInfo = await getClassById(c.env.DB, classId);
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    const registrations = await getRegistrationsByClass(c.env.DB, classId);

    // Convert to CSV
    const headers = ['STT', 'Số phách', 'Số CMT', 'Họ', 'Tên', 'Ngày sinh', 'Nơi sinh', 'Giới tính', 'Email', 'SĐT', 'Địa chỉ', 'Trạng thái', 'Nộp phí'];
    const csvRows = registrations.map((reg, index) => {
      const nopPhi = (reg.payment_status === 'confirmed' || reg.payment_status === 'paid') ? 'Đã nộp' : 'Chưa nộp';
      const statusMap = {
        'pending': 'Chờ duyệt',
        'approved': 'Đã duyệt',
        'studying': 'Đang học',
        'completed': 'Hoàn thành',
        'certified': 'Đã cấp chứng chỉ',
        'cancelled': 'Đã hủy'
      };
      const trangThai = statusMap[reg.status] || reg.status;

      return [
        index + 1,
        reg.so_phach || '',
        reg.cccd || '',
        (reg.ho || '') + (reg.ten_dem ? ' ' + reg.ten_dem : ''),
        reg.ten || '',
        formatDateVN(reg.ngay_sinh),
        reg.noi_sinh || '',
        reg.gioi_tinh || '',
        reg.email || '',
        reg.sdt || '',
        reg.dia_chi || '',
        trangThai,
        nopPhi,
      ].map(val => {
        const str = String(val || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });

    const csv = [headers.join(','), ...csvRows].join('\n');
    const filename = `danh-sach-${classInfo.ten_lop.replace(/\s+/g, '-')}-${Date.now()}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return errorResponse('Lỗi xuất CSV: ' + error.message, 500);
  }
});

// ========================================
// GET /export/exam/:exam_id - Xuất Excel danh sách thí sinh theo form chuẩn
// ========================================
exportRoute.get('/exam/:exam_id', async (c) => {
  try {
    const examId = parseInt(c.req.param('exam_id'));

    // 1. Lấy thông tin kỳ thi
    const examInfo = await c.env.DB.prepare(
      'SELECT * FROM exam_schedules WHERE id = ?'
    ).bind(examId).first();

    if (!examInfo) {
      return errorResponse('Kỳ thi không tồn tại', 404);
    }

    // 2. Lấy danh sách thí sinh đã đăng ký (loại bỏ đã hủy)
    const registrations = await c.env.DB.prepare(`
      SELECT 
        s.id, s.ho, s.ten_dem, s.ten, s.ho_ten_full, s.ngay_sinh,
        s.noi_sinh, s.gioi_tinh, s.dan_toc, s.quoc_tich,
        s.email, s.sdt, s.cccd, s.dia_chi,
        s.ngay_cap_cccd, s.don_vi_cong_tac
      FROM exam_registrations er
      JOIN students s ON er.student_id = s.id
      WHERE er.exam_id = ? AND (er.status = 'approved' OR er.status IS NULL)
      ORDER BY s.ho_ten_full ASC
    `).bind(examId).all();

    const students = registrations.results || [];

    // 3. Tạo workbook
    const workbook = XLSX.utils.book_new();

    // Parse ngày thi
    const examDate = new Date(examInfo.exam_date);
    const day = examDate.getDate();
    const month = examDate.getMonth() + 1;
    const year = examDate.getFullYear();

    // Header organization rows
    const orgHeaders = [
      ['CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO', '', '', '', '', '', '', '', '', '', '', ''],
      ['THEO THÔNG TƯ 03/2014/TT-BTTTT', '', '', '', '', '', '', '', '', '', '', ''],
      [`DANH SÁCH THÍ SINH - ${examInfo.exam_name}`, '', '', '', '', '', '', '', '', '', '', ''],
      [`Thời gian: ngày ${day} tháng ${String(month).padStart(2, '0')} năm ${year}`, '', '', '', '', '', '', '', '', '', '', ''],
      [`Địa điểm thi: ${examInfo.location || 'Chưa xác định'}`, '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
    ];

    // Headers cột theo mẫu form chuẩn
    const headers = [
      'Họ và tên đệm',
      'Tên',
      'Ngày tháng năm sinh',
      'Giới tính',
      'Dân tộc',
      'SĐT',
      'Email',
      'Số CCCD',
      'Ngày cấp CCCD',
      'NƠI SINH\n(Chỉ ghi tên tỉnh/TP - ví dụ: Hà Nội)\n\nGHI THEO ĐỊA CHỈ TRÊN CCCD CÒN HIỆU LỰC',
      'ĐƠN VỊ CÔNG TÁC/HỌC TẬP\n(Ví dụ: Sinh viên trường Đại học Công nghiệp)',
      'BẢN CUNG CẤP THÔNG TIN CƯ THỂ VỀ NƠI ĐANG Ở HIỆN NAY\n(Ghi cụ thể: số nhà, tổ, khu phố, tên đường, ấp/xã/phường, tỉnh / TP ....)\nGHI THEO ĐỊA CHỈ MỚI SAU SÁP NHẬP'
    ];

    // 4. Tạo data rows
    const dataRows = students.map((s) => {
      const hoVaTenDem = (s.ho || '') + (s.ten_dem ? ' ' + s.ten_dem : '');
      return [
        hoVaTenDem,
        s.ten || '',
        formatDateVN(s.ngay_sinh),
        s.gioi_tinh || '',
        s.dan_toc || 'Kinh',
        s.sdt || '',
        s.email || '',
        s.cccd || '',
        formatDateVN(s.ngay_cap_cccd),
        s.noi_sinh || '',
        s.don_vi_cong_tac || s.dia_chi || '',
        s.don_vi_cong_tac ? (s.dia_chi || '') : '',
      ];
    });

    // 5. Tạo worksheet với org headers + column headers + data
    const wsData = [...orgHeaders, headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // 6. Merge cells cho Organization Header
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, // ĐẠI HỌC CÔNG ĐOÀN
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }, // TRUNG TÂM TIN HỌC
      { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } }, // DANH SÁCH THÍ SINH
      { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } }, // Thời gian
      { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } }, // Hội đồng thi
    ];

    // 7. Thiết lập độ rộng cột
    worksheet['!cols'] = [
      { wch: 22 },  // Họ và tên đệm
      { wch: 10 },  // Tên
      { wch: 12 },  // Ngày sinh
      { wch: 8 },   // Giới tính
      { wch: 8 },   // Dân tộc
      { wch: 12 },  // SĐT
      { wch: 25 },  // Email
      { wch: 14 },  // Số CCCD
      { wch: 12 },  // Ngày cấp CCCD
      { wch: 20 },  // Nơi sinh
      { wch: 25 },  // Đơn vị công tác
      { wch: 40 },  // Địa chỉ hiện tại
    ];

    // 8. Thiết lập chiều cao hàng
    worksheet['!rows'] = [
      { hpt: 20 }, { hpt: 20 }, { hpt: 30 }, { hpt: 20 }, { hpt: 20 }, { hpt: 10 }, // Header info rows
      { hpt: 45 } // Column header row
    ];

    // 9. Áp dụng style cho tất cả cells
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { v: '', t: 's' };
        }

        // Style chung: Font Times New Roman
        const baseStyle = {
          font: { name: 'Times New Roman', sz: 11 },
          alignment: { vertical: 'center', wrapText: true }
        };

        // Org Header Rows (0-4)
        if (row <= 4) {
          if (row <= 1) { // ĐH CÔNG ĐOÀN, TRUNG TÂM TIN HỌC
            worksheet[cellAddress].s = {
              font: { name: 'Times New Roman', sz: 12, bold: true },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          } else if (row === 2) { // DANH SÁCH THÍ SINH (Title lớn)
            worksheet[cellAddress].s = {
              font: { name: 'Times New Roman', sz: 16, bold: true, color: { rgb: '000000' } },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          } else { // Thời gian, Hội đồng thi
            worksheet[cellAddress].s = {
              font: { name: 'Times New Roman', sz: 12, italic: true },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
        // Column Header Row (6)
        else if (row === 6) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11, bold: true },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            fill: { fgColor: { rgb: 'E2EFDA' } } // Light Green background
          };
        }
        // Data Rows (7+)
        else if (row >= 7) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11 },
            border: borderStyle,
            alignment: {
              horizontal: [2, 3, 4, 5, 7, 8].includes(col) ? 'center' : 'left', // Center specific columns (Date, Gender, CCCD...)
              vertical: 'center',
              wrapText: true
            }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách thí sinh');

    // 9. Tạo buffer và return
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const fileDate = new Date(examInfo.exam_date).toISOString().split('T')[0];
    const filename = `DS-Thi-${examInfo.exam_name.replace(/\s+/g, '-')}-${fileDate}.xlsx`;

    // Upload to R2
    try {
      await c.env.R2.put(filename, excelBuffer, {
        httpMetadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    } catch (r2Error) {
      console.error('R2 upload error:', r2Error);
    }

    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Export exam error:', error);
    return errorResponse('Lỗi xuất Excel: ' + error.message, 500);
  }
});

// ========================================
// GET /export/exam/:exam_id/exam-list - Xuất "DANH SÁCH DỰ THI" theo mẫu chuẩn
// ========================================
exportRoute.get('/exam/:exam_id/exam-list', async (c) => {
  try {
    const examId = parseInt(c.req.param('exam_id'));

    // 1. Lấy thông tin kỳ thi (kèm template_id)
    const examInfo = await c.env.DB.prepare(
      'SELECT * FROM exam_schedules WHERE id = ?'
    ).bind(examId).first();

    if (!examInfo) {
      return errorResponse('Kỳ thi không tồn tại', 404);
    }

    // 2. Lấy danh sách thí sinh đã DUYỆT (chỉ approved/registered)
    const registrations = await c.env.DB.prepare(`
      SELECT 
        s.id, s.ho, s.ten_dem, s.ten, s.ho_ten_full, s.ngay_sinh,
        s.noi_sinh, s.gioi_tinh, s.dan_toc, s.quoc_tich,
        s.email, s.sdt, s.cccd, s.dia_chi,
        s.ngay_cap_cccd, s.don_vi_cong_tac
      FROM exam_registrations er
      JOIN students s ON er.student_id = s.id
      WHERE er.exam_id = ? AND er.status IN ('approved', 'registered')
      ORDER BY s.id ASC
    `).bind(examId).all();

    const students = registrations.results || [];

    // 2.1 Sort theo cột TÊN (cột E) nhưng giữ nguyên toàn bộ dòng dữ liệu
    // Ưu tiên: TEN -> HO -> TEN_DEM -> CCCD/ID, dùng localeCompare tiếng Việt để sắp xếp có dấu ổn hơn.
    students.sort((a, b) => {
      const aTen = (a.ten || '').trim();
      const bTen = (b.ten || '').trim();
      const cmpTen = aTen.localeCompare(bTen, 'vi', { sensitivity: 'base' });
      if (cmpTen !== 0) return cmpTen;

      const aHo = (a.ho || '').trim();
      const bHo = (b.ho || '').trim();
      const cmpHo = aHo.localeCompare(bHo, 'vi', { sensitivity: 'base' });
      if (cmpHo !== 0) return cmpHo;

      const aTenDem = (a.ten_dem || '').trim();
      const bTenDem = (b.ten_dem || '').trim();
      const cmpTenDem = aTenDem.localeCompare(bTenDem, 'vi', { sensitivity: 'base' });
      if (cmpTenDem !== 0) return cmpTenDem;

      const aKey = (a.cccd || a.id || '').toString();
      const bKey = (b.cccd || b.id || '').toString();
      return aKey.localeCompare(bKey, 'vi', { sensitivity: 'base' });
    });
    const examDate = new Date(examInfo.exam_date);
    const day = examDate.getDate();
    const month = examDate.getMonth() + 1;
    const year = examDate.getFullYear();

    // 3. CHECK TEMPLATE
    console.log('Checking template_id:', examInfo.template_id);
    if (examInfo.template_id) {
      try {
        const template = await c.env.DB.prepare(
          'SELECT * FROM excel_templates WHERE id = ?'
        ).bind(examInfo.template_id).first();

        console.log('Template found:', template ? template.name : 'null');

        if (template && template.file_key) {
          console.log('Fetching template from R2:', template.file_key);
          // Fetch from R2
          const object = await c.env.R2.get(template.file_key);
          console.log('R2 object:', object ? 'exists' : 'null');

          if (object) {
            const arrayBuffer = await object.arrayBuffer();
            console.log('Template file size:', arrayBuffer.byteLength);

            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            console.log('Worksheet loaded:', workbook.SheetNames[0]);

            // Update Date Cell if configured
            if (template.date_cell) {
              const dateValue = `Ngày thi: ${day}/${String(month).padStart(2, '0')}/${year}`;
              worksheet[template.date_cell] = { v: dateValue, t: 's' };
              console.log('Updated date cell:', template.date_cell, '=', dateValue);
            }

            // Fill Data
            const startRow = template.data_start_row || 10;
            const mapping = template.column_mapping ? JSON.parse(template.column_mapping) : null;
            console.log('Data start row:', startRow, 'Mapping:', mapping ? 'yes' : 'no');

            if (mapping) {
              // Custom mapping logic
              students.forEach((s, index) => {
                const rowIndex = (startRow - 1) + index; // Convert to 0-indexed

                Object.entries(mapping).forEach(([field, colLetter]) => {
                  const colIndex = XLSX.utils.decode_col(colLetter);
                  const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });

                  let value = '';
                  if (field === 'stt') value = index + 1;
                  else if (field === 'ho_ten') value = s.ho_ten_full || ((s.ho || '') + ' ' + (s.ten_dem || '') + ' ' + (s.ten || '')).trim();
                  else if (field === 'ngay_sinh') value = formatDateVN(s.ngay_sinh);
                  else if (field === 'ma_sv') value = s.cccd || s.id || '';
                  else if (field === 'ho_so') value = '';
                  else value = s[field] || '';

                  // Write value
                  if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' };
                  worksheet[cellAddress].v = value;
                });
              });
              console.log('Data filled for', students.length, 'students');
            }

            // Write buffer
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            const filename = `DS-PTIT-${examInfo.exam_name.replace(/\s+/g, '-')}.xlsx`;
            console.log('Returning template file:', filename);

            return new Response(excelBuffer, {
              headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Access-Control-Allow-Origin': '*',
              },
            });
          }
        }
      } catch (err) {
        console.error('Template export error, falling back to default:', err.message, err.stack);
      }
    }

    // ==========================================
    // DEFAULT LOGIC (VanTrang Form) - Copy lại logic cũ
    // ==========================================
    const workbook = XLSX.utils.book_new();

    // Header rows 
    const headerRows = [
      ['CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['THEO THÔNG TƯ 03/2014/TT-BTTTT', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['DANH SÁCH DỰ THI', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', `Thời gian: ngày ${day} tháng ${String(month).padStart(2, '0')} năm ${year}`, '', '', '', '', '', '', ''],
      ['', '', '', '', '', `Địa điểm thi: ${examInfo.location || 'Chưa xác định'}`, '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['STT', 'SỐ PHÁCH', 'SỐ CMT', 'HỌ', 'TÊN', 'NGÀY SINH', 'NƠI SINH', 'GIỚI TÍNH', 'DÂN TỘC', 'MÔN THI', '', 'KÝ TÊN', 'GHI CHÚ'],
      ['', '', '', '', '', '', '', '', '', 'LT', 'TH', '', ''],
    ];

    // Tạo data rows
    const dataRows = students.map((s, index) => {
      const hoVaTenDem = (s.ho || '') + (s.ten_dem ? ' ' + s.ten_dem : '');
      return [
        index + 1,
        '', // SỐ PHÁCH
        s.cccd || '',
        hoVaTenDem,
        s.ten || '',
        formatDateVN(s.ngay_sinh),
        s.noi_sinh || '',
        s.gioi_tinh || '',
        s.dan_toc || '',
        '', // LT
        '', // TH
        '', // KÝ TÊN
        '', // GHI CHÚ
      ];
    });

    const wsData = [...headerRows, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Merge cells
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
      { s: { r: 3, c: 5 }, e: { r: 3, c: 12 } },
      { s: { r: 4, c: 5 }, e: { r: 4, c: 12 } },
      { s: { r: 6, c: 9 }, e: { r: 6, c: 10 } },
    ];

    // Col widths
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
      { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 5 },
      { wch: 5 }, { wch: 12 }, { wch: 12 },
    ];

    // Styles
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '', t: 's' };

        if (row <= 2) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: row === 2 ? 14 : 12, bold: true },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        } else if (row >= 3 && row <= 5) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11, italic: true },
            alignment: { horizontal: 'left', vertical: 'center' },
          };
        } else if (row >= 6 && row <= 7) {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11, bold: true },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            fill: { fgColor: { rgb: 'D9E1F2' } }
          };
        } else {
          worksheet[cellAddress].s = {
            font: { name: 'Times New Roman', sz: 11 },
            border: borderStyle,
            alignment: { horizontal: col === 0 ? 'center' : 'left', vertical: 'center' }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách dự thi');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `DANHSACHDUTHI-${day}${String(month).padStart(2, '0')}${year}.xlsx`;

    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Export exam list error:', error);
    return errorResponse('Lỗi xuất danh sách dự thi: ' + error.message, 500);
  }
});


export default exportRoute;
