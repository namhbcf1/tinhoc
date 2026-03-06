# Google Meet Integration - Cấu hình Secrets

## Sau khi có JSON Key, chạy các lệnh sau:

### 1. Cấu hình GOOGLE_SERVICE_ACCOUNT_KEY
```powershell
cd c:\Users\ADMIN\Desktop\thongtin\backend
wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY
# Paste nội dung file JSON khi được prompt
```

### 2. Cấu hình GOOGLE_CALENDAR_ID (Email admin)
```powershell
wrangler secret put GOOGLE_CALENDAR_ID
# Nhập email admin, ví dụ: admin@vantrangedu.com
```

### 3. Deploy lại backend
```powershell
wrangler deploy
```

### 4. Test
1. Vào Admin → Quản lý lớp → Chọn 1 lớp → Tab "Lịch trình"
2. Click "Thêm buổi học"
3. Tick checkbox "🎥 Tự động tạo Google Meet"
4. Điền thông tin và Lưu
5. Kiểm tra xem có thông báo "Tạo lịch học thành công với Google Meet link!" không
6. Kiểm tra trang giáo viên có hiện nút "Vào lớp học" không
