import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyToken } from "./lib/services/jwt.service";

const publicRoutes = ["/dang-nhap", "/dang-ky", "/api/auth/login"]; // Sẽ đổi URL sang VantrangEdu style

export async function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	// Bỏ qua public routes và static files/api
	if (
		publicRoutes.includes(pathname) ||
		pathname.startsWith("/_next") ||
		pathname.includes(".")
	) {
		return NextResponse.next();
	}

	const token = request.cookies.get("van_session")?.value;

	// Nếu không có token -> Văng ra Đăng nhập
	if (!token) {
		return NextResponse.redirect(new URL("/dang-nhap", request.url));
	}

	// Xác thực Token
	const payload = await verifyToken(token);
	if (!payload) {
		const response = NextResponse.redirect(new URL("/dang-nhap", request.url));
		response.cookies.delete("van_session");
		return response;
	}

	// 🔴 RBAC (Role-based access control) - Phân Quyền
	// 1. Chỉ Admin mới được vào /admin/*
	if (
		pathname.startsWith("/admin") &&
		!["super_admin", "admin"].includes(payload.role)
	) {
		return NextResponse.redirect(new URL("/tai-khoan", request.url));
	}

	// 2. Chỉ Teacher mới được vào /giao-vien/*
	if (
		pathname.startsWith("/giao-vien") &&
		payload.role !== "teacher" &&
		!["super_admin", "admin"].includes(payload.role)
	) {
		return NextResponse.redirect(new URL("/tai-khoan", request.url));
	}

	// 3. User thường (Student) có thể vào /tai-khoan/*

	// Thêm Header truyền data User Xuyên thủng các component
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-user-id", payload.id.toString());
	requestHeaders.set("x-user-role", payload.role);

	return NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});
}

// Chặn những route middleware sẽ quét qua
export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
