/**
 * Offline Database Layer using IndexedDB
 * Stores cached data locally and manages a sync queue for pending operations.
 */

const DB_NAME = 'anis_offline_db';
const DB_VERSION = 2;

// Store names
const STORES = {
  products: 'products',
  clients: 'clients',
  orders: 'orders',
  cashData: 'cashData',
  suppliers: 'suppliers',
  syncQueue: 'syncQueue',
  meta: 'meta', // timestamps, version info
} as const;

export interface SyncQueueItem {
  id?: number;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers: Record<string, string>;
  createdAt: string;
  retryCount: number;
  description: string; // User-facing description of the operation
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.products)) {
        db.createObjectStore(STORES.products, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.clients)) {
        db.createObjectStore(STORES.clients, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.orders)) {
        db.createObjectStore(STORES.orders, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.cashData)) {
        db.createObjectStore(STORES.cashData, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.suppliers)) {
        db.createObjectStore(STORES.suppliers, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const syncStore = db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Generic CRUD helpers ---

async function putAll<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Clear old data and add new
    store.clear();
    for (const item of items) {
      store.put(item);
    }

    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => { db.close(); resolve(request.result); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function putOne<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);

    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function deleteOne(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(key);

    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// --- Products ---
export const offlineProducts = {
  saveAll: (products: any[]) => putAll(STORES.products, products),
  getAll: () => getAll<any>(STORES.products),
  updateLocal: async (id: number, updates: Partial<any>) => {
    const all = await getAll<any>(STORES.products);
    const item = all.find(p => p.id === id);
    if (item) {
      await putOne(STORES.products, { ...item, ...updates });
    }
  },
};

// --- Clients ---
export const offlineClients = {
  saveAll: (clients: any[]) => putAll(STORES.clients, clients),
  getAll: () => getAll<any>(STORES.clients),
};

// --- Orders ---
export const offlineOrders = {
  saveAll: (orders: any[]) => putAll(STORES.orders, orders),
  getAll: () => getAll<any>(STORES.orders),
};

// --- Cash Data ---
export const offlineCash = {
  save: (data: { balance: number; logs: any[]; expenses: any[] }) =>
    putOne(STORES.cashData, { key: 'cashData', ...data }),
  get: async () => {
    const all = await getAll<any>(STORES.cashData);
    return all.find(d => d.key === 'cashData') || null;
  },
};

// --- Suppliers ---
export const offlineSuppliers = {
  saveAll: (suppliers: any[]) => putAll(STORES.suppliers, suppliers),
  getAll: () => getAll<any>(STORES.suppliers),
};

// --- Sync Queue ---
export const syncQueue = {
  add: async (item: Omit<SyncQueueItem, 'id'>): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.syncQueue, 'readwrite');
      const store = tx.objectStore(STORES.syncQueue);
      store.add(item);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  getAll: () => getAll<SyncQueueItem>(STORES.syncQueue),

  remove: (id: number) => deleteOne(STORES.syncQueue, id),

  updateRetry: async (id: number, retryCount: number): Promise<void> => {
    const all = await getAll<SyncQueueItem>(STORES.syncQueue);
    const item = all.find(q => q.id === id);
    if (item) {
      await putOne(STORES.syncQueue, { ...item, retryCount });
    }
  },

  clear: async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.syncQueue, 'readwrite');
      const store = tx.objectStore(STORES.syncQueue);
      store.clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  count: async (): Promise<number> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.syncQueue, 'readonly');
      const store = tx.objectStore(STORES.syncQueue);
      const request = store.count();
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  },
};

// --- Meta (last sync timestamps etc.) ---
export const offlineMeta = {
  set: (key: string, value: any) => putOne(STORES.meta, { key, value, updatedAt: new Date().toISOString() }),
  get: async (key: string) => {
    const all = await getAll<any>(STORES.meta);
    return all.find(m => m.key === key)?.value ?? null;
  },
};
