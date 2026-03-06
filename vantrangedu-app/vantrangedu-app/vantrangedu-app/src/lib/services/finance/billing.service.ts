import { and, eq, sum } from "drizzle-orm";
import { getDb } from "../../db/client";
import { class_students, classes, payments } from "../../db/schema";

/**
 * Tính tổng học phí mà 1 học sinh chưa đóng (Nợ)
 */
export async function calculateStudentDebt(studentId: number) {
	const db = getDb(process.env as any);

	// 1. Lấy tổng tiền các lớp học sinh đang lấy (Active)
	// Thực tế cần Left Join nhưng tôi mô phỏng logic query Drizzle
	const enrolledClasses = await db
		.select({
			price: classes.price,
		})
		.from(class_students)
		.leftJoin(classes, eq(class_students.class_id, classes.id))
		.where(
			and(
				eq(class_students.student_id, studentId),
				eq(class_students.status, "active"),
			),
		);

	const totalOwed = enrolledClasses.reduce(
		(acc, curr) => acc + (curr.price || 0),
		0,
	);

	// 2. Lấy tổng tiền học sinh đã đóng (Completed)
	const paidRecords = await db
		.select({
			totalPaid: sum(payments.amount),
		})
		.from(payments)
		.where(
			and(eq(payments.student_id, studentId), eq(payments.status, "completed")),
		);

	const totalPaid = Number(paidRecords[0]?.totalPaid || 0);

	// 3. Trả về dư nợ
	return {
		totalOwed,
		totalPaid,
		debt: totalOwed - totalPaid,
	};
}
