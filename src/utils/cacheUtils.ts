/**
 * Cache utility functions for optimizing data fetching
 */

// Simple in-memory cache
export const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

// Default cache expiration time (5 minutes)
const DEFAULT_CACHE_TIME = 5 * 60 * 1000;

// Cache duration constants
export const CACHE_DURATIONS = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Get data from cache if available and not expired
 * @param key Cache key
 * @param maxAge Maximum age of cache in milliseconds
 * @returns Cached data or null if not found or expired
 */
export function getFromCache<T>(key: string, maxAge = DEFAULT_CACHE_TIME): T | null {
  const cached = memoryCache.get(key);

  if (!cached) {
    return null;
  }

  const now = Date.now();
  const isExpired = now - cached.timestamp > maxAge;

  if (isExpired) {
    memoryCache.delete(key);
    return null;
  }

  return cached.data as T;
}

/**
 * Store data in cache
 * @param key Cache key
 * @param data Data to cache
 */
export function setInCache(key: string, data: unknown): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear a specific item from cache
 * @param key Cache key
 */
export function clearCacheItem(key: string): void {
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  }
}

/**
 * Clear all items from cache
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * Get cache size (number of items)
 * @returns Number of items in cache
 */
export function getCacheSize(): number {
  return memoryCache.size;
}

/**
 * Check if a key exists in cache and is not expired
 * @param key Cache key
 * @param maxAge Maximum age of cache in milliseconds
 * @returns Boolean indicating if valid cache entry exists
 */
export function hasValidCache(key: string, maxAge = DEFAULT_CACHE_TIME): boolean {
  const cached = memoryCache.get(key);

  if (!cached) {
    return false;
  }

  const now = Date.now();
  return now - cached.timestamp <= maxAge;
}

/**
 * Fetch with cache utility
 * @param key Cache key
 * @param fetchFn Function to fetch data if not in cache
 * @param maxAge Maximum age of cache in milliseconds
 * @returns Promise resolving to data
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  maxAge = DEFAULT_CACHE_TIME
): Promise<T> {
  // Try to get from cache first
  const cached = getFromCache<T>(key, maxAge);

  if (cached !== null) {
    return cached;
  }

  // If not in cache or expired, fetch fresh data
  const data = await fetchFn();

  // Store in cache
  setInCache(key, data);

  return data;
}
