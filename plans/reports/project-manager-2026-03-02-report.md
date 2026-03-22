# Báo Cáo Quản Lý Dự Án - 2026-03-02

## 1. Tổng Quan Công Việc
- Đã rà soát và tổng hợp các script deploy thủ công (.bat, .ps1, .sh) đang nằm rải rác trong dự án.
- Đã thiết lập thành công CI/CD pipeline sử dụng GitHub Actions để thay thế các script chạy tay. File config được tạo tại `.github/workflows/deploy.yml`. Tự động hoá hoàn toàn luồng deploy lên hệ sinh thái Cloudflare (Workers & Pages).
- Đã cập nhật lại tài liệu dự án để phản ánh kiến trúc hạ tầng deploy mới.

## 2. CI/CD & Auto Deployment Mới
- Đã tạo: `.github/workflows/deploy.yml`
- Kích hoạt khi: Có thao tác push lên branch `main` hoặc chạy thủ công (`workflow_dispatch`).
- Luồng hoạt động:
  - Cài đặt môi trường `Node.js 20`.
  - Cài đặt các gói phụ thuộc cho `backend`.
  - Deploy serverless Backend lên `Cloudflare Workers` bằng Wrangler API Crendentials.
  - Cài đặt các gói thụ thuộc cho `frontend`.
  - Build hệ thống `frontend` thông qua command `npm run build:prod`.
  - Deploy Frontend đã build lên `Cloudflare Pages`.
- Yêu cầu Secret Environment Variables trên GitHub:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

## 3. Cập Nhật Tài Liệu Dự Án (docs/)
- **Project Changelog (`docs/project-changelog.md`):** Thêm phiên bản Release notes 2026-03-02 cho quá trình thiết lập CI/CD, hệ thống hoá Cloudflare Deployments.
- **Development Roadmap (`docs/development-roadmap.md`):** Tăng phần trăm hoàn thành lên 48%. Đã tick "Thiết lập CI/CD & Auto Deployment (GitHub Actions to Cloudflare) - Hoàn thành" vào Giai đoạn 1. Kiến trúc hệ thống hiện đã bao gồm luồng Auto Deploy vững vàng và không còn phụ thuộc local-scripts.

## 4. Các Vấn Đề Tồn Đọng (Unresolved Questions)
- Vui lòng cấu hình các khoá mật khẩu API `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID` bên trong cài đặt (Settings) của kho lưu trữ (Repository) GitHub để workflow có quyền truy cập Cloudflare.
- Có nên lên kế hoạch xoá dứt điểm toàn bộ các file `.bat`, `.ps1` và `*.sh` đã làm ngập lụt root repository hay không? Hiện tại project manager giữ chúng lại như Fallback dự phòng. Đề nghị người dùng có chỉ thị mới.
