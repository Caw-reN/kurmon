import { BookOpen, MessageSquare, MonitorSmartphone, Wifi, Palette, MapPin, Users, Sparkles } from'lucide-react';
import { useAppStore } from'../../store/useAppStore.js';
import { normalizeText, isAllLike, getLoadKey, parsePositiveInt, parseCsvList } from'../../utils/adminHelpers.js';

export function useAdminScheduleGenerator(props) {
  const { syllabuses, attendanceRecords, addSyllabus, updateSyllabus, removeSyllabus, addSyllabusCategory, updateSyllabusCategory, removeSyllabusCategory, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, addCalendarCategory, updateCalendarCategory, removeCalendarCategory, removeAttendanceRecord, updateDashboardMessage, removeDashboardMessage, undoLastDelete } = useAppStore();

  const { 
    matchesGradeTarget, getRoomName, updateSelectionForTab, normalizeUserRole, isSuperAdminRole, csvValueMatches, csvIncludesText, parseTeacherCodes, getCappedClassCount, getCalendarCategoryIdByLabel, getClassKey, getRoomKey, getTeacherKey, getSubjectKey, hashPassword, syncAuthSnapshotSafe, 
    normalizeCalendarDateInput, formatCalendarDateRange, 
    layoutDay, setDragClassName, strictCompetency, teacherAvailability, specialWednesdayConstraint, advancedRules, setQuickEditGuruCode, setQuickGuruForm, quickGuruForm, setTeachers, adminUser, newPresetName, setNewPresetName,
    // states
    schedule, setSchedule,
    rooms, setRooms,
    roomLayout, setRoomLayout,
    layoutByDay, setLayoutByDay,
    isGenerated, setIsGenerated,
    teachers,
    subjects,
    classes,
    majors,
    teachingLoads,
    timeSlots,
    days,
    scheduleCellMap, calendarCategories,
    academicCalendar,
    appSettings, setAppSettings,
    students, setStudents, layoutSettings, setLayoutSettings, customThemePresets, setCustomThemePresets, deletedHistory, generationReadiness, saveDatabaseNow, setSwapWarning,
    // setters & helpers
    setConfirmDialog,
    showNotification,
    addActivityLog,
    ensureDatabaseReadyForWrite } = props || {};

  /* --- LOGIKA KETAT: PENJADWALAN PRAKTIK & BENGKEL --- */
  const handleResetSchedule = (options = {}) => {
    if (!ensureDatabaseReadyForWrite("mengosongkan jadwal")) return;
    if (options.confirm !== false) {
      setConfirmDialog({
        isOpen: true,
        message:"Yakin ingin menghapus seluruh jadwal pelajaran yang sudah digenerate/disusun? (Data Master seperti guru, mapel, dan ruangan TIDAK akan terhapus)",
        onConfirm: () => {
          handleResetSchedule({
            confirm: false
          });
          setConfirmDialog({
            isOpen: false,
            message:"",
            onConfirm: null
          });
        }
      });
      return;
    }
    setSchedule([]);
    setIsGenerated(false);
    addActivityLog({
      type:"schedule",
      title:"Jadwal di-reset",
      detail:"Seluruh jadwal pelajaran dikosongkan."
    });
    saveDatabaseNow({ schedule: [], isGenerated: false },"mengosongkan jadwal");
    showNotification("Jadwal pelajaran berhasil di-reset menjadi kosong.");
  };
  const handleResetRuangan = () => {
    if (!ensureDatabaseReadyForWrite("mengosongkan ruangan")) return;
    setConfirmDialog({
      isOpen: true,
      message:"Yakin ingin mengosongkan SELURUH Data Ruangan? (Jadwal dan Denah yang memakai ruangan ini akan ikut terhapus atau tidak valid)",
      onConfirm: () => {
        setRooms([]);
        setRoomLayout([]);
        setLayoutByDay({});
        setSchedule([]);
        setIsGenerated(false);
        addActivityLog({
          type:"data",
          title:"Data ruangan dikosongkan",
          detail:"Seluruh ruangan, denah, dan jadwal terkait dihapus."
        });
        saveDatabaseNow({ rooms: [], roomLayout: [], layoutByDay: {}, schedule: [], isGenerated: false },"mengosongkan ruangan");
        showNotification("Seluruh Data Ruangan berhasil dikosongkan.");
      }
    });
  };
  const handleResetDenah = () => {
    if (!ensureDatabaseReadyForWrite("mereset denah")) return;
    setConfirmDialog({
      isOpen: true,
      message:"Yakin ingin mereset layout Denah Ruangan? (Kelas akan dihapus dari denah, namun tidak menghapus Data Master Kelas/Ruangan)",
      onConfirm: () => {
        setRoomLayout([]);
        setLayoutByDay({});
        saveDatabaseNow({ roomLayout: [], layoutByDay: {} },"mereset denah");
        showNotification("Layout Denah berhasil direset.");
      }
    });
  };
  const handleClearCurrentDenahDay = () => {
    if (!ensureDatabaseReadyForWrite("mengosongkan denah")) return;
    setConfirmDialog({
      isOpen: true,
      message: `Kosongkan penempatan kelas untuk hari ${layoutDay}? Data kelas dan ruangan tetap aman.`,
      onConfirm: () => {
        const nextLayout = {
          ...layoutByDay,
          [layoutDay]: {}
        };
        setLayoutByDay(nextLayout);
        saveDatabaseNow({ layoutByDay: nextLayout },"mengosongkan denah");
        setDragClassName("");
        showNotification(`Denah hari ${layoutDay} dikosongkan.`);
      }
    });
  };
  const handleCopyCurrentDenahToAllDays = () => {
    if (!ensureDatabaseReadyForWrite("menyalin denah")) return;
    const sourceMap = layoutByDay?.[layoutDay] || {};
    if (Object.keys(sourceMap).length === 0) {
      showNotification(`Denah hari ${layoutDay} masih kosong, tidak ada yang disalin.`);
      return;
    }
    setConfirmDialog({
      isOpen: true,
      message: `Salin denah hari ${layoutDay} ke semua hari aktif? Penempatan hari lain akan mengikuti ${layoutDay}.`,
      onConfirm: () => {
        const nextLayout = {
          ...layoutByDay
        };
        days.forEach(day => {
          nextLayout[day] = JSON.parse(JSON.stringify(sourceMap));
        });
        setLayoutByDay(nextLayout);
        saveDatabaseNow({ layoutByDay: nextLayout },"menyalin denah");
        showNotification(`Denah ${layoutDay} disalin ke semua hari.`);
      }
    });
  };
  const handleGenerate = () => {
    try {
      if (!ensureDatabaseReadyForWrite("generate jadwal")) return;
      if (!generationReadiness.canGenerate) {
        const message = generationReadiness.blockers[0] ||"Jadwal belum siap digenerate.";
        setSwapWarning(message);
        showNotification(message);
        return;
      }
    const expandedLoads = [];
    const generationStats = {
      scheduled: 0,
      unavailable: 0,
      competency: 0,
      room: 0,
      conflict: 0,
      timeRule: 0,
      capacity: 0,
      quota: 0
    };
    const generationFailures = [];
    const subjectByName = new Map(subjects.map(subject => [String(subject.name ||"").trim().toLowerCase(), subject]));
    const teacherByCode = new Map(teachers.map(teacher => [String(teacher.code ||"").trim(), teacher]));
    const teacherPotentialJpMap = new Map(teachers.map(teacher => [String(teacher.code ||"").trim(), 0]));
    const teacherAssignedJpMap = new Map(teachers.map(teacher => [String(teacher.code ||"").trim(), 0]));
    const loadAssignedClassMap = new Map();
    const formatFailureLoad = (load, cls, detail, category) => {
      generationFailures.push({
        id: `${load?.id || load?.subject ||"load"}-${cls?.name || load?.className || generationFailures.length}`,
        category,
        className: cls?.name || load?.className ||"Kelas tidak diketahui",
        subject: load?.subject ||"Mapel tidak diketahui",
        teacherCode: load?.teacherCode ||"-",
        duration: Number(load?.duration || 0),
        detail
      });
    };
    const getSlotLabel = (day, slotIds) => (timeSlots[day] || []).filter(slot => slotIds.includes(slot.id)).map(slot => slot.label || slot.id).join(" -");

    // --- HOME ROOM LOGIC ---
    // Tetapkan 1 ruang teori tetap (Home Room) untuk setiap kelas agar siswa tidak pindah-pindah kelas.
    const theoryRoomsList = rooms.filter(r => String(r.type ||"").trim().toLowerCase() ==="teori");
    const classHomeRooms = {};
    classes.forEach(cls => {
      const classMajor = normalizeText(cls.major);
      const roomScore = room => {
        const roomMajor = room.major ||"All";
        const majorScore = csvIncludesText(roomMajor, classMajor) ? 0 : isAllLike(roomMajor, ["All","Umum","Semua"]) ? 1 : 2;
        return [room.isPriority ? 0 : 1, majorScore, String(room.id ||"")];
      };
      const eligibleRooms = theoryRoomsList.filter(room => matchesGradeTarget(room.targetGrade ||"Semua", cls.name)).filter(room => csvValueMatches(room.major ||"All", cls.major, ["All","Umum","Semua"])).filter(room => !Object.values(classHomeRooms).includes(room.id)).sort((a, b) => roomScore(a).join("|").localeCompare(roomScore(b).join("|")));
      const assignedRoom = eligibleRooms[0];
      if (assignedRoom) {
        classHomeRooms[cls.name] = assignedRoom.id;
      }
    });
    // -----------------------

    const loadMatchesClass = (load, cls) => {
      return matchesGradeTarget(load.targetGrade, cls.name) && csvValueMatches(load.targetMajor ||"All", cls.major, ["All","Semua"]);
    };
    teachingLoads.forEach(load => {
      const duration = Number(load.duration || 0);
      const matchingClassesCount = classes.filter(cls => loadMatchesClass(load, cls)).length;
      const cappedClassesCount = getCappedClassCount(load, matchingClassesCount);
      parseTeacherCodes(load.teacherCode).forEach(code => {
        teacherPotentialJpMap.set(code, (teacherPotentialJpMap.get(code) || 0) + duration * cappedClassesCount);
      });
    });
    const getTeacherJpLimit = code => {
      const teacher = teacherByCode.get(code);
      const explicitTarget = parsePositiveInt(teacher?.targetWeeklyJp, 0);
      return explicitTarget > 0 ? explicitTarget : teacherPotentialJpMap.get(code) || 0;
    };
    const canTeacherTakeLoad = (codes, duration) => codes.every(code => {
      const limit = getTeacherJpLimit(code);
      if (!limit) return false;
      return (teacherAssignedJpMap.get(code) || 0) + duration <= limit;
    });
    const reserveTeacherLoad = (codes, duration) => {
      codes.forEach(code => {
        teacherAssignedJpMap.set(code, (teacherAssignedJpMap.get(code) || 0) + duration);
      });
    };
    const getLoadAssignmentKey = load => String(load.id || getLoadKey(load));
    const isLoadQuotaFull = load => {
      const maxClasses = parsePositiveInt(load.maxClasses, 0);
      if (maxClasses <= 0) return false;
      return (loadAssignedClassMap.get(getLoadAssignmentKey(load)) || 0) >= maxClasses;
    };
    const reserveLoadQuota = load => {
      const key = getLoadAssignmentKey(load);
      loadAssignedClassMap.set(key, (loadAssignedClassMap.get(key) || 0) + 1);
    };
    const getTeacherFitScore = (load, cls, subjectObj) => {
      const codes = parseTeacherCodes(load.teacherCode);
      const grade = String(cls.name ||"").split("")[0] ||"";
      const subjectMajor = subjectObj?.major ||"Umum";
      const isVocationalSubject = !!subjectObj?.isBlock || !isAllLike(subjectMajor, ["Umum","All","Semua"]);
      let score = 0;
      codes.forEach(code => {
        const teacher = teacherByCode.get(code) || {};
        const preferredMajor = teacher.preferredMajor ||"Semua";
        const preferredGrade = String(teacher.preferredGrade ||"Semua").trim().toLowerCase();
        const teacherType = String(teacher.type ||"Umum").trim().toLowerCase();
        const hasSpecificMajor = !isAllLike(preferredMajor, ["Semua","All"]);
        const matchesPreferredMajor = csvValueMatches(preferredMajor, cls.major, ["Semua","All"]);
        if (hasSpecificMajor && !matchesPreferredMajor) score += 4;
        if (hasSpecificMajor && matchesPreferredMajor) score -= 3;
        if (preferredGrade !=="semua" && preferredGrade !== normalizeText(grade)) score += 3;
        if (preferredGrade !=="semua" && preferredGrade === normalizeText(grade)) score -= 2;
        if (isVocationalSubject && teacherType ==="jurusan") score -= 2;
        if (isVocationalSubject && teacherType ==="umum") score += 1;
        if (!isVocationalSubject && teacherType ==="umum") score -= 1;
        if (!isVocationalSubject && teacherType ==="jurusan") score += 1;
      });
      return score / Math.max(codes.length, 1);
    };
    const loadsBySubject = new Map();
    teachingLoads.forEach(load => {
      const subjectKey = String(load.subject ||"").trim().toLowerCase();
      if (!subjectKey) return;
      if (!loadsBySubject.has(subjectKey)) loadsBySubject.set(subjectKey, []);
      loadsBySubject.get(subjectKey).push(load);
    });
    loadsBySubject.forEach((subjectLoads, subjectKey) => {
      const subjectObj = subjectByName.get(subjectKey);
      classes.forEach(cls => {
        const matchingLoads = subjectLoads.filter(load => loadMatchesClass(load, cls));
        if (matchingLoads.length === 0) return;
        const quotaLimitedCount = matchingLoads.filter(isLoadQuotaFull).length;
        const quotaOpenLoads = matchingLoads.filter(load => !isLoadQuotaFull(load));
        const candidates = quotaOpenLoads.map(load => {
          const duration = Number(load.duration || subjectObj?.defaultDuration || 2);
          const codes = parseTeacherCodes(load.teacherCode);
          const maxUsageRatio = codes.length > 0 ? Math.max(...codes.map(code => {
            const limit = getTeacherJpLimit(code);
            return limit > 0 ? ((teacherAssignedJpMap.get(code) || 0) + duration) / limit : Number.POSITIVE_INFINITY;
          })) : Number.POSITIVE_INFINITY;
          const assignedTotal = codes.reduce((sum, code) => sum + (teacherAssignedJpMap.get(code) || 0), 0);
          return {
            load,
            codes,
            duration,
            maxUsageRatio,
            assignedTotal,
            fitScore: getTeacherFitScore(load, cls, subjectObj)
          };
        }).filter(candidate => candidate.codes.length > 0 && canTeacherTakeLoad(candidate.codes, candidate.duration)).sort((a, b) => a.fitScore - b.fitScore || a.maxUsageRatio - b.maxUsageRatio || a.assignedTotal - b.assignedTotal || String(a.load.teacherCode ||"").localeCompare(String(b.load.teacherCode ||"")));
        const selected = candidates[0];
        if (!selected) {
          if (quotaOpenLoads.length === 0 && quotaLimitedCount > 0) {
            generationStats.quota += 1;
            const quotaLoads = matchingLoads.filter(isLoadQuotaFull);
            const quotaInfo = quotaLoads.map(load => `${load.teacherCode ||"Guru"} (maks. ${load.maxClasses} kelas)`).join(",");
            formatFailureLoad(matchingLoads[0], cls, `Batas jumlah kelas pada beban ${quotaInfo ||"mengajar"} sudah tercapai.`,"Maks kelas beban");
          } else {
            generationStats.capacity += 1;
            const capacityInfo = quotaOpenLoads.map(load => {
              const duration = Number(load.duration || subjectObj?.defaultDuration || 2);
              return parseTeacherCodes(load.teacherCode).map(code => {
                const assigned = teacherAssignedJpMap.get(code) || 0;
                const limit = getTeacherJpLimit(code);
                return `${code}: ${assigned}/${limit} JP (butuh ${duration} JP)`;
              }).join(",");
            }).filter(Boolean).join(";");
            formatFailureLoad(quotaOpenLoads[0] || matchingLoads[0], cls, `Target JP guru tidak cukup untuk tambahan beban ini. ${capacityInfo ||"Periksa Target JP guru."}`,"Target JP guru");
          }
          return;
        }
        reserveTeacherLoad(selected.codes, selected.duration);
        reserveLoadQuota(selected.load);
        const isBlock = !!subjectObj?.isBlock;
        let remainingDuration = selected.duration;

        // Auto-split beban mengajar teori yang panjang (>= 4 JP) agar tidak mudah bentrok
        if (!isBlock && remainingDuration >= 4) {
          let chunkIndex = 1;
          while (remainingDuration > 0) {
            let chunk = remainingDuration;
            if (remainingDuration >= 4) chunk = 2; // Pecah jadi 2
            else if (remainingDuration === 3) chunk = 3; // Sisanya 3 tetap 3
            else chunk = remainingDuration; // Sisa 2 atau 1

            expandedLoads.push({
              ...selected.load,
              duration: chunk,
              isBlock,
              position: subjectObj?.position ||"any",
              className: cls.name,
              expandedId: `${selected.load.id}-${cls.name}-part${chunkIndex}`
            });
            remainingDuration -= chunk;
            chunkIndex++;
          }
        } else {
          expandedLoads.push({
            ...selected.load,
            duration: selected.duration,
            isBlock,
            position: subjectObj?.position ||"any",
            className: cls.name,
            expandedId: `${selected.load.id}-${cls.name}`
          });
        }
      });
    });

    // Urutkan: after_practice terakhir -> Praktik/Blok -> Posisi first -> Posisi last -> duration
    const manualSchedule = schedule.filter(item => item.isManual);
    const manualLoadIds = new Set(manualSchedule.map(item => item.loadId).filter(Boolean));
    const autoExpandedLoads = expandedLoads.filter(load => !manualLoadIds.has(load.expandedId));
    const baseStats = {
      ...generationStats
    };
    const baseFailures = [...generationFailures];
    let bestSchedule = null;
    let bestStats = null;
    let bestFailures = null;
    let leastFailedCount = Infinity;
    for (let attempt = 0; attempt < 25; attempt++) {
      Object.assign(generationStats, baseStats);
      generationFailures.length = 0;
      generationFailures.push(...baseFailures);
      autoExpandedLoads.sort((a, b) => {
        const aIsAfter = a.position ==="after_practice" || a.position ==="after_practice_last";
        const bIsAfter = b.position ==="after_practice" || b.position ==="after_practice_last";
        if (aIsAfter && !bIsAfter) return 1;
        if (!aIsAfter && bIsAfter) return -1;
        if (!!a.isBlock && !b.isBlock) return -1;
        if (!a.isBlock && !!b.isBlock) return 1;
        if (a.position ==="first" && b.position !=="first") return -1;
        if (b.position ==="first" && a.position !=="first") return 1;
        if (a.position ==="last" && b.position !=="last") return -1;
        if (b.position ==="last" && a.position !=="last") return 1;
        if (b.duration !== a.duration) return b.duration - a.duration;
        return Math.random() - 0.5;
      });
      const newSchedule = [...manualSchedule];
      const teacherTracker = {};
      const classTracker = {};
      const roomTracker = {};
      manualSchedule.forEach(item => {
        parseTeacherCodes(item.teacherCode).forEach(code => {
          if (!teacherTracker[code]) teacherTracker[code] = {};
          if (!teacherTracker[code][item.day]) teacherTracker[code][item.day] = [];
          teacherTracker[code][item.day].push(item.slotId);
        });
        if (!classTracker[item.className]) classTracker[item.className] = {};
        if (!classTracker[item.className][item.day]) classTracker[item.className][item.day] = [];
        classTracker[item.className][item.day].push(item.slotId);
        if (!roomTracker[item.roomId]) roomTracker[item.roomId] = {};
        if (!roomTracker[item.roomId][item.day]) roomTracker[item.roomId][item.day] = [];
        roomTracker[item.roomId][item.day].push(item.slotId);
      });
      autoExpandedLoads.forEach(load => {
        const slotsNeeded = load.duration;
        let scheduled = false;
        let seenEligibleDay = false;
        let seenCompetencyMatch = !strictCompetency;
        const failureTrace = {
          room: [],
          teacher: [],
          class: [],
          timeRule: []
        };
        const classObj = classes.find(c => c.name === load.className);
        const teamCodes = parseTeacherCodes(load.teacherCode);
        const subjectObj = subjectByName.get(String(load.subject ||"").trim().toLowerCase()) || {
          isBlock: load.isBlock,
          major:"Umum"
        };
        const neededType = subjectObj.isBlock ?"Praktik" :"Teori";
        const preferredPracticeRoomIds = parseCsvList(subjectObj.practiceRoomIds || load.practiceRoomIds ||"");
        const preferredPracticeRoomIndex = new Map(preferredPracticeRoomIds.map((id, index) => [normalizeText(id), index]));

        // Mapel multi-jurusan tetap dipasangkan ke jurusan kelas aktif.
        const reqMajor = !isAllLike(subjectObj.major, ["Umum","All","Semua"]) && !csvValueMatches(subjectObj.major, classObj?.major, ["Umum","All","Semua"]) ? normalizeText(parseCsvList(subjectObj.major)[0] || classObj?.major) : normalizeText(classObj?.major);
        const practiceRooms = rooms.filter(room => String(room.type ||"").trim().toLowerCase() ==="praktik");
        const availableRooms = rooms.filter(r => {
          const roomMajor = r.major ||"";
          const roomMatchesMajor = csvValueMatches(roomMajor, reqMajor, ["All","Umum","Semua"]);
          if (neededType ==="Praktik") {
            const isPracticeRoom = String(r.type ||"").trim().toLowerCase() ==="praktik";
            const matchesPreferredRoom = preferredPracticeRoomIds.length === 0 || preferredPracticeRoomIndex.has(normalizeText(r.id));
            const matchesRoomGrade = matchesGradeTarget(r.targetGrade ||"Semua", classObj?.name ||"");
            return isPracticeRoom && matchesPreferredRoom && matchesRoomGrade && roomMatchesMajor;
          }

          // Jika Teori: Prioritaskan Home Room, tapi izinkan ruang teori lain jika tidak ada
          const homeRoomId = classHomeRooms[classObj?.name];
          if (homeRoomId && r.id === homeRoomId) return true;
          const isTheoryRoom = String(r.type ||"").trim().toLowerCase() ==="teori";
          const matchesRoomGrade = matchesGradeTarget(r.targetGrade ||"Semua", classObj?.name ||"");
          return isTheoryRoom && matchesRoomGrade && roomMatchesMajor;
        }).sort((a, b) => {
          if (neededType ==="Teori" && classObj) {
            const homeRoomId = classHomeRooms[classObj?.name];
            if (a.id === homeRoomId && b.id !== homeRoomId) return -1;
            if (b.id === homeRoomId && a.id !== homeRoomId) return 1;
          }
          if (neededType ==="Praktik" && classObj) {
            if (!!a.isPriority !== !!b.isPriority) return a.isPriority ? -1 : 1;
            if (preferredPracticeRoomIndex.size > 0) {
              const aRank = preferredPracticeRoomIndex.has(normalizeText(a.id)) ? preferredPracticeRoomIndex.get(normalizeText(a.id)) : Number.POSITIVE_INFINITY;
              const bRank = preferredPracticeRoomIndex.has(normalizeText(b.id)) ? preferredPracticeRoomIndex.get(normalizeText(b.id)) : Number.POSITIVE_INFINITY;
              if (aRank !== bRank) return aRank - bRank;
            }
            const grade = String(classObj.name ||"").split("")[0] ||"X";
            const prefLabId = layoutSettings?.majorLabs?.[grade +"-" + classObj.major] || layoutSettings?.majorLabs?.[classObj.major];
            if (prefLabId) {
              if (a.id === prefLabId && b.id !== prefLabId) return -1;
              if (b.id === prefLabId && a.id !== prefLabId) return 1;
            }
          }
          const aMajorExact = csvIncludesText(a.major, reqMajor);
          const bMajorExact = csvIncludesText(b.major, reqMajor);
          if (aMajorExact && !bMajorExact) return -1;
          if (bMajorExact && !aMajorExact) return 1;
          return 0;
        });
        if (availableRooms.length === 0) {
          const roomTypeLabel = neededType ==="Praktik" ?"lab/bengkel praktik" :"ruang teori (home room)";
          if (neededType ==="Praktik" && practiceRooms.length === 0) {
            failureTrace.room.push("Belum ada ruangan dengan tipe Praktik (Bengkel/Lab) pada data master ruangan.");
          } else if (neededType ==="Praktik") {
            const selectedPracticeRooms = practiceRooms.filter(room => preferredPracticeRoomIds.length === 0 || preferredPracticeRoomIndex.has(normalizeText(room.id)));
            const gradeMatchedRooms = selectedPracticeRooms.filter(room => matchesGradeTarget(room.targetGrade ||"Semua", classObj?.name ||""));
            const roomList = (selectedPracticeRooms.length ? selectedPracticeRooms : practiceRooms).map(room => `${room.name || room.id} [${room.id}; ${room.major ||"Umum"}; ${room.targetGrade ||"Semua"}]`).join(",");
            if (preferredPracticeRoomIds.length > 0 && selectedPracticeRooms.length === 0) {
              failureTrace.room.push(`Mapel ini hanya diizinkan memakai ID ruang ${preferredPracticeRoomIds.join(",")}, tetapi ID tersebut tidak ditemukan sebagai ruang praktik. Ruang praktik tersedia: ${practiceRooms.map(room => room.id).join(",") ||"-"}.`);
            } else if (gradeMatchedRooms.length === 0) {
              failureTrace.room.push(`Ruang praktik yang dipilih tidak menerima kelas ${classObj?.name ||"ini"} berdasarkan Target Tingkat Kelas. Periksa: ${roomList}.`);
            } else {
              failureTrace.room.push(`Tidak ada ${roomTypeLabel} untuk jurusan ${reqMajor ||"kelas"}. Ruang yang lolos pilihan mapel/tingkat: ${roomList}. Pastikan jurusan ruang adalah ${classObj?.major ||"jurusan kelas"} atau Semua Jurusan.`);
            }
          } else {
            failureTrace.room.push(`Tidak ada ${roomTypeLabel} yang tersedia atau cocok (berdasarkan tingkat/jurusan) untuk ${classObj?.name ||"kelas ini"}.`);
          }
        }
        for (const day of days) {
          if (scheduled) break;
          // ALL teachers in the team must be available on this day
          const allAvailable = teamCodes.every(code => {
            const avail = teacherAvailability[code];
            return avail && avail.days && avail.days.includes(day);
          });
          if (!allAvailable) continue;
          seenEligibleDay = true;

          // Strict competency check: ALL teachers must have the subject
          if (strictCompetency) {
            const allCompetent = teamCodes.every(code => {
              const avail = teacherAvailability[code];
              return (avail?.subjects || []).includes(load.subject);
            });
            if (!allCompetent) continue;
          }
          seenCompetencyMatch = true;

          // --- ATURAN KHUSUS RABU (X TKJ / X TKR) ---
          if (specialWednesdayConstraint && String(day).toLowerCase() ==="rabu") {
            const grade = String(classObj?.name ||"").split("")[0].toUpperCase();
            const major = String(classObj?.major ||"").toUpperCase();
            const isXTKJ = grade ==="X" && major ==="TKJ";
            const isXTKR = grade ==="X" && major ==="TKR";
            if (isXTKJ || isXTKR) {
              const subj = String(load.subject ||"").toLowerCase();
              const isKoding = subj.includes("koding") || subj.includes("ai");
              const isKJD = subj ==="kjd" || subj.includes("komputer dan jaringan dasar");
              const isGT = subj ==="gt" || subj.includes("gambar teknik");
              const isPraktik = !!load.isBlock;
              if (isXTKJ && !isPraktik && !isKJD && !isKoding) {
                if (failureTrace.timeRule.length < 3) failureTrace.timeRule.push("Aturan Khusus: Kelas X TKJ hanya boleh Praktik, KJD, atau Koding di hari Rabu.");
                continue;
              }
              if (isXTKR && !isPraktik && !isGT && !isKoding) {
                if (failureTrace.timeRule.length < 3) failureTrace.timeRule.push("Aturan Khusus: Kelas X TKR hanya boleh Praktik, GT, atau Koding di hari Rabu.");
                continue;
              }
              if (isXTKJ && isKJD || isXTKR && isGT) {
                const praktikHariIni = newSchedule.find(item => item.className === load.className && item.day === day && item.isBlock);
                if (!praktikHariIni) {
                  if (failureTrace.timeRule.length < 3) failureTrace.timeRule.push(`Aturan Khusus: ${subj.toUpperCase()} di hari Rabu butuh Praktik terlebih dahulu.`);
                  continue;
                }
                const praktikTeachers = parseTeacherCodes(praktikHariIni.teacherCode);
                const isSameTeacher = teamCodes.some(c => praktikTeachers.includes(c));
                if (!isSameTeacher) {
                  if (failureTrace.timeRule.length < 3) failureTrace.timeRule.push(`Aturan Khusus: Guru ${subj.toUpperCase()} di hari Rabu harus sama dengan guru Praktik hari itu.`);
                  continue;
                }
                load.position ="after_practice";
              }
            }
          }
          // ------------------------------------------

          const dailySlots = timeSlots[day] || [];
          const firstNonBreakIdx = dailySlots.findIndex(s => !s.isBreak);
          let lastNonBreakIdx = -1;
          for (let idx = dailySlots.length - 1; idx >= 0; idx--) {
            if (!dailySlots[idx].isBreak) {
              lastNonBreakIdx = idx;
              break;
            }
          }
          let bestCandidate = null;
          let lastPracticeSlotIndex = -1;
          if (load.position ==="after_practice" || load.position ==="after_practice_last") {
            const practiceItems = newSchedule.filter(item => item.className === load.className && item.day === day && item.isBlock);
            if (practiceItems.length === 0) {
              if (failureTrace.timeRule.length < 3) failureTrace.timeRule.push(`${day}: mapel ini harus ditempatkan setelah praktik, tetapi praktik kelas belum mendapat slot.`);
              continue;
            }
            const practiceSlotIds = practiceItems.map(p => p.slotId);
            dailySlots.forEach((ds, dIndex) => {
              if (practiceSlotIds.includes(ds.id)) {
                lastPracticeSlotIndex = Math.max(lastPracticeSlotIndex, dIndex);
              }
            });
          }
          for (let i = 0; i < dailySlots.length; i++) {
            if (dailySlots[i].isBreak) continue;

            // Jika after_practice, harus diletakkan SETELAH jam praktik berakhir
            if ((load.position ==="after_practice" || load.position ==="after_practice_last") && i <= lastPracticeSlotIndex) continue;

            // Jika subject wajib di awal hari, lewati slot yang bukan pertama
            if (load.position ==="first" && i !== firstNonBreakIdx) continue;
            if (load.position && load.position.startsWith("slot_")) {
              const requiredSiklus = parseInt(load.position.split("_")[1], 10);
              let currentSiklus = 0;
              let currentSiklusIdx = -1;
              for (let k = 0; k < dailySlots.length; k++) {
                if (!dailySlots[k].isBreak) {
                  currentSiklus++;
                  if (currentSiklus === requiredSiklus) {
                    currentSiklusIdx = k;
                    break;
                  }
                }
              }
              if (i !== currentSiklusIdx) continue;
            }
            const candidateSlots = [];
            const candidateSiklus = [];
            let currentJP = 0;
            let tempSiklusCalc = 0;
            for (let x = 0; x < i; x++) if (!dailySlots[x].isBreak) tempSiklusCalc++;
            for (let j = i; j < dailySlots.length; j++) {
              if (!dailySlots[j].isBreak) {
                candidateSlots.push(dailySlots[j].id);
                tempSiklusCalc++;
                candidateSiklus.push(tempSiklusCalc);
                currentJP += Number(dailySlots[j].jpCount || 1);
              }
              if (currentJP === slotsNeeded) break;
              if (currentJP > slotsNeeded) {
                candidateSlots.length = 0;
                break;
              }
            }
            if (candidateSlots.length === 0) continue;

            // Batasan Khusus: Jam ke-7 (Senin, Selasa, Kamis, Jumat) dan Jam ke-8 (Rabu) hanya boleh untuk mapel Koding (atau mapel yang diatur di Aturan Lanjutan)
            const dayNameRule = day.toLowerCase().replace(/['`]/g,"");
            const allowedSubjectString = String(advancedRules.lastPeriodSubject ||"koding").toLowerCase();
            const isAllowedSubject = String(load.subject ||"").toLowerCase().includes(allowedSubjectString);
            if (!isAllowedSubject && allowedSubjectString.trim() !=="") {
              const forbiddenSiklus = dayNameRule ==="rabu" ? parseInt(advancedRules.lastPeriodWednesday) || 8 : ["senin","selasa","kamis","jumat"].includes(dayNameRule) ? parseInt(advancedRules.lastPeriodNormal) || 7 : null;
              if (forbiddenSiklus && candidateSiklus.includes(forbiddenSiklus)) {
                if (failureTrace.timeRule.length < 3) failureTrace.timeRule.push(`${day}: Jam ke-${forbiddenSiklus} khusus dikosongkan atau untuk mapel ${allowedSubjectString.toUpperCase()}.`);
                continue;
              }
            }
            if (load.position ==="last" || load.position ==="after_practice_last") {
              if (candidateSlots[candidateSlots.length - 1] !== dailySlots[lastNonBreakIdx].id) continue;
            }

            // Batasan Teori di Hari Jumat (Hanya sampai istirahat 2)
            if (candidateSlots.length > 0 && advancedRules.fridayTheoryLimit && day.toLowerCase().replace(/['`]/g,"") ==="jumat" && neededType ==="Teori") {
              let breakCount = 0;
              let secondBreakIdx = dailySlots.length;
              for (let k = 0; k < dailySlots.length; k++) {
                if (dailySlots[k].isBreak) breakCount++;
                if (breakCount === 2) {
                  secondBreakIdx = k;
                  break;
                }
              }
              const lastCandidateSlotId = candidateSlots[candidateSlots.length - 1];
              const lastCandidateIdx = dailySlots.findIndex(s => s.id === lastCandidateSlotId);
              if (lastCandidateIdx > secondBreakIdx) {
                if (failureTrace.timeRule.length < 3) failureTrace.timeRule.push(`${day}, ${getSlotLabel(day, candidateSlots)}: teori melewati batas sampai istirahat kedua pada hari Jumat.`);
                candidateSlots.length = 0; // Pulang setelah istirahat 2
              }
            }

            // Batasan Maksimal JP per Hari berdasarkan Aturan Lanjutan
            if (candidateSlots.length > 0) {
              const gradeMatch = load.className.match(/\b(X|XI|XII)\b/);
              const grade = gradeMatch ? gradeMatch[0] :"X";
              const isWednesday = day.toLowerCase() ==="rabu";
              let maxJpForDay = 12;
              if (grade ==="X") maxJpForDay = isWednesday ? parseInt(advancedRules.gradeXWedJp) || 14 : parseInt(advancedRules.gradeXMaxJp) || 12;
              if (grade ==="XI") maxJpForDay = isWednesday ? parseInt(advancedRules.gradeXIWedJp) || 12 : parseInt(advancedRules.gradeXIMaxJp) || 10;
              if (grade ==="XII") maxJpForDay = isWednesday ? parseInt(advancedRules.gradeXIIWedJp) || 12 : parseInt(advancedRules.gradeXIIMaxJp) || 10;
              const scheduledJp = newSchedule.filter(item => item.className === load.className && item.day === day).reduce((sum, item) => sum + Number(dailySlots.find(slot => slot.id === item.slotId)?.jpCount || 1), 0);
              const totalClassJp = scheduledJp + currentJP;
              if (totalClassJp > maxJpForDay) {
                if (failureTrace.timeRule.length < 3) failureTrace.timeRule.push(`${day}, ${getSlotLabel(day, candidateSlots)}: melewati batas ${maxJpForDay} JP (kuota kuantitas) untuk kelas ${grade}.`);
                candidateSlots.length = 0; // Batalkan candidate ini karena melebihi batas JP hari ini
              } else {
                // Tambahan: Pastikan slot ini juga tidak melewati jam pulang mutlak (Batas Boundary Jam)
                const lastCandidateSlotId = candidateSlots[candidateSlots.length - 1];
                let cumulativeJp = 0;
                for (let k = 0; k < dailySlots.length; k++) {
                  if (!dailySlots[k].isBreak) cumulativeJp += Number(dailySlots[k].jpCount || 1);
                  if (dailySlots[k].id === lastCandidateSlotId) break;
                }
                if (cumulativeJp > maxJpForDay) {
                  if (failureTrace.timeRule.length < 3) failureTrace.timeRule.push(`${day}, ${getSlotLabel(day, candidateSlots)}: melewati batas jam pulang (jam ke-${maxJpForDay}) untuk kelas ${grade}.`);
                  candidateSlots.length = 0;
                }
              }
            }
            if (currentJP !== slotsNeeded || candidateSlots.length === 0) continue;

            // Jika subject wajib di akhir hari, PASTIKAN slot terakhir yang dialokasikan adalah slot paling akhir di hari tersebut
            if (load.position ==="last") {
              const lastCandidateSlotId = candidateSlots[candidateSlots.length - 1];
              const lastDailySlotId = dailySlots[lastNonBreakIdx]?.id;
              if (lastCandidateSlotId !== lastDailySlotId) continue;
            }

            // Jika subject diset"Bebas (Kecuali Jam Terakhir)", pastikan tidak menyentuh jam terakhir di hari tersebut
            if (load.position ==="any_not_last") {
              const lastCandidateSlotId = candidateSlots[candidateSlots.length - 1];
              const lastDailySlotId = dailySlots[lastNonBreakIdx]?.id;
              if (lastCandidateSlotId === lastDailySlotId) continue;
            }
            let candidateRoom = null;
            let roomConflict = false;
            for (const r of availableRooms) {
              roomConflict = false;
              for (const slotId of candidateSlots) if (roomTracker[r.id]?.[day]?.includes(slotId)) roomConflict = true;
              if (!roomConflict) {
                candidateRoom = r;
                break;
              }
            }
            if (!candidateRoom) {
              if (failureTrace.room.length < 3) {
                const busyRooms = availableRooms.filter(room => candidateSlots.some(slotId => roomTracker[room.id]?.[day]?.includes(slotId))).map(room => room.name || room.id).join(",");
                failureTrace.room.push(`${day}, ${getSlotLabel(day, candidateSlots)}: ruang yang cocok sedang dipakai${busyRooms ? ` (${busyRooms})` :""}.`);
              }
              continue;
            }

            // Check conflicts for ALL teachers in the team and the class
            let conflict = false;
            const conflictingTeachers = new Set();
            let classHasConflict = false;
            for (const slotId of candidateSlots) {
              for (const code of teamCodes) {
                if (teacherTracker[code]?.[day]?.includes(slotId)) {
                  conflict = true;
                  conflictingTeachers.add(code);
                }
              }
              if (classTracker[load.className]?.[day]?.includes(slotId)) {
                conflict = true;
                classHasConflict = true;
              }
            }
            if (conflict) {
              const slotContext = `${day}, ${getSlotLabel(day, candidateSlots)}`;
              if (conflictingTeachers.size > 0 && failureTrace.teacher.length < 3) {
                const teacherActivities = [...conflictingTeachers].map(code => {
                  const activity = newSchedule.find(item => item.day === day && candidateSlots.includes(item.slotId) && parseTeacherCodes(item.teacherCode).includes(code));
                  return activity ? `${code} (${activity.className} - ${activity.subject})` : code;
                }).join(",");
                failureTrace.teacher.push(`${slotContext}: guru sudah mengajar ${teacherActivities}.`);
              }
              if (classHasConflict && failureTrace.class.length < 3) {
                const classActivity = newSchedule.find(item => item.day === day && candidateSlots.includes(item.slotId) && item.className === load.className);
                failureTrace.class.push(`${slotContext}: kelas sudah terisi ${classActivity ? classActivity.subject :"mapel lain"}.`);
              }
            }
            if (!conflict) {
              bestCandidate = {
                slots: candidateSlots,
                room: candidateRoom
              };
              break;
            }
          }
          if (bestCandidate) {
            bestCandidate.slots.forEach(slotId => {
              newSchedule.push({
                id: Math.random().toString(),
                day,
                slotId,
                className: load.className,
                subject: load.subject,
                teacherCode: load.teacherCode,
                roomId: bestCandidate.room.id,
                isBlock: load.isBlock,
                loadId: load.expandedId,
                isManual: false
              });

              // Track EACH teacher individually to prevent conflicts with their other loads
              teamCodes.forEach(code => {
                if (!teacherTracker[code]) teacherTracker[code] = {};
                if (!teacherTracker[code][day]) teacherTracker[code][day] = [];
                teacherTracker[code][day].push(slotId);
              });
              if (!classTracker[load.className]) classTracker[load.className] = {};
              if (!classTracker[load.className][day]) classTracker[load.className][day] = [];
              classTracker[load.className][day].push(slotId);
              if (!roomTracker[bestCandidate.room.id]) roomTracker[bestCandidate.room.id] = {};
              if (!roomTracker[bestCandidate.room.id][day]) roomTracker[bestCandidate.room.id][day] = [];
              roomTracker[bestCandidate.room.id][day].push(slotId);
            });
            scheduled = true;
            generationStats.scheduled += 1;
            break;
          }
        }
        if (!scheduled) {
          if (!seenEligibleDay) {
            generationStats.unavailable += 1;
            const availability = teamCodes.map(code => `${code}: ${(teacherAvailability[code]?.days || []).join(",") ||"belum ada hari hadir"}`).join(" |");
            formatFailureLoad(load, classObj, `Tidak ada hari hadir yang sama untuk semua guru tim. ${availability}`,"Hari hadir guru");
          } else if (strictCompetency && !seenCompetencyMatch) {
            generationStats.competency += 1;
            formatFailureLoad(load, classObj, `Mode Strict Kompetensi aktif, tetapi guru ${teamCodes.join(",")} belum memiliki mapel ${load.subject} pada data kompetensi.`,"Kompetensi guru");
          } else if (availableRooms.length === 0) {
            generationStats.room += 1;
            formatFailureLoad(load, classObj, failureTrace.room[0] ||"Tidak ada ruang yang memenuhi syarat untuk mapel ini.","Ruang tidak sesuai");
          } else if (failureTrace.teacher.length > 0 || failureTrace.class.length > 0) {
            generationStats.conflict += 1;
            formatFailureLoad(load, classObj, [...failureTrace.teacher, ...failureTrace.class].join(""),"Bentrok jadwal");
          } else if (failureTrace.room.length > 0) {
            generationStats.room += 1;
            formatFailureLoad(load, classObj, failureTrace.room.join(""),"Ruang penuh");
          } else if (failureTrace.timeRule.length > 0) {
            generationStats.timeRule += 1;
            formatFailureLoad(load, classObj, failureTrace.timeRule.join(""),"Batas waktu / JP");
          } else {
            generationStats.conflict += 1;
            formatFailureLoad(load, classObj,"Tidak ada slot berurutan yang tersisa setelah mempertimbangkan posisi mapel, guru, kelas, dan ruangan.","Slot tidak tersedia");
          }
        }
      });
      const failedThisAttempt = generationFailures.length;
      if (failedThisAttempt < leastFailedCount) {
        leastFailedCount = failedThisAttempt;
        bestSchedule = newSchedule;
        bestStats = {
          ...generationStats
        };
        bestFailures = [...generationFailures];
        if (leastFailedCount === baseFailures.length) break;
      }
    }
    Object.assign(generationStats, bestStats);
    generationFailures.length = 0;
    generationFailures.push(...bestFailures);
    setSchedule(bestSchedule);
    setIsGenerated(true);
    saveDatabaseNow({ schedule: bestSchedule, isGenerated: true },"menyimpan hasil generate");
    const failed = autoExpandedLoads.length + generationStats.capacity + generationStats.quota - generationStats.scheduled;
    addActivityLog({
      type:"schedule",
      title: failed > 0 ?"Jadwal digenerate sebagian" :"Jadwal berhasil digenerate",
      detail: failed > 0 ? `${generationStats.scheduled} slot terpasang, ${failed} beban belum muat` : `${generationStats.scheduled} slot terpasang`
    });
    setSwapWarning(failed > 0 ? <div className="flex flex-col gap-3 w-full text-sm">
      <div>
        <span className="font-bold text-red-800 text-base">
          Generate parsial berhasil: {failed} beban belum muat
        </span>
        <p className="text-red-700 mt-1">
          Jadwal yang bisa dipasang sudah tetap disimpan. Angka di bawah
          menunjukkan kenapa sisa beban belum bisa ditempatkan secara
          otomatis.
        </p>
      </div>
      <div className="bg-red-50/70 border border-red-200 rounded-[var(--ui-radius-small)] p-3">
        <div className="text-[11px] font-black text-red-800 uppercase tracking-widest mb-2">
          Rincian penyebab
        </div>
        <ul className="list-disc ml-5 space-y-1.5 text-red-700">
          {generationStats.quota > 0 && <li>
            <strong>
              Maks Kelas Beban ({generationStats.quota} jadwal):
            </strong>{""}
            Beban mengajar ini sudah mencapai batas jumlah kelas yang
            diizinkan, jadi sisa kelas tidak lagi dapat menempel ke beban
            yang sama.
          </li>}
          {generationStats.capacity > 0 && <li>
            <strong>
              Target JP Guru Penuh ({generationStats.capacity} jadwal):
            </strong>{""}
            Total JP guru tersebut sudah mencapai batas maksimal
            harian/mingguan yang ditentukan, sehingga slot berikutnya
            ditolak.
          </li>}
          {generationStats.unavailable > 0 && <li>
            <strong>
              Guru Tidak Hadir ({generationStats.unavailable} jadwal):
            </strong>{""}
            Pada hari kosong yang tersedia, guru yang bersangkutan belum
            punya jadwal hadir di ketersediaan.
          </li>}
          {generationStats.competency > 0 && <li>
            <strong>
              Kompetensi ({generationStats.competency} jadwal):
            </strong>{""}
            Fitur"Hanya Guru Berkompeten" aktif, tetapi mapel ini belum
            cocok dengan kompetensi guru yang tersedia.
          </li>}
          {generationStats.room > 0 && <li>
            <strong>
              Ruang Praktik Penuh/Beda Jurusan ({generationStats.room}{""}
              jadwal):
            </strong>{""}
            Tidak ada lab/bengkel yang kosong atau sesuai jurusan kelas
            pada slot waktu tersebut.
          </li>}
          {generationStats.timeRule > 0 && <li>
            <strong>
              Batas Waktu / JP ({generationStats.timeRule} jadwal):
            </strong>{""}
            Slot yang mungkin ada ditolak oleh batas JP harian, aturan
            Jumat, atau posisi mapel.
          </li>}
          {generationStats.conflict > 0 && <li>
            <strong>
              Guru Bentrok ({generationStats.conflict} jadwal):
            </strong>{""}
            Guru tersebut sudah dipakai di kelas lain pada hari dan jam
            yang sama.
          </li>}
        </ul>
      </div>
      {generationFailures.length > 0 && <details className="bg-white/70 border border-red-200 rounded-[var(--ui-radius-small)] overflow-hidden" open>
        <summary className="cursor-pointer px-3 py-2.5 text-[11px] font-black text-red-800 uppercase tracking-widest">
          Beban yang belum muat ({generationFailures.length}) - klik untuk
          lihat rincian bentrok
        </summary>
        <div className="max-h-80 overflow-auto border-t border-red-100">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 bg-red-50 text-red-800 uppercase tracking-wide text-[10px]">
              <tr>
                <th className="px-3 py-2">Kelas & Mapel</th>
                <th className="px-3 py-2">Guru</th>
                <th className="px-3 py-2">Jenis Kendala</th>
                <th className="px-3 py-2">Rincian Slot / Bentrok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100 text-red-800">
              {generationFailures.map(failure => <tr key={failure.id} className="align-top">
                <td className="px-3 py-2 font-semibold whitespace-nowrap">
                  <div>{failure.className}</div>
                  <div className="font-normal text-red-700">
                    {failure.subject}
                    {failure.duration > 0 ? ` (${failure.duration} JP)` :""}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {failure.teacherCode}
                </td>
                <td className="px-3 py-2 font-bold whitespace-nowrap">
                  {failure.category}
                </td>
                <td className="px-3 py-2 leading-relaxed">
                  {failure.detail}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </details>}
      <div className="bg-red-100/50 px-3 py-2.5 rounded-[var(--ui-radius-small)] border border-red-200 block">
        <div className="text-[11px] font-black text-red-800 uppercase tracking-widest mb-1.5">
          Langkah cepat
        </div>
        <div className="text-red-800 text-xs font-semibold leading-relaxed space-y-1">
          <p>
            1. Tambah Target JP atau Maks Kelas pada beban yang paling
            sering gagal.
          </p>
          <p>2. Tambah Hari Hadir guru untuk hari yang masih kosong.</p>
          <p>
            3. Tambah ruang lab atau ubah prioritas ruang praktik yang
            paling penuh.
          </p>
          <p>
            4. Jika perlu, pindahkan sisa jadwal secara manual di menu
            Jadwal.
          </p>
        </div>
      </div>
      <span className="mt-2 text-xs font-bold text-red-800 bg-red-100/50 px-3 py-2.5 rounded-[var(--ui-radius-small)] border border-red-200 block">
        💡 SOLUSI: Coba edit Beban Mengajar (tambah Target JP / Maks Kelas),
        tambah Hari Hadir guru, atau tambah Ruang Lab. Anda juga bisa
        menarik manual sisa jadwal yang tidak terpasang ini di menu Jadwal.
      </span>
    </div> :"");
    showNotification(failed > 0 ? `Generate parsial selesai: ${generationStats.scheduled} masuk, ${failed} belum muat.` :"Berhasil meng-generate jadwal. Pelajaran Praktik dialokasikan ke Bengkel / Lab yang sesuai!", failed > 0 ?"warning" :"success");
    } catch (error) {
      console.error("Gagal men-generate jadwal:", error);
      showNotification(`Gagal men-generate jadwal: ${error.message}`,"error");
    }
  };
  const handleDragStart = (e, sourceDay, sourceSlotId, sourceClass) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      sourceDay,
      sourceSlotId,
      sourceClass
    }));
  };
  const handleDragOver = e => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-[var(--ui-accent)]/30");
  };
  const handleDragLeave = e => {
    e.currentTarget.classList.remove("bg-[var(--ui-accent)]/30");
  };
  const handleDrop = (e, targetDay, targetSlotId, targetClass) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-[var(--ui-accent)]/30");
    if (!ensureDatabaseReadyForWrite("mengubah jadwal")) return;
    if (!timeSlots[targetDay] || timeSlots[targetDay].find(s => s.id === targetSlotId)?.isBreak) {
      setSwapWarning("Tidak bisa ditarik ke jam non-pelajaran.");
      return;
    }
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const {
        sourceDay,
        sourceSlotId,
        sourceClass
      } = JSON.parse(dataStr);
      if (sourceDay === targetDay && sourceSlotId === targetSlotId && sourceClass === targetClass) return;
      const sourceItems = schedule.filter(s => s.day === sourceDay && s.slotId === sourceSlotId && s.className === sourceClass);
      const targetItems = schedule.filter(s => s.day === targetDay && s.slotId === targetSlotId && s.className === targetClass);
      let newSchedule = [...schedule].filter(s => !(s.day === sourceDay && s.slotId === sourceSlotId && s.className === sourceClass) && !(s.day === targetDay && s.slotId === targetSlotId && s.className === targetClass));
      const getTargetRoom = (clsName, itemsInSlot) => {
        const teoriItem = itemsInSlot.find(i => !i.isBlock);
        if (teoriItem) return teoriItem.roomId;
        const homeRoomItem = schedule.find(s => s.className === clsName && !s.isBlock);
        return homeRoomItem ? homeRoomItem.roomId :"-";
      };
      const roomForTargetItem = getTargetRoom(sourceClass, sourceItems);
      const roomForSourceItem = getTargetRoom(targetClass, targetItems);
      targetItems.forEach(item => newSchedule.push({
        ...item,
        day: sourceDay,
        slotId: sourceSlotId,
        className: sourceClass,
        roomId: sourceClass === item.className ? item.roomId : item.isBlock ? item.roomId : roomForTargetItem
      }));
      sourceItems.forEach(item => newSchedule.push({
        ...item,
        day: targetDay,
        slotId: targetSlotId,
        className: targetClass,
        roomId: targetClass === item.className ? item.roomId : item.isBlock ? item.roomId : roomForSourceItem
      }));
      let conflictDetected = false;
      let conflictMsg ="";
      const checkConflicts = (items, day, slotId) => {
        items.forEach(item => {
          // Team teaching: split comma-separated teacher codes and check overlap
          const itemCodes = new Set(String(item.teacherCode ||"").split(",").map(c => c.trim()).filter(Boolean));
          const conflictingSchedule = newSchedule.filter(s => s.day === day && s.slotId === slotId && s.className !== item.className);
          for (const s of conflictingSchedule) {
            const sCodes = String(s.teacherCode ||"").split(",").map(c => c.trim()).filter(Boolean);
            for (const sc of sCodes) {
              if (itemCodes.has(sc)) {
                conflictDetected = true;
                conflictMsg = `Guru ${sc} bentrok.`;
                break;
              }
            }
          }
          if (newSchedule.filter(s => s.day === day && s.slotId === slotId && s.roomId === item.roomId && s.className !== item.className).length > 0) {
            conflictDetected = true;
            conflictMsg = `Ruang ${(item.roomId)} bentrok.`;
          }
        });
      };
      checkConflicts(sourceItems, targetDay, targetSlotId);
      checkConflicts(targetItems, sourceDay, sourceSlotId);
      setSwapWarning(conflictDetected ? conflictMsg :"");
      setSchedule(newSchedule);
      saveDatabaseNow({ schedule: newSchedule },"mengubah jadwal");
    } catch (error) {
      console.warn("Gagal memproses drag & drop jadwal", error);
    }
  };
  const startQuickEditGuru = teacher => {
    setQuickEditGuruCode(teacher.code);
    setQuickGuruForm({
      name: teacher.name ||"",
      type: teacher.type ||"Umum",
      preferredMajor: teacher.preferredMajor ||"Semua",
      preferredGrade: teacher.preferredGrade ||"Semua",
      targetWeeklyJp: teacher.targetWeeklyJp ||"",
      phone: teacher.phone ||"",
      password:""
    });
  };
  const saveQuickEditGuru = async teacherCode => {
    if (!ensureDatabaseReadyForWrite("menyimpan quick edit guru")) return;
    const nextName = String(quickGuruForm.name ||"").trim();
    if (!nextName) {
      showNotification("Nama guru wajib diisi.","warning");
      return;
    }
    const nextPassword = quickGuruForm.password ? await (quickGuruForm.password) : null;
    const nextTeachers = teachers.map(t => t.code === teacherCode ? {
      ...t,
      ...quickGuruForm,
      name: nextName,
      targetWeeklyJp: parsePositiveInt(quickGuruForm.targetWeeklyJp, 0),
      password: nextPassword || t.password
    } : t);
    setTeachers(nextTeachers);
    await syncAuthSnapshotSafe(adminUser, nextTeachers);
    await saveDatabaseNow({ teachers: nextTeachers },"menyimpan guru");
    setQuickEditGuruCode("");
    setQuickGuruForm({});
    showNotification("Perubahan guru tersimpan cepat.");
  };
  const Instagram = ({
    size = 16,
    className ="",
    style = {}
  }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>;
  const Facebook = ({
    size = 16,
    className ="",
    style = {}
  }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12z" />
    </svg>;
  const THEME_PRESETS = [{
    name:"Default Green",
    primaryColor:"#064e3b",
    accentColor:"#a3e635",
    primaryButtonColor:"#064e3b",
    actionButtonColor:"#a3e635",
    bgColor:"#eef2f7",
    surfaceColor:"#ffffff",
    textColor:"#0f172a"
  }, {
    name:"Emerald Pro",
    primaryColor:"#059669",
    accentColor:"#d1fae5",
    primaryButtonColor:"#059669",
    actionButtonColor:"#10b981",
    bgColor:"#f9fafb",
    surfaceColor:"#ffffff",
    textColor:"#111827"
  }, {
    name:"Ocean Blue",
    primaryColor:"#2563eb",
    accentColor:"#dbeafe",
    primaryButtonColor:"#2563eb",
    actionButtonColor:"#3b82f6",
    bgColor:"#f8fafc",
    surfaceColor:"#ffffff",
    textColor:"#0f172a"
  }, {
    name:"Midnight Purple",
    primaryColor:"#4c1d95",
    accentColor:"#c4b5fd",
    primaryButtonColor:"#5b21b6",
    actionButtonColor:"#8b5cf6",
    bgColor:"#1e1b4b",
    surfaceColor:"#312e81",
    textColor:"#f8fafc"
  }, {
    name:"Sunset Orange",
    primaryColor:"#ea580c",
    accentColor:"#ffedd5",
    primaryButtonColor:"#ea580c",
    actionButtonColor:"#f97316",
    bgColor:"#fff7ed",
    surfaceColor:"#ffffff",
    textColor:"#431407"
  }, {
    name:"Cyberpunk",
    primaryColor:"#fde047",
    accentColor:"#ec4899",
    primaryButtonColor:"#facc15",
    actionButtonColor:"#ec4899",
    bgColor:"#111827",
    surfaceColor:"#1f2937",
    textColor:"#f3f4f6"
  }];
  const MAJOR_ICON_OPTIONS = [{
    value:"book",
    label:"Buku / Mapel",
    icon: BookOpen
  }, {
    value:"chat",
    label:"Komunikasi",
    icon: MessageSquare
  }, {
    value:"monitor",
    label:"Komputer",
    icon: MonitorSmartphone
  }, {
    value:"wifi",
    label:"Jaringan",
    icon: Wifi
  }, {
    value:"palette",
    label:"Desain",
    icon: Palette
  }, {
    value:"map",
    label:"Denah",
    icon: MapPin
  }, {
    value:"users",
    label:"Siswa",
    icon: Users
  }, {
    value:"sparkles",
    label:"Unggulan",
    icon: Sparkles
  }];
  const applyThemePreset = preset => {
    const nextSettings = {
      ...appSettings,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      primaryButtonColor: preset.primaryButtonColor,
      actionButtonColor: preset.actionButtonColor,
      bgColor: preset.bgColor,
      surfaceColor: preset.surfaceColor,
      textColor: preset.textColor
    };
    setAppSettings(nextSettings);
    saveDatabaseNow({ appSettings: nextSettings },"menerapkan tema");
    showNotification(`Tema"${preset.name}" diterapkan.`);
  };
  const applyAutoRecommendedTheme = () => {
    const hour = new Date().getHours();
    const preset = hour < 12 ? THEME_PRESETS[0] : THEME_PRESETS[1];
    applyThemePreset(preset);
  };
  const hexToRgb = hex => {
    const h = (hex ||"").replace("#","");
    if (h.length !== 6) return null;
    const n = parseInt(h, 16);
    return {
      r: n >> 16 & 255,
      g: n >> 8 & 255,
      b: n & 255
    };
  };
  const luminance = hex => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const f = v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
  };
  const contrastRatio = (a, b) => {
    const l1 = luminance(a);
    const l2 = luminance(b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };
  const saveCurrentAsPreset = () => {
    const name = (newPresetName ||"").trim();
    if (!name) {
      showNotification("Isi nama preset terlebih dahulu.","warning");
      return;
    }
    const preset = {
      name,
      primaryColor: appSettings.primaryColor,
      accentColor: appSettings.accentColor,
      primaryButtonColor: appSettings.primaryButtonColor,
      actionButtonColor: appSettings.actionButtonColor,
      bgColor: appSettings.bgColor,
      surfaceColor: appSettings.surfaceColor,
      textColor: appSettings.textColor
    };
    const next = [...customThemePresets.filter(p => p.name !== name), preset];
    setCustomThemePresets(next);
    setNewPresetName("");
    showNotification(`Preset"${name}" disimpan.`);
  };
  const autoFixContrast = () => {
    const bg = appSettings.bgColor ||"#f8fafc";
    const surface = appSettings.surfaceColor ||"#ffffff";
    const black ="#0f172a";
    const white ="#ffffff";
    const bestForBg = contrastRatio(black, bg) >= contrastRatio(white, bg) ? black : white;
    const bestForSurface = contrastRatio(black, surface) >= contrastRatio(white, surface) ? black : white;
    const nextText = contrastRatio(bestForBg, bg) >= contrastRatio(bestForSurface, surface) ? bestForBg : bestForSurface;
    setAppSettings({
      ...appSettings,
      textColor: nextText
    });
    showNotification(`Auto-fix kontras diterapkan (${nextText}).`);
  };
  const resetThemeDefaults = () => {
    setAppSettings({
      ...appSettings,
      logoText:"TS",
      primaryColor:"#064e3b",
      accentColor:"#a3e635",
      primaryButtonColor:"#064e3b",
      actionButtonColor:"#a3e635",
      bgColor:"#f8fafc",
      surfaceColor:"#ffffff",
      textColor:"#0f172a",
      fontFamily:"Lexend"
    });
    showNotification("Tema dikembalikan ke default.");
  };
  const exportThemeJson = () => {
    const payload = {
      appName: appSettings.appName,
      logoText: appSettings.logoText,
      faviconImage: appSettings.faviconImage,
      heroTitle: appSettings.heroTitle,
      heroSubtitle: appSettings.heroSubtitle,
      footerText: appSettings.footerText,
      primaryColor: appSettings.primaryColor,
      accentColor: appSettings.accentColor,
      primaryButtonColor: appSettings.primaryButtonColor,
      actionButtonColor: appSettings.actionButtonColor,
      bgColor: appSettings.bgColor,
      textColor: appSettings.textColor,
      fontFamily: appSettings.fontFamily,
      trustedByText: appSettings.trustedByText,
      partner1: appSettings.partner1,
      partner2: appSettings.partner2,
      partner3: appSettings.partner3,
      partner4: appSettings.partner4,
      partnerIcon1: appSettings.partnerIcon1,
      partnerIcon2: appSettings.partnerIcon2,
      partnerIcon3: appSettings.partnerIcon3,
      partnerIcon4: appSettings.partnerIcon4
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type:"application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download ="theme-settings.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const importThemeJson = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const nextSettings = {
          ...appSettings,
          ...parsed
        };
        setAppSettings(nextSettings);
        saveDatabaseNow({ appSettings: nextSettings },"mengimpor tema");
        showNotification("Theme JSON berhasil diimport.");
      } catch {
        showNotification("File JSON tema tidak valid atau formatnya salah.","error");
      }
    };
    reader.readAsText(file);
  };


  return {
    handleResetSchedule,
    handleResetRuangan,
    handleResetDenah,
    handleClearCurrentDenahDay,
    handleCopyCurrentDenahToAllDays,
    handleGenerate,
                                                handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
            startQuickEditGuru,
    saveQuickEditGuru,
    applyThemePreset,
    applyAutoRecommendedTheme,
    hexToRgb,
    luminance,
        contrastRatio,
    saveCurrentAsPreset,
    autoFixContrast,
    resetThemeDefaults,
    exportThemeJson,
    importThemeJson,
    THEME_PRESETS,
    MAJOR_ICON_OPTIONS
  };
}
