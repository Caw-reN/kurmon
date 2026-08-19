

export const buildAttendanceQrPayload = attendanceSettings => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta"
  }).format(new Date());
  const lat = Number(attendanceSettings?.schoolLat || -6.2).toFixed(6);
  const lng = Number(attendanceSettings?.schoolLng || 106.816666).toFixed(6);
  const radius = Number(attendanceSettings?.radiusMeters || 50);
  return `TimeSchedule|${today}|${lat}|${lng}|${radius}`;
};
export const getJakartaDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date).reduce((acc, part) => ({
    ...acc,
    [part.type]: part.value
  }), {});
  return {
    weekday: parts.weekday,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    timeWithSeconds: `${parts.hour}:${parts.minute}:${parts.second}`
  };
};
export const timeToMinutes = value => {
  const [hour = "0", minute = "0"] = String(value || "00:00").split(":");
  const total = Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10);
  return Number.isFinite(total) ? total : 0;
};
export const getAttendanceSessions = attendanceSettings => Array.isArray(attendanceSettings?.sessions) && attendanceSettings.sessions.length > 0 ? attendanceSettings.sessions : [];
export const getActiveAttendanceSession = (attendanceSettings, now = new Date(), role = null, academicCalendar = [], calendarCategories = []) => {
  const parts = getJakartaDateParts(now);
  const weekday = parts.weekday; // 0=Sunday, 6=Saturday
  if (weekday === 0 || weekday === 6) return null; // Block weekend checkins

  // Check academic calendar holidays
  if (Array.isArray(academicCalendar) && Array.isArray(calendarCategories)) {
    const dateStr = parts.date;
    const isHoliday = academicCalendar.some(evt => {
      const start = evt.dateStart;
      const end = evt.dateEnd || evt.dateStart;
      if (dateStr >= start && dateStr <= end) {
        const cat = calendarCategories.find(c => c.id === evt.categoryId);
        const catName = cat ? String(cat.name).toLowerCase() : "";
        const title = String(evt.title).toLowerCase();
        return catName.includes("libur") || title.includes("libur");
      }
      return false;
    });
    if (isHoliday) return null; // Block checks on holidays
  }

  const currentMinutes = timeToMinutes(parts.time);
  const sessions = getAttendanceSessions(attendanceSettings);
  return sessions.find(session => {
    const activeDays = Array.isArray(session.activeDays) ? session.activeDays : [];
    const open = timeToMinutes(session.openTime);
    const close = timeToMinutes(session.closeTime);
    
    if (role && session.targetRole && session.targetRole !== "semua") {
      const normalizedRole = String(role).toLowerCase().trim();
      const target = String(session.targetRole).toLowerCase().trim();
      if (target === "karyawan") {
        if (normalizedRole !== "tu" && normalizedRole !== "karyawan") return false;
      } else {
        if (normalizedRole !== target) return false;
      }
    }
    
    return activeDays.includes(parts.weekday) && currentMinutes >= open && currentMinutes <= close;
  }) || null;
};
export const getAttendanceStatusFromSession = (session, selectedStatus, now = new Date()) => {
  if (selectedStatus && selectedStatus !== "Hadir") return selectedStatus;
  if (!session?.lateAfter) return "Hadir";
  const {
    time
  } = getJakartaDateParts(now);
  return timeToMinutes(time) > timeToMinutes(session.lateAfter) ? "Terlambat" : "Hadir";
};
export const getAttendanceStatusTone = status => {
  const s = String(status || "").trim().toLowerCase();
  if (s === "hadir" || s === "tepat waktu" || s === "tepat_waktu") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
  }
  if (s === "terlambat") {
    return "bg-red-50 text-red-700 border-red-200 font-bold";
  }
  if (s === "izin" || s === "dinas luar" || s === "dinas_luar") {
    return "bg-blue-50 text-blue-700 border-blue-200 font-bold";
  }
  if (s === "sakit") {
    return "bg-yellow-50 text-amber-700 border-yellow-200 font-bold";
  }
  if (s === "alpa") {
    return "bg-slate-950 text-white border-slate-950 font-bold";
  }
  return "bg-slate-50 text-slate-700 border-slate-200 font-bold";
};
export const getTableRowKey = (tab, item) => {
  if (!item) return "";
  if (tab === "kelas") return String(item.name || "");
  if (tab === "jurusan") return String(item.name || "");
  if (tab === "guru") return String(item.code || "");
  if (tab === "mapel") return String(item.name || "");
  if (tab === "ruangan") return String(item.id || "");
  if (tab === "beban") return String(item.id || "");
  if (tab === "siswa") return String(item.id || item.code || item.nis || "");
  return String(item.id || item.name || "");
};
export const getTableSearchText = (tab, item) => {
  if (!item) return "";
  if (tab === "kelas") return `${item.name || ""} ${item.major || ""}`;
  if (tab === "jurusan") return String(item.name || "");
  if (tab === "guru") return `${item.code || ""} ${item.name || ""} ${item.type || ""} ${item.role || "guru"} ${item.preferredMajor || ""} ${item.preferredGrade || ""} ${item.targetWeeklyJp || ""}`;
  if (tab === "mapel") return `${item.name || ""} ${item.grade || ""} ${item.major || ""} ${item.practiceRoomIds || ""}`;
  if (tab === "ruangan") return `${item.id || ""} ${item.name || ""} ${item.type || ""} ${item.major || ""}`;
  if (tab === "beban") return `${item.teacherCode || ""} ${item.subject || ""} ${item.targetGrade || ""} ${item.targetMajor || ""} ${item.maxClasses || ""}`;
  return Object.values(item).join(" ");
};
export const compareTableValues = (a, b, dir = "asc") => {
  const factor = dir === "desc" ? -1 : 1;
  const av = a == null ? "" : a;
  const bv = b == null ? "" : b;
  if (typeof av === "number" && typeof bv === "number") {
    return (av - bv) * factor;
  }
  const aNum = Number(av);
  const bNum = Number(bv);
  if (!isNaN(aNum) && !isNaN(bNum) && String(av).trim() !== "" && String(bv).trim() !== "") {
    return (aNum - bNum) * factor;
  }
  const aText = String(av).toLowerCase();
  const bText = String(bv).toLowerCase();
  return aText.localeCompare(bText, "id", {
    numeric: true,
    sensitivity: "base"
  }) * factor;
};
export const normalizeText = value => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
export const sameText = (a, b) => normalizeText(a) === normalizeText(b);
export const getClassKey = item => normalizeText(item?.name);
export const getRoomKey = item => normalizeText(item?.id);
export const getTeacherKey = item => normalizeText(item?.code);
export const getSubjectKey = item => normalizeText(item?.name);
export const getLoadKey = item => [item?.teacherCode, item?.subject, item?.targetGrade || "All", item?.targetMajor || "All"].map(normalizeText).join("__");
export const parseTeacherCodes = value => String(value || "").split(",").map(code => code.trim()).filter(Boolean);
export const parseCsvList = value => String(value || "").split(",").map(entry => entry.trim()).filter(Boolean);
export const serializeCsvList = values => [...new Set((values || []).map(value => String(value || "").trim()).filter(Boolean))].join(",");
export const isAllLike = (value, allValues = ["All", "Semua", "Umum"]) => {
  const text = normalizeText(value);
  if (!text) return true;
  return allValues.some(item => sameText(text, item));
};
export const csvIncludesText = (value, target) => parseCsvList(value).some(item => sameText(item, target));
export const csvValueMatches = (value, target, allValues = ["All", "Semua"]) => {
  if (isAllLike(value, allValues)) return true;
  return csvIncludesText(value, target);
};
export const csvValuesIntersect = (left, right, allValues = ["All", "Semua", "Umum"]) => {
  if (isAllLike(left, allValues) || isAllLike(right, allValues)) return true;
  const rightValues = parseCsvList(right);
  return parseCsvList(left).some(item => rightValues.some(other => sameText(item, other)));
};
export const replaceCsvValue = (value, oldValue, nextValue, allValues = ["All", "Semua", "Umum"]) => {
  if (isAllLike(value, allValues)) return value;
  const parts = parseCsvList(value);
  if (parts.length === 0) return value;
  let changed = false;
  const nextParts = parts.map(part => {
    if (!sameText(part, oldValue)) return part;
    changed = true;
    return nextValue;
  });
  return changed ? serializeCsvList(nextParts) : value;
};
export const replaceCsvTextValue = (value, oldValue, nextValue) => {
  const parts = parseCsvList(value);
  if (parts.length === 0) return value;
  let changed = false;
  const nextParts = parts.map(part => {
    if (!sameText(part, oldValue)) return part;
    changed = true;
    return nextValue;
  });
  return changed ? nextParts.join(", ") : value;
};
export const csvTextHasAny = (value, normalizedTargets) => parseCsvList(value).some(part => normalizedTargets.has(normalizeText(part)));
export const removeCsvTextValues = (value, normalizedTargets) => parseCsvList(value).filter(part => !normalizedTargets.has(normalizeText(part))).join(", ");
export const parsePositiveInt = (value, fallback = 0) => {
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) && next > 0 ? next : fallback;
};
export const reconcileSubjectCatalog = (subjects = [], teachingLoads = [], schedule = [], syllabuses = []) => {
  const byName = new Map();
  const addSubject = (subject, fallback = {}) => {
    const name = String(subject?.name || subject || "").trim();
    if (!name) return;
    const key = normalizeText(name);
    if (byName.has(key)) return;
    byName.set(key, {
      name,
      grade: subject?.grade || fallback.grade || "Semua",
      major: subject?.major || fallback.major || "Umum",
      isBlock: !!(subject?.isBlock ?? fallback.isBlock),
      defaultDuration: parsePositiveInt(subject?.defaultDuration ?? fallback.defaultDuration, 2),
      position: subject?.position || fallback.position || "any",
      practiceRoomIds: subject?.practiceRoomIds || fallback.practiceRoomIds || ""
    });
  };
  subjects.forEach(subject => addSubject(subject));
  teachingLoads.forEach(load => addSubject(load.subject, {
    grade: !isAllLike(load.targetGrade, ["All", "Semua"]) ? load.targetGrade : "Semua",
    major: !isAllLike(load.targetMajor, ["All", "Semua", "Umum"]) ? load.targetMajor : "Umum",
    defaultDuration: load.duration || 2
  }));
  schedule.forEach(item => addSubject(item.subject, {
    defaultDuration: item.duration || 2
  }));
  syllabuses.forEach(item => addSubject(item.subjectName || item.subject, {
    grade: item.grade || "Semua",
    major: item.major || "Umum"
  }));
  return [...byName.values()];
};
export const createClientId = () => `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`;
export const formatExcelSerialDate = serial => {
  if (!Number.isFinite(serial)) return "";
  const excelEpoch = Date.UTC(1899, 11, 30);
  return new Date(excelEpoch + Math.floor(serial) * 86_400_000).toISOString().slice(0, 10);
};
export const getCappedClassCount = (load, matchingClassesCount) => {
  const maxClasses = parsePositiveInt(load?.maxClasses, 0);
  return maxClasses > 0 ? Math.min(maxClasses, matchingClassesCount) : matchingClassesCount;
};
export const stripSessionUser = user => {
  if (!user) return null;
  const safeUser = {
    ...user
  };
  delete safeUser.authToken;
  return safeUser;
};
export const SESSION_STORAGE_KEY = "school_schedule_session_v1";
export const readSessionUser = () => {
  try {
    let raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) sessionStorage.setItem(SESSION_STORAGE_KEY, raw);
    }
    const session = raw ? JSON.parse(raw) : null;
    return session?.authToken && session?.role ? session : null;
  } catch {
    return null;
  }
};
export const writeSessionUser = user => {
  try {
    if (user?.authToken && user?.role) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    window.dispatchEvent(new Event('session-updated'));
  } catch {
    // Session storage can be unavailable in private browser contexts.
  }
};
export const getDatabaseErrorMessage = error => {
  const rawDetail = `${error?.serverMessage || error?.message || ""}`.trim();
  const detail = rawDetail.toLowerCase();
  if (detail.includes("akses database ditolak") || detail.includes("database belum aktif") || detail.includes("database tidak ditemukan") || detail.includes("data utama di database rusak")) {
    return rawDetail;
  }
  if (error?.status === 403) {
    if (detail.includes("admin")) {
      return "Server database masih memakai aturan sesi admin lama. Restart auth server, lalu login ulang agar data bisa dimuat.";
    }
    return "Sesi login kedaluwarsa. Silakan login ulang agar data bisa dimuat dengan aman.";
  }
  if (error?.status === 404) {
    return "Endpoint database lengkap belum aktif. Restart auth server, lalu refresh halaman dan login ulang.";
  }
  if (error?.status >= 500) {
    return "Server/Database gagal memuat data lengkap. Pastikan server aktif, lalu login ulang.";
  }
  return "Server database tidak tersambung. Pastikan auth server berjalan, lalu login ulang.";
};
export const getDatabaseSaveErrorMessage = error => {
  const rawDetail = `${error?.serverMessage || error?.message || ""}`.trim();
  const detail = rawDetail.toLowerCase();
  if (detail.includes("akses database ditolak") || detail.includes("database belum aktif") || detail.includes("database tidak ditemukan") || detail.includes("data utama di database rusak")) {
    return rawDetail;
  }
  if (error?.status === 403) {
    return "Sesi login kedaluwarsa. Silakan login ulang agar perubahan tersimpan.";
  }
  if (error?.status >= 500) {
    return "Gagal menyimpan karena server/database bermasalah. Jangan refresh dulu sampai tersimpan.";
  }
  return "Gagal menyimpan ke server. Data belum aman tersimpan, jangan refresh dulu.";
};
export const updateRoomLayoutMajor = (rows, oldMajor, nextMajor, nextMajorRoomId) => rows.map(row => {
  const major = replaceCsvValue(row.major, oldMajor, nextMajor);
  if (major === row.major) return row;
  return {
    ...row,
    major,
    praktikRoomId: nextMajorRoomId || row.praktikRoomId
  };
});
export const renameMajorReferences = (setters, oldMajor, nextMajor, nextMajorRoomId) => {
  const {
    setClasses,
    setSubjects,
    setRooms,
    setTeachers,
    setTeachingLoads,
    setRoomLayout,
    setLayoutSettings
  } = setters;
  setClasses(prev => prev.map(item => sameText(item.major, oldMajor) ? {
    ...item,
    major: nextMajor
  } : item));
  setSubjects(prev => prev.map(item => {
    const major = replaceCsvValue(item.major, oldMajor, nextMajor);
    return major === item.major ? item : {
      ...item,
      major
    };
  }));
  setRooms(prev => prev.map(item => {
    const major = replaceCsvValue(item.major, oldMajor, nextMajor);
    return major === item.major ? item : {
      ...item,
      major
    };
  }));
  setTeachers(prev => prev.map(item => {
    const preferredMajor = replaceCsvValue(item.preferredMajor, oldMajor, nextMajor);
    return preferredMajor === item.preferredMajor ? item : {
      ...item,
      preferredMajor
    };
  }));
  setTeachingLoads(prev => prev.map(item => {
    const targetMajor = replaceCsvValue(item.targetMajor, oldMajor, nextMajor, ["All", "Semua"]);
    return targetMajor === item.targetMajor ? item : {
      ...item,
      targetMajor
    };
  }));
  setRoomLayout(prev => updateRoomLayoutMajor(prev, oldMajor, nextMajor, nextMajorRoomId));
  setLayoutSettings(prev => {
    const majorLabs = {
      ...(prev.majorLabs || {})
    };
    if (Object.prototype.hasOwnProperty.call(majorLabs, oldMajor)) {
      majorLabs[nextMajor] = majorLabs[oldMajor];
      delete majorLabs[oldMajor];
    }
    return {
      ...prev,
      majorLabs
    };
  });
};
export const renameClassReferences = (setSchedule, setRoomLayout, setLayoutByDay, oldName, nextClass, nextMajorRoomId) => {
  setSchedule(prev => prev.map(item => sameText(item.className, oldName) ? {
    ...item,
    className: nextClass.name
  } : item));
  setRoomLayout(prev => prev.map(item => sameText(item.className, oldName) ? {
    ...item,
    className: nextClass.name,
    major: nextClass.major,
    praktikRoomId: nextMajorRoomId || item.praktikRoomId
  } : item));
  setLayoutByDay(prev => {
    const next = {
      ...prev
    };
    Object.keys(next).forEach(day => {
      const dayMap = next[day];
      if (!dayMap || typeof dayMap !== "object") return;
      let changed = false;
      const updated = {};
      Object.entries(dayMap).forEach(([slotId, slot]) => {
        const nextClassNames = replaceCsvTextValue(slot?.className, oldName, nextClass.name);
        if (nextClassNames !== slot?.className) {
          updated[slotId] = {
            ...slot,
            className: nextClassNames
          };
          changed = true;
        } else {
          updated[slotId] = slot;
        }
      });
      if (changed) next[day] = updated;
    });
    return next;
  });
};
export const renameRoomReferences = (setSchedule, setRoomLayout, setLayoutSettings, oldId, nextRoom) => {
  setSchedule(prev => prev.map(item => sameText(item.roomId, oldId) ? {
    ...item,
    roomId: nextRoom.id
  } : item));
  setRoomLayout(prev => prev.map(item => {
    const next = {
      ...item
    };
    if (sameText(item.teoriRoomId, oldId)) {
      next.teoriRoomId = nextRoom.id;
      next.teoriRoomName = nextRoom.name;
    }
    if (sameText(item.praktikRoomId, oldId)) {
      next.praktikRoomId = nextRoom.id;
    }
    return next;
  }));
  setLayoutSettings(prev => {
    const majorLabs = {
      ...(prev.majorLabs || {})
    };
    Object.keys(majorLabs).forEach(major => {
      if (sameText(majorLabs[major], oldId)) majorLabs[major] = nextRoom.id;
    });
    return {
      ...prev,
      majorLabs
    };
  });
};
export const MENU_REGISTRY = [{
  id: "master_data",
  label: "Master Data",
  category: "Administrasi"
}, {
  id: "jadwal",
  label: "Jadwal",
  category: "Akademik"
}, {
  id: "absensi",
  label: "Absensi",
  category: "Monitoring"
}, {
  id: "pkl",
  label: "Monitoring PKL",
  category: "Monitoring"
}];
export const getDatabaseLoadErrorMessage = err => err?.message || "Gagal memuat database";
