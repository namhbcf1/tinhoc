# Agent 1: Phụ huynh khó tính — Báo cáo nâng cấp

**Persona:** Lan, 45 tuổi, Hà Nội. Con gái 20 tuổi cần luyện thi VSTEP B2 + tin học văn phòng.
**Ngày đánh giá:** 2026-03-04
**Phương pháp:** Đọc toàn bộ code 8 trang public + so sánh với đối thủ cạnh tranh thực tế.

---

## Tổng điểm: 4.5/10

**Nhận xét tổng quát:** Website có giao diện đẹp, animation mượt (GSAP), nhưng **thiếu trầm trọng thông tin thực chất** mà một phụ huynh cần để ra quyết định. Quá nhiều "buzz words" marketing, quá ít dữ liệu cụ thể. Phụ huynh sẽ rời trang trong 30 giây vì không tìm được: giá, lịch học, thông tin giáo viên, giấy phép hoạt động.

---

## I. PHÂN TÍCH TỪNG TRANG

### 1. Trang chủ (`HomePage.jsx`) — Điểm: 5/10

**Điểm tốt:**
- Hero section đẹp, animation mượt (GSAP timeline)
- Floating CTA button + Exit Intent Modal = chiến thuật conversion tốt
- Hotline hiển thị rõ ở CTA cuối trang

**Vấn đề nghiêm trọng:**

| # | Vấn đề | Mức độ | Chi tiết |
|---|--------|--------|----------|
| 1 | **Số liệu thống kê mâu thuẫn** | P0 | Homepage ghi "10K+ lượt đăng ký", TrainingPage ghi "500+ học viên đang học", TestimonialsSection ghi "1000+ học viên", ServicesPage ghi "10,000+ học viên". **Phụ huynh sẽ nghi ngờ ngay lập tức.** |
| 2 | **Không có bằng chứng xã hội thật** | P0 | Testimonials dùng tên giả (Nguyễn Văn A, Trần Thị B, Lê Minh C), avatar là `ui-avatars.com` placeholder. IELTS Fighter có video review thật từ học viên. |
| 3 | **Hình ảnh stock Unsplash** | P1 | Toàn bộ hình hero lấy từ Unsplash (stock photo nước ngoài). Không một hình thực tế nào của trung tâm, giáo viên, lớp học. Phụ huynh cần nhìn thấy cơ sở vật chất thật. |
| 4 | **"Tiên phong đào tạo ngôn ngữ 2026"** | P1 | Badge hero tự xưng "tiên phong" nhưng không có căn cứ. Đối thủ nào cũng nói tiên phong. Cần bằng chứng: giấy chứng nhận, giải thưởng, con số cụ thể. |
| 5 | **Không mention VSTEP** | P1 | Là sản phẩm cốt lõi nhưng trang chủ chỉ ghi "Luyện thi VSTEP" nhỏ ở sub-heading. VSTEP không xuất hiện trong các service card. Phụ huynh tìm "VSTEP" sẽ không biết đây là trung tâm chuyên VSTEP. |
| 6 | **Không có Tin học văn phòng** | P0 | Con gái tôi cần học tin học văn phòng nhưng KHÔNG CÓ bất kỳ mention nào trên toàn bộ website. Tiêu đề ghi "Ngoại Ngữ & Tin Học" nhưng nội dung chỉ có ngoại ngữ. **Mất 50% khách hàng tiềm năng.** |

### 2. Trang Đào Tạo (`TrainingPage.jsx`) — Điểm: 5/10

**Điểm tốt:**
- Có bảng "Lịch khai giảng gần nhất" với giá cụ thể (2.5tr - 4.2tr)
- SEO structured data (Schema.org Course)
- Layout grid 8 chương trình rõ ràng

**Vấn đề nghiêm trọng:**

| # | Vấn đề | Mức độ | Chi tiết |
|---|--------|--------|----------|
| 7 | **Lịch khai giảng hardcoded** | P0 | Dates hardcoded: `10/03/2026`, `15/03/2026`... Nếu không update kịp sẽ hiển thị ngày quá khứ. **Phụ huynh thấy ngày cũ = trung tâm không hoạt động.** |
| 8 | **Thiếu thông tin chi tiết khóa học** | P0 | Click "Chi tiết lộ trình" → link đến `/training/ngoai-ngu-cap-toc` etc. nhưng **tất cả route con đều render cùng TrainingPage** (App.jsx line 86-89). Không có trang chi tiết riêng cho từng khóa. Phụ huynh click vào sẽ thấy lại cùng trang. |
| 9 | **Không có thông tin giáo viên** | P0 | Zero thông tin về giáo viên: không tên, không ảnh, không bằng cấp, không kinh nghiệm. IELTS Fighter hiển thị full profile giáo viên + chứng chỉ IELTS. |
| 10 | **Thiếu thời lượng khóa học** | P1 | Bảng giá có "Học phí" nhưng KHÔNG CÓ "Thời lượng" (bao nhiêu buổi, mỗi buổi bao lâu, tổng bao nhiêu giờ). Phụ huynh không thể so sánh value-for-money. |
| 11 | **VSTEP B2 chỉ có 2.5 triệu** | P1 | Giá VSTEP B2 = 2,500,000đ. So với thị trường (4-8 triệu), giá này quá rẻ → **phụ huynh nghi ngờ chất lượng** hoặc nghi là phí thi, không phải phí học. Cần giải thích rõ. |
| 12 | **"Cam kết đầu ra bảo hành trọn đời"** | P1 | Feature list ghi "Cam kết chuẩn đầu ra bảo hành trọn đời" — lời hứa quá lớn, không có pháp lý rõ ràng. Phụ huynh khó tính sẽ hỏi: điều khoản cụ thể là gì? |
| 13 | **Thiếu TOEIC, IELTS trong bảng lịch** | P2 | Bảng khai giảng chỉ có TOEIC, không có IELTS — nhưng card "Luyện thi chứng chỉ" ghi IELTS, TOEFL, Cambridge. Không thống nhất. |

### 3. Form đăng ký (`StudentRegistration.jsx`) — Điểm: 3/10

**Vấn đề cực kỳ nghiêm trọng:**

| # | Vấn đề | Mức độ | Chi tiết |
|---|--------|--------|----------|
| 14 | **Yêu cầu upload CCCD ngay lập tức** | P0 | Form bắt buộc upload ảnh CCCD mặt trước + mặt sau + ảnh 3x4 **NGAY KHI ĐĂNG KÝ**. Đây là **BIG RED FLAG** cho phụ huynh. Chưa biết gì về trung tâm, chưa tham quan, đã phải gửi CCCD? IELTS Fighter, Topica chỉ cần tên + SĐT để đăng ký tư vấn. |
| 15 | **Thu thập quá nhiều thông tin nhạy cảm** | P0 | Form yêu cầu: Họ tên, CCCD, ngày cấp CCCD, dân tộc, nơi sinh, địa chỉ, workplace, email, SĐT + 3 ảnh. Đây giống form đăng ký thi chính thức, KHÔNG PHẢI form tư vấn. Phụ huynh sẽ **tắt trang ngay**. |
| 16 | **Tiêu đề "PHIẾU ĐĂNG KÝ DỰ THI"** | P1 | Tiêu đề form ghi "PHIẾU ĐĂNG KÝ DỰ THI" — phụ huynh đang muốn tìm hiểu khóa học, không phải đăng ký thi. Gây confuse: đây là đăng ký học hay đăng ký thi? |
| 17 | **Không có form đăng ký tư vấn đơn giản** | P0 | Toàn website KHÔNG CÓ form tư vấn nhanh (chỉ cần Tên + SĐT). Button "Đăng ký tuyển sinh" ở trang chủ dẫn về AdmissionsPage, chỉ có hotline + link social, KHÔNG có form. Button "Đăng ký online" ở bảng lịch khai giảng dẫn về cùng AdmissionsPage. |
| 18 | **Không chọn được khóa học** | P1 | Form đăng ký không có field "Chọn khóa học muốn đăng ký". Phụ huynh đăng ký xong, trung tâm không biết con muốn học gì. |
| 19 | **CSS import riêng biệt** | P2 | `RegistrationFormA4.css` — form được style dạng A4 giấy (institutional style). Trải nghiệm UX khác hoàn toàn với các trang khác. Không responsive-first, khó dùng trên mobile. |

### 4. Trang Liên Hệ (`ContactPage.jsx`) — Điểm: 6/10

**Điểm tốt:**
- Đủ kênh liên hệ: Hotline (2 số), Email, Zalo, Facebook, Địa chỉ, Giờ làm việc
- Form liên hệ có validation (Zod schema)
- Fallback mailto khi API chưa sẵn sàng

**Vấn đề:**

| # | Vấn đề | Mức độ | Chi tiết |
|---|--------|--------|----------|
| 20 | **Không có Google Maps embed** | P1 | Địa chỉ ghi "418 Đê La Thành, Ô Chợ Dừa, Đống Đa, Hà Nội" nhưng không có bản đồ. Phụ huynh muốn xem vị trí thực tế, đường đi. IELTS Fighter luôn embed Google Maps. |
| 21 | **Không có Live Chat** | P1 | Không có widget chat trực tiếp (Tawk.to, Tidio...). Đối thủ đều có live chat tư vấn instant. |
| 22 | **Thiếu TikTok, Instagram** | P2 | Đối tượng phụ huynh 45 tuổi có thể dùng Zalo/Facebook, nhưng con gái 20 tuổi sẽ tìm TikTok/Instagram. |
| 23 | **Email domain inconsistent** | P2 | Contact form fallback gửi đến `vantrang@vantrangedu.com`, nhưng trang hiển thị `info@vantrangedu.edu.vn`. 2 domain khác nhau. |

### 5. Trang Giới Thiệu (`AboutPage.jsx`) — Điểm: 3/10

**Vấn đề nghiêm trọng:**

| # | Vấn đề | Mức độ | Chi tiết |
|---|--------|--------|----------|
| 24 | **KHÔNG CÓ giấy phép hoạt động** | P0 | Không hiển thị: Giấy phép đào tạo, Mã số thuế, Giấy đăng ký kinh doanh, Quyết định thành lập. Phụ huynh cần biết trung tâm có hợp pháp không. Đây là yêu cầu PHÁP LÝ theo Nghị định 46/2017. |
| 25 | **KHÔNG CÓ lịch sử hoạt động** | P0 | Ghi "10+ năm kinh nghiệm" nhưng không có timeline thành lập, milestone, sự kiện. Topica có timeline từ 2008 đến nay. |
| 26 | **Không ảnh thực tế CEO** | P1 | Giới thiệu CEO "Phạm Thị Vân Trang" nhưng không có ảnh, không có CV chi tiết, không link LinkedIn. Chỉ có 2 đoạn văn chung chung. |
| 27 | **Số liệu lại mâu thuẫn** | P0 | About: "3000+ Cựu học viên", Homepage: "10K+ Lượt đăng ký", Services: "10,000+ Học viên". **Con số nào là thật?** |
| 28 | **Tầm nhìn quá viển vông** | P1 | "Xây dựng hệ sinh thái giáo dục ngoại ngữ lớn nhất Đông Nam Á" — cho một công ty TNHH nhỏ? Phụ huynh pragmatic sẽ thấy thiếu thực tế. |
| 29 | **Không có đội ngũ giáo viên** | P0 | About page phải là nơi giới thiệu đội ngũ giảng viên. KHÔNG CÓ. Chỉ có CEO. IELTS Fighter, Langgo đều show full team + bằng cấp. |
| 30 | **Địa chỉ mơ hồ** | P1 | About ghi: "Hà Nội, Việt Nam (Mạng lưới trực tuyến toàn quốc)" — quá mơ hồ. Contact ghi "418 Đê La Thành" — nhưng About không ghi. Inconsistent. |

### 6. Trang Tuyển Sinh (`AdmissionsPage.jsx`) — Điểm: 4/10

| # | Vấn đề | Mức độ | Chi tiết |
|---|--------|--------|----------|
| 31 | **Không có form đăng ký** | P0 | Trang tuyển sinh nhưng KHÔNG CÓ form đăng ký. Chỉ hiển thị hotline, email, Zalo, Facebook và nút "Nhận tư vấn cụ thể" (gọi điện). Phụ huynh muốn đăng ký online, không phải gọi điện. |
| 32 | **Lộ trình nhập học quá chung chung** | P1 | 4 bước: Liên hệ tư vấn → Kiểm tra năng lực → Cá nhân hóa → Bắt đầu. Không có thời gian cụ thể cho mỗi bước. Bao lâu từ liên hệ đến bắt đầu học? |
| 33 | **"Bảo hành trọn đời, học lại miễn phí"** | P1 | Lại nhắc cam kết "bảo hành trọn đời" nhưng không có link đến điều khoản chi tiết. |
| 34 | **Không có chính sách học phí** | P0 | Trang tuyển sinh không mention gì về học phí, phương thức thanh toán, chính sách trả góp. Đối thủ Apax, Langgo đều có bảng giá rõ ràng. |

### 7. Trang Landing SEO (`SemanticLanding.jsx`) — Điểm: 5/10

| # | Vấn đề | Mức độ | Chi tiết |
|---|--------|--------|----------|
| 35 | **Rating giả 4.9/5 (1250+ đánh giá)** | P0 | Hardcoded "4.9/5 (1,250+ Đánh giá xác thực)" — nhưng không link đến platform nào (Google Reviews, Facebook Reviews). Code comment còn ghi: `// aggregateRating removed — hardcoded ratings violate Google Webmaster Guidelines`. Dev đã biết vi phạm nhưng vẫn hiển thị rating giả ở UI. |
| 36 | **FAQs quá ít** | P1 | Mỗi landing page chỉ có 1-2 FAQs. Đối thủ có 8-10 FAQs chi tiết. |

### 8. Trang Dịch Vụ (`ServicesPage.jsx`) — Điểm: 4/10

| # | Vấn đề | Mức độ | Chi tiết |
|---|--------|--------|----------|
| 37 | **Focus sai đối tượng** | P1 | Trang viết cho "sinh viên" (đăng ký thi, quản lý học tập, tải giấy báo thi). Phụ huynh vào đây không hiểu đây là dịch vụ gì cho con mình. |
| 38 | **"100% Bảo mật"** | P2 | Stat "100% Bảo mật" nhưng form đăng ký thu thập CCCD không có Privacy Policy visible. Mâu thuẫn. |
| 39 | **Testimonials lại dùng tên giả khác** | P1 | Nguyễn Thị Anh, Trần Văn Minh, Lê Thị Hương — khác set tên giả ở HomePage. Hai bộ testimonial giả khác nhau trên cùng website. |

---

## II. SO SÁNH VỚI ĐỐI THỦ CẠNH TRANH

### Bảng so sánh chi tiết

| Tiêu chí | VanTrangEdu | IELTS Fighter | Langgo | Topica | Apax |
|-----------|-------------|----------------|--------|--------|------|
| **Giấy phép/Pháp lý** | ❌ Không hiển thị | ✅ MST + GP rõ ràng | ✅ Có | ✅ Công ty CP, niêm yết | ✅ Có |
| **Giá khóa học** | ⚠️ 1 bảng nhỏ hardcoded | ✅ Bảng giá chi tiết từng level | ✅ Bảng giá rõ | ✅ Giá + combo | ✅ Bảng giá |
| **Thời lượng khóa** | ❌ Không có | ✅ Số buổi + giờ/buổi | ✅ Có | ✅ Có | ✅ Có |
| **Profile giáo viên** | ❌ Zero | ✅ Full profile + chứng chỉ | ✅ Có ảnh + CV | ✅ Video intro | ✅ Có |
| **Testimonials thật** | ❌ Fake names + placeholder avatars | ✅ Video review thật | ✅ Có ảnh thật + link FB | ✅ Video | ⚠️ |
| **Google Maps** | ❌ Không | ✅ Embed nhiều cơ sở | ✅ Có | ✅ Có | ✅ Có |
| **Live Chat** | ❌ Không | ✅ Tawk.to | ✅ Có | ✅ Chatbot AI | ✅ Có |
| **Form tư vấn nhanh** | ❌ Không (chỉ form dự thi CCCD) | ✅ Popup 3 trường | ✅ Có | ✅ Có | ✅ Có |
| **Lịch khai giảng** | ⚠️ Hardcoded 4 dòng | ✅ Dynamic, filter theo thành phố | ✅ Dynamic | ✅ Có | ✅ Có |
| **Blog/Content SEO** | ⚠️ Có NewsPage nhưng content? | ✅ 1000+ bài viết SEO | ✅ Blog + tips | ✅ Rất mạnh | ⚠️ |
| **Chính sách hoàn tiền** | ❌ Không mention | ✅ Rõ ràng | ✅ Có | ✅ Có | ⚠️ |
| **Test trình độ online** | ⚠️ Mention "AI test" nhưng chưa public | ✅ Free online test | ✅ Có | ✅ Có | ✅ Có |
| **Tin học văn phòng** | ❌ Không có khóa | N/A | N/A | ⚠️ | N/A |
| **Mobile responsive** | ✅ Tailwind responsive | ✅ Tốt | ✅ Tốt | ✅ Tốt | ✅ Tốt |
| **Tốc độ load** | ⚠️ GSAP + nhiều Unsplash img | ✅ Optimized | ✅ Tốt | ✅ Tốt | ✅ Tốt |

### Insight đối thủ chính cho keyword "luyện thi VSTEP Hà Nội":
- **ĐH Hà Nội (HANU)**: Là trung tâm khảo thí VSTEP chính thức — uy tín tuyệt đối.
- **IIG Vietnam**: Đơn vị tổ chức thi VSTEP — có lợi thế brand.
- **Các trung tâm nhỏ**: Cạnh tranh bằng giá + cam kết đầu ra + review Facebook thật.
- **VanTrangEdu**: Chưa có USP rõ ràng so với đối thủ. Cần xác định: "Tại sao phụ huynh chọn VanTrangEdu thay vì đăng ký trực tiếp ở HANU?"

---

## III. DANH SÁCH VẤN ĐỀ THEO ƯU TIÊN

### P0 — PHẢI SỬA NGAY (Ảnh hưởng trực tiếp đến conversion)

| # | Vấn đề | File | Giải pháp |
|---|--------|------|-----------|
| 1 | Số liệu thống kê mâu thuẫn 4 nơi | `HomePage.jsx:151-154`, `TrainingPage.jsx:181`, `TestimonialsSection.jsx:94`, `ServicesPage.jsx:17` | Thống nhất 1 bộ số liệu duy nhất. Tạo file `constants/stats.js` dùng chung. Nếu thật sự 3000 cựu HV thì ghi 3000 ở tất cả. |
| 2 | Testimonials giả | `TestimonialsSection.jsx:12-68`, `ServicesPage.jsx:23-27` | Thu thập review thật từ học viên (ảnh thật, tên thật, có consent). Hoặc embed Google Reviews / Facebook Reviews widget. |
| 3 | Không có form tư vấn nhanh | Toàn site | Thêm component `QuickConsultForm` (Tên + SĐT + Khóa quan tâm) vào HomePage, TrainingPage, AdmissionsPage. |
| 4 | Form đăng ký yêu cầu CCCD ngay | `StudentRegistration.jsx:14-36` | Tách thành 2 bước: Bước 1 = Form tư vấn (Tên + SĐT + Email + Khóa). Bước 2 = Sau khi tư vấn xong, mới thu thập CCCD cho đăng ký thi chính thức. |
| 5 | Không có tin học văn phòng | Toàn site | Hero ghi "Tin Học" → phải có khóa tương ứng. Thêm vào `programs` array trong TrainingPage + tạo landing page riêng. |
| 6 | Không có giấy phép hoạt động | `AboutPage.jsx` | Thêm section "Pháp lý & Chứng nhận": ĐKKD, MST, GP đào tạo, ảnh scan giấy phép. |
| 7 | Không có thông tin giáo viên | `AboutPage.jsx`, `TrainingPage.jsx` | Tạo section "Đội ngũ giảng viên" với ảnh thật, tên, bằng cấp (TESOL/CELTA/IELTS score), kinh nghiệm. |
| 8 | Lịch khai giảng hardcoded | `TrainingPage.jsx:79-84` | Lấy data từ API backend (table `classes`/`schedules`). Hiển thị dynamic, auto-hide ngày quá khứ. |
| 9 | Thiếu chính sách học phí chi tiết | `AdmissionsPage.jsx`, `TrainingPage.jsx` | Tạo bảng giá đầy đủ: Khóa, Thời lượng (giờ), Số buổi, Lịch học, Giá gốc, Giá khuyến mãi, Hình thức. |
| 10 | Không có form đăng ký trên trang Tuyển Sinh | `AdmissionsPage.jsx` | Embed QuickConsultForm hoặc link trực tiếp đến form đăng ký đơn giản. |
| 11 | Rating giả 4.9/5 | `SemanticLanding.jsx:122-131` | Xóa hoặc thay bằng widget Google Reviews/Facebook Reviews thật. Nếu chưa có reviews, xóa section này. |

### P1 — NÊN SỬA SỚM (Ảnh hưởng trust & UX)

| # | Vấn đề | File | Giải pháp |
|---|--------|------|-----------|
| 12 | Hình ảnh stock Unsplash | `HomePage.jsx:125,139,163,242` | Thay bằng ảnh thực tế: lớp học, giáo viên đang giảng, học viên nhận chứng chỉ. |
| 13 | Không có Google Maps | `ContactPage.jsx` | Thêm iframe Google Maps embed cho địa chỉ "418 Đê La Thành". |
| 14 | Không có Live Chat | Layout component | Tích hợp Tawk.to hoặc Zalo Chat Widget (miễn phí). |
| 15 | Thiếu thời lượng khóa học | `TrainingPage.jsx:79-84` | Thêm cột "Thời lượng" vào bảng khai giảng (VD: "40 giờ - 20 buổi"). |
| 16 | Không có Privacy Policy | Toàn site | Tạo trang Privacy Policy. Đặc biệt quan trọng vì thu thập CCCD. Link ở footer. |
| 17 | "Tầm nhìn Đông Nam Á" quá viển vông | `AboutPage.jsx:112` | Đổi thành tầm nhìn thực tế: "Trở thành trung tâm luyện thi VSTEP uy tín nhất khu vực Hà Nội". |
| 18 | Không có lịch sử/timeline | `AboutPage.jsx` | Thêm timeline: Năm thành lập → Các mốc quan trọng → Hiện tại. |
| 19 | Không ảnh CEO | `AboutPage.jsx:164` | Thêm ảnh chuyên nghiệp của CEO + brief CV. |
| 20 | Route con đào tạo trả về cùng trang | `App.jsx:86-89` | Tạo trang chi tiết riêng cho mỗi khóa: `/training/vstep-b2` với syllabus, giá, thời lượng cụ thể. |
| 21 | Email domain inconsistent | `ContactPage.jsx:51` vs `ContactPage.jsx:138` | Thống nhất: `vantrang@vantrangedu.com` hay `info@vantrangedu.edu.vn`? |
| 22 | Không có test trình độ miễn phí | Toàn site | Tạo quick placement test (10 câu MCQ) public để thu lead. |
| 23 | Tiêu đề form "PHIẾU ĐĂNG KÝ DỰ THI" gây nhầm lẫn | `StudentRegistration.jsx:249` | Tách rõ: form đăng ký học (đơn giản) vs form đăng ký thi (đầy đủ CCCD). |
| 24 | Trang Services focus sai đối tượng | `ServicesPage.jsx` | Rewrite để hướng đến phụ huynh + học viên tiềm năng, không phải sinh viên đang học. |

### P2 — CẢI THIỆN SAU (Nice-to-have)

| # | Vấn đề | File | Giải pháp |
|---|--------|------|-----------|
| 25 | Thiếu TikTok, Instagram | `ContactPage.jsx` | Thêm link social media cho giới trẻ. |
| 26 | FAQs quá ít | `SemanticLanding.jsx` instances | Mỗi landing page cần 6-10 FAQs chi tiết. |
| 27 | ExitIntentModal giảm 20% — có thật không? | `ExitIntentModal.jsx:100` | Nếu là khuyến mãi thật, cần ghi rõ điều khoản + thời hạn. Nếu không, xóa — sẽ mất trust khi khách hàng phát hiện. |
| 28 | "100% Bảo mật" nhưng thiếu Privacy Policy | `ServicesPage.jsx:20` | Xóa claim hoặc thêm link Privacy Policy. |
| 29 | SEO meta thiếu cho vài trang | `AdmissionsPage.jsx`, `ServicesPage.jsx` | Thêm `<SEO>` component cho AdmissionsPage và ServicesPage. |
| 30 | Animation quá nhiều | Toàn site GSAP | Giảm bớt animation để tăng tốc độ load trên mobile 4G. Đặc biệt trang chủ có 3D tilt effect + blob animations. |

---

## IV. ĐỀ XUẤT NÂNG CẤP CỤ THỂ (TOP 5 QUAN TRỌNG NHẤT)

### 1. Tạo Quick Consult Form Component

**File mới:** `frontend/src/components/forms/QuickConsultForm.jsx`

```jsx
// Form tư vấn nhanh: Tên + SĐT + Dropdown khóa quan tâm
// Hiển thị ở: HomePage (hero + CTA), TrainingPage, AdmissionsPage
// Khi submit → gọi API /api/leads → SMS/Email thông báo cho tư vấn viên
```

**Lý do:** Đối thủ IELTS Fighter popup form 3 trường ngay khi vào trang → conversion rate cao gấp 5-10 lần so với "Gọi hotline".

### 2. Thống nhất số liệu & Tạo constants

**File mới:** `frontend/src/constants/site-statistics.js`

```js
export const SITE_STATS = {
  yearsOfExperience: 10,
  totalStudents: 3000,     // Dùng con số thật, chọn 1
  currentStudents: 500,
  satisfactionRate: 95,
  teacherCount: 15,        // Con số thật
  programs: 8,
};
```

**Cập nhật:** `HomePage.jsx:150-154`, `TrainingPage.jsx:181`, `TestimonialsSection.jsx:94`, `ServicesPage.jsx:17`, `AboutPage.jsx:138`

### 3. Tách StudentRegistration thành 2 bước

**Bước 1 — Form đăng ký tư vấn (public, dễ dùng):**
- Họ tên, SĐT, Email, Khóa quan tâm (dropdown)
- KHÔNG yêu cầu CCCD
- Submit → tạo lead → tư vấn viên gọi lại

**Bước 2 — Form đăng ký dự thi (sau khi tư vấn xong):**
- Chỉ accessible sau khi đã có account
- Thu thập CCCD, ảnh 3x4 cho mục đích thi chính thức
- Giải thích rõ lý do cần CCCD: "Theo quy định của Bộ GD&ĐT..."

### 4. Thêm section Đội ngũ Giảng viên

**File:** `AboutPage.jsx` — thêm section sau Leadership

```jsx
// Section: Đội ngũ giảng viên
// Grid: 4-6 giáo viên chính
// Mỗi card: Ảnh thật + Tên + Chức danh + Bằng cấp (IELTS 8.5, TESOL...)
// + Kinh nghiệm + Một quote ngắn
```

### 5. Thêm trang Tin Học Văn Phòng

**Cập nhật:** `TrainingPage.jsx` — thêm vào array `programs`:

```js
{
  title: 'Tin Học Văn Phòng',
  description: 'Đào tạo MOS (Microsoft Office Specialist), IC3, kỹ năng Excel, Word, PowerPoint cho công việc.',
  path: '/training/tin-hoc-van-phong',
  icon: <Monitor size={32} className="text-teal-500" />,
  color: 'bg-teal-100'
}
```

**Tạo trang chi tiết:** `/training/tin-hoc-van-phong` với syllabus cụ thể.

---

## V. KẾT LUẬN TỪ GÓC ĐỘ PHỤ HUYNH

> **"Tôi là Lan, 45 tuổi. Tôi đã vào website VanTrangEdu và cảm nhận như sau:**
>
> 1. **Ấn tượng đầu tiên:** Website đẹp, hiện đại, nhưng giống landing page marketing hơn là trung tâm giáo dục uy tín.
>
> 2. **Tôi không tìm được:** Giá khóa VSTEP B2 chi tiết (bao nhiêu buổi, ai dạy), tin học văn phòng cho con, giấy phép hoạt động, review thật từ phụ huynh khác.
>
> 3. **Red flag:** Form yêu cầu CCCD ngay, số liệu mâu thuẫn (1000 hay 10000 học viên?), rating 4.9/5 không biết từ đâu, testimonials tên giả.
>
> 4. **So với đối thủ:** IELTS Fighter cho tôi thấy giáo viên thật, video review thật, bảng giá rõ ràng, form đăng ký chỉ cần tên + SĐT. Tôi sẽ chọn IELTS Fighter.
>
> 5. **Để tôi chọn VanTrangEdu, cần:** (a) Thấy giáo viên thật + bằng cấp, (b) Bảng giá + thời lượng chi tiết, (c) Giấy phép hoạt động, (d) Form đăng ký đơn giản, (e) Khóa tin học văn phòng."

---

## Câu hỏi chưa giải đáp

1. Con số thật sự về học viên là bao nhiêu? Cần product owner xác nhận để thống nhất.
2. VanTrangEdu có giấy phép đào tạo chưa? Nếu chưa → rủi ro pháp lý khi quảng cáo.
3. Khóa tin học văn phòng có trong kế hoạch kinh doanh không hay chỉ ghi trên banner?
4. Backend API `/contact` đã hoạt động chưa? (Code có fallback `mailto` = chưa sẵn sàng)
5. Review 4.9/5 từ 1250 đánh giá — nguồn ở đâu? Nếu không có, cần xóa ngay tránh vi phạm luật quảng cáo.
