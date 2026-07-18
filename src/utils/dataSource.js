

/**
 * dataSource.js
 * In-memory database snapshot manager.
 * All persistent data is stored in and retrieved from PostgreSQL.
 * No localStorage is used for application data.
 */

let databaseSnapshot = {};
let snapshotVersion = 0;
const listeners = new Set();

export const getDatabaseSnapshot = () => databaseSnapshot || {};

export const getDatabaseSnapshotVersion = () => snapshotVersion;

export const setDatabaseSnapshot = (payload = {}) => {
  databaseSnapshot = payload && typeof payload === "object" ? { ...payload } : {};
  snapshotVersion += 1;
  listeners.forEach((listener) => {
    try {
      listener(databaseSnapshot, snapshotVersion);
    } catch (error) {
      console.warn("Gagal memberi tahu perubahan snapshot database", error);
    }
  });
  return databaseSnapshot;
};

export const subscribeDatabaseSnapshot = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Clear any legacy localStorage keys left over from older versions.
 * This is kept as a one-time migration helper — it only removes
 * old keys and does NOT write any new data to localStorage.
 */
export const clearLegacyLocalStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) return;
  const LEGACY_KEYS = [
    "school_schedule_modern_v7",
    "school_schedule_modern_v7_activeTab",
    "school_schedule_modern_v7_expandedGroups",
    "school_schedule_modern_v7_isSidebarCollapsed",
    "school_schedule_modern_v7_denah_prefs",
    "school-attendance-syllabus-storage",
    "pkl-absensi-settings",  // migrated to PostgreSQL
    "kartu_pelajar_config",  // migrated to PostgreSQL /api/student-cards
    "kurmon_saved_username", // removed; username persisted in PostgreSQL
  ];
  try {
    LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Browser storage may be disabled — safe to ignore.
  }
};
