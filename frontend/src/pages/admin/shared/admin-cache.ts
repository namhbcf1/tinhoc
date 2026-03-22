import { clearCache, clearCacheByPrefix, getCache, setCache } from '../../../utils/cache';

const ADMIN_CACHE_PREFIX = 'admin_ui:';
const ADMIN_INVALIDATION_STORAGE_KEY = `${ADMIN_CACHE_PREFIX}last-invalidated`;

export const ADMIN_DATA_INVALIDATED_EVENT = 'admin-data-invalidated';

export const ADMIN_CACHE_TTL = {
  dashboardOverview: 2 * 60 * 1000,
  students: 2 * 60 * 1000,
  classes: 10 * 60 * 1000,
  payments: 60 * 1000,
  documents: 3 * 60 * 1000,
  documentMeta: 15 * 60 * 1000,
  assignments: 3 * 60 * 1000,
  examSchedules: 3 * 60 * 1000,
  examTaxonomy: 15 * 60 * 1000,
  myClasses: 5 * 60 * 1000,
  mySchedule: 5 * 60 * 1000,
  myExams: 5 * 60 * 1000,
} as const;

export const ADMIN_CACHE_KEYS = {
  dashboardOverview: 'dashboard-overview',
  mobileDashboardOverview: 'mobile-dashboard-overview',
  students: 'students',
  classes: 'classes',
  payments: 'payments',
  paymentClasses: 'payments-classes',
  documents: 'documents',
  documentTargets: 'documents-targets',
  documentFolders: 'documents-folders',
  assignments: 'assignments',
  assignmentClasses: 'assignment-classes',
  examSchedules: 'exam-schedules',
  examCategories: 'exam-categories',
  examTypes: 'exam-types',
  myClasses: 'my-classes',
  mySchedule: 'my-schedule',
  myExams: 'my-exams',
} as const;

export interface AdminInvalidationDetail {
  timestamp: number;
  keys?: string[];
  prefixes?: string[];
  source?: string;
}

function makeKey(key: string) {
  return `${ADMIN_CACHE_PREFIX}${key}`;
}

export function getAdminCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === 'undefined') return null;
  return getCache(makeKey(key), ttlMs) as T | null;
}

export function setAdminCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  setCache(makeKey(key), data);
}

export function clearAdminCache(key: string) {
  if (typeof window === 'undefined') return;
  clearCache(makeKey(key));
}

export function clearAdminCachePrefix(prefix: string) {
  if (typeof window === 'undefined') return;
  clearCacheByPrefix(makeKey(prefix));
}

export function clearAllAdminCache() {
  if (typeof window === 'undefined') return;
  clearCacheByPrefix(ADMIN_CACHE_PREFIX);
}

export function invalidateAdminData(detail: Omit<AdminInvalidationDetail, 'timestamp'> = {}) {
  if (typeof window === 'undefined') return;

  const payload: AdminInvalidationDetail = {
    timestamp: Date.now(),
    keys: detail.keys ?? [],
    prefixes: detail.prefixes ?? [],
    source: detail.source ?? 'admin',
  };

  payload.keys?.forEach((key) => clearAdminCache(key));
  payload.prefixes?.forEach((prefix) => clearAdminCachePrefix(prefix));

  try {
    localStorage.setItem(ADMIN_INVALIDATION_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Unable to persist admin invalidation state:', error);
  }

  window.dispatchEvent(new CustomEvent(ADMIN_DATA_INVALIDATED_EVENT, { detail: payload }));
}

export function subscribeAdminDataInvalidation(listener: (detail: AdminInvalidationDetail) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<AdminInvalidationDetail>;
    if (customEvent.detail) {
      listener(customEvent.detail);
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== ADMIN_INVALIDATION_STORAGE_KEY || !event.newValue) return;

    try {
      const detail = JSON.parse(event.newValue) as AdminInvalidationDetail;
      listener(detail);
    } catch (error) {
      console.warn('Unable to parse admin invalidation payload:', error);
    }
  };

  window.addEventListener(ADMIN_DATA_INVALIDATED_EVENT, handleCustomEvent as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(ADMIN_DATA_INVALIDATED_EVENT, handleCustomEvent as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
}
