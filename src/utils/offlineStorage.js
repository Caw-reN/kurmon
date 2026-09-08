/**
 * Utility Penyimpanan Cache Offline Berbasis IndexedDB
 * Mengatasi batas kuota 5MB localStorage untuk snapshot database berukuran besar.
 */

const DB_NAME = 'kurmon_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_cache';
const SNAPSHOT_KEY = 'kurmon_database_snapshot';
const LEGACY_STORAGE_KEY = 'kurmon_offline_payload';
const BRANDING_CACHE_KEY = 'kurmon_branding_cache';
export const OFFLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

/**
 * Membuka koneksi IndexedDB dengan aman
 */
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB tidak didukung pada lingkungan ini'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka IndexedDB'));
    request.onblocked = () => {
      console.warn('Koneksi IndexedDB terblokir oleh tab lain');
    };
  });
};

/**
 * Menyimpan snapshot database lengkap ke IndexedDB
 * Serta menyimpan ringkasan branding kecil ke localStorage untuk rendering frame 0
 */
export const saveOfflineSnapshot = async (payload) => {
  if (!payload) return false;

  // 1. Simpan metadata branding ringan ke localStorage agar render instan tanpa layout shift
  try {
    if (payload.appSettings) {
      localStorage.setItem(
        BRANDING_CACHE_KEY,
        JSON.stringify({
          _savedAt: Date.now(),
          appSettings: payload.appSettings,
        })
      );
    }
  } catch (err) {
    console.warn('Gagal menyimpan cache branding lokal:', err);
  }

  // 2. Simpan payload penuh ke IndexedDB
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        key: SNAPSHOT_KEY,
        _savedAt: Date.now(),
        payload: payload,
      };

      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve(true);
      putRequest.onerror = () => reject(putRequest.error);

      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (idbErr) {
    console.warn('Penyimpanan IndexedDB gagal, mencoba fallback ke localStorage:', idbErr);
    try {
      localStorage.setItem(
        LEGACY_STORAGE_KEY,
        JSON.stringify({ _savedAt: Date.now(), payload })
      );
      return true;
    } catch (lsErr) {
      console.error('Kapasitas localStorage juga terlampaui:', lsErr);
      return false;
    }
  }
};

/**
 * Memuat snapshot database offline (dari IndexedDB dengan fallback ke localStorage)
 */
export const loadOfflineSnapshot = async () => {
  // Coba muat dari IndexedDB
  try {
    const db = await openDatabase();
    const entry = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(SNAPSHOT_KEY);

      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);

      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });

    if (entry && entry.payload) {
      const savedAt = entry._savedAt || 0;
      const isFresh = Date.now() - savedAt < OFFLINE_CACHE_TTL_MS;
      return {
        payload: entry.payload,
        isFresh,
        savedAt,
        source: 'indexeddb',
      };
    }
  } catch (idbErr) {
    console.warn('Gagal membaca cache IndexedDB:', idbErr);
  }

  // Fallback ke localStorage legacy
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const offlineEntry = JSON.parse(raw);
      const savedAt = offlineEntry?._savedAt || 0;
      const isFresh = Date.now() - savedAt < OFFLINE_CACHE_TTL_MS;
      const payload =
        offlineEntry?.payload ||
        (typeof offlineEntry === 'object' && !offlineEntry._savedAt ? offlineEntry : null);

      if (payload) {
        return {
          payload,
          isFresh,
          savedAt,
          source: 'localstorage',
        };
      }
    }
  } catch (lsErr) {
    console.warn('Gagal membaca cache localStorage legacy:', lsErr);
  }

  return null;
};

/**
 * Membersihkan snapshot cache offline
 */
export const clearOfflineSnapshot = async () => {
  try {
    const db = await openDatabase();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(SNAPSHOT_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {}

  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(BRANDING_CACHE_KEY);
  } catch {}
};
