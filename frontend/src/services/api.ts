// ========================================
// API BARREL
// Assembles ApiClient with all domain method mixins.
// All callers import { default as api } from './services/api' and call api.methodName()
// ========================================

import { ApiClient, getApiBaseUrl } from './api-client-core.js';

import { applyStudentMethods } from './api-student-methods.js';
import { applyClassMethods } from './api-class-methods.js';
import { applyRegistrationMethods } from './api-registration-methods.js';
import { applyDocumentMethods } from './api-document-methods.js';
import { applyPaymentMethods } from './api-payment-methods.js';
import { applyCertificateMethods } from './api-certificate-methods.js';
import { applyPostMethods } from './api-post-methods.js';
import { applyAdminMethods } from './api-admin-methods.js';
import { applyMessagingMethods } from './api-messaging-methods.js';
import { applyExamScheduleMethods } from './api-exam-schedule-methods.js';
import { applyTeacherMethods } from './api-teacher-methods.js';
import { applyExportMethods } from './api-export-methods.js';
import { applyMiscMethods } from './api-misc-methods.js';
import { applyClassScheduleMethods } from './api-class-schedule-methods.js';
import { applyAttendanceMethods } from './api-attendance-methods.js';

// Apply all domain mixins onto ApiClient.prototype
applyStudentMethods(ApiClient);
applyClassMethods(ApiClient);
applyRegistrationMethods(ApiClient);
applyDocumentMethods(ApiClient);
applyPaymentMethods(ApiClient);
applyCertificateMethods(ApiClient);
applyPostMethods(ApiClient);
applyAdminMethods(ApiClient);
applyMessagingMethods(ApiClient);
applyExamScheduleMethods(ApiClient);
applyTeacherMethods(ApiClient);
applyExportMethods(ApiClient);
applyMiscMethods(ApiClient);
applyClassScheduleMethods(ApiClient);
applyAttendanceMethods(ApiClient);

// Singleton instance used by all callers via: import api from '../services/api'
const api = new ApiClient(getApiBaseUrl());

export default api;
export { ApiClient };
