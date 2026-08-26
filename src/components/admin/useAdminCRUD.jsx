import { splitBulkColumns } from'../../utils/bulkImport.js';
import { useAppStore } from'../../store/useAppStore.js';
import { sameText, normalizeText, isAllLike, getLoadKey, renameClassReferences, renameMajorReferences, renameRoomReferences, parsePositiveInt, serializeCsvList, parseCsvList, createClientId } from'../../utils/adminHelpers.js';
import { WAKA_DIVISION_OPTIONS } from'../../utils/constants.js';
import { verifyPassword } from '../../utils/auth.js';

export function useAdminCRUD(props) {
  const { syllabuses, attendanceRecords, addSyllabus, updateSyllabus, removeSyllabus, addSyllabusCategory, updateSyllabusCategory, removeSyllabusCategory, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, addCalendarCategory, updateCalendarCategory, removeCalendarCategory, removeAttendanceRecord, updateDashboardMessage, removeDashboardMessage, undoLastDelete, setSwapWarning } = useAppStore();

  const { 
    matchesGradeTarget, getRoomName, updateSelectionForTab, normalizeUserRole, isSuperAdminRole, csvValueMatches, csvIncludesText, parseTeacherCodes, getCappedClassCount, getCalendarCategoryIdByLabel, getClassKey, getRoomKey, getTeacherKey, getSubjectKey, hashPassword, syncAuthSnapshotSafe, 
    normalizeCalendarDateInput, formatCalendarDateRange, 
    timeSlots, selectedDaySetting, calendarCategories, selectedSilabusSubject, selectedTeacherSilabusSubject, currentUser, appSettings, setBulkLoadGrades, setBulkLoadMajors, setBulkConflictMode, formData, bulkLoadGrades, bulkLoadMajors, bulkConflictMode, setBulkImportPreview, isSavingModal, modalConfig, setIsSavingModal, adminUser, syncAuthSnapshotNow, saveDatabaseNow, setAdminUser, setCurrentUser, writeSessionUser, setSchedule, setRoomLayout, setLayoutByDay, setAppSettings, teacherAvailability, days, setTeacherAvailability, setSelectedSilabusSubject, setSelectedTeacherSilabusSubject, setSelectedSilabusId, setSelectedTeacherSilabusId, setLoginError, handleBulkDelete, setDays, setSelectedDaySetting,
    students, setStudents, layoutSettings, setLayoutSettings, customThemePresets, setCustomThemePresets, deletedHistory, generationReadiness,
    // states
    setModalConfig,
    activeTab,
    setFormData,
    majors,
    classes,
    teachers,
    staffs,
    subjects,
    teachingLoads, setTeachingLoads,
    setStaffs,
    setConfirmDialog,
    showNotification,
    ensureDatabaseReadyForWrite,
    addActivityLog,
    syllabusData, setSyllabusData,
    syllabusCategories,
    setTimeSlots,
    setMajors,
    setClasses,
    setTeachers,
    setSubjects,
    rooms, setRooms,
    dashboardMessages, 
    
    academicCalendar
  } = props || {};

  /* --- Modals & Logika CRUD --- */
  const openModal = (type, action, data = null) => {
    if (type ==="generate_slots") {
      setFormData({
        startTime:"07:00",
        lessonDuration: 45,
        totalLessons: 10,
        break1After: 4,
        break1Duration: 30,
        break1Label:"ISTIRAHAT 1",
        break2After: 8,
        break2Duration: 30,
        break2Label:"ISHOMA"
      });
    } else if (type ==="kelas" && action ==="add") {
      setFormData({
        name:"",
        major: majors[0] ||"",
        homeroom:""
      });
    } else if (type ==="jurusan" && action ==="add") {
      setFormData({
        name:""
      });
    } else if (type ==="mapel" && action ==="add") {
      setFormData({
        grade:"Semua",
        major:"Umum",
        isBlock: false,
        defaultDuration: 2,
        practiceRoomIds:""
      });
    } else if (type ==="admin" && action ==="edit" && data) {
      setFormData({
        ...data,
        password:""
      });
    } else if (["guru","karyawan","Karyawan"].includes(type) && action ==="add") {
      let nextCode ="";
      if (type ==="guru") {
        const existingCodes = new Set(teachers.map(item => normalizeText(item.code)));
        let idx = teachers.length + 1;
        do {
          nextCode = `G${String(idx).padStart(2,"0")}`;
          idx += 1;
        } while (existingCodes.has(normalizeText(nextCode)));
      } else {
        const existingCodes = new Set(staffs.map(item => normalizeText(item.code)));
        let idx = staffs.length + 1;
        do {
          nextCode = `K${String(idx).padStart(2,"0")}`;
          idx += 1;
        } while (existingCodes.has(normalizeText(nextCode)));
      }
      setFormData({
        code: nextCode,
        type:"Umum",
        role: type ==="guru" ?"guru" :"karyawan",
        division:"",
        preferredMajor:"Semua",
        preferredGrade:"Semua",
        targetWeeklyJp:"",
        password:""
      });
    } else if (["guru","karyawan","Karyawan"].includes(type) && action ==="edit" && data) {
      setFormData({
        ...data,
        password:""
      });
    } else if (type ==="ruangan" && action ==="add") {
      setFormData({
        id:"",
        name:"",
        type:"Teori",
        major:"All",
        targetGrade:"Semua",
        isPriority: false
      });
    } else if (type ==="waktu" && action ==="add") {
      let defaultStart ="07:00";
      const currentDaySlots = timeSlots[selectedDaySetting] || [];
      if (currentDaySlots.length > 0) {
        const lastSlot = currentDaySlots[currentDaySlots.length - 1];
        if (lastSlot && lastSlot.label) {
          const match = lastSlot.label.match(/- ([0-9]{2}[.:][0-9]{2})/);
          if (match) defaultStart = match[1].trim().replace(".",":");
        }
      }
      const jpCount = 1;
      const minsPerJp = 45;
      const [h, m] = defaultStart.split(":").map(Number);
      const totalMins = h * 60 + m + jpCount * minsPerJp;
      const newH = Math.floor(totalMins / 60) % 24;
      const newM = totalMins % 60;
      const defaultEnd = `${String(newH).padStart(2,"0")}:${String(newM).padStart(2,"0")}`;
      setFormData({
        label: `${defaultStart.replace(":",".")} - ${defaultEnd.replace(":",".")}`,
        jpCount,
        minsPerJp
      });
    } else if (type ==="beban" && action ==="add") {
      setFormData({
        subject:"",
        teacherCode:"",
        teamTeacher:"",
        targetGrade:"All",
        targetMajor:"All",
        duration: 2,
        maxClasses:""
      });
    } else if (type ==="beban" && action ==="edit" && data) {
      const codes = String(data.teacherCode ||"").split(",").map(c => c.trim()).filter(Boolean);
      setFormData({
        ...data,
        teacherCode: codes[0] ||"",
        teamTeacher: codes[1] ||""
      });
    } else if (type ==="kategori_kalender" && action ==="add") {
      setFormData({
        name:"",
        color:"blue"
      });
    } else if (type ==="kategori_kalender" && action ==="edit" && data) {
      setFormData({
        ...data
      });
    } else if (type ==="event_kalender" && action ==="add") {
      const todayStr = new Date().toISOString().split("T")[0];
      setFormData({
        title:"",
        categoryId: calendarCategories[0]?.id ||"",
        dateStart: todayStr,
        dateEnd: todayStr,
        description:""
      });
    } else if (type ==="event_kalender" && action ==="edit" && data) {
      setFormData({
        ...data
      });
    } else if (type ==="kategori_silabus" && action ==="add") {
      setFormData({
        name:"",
        color:"blue"
      });
    } else if (type ==="kategori_silabus" && action ==="edit" && data) {
      setFormData({
        ...data
      });
    } else if (type ==="silabus" && action ==="add") {
      const defaultSubject = data?.subjectName || selectedSilabusSubject || selectedTeacherSilabusSubject || subjects[0]?.name ||"";
      const defaultTeacher = currentUser?.role ==="guru" ? currentUser?.code ||"" : data?.teacherCode || teachers[0]?.code || currentUser?.code ||"";
      setFormData({
        subjectName: defaultSubject,
        teacherCode: defaultTeacher,
        title: data?.title ||"",
        categoryId: data?.categoryId ||"",
        gradeSemester: data?.gradeSemester ||"X / Ganjil",
        objectives:"",
        materials:"",
        notes:""
      });
    } else if (type ==="silabus_batch" && action ==="add") {
      setFormData({
        subjectName: subjects[0]?.name ||"",
        teacherCode: currentUser?.role ==="guru" ? currentUser?.code ||"" : teachers[0]?.code || currentUser?.code ||"",
        gradeSemester:"X / Ganjil",
        replaceExisting: true,
        rowsText:""
      });
    } else if (type ==="waka_roles") {
      setFormData({
        ...appSettings
      });
    } else if (type ==="mapel" && data) {
      setFormData({
        ...data,
        grade: data.grade ||"Semua",
        major: data.major ||"Umum",
        isBlock: !!data.isBlock,
        defaultDuration: data.defaultDuration || 2,
        practiceRoomIds: data.practiceRoomIds ||""
      });
    } else if (type ==="ruangan" && data) {
      setFormData({
        ...data,
        id: data.id ||"",
        name: data.name ||"",
        type: String(data.type ||"").toLowerCase().includes("praktik") ?"Praktik" :"Teori",
        major: data.major ||"All",
        targetGrade: data.targetGrade ||"Semua",
        isPriority: !!data.isPriority
      });
    } else if (type ==="silabus" && data) {
      setFormData({
        subjectName: data.subjectName || subjects[0]?.name ||"",
        teacherCode: data.teacherCode || currentUser?.code ||"",
        title: data.title ||"",
        categoryId: data.categoryId ||"",
        gradeSemester: data.gradeSemester ||"",
        objectives: data.objectives ||"",
        materials: data.materials ||"",
        notes: data.notes ||"",
        id: data.id
      });
    } else {
      setFormData(data ? {
        ...data
      } : {});
    }
    if (type ==="beban") {
      setBulkLoadGrades([]);
      setBulkLoadMajors([]);
      setBulkConflictMode("skip");
    }
    setModalConfig({
      isOpen: true,
      type,
      action,
      data
    });
  };
  const handleBulkAddLoads = () => {
    if (!ensureDatabaseReadyForWrite("menambah beban mengajar")) return;
    if (!formData.subject || !formData.teacherCode) {
      showNotification("Pilih mapel dan guru terlebih dahulu.","warning");
      return;
    }
    if (bulkLoadGrades.length === 0 || bulkLoadMajors.length === 0) {
      showNotification("Pilih minimal 1 tingkat dan 1 jurusan.","warning");
      return;
    }
    const duration = formData.duration || 2;
    const maxClasses = parsePositiveInt(formData.maxClasses, 0);
    const candidates = [];
    bulkLoadGrades.forEach(g => bulkLoadMajors.forEach(m => candidates.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      teacherCode: formData.teacherCode,
      subject: formData.subject,
      targetGrade: g,
      targetMajor: m,
      duration,
      maxClasses,
      isBlock: formData.isBlock || false
    })));
    const keyOf = x => `${x.teacherCode}__${x.subject}__${x.targetGrade}__${x.targetMajor}`;
    const existingMap = new Map(teachingLoads.map(x => [keyOf(x), x]));
    let nextLoads = [...teachingLoads];
    let inserted = 0;
    let replaced = 0;
    let skipped = 0;
    candidates.forEach(c => {
      const key = keyOf(c);
      const existing = existingMap.get(key);
      if (!existing) {
        nextLoads.push(c);
        existingMap.set(key, c);
        inserted++;
        return;
      }
      if (bulkConflictMode ==="replace") {
        nextLoads = nextLoads.map(x => x.id === existing.id ? {
          ...c,
          id: existing.id
        } : x);
        existingMap.set(key, {
          ...c,
          id: existing.id
        });
        replaced++;
      } else if (bulkConflictMode ==="keep") {
        nextLoads.push(c);
        inserted++;
      } else skipped++;
    });
    setTeachingLoads(nextLoads);
    showNotification(`Bulk selesai: +${inserted}, replace ${replaced}, skip ${skipped}.`);
    closeModal();
  };
  const handleSyllabusBatchSave = event => {
    event?.preventDefault?.();
    const subjectName = String(formData.subjectName ||"").trim();
    const teacherCode = String(formData.teacherCode || currentUser?.code ||"").trim().toUpperCase();
    const gradeSemester = String(formData.gradeSemester ||"").trim();
    const rows = String(formData.rowsText ||"").split(/\r?\n/).map(line => splitBulkColumns(line)).filter(cols => cols.some(col => String(col ||"").trim() !==""));
    if (!subjectName || !teacherCode || !gradeSemester) {
      showNotification("Mapel, guru, dan kelas/semester wajib diisi.","warning");
      return;
    }
    if (rows.length === 0) {
      showNotification("Daftar pertemuan/BAB masih kosong.","warning");
      return;
    }
    const isHeaderRow = row => row.some(cell => /judul|tujuan|materi|catatan/i.test(String(cell ||"")));
    const dataRows = rows.length > 0 && isHeaderRow(rows[0]) ? rows.slice(1) : rows;
    const nextItems = dataRows.map(row => {
      const [titleRaw, objectivesRaw, materialsRaw, notesRaw] = row;
      const title = String(titleRaw ||"").trim();
      if (!title) return null;
      return {
        id: createClientId(),
        subjectName,
        teacherCode,
        title,
        gradeSemester,
        objectives: String(objectivesRaw ||"").trim(),
        materials: String(materialsRaw ||"").trim(),
        notes: String(notesRaw ||"").trim()
      };
    }).filter(Boolean);
    if (nextItems.length === 0) {
      showNotification("Tidak ada baris silabus yang valid.","warning");
      return;
    }
    addActivityLog({
      type:"silabus",
      title:"Silabus massal diproses",
      detail: `${nextItems.length} pertemuan/BAB untuk ${subjectName} (${gradeSemester})`
    });
    useAppStore.setState(state => {
      const preserved = formData.replaceExisting ? state.syllabuses.filter(item => !(sameText(item.subjectName, subjectName) && sameText(item.teacherCode, teacherCode) && sameText(item.gradeSemester, gradeSemester))) : state.syllabuses;
      return {
        syllabuses: [...preserved, ...nextItems]
      };
    });
    showNotification(`${nextItems.length} pertemuan/BAB berhasil ${formData.replaceExisting ?"ditimpa" :"ditambahkan"}.`,"success");
    closeModal();
  };
  const closeModal = () => {
    setModalConfig({
      isOpen: false,
      type:"",
      action:"",
      data: null
    });
    setBulkLoadGrades([]);
    setBulkLoadMajors([]);
    setBulkConflictMode("skip");
    setBulkImportPreview(null);
  };
  const handleGenerateSlots = e => {
    e.preventDefault();
    if (!ensureDatabaseReadyForWrite("mengubah konfigurasi waktu")) return;
    const {
      startTime,
      lessonDuration,
      totalLessons,
      break1After,
      break1Duration,
      break1Label,
      break2After,
      break2Duration,
      break2Label
    } = formData;
    let currentMinutes = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1]);
    const formatTime = mins => {
      const h = String(Math.floor(mins / 60)).padStart(2,"0");
      const m = String(mins % 60).padStart(2,"0");
      return `${h}:${m}`;
    };
    const newSlots = [];
    let lessonCount = 0;
    for (let i = 1; i <= totalLessons; i++) {
      lessonCount++;
      const startStr = formatTime(currentMinutes);
      currentMinutes += parseInt(lessonDuration);
      const endStr = formatTime(currentMinutes);
      newSlots.push({
        id: `L${lessonCount}`,
        label: `${startStr} - ${endStr}`,
        isBreak: false
      });
      if (lessonCount === parseInt(break1After) && parseInt(break1Duration) > 0) {
        const bStartStr = formatTime(currentMinutes);
        currentMinutes += parseInt(break1Duration);
        const bEndStr = formatTime(currentMinutes);
        newSlots.push({
          id: `B1`,
          label: `${bStartStr} - ${bEndStr}`,
          isBreak: true,
          labelBreak: break1Label ||"ISTIRAHAT"
        });
      }
      if (lessonCount === parseInt(break2After) && parseInt(break2Duration) > 0) {
        const bStartStr = formatTime(currentMinutes);
        currentMinutes += parseInt(break2Duration);
        const bEndStr = formatTime(currentMinutes);
        newSlots.push({
          id: `B2`,
          label: `${bStartStr} - ${bEndStr}`,
          isBreak: true,
          labelBreak: break2Label ||"ISHOMA"
        });
      }
    }
    setTimeSlots(prev => ({
      ...prev,
      [selectedDaySetting]: newSlots
    }));
    showNotification(`Waktu otomatis untuk ${selectedDaySetting} berhasil digenerate!`);
    closeModal();
  };
  const handleSave = async e => {
    e.preventDefault();
    if (isSavingModal) return;
    const {
      type,
      action,
      data
    } = modalConfig;
    if (!type) {
      showNotification("Form tidak dikenali. Tutup modal lalu buka ulang.","error");
      return;
    }
    if (!ensureDatabaseReadyForWrite("menyimpan data")) return;
    setIsSavingModal(true);
    try {
      if (type ==="admin") {
        const nextUsername = String(formData.username ||"").trim();
        const nextName = String(formData.name ||"").trim();
        if (!nextUsername || !nextName) {
          showNotification("Username dan nama admin wajib diisi.","warning");
          setIsSavingModal(false);
          return;
        }
        
        if (formData.password) {
          if (formData.password.length < 6 || formData.password.length > 12) {
            showNotification("Kata sandi baru harus berukuran minimal 6 hingga 12 karakter!","warning");
            setIsSavingModal(false);
            return;
          }
          try {
            const isSame = await verifyPassword(formData.password, adminUser.password);
            if (isSame) {
              showNotification("Tidak bisa menggunakan password yang sama dengan sebelumnya!","warning");
              setIsSavingModal(false);
              return;
            }
          } catch (err) {
            console.error(err);
          }
        }

        const nextPassword = formData.password ? await hashPassword(formData.password) : adminUser.password;
        const updatedAdmin = {
          username: nextUsername,
          password: nextPassword,
          name: nextName
        };
        await syncAuthSnapshotNow(updatedAdmin, teachers,"menyimpan profil admin");
        await saveDatabaseNow({
          adminUser: updatedAdmin
        },"menyimpan profil admin");
        const updatedUser = {
          ...currentUser,
          username: nextUsername,
          name: nextName
        };
        setAdminUser({
          ...adminUser,
          ...updatedAdmin
        });
        setCurrentUser(updatedUser);
        writeSessionUser(updatedUser);
        showNotification("Profil Admin berhasil diperbarui.","success");
      } else if (type ==="siswa") {
        const nextNis = String(formData.nis || formData.code ||"").trim();
        const nextName = String(formData.name || formData.nama ||"").trim();
        const nextClass = String(formData.class_name || formData.kelas ||"").trim();
        const nextGender = String(formData.gender ||"L").trim();
        const nextWaOrtu = String(formData.wa_ortu || formData.phone ||"").trim();
        if (!nextNis || !nextName || !nextClass) {
          showNotification("NIS, Nama Siswa, dan Kelas wajib diisi.","warning");
          return;
        }
        const nextStudent = {
          id: data?.id || nextNis,
          nis: nextNis,
          code: nextNis,
          name: nextName,
          nama: nextName,
          class_name: nextClass,
          kelas: nextClass,
          gender: nextGender,
          wa_ortu: nextWaOrtu,
          phone: nextWaOrtu
        };
        let nextStudents;
        if (action ==="add") {
          const duplicate = students.some(s => sameText(s.nis, nextNis) || sameText(s.code, nextNis));
          if (duplicate) {
            showNotification("NIS/NISN sudah terdaftar.","warning");
            return;
          }
          nextStudents = [...students, nextStudent];
        } else {
          nextStudents = students.map(s => s.id && data.id && s.id === data.id || s.nis && data.nis && s.nis === data.nis ? nextStudent : s);
        }
        await saveDatabaseNow({
          students: nextStudents
        },"menyimpan data siswa");
        setStudents(nextStudents);
        showNotification(`Data siswa berhasil di${action ==="add" ?"tambah" :"perbarui"}.`,"success");
      } else if (type ==="kelas") {
        const nextName = String(formData.name ||"").trim();
        const nextMajor = String(formData.major ||"").trim();
        if (!nextName || !nextMajor) {
          showNotification("Nama kelas dan jurusan wajib diisi.","warning");
          return;
        }
        if (!normalizeText(nextName).includes(normalizeText(nextMajor))) {
          showNotification("Nama kelas harus mengandung jurusan. Contoh: X TKR 1 dengan jurusan TKR.","warning");
          return;
        }
        const duplicate = classes.some(item => sameText(item.name, nextName) && !sameText(item.name, data?.name));
        if (duplicate) {
          showNotification("Nama kelas sudah digunakan.","warning");
          return;
        }
        const nextClass = {
          name: nextName,
          major: nextMajor,
          homeroom: String(formData.homeroom ||"").trim()
        };
        if (action ==="add") setClasses(prev => [...prev, nextClass]);
        if (action ==="edit") {
          const oldName = data?.name ||"";
          if (!classes.some(item => sameText(item.name, oldName))) {
            showNotification("Data kelas tidak ditemukan. Tutup modal lalu buka ulang data kelas.","warning");
            return;
          }
          setClasses(prev => prev.map(item => sameText(item.name, oldName) ? nextClass : item));
          renameClassReferences(setSchedule, setRoomLayout, setLayoutByDay, oldName, nextClass, layoutSettings.majorLabs?.[nextClass.major] ||"");
          setStudents(prev => prev.map(s => {
            if (sameText(s.class_name, oldName) || sameText(s.kelas, oldName)) {
              return { ...s, class_name: nextClass.name, kelas: nextClass.name };
            }
            return s;
          }));
        }
        showNotification(`Data kelas berhasil di${action ==="add" ?"tambah" :"perbarui"}.`,"success");
      } else if (type ==="jurusan") {
        const newMajor = String(formData.name ||"").trim();
        if (!newMajor) {
          showNotification("Nama jurusan wajib diisi.","warning");
          return;
        }
        const duplicate = majors.some(item => sameText(item, newMajor) && !sameText(item, data?.name));
        if (duplicate) {
          showNotification("Nama jurusan sudah digunakan.","warning");
          return;
        }
        if (action ==="add") setMajors(prev => [...prev, newMajor]);
        if (action ==="edit") {
          const oldMajor = data?.name ||"";
          if (!majors.some(item => sameText(item, oldMajor))) {
            showNotification("Data jurusan tidak ditemukan. Tutup modal lalu buka ulang data jurusan.","warning");
            return;
          }
          setMajors(prev => prev.map(item => sameText(item, oldMajor) ? newMajor : item));
          renameMajorReferences({
            setClasses,
            setSubjects,
            setRooms,
            setTeachers,
            setTeachingLoads,
            setRoomLayout,
            setLayoutSettings
          }, oldMajor, newMajor, layoutSettings.majorLabs?.[oldMajor] || layoutSettings.majorLabs?.[newMajor] ||"");
        }
        showNotification(`Data jurusan berhasil di${action ==="add" ?"tambah" :"perbarui"}.`,"success");
      } else if (type ==="waka_roles") {
        const nextSettings = {
          ...appSettings
        };
        WAKA_DIVISION_OPTIONS.forEach(div => {
          const key = `waka${div.value.charAt(0).toUpperCase() + div.value.slice(1)}Label`;
          nextSettings[key] = formData[key] || div.label;
        });
        setAppSettings(nextSettings);
        showNotification("Penamaan peran Waka berhasil diperbarui.","success");
      } else if (type ==="ruangan") {
        const nextId = String(formData.id ||"").trim().toUpperCase();
        const nextName = String(formData.name ||"").trim();
        if (!nextId || !nextName) {
          showNotification("ID ruangan dan nama ruangan wajib diisi.","warning");
          return;
        }
        const duplicate = rooms.some(item => sameText(item.id, nextId) && !sameText(item.id, data?.id));
        if (duplicate) {
          showNotification("ID ruangan sudah digunakan.","warning");
          return;
        }
        const nextRoom = {
          id: nextId,
          name: nextName,
          type: String(formData.type ||"").toLowerCase().includes("praktik") ?"Praktik" :"Teori",
          major: formData.major ||"All",
          targetGrade: formData.targetGrade ||"Semua",
          isPriority: !!formData.isPriority
        };
        if (action ==="add") setRooms(prev => [...prev, nextRoom]);
        if (action ==="edit") {
          const oldId = data?.id ||"";
          if (!rooms.some(item => sameText(item.id, oldId))) {
            showNotification("Data ruangan tidak ditemukan. Tutup modal lalu buka ulang data ruangan.","warning");
            return;
          }
          setRooms(prev => prev.map(item => sameText(item.id, oldId) ? nextRoom : item));
          renameRoomReferences(setSchedule, setRoomLayout, setLayoutSettings, oldId, nextRoom);
        }
        showNotification(`Data ruangan berhasil di${action ==="add" ?"tambah" :"perbarui"}.`,"success");
      } else if (["karyawan","Karyawan"].includes(type)) {
        const nextPasswordHash = formData.password ? await hashPassword(formData.password) : null;
        const normalizeMultiValue = (value, fallback ="Semua") => {
          const raw = String(value ||"").trim();
          if (!raw || sameText(raw,"Semua") || sameText(raw,"All")) return fallback;
          const values = raw.split(",").map(item => item.trim()).filter(Boolean);
          return values.length > 0 ? Array.from(new Set(values)).join(",") : fallback;
        };
        const nextName = String(formData.name ||"").trim();
        if (!nextName) {
          showNotification("Nama karyawan wajib diisi.","warning");
          return;
        }

        const nextRole = ((currentUser?.role) ? formData.role ||"karyawan" : data?.role ||"karyawan");
        const nextDivision = nextRole ==="waka" ? formData.division || data?.division || WAKA_DIVISION_OPTIONS[0].value : (formData.division ||"");

        if (action ==="add") {
          const preferredCode = String(formData.code ||"").trim().toUpperCase();
          const existingCodes = new Set(staffs.map(item => normalizeText(item.code)));
          let nextCode = preferredCode;
          if (!nextCode) {
            let idx = staffs.length + 1;
            do {
              nextCode = `K${String(idx).padStart(2,"0")}`;
              idx += 1;
            } while (existingCodes.has(normalizeText(nextCode)));
          }
          if (existingCodes.has(normalizeText(nextCode))) {
            showNotification("Kode karyawan sudah digunakan.","warning");
            return;
          }
          const newStaff = {
            code: nextCode,
            staff_code: nextCode,
            name: nextName,
            type: formData.type ||"Umum",
            role: nextRole,
            division: nextDivision,
            password: nextPasswordHash || (await hashPassword(nextCode)),
            mustChangePassword: !formData.password,
            preferredMajor: normalizeMultiValue(formData.preferredMajor),
            preferredGrade: normalizeMultiValue(formData.preferredGrade),
            targetWeeklyJp: parsePositiveInt(formData.targetWeeklyJp, 0),
            phone: formData.phone ||""
          };
          const nextStaffs = [...staffs, newStaff];
          await syncAuthSnapshotNow(adminUser, teachers, nextStaffs, "menambah data karyawan");
          await saveDatabaseNow({
            staffs: nextStaffs,
          },"menambah data karyawan");
          setStaffs(nextStaffs);
          showNotification("Data karyawan berhasil ditambahkan.","success");
        }
        if (action ==="edit") {
          const oldCode = String(data?.code || formData.code ||"").trim();
          const oldRole = (data?.role);
          const oldDivision = oldRole ==="waka" ? data?.division || WAKA_DIVISION_OPTIONS[0].value :"";
          if (currentUser?.code && sameText(currentUser.code, oldCode) && (oldRole !== nextRole || oldDivision !== nextDivision)) {
            showNotification("Akses sesi aktif tidak bisa diubah dari akun yang sedang login. Gunakan SuperAdmin lain atau login ulang setelah perubahan.","warning");
            return;
          }
          let didUpdate = false;
          const nextStaffs = staffs.map(t => {
            if (!sameText(t.code, oldCode)) return t;
            didUpdate = true;
            return {
              ...t,
              code: t.code || oldCode,
              staff_code: t.code || oldCode,
              name: nextName,
              type: formData.type ||"Umum",
              role: nextRole,
              division: nextDivision,
              password: nextPasswordHash || t.password,
              preferredMajor: normalizeMultiValue(formData.preferredMajor),
              preferredGrade: normalizeMultiValue(formData.preferredGrade),
              targetWeeklyJp: parsePositiveInt(formData.targetWeeklyJp, 0),
              phone: formData.phone ||""
            };
          });
          if (!didUpdate) {
            showNotification("Data karyawan tidak ditemukan. Tutup modal lalu buka ulang data karyawan.","warning");
            return;
          }
          await syncAuthSnapshotNow(adminUser, teachers, nextStaffs, "memperbarui data karyawan");
          await saveDatabaseNow({
            staffs: nextStaffs
          },"memperbarui data karyawan");
          setStaffs(nextStaffs);
          showNotification("Data karyawan berhasil diperbarui.","success");
        }
      } else if (type ==="guru") {
        const nextPasswordHash = formData.password ? await hashPassword(formData.password) : null;
        const normalizeMultiValue = (value, fallback ="Semua") => {
          const raw = String(value ||"").trim();
          if (!raw || sameText(raw,"Semua") || sameText(raw,"All")) return fallback;
          const values = raw.split(",").map(item => item.trim()).filter(Boolean);
          return values.length > 0 ? Array.from(new Set(values)).join(",") : fallback;
        };
        const nextName = String(formData.name ||"").trim();
        if (!nextName) {
          showNotification("Nama guru wajib diisi.","warning");
          return;
        }
        const nextRole = ((currentUser?.role) ? formData.role ||"guru" : data?.role ||"guru");
        const nextDivision = nextRole ==="waka" ? formData.division || data?.division || WAKA_DIVISION_OPTIONS[0].value :"";
        if (action ==="add") {
          const preferredCode = String(formData.code ||"").trim().toUpperCase();
          const existingCodes = new Set(teachers.map(item => normalizeText(item.code)));
          let nextCode = preferredCode;
          if (!nextCode) {
            let idx = teachers.length + 1;
            do {
              nextCode = `G${String(idx).padStart(2,"0")}`;
              idx += 1;
            } while (existingCodes.has(normalizeText(nextCode)));
          }
          if (existingCodes.has(normalizeText(nextCode))) {
            showNotification("Kode guru sudah digunakan.","warning");
            return;
          }
          const newTeacher = {
            code: nextCode,
            name: nextName,
            type: formData.type || "Umum",
            role: nextRole,
            division: nextDivision,
            subrole: nextRole === "guru" ? (formData.subrole || "") : "",
            password: nextPasswordHash || (await hashPassword(nextCode)),
            mustChangePassword: !formData.password,
            preferredMajor: normalizeMultiValue(formData.preferredMajor),
            preferredGrade: normalizeMultiValue(formData.preferredGrade),
            targetWeeklyJp: parsePositiveInt(formData.targetWeeklyJp, 0),
            phone: formData.phone || ""
          };
          const nextTeachers = [...teachers, newTeacher];
          const nextTeacherAvailability = {
            ...teacherAvailability,
            [newTeacher.code]: {
              days: [...days],
              subjects: []
            }
          };
          await syncAuthSnapshotNow(adminUser, nextTeachers, staffs, "menambah data guru");
          await saveDatabaseNow({
            teachers: nextTeachers,
            teacherAvailability: nextTeacherAvailability
          },"menambah data guru");
          setTeachers(nextTeachers);
          setTeacherAvailability(nextTeacherAvailability);
          showNotification("Data guru berhasil ditambahkan.","success");
        }
        if (action ==="edit") {
          const oldCode = String(data?.code || formData.code ||"").trim();
          const oldRole = (data?.role);
          const oldDivision = oldRole ==="waka" ? data?.division || WAKA_DIVISION_OPTIONS[0].value :"";
          if (currentUser?.code && sameText(currentUser.code, oldCode) && (oldRole !== nextRole || oldDivision !== nextDivision)) {
            showNotification("Akses sesi aktif tidak bisa diubah dari akun yang sedang login. Gunakan SuperAdmin lain atau login ulang setelah perubahan.","warning");
            return;
          }
          let didUpdate = false;
          const nextTeachers = teachers.map(t => {
            if (!sameText(t.code, oldCode)) return t;
            didUpdate = true;
            return {
              ...t,
              code: t.code || oldCode,
              name: nextName,
              type: formData.type || "Umum",
              role: nextRole,
              division: nextDivision,
              subrole: nextRole === "guru" ? (formData.subrole || "") : "",
              password: nextPasswordHash || t.password,
              preferredMajor: normalizeMultiValue(formData.preferredMajor),
              preferredGrade: normalizeMultiValue(formData.preferredGrade),
              targetWeeklyJp: parsePositiveInt(formData.targetWeeklyJp, 0),
              phone: formData.phone || "",
              notify_phone: formData.notify_phone || t.notify_phone || ""
            };
          });
          if (!didUpdate) {
            showNotification("Data guru tidak ditemukan. Tutup modal lalu buka ulang data guru.","warning");
            return;
          }
          await syncAuthSnapshotNow(adminUser, nextTeachers, staffs, "memperbarui data guru");
          await saveDatabaseNow({
            teachers: nextTeachers
          },"memperbarui data guru");
          setTeachers(nextTeachers);
          showNotification("Data guru berhasil diperbarui.","success");
        }
      } else if (type ==="mapel") {
        const nextName = String(formData.name ||"").trim();
        if (!nextName) {
          showNotification("Nama mapel wajib diisi.","warning");
          return;
        }
        const duplicate = subjects.some(item => sameText(item.name, nextName) && !sameText(item.name, data?.name));
        if (duplicate) {
          showNotification("Nama mapel sudah digunakan.","warning");
          return;
        }
        const newSubject = {
          name: nextName,
          grade: formData.grade ||"Semua",
          major: formData.major ||"Umum",
          isBlock: !!formData.isBlock,
          defaultDuration: formData.defaultDuration || 2,
          position: formData.position ||"any",
          practiceRoomIds: serializeCsvList(parseCsvList(formData.practiceRoomIds))
        };
        if (action ==="add") setSubjects(prev => [...prev, newSubject]);
        if (action ==="edit") {
          const oldName = data?.name ||"";
          if (!subjects.some(item => sameText(item.name, oldName))) {
            showNotification("Data mapel tidak ditemukan. Tutup modal lalu buka ulang data mapel.","warning");
            return;
          }
          setSubjects(prev => prev.map(item => sameText(item.name, oldName) ? newSubject : item));
          setSchedule(prev => prev.map(item => sameText(item.subject, oldName) ? {
            ...item,
            subject: newSubject.name
          } : item));
          setTeachingLoads(prev => prev.map(item => sameText(item.subject, oldName) ? {
            ...item,
            subject: newSubject.name,
            targetGrade: newSubject.grade !=="Semua" ? newSubject.grade : item.targetGrade ||"All",
            targetMajor: !isAllLike(newSubject.major, ["Umum","Semua","All"]) ? newSubject.major : item.targetMajor ||"All",
            duration: newSubject.defaultDuration || item.duration
          } : item));
          setTeacherAvailability(prev => {
            const next = {};
            Object.entries(prev).forEach(([code, entry]) => {
              next[code] = {
                ...entry,
                subjects: (entry?.subjects || []).map(subject => sameText(subject, oldName) ? newSubject.name : subject)
              };
            });
            return next;
          });
          useAppStore.setState(state => ({
            syllabuses: (state.syllabuses || []).map(item => sameText(item.subjectName, oldName) ? {
              ...item,
              subjectName: newSubject.name
            } : item)
          }));
          setSelectedSilabusSubject(prev => sameText(prev, oldName) ? newSubject.name : prev);
          setSelectedTeacherSilabusSubject(prev => sameText(prev, oldName) ? newSubject.name : prev);
        }
        showNotification(`Data mapel berhasil di${action ==="add" ?"tambah" :"perbarui"}.`,"success");
      } else if (type ==="beban") {
        const sanitizedLoad = {
          ...formData,
          teacherCode: [String(formData.teacherCode ||"").trim().toUpperCase(), String(formData.teamTeacher ||"").trim().toUpperCase()].filter(Boolean).join(","),
          subject: String(formData.subject ||"").trim(),
          targetGrade: formData.targetGrade ||"All",
          targetMajor: formData.targetMajor ||"All",
          duration: formData.duration || 2,
          maxClasses: parsePositiveInt(formData.maxClasses, 0)
        };
        if (!sanitizedLoad.teacherCode || !sanitizedLoad.subject) {
          showNotification("Guru dan mata pelajaran wajib dipilih.","warning");
          return;
        }
        const nextLoad = {
          ...sanitizedLoad,
          id: action ==="add" ? `${sanitizedLoad.teacherCode ||"G"}-${sanitizedLoad.subject ||"MAPEL"}-${sanitizedLoad.targetGrade ||"ALL"}-${sanitizedLoad.targetMajor ||"ALL"}-${teachingLoads.length + 1}` : data?.id || sanitizedLoad.id
        };
        const duplicate = teachingLoads.some(item => getLoadKey(item) === getLoadKey(nextLoad) && item.id !== nextLoad.id);
        if (duplicate) {
          showNotification("Beban mengajar dengan kombinasi ini sudah ada.","warning");
          return;
        }
        if (action ==="add") {
          setTeachingLoads(prev => [...prev, nextLoad]);
        }
        if (action ==="edit") {
          if (!teachingLoads.some(item => item.id === nextLoad.id)) {
            showNotification("Data beban mengajar tidak ditemukan. Tutup modal lalu buka ulang data beban.","warning");
            return;
          }
          setTeachingLoads(prev => prev.map(item => item.id === nextLoad.id ? nextLoad : item));
        }
        showNotification(`Beban mengajar berhasil di${action ==="add" ?"tambah" :"perbarui"}.`,"success");
      } else if (type ==="kategori_kalender") {
        const name = String(formData.name ||"").trim();
        if (!name) {
          showNotification("Nama kategori kalender wajib diisi.","warning");
          return;
        }
        const nextCategory = {
          ...formData,
          name,
          color: formData.color ||"blue"
        };
        if (action ==="add") {
          addCalendarCategory({
            ...nextCategory,
            id: `cal-c-${createClientId()}`
          });
          showNotification("Kategori kalender berhasil ditambahkan!");
        } else {
          if (!calendarCategories.some(item => item.id === data?.id)) {
            showNotification("Kategori kalender tidak ditemukan. Tutup modal lalu buka ulang.","warning");
            return;
          }
          updateCalendarCategory(data.id, nextCategory);
          showNotification("Kategori kalender berhasil diperbarui!");
        }
      } else if (type ==="event_kalender") {
        const title = String(formData.title ||"").trim();
        const dateStart = normalizeCalendarDateInput(formData.dateStart);
        const dateEnd = normalizeCalendarDateInput(formData.dateEnd || formData.dateStart);
        if (!title || !dateStart) {
          showNotification("Judul kegiatan dan tanggal mulai wajib diisi.","warning");
          return;
        }
        if (dateEnd && dateEnd < dateStart) {
          showNotification("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.","warning");
          return;
        }
        const nextEvent = {
          ...formData,
          title,
          dateStart,
          dateEnd: dateEnd || dateStart
        };
        if (action ==="add") {
          addCalendarEvent({
            ...nextEvent,
            id: `evt-${createClientId()}`
          });
          showNotification("Kegiatan kalender berhasil ditambahkan!");
        } else {
          if (!academicCalendar.some(item => item.id === data?.id)) {
            showNotification("Kegiatan kalender tidak ditemukan. Tutup modal lalu buka ulang.","warning");
            return;
          }
          updateCalendarEvent(data.id, nextEvent);
          showNotification("Kegiatan kalender berhasil diperbarui!");
        }
      } else if (type ==="kategori_silabus") {
        const name = String(formData.name ||"").trim();
        if (!name) {
          showNotification("Nama kategori modul wajib diisi.","warning");
          return;
        }
        const newCat = {
          id: action ==="add" ? `cat_${createClientId()}` : data?.id,
          name,
          color: formData.color ||"blue"
        };
        if (action ==="add") addSyllabusCategory(newCat);
        if (action ==="edit") {
          if (!syllabusCategories.some(item => item.id === newCat.id)) {
            showNotification("Kategori silabus tidak ditemukan. Tutup modal lalu buka ulang.","warning");
            return;
          }
          updateSyllabusCategory(newCat.id, newCat);
        }
        showNotification(`Kategori silabus berhasil di${action ==="add" ?"tambah" :"perbarui"}.`);
      } else if (type ==="silabus") {
        const subjectName = String(formData.subjectName ||"").trim();
        const teacherCode = String(formData.teacherCode || currentUser?.code ||"").trim().toUpperCase();
        const title = String(formData.title ||"").trim();
        if (!subjectName || !teacherCode || !title) {
          showNotification("Silabus belum lengkap. Lengkapi mapel, guru, dan judul pertemuan/BAB.","warning");
          return;
        }
        const nextItem = {
          id: action ==="add" ? createClientId() : data?.id || createClientId(),
          subjectName,
          teacherCode,
          title,
          categoryId: formData.categoryId || null,
          gradeSemester: String(formData.gradeSemester ||"").trim(),
          objectives: String(formData.objectives ||"").trim(),
          materials: String(formData.materials ||"").trim(),
          notes: String(formData.notes ||"").trim()
        };
        if (action ==="add") {
          addSyllabus(nextItem);
          setSelectedSilabusSubject(subjectName);
          setSelectedSilabusId(nextItem.id);
          if (currentUser?.role ==="guru") {
            setSelectedTeacherSilabusSubject(subjectName);
            setSelectedTeacherSilabusId(nextItem.id);
          }
          addActivityLog({
            type:"silabus",
            title:"Silabus baru ditambahkan",
            detail: `${subjectName} - ${title}`
          });
        } else {
          if (!syllabuses.some(item => item.id === nextItem.id)) {
            showNotification("Data silabus tidak ditemukan. Tutup modal lalu buka ulang silabus.","warning");
            return;
          }
          updateSyllabus(nextItem.id, nextItem);
          setSelectedSilabusSubject(subjectName);
          setSelectedSilabusId(nextItem.id);
          if (currentUser?.role ==="guru") {
            setSelectedTeacherSilabusSubject(subjectName);
            setSelectedTeacherSilabusId(nextItem.id);
          }
          addActivityLog({
            type:"silabus",
            title:"Silabus diperbarui",
            detail: `${subjectName} - ${title}`
          });
        }
        showNotification(`Silabus berhasil di${action ==="add" ?"tambah" :"perbarui"}.`,"success");
      } else if (type ==="waktu") {
        const nextLabel = String(formData.label ||"").trim();
        if (!nextLabel) {
          showNotification("Rentang waktu wajib diisi.","warning");
          return;
        }
        const currentDaySlots = [...(timeSlots[selectedDaySetting] || [])];
        if (action ==="add") currentDaySlots.push({
          id: `${selectedDaySetting}-${currentDaySlots.length + 1}`,
          label: nextLabel,
          isBreak: formData.isBreak,
          labelBreak: formData.labelBreak,
          jpCount: formData.isBreak ? 0 : formData.jpCount || 1,
          minsPerJp: formData.minsPerJp || 45
        });
        if (action ==="edit") {
          const idx = currentDaySlots.findIndex(t => t.id === data.id);
          if (idx === -1) {
            showNotification("Sesi waktu tidak ditemukan. Tutup modal lalu buka ulang pengaturan waktu.","warning");
            return;
          }
          currentDaySlots[idx] = {
            ...currentDaySlots[idx],
            label: nextLabel,
            isBreak: formData.isBreak,
            labelBreak: formData.labelBreak,
            jpCount: formData.isBreak ? 0 : formData.jpCount || 1,
            minsPerJp: formData.minsPerJp || 45
          };
        }
        currentDaySlots.sort((a, b) => {
          const parseTime = str => {
            const t = String(str ||"").split("-")[0].trim().replace(".",":");
            const parts = t.split(":");
            const mins = parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
            return isNaN(mins) ? 9999 : mins;
          };
          return parseTime(a.label) - parseTime(b.label);
        });
        setTimeSlots(prev => ({
          ...prev,
          [selectedDaySetting]: currentDaySlots
        }));
        showNotification(`Sesi waktu berhasil di${action ==="add" ?"tambah" :"perbarui"}.`,"success");
      } else if (type ==="copy_waktu") {
        if (!formData.sourceDay) {
          showNotification("Pilih hari sumber yang ingin disalin.","warning");
          return;
        }
        const sourceSlots = timeSlots[formData.sourceDay] || [];
        const newSlots = sourceSlots.map((slot, index) => ({
          ...slot,
          id: `${selectedDaySetting}-${Date.now()}-${index}`
        }));
        setTimeSlots(prev => ({
          ...prev,
          [selectedDaySetting]: newSlots
        }));
        showNotification(`Sesi belajar dari hari ${formData.sourceDay} berhasil disalin ke ${selectedDaySetting}.`);
      } else {
        showNotification("Jenis data belum didukung untuk disimpan. Tutup modal lalu coba lagi.","error");
        return;
      }
      closeModal();
    } catch (error) {
      console.error("Gagal menyimpan data modal", error);
      if (error?.status === 403) {
        writeSessionUser(null);
        setCurrentUser(null);
        setLoginError("Sesi admin kedaluwarsa. Silakan login ulang sebelum menyimpan data.");
      }
      showNotification(error?.message ||"Terjadi kesalahan saat menyimpan data.","error");
    } finally {
      setIsSavingModal(false);
    }
  };
  const handleDelete = (type, idOrCode) => {
    if (["kelas","jurusan","guru","karyawan","Karyawan","staff","siswa","mapel","ruangan","beban"].includes(type)) {
      handleBulkDelete(type, [idOrCode]);
      return;
    }
    if (type ==="waktu") {
      setTimeSlots(prev => ({
        ...prev,
        [selectedDaySetting]: (prev[selectedDaySetting] || []).filter(t => t.id !== idOrCode)
      }));
      showNotification("Sesi waktu berhasil dihapus.","success");
    }
    if (type ==="hari") {
      const nextDays = days.filter(d => d !== idOrCode);
      setDays(nextDays);
      setSchedule(prev => prev.filter(item => item.day !== idOrCode));
      setTeacherAvailability(prev => {
        const next = {
          ...prev
        };
        Object.keys(next).forEach(code => {
          const entry = next[code] || {
            days: [],
            subjects: []
          };
          next[code] = {
            ...entry,
            days: (entry.days || []).filter(day => day !== idOrCode)
          };
        });
        return next;
      });
      setTimeSlots(prev => {
        const next = {
          ...prev
        };
        delete next[idOrCode];
        return next;
      });
      setLayoutByDay(prev => {
        const next = {
          ...prev
        };
        delete next[idOrCode];
        return next;
      });
      if (selectedDaySetting === idOrCode) setSelectedDaySetting(nextDays[0] ||"");
      showNotification(`Hari ${idOrCode} berhasil dihapus.`,"success");
    }
  };
  const handleToggleDashboardMessageSafe = (id, isActive) => {
    if (!ensureDatabaseReadyForWrite("mengubah pesan dashboard")) return;
    if (!dashboardMessages.some(message => message.id === id)) {
      showNotification("Pesan dashboard tidak ditemukan atau sudah terhapus.","warning");
      return;
    }
    updateDashboardMessage(id, {
      isActive
    });
    const nextMsgs = dashboardMessages.map(m => m.id === id ? { ...m, isActive } : m);
    if (saveDatabaseNow) saveDatabaseNow({ dashboardMessages: nextMsgs }, "mengubah status pesan dashboard");
    showNotification(isActive ?"Pesan dashboard diaktifkan." :"Pesan dashboard dinonaktifkan.","success");
  };
  const handleRemoveDashboardMessageSafe = id => {
    if (!ensureDatabaseReadyForWrite("menghapus pesan dashboard")) return;
    if (!dashboardMessages.some(message => message.id === id)) {
      showNotification("Pesan dashboard tidak ditemukan atau sudah terhapus.","warning");
      return;
    }
    removeDashboardMessage(id);
    const nextMsgs = dashboardMessages.filter(m => m.id !== id);
    if (saveDatabaseNow) saveDatabaseNow({ dashboardMessages: nextMsgs }, "menghapus pesan dashboard");
    showNotification("Pesan dashboard berhasil dihapus.","success");
  };
  const handleRemoveAttendanceRecordSafe = id => {
    if (!ensureDatabaseReadyForWrite("menghapus rekam absensi")) return;
    if (!attendanceRecords.some(record => record.id === id)) {
      showNotification("Rekam absensi tidak ditemukan atau sudah terhapus.","warning");
      return;
    }
    removeAttendanceRecord(id);
    showNotification("Rekam absensi berhasil dihapus.","success");
  };
  const handleRemoveCalendarEventSafe = id => {
    if (!ensureDatabaseReadyForWrite("menghapus agenda kalender")) return;
    if (!academicCalendar.some(event => event.id === id)) {
      showNotification("Agenda kalender tidak ditemukan atau sudah terhapus.","warning");
      return;
    }
    removeCalendarEvent(id);
    showNotification("Agenda kalender berhasil dihapus.","success");
  };
  const handleRemoveCalendarCategorySafe = id => {
    if (!ensureDatabaseReadyForWrite("menghapus kategori kalender")) return;
    if (!calendarCategories.some(category => category.id === id)) {
      showNotification("Kategori kalender tidak ditemukan atau sudah terhapus.","warning");
      return;
    }
    removeCalendarCategory(id);
    showNotification("Kategori kalender berhasil dihapus.","success");
  };
  const handleRemoveSyllabusCategorySafe = id => {
    if (!ensureDatabaseReadyForWrite("menghapus kategori modul")) return;
    if (!syllabusCategories.some(category => category.id === id)) {
      showNotification("Kategori silabus tidak ditemukan atau sudah terhapus.","warning");
      return;
    }
    removeSyllabusCategory(id);
    showNotification("Kategori silabus berhasil dihapus.","success");
  };
  const handleRemoveSyllabusSafe = (id, item = null) => {
    if (!ensureDatabaseReadyForWrite("menghapus silabus")) return;
    if (!syllabuses.some(item => item.id === id)) {
      showNotification("Data silabus tidak ditemukan atau sudah terhapus.","warning");
      return;
    }
    removeSyllabus(id);
    if (item) {
      addActivityLog({
        type:"silabus",
        title:"Silabus dihapus",
        detail: `${item.subjectName ||"Mapel"} - ${item.title ||"Tanpa judul"}`
      });
    }
    showNotification("Silabus berhasil dihapus.","success");
  };

  return {
    openModal,
    handleBulkAddLoads,
        handleSyllabusBatchSave,
        closeModal,
    handleGenerateSlots,
        handleSave,
            handleDelete,
    handleToggleDashboardMessageSafe,
    handleRemoveDashboardMessageSafe,
    handleRemoveAttendanceRecordSafe,
    handleRemoveCalendarEventSafe,
    handleRemoveCalendarCategorySafe,
    handleRemoveSyllabusCategorySafe,
    handleRemoveSyllabusSafe
  };
}
