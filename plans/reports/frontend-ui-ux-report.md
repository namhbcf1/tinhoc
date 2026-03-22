# Báo cáo Phân tích UI/UX & Kiến trúc Frontend - Trường Phát Computer

## 1. Kiến trúc Tổng thể & Modularity
- **Server Components Mặc định**: 100% Next.js 15 App Router mặc định dùng Server Components (RSC). Chỉ dùng `"use client"` ở nút lá (interactive components).
- **Quy tắc < 200 dòng**: Bắt buộc tách file. Sử dụng Container-Presenter pattern để chia nhỏ các component phức tạp. 
- **Quy ước Đặt tên**: Bắt buộc dùng `kebab-case` cho tên file (VD: `product-catalog.tsx`, `pc-builder-module.ts`).
- **Phản hồi API Chuẩn**: Mọi custom hook/action cần xử lý đúng type `{success, data, meta}` hoặc `{success:false, error:{message,code}}`.

## 2. Trải nghiệm Khách hàng (Storefront UI/UX)

### 2.1. Catalog & Tồn kho (Serial-First)
- **UI/UX**: Dùng React 19 / Next.js 15 Suspense streaming với skeleton loaders khi tải sản phẩm. Lưới sản phẩm (Grid) đáp ứng mobile-first qua Tailwind.
- **Nghiệp vụ Tồn kho**: Tính động (`COUNT status='available'`), hiển thị nhãn "Còn hàng" / "Hết hàng" (không hiển thị số lượng cụ thể cho khách lẻ).
- **Hiển thị Giá**: Chỉ show `price_retail` cho khánh vãng lai. Nếu đăng nhập tài khoản dealer, áp dụng `wholesale_price`.

### 2.2. Tìm kiếm (Search)
- **UI/UX**: Instant search dialog (Cmd+K) kèm debounce.
- **Kiến trúc**: Dùng `useSearchParams` truyền query xuống Server Component. Loại bỏ SELECT * ở DB, chỉ lấy `id`, `name`, `price_retail`, `image_url`.

### 2.3. Cart & OTP Auth (Khách hàng)
- **Auth Guard**: Route `/tai-khoan/*` bảo vệ bởi `customerGuard.ts`.
- **Đăng nhập OTP**: Tích hợp input mask số điện thoại VN. Nút "Gửi lại OTP" có đếm ngược.
- **Giỏ hàng**: Dùng Sheet (shadcn/ui), tính toán realtime bằng Server Actions (`revalidatePath`).

### 2.4. PC Builder (Cấu hình PC)
- **UI/UX**: Wizard interface (Chọn CPU -> Main -> RAM). Phải có sidebar cố định (Sticky) tổng chi phí và cảnh báo tương thích bằng tiếng Việt.
- **Chia file (< 200 lines)**: Rã thành `pc-builder-page.tsx`, `part-selector-modal.tsx`, `builder-summary-sidebar.tsx`. Validate qua Zod schema.

## 3. UI/UX Quản trị viên (Admin - `/admin`)

### 3.1. Phân quyền & Layout
- **Auth Guard**: Root layout `/admin` bọc trong `adminGuard.ts`. Reject -> `/admin/dang-nhap`.
- **Bản địa hóa**: Toàn bộ Dashboard, Data Tables (Orders, Debt, Suppliers, Invoices) full tiếng Việt (`"Quản lý Công nợ"`, `"Thêm nhà cung cấp"`, v.v.).

### 3.2. Quản lý Sản phẩm & Tồn kho Serial
- **Nhập Serial**: Cải thiện UX nhập kho (Inventory) -> Cho phép paste hàng loạt serial ngăn cách bởi dấu phẩy hoặc khoảng trắng/xuống dòng.
- **Bảng Giá (4 tầng)**: UI input riêng biệt cho `cost_price`, `wholesale_price`, `price_internal`, `price_retail`. Cảnh báo UI (chữ đỏ/viền đỏ Tailwind) nếu `price_retail < cost_price`.

## 4. Kế hoạch Hành động (Actionable List)

1. Thiết lập Zod Error Map bằng tiếng Việt (`lib/validations/vi-error-map.ts`).
2. Tách nhỏ tất cả các UI hiện vượt 200 dòng (vd: Các data table admin).
3. Áp dụng Strict Typescript 5 cho mọi API Response (không dùng `any`).
4. Triển khai Suspense/Error Boundary cục bộ cho từng Module để chặn sập toàn trang.

## Câu hỏi mở (Unresolved Questions)
- Hệ thống lấy hình ảnh linh kiện từ Cloudflare R2 hay link ngoài cho tool PC Builder?
- Quản lý Audit Log của Admin sẽ hiển thị dạng Timeline hay Table truyền thống?
- Có yêu cầu tích hợp thanh toán VNPAY/MOMO ở màn hình Giỏ hàng Storefront phase này không?
