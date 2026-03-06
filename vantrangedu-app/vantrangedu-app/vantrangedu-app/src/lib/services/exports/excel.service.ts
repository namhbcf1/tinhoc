import * as ExcelJS from "exceljs";

export async function generateDebtReportExcel(
	data: { name: string; phone: string; debt: number }[],
) {
	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet("Danh Sách Công Nợ", {
		views: [{ state: "frozen", ySplit: 1 }],
	});

	// Style Header
	sheet.columns = [
		{ header: "STT", key: "stt", width: 10 },
		{ header: "Họ và Tên", key: "name", width: 30 },
		{ header: "Số Điện Thoại", key: "phone", width: 20 },
		{ header: "Số Tiền Nợ (VNĐ)", key: "debt", width: 25 },
	];

	sheet.getRow(1).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
	sheet.getRow(1).fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF004B87" },
	}; // VantrangEdu Blue

	// Đổ dữ liệu
	data.forEach((item, index) => {
		const row = sheet.addRow({
			stt: index + 1,
			name: item.name,
			phone: item.phone,
			debt: item.debt,
		});

		// Đỏ nếu nợ > 0
		if (item.debt > 0) {
			row.getCell("debt").font = { color: { argb: "FFFF0000" } };
		}
	});

	// Trả về Buffer để Next.js Response bắn xuống file .xlsx
	const buffer = await workbook.xlsx.writeBuffer();
	return buffer;
}
