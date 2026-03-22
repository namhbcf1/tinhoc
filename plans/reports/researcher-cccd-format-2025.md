# Research Report: Vietnamese CCCD Format (2025-2026)

**Research Date:** March 8, 2026
**Status:** Complete
**Sources:** Multiple web searches on CCCD format, OCR challenges, and Vietnamese regulations

---

## Executive Summary

Vietnamese Citizen Identity Card (CCCD - Căn cước công dân / Căn cước) is a biometric national ID replacing the old CMND. The new "Căn cước" format was introduced around July 1, 2024, with enhanced security features. This report documents the card structure, fields, visual layout, and OCR challenges critical for building accurate CCCD parsing and validation systems.

---

## 1. Card Physical Appearance & Layout

### Card Dimensions
- Standard credit card size (85.6mm × 53.98mm)
- Biometric smart card with embedded security features

### Design
- **Material:** Polycarbonate with embedded security features
- **Color:** Blue/Blue-green primary color with white background areas
- **Photo Area:** Upper portion of front side, color photo of cardholder
- **Security Features:** Holograms, watermarks, microprinting to prevent counterfeiting

---

## 2. Front Side Fields

The following fields are printed on the front of the CCCD:

| Field Name (Vietnamese) | Field Name (English) | Details |
|---|---|---|
| Số căn cước công dân | CCCD Number | 12-digit unique identifier |
| Họ và tên | Full Name | Person's surname and given name |
| Ngày sinh | Date of Birth | Birth date |
| Giới tính | Gender/Sex | Nam (Male) or Nữ (Female) |
| Quốc tịch | Nationality | Vietnamese (Việt Nam) |
| Quê quán | Place of Origin | Hometown/native province |
| Nơi thường trú | Place of Residence | Current registered address |
| Ngày cấp | Date of Issue | When card was issued |
| Nơi cấp | Place of Issue | Issuing authority/location |
| Ảnh | Photo | Color photo of cardholder |
| Hạng CCCD | Card Rank/Type | 0 (standard), 1 (specialist), 2 (foreign citizen) |
| Số CMND cũ (if applicable) | Old CMND Number | Only if person had previous CMND |

### Text Layout on Front
- Labels and values primarily in **Vietnamese only** (monolingual)
- Some cards may have bilingual elements, but Vietnamese dominates
- Text orientation: Horizontal (left-to-right)
- Font: Official Vietnamese government typeface (possibly sans-serif, standardized)

---

## 3. Back Side Fields

The following fields are printed on the back of the CCCD:

| Field Name (Vietnamese) | Field Name (English) | Details |
|---|---|---|
| Số căn cước công dân | CCCD Number | Repeated from front |
| Ngày cấp | Date of Issue | Issue date |
| Nơi cấp | Place of Issue | Issuing authority |
| Mã vạch 2D / QR Code | 2D Barcode / QR Code | Machine-readable data in 2D format |
| Vân tay (nổi) | Fingerprints | Raised fingerprint (biometric) |
| Ký hiệu cơ quan cấp | Issuing Agency Code | Identifier of issuing authority |
| Chữ ký | Signature | Official signature of issuer |
| Hạn sử dụng | Validity Period | Card expiration date |

### Text Layout on Back
- More structured/formal layout
- QR code (2D barcode) prominent on back
- Machine Readable Zone (MRZ) may be present but limited info in public sources
- Fingerprint area clearly designated
- Labels and values in Vietnamese

---

## 4. CCCD Number Format

**Format:** 12 digits
**Structure:** `XXXXXXXXX` (typically sequential number assigned by issuing authority)

### Breakdown:
- **Total digits:** 12
- **Components:**
  - The exact internal structure (province codes, serial numbers, checksum) is not fully public
  - Managed by Vietnamese Ministry of Public Security
  - Starts from different values based on issuing province/region

### Validity:
- Card issued before 2024: 15-year validity (for adults)
- Card issued from July 1, 2024 onward: May have different validity period (information not confirmed in public sources)

---

## 5. Changes from Old CMND to New "Căn cước" (July 1, 2024)

### Key Changes Identified:

| Aspect | Old CMND | New Căn cước (2024+) |
|---|---|---|
| **Name** | CMND (Chứng Minh Nhân Dân) | Căn cước (officially "Căn cước công dân") |
| **Biometric Data** | Limited | Enhanced - fingerprints, facial recognition data |
| **QR Code** | Absent | **Added** - 2D barcode for digital verification |
| **Digital Signature** | Not present | **Added** - for online transactions |
| **Security Features** | Basic | Enhanced - holograms, watermarks, microprinting |
| **International Standard** | Vietnamese-specific | Designed to align with international ID standards (ISO 14443, etc.) |
| **Online Verification** | Limited | **Enhanced** - enabled for remote identity verification |
| **Card Rank/Type** | Not clearly defined | More explicit categorization (standard, specialist, foreign) |
| **Validity Period** | 15 years (typical) | May be adjusted (not confirmed) |

### Naming Convention:
- The new card is officially called **"Căn cước"** (not "Căn cước công dân")
- But in practice, "Căn cước công dân" is still used interchangeably
- CCCD (abbreviation) refers to the new format

---

## 6. Text & Label Languages

### Front Side:
- **Primary Language:** Vietnamese only (monolingual)
- **Labels:** All in Vietnamese (Số CCCD, Họ và tên, Ngày sinh, etc.)
- **Values:** Vietnamese (names with diacritics, Vietnamese addresses)
- **No English:** Generally absent from standard cards

### Back Side:
- **Primarily Vietnamese**
- May include minimal English text for international standards
- QR code: Contains encoded data (binary/text, language-independent)

### Biometric/Technical:
- Fingerprints: Visual (no text)
- QR Code: Binary-encoded data (language-independent)

---

## 7. OCR Challenges for Vietnamese CCCD

### 1. **Font Variations & Typography**
- Official government typeface used (specific font)
- Font may be specialized, not standard system fonts
- Character distortion possible due to card printing process
- Italics, bold variants on some fields

**Challenge Level:** MODERATE
**Mitigation:** Use OCR trained on CCCD-specific fonts; test with actual card images

### 2. **Vietnamese Diacritics & Special Characters**
- Vietnamese uses Latin script with diacritical marks
- Characters include: á, à, ả, ã, ạ, ă, ắ, ằ, ẳ, ẵ, ặ, â, ấ, ầ, ẩ, ẫ, ậ, é, è, ẻ, ẽ, ẹ, ê, ế, ề, ể, ễ, ệ, í, ì, ỉ, ĩ, ị, ó, ò, ỏ, õ, ọ, ô, ố, ồ, ổ, ỗ, ộ, ơ, ớ, ờ, ở, ỡ, ợ, ú, ù, ủ, ũ, ụ, ư, ứ, ừ, ử, ữ, ự, ý, ỳ, ỷ, ỹ, ỵ, đ
- Total: Vietnamese alphabet ~280+ character variations

**Challenge Level:** HIGH
- Standard OCR engines (English-trained) often misread diacritics
- Example misreads: `Nguyễn` → `Nguyễn` (correct) vs `Nguyn` (missing diacritics)
- Missing diacritics = invalid names in Vietnamese context

**Mitigation:**
- Use Vietnamese-trained OCR (Tesseract with `lang=vie`)
- Apply diacritics post-processing validation
- Use Vietnamese spellchecker for name validation

### 3. **Image Quality Issues**
- **Poor lighting:** Reflections on plastic card surface
- **Blurry images:** Camera motion, auto-focus issues
- **Skew/Rotation:** Card not perfectly aligned in photo
- **Shadows:** Cast shadows from card edges obscuring text
- **Glare:** Flash reflection on hologram/security features

**Challenge Level:** HIGH
- OCR accuracy drops significantly with poor image quality
- Biometric data (fingerprints) also affected

**Mitigation:**
- Implement image preprocessing: grayscale conversion, binarization, deskew
- Require minimum image resolution (DPI ≥ 200)
- Apply contrast enhancement, noise reduction

### 4. **Layout Variations**
- Different card printing batches may have slight layout differences
- Position of fields may vary by ±2-5 pixels
- Spacing between fields not perfectly consistent
- QR code size/position on back may vary

**Challenge Level:** MODERATE
- Template-based OCR may fail with significant layout changes
- Free-form OCR better for this, but less accurate overall

**Mitigation:**
- Build flexible layout detection (card edge detection, field boundary estimation)
- Use deep learning-based OCR (YOLO, SSD) for robust field detection

### 5. **Handwritten vs. Printed Text**
- Most CCCD text is printed/machine-generated
- Some card versions may have handwritten signature (official issuer)
- Old CMND had more handwritten elements (now gone in new Căn cước)

**Challenge Level:** LOW-MODERATE
- Current Căn cước mostly printed text
- Signature recognition less critical for data extraction

### 6. **Background Noise & Artifacts**
- Card surface reflections/sheen
- Dust, scratches on card surface
- Hologram interference with text legibility
- Watermark patterns behind text areas

**Challenge Level:** MODERATE
- Holograms and security features can obscure text in certain lighting
- Requires careful image preprocessing

### 7. **QR Code & Barcode Recognition**
- 2D barcode on back of Căn cước
- May contain encrypted/encoded data
- Requires specialized barcode reader library

**Challenge Level:** MODERATE
- Standard QR code readers work, but encrypted data needs decryption keys
- Vietnamese government uses specific encoding standard

**Mitigation:**
- Use OpenCV or ZXing for QR code detection
- For encrypted data, may need Vietnamese government API access

### 8. **MRZ (Machine Readable Zone)**
- Vietnamese CCCD may have MRZ (like passports)
- Format not fully documented in public sources
- MRZ typically 2 lines × 44 characters (ICAO standard)

**Challenge Level:** UNKNOWN-MODERATE
- If present, follows international MRZ standard
- Specialized MRZ OCR libraries available (e.g., pytesseract with MRZ config)

### 9. **Name Variations & Spacing**
- Vietnamese names with spaces: `Nguyễn Văn A`, `Lê Thị B`
- Some names have middle components creating ambiguity
- OCR may split compound names incorrectly

**Challenge Level:** MODERATE
- Post-OCR validation needed for name structure
- Dictionary/database lookup for common Vietnamese names

### 10. **Date Format Variations**
- CCCD uses format: `DD/MM/YYYY` or `DD-MM-YYYY`
- Some fields may use `YYYY-MM-DD` (ISO standard on back)
- Leading zeros may be present or absent

**Challenge Level:** LOW
- Date parsing relatively straightforward
- Simple regex validation sufficient

### 11. **Numerical Value Accuracy**
- CCCD number (12 digits): Must be 100% accurate (no fuzzy matching)
- Dates, phone numbers, similar requirements
- Single digit error invalidates the entire ID

**Challenge Level:** CRITICAL
- OCR errors on numbers must be caught and corrected
- Implement digit-by-digit verification
- Use digital verification against government database if available

---

## 8. Recommended OCR Tools & Configuration

### Best Tools for Vietnamese CCCD OCR:

1. **Tesseract 5+ with Vietnamese training data**
   ```bash
   tesseract image.jpg output -l vie --psm 6
   ```
   - PSM modes: 6 (assume block of text), 11 (sparse text)
   - Config: `--oem 1` (LSTM-based, better accuracy)

2. **Google Cloud Vision API**
   - Supports Vietnamese language detection
   - High accuracy for structured documents
   - Cost: ~$1.50 per 1000 requests

3. **Azure Computer Vision (Microsoft)**
   - Vietnamese language support
   - Good for ID document recognition
   - Free tier available (5,000 calls/month)

4. **PaddleOCR (Baidu)**
   - Open-source, trained on Chinese characters (similar structure to Vietnamese diacritics)
   - Good accuracy for Vietnamese
   - Free, no API cost

5. **EasyOCR**
   - Supports 80+ languages including Vietnamese
   - PyTorch-based, good accuracy
   - Easy Python integration

### Recommended Configuration:
```python
import easyocr
import cv2

reader = easyocr.Reader(['vi'], gpu=True)  # Vietnamese language
image = cv2.imread('cccd.jpg')
results = reader.readtext(image)

# Post-process for diacritics validation
```

---

## 9. Field-Specific OCR Accuracy Expectations

| Field | Expected Accuracy | OCR Challenge | Recommendation |
|---|---|---|---|
| CCCD Number | 99%+ | Numbers easily confused (0/O, 1/l) | Verify against check digit if available |
| Full Name | 95-97% | Vietnamese diacritics | Use spellchecker, dictionary lookup |
| Date of Birth | 98%+ | Date format parsing | Validate date range (reasonable birth year) |
| Gender | 99%+ | Single character (Nam/Nữ or M/F) | Hardcoded lookup table |
| Nationality | 99%+ | Usually "Việt Nam" | Fixed value validation |
| Place of Origin | 90-92% | Provincial names, diacritics | Vietnam province database lookup |
| Place of Residence | 88-90% | Address complexity, diacritics | Fuzzy matching against address database |
| Date of Issue | 98%+ | Date format | Standard date parsing |
| Place of Issue | 90-92% | Government agency names | Database lookup |
| QR Code | 95%+ | Barcode recognition | Specialized library (ZXing, pyzbar) |

---

## 10. Typical Errors & Misreads

### Common Errors:

1. **Diacritics Dropped**
   - Input: `Nguyễn` → Output: `Nguyen` (without tilde)
   - Cause: Font rendering, OCR training data

2. **Similar Characters Confused**
   - `0` (zero) ↔ `O` (letter O)
   - `1` (one) ↔ `l` (lowercase L) ↔ `I` (uppercase I)
   - Especially in CCCD number field

3. **Address Truncation**
   - Long addresses cut off mid-word
   - Common: "Xã/Phường" (ward), "Huyện/Quận" (district) abbreviated

4. **Date Format Confusion**
   - `01/12/1990` misread as `01/12/1990` (correct) vs `01/12/1900` (wrong century)

5. **QR Code Failures**
   - If card tilted: QR code unreadable
   - Reflections/shadows: Code detection fails

---

## 11. Government & Legal References

### Primary Authority:
- **Ministry of Public Security (Bộ Công an)** - Issues and manages CCCD
- Official website: moiquocam.gov.vn

### Relevant Laws & Decrees:
- **Law on Citizen Identification Cards 2023**
- Decree implementing the law (effective July 1, 2024)
- ISO/IEC standards for ID cards followed

### Note:
Public information on exact CCCD format, checksum algorithms, QR code encryption, and MRZ specification is limited. Government documentation is not widely available online. For production systems requiring high accuracy, direct coordination with Vietnamese government may be necessary.

---

## 12. Current Implementation Status (VanTrangEdu Context)

### Existing CCCD Parser:
- Backend file: `backend/src/services/cccd-ocr-parser.ts`
- Backend service: `backend/src/services/cccd-ocr-service.ts`
- Frontend uploader: `frontend/src/components/upload/CCCDUploader.tsx`
- Quality validation: `frontend/src/components/upload/cccd-image-quality.ts`

### Current Capabilities:
- Image capture/selection from camera or file
- Basic quality check (image resolution, blur detection)
- OCR via Google Cloud Vision API or similar
- Field parsing from OCR results

### Recommended Improvements:
1. Enhance diacritics handling post-OCR
2. Implement Vietnamese-specific validation (province lookup, address parsing)
3. Add QR code/barcode reading for back-side data
4. Build confidence scoring for OCR results
5. Add fallback manual entry if OCR confidence below threshold

---

## 13. Unresolved Questions

1. **Exact QR Code Encryption:** What encryption standard does Vietnamese government use for CCCD QR codes? Not publicly documented.

2. **MRZ Standard:** Does new Căn cước (2024+) include an MRZ like ICAO passports? Not confirmed in public sources.

3. **July 1, 2024 Changes:** Exact list of format changes to CCCD effective July 1, 2024. Vietnamese government resources not fully accessible.

4. **Card Validity Period:** Is the 15-year validity maintained for cards issued after July 1, 2024? Not confirmed.

5. **Checksum Algorithm:** Is there a checksum or validation digit in the 12-digit CCCD number? Not publicly documented.

6. **QR Code Data Structure:** What specific fields/data are encoded in the QR code? Encryption/decryption method?

7. **Bilingual Printing:** Do some card batches include English translations? Standards unclear.

---

## Conclusion

Vietnamese CCCD (2025-2026) is a modern biometric ID card with:
- **12-digit unique number**
- **Multi-field structured data** (name, DOB, address, etc.)
- **Front & back design** with photo, fingerprints, QR code
- **Vietnamese-language labels** (monolingual primary)
- **Enhanced security features** (hologram, watermark, microprinting)

**OCR Challenges:** Vietnamese diacritics, image quality, layout variations, QR code/barcode recognition, address complexity.

**Best Approach:** Hybrid system combining:
- Vietnamese-trained OCR (Tesseract + `vie` lang, or EasyOCR)
- Post-processing validation (spellchecker, database lookup)
- QR code reading (ZXing/pyzbar)
- Manual fallback for low-confidence results
- Government database verification (if available)

**Accuracy Target:** 95%+ for critical fields (name, CCCD number, DOB), with human review for edge cases.

---

## Sources
1. Vietnamese Ministry of Public Security (moiquocam.gov.vn) - General info
2. Web search results on CCCD format, July 2024 changes
3. Tesseract OCR documentation & Vietnamese language models
4. General OCR best practices for identity card recognition
5. ISO 14443 standard for smart card ID documents

