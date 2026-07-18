import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore, DEFAULT_ROLE_PERMISSIONS } from '../store/useAppStore.js';
import { loadFromServer, saveToServer, saveToServerNow } from '../utils/persistence.js';
import { setDatabaseSnapshot } from '../utils/dataSource.js';
import { normalizeLayoutBlockLabels } from '../utils/state.js';
import { getDatabaseLoadErrorMessage, getDatabaseSaveErrorMessage, reconcileSubjectCatalog, writeSessionUser } from '../utils/adminHelpers.js';
import { DEFAULT_SIDEBAR_GROUPS } from '../utils/constants.js';

/**
 * useAdminDatabaseSync — Mengurus hydration dari server, auto-save, dan applyDatabasePayload.
 *
 * Diekstrak dari AdminApp.jsx untuk mengurangi ukuran file utama.
 * Tidak mengandung JSX sama sekali.
 *
 * @returns {object} { databaseHydrated, databaseHydrationFailedRef, saveDatabaseNow, applyDatabasePayload, ensureDatabaseReadyForWrite }
 */
export function useAdminDatabaseSync({
  // Data state setters dari AdminApp
  setSchedule, setIsGenerated, setDays, setTimeSlots, setTeachingLoads,
  setTeacherAvailability, setClasses, setRooms, setTeachers, setStaffs, setStudents,
  setSubjects, setAdminUser, setAppSettings, setCustomThemePresets, setJpDurationMinutes,
  setMajors, setRememberMe, setLayoutSettings, setRoomLayout, setLayoutDay, setLayoutByDay,
  setLayoutPreset, setLayoutBlockLabels, setDeletedHistory, setAdvancedRules,
  setExpandedGroups, setIsSidebarCollapsed,
  // Auth
  currentUser, setCurrentUser,
  // UI
  setLoginError, setNotification,
  // Build payload deps
  buildDatabasePayload,
  // Auth hydrated flag
  authHydrated,
}) {
  const [databaseHydrated, setDatabaseHydrated] = useState(false);
  const hydratedDatabaseTokenRef = useRef('');
  const databaseHydrationFailedRef = useRef(false);
  const lastPersistedPayloadRef = useRef('');
  const lastSavedServerPayloadRef = useRef('');
  const pendingServerPayloadRef = useRef('');

  /** Terapkan payload yang diterima dari server ke semua state. */
  const applyDatabasePayload = useCallback((payload = {}) => {
    if (!payload || typeof payload !== 'object') return;
    if (Array.isArray(payload.schedule))          setSchedule(payload.schedule);
    if (typeof payload.isGenerated === 'boolean') setIsGenerated(payload.isGenerated);
    if (Array.isArray(payload.days))              setDays(payload.days);
    if (payload.timeSlots && typeof payload.timeSlots === 'object') setTimeSlots(payload.timeSlots);
    if (Array.isArray(payload.teachingLoads))     setTeachingLoads(payload.teachingLoads);
    if (payload.teacherAvailability && typeof payload.teacherAvailability === 'object') setTeacherAvailability(payload.teacherAvailability);
    if (Array.isArray(payload.classes))           setClasses(payload.classes);
    if (Array.isArray(payload.rooms))             setRooms(payload.rooms);
    if (Array.isArray(payload.teachers))          setTeachers(payload.teachers);
    if (Array.isArray(payload.staffs))            setStaffs(payload.staffs);
    if (Array.isArray(payload.students))          setStudents(payload.students);
    if (Array.isArray(payload.subjects)) {
      setSubjects(reconcileSubjectCatalog(payload.subjects, payload.teachingLoads, payload.schedule, payload.syllabuses));
    }
    if (payload.adminUser && typeof payload.adminUser === 'object') setAdminUser(payload.adminUser);
    if (payload.appSettings && typeof payload.appSettings === 'object') setAppSettings(prev => ({ ...prev, ...payload.appSettings }));
    if (Array.isArray(payload.customThemePresets)) setCustomThemePresets(payload.customThemePresets);
    if (Number.isFinite(Number(payload.jpDurationMinutes))) setJpDurationMinutes(Number(payload.jpDurationMinutes));
    if (Array.isArray(payload.majors))            setMajors(payload.majors);
    if (typeof payload.rememberMe === 'boolean')  setRememberMe(payload.rememberMe);
    if (payload.layoutSettings && typeof payload.layoutSettings === 'object') setLayoutSettings(payload.layoutSettings);
    if (Array.isArray(payload.roomLayout))        setRoomLayout(payload.roomLayout);
    if (payload.layoutDay)                        setLayoutDay(payload.layoutDay);
    if (payload.layoutByDay && typeof payload.layoutByDay === 'object') setLayoutByDay(payload.layoutByDay);
    if (payload.layoutPreset)                     setLayoutPreset(payload.layoutPreset);
    if (payload.layoutBlockLabels && typeof payload.layoutBlockLabels === 'object') {
      setLayoutBlockLabels(normalizeLayoutBlockLabels(payload.layoutBlockLabels));
    }
    if (Array.isArray(payload.deletedHistory))    setDeletedHistory(payload.deletedHistory);
    if (payload.advancedRules && typeof payload.advancedRules === 'object') setAdvancedRules(payload.advancedRules);
    if (payload.expandedGroups && typeof payload.expandedGroups === 'object') {
      setExpandedGroups({ ...DEFAULT_SIDEBAR_GROUPS, ...payload.expandedGroups });
    }
    if (typeof payload.isSidebarCollapsed === 'boolean') setIsSidebarCollapsed(payload.isSidebarCollapsed);

    // AppStore fields
    const nextStoreState = {};
    if (Array.isArray(payload.attendanceRecords))   nextStoreState.attendanceRecords = payload.attendanceRecords;
    if (Array.isArray(payload.attendanceCorrections)) nextStoreState.attendanceCorrections = payload.attendanceCorrections;
    if (payload.attendanceSettings && typeof payload.attendanceSettings === 'object') nextStoreState.attendanceSettings = payload.attendanceSettings;
    if (payload.featureSettings && typeof payload.featureSettings === 'object')      nextStoreState.featureSettings = payload.featureSettings;
    if (Array.isArray(payload.syllabuses))           nextStoreState.syllabuses = payload.syllabuses;
    if (Array.isArray(payload.syllabusCategories))   nextStoreState.syllabusCategories = payload.syllabusCategories;
    if (Array.isArray(payload.activityLogs))         nextStoreState.activityLogs = payload.activityLogs;
    if (Array.isArray(payload.dashboardMessages))    nextStoreState.dashboardMessages = payload.dashboardMessages;
    if (Array.isArray(payload.academicCalendar))     nextStoreState.academicCalendar = payload.academicCalendar;
    if (Array.isArray(payload.calendarCategories))   nextStoreState.calendarCategories = payload.calendarCategories;
    if (payload.rolePermissions && typeof payload.rolePermissions === 'object') {
      nextStoreState.rolePermissions = {
        ...DEFAULT_ROLE_PERMISSIONS,
        ...payload.rolePermissions
      };
    }
    if (payload.kedisiplinanSettings && typeof payload.kedisiplinanSettings === 'object') {
      nextStoreState.kedisiplinanSettings = payload.kedisiplinanSettings;
    }
    if (Object.keys(nextStoreState).length > 0) useAppStore.setState(nextStoreState);
  }, [
    setSchedule, setIsGenerated, setDays, setTimeSlots, setTeachingLoads,
    setTeacherAvailability, setClasses, setRooms, setTeachers, setStaffs, setStudents,
    setSubjects, setAdminUser, setAppSettings, setCustomThemePresets, setJpDurationMinutes,
    setMajors, setRememberMe, setLayoutSettings, setRoomLayout, setLayoutDay, setLayoutByDay,
    setLayoutPreset, setLayoutBlockLabels, setDeletedHistory, setAdvancedRules,
    setExpandedGroups, setIsSidebarCollapsed,
  ]);

  /** Simpan sekarang (sinkron, tidak debounced). */
  const saveDatabaseNow = useCallback(async (overrides = {}, actionLabel = 'menyimpan data') => {
    const fullPayload = buildDatabasePayload(overrides);
    if (!currentUser?.authToken) {
      setDatabaseSnapshot(fullPayload);
      return fullPayload;
    }
    if (!databaseHydrated || databaseHydrationFailedRef.current) {
      throw new Error(`Tunggu database selesai sinkron sebelum ${actionLabel}.`);
    }
    await saveToServerNow(fullPayload, currentUser.authToken);
    setDatabaseSnapshot(fullPayload);
    return fullPayload;
  }, [buildDatabasePayload, currentUser, databaseHydrated]);

  /** Guard: pastikan database siap sebelum aksi tulis. */
  const ensureDatabaseReadyForWrite = useCallback((actionLabel = 'mengubah data') => {
    if (currentUser?.authToken && (!databaseHydrated || databaseHydrationFailedRef.current)) {
      setNotification(`⚠️ Tunggu database selesai sinkron sebelum ${actionLabel}. Ini mencegah data tertimpa/reset.`);
      setTimeout(() => setNotification(''), 3500);
      return false;
    }
    return true;
  }, [currentUser, databaseHydrated, setNotification]);

  // ─── Hydrate dari server saat authToken berubah ───────────────────────────
  useEffect(() => {
    const authToken = currentUser?.authToken || '';
    if (!authToken) {
      hydratedDatabaseTokenRef.current = '';
      setDatabaseHydrated(false);
      return undefined;
    }
    if (hydratedDatabaseTokenRef.current === authToken) return undefined;

    let cancelled = false;
    setDatabaseHydrated(false);

    const hydrateFullDatabase = async () => {
      databaseHydrationFailedRef.current = false;
      try {
        const payload = await loadFromServer(authToken);
        if (cancelled) return;
        if (payload) {
          const fullPayload = { ...payload, currentUser: null };
          applyDatabasePayload(fullPayload);
          setDatabaseSnapshot(fullPayload);
          const serializedPayload = JSON.stringify(fullPayload);
          lastPersistedPayloadRef.current = serializedPayload;
          lastSavedServerPayloadRef.current = serializedPayload;
        }
        hydratedDatabaseTokenRef.current = authToken;
        setDatabaseHydrated(true);
      } catch (error) {
        console.warn('Gagal memuat snapshot database lengkap', error);
        if (!cancelled) {
          if (error?.status === 403) {
            const message = getDatabaseLoadErrorMessage(error);
            writeSessionUser(null);
            setCurrentUser(null);
            setDatabaseHydrated(false);
            setLoginError(message);
            setNotification(message);
            setTimeout(() => setNotification(''), 3500);
          } else {
            console.warn('Database gagal dimuat, lanjutkan dengan data kosong:', error?.message);
            databaseHydrationFailedRef.current = true;
            hydratedDatabaseTokenRef.current = authToken;
            setDatabaseHydrated(true);
            setNotification('Peringatan: Data dari server tidak dapat dimuat sepenuhnya. Beberapa data mungkin belum sinkron.');
            setTimeout(() => setNotification(''), 5000);
          }
        }
      }
    };

    void hydrateFullDatabase();
    return () => { cancelled = true; };
  }, [applyDatabasePayload, currentUser?.authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-save: debounced setiap kali data berubah ───────────────────────
  useEffect(() => {
    if (!authHydrated) return;
    try {
      const fullPayload = buildDatabasePayload();
      const serializedPayload = JSON.stringify(fullPayload);

      if (serializedPayload !== lastPersistedPayloadRef.current) {
        lastPersistedPayloadRef.current = serializedPayload;
        setDatabaseSnapshot(fullPayload);
      }

      if (currentUser?.authToken && (!databaseHydrated || databaseHydrationFailedRef.current)) return;

      if (
        currentUser?.authToken &&
        serializedPayload !== lastSavedServerPayloadRef.current &&
        serializedPayload !== pendingServerPayloadRef.current
      ) {
        pendingServerPayloadRef.current = serializedPayload;
        saveToServer(fullPayload, currentUser.authToken, {
          onSuccess: () => {
            if (pendingServerPayloadRef.current === serializedPayload) {
              lastSavedServerPayloadRef.current = serializedPayload;
              pendingServerPayloadRef.current = '';
            }
          },
          onError: error => {
            if (pendingServerPayloadRef.current === serializedPayload) {
              pendingServerPayloadRef.current = '';
            }
            const message = getDatabaseSaveErrorMessage(error);
            if (error?.status === 403) {
              writeSessionUser(null);
              setCurrentUser(null);
              setLoginError(message);
            }
            setNotification(message);
            setTimeout(() => setNotification(''), 3500);
          },
        });
      }
    } catch (e) {
      console.error('Gagal menyiapkan payload database', e);
    }
  }, [authHydrated, buildDatabasePayload, currentUser, databaseHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    databaseHydrated,
    databaseHydrationFailedRef,
    lastPersistedPayloadRef,
    saveDatabaseNow,
    applyDatabasePayload,
    ensureDatabaseReadyForWrite,
  };
}
