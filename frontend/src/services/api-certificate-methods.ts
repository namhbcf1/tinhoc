// @ts-nocheck
// ========================================
// CERTIFICATE METHODS MIXIN
// Certificate lookup, bulk issuance, revoke, download, QR
// ========================================

export function applyCertificateMethods(ApiClient) {
  // Get certificates with optional filters
  ApiClient.prototype.getCertificates = async function(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/certificates?${query}`);
  };

  // Get students eligible for certificates in a class
  ApiClient.prototype.getEligibleCertificates = async function(classId) {
    return this.request(`/certificates/class/${classId}/eligible`);
  };

  ApiClient.prototype.getEligibleStudents = async function(classId) {
    return this.getEligibleCertificates(classId);
  };

  ApiClient.prototype.issueCertificate = async function(classId, studentId) {
    const response = await this.request('/certificates', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId, student_id: studentId }),
    });
    this.invalidateCache(['/certificates', '/students', '/reports/summary']);
    return response;
  };

  // Bulk issue certificates to selected students in a class
  ApiClient.prototype.bulkIssueCertificates = async function(classId, studentIds) {
    const response = await this.request('/certificates/bulk', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId, student_ids: studentIds }),
    });
    this.invalidateCache(['/certificates', '/students', '/reports/summary']);
    return response;
  };

  // Revoke an issued certificate
  ApiClient.prototype.revokeCertificate = async function(certificateId) {
    const response = await this.request(`/certificates/${certificateId}/revoke`, {
      method: 'PUT',
    });
    this.invalidateCache(['/certificates']);
    return response;
  };

  // Public certificate lookup by CCCD or certificate number
  ApiClient.prototype.lookupCertificate = async function(cccd, certificateNumber) {
    const params = new URLSearchParams();
    if (cccd) params.append('cccd', cccd);
    if (certificateNumber) params.append('certificate_number', certificateNumber);
    return this.request(`/certificates/lookup?${params.toString()}`);
  };

  // Download certificate as HTML or other format
  ApiClient.prototype.downloadCertificate = async function(certificateId, format = 'html') {
    const url = `${this.baseURL}/certificates/${certificateId}/download?format=${format}`;

    if (format === 'html') {
      // Return HTML as text
      const headers = {};
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error('Lỗi tải chứng chỉ');
      }
      return await response.text();
    }

    return this.request(`/certificates/${certificateId}/download?format=${format}`);
  };

  ApiClient.prototype.getCertificateDownloadUrl = function(certificateId, format = 'html') {
    return `${this.baseURL}/certificates/${certificateId}/download?format=${format}`;
  };

  // Get QR code data for a certificate
  ApiClient.prototype.getCertificateQRCode = async function(certificateId) {
    return this.request(`/certificates/${certificateId}/qr-code`);
  };

  ApiClient.prototype.getCertificateShipment = async function(certificateId) {
    return this.request(`/certificates/${certificateId}/shipment`);
  };

  ApiClient.prototype.normalizeCertificateShipmentAddress = async function(payload) {
    return this.request('/shipping/viettel-post/normalize-address', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  ApiClient.prototype.quoteCertificateShipment = async function(payload) {
    return this.request('/shipping/viettel-post/quote', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  ApiClient.prototype.createCertificateShipment = async function(certificateId, payload) {
    const response = await this.request(`/certificates/${certificateId}/shipment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.invalidateCache(['/certificates']);
    return response;
  };
}
