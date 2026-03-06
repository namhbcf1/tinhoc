"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "../db/client";
import {
	assignments,
	attendance,
	class_schedules,
	classes,
	student_assignments,
} from "../db/schema";

// ==========================================
// 1. Quản lý Lớp (Classes)
// ==========================================
export async function createClass(formData: FormData) {
	const db = getDb(process.env as any);

	const name = formData.get("name") as string;
	const type = formData.get("type") as "online" | "offline";
	const price = Number(formData.get("price")) || 0;

	await db.insert(classes).values({
		name,
		type,
		price,
		status: "enrolling",
	});

	revalidatePath("/admin/classes");
	return { success: true };
}

// ==========================================
// 2. Lập Lịch Học (Schedules)
// ==========================================
export async function createSchedule(classId: number, formData: FormData) {
	const db = getDb(process.env as any);

	const date = formData.get("date") as string; // YYYY-MM-DD
	const start_time = formData.get("start_time") as string;
	const end_time = formData.get("end_time") as string;
	const room = formData.get("room") as string;
	const meeting_link = formData.get("meeting_link") as string;

	// Gọi Google Calendar Service ở đây (Phase kế tiếp sẽ ghép vào)
	const googleEventId = "fake-gcal-id";

	await db.insert(class_schedules).values({
		class_id: classId,
		date,
		start_time,
		end_time,
		room,
		meeting_link,
		google_event_id: googleEventId,
	});

	revalidatePath(`/admin/classes/${classId}/schedules`);
	return { success: true };
}

// ==========================================
// 3. Điểm Danh 1 Chạm (Attendance)
// ==========================================
export async function markAttendance(
	scheduleId: number,
	studentId: number,
	status: "present" | "absent" | "late",
) {
	const db = getDb(process.env as any);

	// Check if existed
	const existing = await db
		.select()
		.from(attendance)
		.where(
			and(
				eq(attendance.schedule_id, scheduleId),
				eq(attendance.student_id, studentId),
			),
		)
		.limit(1);

	if (existing.length > 0) {
		await db
			.update(attendance)
			.set({ status })
			.where(eq(attendance.id, existing[0].id));
	} else {
		await db.insert(attendance).values({
			schedule_id: scheduleId,
			student_id: studentId,
			status,
		});
	}

	return { success: true };
}

// ==========================================
// 4. Bài Tập (Assignments)
// ==========================================
export async function createAssignment(
	classId: number,
	title: string,
	deadline: string,
	fileUrl?: string,
) {
	const db = getDb(process.env as any);

	await db.insert(assignments).values({
		class_id: classId,
		title,
		deadline,
		file_url: fileUrl,
	});

	revalidatePath(`/admin/classes/${classId}/assignments`);
	return { success: true };
}

export async function submitStudentAssignment(
	assignmentId: number,
	studentId: number,
	submissionUrl: string,
) {
	const db = getDb(process.env as any);

	await db.insert(student_assignments).values({
		assignment_id: assignmentId,
		student_id: studentId,
		submission_url: submissionUrl,
	});

	return { success: true };
}

// ==========================================
// 5. Chấm Điểm Bài Tập (Grade)
// ==========================================
export async function gradeAssignment(
	submissionId: number,
	score: number,
	feedback: string,
) {
	const db = getDb(process.env as any);

	await db
		.update(student_assignments)
		.set({ score, feedback })
		.where(eq(student_assignments.assignment_id, submissionId)); // TODO: Fix to proper primary key checking if needed

	return { success: true };
}
