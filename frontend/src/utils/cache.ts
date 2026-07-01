// @ts-nocheck
// ========================================
// CACHE UTILITY
// ========================================

const CACHE_PREFIX = 'app_cache_';
export const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function parseCacheEntry(rawValue) {
  if (!rawValue) return null;
  const parsed = JSON.parse(rawValue);
  if (!parsed || typeof parsed !== 'object') return null;
  return parsed;
}

/**
 * Get cached data
 */
export function getCache(key, ttlMs = DEFAULT_CACHE_DURATION) {
  try {
    const entry = parseCacheEntry(localStorage.getItem(CACHE_PREFIX + key));
    if (!entry) return null;
    const { data, timestamp } = entry;
    const now = Date.now();

    // Check if cache is expired
    if (now - timestamp > ttlMs) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Set cache data
 */
export function setCache(key, data) {
  let cacheData;
  try {
    cacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error setting cache:', error);
    // If storage is full, clear old cache
    if (error.name === 'QuotaExceededError') {
      clearOldCache();
      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
      } catch (retryError) {
        console.error('Error setting cache after cleanup:', retryError);
      }
    }
  }
}

/**
 * Clear specific cache
 */
export function clearCache(key) {
  localStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Clear all cache entries whose logical key starts with a prefix
 */
export function clearCacheByPrefix(prefix) {
  const targetPrefix = CACHE_PREFIX + prefix;
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(targetPrefix)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Clear old cache entries
 */
function clearOldCache() {
  const keys = Object.keys(localStorage);
  const now = Date.now();
  
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          if (now - timestamp > DEFAULT_CACHE_DURATION) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        // Remove invalid cache entries
        localStorage.removeItem(key);
      }
    }
  });
}

/**
 * Cache API response
 */
export async function cachedFetch(key, fetchFn, options = true) {
  const config = typeof options === 'object'
    ? {
      enabled: options.enabled !== false,
      ttlMs: options.ttlMs || DEFAULT_CACHE_DURATION,
    }
    : {
      enabled: options !== false,
      ttlMs: DEFAULT_CACHE_DURATION,
    };

  // Try to get from cache first
  if (config.enabled) {
    const cached = getCache(key, config.ttlMs);
    if (cached !== null) {
      return cached;
    }
  }

  // Fetch fresh data
  try {
    const data = await fetchFn();

    // Cache the result
    if (config.enabled) {
      setCache(key, data);
    }
    
    return data;
  } catch (error) {
    // On error, try to return cached data if available
    if (config.enabled) {
      const cached = getCache(key, config.ttlMs);
      if (cached !== null) {
        console.warn('Using cached data due to fetch error:', error);
        return cached;
      }
    }
    throw error;
  }
}
