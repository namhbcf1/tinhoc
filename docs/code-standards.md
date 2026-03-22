# Tiêu chuẩn Code (Code Standards)

Tài liệu này quy định các tiêu chuẩn lập trình và viết test cho dự án Trường Phát Computer, sử dụng Next.js 15 App Router, Cloudflare Workers/D1/R2/Pages, TypeScript 5, và Vitest.

## 1. Quy chuẩn chung

### 1.1. Kích thước file
- **Mọi file code bắt buộc phải dưới 200 dòng.**
- Nếu file vượt quá 200 dòng, PHẢI tiến hành chia nhỏ (modularize) tách logic thành các file/hàm/component nhỏ hơn.
- Sử dụng kebab-case cho tên file (ví dụ: `user-service.ts`, `product-list.tsx`).

### 1.2. Ngôn ngữ
- Mọi UI, thông báo lỗi, validation message bắt buộc phải dùng **Tiếng Việt**.
- Code, tên biến, hàm, file dùng tiếng Anh. Format chuẩn xác (camelCase cho biến/hàm, PascalCase cho Class/Component).

### 1.3. Kiến trúc 3 Lớp (3-Layer Architecture)
Mọi module PHẢI tuân theo cấu trúc 3 lớp: Route → Service → Repository
- **Routes (Handlers):** API endpoints, nhận request, gọi service, trả response.
- **Services (Business Logic):** Xử lý logic nghiệp vụ, gọi repository để lấy/sửa/xóa data, không chứa SQL.
- **Repositories (Data Access):** Xử lý toàn bộ SQL queries, không chứa logic nghiệp vụ.

Ví dụ cấu trúc:
```
lib/
├── routes/
│   └── products-routes.ts        (< 200 LOC)
├── services/
│   └── products-service.ts       (< 200 LOC)
└── repositories/
    └── products-repository.ts    (< 200 LOC)
```

## 1.4. Quy chuẩn Import/Export
- Nếu một module có nhiều hàm/class, khuyến khích tạo **barrel export** file (ví dụ: `index.ts`) để quản lý export tập trung.
- Sử dụng named exports thay vì default exports nếu module có nhiều hàm.
- Ví dụ:
  ```typescript
  // ✅ Tốt: Barrel export
  // lib/services/index.ts
  export { getProduct } from './products-service';
  export { getUser } from './users-service';

  // ✅ Tốt: Named import
  import { getProduct, getUser } from '@/lib/services';

  // ❌ Tránh: Default export nếu không cần thiết
  export default getProduct;
  ```

## 2. Quy chuẩn Database (Cloudflare D1)

### 2.1. Truy vấn Dữ liệu (Select)
- Cấm tuyệt đối việc sử dụng `SELECT *` trong mọi câu query (Ngoại trừ `SELECT COUNT(*)`).
- **Bắt buộc** phải liệt kê rõ ràng các cột cần lấy dư liệu:
  - ❌ Sai: `SELECT * FROM products WHERE id = ?`
  - ✅ Đúng: `SELECT id, name, price, status FROM products WHERE id = ?`

### 2.2. Bảo mật (SQL Injection)
- **Luôn** dùng parameterized queries (`?`) hoặc object binding khi dán tham số động. Không ghép chuỗi (string concatenation) cho giá trị truy vấn.
  - ❌ Sai: \`SELECT id FROM users WHERE email = '\${email}'\`
  - ✅ Đúng: `db.prepare("SELECT id FROM users WHERE email = ?").bind(email)`

## 3. Quy chuẩn API Response

Mọi API response phải tuân thủ nghiêm ngặt định dạng chuẩn chung:
- Response thành công: `{ success: true, data: any, meta?: any }`
- Response thất bại: `{ success: false, error: { message: string, code: string } }`

Nên sử dụng các template đã định nghĩa sẵn từ `lib/api-templates.ts` (`createGetEndpoint`, `createPostEndpoint`).

## 4. Quy chuẩn Unit/Integration Test (Vitest trên Cloudflare Workers)

Do chạy trên môi trường Cloudflare, chúng ta sử dụng `Vitest` kết hợp với môi trường Miniflare/workerd.

### 4.1. Cấu trúc Test File
- Đặt file test ngay cạnh module tương ứng, kết thúc bằng `.test.ts` hoặc `.spec.ts`.
- Sử dụng cụm từ tiếng Anh để mô tả luồng test (ví dụ: `describe('UserService', () => {...})`), nội dung test case (hàm `it()`) có thể dùng tiếng Việt hoặc tiếng Anh để mô tả dễ hiểu nhất.

### 4.2. Nguyên tắc Testing
- **Kiểm thử Database (D1):**
  - Trong quá trình test, các logic liên quan đến db query vẫn phải đảm bảo nguyên tắc **Cấm SELECT *** và **Luôn dùng Parameterized Queries (?)**.
- **Kiểm thử chuẩn Response:**
  - Viết test case phải luôn assert chính xác cấu trúc API response đảm bảo trả về có `success: true/false`.
  - Không test pass qua loa bằng cách mock response sai định dạng.

### 4.3. Ví dụ Test Chuẩn

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getProductById } from './product-service';

describe('ProductService - getProductById', () => {
  it('nên trả về success: false nếu không tìm thấy ID', async () => {
    // Giả lập D1 query trả về rỗng
    const mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null)
    };

    const res = await getProductById(mockDb, 'invalid-id');

    expect(res).toEqual({
      success: false,
      error: { message: 'Không tìm thấy sản phẩm', code: 'NOT_FOUND' }
    });
  });

  it('nên gọi db với format query đúng chuẩn và không dùng SELECT *', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: '1', name: 'PC Mới' })
    };

    await getProductById(mockDb, '1');

    // Kiểm tra không có SELECT *
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT id, name, price, status FROM products WHERE id = ?');
    // Kiểm tra có dùng parameter queries
    expect(mockDb.bind).toHaveBeenCalledWith('1');
  });
});
```