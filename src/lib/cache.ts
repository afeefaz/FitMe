const CACHE_VERSION = 1;

interface CacheEntry<T> {
  v: number;
  data: T;
  expiresAt: number;
}

export function cacheGet<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.v !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  try {
    const entry: CacheEntry<T> = {
      v: CACHE_VERSION,
      data,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function cacheDelete(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Fail silently
  }
}
