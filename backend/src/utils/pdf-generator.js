// ========================================
// PDF GENERATOR - Tạo PDF chứng chỉ
// ========================================

/**
 * Generate certificate PDF as HTML (for client-side conversion)
 * In Cloudflare Workers, we'll return HTML that can be converted to PDF
 * using browser's print-to-PDF or a service
 */
export function generateCertificateHTML(certificateData) {
  const {
    certificateNumber,
    studentName,
    cccd,
    className,
    issuedDate,
    title = 'Chứng chỉ hoàn thành khóa học',
    qrCodeUrl,
  } = certificateData;

  const formattedDate = new Date(issuedDate).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chứng chỉ - ${certificateNumber}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .certificate-container {
      background: white;
      width: 100%;
      max-width: 1123px;
      height: 794px;
      position: relative;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .certificate-border {
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      bottom: 20px;
      border: 8px solid #d4af37;
      border-radius: 10px;
    }
    
    .certificate-header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .certificate-logo {
      font-size: 48px;
      color: #d4af37;
      margin-bottom: 20px;
    }
    
    .certificate-title {
      font-size: 36px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .certificate-subtitle {
      font-size: 18px;
      color: #7f8c8d;
      margin-bottom: 50px;
    }
    
    .certificate-body {
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
    }
    
    .certificate-text {
      font-size: 20px;
      color: #34495e;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    
    .student-name {
      font-size: 42px;
      font-weight: bold;
      color: #2c3e50;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 3px solid #d4af37;
      display: inline-block;
      padding-bottom: 10px;
    }
    
    .certificate-details {
      font-size: 18px;
      color: #34495e;
      margin: 20px 0;
      line-height: 1.6;
    }
    
    .certificate-footer {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
      width: 100%;
      padding-top: 40px;
      border-top: 2px solid #ecf0f1;
    }
    
    .certificate-signature {
      text-align: center;
      flex: 1;
    }
    
    .signature-name {
      font-size: 18px;
      font-weight: bold;
      color: #2c3e50;
      margin-top: 60px;
      border-top: 2px solid #34495e;
      padding-top: 10px;
      display: inline-block;
      min-width: 200px;
    }
    
    .certificate-number {
      position: absolute;
      bottom: 30px;
      right: 40px;
      font-size: 14px;
      color: #7f8c8d;
    }
    
    .qr-code-container {
      position: absolute;
      bottom: 30px;
      left: 40px;
      text-align: center;
    }
    
    .qr-code-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 5px;
    }
    
    .qr-code-image {
      width: 100px;
      height: 100px;
      border: 2px solid #ecf0f1;
      padding: 5px;
      background: white;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .certificate-container {
        box-shadow: none;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="certificate-border"></div>
    
    <div class="certificate-header">
      <div class="certificate-logo">🎓</div>
      <h1 class="certificate-title">Chứng chỉ</h1>
      <p class="certificate-subtitle">Certificate of Completion</p>
    </div>
    
    <div class="certificate-body">
      <p class="certificate-text">
        Công ty TNHH Tư vấn Giáo dục Sơn Trang xác nhận rằng:
      </p>
      
      <div class="student-name">${studentName}</div>
      
      <p class="certificate-details">
        Đã hoàn thành khóa học<br>
        <strong>${className}</strong><br>
        Vào ngày ${formattedDate}
      </p>
    </div>
    
    <div class="certificate-footer">
      <div class="certificate-signature">
        <div class="signature-name">Người ký</div>
        <div style="margin-top: 10px; font-size: 16px; color: #7f8c8d;">
          Phạm Thị Vân Trang<br>
          Người đại diện
        </div>
      </div>
      
      <div class="certificate-signature">
        <div class="signature-name">Ngày cấp</div>
        <div style="margin-top: 10px; font-size: 16px; color: #7f8c8d;">
          ${formattedDate}
        </div>
      </div>
    </div>
    
    ${qrCodeUrl ? `
    <div class="qr-code-container">
      <img src="${qrCodeUrl}" alt="QR Code" class="qr-code-image" />
      <div class="qr-code-label">Quét để tra cứu</div>
    </div>
    ` : ''}
    
    <div class="certificate-number">
      Số chứng chỉ: ${certificateNumber}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate QR code data URL for certificate lookup
 */
export async function generateQRCodeDataURL(lookupUrl) {
  // Use external QR code API service
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lookupUrl)}&margin=1`;
  return qrApiUrl;
}
