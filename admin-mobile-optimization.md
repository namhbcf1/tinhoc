# Admin Mobile Optimization

## Goal
Đưa admin panel về một hệ menu thống nhất và nâng mobile lên mức thao tác đầy đủ, rõ ràng, không còn module "xem nhanh" thiếu chức năng.

## Tasks
- [ ] Tạo cấu hình tab admin dùng chung cho desktop/mobile → Verify: sidebar desktop và drawer/bottom-nav mobile lấy từ cùng một nguồn.
- [ ] Nối lại dashboard admin để expose đủ module mobile đã có sẵn → Verify: vào được `documents`, `assignments` và các tab bị ẩn trước đó.
- [ ] Nâng shell mobile (header, bottom nav, drawer, safe-area, title) → Verify: tab chính dễ chạm, label rõ, không bị che bởi header/nav.
- [ ] Thay `MobileSimpleModules` bằng module thao tác thật cho `posts`, `homepage`, `reports`, `admins`, `backup`, `logs` → Verify: mobile có thể xem và thao tác tương đương desktop ở từng tab.
- [ ] Chạy `npm run build` trong `frontend` và sửa lỗi compile → Verify: build thành công.

## Done When
- [ ] Admin mobile không còn cảnh báo "xem nhanh" cho các tab đã nâng cấp.
- [ ] Điều hướng desktop/mobile đồng nhất và các chức năng admin chính dùng được trên mobile.
