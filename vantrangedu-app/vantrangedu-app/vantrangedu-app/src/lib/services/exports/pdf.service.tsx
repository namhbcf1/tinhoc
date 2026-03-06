import {
	Document,
	Font,
	Page,
	renderToStream,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import React from "react";

// Đăng ký Font Tiếng Việt (Tải mẫu ttf từ public URL hoặc R2 để Edge tương thích)
// Font.register({ family: 'Roboto', src: 'https://cdn.vantrangedu.com/fonts/Roboto-Regular.ttf' });

const styles = StyleSheet.create({
	page: { flexDirection: "column", backgroundColor: "#FFFFFF", padding: 50 },
	header: {
		fontSize: 24,
		textAlign: "center",
		marginBottom: 20,
		color: "#004B87",
		fontWeight: "bold",
	},
	subHeader: { fontSize: 18, textAlign: "center", marginBottom: 40 },
	body: { fontSize: 14, textAlign: "center", lineHeight: 2 },
	footer: {
		position: "absolute",
		bottom: 50,
		left: 50,
		right: 50,
		textAlign: "center",
		fontSize: 10,
		color: "#666",
	},
});

const CertificateTemplate = ({
	studentName,
	courseName,
	issueDate,
	certId,
}: any) => (
	<Document>
		<Page size="A4" orientation="landscape" style={styles.page}>
			<View>
				<Text style={styles.header}>TRUNG TÂM ĐÀO TẠO VANTRANGEDU</Text>
				<Text style={styles.subHeader}>GIẤY CHỨNG NHẬN</Text>

				<Text style={styles.body}>Chứng nhận học viên: {studentName}</Text>
				<Text style={styles.body}>
					Đã hoàn thành xuất sắc khóa học: {courseName}
				</Text>
				<Text style={styles.body}>Ngày cấp: {issueDate}</Text>
			</View>
			<Text style={styles.footer}>
				Mã tra cứu chứng chỉ: {certId} - vantrangedu.com/tra-cuu
			</Text>
		</Page>
	</Document>
);

export async function generateCertificatePDF(data: any) {
	// Trả về luồng PDF stream thẳng đến UI
	return await renderToStream(<CertificateTemplate {...data} />);
}
