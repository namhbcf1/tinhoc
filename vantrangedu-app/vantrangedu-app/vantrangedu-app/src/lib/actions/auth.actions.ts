"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import { comparePassword } from "../services/hash.service";
import { signToken } from "../services/jwt.service";

export async function loginAction(prevState: any, formData: FormData) {
	const phone = formData.get("phone") as string;
	const password = formData.get("password") as string;

	if (!phone || !password) {
		return { error: "Vui lòng nhập số điện thoại và mật khẩu" };
	}

	try {
		// 1. Trong Server Component ta phải passing Cloudflare Binding
		// Tuy nhiên ở bản dev này, tạm thời mock DB check:
		const db = getDb(process.env as any); // Khi Deploy, context.env có sẵn

		// Tìm user theo số điện thoại
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.phone, phone))
			.limit(1);

		if (!user) {
			return { error: "Sai số điện thoại hoặc mật khẩu" };
		}

		if (user.status !== "active") {
			return { error: "Tài khoản của bạn đang bị khóa!" };
		}

		// 2. Kiểm tra Hash
		const isValid = await comparePassword(password, user.password_hash);
		if (!isValid) {
			return { error: "Sai số điện thoại hoặc mật khẩu" };
		}

		// 3. Tạo Token (Session Cookie)
		const token = await signToken({
			id: user.id,
			phone: user.phone,
			role: user.role as any,
			name: user.name,
		});

		// 4. Set Cookie Trực tiếp từ Server Action
		cookies().set("van_session", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			maxAge: 7 * 24 * 60 * 60, // 7 days
			path: "/",
		});

		// Đẩy Router về đúng nhánh Role
		if (["super_admin", "admin"].includes(user.role)) {
			redirect("/admin/dashboard");
		} else if (user.role === "teacher") {
			redirect("/giao-vien/lich-day");
		} else {
			redirect("/tai-khoan/lich-hoc");
		}
	} catch (err: any) {
		if (err.message === "NEXT_REDIRECT") throw err; // Next.js specific
		console.error("Login Error:", err);
		return { error: "Hệ thống đang bận, vui lòng thử lại sau!" };
	}
}

export async function logoutAction() {
	cookies().delete("van_session");
	redirect("/dang-nhap");
}
