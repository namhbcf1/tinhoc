/**
 * queries.ts — Backward-compatible re-export barrel
 *
 * Previously a 787-line god file. Now split into focused domain modules:
 *   - student-queries.js      → student CRUD + search
 *   - class-queries.js        → class CRUD
 *   - enrollment-queries.js   → registration CRUD + so_phach + sync
 *   - admin-auth-queries.js   → admins, password reset tokens, audit log, edit history
 *
 * All existing imports from this file continue to work unchanged.
 */

export {
  findStudentByCCCD,
  findStudentByEmailOrPhone,
  createStudent,
  updateStudent,
  deleteStudent,
  getAllStudents,
  searchStudents,
} from './student-queries.js';

export {
  getAllClasses,
  getOpenClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
} from './class-queries.js';

export {
  findRegistration,
  getRegistrationsByClass,
  getStudentRegistrations,
  createRegistration,
  updateRegistrationStatus,
  updateSoPhach,
  deleteRegistration,
  syncClassStudentCount,
} from './enrollment-queries.js';

export {
  findAdminByUsername,
  findAdminById,
  createAdmin,
  updateAdminPassword,
  updateAdminLastLogin,
  createPasswordResetToken,
  findPasswordResetToken,
  markPasswordResetTokenAsUsed,
  invalidateAllPasswordResetTokens,
  createAuditLog,
  logStudentEditHistory,
  getStudentEditHistory,
} from './admin-auth-queries.js';
