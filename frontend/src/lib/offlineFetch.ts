/**
 * Offline-Aware API Helper
 * 
 * Wraps fetch calls to:
 * - Serve cached data when offline (for GET requests)
 * - Queue write operations when offline (for POST/PUT/DELETE)
 * - Cache responses when online
 * - Apply optimistic local updates for write operations
 */

import { offlineProducts, offlineClients, offlineCash, offlineOrders, offlineSuppliers } from './offlineDb';
import { syncManager } from './syncManager';

// Map API endpoints to their offline cache
const CACHE_MAP: Record<string, {
  save: (data: any) => Promise<void>;
  get: () => Promise<any>;
  isArray: boolean;
}> = {
  '/api/admin/inventory': {
    save: (data) => offlineProducts.saveAll(data),
    get: () => offlineProducts.getAll(),
    isArray: true,
  },
  '/api/admin/clients': {
    save: (data) => offlineClients.saveAll(data),
    get: () => offlineClients.getAll(),
    isArray: true,
  },
  '/api/admin/orders': {
    save: (data) => offlineOrders.saveAll(data),
    get: () => offlineOrders.getAll(),
    isArray: true,
  },
  '/api/admin/cash': {
    save: (data) => offlineCash.save(data),
    get: () => offlineCash.get(),
    isArray: false,
  },
  '/api/admin/suppliers': {
    save: (data) => offlineSuppliers.saveAll(data),
    get: () => offlineSuppliers.getAll(),
    isArray: true,
  },
};

/**
 * Find the cache handler for a given URL.
 * Supports exact match and pattern match (e.g., /api/admin/inventory matches /api/admin/inventory/5)
 */
function findCacheHandler(url: string) {
  // Exact match first
  if (CACHE_MAP[url]) return CACHE_MAP[url];

  // Pattern match for base URLs
  for (const [pattern, handler] of Object.entries(CACHE_MAP)) {
    if (url.startsWith(pattern)) return handler;
  }
  return null;
}

/**
 * Enhanced fetch that works offline
 */
export async function offlineFetch(
  url: string,
  options: RequestInit = {},
  offlineOptions?: {
    description?: string; // Description for the sync queue
    optimisticUpdate?: () => Promise<void>; // Local DB update to apply immediately
  }
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();

  // --- GET requests: try server first, fall back to cache ---
  if (method === 'GET') {
    if (navigator.onLine) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          // Clone the response before reading it so we can return the original
          const cloned = response.clone();
          const data = await cloned.json();

          // Cache the result
          const handler = findCacheHandler(url);
          if (handler) {
            try { await handler.save(data); } catch (e) { console.warn('Cache save error:', e); }
          }
        }
        return response;
      } catch (err) {
        // Network error while supposedly online, fall through to cache
        console.warn('[offlineFetch] Network error, falling back to cache:', err);
      }
    }

    // Offline or network failed: serve from cache
    const handler = findCacheHandler(url);
    if (handler) {
      const cached = await handler.get();
      if (cached !== null && cached !== undefined) {
        const responseData = cached;
        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Offline': 'true' },
        });
      }
    }

    // No cache available
    return new Response(JSON.stringify({ error: 'لا يوجد اتصال بالإنترنت ولا توجد بيانات محفوظة' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Write requests (POST/PUT/DELETE) ---
  if (navigator.onLine) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      // Network error while supposedly online, queue the operation
      console.warn('[offlineFetch] Network error on write, queueing:', err);
    }
  }

  // Offline: queue the operation and apply optimistic update
  const headers: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((val, key) => { headers[key] = val; });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, val]) => { headers[key] = val; });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  let body: any = undefined;
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch {
      body = options.body;
    }
  }

  await syncManager.queueOperation({
    url,
    method: method as 'POST' | 'PUT' | 'DELETE',
    body,
    headers,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    description: offlineOptions?.description || 'عملية معلقة',
  });

  // Apply optimistic local update
  if (offlineOptions?.optimisticUpdate) {
    try {
      await offlineOptions.optimisticUpdate();
    } catch (e) {
      console.warn('Optimistic update failed:', e);
    }
  }

  // Return a fake success response
  return new Response(JSON.stringify({ 
    success: true, 
    offline: true,
    message: 'تم حفظ العملية محلياً وستتم المزامنة عند عودة الاتصال' 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'X-Offline': 'true' },
  });
}
