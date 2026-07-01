// @ts-nocheck
// ========================================
// DOCUMENT UPLOAD HELPERS
// Shared FormData upload logic used by api-document-methods.js
// ========================================

/**
 * POST a FormData payload to /documents/upload with admin token auth.
 * Returns parsed JSON or throws with the server error message.
 */
export async function uploadToDocumentsEndpoint(baseURL, getToken, formData) {
  const url = `${baseURL}/documents/upload`;
  const headers = {};
  const token = getToken('admin');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { method: 'POST', headers, body: formData });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || error.message || 'Upload failed');
  }

  return response.json();
}
