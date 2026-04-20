# Viettel Post Certificate Shipping Plan

Date: 2026-04-06

## Goal

Tich hop luong tao van don Viettel Post cho chung chi, giay to, tai lieu cua hoc vien ngay trong trang admin cua `vantrangedu`, uu tien lay san `ho_ten_full`, `sdt`, `dia_chi` tu he thong hien co.

## What Was Verified

### 1. Viettel Post partner API co the ket noi duoc

- Trang doi tac mo duoc: `https://partner.viettelpost.vn/` chuyen huong sang `https://partner2.viettelpost.vn/`.
- Danh muc dia gioi goi duoc cong khai:
  - `GET https://partner.viettelpost.vn/v2/categories/listProvince`
  - `GET https://partner.viettelpost.vn/v2/categories/listDistrict?provinceId=...`
  - `GET https://partner.viettelpost.vn/v2/categories/listWards?districtId=...`
- Bao gia goi duoc:
  - `POST https://partner.viettelpost.vn/v2/order/getPriceAll`
- Tao don that goi duoc nhung bat buoc co token doi tac:
  - `POST https://partner.viettelpost.vn/v2/order/createOrder`
  - Response xac minh: `Header Token is required`

### 2. Bai toan "chung chi / tai lieu" hop voi luong giao tai lieu, khong phai hang gia tri cao

- `getPriceAll` tra ve danh sach dich vu van chuyen va extra service.
- Trong extra service co ma:
  - `HDN` = `Hoa don, giay chung nhan`
  - `HST` = `Ho so thau`
  - `GBP` = `Bao phat`
  - `GTT` = `Phat tan tay`
- Ket luan thuc dung:
  - Don chung chi/tai lieu co the di theo luong van chuyen thong thuong.
  - Khong nen mac dinh danh dau `hang gia tri cao`.
  - Nen xem `HDN` la service phu tro phu hop nhat cho chung chi/giay to.
  - Nen dat `COD = 0`.
  - Nen dat `PRODUCT_NAME`/`PRODUCT_DESCRIPTION` ro la `Chung chi` / `Tai lieu`.

### 3. Dia chi hoc vien can duoc chuan hoa theo danh muc Viettel Post truoc khi tao don

Vi du hoc vien user dua:

- Ho ten: `DAO THI KIEU NUONG`
- So dien thoai: `0945015075`
- Dia chi tho: `AP TAM HUNG, XA CHAU THOI, TINH CA MAU`

Dia chi nen chuan hoa de dung voi danh muc Viettel Post hien tai:

- `address_line`: `Ap Tam Hung`
- `ward_name`: `Xa Chau Thoi`
- `ward_id`: `49822`
- `district_name`: `Bo qua - Su dung dia chi 2 cap`
- `district_id`: `100000063`
- `province_name`: `Ca Mau`
- `province_id`: `63`
- `normalized_full_address`: `Ap Tam Hung, Xa Chau Thoi, Tinh Ca Mau`

Luu y:

- He danh muc Viettel Post dang co ca don vi hanh chinh cu va mo hinh 2 cap moi.
- Voi `Ca Mau`, du lieu moi ho tro `district_id = 100000063` de chon xa/phuong cap moi.
- Neu hoc vien nhap dia chi kieu cu, he thong can map sang ma moi truoc khi tao don.

## Noi Can Gan Trong Codebase

### Frontend

- `frontend/src/pages/admin/desktop/CertificatesManagement.tsx`
  - Dang la diem hop ly nhat de them nut `Tao van don`.
  - Hien da co danh sach hoc vien du dieu kien cap chung chi.
- `frontend/src/pages/admin/desktop/students/StudentDetailModal.tsx`
  - Da hien thi san `sdt` va `dia_chi`.
  - Phu hop de them nut `Chuan hoa dia chi` va `Tao don giao chung chi`.
- `frontend/src/services/api-certificate-methods.ts`
  - Can bo sung method cho:
    - quote shipment
    - normalize address
    - create shipment
- `frontend/src/services/api-student-methods.ts`
  - Co the tai su dung de lay du lieu hoc vien theo `cccd`.

### Backend

- `backend/src/routes/certificates.ts`
  - La route hop ly de them nhanh shipment lien quan den chung chi.
  - Co san `class_id`, `student_id`, `certificate_number`.
- `backend/src/routes/students.ts`
  - Da co list/search/get detail hoc vien.
  - Co the tai su dung de prefill shipment draft.
- `backend/src/types/env.ts`
  - Can them env cho Viettel Post token va sender profile.

## Data Model Nen Them

Nen tao bang moi vi van don la doi tuong van hanh rieng, khong nen nhoi vao `certificates`.

De xuat bang `certificate_shipments`:

- `id`
- `certificate_id`
- `student_id`
- `carrier` = `viettel_post`
- `carrier_order_number`
- `carrier_tracking_number`
- `shipment_type` = `certificate_document`
- `receiver_name`
- `receiver_phone`
- `address_raw`
- `address_line`
- `province_id`
- `province_name`
- `district_id`
- `district_name`
- `ward_id`
- `ward_name`
- `normalized_full_address`
- `service_code`
- `service_add_codes`
- `estimated_fee`
- `status`
- `created_by`
- `created_at`
- `updated_at`

## API Surface Nen Lam

### 1. Danh muc va chuan hoa dia chi

- `GET /shipping/viettel-post/provinces`
- `GET /shipping/viettel-post/districts?province_id=...`
- `GET /shipping/viettel-post/wards?province_id=...&district_id=...`
- `POST /shipping/viettel-post/normalize-address`

Output normalize can co:

- `address_line`
- `province_id`
- `district_id`
- `ward_id`
- `normalized_full_address`
- `confidence`
- `warnings`

### 2. Bao gia

- `POST /shipping/viettel-post/quote`

Input:

- sender profile co dinh
- thong tin nguoi nhan
- `product_name`
- `product_weight`
- `product_type`
- `service_add_codes`

### 3. Tao van don

- `POST /certificates/:id/shipment`

Input:

- `receiver_name`
- `receiver_phone`
- `address_line`
- `province_id`
- `district_id`
- `ward_id`
- `service_code`
- `service_add_codes`
- `product_weight`

Mac dinh de xuat:

- `product_name = Chung chi`
- `product_description = Chung chi, tai lieu`
- `product_quantity = 1`
- `product_price = 0`
- `money_collection = 0`
- `service_add_codes` co the chon san `HDN`

## UI Flow Nen Lam

### Option tot nhat

Them action trong `CertificatesManagement`:

1. Chon hoc vien da cap chung chi.
2. Bam `Tao van don`.
3. Modal mo ra voi du lieu prefill:
   - ho ten
   - so dien thoai
   - dia chi tho
4. He thong auto normalize dia chi.
5. Admin kiem tra va chinh lai neu can.
6. Goi bao gia.
7. Chon dich vu chinh:
   - `SCN`
   - `STK`
   - `SHT`
   - hoac service khac Viettel tra ve
8. Mac dinh goi them:
   - `HDN`
   - tuy chon `GBP` neu can bao phat
   - tuy chon `GTT` neu can phat tan tay
9. Bam `Tao don`.
10. Luu ma van don vao lich su chung chi.

## Rollout Plan

### Phase 1. Address normalization

- Them route doc danh muc Viettel Post.
- Them utility map dia chi tho -> province/district/ward.
- Hien thi canh bao khi dia chi mo ho hoac map khong chac.

### Phase 2. Shipment draft + quote

- Them modal admin tao draft van don.
- Prefill tu hoc vien + chung chi.
- Goi `getPriceAll`.
- Cho admin chon dich vu.

### Phase 3. Create order

- Them env:
  - `VIETTEL_POST_TOKEN`
  - `VIETTEL_POST_SENDER_NAME`
  - `VIETTEL_POST_SENDER_PHONE`
  - `VIETTEL_POST_SENDER_ADDRESS`
  - `VIETTEL_POST_SENDER_PROVINCE_ID`
  - `VIETTEL_POST_SENDER_DISTRICT_ID`
  - `VIETTEL_POST_SENDER_WARD_ID`
- Goi `createOrder`.
- Luu tracking code va log noi bo.

### Phase 4. Tracking and ops

- Hien thi ma van don trong lich su cap chung chi.
- Nut copy tracking.
- Neu can, them job dong bo trang thai van don tu carrier.

## Risks

- Chua co token doi tac Viettel Post trong moi truong hien tai.
- Danh muc dia gioi Viettel Post dang co song song du lieu cu va moi, nen can lop chuan hoa dia chi.
- Dia chi hoc vien nhap tu do co the thieu `ap/thon/so nha`, can xac nhan truoc khi tao don that.
- `PRODUCT_TYPE` cua Viettel Post chua nen hardcode theo suy doan; can chot bang tai khoan doi tac hoac test tao don that tren sandbox/merchant account.

## Practical Recommendation

- Giu luong shipment theo huong `tai lieu/chung chi`.
- Khong mac dinh danh dau `hang gia tri cao`.
- Mac dinh de xuat extra service:
  - `HDN`
- Tuy truong hop co the them:
  - `GBP`
  - `GTT`
- Voi dia chi mo ho hoac qua ngan, buoc admin phai chot lai truoc khi tao don.

## Reference URLs

- `https://partner.viettelpost.vn/`
- `https://partner2.viettelpost.vn/`
- `https://partner.viettelpost.vn/v2/categories/listProvince`
- `https://partner.viettelpost.vn/v2/order/getPriceAll`
- `https://partner.viettelpost.vn/v2/order/createOrder`
- `https://viettelpost.vn/assets/file/dieu-khoan-quy-dinh.pdf`
- `https://files-vnportalcmu.camau.gov.vn/cmu-chinhquyen/1/tintuc/2025/10/16.027.638957016177145535.pdf`
