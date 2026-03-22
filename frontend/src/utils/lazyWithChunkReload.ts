import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

const CHUNK_RELOAD_GUARD_KEY = 'vt_chunk_reload_at';
const CHUNK_RELOAD_COOLDOWN_MS = 15000;

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return `${error.message}\n${error.stack ?? ''}`;
  try {
    return JSON.stringify(error);
  } catch {
    return '';
  }
}

function isStaleChunkError(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Expected a JavaScript-or-Wasm module script') ||
    message.includes('Failed to load module script') ||
    message.includes('Unable to preload CSS') ||
    message.includes('dynamically imported module') ||
    message.includes('Lazy module missing default export')
  );
}

function reloadForStaleChunk() {
  try {
    const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) || '0');
    const now = Date.now();
    if (now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
      return;
    }
    sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, String(now));
  } catch {
    // Ignore storage access issues and still try a hard reload.
  }

  window.location.reload();
}

export function lazyWithChunkReload<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await loader();
      if (!module || typeof module !== 'object' || typeof module.default === 'undefined') {
        throw new Error('Lazy module missing default export');
      }
      return module;
    } catch (error) {
      if (typeof window !== 'undefined' && isStaleChunkError(error)) {
        reloadForStaleChunk();
        return new Promise<never>(() => {});
      }
      throw error;
    }
  });
}
