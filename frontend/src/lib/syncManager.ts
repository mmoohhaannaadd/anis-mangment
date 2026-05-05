/**
 * Sync Manager - Handles automatic synchronization when connectivity is restored.
 * 
 * Key responsibilities:
 * 1. Listen for online/offline events
 * 2. Process the sync queue (pending POST/PUT/DELETE operations)
 * 3. Refresh cached data from the server
 * 4. Notify the UI about sync status changes
 */

import { syncQueue, offlineProducts, offlineClients, offlineCash, offlineOrders, offlineSuppliers, offlineMeta, type SyncQueueItem } from './offlineDb';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

type SyncListener = (status: SyncStatus, message?: string, pendingCount?: number) => void;

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private _status: SyncStatus = navigator.onLine ? 'idle' : 'offline';
  private _pendingCount = 0;
  private syncInProgress = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.setStatus('idle');
      this.startSync();
    });

    window.addEventListener('offline', () => {
      this.setStatus('offline');
    });

    // Periodically check for pending items and sync (every 30 seconds)
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.startSync();
      }
    }, 30_000);

    // Initial count update
    this.updatePendingCount();
  }

  get status() { return this._status; }
  get pendingCount() { return this._pendingCount; }
  get isOnline() { return navigator.onLine; }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener(this._status, undefined, this._pendingCount);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus, message?: string) {
    this._status = status;
    this.listeners.forEach(l => l(status, message, this._pendingCount));
  }

  private async updatePendingCount() {
    this._pendingCount = await syncQueue.count();
    this.listeners.forEach(l => l(this._status, undefined, this._pendingCount));
  }

  /**
   * Add an operation to the sync queue (called when offline and user performs a write)
   */
  async queueOperation(item: Omit<SyncQueueItem, 'id'>) {
    await syncQueue.add(item);
    await this.updatePendingCount();
  }

  /**
   * Start the sync process: process queue + refresh caches
   */
  async startSync() {
    if (this.syncInProgress || !navigator.onLine) return;
    this.syncInProgress = true;

    try {
      const items = await syncQueue.getAll();
      if (items.length > 0) {
        this.setStatus('syncing', `جاري مزامنة ${items.length} عملية...`);
        await this.processQueue(items);
      }

      // Refresh cached data from server
      if (navigator.onLine) {
        await this.refreshCaches();
      }

      await this.updatePendingCount();
      if (this._pendingCount === 0) {
        this.setStatus('success', 'تمت المزامنة بنجاح');
        // Reset to idle after a short delay
        setTimeout(() => {
          if (this._status === 'success') this.setStatus('idle');
        }, 3000);
      }
    } catch (err) {
      console.error('[SyncManager] Sync failed:', err);
      this.setStatus('error', 'فشلت المزامنة - سيتم المحاولة لاحقاً');
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process each queued operation in order
   */
  private async processQueue(items: SyncQueueItem[]) {
    // Sort by creation time (oldest first)
    const sorted = [...items].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const item of sorted) {
      if (!navigator.onLine) break; // Stop if we go offline again

      try {
        const fetchOptions: RequestInit = {
          method: item.method,
          headers: item.headers,
        };
        if (item.body && item.method !== 'DELETE') {
          fetchOptions.body = JSON.stringify(item.body);
        }

        const response = await fetch(item.url, fetchOptions);
        
        if (response.ok || response.status === 400 || response.status === 404) {
          // Success or non-retryable error - remove from queue
          if (item.id) await syncQueue.remove(item.id);
        } else if (response.status >= 500) {
          // Server error - retry later
          if (item.id) {
            const newRetry = (item.retryCount || 0) + 1;
            if (newRetry >= 5) {
              // Max retries exceeded, remove from queue
              console.warn(`[SyncManager] Max retries for item ${item.id}, removing`);
              await syncQueue.remove(item.id);
            } else {
              await syncQueue.updateRetry(item.id, newRetry);
            }
          }
        }
      } catch (err) {
        console.error(`[SyncManager] Failed to sync item ${item.id}:`, err);
        // Network error - will retry on next sync
      }
    }
  }

  /**
   * Refresh all cached data from the server
   */
  private async refreshCaches() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Refresh products
      const productsRes = await fetch('/api/admin/inventory', { headers });
      if (productsRes.ok) {
        const products = await productsRes.json();
        if (Array.isArray(products)) {
          await offlineProducts.saveAll(products);
        }
      }
    } catch {}

    try {
      // Refresh clients
      const clientsRes = await fetch('/api/admin/clients', { headers });
      if (clientsRes.ok) {
        const clients = await clientsRes.json();
        if (Array.isArray(clients)) {
          await offlineClients.saveAll(clients);
        }
      }
    } catch {}

    try {
      // Refresh cash data
      const cashRes = await fetch('/api/admin/cash', { headers });
      if (cashRes.ok) {
        const cashData = await cashRes.json();
        await offlineCash.save({
          balance: cashData.balance ?? 0,
          logs: Array.isArray(cashData.logs) ? cashData.logs : [],
          expenses: Array.isArray(cashData.expenses) ? cashData.expenses : [],
        });
      }
    } catch {}

    try {
      // Refresh orders
      const ordersRes = await fetch('/api/admin/orders', { headers });
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        if (Array.isArray(orders)) {
          await offlineOrders.saveAll(orders);
        }
      }
    } catch {}

    try {
      // Refresh suppliers
      const suppliersRes = await fetch('/api/admin/suppliers', { headers });
      if (suppliersRes.ok) {
        const suppliers = await suppliersRes.json();
        if (Array.isArray(suppliers)) {
          await offlineSuppliers.saveAll(suppliers);
        }
      }
    } catch {}

    await offlineMeta.set('lastSync', new Date().toISOString());
  }

  destroy() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.listeners.clear();
  }
}

// Singleton instance
export const syncManager = new SyncManager();
