# Phase 03 — Frontend Architecture Refactor

## Context Links

- [Frontend UI/UX Report](../reports/frontend-ui-ux-report.md)
- Main API client: `frontend/src/services/api.js` (1,819 lines)
- Legacy API helper: `frontend/src/lib/api.js` (27 lines — thin wrapper, keep as-is)
- Duplicate components: `BackToTop.jsx` vs `ScrollToTopButton.jsx`
- Duplicate date inputs: `DateInput.jsx` vs `DateInputDDMMYYYY.jsx`
- Desktop/Mobile student pages: `pages/student/desktop/` and `pages/student/mobile/`

## Overview

- **Priority:** 🟡 Medium
- **Status:** Pending
- **Description:** Split the monolithic `api.js` (1,819 LOC) into domain modules. Remove duplicate components. Consolidate Desktop/Mobile code where practical. Rename camelCase files.

## Key Insights

1. **`services/api.js`** is a single class `ApiClient` with ~130 methods spanning 15+ domains. It has duplicate methods: `uploadClassDocument` (lines 768 & 844) and `getPosts` (lines 1012 & 1625).
2. **`lib/api.js`** (27 lines) is a separate thin fetch wrapper — NOT related to `services/api.js`. Keep it.
3. **BackToTop.jsx** (47 lines) — used in public pages (HomePage, PostDetailPage, NewsPage). Uses raw `<button>`.
4. **ScrollToTopButton.jsx** (46 lines) — used in layouts (AdminLayout, ModernPublicLayout). Uses shadcn `<Button>`.
5. **DateInput.jsx** (165 lines) — full-featured with hidden native date picker + manual input + calendar icon.
6. **DateInputDDMMYYYY.jsx** (130 lines) — simpler, text-only input. Different `onChange` signature (emits synthetic event object vs raw string).
7. **Desktop/Mobile split** — Student pages have 10 desktop + 9 mobile versions. Not a simple rename; mobile versions have different UX (bottom nav, cards, touch gestures). Consolidation needs responsive design, not just removing mobile files.
8. **Frontend page files** — 15+ files exceed 200 LOC, up to 1,614 lines (ExamSchedulesPage.jsx). This is a separate concern from api.js splitting.

## Requirements

### Functional
- Split `services/api.js` into domain-specific modules, each <200 LOC
- Remove duplicate `uploadClassDocument` and `getPosts` methods
- Consolidate `BackToTop.jsx` and `ScrollToTopButton.jsx` into one component
- Consolidate `DateInput.jsx` and `DateInputDDMMYYYY.jsx` into one component
- All frontend code files <200 LOC

### Non-Functional
- `api` default export must remain identical (class instance with all methods) — callers import `api` and call `api.getStudents()`, `api.login()`, etc.
- No behavioral changes to any component

## Architecture

### api.js Split Strategy

Keep the `ApiClient` class but use composition — split method groups into mixin modules:

```
frontend/src/services/
├── api.js                      # Main barrel: creates ApiClient, mixes in all domains, exports default instance
├── api-client-core.js          # Base class: constructor, request(), cachedRequest(), token mgmt, login/logout
├── api-student-methods.js      # Student CRUD methods (mixin)
├── api-class-methods.js        # Class + online class methods (mixin)
├── api-registration-methods.js # Registration methods (mixin)
├── api-document-methods.js     # Document + folder methods (mixin)
├── api-payment-methods.js      # Payment methods (mixin)
├── api-certificate-methods.js  # Certificate methods (mixin)
├── api-post-methods.js         # Post/news methods (mixin — remove duplicate getPosts)
├── api-admin-methods.js        # Admin + activity log methods (mixin)
├── api-messaging-methods.js    # Messaging methods (mixin)
├── api-exam-schedule-methods.js# Exam schedule methods (mixin)
├── api-teacher-methods.js      # Teacher methods (mixin)
├── api-export-methods.js       # Export/backup methods (mixin)
├── api-exam-methods.js         # VSTEP + exam bank methods (mixin)
├── api-misc-methods.js         # Homepage, notifications, reports, attendance, AI, grading (mixin)
└── api-class-schedule-methods.js # Class schedule + class teacher methods (mixin)
```

**Mixin pattern:**
```js
// api-student-methods.js
export function applyStudentMethods(ApiClient) {
  ApiClient.prototype.getStudents = async function(limit = 100, offset = 0) {
    return this.request(`/students?limit=${limit}&offset=${offset}`);
  };
  // ... more student methods
}
```

**api.js barrel:**
```js
import { ApiClient } from './api-client-core.js';
import { applyStudentMethods } from './api-student-methods.js';
import { applyClassMethods } from './api-class-methods.js';
// ... all mixins

applyStudentMethods(ApiClient);
applyClassMethods(ApiClient);
// ... apply all

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export default new ApiClient(API_BASE_URL);
```

This keeps `api.default` identical — all callers unchanged.

## Related Code Files

### Files to Modify
- `frontend/src/services/api.js` — Split into modules
- `frontend/src/pages/public/HomePage.jsx` — Switch `BackToTop` → `ScrollToTopButton`
- `frontend/src/pages/public/PostDetailPage.jsx` — Switch `BackToTop` → `ScrollToTopButton`
- `frontend/src/pages/public/NewsPage.jsx` — Switch `BackToTop` → `ScrollToTopButton`
- All files importing `DateInputDDMMYYYY` — Switch to `DateInput`

### Files to Create
- `frontend/src/services/api-client-core.js`
- `frontend/src/services/api-student-methods.js`
- `frontend/src/services/api-class-methods.js`
- `frontend/src/services/api-registration-methods.js`
- `frontend/src/services/api-document-methods.js`
- `frontend/src/services/api-payment-methods.js`
- `frontend/src/services/api-certificate-methods.js`
- `frontend/src/services/api-post-methods.js`
- `frontend/src/services/api-admin-methods.js`
- `frontend/src/services/api-messaging-methods.js`
- `frontend/src/services/api-exam-schedule-methods.js`
- `frontend/src/services/api-teacher-methods.js`
- `frontend/src/services/api-export-methods.js`
- `frontend/src/services/api-exam-methods.js`
- `frontend/src/services/api-misc-methods.js`
- `frontend/src/services/api-class-schedule-methods.js`

### Files to Delete
- `frontend/src/components/ui/BackToTop.jsx` — replaced by ScrollToTopButton
- `frontend/src/components/ui/DateInputDDMMYYYY.jsx` — replaced by DateInput

## Implementation Steps

### Step 1: Remove duplicate methods from api.js

Before splitting, resolve duplicates:

**`uploadClassDocument` (lines 768-793 and 844-872):**
- Line 768 version: sends `formData` with file + metadata fields
- Line 844 version: sends `formData` with file + metadata fields (nearly identical)
- **Action:** Keep the first version (line 768). Remove the second (line 844). Check which callers use each — they should both point to same endpoint.

**`getPosts` (lines 1012-1016 and 1625-1629):**
- Line 1012: `this.request('/posts', { params })`
- Line 1625: `this.request('/posts', { params })` — identical
- **Action:** Remove the second duplicate (line 1625).

### Step 2: Extract api-client-core.js

Move from `api.js`:
- `constructor(baseURL)` (line 26)
- `getCurrentRole()` (line 36)
- `getTokenByRole(role)` (line 47)
- `getToken(type)` (line 55)
- `setToken(token, type)` (line 70)
- `isTokenExpired(token)` (line 85)
- `request(endpoint, options)` (line 103)
- `cachedRequest(endpoint, options, useCache)` (line 242)
- `login(username, password)` (line 258)
- `logout()` (line 274)
- `logoutRole(role)` (line 291)
- `loginStudent(cccd, sdt)` (line 311)

~200 lines. Export `ApiClient` class.

### Step 3: Extract domain method modules

For each domain group, create a mixin file with the `apply*Methods(ApiClient)` pattern.

**Estimated line counts per module:**

| Module | Methods | Est. Lines |
|---|---|---|
| `api-student-methods.js` | getStudents, searchStudents, getStudentByCCCD, updateStudent, updateStudentByCCCD, getStudentEditHistory, createStudentAdmin, deleteStudent | ~80 |
| `api-class-methods.js` | getClasses, getOpenClasses, getClass, createClass, updateClass, deleteClass, getOnlineClasses, getOnlineClass, getAvailableStudents, addStudentToClass, getClassVideos, playVideo | ~120 |
| `api-registration-methods.js` | registerForClass, getRegistrationsByClass, getStudentRegistrations, getOnlineClassEnrollments, removeStudentFromOnlineClass, getPendingEnrollments, approveEnrollment, rejectEnrollment, updateRegistrationStatus, updateSoPhach, deleteRegistration | ~120 |
| `api-document-methods.js` | uploadDocument, getDocumentsByCCCD, getAllDocuments, deleteDocument, uploadDocumentWithPermission, getDocumentFolders, createDocumentFolder, updateDocumentFolder, deleteDocumentFolder, getDocumentsByFolder, getDocumentShares, shareDocument, unshareDocument, getSharedDocumentsForOnlineClass, getSharedDocumentsForOfflineClass, uploadClassDocument, getDocumentDownloadUrl, downloadDocument, getStudentDocuments, getDocumentsByClass, getDocumentsByOnlineClass, uploadOnlineClassDocument | ~180 |
| `api-payment-methods.js` | getPayments, getPaymentStats, confirmPayment, rejectPayment, createPayment, getPaymentsByRegistration | ~60 |
| `api-certificate-methods.js` | getCertificates, getEligibleCertificates, bulkIssueCertificates, revokeCertificate, lookupCertificate, downloadCertificate, getCertificateQRCode | ~90 |
| `api-post-methods.js` | getPosts, getPostById, createPost, updatePost, deletePost, publishPost, unpublishPost | ~70 |
| `api-admin-methods.js` | getAdmins, getAdminById, createAdmin, updateAdmin, deleteAdmin, getActivityLogs | ~60 |
| `api-messaging-methods.js` | getConversations, createConversation, getMessages, sendMessage, getUnreadMessageCount | ~50 |
| `api-exam-schedule-methods.js` | getAllExamSchedules, getUpcomingExams, getStudentExams, registerExam, cancelExam, getExamStudents, removeStudentFromExam, getExamSchedulesByClass, addStudentsToExam, addStudentsToExamWithForce, createExamSchedule, updateExamSchedule, deleteExamSchedule, downloadExamListExcel, getPendingExamStudents, approveExamStudent, approveAllExamStudents, getExamRegistrationConflicts, getStudentExamRegistrationHistory, getTrashExamSchedules, restoreExamSchedule, permanentDeleteExamSchedule, rejectExamStudent | ~190 |
| `api-teacher-methods.js` | loginTeacher, getTeacherProfile, updateTeacherProfile, changeTeacherPassword, getTeacherClasses, getTeacherSchedule, getTeacherExams, getAllTeachers, searchTeachers, createTeacher, updateTeacher, deleteTeacher | ~120 |
| `api-export-methods.js` | getExportUrl, downloadExcel, downloadExamExcel, getTemplates, exportDatabaseJSON, exportTableCSV, createBackup, listBackups, restoreBackup | ~130 |
| `api-exam-methods.js` | getVstepAttempt, getVstepExam, saveVstepAnswer, submitVstepAttempt, logVstepSecurityEvent, getPublishedExams, getMyExamHistory, getExams, getExam, createExam, updateExam, deleteExam, getExamStats, getCategories, getExamSections, createExamSection, updateExamSection, deleteExamSection, getExamGroups, createExamGroup, updateExamGroup, deleteExamGroup, getExamQuestions, createExamQuestion, updateExamQuestion, deleteExamQuestion, getAttemptDetail, submitGrade | ~190 |
| `api-misc-methods.js` | getHomepageSettings, getHomepageSetting, updateHomepageSettings, setHomepageSetting, getNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead, createNotification, deleteNotification, getPaymentReports, getRegistrationReports, getCertificateReports, getStudentsByClassReport, getReportSummary, queryAI | ~160 |
| `api-class-schedule-methods.js` | getClassSchedules, createClassSchedule, updateClassSchedule, deleteClassSchedule, getClassTeachers, assignTeacherToClass, removeTeacherFromClass | ~60 |
| `api-attendance-methods.js` | markAttendance, markAttendanceBatch, getAttendanceByRegistration, getAttendanceByClass | ~50 |

### Step 4: Rebuild api.js as barrel

Replace 1,819-line file with ~40-line barrel that imports core + applies all mixins + exports default instance.

### Step 5: Consolidate BackToTop → ScrollToTopButton

**Decision:** Keep `ScrollToTopButton.jsx` (uses shadcn `<Button>` = more consistent). Delete `BackToTop.jsx`.

**Update imports in:**
- `pages/public/HomePage.jsx` line 11: `import BackToTop` → `import ScrollToTopButton from '../../components/ui/ScrollToTopButton'`
- `pages/public/PostDetailPage.jsx` line 11: same change
- `pages/public/NewsPage.jsx` line 14: same change

**Update JSX usage:**
- `<BackToTop />` → `<ScrollToTopButton />`

### Step 6: Consolidate DateInput components

**Decision:** Keep `DateInput.jsx` (more full-featured with native date picker fallback + calendar icon). Delete `DateInputDDMMYYYY.jsx`.

**BUT** — `DateInput` and `DateInputDDMMYYYY` have different `onChange` signatures:
- `DateInput.onChange(value)` — raw string `"yyyy-mm-dd"`
- `DateInputDDMMYYYY.onChange({ target: { value, valueAsDate } })` — synthetic event

**Files importing DateInputDDMMYYYY:**
- `pages/admin/desktop/AssignmentsManagement.jsx`
- `pages/admin/desktop/ExamSchedulesPage.jsx`
- `pages/admin/desktop/OnlineClassesManagement.jsx`

**Action:** At each call site, wrap `DateInput.onChange` to emit the synthetic event format expected by the caller, OR update callers to accept raw string. Prefer updating callers (simpler — just use `value` directly instead of `e.target.value`).

### Step 7: Desktop/Mobile Consolidation Assessment

**DO NOT consolidate Desktop/Mobile pages in this phase.** This is a significant UX refactor (responsive design) that risks breaking the mobile experience. Instead:

- **Flag for Phase 5 (future):** Create responsive components using Tailwind breakpoints
- **Current action:** Leave Desktop/Mobile structure as-is
- **Rationale:** YAGNI — the split works, users aren't complaining about it. Consolidation adds risk without user-facing benefit.

### Step 8 (Stretch): Split largest frontend page files

Files >500 LOC that should be split (NOT in this phase — separate Phase 5 task):

| File | Lines | Notes |
|---|---|---|
| `admin/desktop/ExamSchedulesPage.jsx` | 1,614 | Split into sub-components |
| `student/desktop/UnifiedClassesPage.jsx` | 1,245 | Split into tabs/sections |
| `admin/desktop/ClassDetailDashboard.jsx` | 1,233 | Split into dashboard widgets |
| `student/mobile/MobileClassesModule.jsx` | 1,186 | Split into sub-modules |
| `admin/mobile/MobileStudentsModule.jsx` | 1,057 | Split into sub-modules |

**Log these for future work but DO NOT block this phase on them.**

## Todo List

### API Split
- [ ] Remove duplicate `uploadClassDocument` (line 844, keep line 768)
- [ ] Remove duplicate `getPosts` (line 1625, keep line 1012)
- [ ] Create `api-client-core.js` with base class
- [ ] Create `api-student-methods.js`
- [ ] Create `api-class-methods.js`
- [ ] Create `api-registration-methods.js`
- [ ] Create `api-document-methods.js`
- [ ] Create `api-payment-methods.js`
- [ ] Create `api-certificate-methods.js`
- [ ] Create `api-post-methods.js`
- [ ] Create `api-admin-methods.js`
- [ ] Create `api-messaging-methods.js`
- [ ] Create `api-exam-schedule-methods.js`
- [ ] Create `api-teacher-methods.js`
- [ ] Create `api-export-methods.js`
- [ ] Create `api-exam-methods.js`
- [ ] Create `api-misc-methods.js`
- [ ] Create `api-class-schedule-methods.js`
- [ ] Create `api-attendance-methods.js`
- [ ] Rebuild `api.js` as barrel (~40 lines)
- [ ] Verify all API calls work from frontend (manual smoke test)

### Component Dedup
- [ ] Update HomePage.jsx to use ScrollToTopButton
- [ ] Update PostDetailPage.jsx to use ScrollToTopButton
- [ ] Update NewsPage.jsx to use ScrollToTopButton
- [ ] Delete BackToTop.jsx
- [ ] Update AssignmentsManagement.jsx to use DateInput
- [ ] Update ExamSchedulesPage.jsx to use DateInput
- [ ] Update OnlineClassesManagement.jsx to use DateInput
- [ ] Delete DateInputDDMMYYYY.jsx

### Verification
- [ ] All `services/api-*.js` files < 200 LOC
- [ ] No duplicate methods in API client
- [ ] No imports of deleted components anywhere
- [ ] Frontend builds without errors
- [ ] All major flows work (login, student CRUD, class management, exams)

## Success Criteria

1. `services/api.js` reduced to ~40-line barrel export
2. All API method modules <200 LOC each
3. `api.default` export maintains identical interface (no caller changes needed)
4. Duplicate `uploadClassDocument` and `getPosts` removed
5. `BackToTop.jsx` deleted, all callers use `ScrollToTopButton.jsx`
6. `DateInputDDMMYYYY.jsx` deleted, all callers use `DateInput.jsx`
7. Frontend builds and runs correctly

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Mixin pattern breaks `this` context | High | Low | Arrow functions in ApiClient; test one mixin first |
| Missing method after split | High | Medium | Count methods before/after split — must match (minus 2 duplicates) |
| DateInput onChange signature breaks callers | Medium | Medium | Test each form that uses DateInput after migration |
| Build-time import errors | Low | Low | Vite will report immediately; fix before deploying |

## Security Considerations

- No security changes in this phase
- API tokens/auth handled identically by `api-client-core.js`
- No new network requests or endpoints

## Next Steps

- Phase 4: Bug Fixes & Cleanup (depends on component dedup from this phase)
- Phase 5 (future): Split large page components (1000+ LOC JSX files)
- Phase 5 (future): Desktop/Mobile responsive consolidation
