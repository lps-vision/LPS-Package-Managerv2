import { CustomerSummary, SubscriberRawRow } from '../types';

export interface PersistedLpsData {
  customers: CustomerSummary[];
  rawRows: SubscriberRawRow[];
  currentFileName: string | null;
  fileSizeText: string;
  selectedCustomerId: string | null;
  savedAt: string;
}

const DB_NAME = 'LPS_MANAGER_DB';
const STORE_NAME = 'uploaded_data_store';
const KEY = 'current_app_data';
const LOCAL_STORAGE_KEY = 'lps_persisted_session_backup';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePersistedData(data: PersistedLpsData): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, using localStorage fallback', err);
  }

  // Backup to localStorage for extra redundancy
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // If payload is too large for 5MB localStorage, IndexedDB safely has it
  }
}

export async function loadPersistedData(): Promise<PersistedLpsData | null> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(KEY);
    const result = await new Promise<PersistedLpsData | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (result && Array.isArray(result.customers) && result.customers.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn('IndexedDB load error, trying localStorage fallback', err);
  }

  try {
    const backup = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (backup) {
      const parsed = JSON.parse(backup) as PersistedLpsData;
      if (parsed && Array.isArray(parsed.customers) && parsed.customers.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse localStorage backup', err);
  }

  return null;
}

export async function clearPersistedData(): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear error', err);
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear localStorage backup', err);
  }
}
