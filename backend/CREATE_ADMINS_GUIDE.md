# Hướng Dẫn Tạo Tài Khoản Admin

## Thông tin tài khoản

- **Số lượng**: 5 tài khoản
- **Username**: admin1, admin2, admin3, admin4, admin5
- **Password**: admin12345 (cho tất cả)
- **Role**: admin

## Cách 1: Sử dụng SQL Script (Khuyến nghị)

1. Mở Cloudflare Dashboard
2. Vào Workers & Pages > D1 > Databases
3. Chọn database của bạn
4. Vào tab "Console" hoặc "Query"
5. Chạy file `create-admins.sql`:

```sql
INSERT INTO admins (username, password_hash, full_name, role) VALUES
('admin1', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 1', 'admin'),
('admin2', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 2', 'admin'),
('admin3', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 3', 'admin'),
('admin4', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 4', 'admin'),
('admin5', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 5', 'admin');
```

## Cách 2: Sử dụng API Endpoint

### Sử dụng script Node.js:

```bash
cd backend
node create-admins-api.js
```

### Hoặc sử dụng curl/Postman:

```bash
curl -X POST https://vantrangedu-api.bangachieu2.workers.dev/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin1",
    "password": "admin12345",
    "full_name": "Quản Trị Viên 1",
    "role": "admin"
  }'
```

Lặp lại cho admin2, admin3, admin4, admin5.

## Cách 3: Sử dụng Wrangler CLI

```bash
cd backend
wrangler d1 execute vantrangedu-db --file=create-admins.sql
```

## Kiểm tra tài khoản đã tạo

Sau khi tạo, bạn có thể đăng nhập tại:
- Frontend: https://vantrangedu-3vg.pages.dev/admin/login
- API: POST https://vantrangedu-api.bangachieu2.workers.dev/auth/login

Body:
```json
{
  "username": "admin1",
  "password": "admin12345"
}
```

## Lưu ý

- Đảm bảo đã deploy backend với endpoint `/auth/create-admin` mới
- Nếu tài khoản đã tồn tại, API sẽ trả về lỗi
- Nên đổi password sau lần đăng nhập đầu tiên
