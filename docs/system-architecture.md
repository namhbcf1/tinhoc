# Kiến trúc Hệ thống (System Architecture)

## Kiến trúc Test (Testing Architecture)

Kiến trúc kiểm thử của hệ thống được thiết kế tối ưu cho nền tảng **Next.js 15 App Router** hoạt động kết hợp cùng sức mạnh luân chuyển của **Cloudflare Workers** và cơ sở dữ liệu **Cloudflare D1**. Hệ thống áp dụng triết lý kiến trúc 3 lớp (3-Tier Architecture) giúp việc giả lập (mocking) và kiểm thử độc lập trở nên rõ ràng và dễ bảo trì. Công cụ kiểm thử chính được sử dụng là **Vitest**.

### Các tầng kiểm thử (Testing Layers)

#### 1. Lớp API Routes (Control Layer)
- **Mục đích:** Kiểm thử việc tiếp nhận HTTP Request, xử lý Auth Guards và trả về HTTP Response theo chuẩn định dạng hệ thống.
- **Đối tượng test:** Các tệp `.ts` trong thư mục `app/api/` hoặc hàm khởi tạo bằng `createGetEndpoint`/`createPostEndpoint`.
- **Phương pháp giả lập:**
  - Dùng `vi.mock()` để giả lập toàn bộ **Services**. Lớp này hoàn toàn không quan tâm đến logic nghiệp vụ hay Database.
  - Tạo các đối tượng request giả (mock request).
- **Trọng tâm kiểm tra:**
  - HTTP Status codes (200, 400, 401, 403, 500).
  - **Auth Guards:** Xác minh `adminGuard` và `customerGuard` chặn đúng các request thiếu hoặc sai token/OTP.
  - Kiểm tra chuẩn API format: Trả đúng cấu trúc `{ success, data, meta }` hoặc `{ success: false, error: { message, code } }`.

#### 2. Lớp Services (Business Logic Layer)
- **Mục đích:** Nơi tập trung logic cốt lõi của ứng dụng (ví dụ: quy tắc kinh doanh, tính toán tồn kho, xử lý đơn hàng).
- **Đối tượng test:** Các hàm và class trong thư mục `lib/services/`.
- **Phương pháp giả lập:**
  - Mock **Repositories** bằng `vi.mock()` để trả về các bộ dữ liệu do ta tự định nghĩa.
  - Không kết nối đến Database D1 ảo hay thực tế.
- **Trọng tâm kiểm tra:**
  - Xác thực Pricing 4 tầng (cost_price < wholesale_price < price_internal < price_retail).
  - Logic tồn kho Serial-First (không lưu schema số lượng, xác minh đúng khi gọi `COUNT(serial_numbers WHERE status='available')` thông qua việc check dữ liệu do Mock Repository trả lên).
  - Bắt các lỗi văng ra (Exceptions) và xử lý biến thành mã lỗi (error codes).

#### 3. Lớp Repository (Data Access Layer)
- **Mục đích:** Quản lý truy vấn database Cloudflare D1. Đảm bảo câu lệnh SQL lấy và lưu dữ liệu chính xác.
- **Đối tượng test:** Các hàm truy vấn database trong thư mục `lib/repositories/`.
- **Phương pháp giả lập:**
  - Sử dụng **Miniflare** hoặc plugin môi trường **Cloudflare Vitest Pool** (`@cloudflare/vitest-pool-workers`) để cung cấp Database D1 giả lập (In-Memory SQLite).
  - Chạy migrate/seed dữ liệu giả trước khi test (`beforeEach`) và dọn dẹp sau khi test (`afterEach`).
- **Trọng tâm kiểm tra:**
  - Xác minh truy vấn explicit SELECT (ví dụ `SELECT id, name`, tuyệt đối không dùng `SELECT *`).
  - Kiểm thử Parameterized queries (`?`), truyền dữ liệu rác/độc hại để đảm bảo chống SQL Injection.
  - Mapping kết quả query (`D1Result`) thành các Object Typescript chính xác.
