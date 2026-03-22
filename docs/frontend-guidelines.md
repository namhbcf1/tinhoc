# Frontend Development Guidelines (Trường Phát Computer)

## 1. Principles
- **Strict Server Components**: Mặc định MỌI component là Server Component. Chỉ dùng `"use client"` ở nút lá (Interactive Elements như button, form, hooks).
- **Modularity**: KHÔNG CÓ FILE NÀO VƯỢT QUÁ 200 LINES. Bắt buộc tách nhỏ logic và UI.
- **Naming**: Bắt buộc `kebab-case` cho tên file (VD: `product-catalog.tsx`).
- **Language**: Toàn bộ UI, validation, lỗi BẮT BUỘC dùng Tiếng Việt.

## 2. Directory Structure
Hệ thống sử dụng Next.js 15 App Router:
- `app/admin/...`: Dành cho Quản trị viên (được bảo vệ bởi `adminGuard.ts`)
- `app/tai-khoan/...`: Dành cho Khách hàng (được bảo vệ bởi `customerGuard.ts`)
- `app/(storefront)/...`: Dành cho khách vãng lai (trang chủ, danh mục, giỏ hàng, PC builder)

## 3. UI/UX Rules (Tailwind & Shadcn)
- **Storefront**: Mobile-first, dùng Suspense streaming với skeleton loaders khi tải sản phẩm.
- **Admin**: Bảng dữ liệu (Data Tables) full tiếng Việt, tích hợp phân trang và tìm kiếm (Server-side).
- **Zod Exceptions**: Mọi Form bắt buộc dùng Zod schema với custom error map tiếng Việt.

## 4. Key Business Logic in UI
- **Tồn kho Serial-First**: UI hiển thị "Còn hàng" / "Hết hàng" thay vì số lượng thật cho khách lẻ.
- **Giá 4 Tầng**: Nhập liệu giá trong Admin phải cảnh báo (viền đỏ Tailwind) nếu `price_retail < cost_price`.
- **PC Builder**: Bắt buộc có Sidebar cố định báo giá và cảnh báo tương thích (Tiếng Việt).
