export type StorageScope = 'local' | 'session';

function hasWindow() {
  return typeof window !== 'undefined';
}

export function getStorageValue(key: string): string | null {
  if (!hasWindow()) return null;

  const localValue = window.localStorage.getItem(key);
  if (localValue !== null) return localValue;

  return window.sessionStorage.getItem(key);
}

export function getStorageScope(key: string): StorageScope | null {
  if (!hasWindow()) return null;

  if (window.localStorage.getItem(key) !== null) return 'local';
  if (window.sessionStorage.getItem(key) !== null) return 'session';

  return null;
}

export function setStorageValue(
  key: string,
  value: string,
  scope?: StorageScope | null,
) {
  if (!hasWindow()) return;

  const resolvedScope = scope ?? getStorageScope(key) ?? 'local';

  if (resolvedScope === 'session') {
    window.sessionStorage.setItem(key, value);
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, value);
  window.sessionStorage.removeItem(key);
}

export function removeStorageValue(key: string) {
  if (!hasWindow()) return;

  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}
