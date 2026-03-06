// ========================================
// PDF UTILITIES - Tạo PDF từ HTML certificate
// ========================================

/**
 * Download certificate as PDF
 * @param {string} htmlContent - HTML content of certificate
 * @param {string} filename - Filename for download
 */
export async function downloadCertificatePDF(htmlContent, filename = 'certificate.pdf') {
  try {
    // Create a temporary iframe to render HTML
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '1123px';
    iframe.style.height = '794px';
    document.body.appendChild(iframe);

    return new Promise((resolve, reject) => {
      iframe.onload = async () => {
        try {
          const { default: html2canvas } = await import('html2canvas');
          const { jsPDF } = await import('jspdf');

          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write(htmlContent);
          iframeDoc.close();

          // Wait for images to load
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const element = iframeDoc.body;
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: 1123,
            height: 794,
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [1123, 794],
          });

          pdf.addImage(imgData, 'PNG', 0, 0, 1123, 794);
          pdf.save(filename);

          document.body.removeChild(iframe);
          resolve();
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      };

      iframe.src = 'about:blank';
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Open certificate in new window for printing
 * @param {string} htmlContent - HTML content of certificate
 */
export function printCertificate(htmlContent) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.print();
  };
}

/**
 * Generate QR code data URL
 * @param {string} text - Text to encode in QR code
 * @returns {Promise<string>} QR code data URL
 */
export async function generateQRCode(text) {
  try {
    const QRCode = await import('qrcode');
    const dataUrl = await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback: return empty string or placeholder
    return '';
  }
}
