import { BULK_IMPORT_CONFIG, parseBulkTextRows, workbookSheetToDelimitedText } from'../../utils/bulkImport.js';
import { useAppStore } from'../../store/useAppStore.js';
import { sameText, normalizeText, getLoadKey, parsePositiveInt, serializeCsvList, parseCsvList, createClientId } from'../../utils/adminHelpers.js';

function sanitizeExcelString(str) {
  if (typeof str !== 'string') return str;
  // Remove control characters except tab, newline, and carriage return
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

export function useAdminImportExport(props) {
  const { academicCalendar } = useAppStore();

  const { 
    matchesGradeTarget, getRoomName, updateSelectionForTab, normalizeUserRole, isSuperAdminRole, csvValueMatches, csvIncludesText, parseTeacherCodes, getCappedClassCount, getCalendarCategoryIdByLabel, getClassKey, getRoomKey, getTeacherKey, getSubjectKey, hashPassword, syncAuthSnapshotSafe, 
    normalizeCalendarDateInput, formatCalendarDateRange, 
    adminUser,
    showNotification,
    majors,
    classes,
    teachers,
    subjects,
    rooms,
    scheduleCellMap,
    timeSlots,
    days,
    activeTab,
    setBulkImportPreview,
    bulkImportPreview,
    closeModal,
    setMajors, setClasses, setRooms, setTeachers, setSubjects,
    setTeachingLoads, setDays, setTimeSlots, setTeacherAvailability,
    setCalendarCategories, setAcademicCalendar,
    staffs, setStaffs, students, setStudents,
    currentUser, databaseHydrated, databaseHydrationFailedRef,
    getTeacherName, syllabuses, setSyllabuses, syllabusCategories, setSyllabusCategories,
    attendanceRecords, setAttendanceRecords,
    appSettings,
    calendarCategories,
    setBulkText,
    handleBulkTextChange,
    openAcademicCalendarGuide,
    openTeacherGuide,
    openImportGuide,
    setIsImportGuideOpen,
    fileInputRef,
    bulkText,
    downloadAcademicCalendarTemplate,
    downloadTeacherTemplate,
    teachingLoads,
    teacherAvailability,
    schedule,
    setSchedule
  } = props || {};

  const resolveTeacher = (input) => {
    if (!input && input !== 0) return "";
    const raw = String(input).trim();
    if (!raw) return "";
    const byCode = (teachers || []).find(t => String(t.code || '').trim().toLowerCase() === raw.toLowerCase());
    if (byCode) return byCode.code;
    const byName = (teachers || []).find(t => String(t.name || '').trim().toLowerCase() === raw.toLowerCase());
    if (byName) return byName.code;
    const codeCandidate = raw.split(/[-|:–]/)[0].trim();
    const bySplit = (teachers || []).find(t => String(t.code || '').trim().toLowerCase() === codeCandidate.toLowerCase());
    if (bySplit) return bySplit.code;
    const byNameFuzzy = (teachers || []).find(t => String(t.name || '').toLowerCase().includes(raw.toLowerCase()) || raw.toLowerCase().includes(String(t.name || '').toLowerCase()));
    if (byNameFuzzy) return byNameFuzzy.code;
    return raw;
  };

  const resolveSubject = (input) => {
    if (!input) return "";
    const raw = String(input).trim();
    if (!raw) return "";
    const exact = (subjects || []).find(s => String(s.name || '').trim().toLowerCase() === raw.toLowerCase() || String(s.code || '').trim().toLowerCase() === raw.toLowerCase());
    if (exact) return exact.name;
    const commonMap = {
      "mtk": "Matematika",
      "mat": "Matematika",
      "matematika": "Matematika",
      "indo": "Bahasa Indonesia",
      "bind": "Bahasa Indonesia",
      "bindo": "Bahasa Indonesia",
      "b.indo": "Bahasa Indonesia",
      "b. ind": "Bahasa Indonesia",
      "bahasaindonesia": "Bahasa Indonesia",
      "ing": "Bahasa Inggris",
      "bing": "Bahasa Inggris",
      "binggris": "Bahasa Inggris",
      "b.ing": "Bahasa Inggris",
      "b. ing": "Bahasa Inggris",
      "bahasainggris": "Bahasa Inggris",
      "pabp": "Pendidikan Agama dan Budi Pekerti",
      "pai": "Pendidikan Agama Islam",
      "agama": "Pendidikan Agama dan Budi Pekerti",
      "pjok": "Pendidikan Jasmani, Olahraga, dan Kesehatan",
      "penjas": "Pendidikan Jasmani, Olahraga, dan Kesehatan",
      "penjaskes": "Pendidikan Jasmani, Olahraga, dan Kesehatan",
      "olahraga": "Pendidikan Jasmani, Olahraga, dan Kesehatan",
      "pkn": "Pendidikan Pancasila dan Kewarganegaraan",
      "ppkn": "Pendidikan Pancasila dan Kewarganegaraan",
      "pancasila": "Pendidikan Pancasila",
      "sej": "Sejarah",
      "sejarah": "Sejarah",
      "sbk": "Seni Budaya",
      "seni": "Seni Budaya",
      "senibudaya": "Seni Budaya",
      "ipa": "Ilmu Pengetahuan Alam",
      "ips": "Ilmu Pengetahuan Sosial",
      "kjd": "Komputer dan Jaringan Dasar",
      "pkk": "Produk Kreatif dan Kewirausahaan",
      "kwu": "Kewirausahaan",
      "bk": "Bimbingan Konseling",
      "simdig": "Simulasi Digital",
      "fis": "Fisika",
      "fisika": "Fisika",
      "kim": "Kimia",
      "kimia": "Kimia",
      "bio": "Biologi",
      "biologi": "Biologi"
    };
    const cleanKey = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    const mappedName = commonMap[cleanKey] || commonMap[raw.toLowerCase()];
    if (mappedName) {
      const foundMapped = (subjects || []).find(s => s.name?.toLowerCase().includes(mappedName.toLowerCase()) || mappedName.toLowerCase().includes(s.name?.toLowerCase()));
      if (foundMapped) return foundMapped.name;
      return mappedName;
    }
    const partial = (subjects || []).find(s => s.name?.toLowerCase().includes(raw.toLowerCase()) || raw.toLowerCase().includes(s.name?.toLowerCase()));
    if (partial) return partial.name;
    return raw;
  };

  const resolveClass = (input) => {
    if (!input) return "";
    const raw = String(input).trim();
    if (!raw) return "";
    const exact = (classes || []).find(c => String(c.name || '').trim().toLowerCase() === raw.toLowerCase());
    if (exact) return exact.name;
    const compact = (classes || []).find(c => String(c.name || '').replace(/\s+/g, '').toLowerCase() === raw.replace(/\s+/g, '').toLowerCase());
    if (compact) return compact.name;
    return raw;
  };

  const resolveDay = (input) => {
    if (!input) return days?.[0] || "Senin";
    const raw = String(input).trim().toLowerCase();
    const matched = (days || []).find(d => d.toLowerCase() === raw || d.toLowerCase().startsWith(raw.slice(0, 3)));
    return matched || String(input).trim();
  };

  const resolveSlots = (input, dayName) => {
    const daySlots = (timeSlots && timeSlots[dayName]) || [];
    const raw = String(input || '').trim();
    if (!raw) return [];
    
    if (raw.includes('-') || raw.includes('–')) {
      const parts = raw.split(/[-–]/).map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
      if (parts.length === 2 && parts[0] <= parts[1]) {
        const res = [];
        for (let i = parts[0]; i <= parts[1]; i++) {
          const slotObj = daySlots[i - 1] || daySlots.find(s => String(s.id) === String(i));
          res.push(slotObj ? slotObj.id : String(i));
        }
        return res;
      }
    }
    if (raw.includes(',')) {
      const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
      const res = [];
      parts.forEach(p => {
        const n = parseInt(p, 10);
        if (!isNaN(n)) {
          const slotObj = daySlots[n - 1] || daySlots.find(s => String(s.id) === String(n));
          res.push(slotObj ? slotObj.id : String(n));
        } else {
          res.push(p);
        }
      });
      return res;
    }
    
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0) {
      const slotObj = daySlots[num - 1] || daySlots.find(s => String(s.id) === String(num));
      return [slotObj ? slotObj.id : String(num)];
    }
    
    const byId = daySlots.find(s => String(s.id).toLowerCase() === raw.toLowerCase() || String(s.label || '').toLowerCase().includes(raw.toLowerCase()));
    if (byId) return [byId.id];
    return [raw];
  };

  const resolveRoom = (input) => {
    if (!input) return "";
    const raw = String(input).trim();
    if (!raw) return "";
    const exact = (rooms || []).find(r => String(r.id || '').trim().toLowerCase() === raw.toLowerCase() || String(r.name || '').trim().toLowerCase() === raw.toLowerCase());
    if (exact) return exact.id;
    return raw;
  };

  const downloadScheduleTemplate = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");
    const wb = new ExcelJS.Workbook();

    const styleHeaderRow = (ws) => {
      const row = ws.getRow(1);
      row.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      row.height = 28;
    };

    // Sheet 1: 16_Jadwal (Data Jadwal Pelajaran)
    const wsJadwal = wb.addWorksheet("16_Jadwal");
    wsJadwal.addRow([
      "HARI (Wajib: Senin/Selasa/dst)",
      "JAM KE / SLOT (Wajib: 1, 2, atau 1-2)",
      "KELAS (Wajib)",
      "KODE / NAMA GURU (Wajib: misal 1 atau G01)",
      "MATA PELAJARAN (Wajib: misal MTK / Matematika)",
      "RUANGAN (Opsional)"
    ]);
    styleHeaderRow(wsJadwal);

    if (schedule && schedule.length > 0) {
      schedule.forEach(item => {
        wsJadwal.addRow([
          item.day || '',
          item.slotId || '',
          item.className || '',
          item.teacherCode || '',
          item.subject || '',
          item.roomId || ''
        ]);
      });
    } else {
      const sampleDay = days?.[0] || "Senin";
      const sampleClass = classes?.[0]?.name || "X TKJ 1";
      const sampleTeacher = teachers?.[0]?.code || "1";
      const sampleSubject = subjects?.[0]?.name || "MTK";
      const sampleRoom = rooms?.[0]?.id || "R01";
      wsJadwal.addRow([sampleDay, "1", sampleClass, sampleTeacher, sampleSubject, sampleRoom]);
      wsJadwal.addRow([sampleDay, "2", sampleClass, sampleTeacher, sampleSubject, sampleRoom]);
    }
    [28, 32, 25, 34, 40, 25].forEach((w, i) => { wsJadwal.getColumn(i + 1).width = w; });

    // Sheet 2: Referensi_Guru
    const wsRefGuru = wb.addWorksheet("Referensi_Guru");
    wsRefGuru.addRow(["KODE GURU", "NAMA LENGKAP GURU"]);
    styleHeaderRow(wsRefGuru);
    (teachers || []).forEach(t => wsRefGuru.addRow([t.code || '', t.name || '']));
    [20, 45].forEach((w, i) => { wsRefGuru.getColumn(i + 1).width = w; });

    // Sheet 3: Referensi_Mapel
    const wsRefMapel = wb.addWorksheet("Referensi_Mapel");
    wsRefMapel.addRow(["NAMA MATA PELAJARAN", "SINGKATAN / KODE"]);
    styleHeaderRow(wsRefMapel);
    (subjects || []).forEach(s => wsRefMapel.addRow([s.name || '', s.code || '']));
    [45, 25].forEach((w, i) => { wsRefMapel.getColumn(i + 1).width = w; });

    // Sheet 4: Referensi_Kelas
    const wsRefKelas = wb.addWorksheet("Referensi_Kelas");
    wsRefKelas.addRow(["NAMA KELAS", "JURUSAN"]);
    styleHeaderRow(wsRefKelas);
    (classes || []).forEach(c => wsRefKelas.addRow([c.name || '', c.major || '']));
    [30, 35].forEach((w, i) => { wsRefKelas.getColumn(i + 1).width = w; });

    // Sheet 5: Referensi_Waktu
    const wsRefWaktu = wb.addWorksheet("Referensi_Waktu");
    wsRefWaktu.addRow(["HARI", "JAM KE (ID SLOT)", "WAKTU", "KETERANGAN"]);
    styleHeaderRow(wsRefWaktu);
    Object.entries(timeSlots || {}).forEach(([dayName, slots]) => {
      (slots || []).forEach((slot, idx) => {
        wsRefWaktu.addRow([
          dayName,
          slot.id || (idx + 1),
          slot.label || '',
          slot.isBreak ? 'Istirahat' : 'KBM'
        ]);
      });
    });
    [20, 20, 25, 20].forEach((w, i) => { wsRefWaktu.getColumn(i + 1).width = w; });

    const tgl = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `Template_Jadwal_Pelajaran_${appSettings?.appName || 'TimeSchedule'}_${tgl}.xlsx`);
    showNotification("Template Jadwal Pelajaran berhasil diunduh.", "success");
  };

  const downloadMasterTemplate = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");
    const wb = new ExcelJS.Workbook();

    // Helper: style header row (baris pertama) setiap sheet
    const styleHeaderRow = (ws) => {
      const row = ws.getRow(1);
      row.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      row.height = 28;
    };

    // 0_Panduan_Singkat
    const wsPanduan = wb.addWorksheet("0_Panduan_Singkat");
    [
      ["PANDUAN PENGISIAN MASTER DATA — File ini sudah terisi data aktual sistem"],
      [""],
      ["PETUNJUK UMUM:"],
      ["1. File ini sudah PRE-FILLED dengan data yang ada di sistem. Anda cukup EDIT / TAMBAH / HAPUS baris sesuai kebutuhan."],
      ["2. DILARANG MENGUBAH / MENGHAPUS NAMA BARIS PERTAMA (HEADER, warna hijau) pada setiap sheet."],
      ["3. Kolom dengan tulisan (Wajib) HARUS diisi, sisanya bersifat opsional."],
      ["4. Simpan file ini selalu dalam format .xlsx atau .xls"],
      ["5. Untuk nomor HP atau angka diawali 0, tambahkan tanda petik tunggal di depannya (contoh: '081234567890)"],
      [""],
      ["DETAIL SHEET:"],
      ["- Sheet 1_Jurusan        : Data jurusan aktif."],
      ["- Sheet 2_Kelas          : Data kelas aktif. Pastikan nama jurusan sama persis dengan Sheet 1."],
      ["- Sheet 3_Guru           : Data guru aktif. Kolom Password dikosongkan untuk keamanan."],
      ["- Sheet 4_Mapel          : Data mata pelajaran aktif."],
      ["- Sheet 5_Ruangan        : Data ruangan aktif."],
      ["- Sheet 6_Beban          : Data beban mengajar guru aktif."],
      ["- Sheet 7_Modul          : Data modul/silabus guru."],
      ["- Sheet 8_Waktu          : Data slot waktu pembelajaran."],
      ["- Sheet 9_Ketersediaan   : Data ketersediaan hari mengajar guru."],
      ["- Sheet 10_Kalender      : Data kalender akademik aktif."],
      ["- Sheet 11_Kat_Kalender  : Kategori kalender akademik."],
      ["- Sheet 12_Kat_Modul     : Kategori modul/silabus."],
      ["- Sheet 13_Absensi_Guru  : Data absensi guru (read-only, tidak bisa diimpor)."],
      ["- Sheet 14_Karyawan      : Data karyawan/staf aktif."],
      ["- Sheet 15_Siswa         : Data siswa aktif."],
      ["- Sheet 16_Jadwal        : Data jadwal pelajaran aktif (Hari, Jam, Kelas, Guru, Mapel, Ruang)."],
    ].forEach(row => wsPanduan.addRow(row));
    wsPanduan.getColumn(1).width = 120;

    // 1_Jurusan — data aktual
    const wsJurusan = wb.addWorksheet("1_Jurusan");
    wsJurusan.addRow(["NAMA JURUSAN (Wajib)"]);
    styleHeaderRow(wsJurusan);
    (majors || []).forEach(m => wsJurusan.addRow([typeof m === 'string' ? m : (m.name || '')]));
    wsJurusan.getColumn(1).width = 45;

    // 2_Kelas — data aktual
    const wsKelas = wb.addWorksheet("2_Kelas");
    wsKelas.addRow(["NAMA KELAS (Wajib)", "JURUSAN (Wajib - Sama dgn Sheet 1)", "WALI KELAS (Opsional)"]);
    styleHeaderRow(wsKelas);
    (classes || []).forEach(c => wsKelas.addRow([c.name || '', c.major || '', c.homeroom || '']));
    [30, 40, 35].forEach((w, i) => { wsKelas.getColumn(i + 1).width = w; });

    // 3_Guru — data aktual (password dikosongkan untuk keamanan)
    const wsGuru = wb.addWorksheet("3_Guru");
    wsGuru.addRow(["KODE GURU (Wajib)", "NAMA GURU (Wajib)", "PASSWORD (Kosong = Tidak Berubah)", "KATEGORI (Umum/Jurusan/Campuran)", "PRIORITAS JURUSAN", "PRIORITAS TINGKAT", "TARGET JP/MINGGU"]);
    styleHeaderRow(wsGuru);
    (teachers || []).forEach(t => wsGuru.addRow([
      t.code || '', sanitizeExcelString(t.name || ''), '', // password selalu dikosongkan
      t.type || 'Umum', t.preferredMajor || 'Semua', t.preferredGrade || 'Semua',
      t.targetWeeklyJp || ''
    ]));
    [20, 40, 30, 35, 25, 25, 20].forEach((w, i) => { wsGuru.getColumn(i + 1).width = w; });

    // 4_Mapel — data aktual
    const wsMapel = wb.addWorksheet("4_Mapel");
    wsMapel.addRow(["NAMA MAPEL (Wajib)", "GRADE (X/XI/XII/Semua)", "JURUSAN (Semua/Jurusan Spesifik)", "PRAKTIK? (Ya/Tidak)", "RUANGAN PRAKTIK (Bila Praktik)", "DURASI (JP)"]);
    styleHeaderRow(wsMapel);
    (subjects || []).forEach(s => wsMapel.addRow([
      sanitizeExcelString(s.name || ''), s.grade || 'Semua', s.major || 'Semua',
      s.isBlock ? 'Ya' : 'Tidak', s.practiceRoomIds || '', s.defaultDuration || 2
    ]));
    [40, 25, 40, 20, 35, 15].forEach((w, i) => { wsMapel.getColumn(i + 1).width = w; });

    // 5_Ruangan — data aktual
    const wsRuangan = wb.addWorksheet("5_Ruangan");
    wsRuangan.addRow(["ID RUANG (Wajib)", "NAMA RUANGAN (Wajib)", "TIPE (Teori/Praktik)", "JURUSAN (Semua/Jurusan Spesifik)", "TARGET TINGKAT (Semua/X/XI/XII)", "PRIORITAS (Ya/Tidak)"]);
    styleHeaderRow(wsRuangan);
    (rooms || []).forEach(r => wsRuangan.addRow([
      r.id || '', sanitizeExcelString(r.name || ''), r.type || 'Teori',
      r.major || 'Semua', r.targetGrade || 'Semua', r.isPriority ? 'Ya' : 'Tidak'
    ]));
    [20, 40, 25, 40, 35, 20].forEach((w, i) => { wsRuangan.getColumn(i + 1).width = w; });

    // 6_Beban — data aktual
    const wsBeban = wb.addWorksheet("6_Beban");
    wsBeban.addRow(["KODE GURU (Wajib)", "NAMA MAPEL (Wajib)", "TARGET GRADE (Semua/X/XI/XII)", "TARGET JURUSAN (Semua/Spesifik)", "DURASI", "MAKS KELAS (Opsional)"]);
    styleHeaderRow(wsBeban);
    (teachingLoads || []).forEach(b => wsBeban.addRow([
      b.teacherCode || '', sanitizeExcelString(b.subject || ''), b.targetGrade || 'Semua',
      b.targetMajor || 'Semua', b.duration || 2, b.maxClasses || ''
    ]));
    [20, 40, 35, 40, 15, 25].forEach((w, i) => { wsBeban.getColumn(i + 1).width = w; });

    // 7_Modul — data aktual
    const wsSilabus = wb.addWorksheet("7_Modul");
    wsSilabus.addRow(["MATA PELAJARAN (Wajib)", "GURU PENGAJAR (Wajib)", "JUDUL PERTEMUAN (Wajib)", "KELAS / SEMESTER", "TUJUAN PEMBELAJARAN", "MATERI PEMBELAJARAN", "CATATAN / KETERANGAN"]);
    styleHeaderRow(wsSilabus);
    (syllabuses || []).forEach(s => wsSilabus.addRow([
      sanitizeExcelString(s.subjectName || ''), sanitizeExcelString(s.teacherCode || ''),
      sanitizeExcelString(s.title || ''), s.gradeSemester || '',
      sanitizeExcelString(s.objectives || ''), sanitizeExcelString(s.materials || ''),
      sanitizeExcelString(s.notes || '')
    ]));
    [30, 25, 45, 25, 50, 50, 30].forEach((w, i) => { wsSilabus.getColumn(i + 1).width = w; });

    // 8_Waktu — data aktual
    const wsWaktu = wb.addWorksheet("8_Waktu");
    wsWaktu.addRow(["HARI (Wajib)", "WAKTU (Wajib)", "APAKAH ISTIRAHAT? (Ya/Tidak)", "NAMA KEGIATAN", "JUMLAH JP"]);
    styleHeaderRow(wsWaktu);
    Object.entries(timeSlots || {}).forEach(([dayName, slots]) => {
      (slots || []).forEach(slot => wsWaktu.addRow([
        dayName, slot.label || '', slot.isBreak ? 'Ya' : 'Tidak',
        slot.isBreak ? (slot.labelBreak || slot.label || '') : '', slot.isBreak ? '' : (slot.jpCount || 1)
      ]));
    });
    [20, 25, 30, 30, 20].forEach((w, i) => { wsWaktu.getColumn(i + 1).width = w; });

    // 9_Ketersediaan — data aktual
    const wsKets = wb.addWorksheet("9_Ketersediaan");
    wsKets.addRow(["KODE GURU (Wajib)", "MAPEL KOMPETENSI", "HARI TERSEDIA"]);
    styleHeaderRow(wsKets);
    (teachers || []).forEach(t => {
      const avail = teacherAvailability?.[t.code] || { days: [], subjects: [] };
      wsKets.addRow([t.code || '', (avail.subjects || []).join(','), (avail.days || []).join(',')]);
    });
    [20, 40, 45].forEach((w, i) => { wsKets.getColumn(i + 1).width = w; });

    // 10_Kalender_Akademik — data aktual
    const wsAkademik = wb.addWorksheet("10_Kalender_Akademik");
    wsAkademik.addRow(["JUDUL KEGIATAN (Wajib)", "MULAI (YYYY-MM-DD)", "SELESAI (YYYY-MM-DD)", "KATEGORI (Wajib)", "DESKRIPSI / KETERANGAN"]);
    styleHeaderRow(wsAkademik);
    const calCatById2 = new Map((calendarCategories || []).map(cat => [cat.id, cat.name]));
    (academicCalendar || []).forEach(evt => wsAkademik.addRow([
      sanitizeExcelString(evt.title || ''), normalizeCalendarDateInput(evt.dateStart) || '',
      normalizeCalendarDateInput(evt.dateEnd || evt.dateStart) || '',
      calCatById2.get(evt.categoryId) || evt.categoryId || '',
      sanitizeExcelString(evt.description || '')
    ]));
    [35, 25, 25, 25, 45].forEach((w, i) => { wsAkademik.getColumn(i + 1).width = w; });

    // 11_Kategori_Kalender — data aktual
    const wsKatKal = wb.addWorksheet("11_Kategori_Kalender");
    wsKatKal.addRow(["NAMA KATEGORI (Wajib)", "WARNA (Hex Code Opsional)"]);
    styleHeaderRow(wsKatKal);
    (calendarCategories || []).forEach(cat => wsKatKal.addRow([cat.name || '', cat.color || '']));
    [30, 30].forEach((w, i) => { wsKatKal.getColumn(i + 1).width = w; });

    // 12_Kategori_Modul — data aktual
    const wsKatSil = wb.addWorksheet("12_Kategori_Modul");
    wsKatSil.addRow(["NAMA KATEGORI (Wajib)", "WARNA (Hex Code Opsional)"]);
    styleHeaderRow(wsKatSil);
    (syllabusCategories || []).forEach(cat => wsKatSil.addRow([cat.name || '', cat.color || '']));
    [30, 30].forEach((w, i) => { wsKatSil.getColumn(i + 1).width = w; });

    // 13_Absensi_Guru — data aktual (read-only, tidak bisa diimpor)
    const wsAbsensiT = wb.addWorksheet("13_Absensi_Guru");
    wsAbsensiT.addRow(["Tanggal", "Waktu", "Kode Guru", "Nama Guru", "Sesi", "Status", "Mode", "Catatan", "Lokasi (Lat, Lng)"]);
    styleHeaderRow(wsAbsensiT);
    (attendanceRecords || []).forEach(record => wsAbsensiT.addRow([
      record.date || '', record.time || '', record.teacherCode || '',
      sanitizeExcelString(getTeacherName(record.teacherCode) || ''),
      record.sessionName || '', record.status || '', record.mode || '',
      sanitizeExcelString(record.note || ''),
      record.location ? `${record.location.lat}, ${record.location.lng}` : ''
    ]));
    [14, 12, 14, 34, 20, 14, 12, 30, 24].forEach((w, i) => { wsAbsensiT.getColumn(i + 1).width = w; });

    // 14_Karyawan — data aktual
    const wsKaryawan = wb.addWorksheet("14_Karyawan");
    wsKaryawan.addRow(["KODE KARYAWAN (Wajib)", "NAMA KARYAWAN (Wajib)", "DIVISI / BAGIAN", "NO WHATSAPP"]);
    styleHeaderRow(wsKaryawan);
    (staffs || []).forEach(k => wsKaryawan.addRow([
      k.code || '', sanitizeExcelString(k.name || ''),
      sanitizeExcelString(k.division || ''), k.phone ? `'${k.phone}` : ''
    ]));
    [25, 40, 25, 25].forEach((w, i) => { wsKaryawan.getColumn(i + 1).width = w; });

    // 15_Siswa — data aktual
    const wsSiswa = wb.addWorksheet("15_Siswa");
    wsSiswa.addRow(["NIS / NISN (Wajib)", "NAMA SISWA (Wajib)", "KELAS (Sesuai Data Kelas)", "JENIS KELAMIN (L/P)", "NO WHATSAPP ORTU"]);
    styleHeaderRow(wsSiswa);
    (students || []).forEach(s => {
      const hp = s.wa_ortu || s.phone || '';
      wsSiswa.addRow([
        s.nis || s.code || '', sanitizeExcelString(s.name || s.nama || ''),
        sanitizeExcelString(s.class_name || s.kelas || ''),
        s.gender || '', hp ? `'${hp}` : ''
      ]);
    });
    [25, 45, 35, 25, 25].forEach((w, i) => { wsSiswa.getColumn(i + 1).width = w; });

    // 16_Jadwal — data aktual
    const wsJadwal = wb.addWorksheet("16_Jadwal");
    wsJadwal.addRow([
      "HARI (Wajib: Senin/Selasa/dst)",
      "JAM KE / SLOT (Wajib: 1, 2, atau 1-2)",
      "KELAS (Wajib)",
      "KODE / NAMA GURU (Wajib)",
      "MATA PELAJARAN (Wajib)",
      "RUANGAN (Opsional)"
    ]);
    styleHeaderRow(wsJadwal);
    if (schedule && schedule.length > 0) {
      schedule.forEach(item => {
        wsJadwal.addRow([
          item.day || '',
          item.slotId || '',
          item.className || '',
          item.teacherCode || '',
          item.subject || '',
          item.roomId || ''
        ]);
      });
    } else {
      const sampleDay = days?.[0] || "Senin";
      const sampleClass = classes?.[0]?.name || "X TKJ 1";
      const sampleTeacher = teachers?.[0]?.code || "1";
      const sampleSubject = subjects?.[0]?.name || "MTK";
      const sampleRoom = rooms?.[0]?.id || "R01";
      wsJadwal.addRow([sampleDay, "1", sampleClass, sampleTeacher, sampleSubject, sampleRoom]);
      wsJadwal.addRow([sampleDay, "2", sampleClass, sampleTeacher, sampleSubject, sampleRoom]);
    }
    [28, 32, 25, 34, 40, 25].forEach((w, i) => { wsJadwal.getColumn(i + 1).width = w; });

    const tgl = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `Template_Data_${appSettings.appName || 'TimeSchedule'}_${tgl}.xlsx`);
    const siswaCount = (students || []).length;
    const guruCount = (teachers || []).length;
    const karyawanCount = (staffs || []).length;
    const jadwalCount = (schedule || []).length;
    showNotification(`Template berhasil diunduh — ${guruCount} guru, ${siswaCount} siswa, ${jadwalCount} slot jadwal.`, 'success');
  };



  async function exportAllDataToExcel() {
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");
    const wb = new ExcelJS.Workbook();

    const styleHeaderRow = (ws) => {
      const row = ws.getRow(1);
      row.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      row.height = 28;
    };

    const wsJurusan = wb.addWorksheet("1_Jurusan");
    const jurusanData = [["Nama Jurusan (wajib)"], ...majors.map(m => [m])];
    jurusanData.forEach(row => wsJurusan.addRow(row));
    styleHeaderRow(wsJurusan);
    var cols = [{ wch: 36 }];
    cols.forEach((col, idx) => { if(col.wch) wsJurusan.getColumn(idx + 1).width = col.wch; });
    const wsKelas = wb.addWorksheet("2_Kelas");
    const kelasData = [["Nama Kelas (wajib)","Jurusan (pilih dari Data Jurusan)","Wali Kelas"], ...classes.map(c => [c.name, c.major, c.homeroom ||""])];
    kelasData.forEach(row => wsKelas.addRow(row));
    styleHeaderRow(wsKelas);
    var cols = [{ wch: 34 }, { wch: 36 }, { wch: 34 }];
    cols.forEach((col, idx) => { if(col.wch) wsKelas.getColumn(idx + 1).width = col.wch; });
    const wsGuru = wb.addWorksheet("3_Guru");
    const guruData = [["Kode Guru (wajib)","Nama Guru (wajib)","Password","Kategori (Umum/Jurusan/Campuran)","Prioritas Jurusan","Prioritas Tingkat","Target JP/Minggu"], ...teachers.map(t => [t.code, sanitizeExcelString(t.name),"", t.type, t.preferredMajor, t.preferredGrade, t.targetWeeklyJp ||""])];
    guruData.forEach(row => wsGuru.addRow(row));
    styleHeaderRow(wsGuru);
    var cols = [{ wch: 20 }, { wch: 40 }, { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 20 }, { wch: 18 }];
    cols.forEach((col, idx) => { if(col.wch) wsGuru.getColumn(idx + 1).width = col.wch; });
    const wsMapel = wb.addWorksheet("4_Mapel");
    const mapelData = [["Nama Mapel (wajib)","Grade (X/XI/XII/Semua)","Jurusan (Umum/TKR/TKJ/RPL/Akuntansi)","Praktik? (Ya/Tidak)","Ruangan Praktik (ID dipisah koma)","Durasi"], ...subjects.map(s => [sanitizeExcelString(s.name), s.grade, s.major, s.isBlock ?"Ya" :"Tidak", s.practiceRoomIds ||"", s.defaultDuration])];
    mapelData.forEach(row => wsMapel.addRow(row));
    styleHeaderRow(wsMapel);
    var cols = [{ wch: 36 }, { wch: 26 }, { wch: 44 }, { wch: 20 }, { wch: 40 }, { wch: 10 }];
    cols.forEach((col, idx) => { if(col.wch) wsMapel.getColumn(idx + 1).width = col.wch; });
    const wsRuangan = wb.addWorksheet("5_Ruangan");
    const ruanganData = [["ID Ruang (wajib)","Nama Ruangan (wajib)","Tipe (Teori/Praktik)","Jurusan (All/TKR/TKJ/RPL/Akuntansi)","Target Tingkat (Semua/X/XI/XII)","Prioritas (Ya/Tidak)"], ...rooms.map(r => [r.id, sanitizeExcelString(r.name), r.type, r.major, r.targetGrade ||"Semua", r.isPriority ?"Ya" :"Tidak"])];
    ruanganData.forEach(row => wsRuangan.addRow(row));
    styleHeaderRow(wsRuangan);
    var cols = [{ wch: 20 }, { wch: 34 }, { wch: 22 }, { wch: 40 }, { wch: 28 }, { wch: 20 }];
    cols.forEach((col, idx) => { if(col.wch) wsRuangan.getColumn(idx + 1).width = col.wch; });
    const wsBeban = wb.addWorksheet("6_Beban");
    const bebanData = [["Kode Guru","Nama Mapel","Target Grade (All/X/XI/XII atau X,XI)","Target Jurusan (All/TKR/TKJ/RPL/Akuntansi)","Durasi","Maks Kelas (opsional)"], ...teachingLoads.map(b => [b.teacherCode, sanitizeExcelString(b.subject), b.targetGrade, b.targetMajor, b.duration, b.maxClasses ||""])];
    bebanData.forEach(row => wsBeban.addRow(row));
    styleHeaderRow(wsBeban);
    var cols = [{ wch: 18 }, { wch: 34 }, { wch: 40 }, { wch: 44 }, { wch: 10 }, { wch: 22 }];
    cols.forEach((col, idx) => { if(col.wch) wsBeban.getColumn(idx + 1).width = col.wch; });
    const wsSilabus = wb.addWorksheet("7_Modul");
    const silabusData = [["Mata Pelajaran (wajib)","Guru Pengajar (wajib)","Judul Pertemuan / BAB (wajib)","Kelas / Semester","Tujuan Pembelajaran","Materi Pembelajaran (pisah enter)","Catatan (opsional)"], ...syllabuses.map(s => [sanitizeExcelString(s.subjectName), sanitizeExcelString(s.teacherCode), sanitizeExcelString(s.title), s.gradeSemester ||"", sanitizeExcelString(s.objectives ||""), sanitizeExcelString(s.materials ||""), sanitizeExcelString(s.notes ||"")])];
    silabusData.forEach(row => wsSilabus.addRow(row));
    styleHeaderRow(wsSilabus);
    var cols = [{ wch: 25 }, { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 50 }, { wch: 50 }, { wch: 24 }];
    cols.forEach((col, idx) => { if(col.wch) wsSilabus.getColumn(idx + 1).width = col.wch; });
    const wsWaktu = wb.addWorksheet("8_Waktu");
    const waktuData = [["Hari","Waktu","Apakah Istirahat?","Nama Kegiatan / Istirahat","Jumlah JP","Menit per JP"], ...Object.entries(timeSlots || {}).flatMap(([dayName, slots]) => (slots || []).map(slot => [dayName, slot.label ||"", slot.isBreak ?"Ya" :"Tidak", slot.isBreak ? slot.labelBreak || slot.label ||"" :"", slot.isBreak ?"" : slot.jpCount || 1, slot.minsPerJp || 45]))];
    waktuData.forEach(row => wsWaktu.addRow(row));
    styleHeaderRow(wsWaktu);
    var cols = [{ wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 14 }];
    cols.forEach((col, idx) => { if(col.wch) wsWaktu.getColumn(idx + 1).width = col.wch; });
    const wsKetersediaan = wb.addWorksheet("9_Ketersediaan");
    const ketersediaanData = [["Kode Guru (wajib)","Mapel Kompetensi (pisahkan dengan koma)","Hari Tersedia (pisahkan dengan koma)"], ...teachers.map(t => {
      const avail = teacherAvailability[t.code] || { days: [], subjects: [] };
      return [t.code, avail.subjects.join(","), avail.days.join(",")];
    })];
    ketersediaanData.forEach(row => wsKetersediaan.addRow(row));
    styleHeaderRow(wsKetersediaan);
    var cols = [{ wch: 20 }, { wch: 50 }, { wch: 40 }];
    cols.forEach((col, idx) => { if(col.wch) wsKetersediaan.getColumn(idx + 1).width = col.wch; });
    const wsAkademik = wb.addWorksheet("10_Kalender_Akademik");
    const calendarCategoryById = new Map((calendarCategories || []).map(cat => [cat.id, cat.name]));
    const akademikData = [["Judul Kegiatan","Mulai","Selesai","Kategori","Keterangan"], ...(academicCalendar || []).map(evt => [sanitizeExcelString(evt.title ||""), normalizeCalendarDateInput(evt.dateStart) ||"", normalizeCalendarDateInput(evt.dateEnd || evt.dateStart) ||"", calendarCategoryById.get(evt.categoryId) || evt.categoryId ||"", sanitizeExcelString(evt.description ||"")])];
    akademikData.forEach(row => wsAkademik.addRow(row));
    styleHeaderRow(wsAkademik);
    var cols = [{ wch: 34 }, { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 48 }];
    cols.forEach((col, idx) => { if(col.wch) wsAkademik.getColumn(idx + 1).width = col.wch; });
    const wsKategoriKalender = wb.addWorksheet("11_Kategori_Kalender");
    const kategoriKalenderData = [["Nama Kategori","Warna"], ...(calendarCategories || []).map(cat => [cat.name ||"", cat.color ||"blue"])];
    kategoriKalenderData.forEach(row => wsKategoriKalender.addRow(row));
    styleHeaderRow(wsKategoriKalender);
    var cols = [{ wch: 30 }, { wch: 16 }];
    cols.forEach((col, idx) => { if(col.wch) wsKategoriKalender.getColumn(idx + 1).width = col.wch; });
    const wsKategoriSilabus = wb.addWorksheet("12_Kategori_Modul");
    const kategoriSilabusData = [["Nama Kategori","Warna"], ...(syllabusCategories || []).map(cat => [cat.name ||"", cat.color ||"blue"])];
    kategoriSilabusData.forEach(row => wsKategoriSilabus.addRow(row));
    styleHeaderRow(wsKategoriSilabus);
    var cols = [{ wch: 30 }, { wch: 16 }];
    cols.forEach((col, idx) => { if(col.wch) wsKategoriSilabus.getColumn(idx + 1).width = col.wch; });
    const wsAbsensi = wb.addWorksheet("13_Absensi_Guru");
    const absensiData = [["Tanggal","Waktu","Kode Guru","Nama Guru","Sesi","Status","Mode","Catatan","Lokasi (Lat, Lng)"], ...(attendanceRecords || []).map(record => [record.date ||"", record.time ||"", record.teacherCode ||"", sanitizeExcelString(getTeacherName(record.teacherCode)) ||"", record.sessionName ||"", record.status ||"", record.mode ||"", sanitizeExcelString(record.note) ||"", record.location ? `${record.location.lat}, ${record.location.lng}` :""])];
    absensiData.forEach(row => wsAbsensi.addRow(row));
    styleHeaderRow(wsAbsensi);
    var cols = [{ wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 34 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 24 }];
    cols.forEach((col, idx) => { if(col.wch) wsAbsensi.getColumn(idx + 1).width = col.wch; });

    const wsKaryawan = wb.addWorksheet("14_Karyawan");
    const karyawanData = [["KODE KARYAWAN (Wajib)","NAMA KARYAWAN (Wajib)","DIVISI / BAGIAN","NO WHATSAPP"], ...(staffs || []).map(k => [k.code ||"", sanitizeExcelString(k.name) ||"", sanitizeExcelString(k.division) ||"", k.phone ? `'${k.phone}` :""])];
    karyawanData.forEach(row => wsKaryawan.addRow(row));
    styleHeaderRow(wsKaryawan);
    var cols = [{ wch: 25 }, { wch: 40 }, { wch: 25 }, { wch: 25 }];
    cols.forEach((col, idx) => { if(col.wch) wsKaryawan.getColumn(idx + 1).width = col.wch; });

    const wsSiswa = wb.addWorksheet("15_Siswa");
    const siswaData = [["NIS / NISN (Wajib)","NAMA SISWA (Wajib)","KELAS (Sesuai Data Kelas)","JENIS KELAMIN (L/P)","NO WHATSAPP ORTU"], ...(students || []).map(s => {
      const hp = s.wa_ortu || s.phone ||"";
      return [s.nis || s.code ||"", sanitizeExcelString(s.name || s.nama) ||"", sanitizeExcelString(s.class_name || s.kelas) ||"", s.gender ||"", hp ? `'${hp}` :""];
    })];
    siswaData.forEach(row => wsSiswa.addRow(row));
    styleHeaderRow(wsSiswa);
    var cols = [{ wch: 25 }, { wch: 45 }, { wch: 35 }, { wch: 25 }, { wch: 25 }];
    cols.forEach((col, idx) => { if(col.wch) wsSiswa.getColumn(idx + 1).width = col.wch; });

    const wsJadwal = wb.addWorksheet("16_Jadwal");
    const jadwalData = [
      ["HARI (Wajib)", "JAM KE / SLOT (Wajib)", "KELAS (Wajib)", "KODE / NAMA GURU (Wajib)", "MATA PELAJARAN (Wajib)", "RUANGAN (Opsional)"],
      ...(schedule || []).map(item => [
        item.day || '', item.slotId || '', item.className || '', item.teacherCode || '', item.subject || '', item.roomId || ''
      ])
    ];
    jadwalData.forEach(row => wsJadwal.addRow(row));
    styleHeaderRow(wsJadwal);
    var cols = [{ wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 28 }, { wch: 35 }, { wch: 22 }];
    cols.forEach((col, idx) => { if(col.wch) wsJadwal.getColumn(idx + 1).width = col.wch; });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `Export Data ${appSettings.appName ||"TimeSchedule"}.xlsx`);
    showNotification("Data berhasil diekspor ke Excel.","success");
  }

  async function exportAbsensiGuruToExcel(recordsToExport = attendanceRecords) {
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");
    const wb = new ExcelJS.Workbook();
    const absensiData = [
      ["Tanggal", "Waktu", "Kode Guru", "Nama Guru", "Sesi", "Status", "Mode", "Catatan", "Lokasi (Lat, Lng)"],
      ...(recordsToExport || []).map(record => [
        record.date || "",
        record.time || "",
        record.teacherCode || "",
        getTeacherName(record.teacherCode) || "",
        record.sessionName || "",
        record.status || "",
        record.mode || "",
        record.note || "",
        record.location ? `${record.location.lat}, ${record.location.lng}` : ""
      ])
    ];
    const wsAbsensi = wb.addWorksheet("Laporan_Absensi_Guru");
    absensiData.forEach(row => wsAbsensi.addRow(row));
    var cols = [
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 34 },
      { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 24 }
    ];
    cols.forEach((col, idx) => { if(col.wch) wsAbsensi.getColumn(idx + 1).width = col.wch; });

    const tgl = new Date().toISOString().split('T')[0];
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `Laporan_Absensi_Guru_${tgl}.xlsx`);
    showNotification("Laporan Absensi berhasil diekspor ke Excel.", "success");
  }

  const handleFileUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext ==="xlsx" || ext ==="xls" || ext ==="xlsm") {
      const reader = new FileReader();
      reader.onload = async evt => {
        try {
          const ExcelJS = (await import("exceljs")).default;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(new Uint8Array(evt.target.result));
          const config = BULK_IMPORT_CONFIG[activeTab];
          let ws = null;
          if (config && config.sheet) {
            ws = workbook.getWorksheet(config.sheet);
            if (!ws && config.alternateSheets) {
              for (const alt of config.alternateSheets) {
                ws = workbook.getWorksheet(alt);
                if (ws) break;
              }
            }
          }
          if (!ws) {
            ws = workbook.worksheets[0];
          }
          if (!ws) throw new Error("Tidak ada sheet yang valid.");

          const rawData = [];
          ws.eachRow({ includeEmpty: true }, (row) => {
             const r = [];
             row.eachCell({ includeEmpty: true }, (cell) => r.push(cell.value ?? ''));
             rawData.push(r);
          });
          const text = rawData.map(r => r.join('\t')).join('\n');
          setBulkText(text);
          analyzeBulkData(text);
        } catch (err) {
          console.error(err);
          showNotification(err.message ||"Gagal membaca file Excel. Pastikan format valid.","error");
        }
      };
      reader.onerror = () => showNotification("File Excel gagal dibaca. Coba pilih ulang file atau periksa izin file.","error");
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = evt => {
        setBulkText(evt.target.result);
        analyzeBulkData(evt.target.result);
      };
      reader.onerror = () => showNotification("File gagal dibaca. Coba pilih ulang file atau periksa izin file.","error");
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value ="";
  };

  const handlePreviewImport = () => {
    if (!bulkText.trim()) {
      showNotification("Teks data masih kosong.","warning");
      return;
    }
    analyzeBulkData(bulkText);
  };

  const handleProcessImport = async () => {
    await handleBulkText();
  };

  

  const analyzeBulkData = text => {
    const importConfig = BULK_IMPORT_CONFIG[activeTab];
    if (!importConfig) {
      setBulkImportPreview({
        total: 0,
        valid: 0,
        skipped: 0,
        inserted: 0,
        updated: 0,
        samples: [],
        issues: ["Tab ini belum mendukung import massal."],
        reasons: {
          invalid: 0
        },
        type: activeTab
      });
      showNotification("Tab ini belum mendukung import massal.","warning");
      return;
    }
    const rows = parseBulkTextRows(text, activeTab);
    const summary = {
      total: rows.length,
      valid: 0,
      skipped: 0,
      inserted: 0,
      updated: 0,
      samples: [],
      issues: [],
      reasons: {
        invalid: 0
      },
      type: activeTab
    };
    const requiredColumns = importConfig.requiredColumns || 0;
    const pushSample = sample => {
      if (summary.samples.length < 5) summary.samples.push(sample);
    };
    const pushIssue = (lineNumber, reason, message) => {
      summary.skipped++;
      summary.reasons[reason] = (summary.reasons[reason] || 0) + 1;
      if (summary.issues.length < 5) summary.issues.push(`Baris ${lineNumber}: ${message}`);
    };
    if (activeTab ==="jurusan") {
      const existing = new Set(majors.map(normalizeText));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","nama jurusan kosong");
          return;
        }
        const name = String(row[0] ||"").trim();
        if (!name) {
          pushIssue(lineNumber,"invalid","nama jurusan kosong");
          return;
        }
        summary.valid++;
        const key = normalizeText(name);
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${name} (Sudah ada)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(name);
      });
    } else if (activeTab ==="kelas") {
      const existing = new Set(classes.map(getClassKey));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format kelas tidak lengkap");
          return;
        }
        const [nameRaw, majorRaw, homeroomRaw] = row;
        const name = String(nameRaw ||"").trim();
        const major = String(majorRaw ||"").trim();
        const homeroom = String(homeroomRaw ||"").trim();
        if (!name || !major) {
          pushIssue(lineNumber,"invalid","format kelas tidak lengkap");
          return;
        }
        summary.valid++;
        const key = getClassKey({ name });
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${name} | ${major}${homeroom ? ` | Wali: ${homeroom}` :""} (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(`${name} | ${major}${homeroom ? ` | Wali: ${homeroom}` :""}`);
      });
    } else if (activeTab ==="ruangan") {
      const existing = new Set(rooms.map(getRoomKey));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format ruangan tidak lengkap");
          return;
        }
        const [idRaw, nameRaw, typeRaw, majorRaw, targetGradeRaw, isPriorityRaw] = row;
        const id = String(idRaw ||"").trim().toUpperCase();
        const name = String(nameRaw ||"").trim();
        const type = String(typeRaw ||"").trim();
        const major = String(majorRaw ||"").trim();
        if (!id || !name || !type || !major) {
          pushIssue(lineNumber,"invalid","format ruangan tidak lengkap");
          return;
        }
        summary.valid++;
        const key = getRoomKey({ id });
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${id} | ${name} | ${type} | ${major} (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        const targetGrade = String(targetGradeRaw ||"Semua").trim() ||"Semua";
        const isPriority = ["ya","true","1"].includes(String(isPriorityRaw ||"").trim().toLowerCase());
        pushSample(`${id} | ${name} | ${type} | ${major} | ${targetGrade}${isPriority ?" | Prioritas" :""}`);
      });
    } else if (activeTab ==="guru") {
      const existing = new Set(teachers.map(getTeacherKey));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format guru tidak lengkap");
          return;
        }
        const [codeRaw, nameRaw, passwordRaw, typeRaw, majorRaw, gradeRaw, targetJpRaw] = row;
        const code = String(codeRaw ||"").trim().toUpperCase();
        const name = String(nameRaw ||"").trim();
        const targetJp = parsePositiveInt(targetJpRaw,"");
        if (!code || !name) {
          pushIssue(lineNumber,"invalid","format guru tidak lengkap");
          return;
        }
        summary.valid++;
        const key = getTeacherKey({ code });
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${code} | ${name} | ${String(passwordRaw ||"123").trim() ||"123"} | ${String(typeRaw ||"Umum").trim() ||"Umum"} | ${String(majorRaw ||"Semua").trim() ||"Semua"} | ${String(gradeRaw ||"Semua").trim() ||"Semua"} | ${targetJp ||"-"} JP (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(`${code} | ${name} | ${String(passwordRaw ||"123").trim() ||"123"} | ${String(typeRaw ||"Umum").trim() ||"Umum"} | ${String(majorRaw ||"Semua").trim() ||"Semua"} | ${String(gradeRaw ||"Semua").trim() ||"Semua"} | ${targetJp ||"-"} JP`);
      });
    } else if (activeTab ==="mapel") {
      const existing = new Set(subjects.map(getSubjectKey));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format mapel tidak lengkap");
          return;
        }
        const [nameRaw, gradeRaw, majorRaw, blockRaw, fifthColumn, sixthColumn] = row;
        const name = String(nameRaw ||"").trim();
        const grade = String(gradeRaw ||"").trim();
        const major = String(majorRaw ||"").trim();
        const isBlock = String(blockRaw ||"").trim().toLowerCase() ==="ya";
        const hasPracticeRoomColumn = row.length >= 6;
        const duration = parseInt(hasPracticeRoomColumn ? sixthColumn : fifthColumn, 10) || 2;
        const practiceRoomIds = serializeCsvList(parseCsvList(hasPracticeRoomColumn ? fifthColumn :""));
        if (!name || !grade || !major) {
          pushIssue(lineNumber,"invalid","format mapel tidak lengkap");
          return;
        }
        summary.valid++;
        const key = getSubjectKey({ name });
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${name} | ${grade} | ${major} | ${isBlock ?"Praktik" :"Teori"} | ${practiceRoomIds ||"Semua Ruang Praktik"} | ${duration} JP (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(`${name} | ${grade} | ${major} | ${isBlock ?"Praktik" :"Teori"} | ${practiceRoomIds ||"Semua Ruang Praktik"} | ${duration} JP`);
      });
    } else if (activeTab ==="beban") {
      const existing = new Set(teachingLoads.map(getLoadKey));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format beban tidak lengkap");
          return;
        }
        const [teacherCodeRaw, subjectRaw, targetGradeRaw, targetMajorRaw, durationRaw] = row;
        const teacherCode = String(teacherCodeRaw ||"").trim().toUpperCase();
        const subject = String(subjectRaw ||"").trim();
        const targetGrade = String(targetGradeRaw ||"").trim() ||"All";
        const targetMajor = String(targetMajorRaw ||"").trim() ||"All";
        const duration = parseInt(durationRaw, 10) || 2;
        if (!teacherCode || !subject) {
          pushIssue(lineNumber,"invalid","format beban tidak lengkap");
          return;
        }
        summary.valid++;
        const key = getLoadKey({
          teacherCode,
          subject,
          targetGrade,
          targetMajor
        });
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${teacherCode} | ${subject} | ${targetGrade} | ${targetMajor} | ${duration} JP (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(`${teacherCode} | ${subject} | ${targetGrade} | ${targetMajor} | ${duration} JP`);
      });
    } else if (activeTab ==="silabus" || activeTab ==="silabusguru") {
      const getSyllabusImportKey = item => [normalizeText(item.subjectName), normalizeText(item.teacherCode), normalizeText(item.title), normalizeText(item.gradeSemester ||"")].join("__");
      const existing = new Set((syllabuses || []).map(getSyllabusImportKey));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format silabus tidak lengkap");
          return;
        }
        const [subjectName, teacherCode, title, gradeSemester] = row;
        if (!subjectName || !teacherCode || !title) {
          pushIssue(lineNumber,"invalid","format silabus tidak lengkap");
          return;
        }
        summary.valid++;
        const key = getSyllabusImportKey({
          subjectName,
          teacherCode,
          title,
          gradeSemester
        });
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${subjectName} | ${teacherCode} | ${title} (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(`${subjectName} | ${teacherCode} | ${title}`);
      });
    } else if (activeTab ==="pengaturan") {
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format waktu tidak lengkap");
          return;
        }
        const [dayName, label, isBreak, labelBreak] = row;
        if (!dayName || !label) {
          pushIssue(lineNumber,"invalid","hari atau waktu kosong");
          return;
        }
        summary.valid++;
        summary.inserted++;
        pushSample(`${dayName} | ${label} | ${isBreak ==="ya" ?"Istirahat (" + labelBreak +")" :"KBM"}`);
      });
    } else if (activeTab ==="ketersediaan") {
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format ketersediaan tidak lengkap");
          return;
        }
        const [code, subjects, days] = row;
        if (!code) {
          pushIssue(lineNumber,"invalid","kode guru kosong");
          return;
        }
        summary.valid++;
        summary.updated++;
        pushSample(`${code} | Mapel: ${subjects ||"-"} | Hari: ${days ||"-"}`);
      });
    } else if (activeTab ==="akademik") {
      const existing = new Set(academicCalendar.map(evt => [normalizeText(evt.title), normalizeCalendarDateInput(evt.dateStart), normalizeCalendarDateInput(evt.dateEnd || evt.dateStart)].join("__")));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format kalender tidak lengkap");
          return;
        }
        const [titleRaw, startRaw, endRaw, categoryRaw, descriptionRaw] = row;
        const title = String(titleRaw ||"").trim();
        const dateStart = normalizeCalendarDateInput(startRaw);
        const dateEnd = normalizeCalendarDateInput(endRaw || startRaw);
        const categoryLabel = String(categoryRaw ||"").trim();
        const description = String(descriptionRaw ||"").trim();
        if (!title || !dateStart) {
          pushIssue(lineNumber,"invalid","judul atau tanggal mulai kosong");
          return;
        }
        if (dateEnd && dateEnd < dateStart) {
          pushIssue(lineNumber,"invalid","tanggal selesai lebih awal dari tanggal mulai");
          return;
        }
        summary.valid++;
        const key = [normalizeText(title), dateStart, dateEnd || dateStart].join("__");
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${title} | ${formatCalendarDateRange(dateStart, dateEnd)} | ${categoryLabel ||"Kategori aktif"} (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(`${title} | ${formatCalendarDateRange(dateStart, dateEnd)} | ${categoryLabel ||"Kategori aktif"}`);
      });
    } else if (activeTab ==="karyawan") {
      const existing = new Set((staffs || []).map(k => String(k.code ||"").trim().toLowerCase()));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format karyawan tidak lengkap");
          return;
        }
        const [codeRaw, nameRaw, divRaw, phoneRaw] = row;
        const code = String(codeRaw ||"").trim().toUpperCase();
        const name = String(nameRaw ||"").trim();
        if (!code || !name) {
          pushIssue(lineNumber,"invalid","kode atau nama kosong");
          return;
        }
        summary.valid++;
        const key = code.toLowerCase();
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${code} | ${name} (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(`${code} | ${name}`);
      });
    } else if (activeTab ==="siswa") {
      const existing = new Set((students || []).map(s => String(s.nis || s.code ||"").trim().toLowerCase()));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","format siswa tidak lengkap");
          return;
        }
        const [nisRaw, nameRaw, classRaw, genderRaw, phoneRaw] = row;
        const nis = String(nisRaw ||"").trim();
        const name = String(nameRaw ||"").trim();
        if (!nis || !name) {
          pushIssue(lineNumber,"invalid","NIS atau nama kosong");
          return;
        }
        summary.valid++;
        const key = nis.toLowerCase();
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${nis} | ${name} | ${classRaw ||""} (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(`${nis} | ${name} | ${classRaw ||""}`);
      });
    } else if (activeTab ==="kategori_kalender" || activeTab ==="kategori_silabus") {
      const existingCategories = activeTab ==="kategori_kalender" ? calendarCategories : syllabusCategories;
      const existing = new Set((existingCategories || []).map(cat => normalizeText(cat.name)));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber,"invalid","nama kategori kosong");
          return;
        }
        const name = String(row[0] ||"").trim();
        const color = String(row[1] ||"blue").trim() ||"blue";
        if (!name) {
          pushIssue(lineNumber,"invalid","nama kategori kosong");
          return;
        }
        summary.valid++;
        const key = normalizeText(name);
        if (existing.has(key)) {
          summary.updated++;
          pushSample(`${name} | ${color} (Update)`);
          return;
        }
        existing.add(key);
        summary.inserted++;
        pushSample(`${name} | ${color}`);
      });
    } else if (activeTab === "generate" || activeTab === "jadwal") {
      const existing = new Set((schedule || []).map(item => `${item.day}__${item.slotId}__${item.className}`));
      rows.forEach((row, index) => {
        const lineNumber = index + 1;
        if (row.length < requiredColumns) {
          pushIssue(lineNumber, "invalid", "kolom jadwal tidak lengkap (butuh: Hari, Jam Ke, Kelas, Kode/Nama Guru, Mapel)");
          return;
        }
        const [dayRaw, slotRaw, classRaw, teacherRaw, subjectRaw, roomRaw] = row;
        const day = resolveDay(dayRaw);
        const slots = resolveSlots(slotRaw, day);
        const className = resolveClass(classRaw);
        const teacherCode = resolveTeacher(teacherRaw);
        const subject = resolveSubject(subjectRaw);
        const roomId = resolveRoom(roomRaw);

        if (!day || slots.length === 0 || !className || !teacherCode || !subject) {
          pushIssue(lineNumber, "invalid", `Data belum lengkap pada baris ini (Hari: ${day || '-'}, Jam: ${slotRaw || '-'}, Kelas: ${className || '-'}, Guru: ${teacherCode || '-'}, Mapel: ${subject || '-'})`);
          return;
        }

        slots.forEach(slotId => {
          summary.valid++;
          const key = `${day}__${slotId}__${className}`;
          const teacherObj = (teachers || []).find(t => t.code === teacherCode);
          const teacherLabel = teacherObj ? `${teacherObj.code} (${teacherObj.name})` : teacherCode;
          if (existing.has(key)) {
            summary.updated++;
            pushSample(`${day} [Jam ${slotId}] ${className} | Guru: ${teacherLabel} | ${subject} (Update)`);
          } else {
            existing.add(key);
            summary.inserted++;
            pushSample(`${day} [Jam ${slotId}] ${className} | Guru: ${teacherLabel} | ${subject}`);
          }
        });
      });
    }
    setBulkImportPreview(summary);
  };

  const processBulkData = async text => {
    try {
      if (currentUser?.authToken && (!databaseHydrated || databaseHydrationFailedRef.current)) {
        showNotification("Tunggu database selesai sinkron sebelum import. Ini mencegah data tertimpa/reset.","error");
        return false;
      }
      const importConfig = BULK_IMPORT_CONFIG[activeTab];
      if (!importConfig) {
        showNotification("Tab ini belum mendukung import massal.","warning");
        return false;
      }
      const rows = parseBulkTextRows(text, activeTab);
      if (rows.length === 0) {
        showNotification("Tidak ada baris data yang bisa diproses.","warning");
        return false;
      }
      const requiredColumns = importConfig.requiredColumns || 0;
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      if (activeTab ==="jurusan") {
        let insertedCount = 0;
        let updatedCount = 0;
        setMajors(prev => {
          const map = new Map(prev.map(major => {
            const name = typeof major ==='object' && major !== null ? (major.name || major.payload ||'') : String(major ||'');
            return [normalizeText(name), name];
          }));
          rows.forEach(row => {
            if (row.length < requiredColumns) {
              skipped++;
              return;
            }
            const name = String(row[0] ||"").trim();
            if (!name) {
              skipped++;
              return;
            }
            const key = normalizeText(name);
            if (map.has(key)) {
              map.set(key, name);
              updatedCount++;
            } else {
              map.set(key, name);
              insertedCount++;
            }
          });
          return Array.from(map.values());
        });
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="kelas") {
        let insertedCount = 0;
        let updatedCount = 0;
        setClasses(prev => {
          const map = new Map(prev.map(c => [getClassKey(c), c]));
          rows.forEach(row => {
            if (row.length < requiredColumns) {
              skipped++;
              return;
            }
            const name = String(row[0] ||"").trim();
            const major = String(row[1] ||"").trim();
            const homeroom = String(row[2] ||"").trim();
            if (!name || !major) {
              skipped++;
              return;
            }
            const item = {
              name,
              major,
              homeroom
            };
            const key = getClassKey(item);
            if (map.has(key)) {
              map.set(key, item);
              updatedCount++;
            } else {
              map.set(key, item);
              insertedCount++;
            }
          });
          return Array.from(map.values());
        });
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="ruangan") {
        let insertedCount = 0;
        let updatedCount = 0;
        setRooms(prev => {
          const map = new Map(prev.map(r => [getRoomKey(r), r]));
          rows.forEach(row => {
            if (row.length < requiredColumns) {
              skipped++;
              return;
            }
            const id = String(row[0] ||"").trim().toUpperCase();
            const name = String(row[1] ||"").trim();
            const type = String(row[2] ||"").trim();
            const major = String(row[3] ||"").trim();
            const targetGrade = String(row[4] ||"Semua").trim() ||"Semua";
            const isPriority = ["ya","true","1"].includes(String(row[5] ||"").trim().toLowerCase());
            if (!id || !name || !type || !major) {
              skipped++;
              return;
            }
            const item = {
              id,
              name,
              type,
              major,
              targetGrade,
              isPriority
            };
            const key = getRoomKey(item);
            if (map.has(key)) {
              map.set(key, item);
              updatedCount++;
            } else {
              map.set(key, item);
              insertedCount++;
            }
          });
          return Array.from(map.values());
        });
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="guru") {
        let insertedCount = 0;
        let updatedCount = 0;
        const defaultImportedPassword = await hashPassword("123");
        const importedTeachers = [];
        for (const row of rows) {
          if (row.length < requiredColumns) {
            skipped++;
            continue;
          }
          const code = String(row[0] ||"").trim().toUpperCase();
          const name = String(row[1] ||"").trim();
          const passwordRaw = String(row[2] ??"").trim();
          const typeRaw = String(row[3] ||"Umum").trim() ||"Umum";
          const majorRaw = String(row[4] ||"Semua").trim() ||"Semua";
          const gradeRaw = String(row[5] ||"Semua").trim() ||"Semua";
          const targetJp = parsePositiveInt(row[6],"");
          if (!code || !name) {
            skipped++;
            continue;
          }
          importedTeachers.push({
            code,
            name,
            password: passwordRaw ? await hashPassword(passwordRaw) : undefined,
            type: typeRaw,
            preferredMajor: majorRaw,
            preferredGrade: gradeRaw,
            targetWeeklyJp: targetJp
          });
        }
        const teacherMap = new Map(teachers.map(teacher => [getTeacherKey(teacher), teacher]));
        importedTeachers.forEach(item => {
          const key = getTeacherKey(item);
          if (teacherMap.has(key)) {
            const existingItem = teacherMap.get(key);
            teacherMap.set(key, {
              ...existingItem,
              ...item,
              password: item.password || existingItem.password
            });
            updatedCount++;
          } else {
            teacherMap.set(key, {
              ...item,
              password: item.password || defaultImportedPassword
            });
            insertedCount++;
          }
        });
        const nextTeachers = Array.from(teacherMap.values());
        setTeachers(nextTeachers);
        await syncAuthSnapshotSafe(adminUser, nextTeachers);
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="mapel") {
        let insertedCount = 0;
        let updatedCount = 0;
        setSubjects(prev => {
          const map = new Map(prev.map(s => [getSubjectKey(s), s]));
          rows.forEach(row => {
            if (row.length < requiredColumns) {
              skipped++;
              return;
            }
            const name = String(row[0] ||"").trim();
            const grade = String(row[1] ||"").trim();
            const major = String(row[2] ||"").trim();
            const isBlock = String(row[3] ||"").trim().toLowerCase() ==="ya";
            const hasPracticeRoomColumn = row.length >= 6;
            const duration = parseInt(hasPracticeRoomColumn ? row[5] : row[4], 10) || 2;
            const practiceRoomIds = serializeCsvList(parseCsvList(hasPracticeRoomColumn ? row[4] :""));
            if (!name || !grade || !major) {
              skipped++;
              return;
            }
            const item = {
              name,
              grade,
              major,
              isBlock,
              defaultDuration: duration,
              practiceRoomIds
            };
            const key = getSubjectKey(item);
            if (map.has(key)) {
              map.set(key, item);
              updatedCount++;
            } else {
              map.set(key, item);
              insertedCount++;
            }
          });
          return Array.from(map.values());
        });
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="beban") {
        let insertedCount = 0;
        let updatedCount = 0;
        setTeachingLoads(prev => {
          const map = new Map(prev.map(l => [getLoadKey(l), l]));
          rows.forEach(row => {
            if (row.length < requiredColumns) {
              skipped++;
              return;
            }
            const teacherCode = String(row[0] ||"").trim().toUpperCase();
            const subject = String(row[1] ||"").trim();
            const targetGrade = String(row[2] ||"").trim() ||"All";
            const targetMajor = String(row[3] ||"").trim() ||"All";
            const duration = parseInt(row[4], 10) || 2;
            const hasMaxClassesValue = row.length > 5 && String(row[5] ??"").trim() !=="";
            const maxClasses = hasMaxClassesValue ? parsePositiveInt(row[5], 0) : 0;
            if (!teacherCode || !subject) {
              skipped++;
              return;
            }
            const key = getLoadKey({
              teacherCode,
              subject,
              targetGrade,
              targetMajor
            });
            if (map.has(key)) {
              const existingItem = map.get(key);
              map.set(key, {
                ...existingItem,
                duration,
                ...(hasMaxClassesValue ? {
                  maxClasses
                } : {})
              });
              updatedCount++;
            } else {
              const item = {
                id: `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`,
                teacherCode,
                subject,
                targetGrade,
                targetMajor,
                duration,
                maxClasses
              };
              map.set(key, item);
              insertedCount++;
            }
          });
          return Array.from(map.values());
        });
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="pengaturan") {
        let insertedCount = 0;
        let updatedCount = 0;
        const newDays = new Set(days);
        const newTimeSlots = {
          ...timeSlots
        };
        rows.forEach(row => {
          if (row.length < requiredColumns) {
            skipped++;
            return;
          }
          const dayName = String(row[0] ||"").trim();
          const label = String(row[1] ||"").trim();
          const isBreakStr = String(row[2] ||"").trim().toLowerCase();
          const labelBreak = String(row[3] ||"").trim();
          const isBreak = isBreakStr ==="ya" || isBreakStr ==="true" || isBreakStr ==="1";
          const parsedJp = parseInt(row[4], 10);
          const jpCount = isBreak ? 0 : isNaN(parsedJp) ? 1 : parsedJp;
          const minsPerJp = parseInt(row[5], 10) || 45;
          if (!dayName || !label) {
            skipped++;
            return;
          }
          newDays.add(dayName);
          if (!newTimeSlots[dayName]) {
            newTimeSlots[dayName] = [];
          }
          const existingSlotIndex = newTimeSlots[dayName].findIndex(s => sameText(s.label, label));
          if (existingSlotIndex !== -1) {
            newTimeSlots[dayName][existingSlotIndex] = {
              ...newTimeSlots[dayName][existingSlotIndex],
              isBreak,
              labelBreak: isBreak ? labelBreak :"",
              jpCount,
              minsPerJp
            };
            updatedCount++;
          } else {
            newTimeSlots[dayName].push({
              id: `${dayName}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              label,
              isBreak,
              labelBreak: isBreak ? labelBreak :"",
              jpCount,
              minsPerJp
            });
            insertedCount++;
          }
        });
        Object.keys(newTimeSlots).forEach(day => {
          newTimeSlots[day].sort((a, b) => a.label.localeCompare(b.label));
        });
        const nextDays = Array.from(newDays);
        setDays(nextDays);
        setTimeSlots(newTimeSlots);
        setTeacherAvailability(prev => {
          const next = {
            ...prev
          };
          const teacherCodes = new Set([...Object.keys(prev), ...teachers.map(teacher => teacher.code).filter(Boolean)]);
          teacherCodes.forEach(code => {
            const entry = next[code] || {
              days: [],
              subjects: []
            };
            const existingDays = Array.isArray(entry.days) ? entry.days.filter(day => newDays.has(day)) : [];
            next[code] = {
              ...entry,
              days: existingDays.length ? Array.from(new Set(existingDays)) : nextDays,
              subjects: Array.isArray(entry.subjects) ? entry.subjects : []
            };
          });
          return next;
        });
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="silabus" || activeTab ==="silabusguru") {
        let insertedCount = 0;
        let updatedCount = 0;
        const getSyllabusImportKey = item => [normalizeText(item.subjectName), normalizeText(item.teacherCode), normalizeText(item.title), normalizeText(item.gradeSemester ||"")].join("__");
        const syllabusMap = new Map((syllabuses || []).map(item => [getSyllabusImportKey(item), item]));
        rows.forEach(row => {
          if (row.length < requiredColumns) {
            skipped++;
            return;
          }
          const subjectName = String(row[0] ||"").trim();
          const teacherCode = String(row[1] ||"").trim().toUpperCase();
          const title = String(row[2] ||"").trim();
          const gradeSemester = String(row[3] ||"").trim();
          const objectives = String(row[4] ||"").trim();
          const materials = String(row[5] ||"").trim();
          const notes = String(row[6] ||"").trim();
          if (!subjectName || !teacherCode || !title) {
            skipped++;
            return;
          }
          const key = getSyllabusImportKey({
            subjectName,
            teacherCode,
            title,
            gradeSemester
          });
          const existingItem = syllabusMap.get(key);
          syllabusMap.set(key, {
            ...(existingItem || {}),
            id: existingItem?.id || `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`,
            subjectName,
            teacherCode,
            title,
            gradeSemester,
            objectives,
            materials,
            notes
          });
          if (existingItem) updatedCount++; else insertedCount++;
        });
        useAppStore.setState({
          syllabuses: Array.from(syllabusMap.values())
        });
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="akademik") {
        const categoryMap = new Map(calendarCategories.map(cat => [normalizeText(cat.name), cat.id]));
        const categoryIds = new Set(calendarCategories.map(cat => cat.id));
        const nextCategories = [...calendarCategories];
        const eventMap = new Map(academicCalendar.map(evt => {
          const key = [normalizeText(evt.title), normalizeCalendarDateInput(evt.dateStart), normalizeCalendarDateInput(evt.dateEnd || evt.dateStart)].join("__");
          return [key, evt];
        }));
        let insertedCount = 0;
        let updatedCount = 0;
        rows.forEach(row => {
          if (row.length < requiredColumns) {
            skipped++;
            return;
          }
          const [titleRaw, startRaw, endRaw, categoryRaw, descriptionRaw] = row;
          const title = String(titleRaw ||"").trim();
          const dateStart = normalizeCalendarDateInput(startRaw);
          const dateEnd = normalizeCalendarDateInput(endRaw || startRaw);
          const categoryLabel = String(categoryRaw ||"").trim();
          const description = String(descriptionRaw ||"").trim();
          if (!title || !dateStart) {
            skipped++;
            return;
          }
          if (dateEnd && dateEnd < dateStart) {
            skipped++;
            return;
          }
          let categoryId = calendarCategories[0]?.id ||"";
          if (categoryLabel) {
            const normalizedCategory = normalizeText(categoryLabel);
            categoryId = categoryMap.get(normalizedCategory) || getCalendarCategoryIdByLabel(categoryLabel);
            if (!categoryIds.has(categoryId)) {
              categoryIds.add(categoryId);
              categoryMap.set(normalizedCategory, categoryId);
              nextCategories.push({
                id: categoryId,
                name: categoryLabel,
                color:"blue"
              });
            }
          }
          const event = {
            id: createClientId(),
            title,
            dateStart,
            dateEnd: dateEnd || dateStart,
            categoryId,
            description
          };
          const key = [normalizeText(title), event.dateStart, event.dateEnd].join("__");
          if (eventMap.has(key)) {
            event.id = eventMap.get(key).id;
            updatedCount++;
          } else {
            insertedCount++;
          }
          eventMap.set(key, event);
        });
        setCalendarCategories(nextCategories);
        setAcademicCalendar(Array.from(eventMap.values()).sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart)));
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="karyawan") {
        let insertedCount = 0;
        let updatedCount = 0;
        const existingMap = new Map((staffs || []).map(k => [String(k.code ||"").trim().toLowerCase(), k]));
        rows.forEach(row => {
          if (row.length < requiredColumns) {
            skipped++;
            return;
          }
          const [codeRaw, nameRaw, divRaw, phoneRaw] = row;
          const code = String(codeRaw ||"").trim().toUpperCase();
          const name = String(nameRaw ||"").trim();
          if (!code || !name) {
            skipped++;
            return;
          }
          const key = code.toLowerCase();
          if (existingMap.has(key)) {
            existingMap.set(key, {
              ...existingMap.get(key),
              name,
              division: String(divRaw ||"").trim(),
              phone: String(phoneRaw ||"").trim()
            });
            updatedCount++;
          } else {
            existingMap.set(key, {
              code,
              name,
              division: String(divRaw ||"").trim(),
              phone: String(phoneRaw ||"").trim()
            });
            insertedCount++;
          }
        });
        if (setStaffs) setStaffs(Array.from(existingMap.values()));
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="siswa") {
        let insertedCount = 0;
        let updatedCount = 0;
        const existingMap = new Map((students || []).map(s => [String(s.nis || s.code ||"").trim().toLowerCase(), s]));
        rows.forEach(row => {
          if (row.length < requiredColumns) {
            skipped++;
            return;
          }
          const [nisRaw, nameRaw, classRaw, genderRaw, phoneRaw] = row;
          const nis = String(nisRaw ||"").trim();
          const name = String(nameRaw ||"").trim();
          if (!nis || !name) {
            skipped++;
            return;
          }
          const key = nis.toLowerCase();
          if (existingMap.has(key)) {
            existingMap.set(key, {
              ...existingMap.get(key),
              name: name,
              nama: name,
              class_name: String(classRaw ||"").trim(),
              kelas: String(classRaw ||"").trim(),
              gender: String(genderRaw ||"").trim().toUpperCase() ==="P" ?"P" :"L",
              wa_ortu: String(phoneRaw ||"").trim(),
              phone: String(phoneRaw ||"").trim()
            });
            updatedCount++;
          } else {
            existingMap.set(key, {
              nis: nis,
              code: nis,
              name: name,
              nama: name,
              class_name: String(classRaw ||"").trim(),
              kelas: String(classRaw ||"").trim(),
              gender: String(genderRaw ||"").trim().toUpperCase() ==="P" ?"P" :"L",
              wa_ortu: String(phoneRaw ||"").trim(),
              phone: String(phoneRaw ||"").trim()
            });
            insertedCount++;
          }
        });
        if (setStudents) setStudents(Array.from(existingMap.values()));
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="kategori_kalender" || activeTab ==="kategori_silabus") {
        const allowedColors = new Set(["blue","red","green","emerald","amber","purple","pink","slate","cyan","orange"]);
        const normalizeCategoryColor = value => {
          const color = String(value ||"blue").trim().toLowerCase();
          return allowedColors.has(color) ? color :"blue";
        };
        const sourceCategories = activeTab ==="kategori_kalender" ? calendarCategories : syllabusCategories;
        const map = new Map((sourceCategories || []).map(cat => [normalizeText(cat.name), cat]));
        let insertedCount = 0;
        let updatedCount = 0;
        rows.forEach(row => {
          if (row.length < requiredColumns) {
            skipped++;
            return;
          }
          const name = String(row[0] ||"").trim();
          const color = normalizeCategoryColor(row[1]);
          if (!name) {
            skipped++;
            return;
          }
          const key = normalizeText(name);
          const existingCategory = map.get(key);
          if (existingCategory) {
            map.set(key, {
              ...existingCategory,
              name,
              color
            });
            updatedCount++;
          } else {
            map.set(key, {
              id: `${activeTab ==="kategori_kalender" ?"cal-c" :"cat"}-${createClientId()}`,
              name,
              color
            });
            insertedCount++;
          }
        });
        const nextCategories = Array.from(map.values());
        if (activeTab ==="kategori_kalender") {
          setCalendarCategories(nextCategories);
        } else {
          useAppStore.setState({
            syllabusCategories: nextCategories
          });
        }
        inserted = insertedCount;
        updated = updatedCount;
      } else if (activeTab ==="ketersediaan") {
        let updatedCount = 0;
        setTeacherAvailability(prev => {
          const next = {
            ...prev
          };
          rows.forEach(row => {
            if (row.length < requiredColumns) {
              skipped++;
              return;
            }
            const code = String(row[0] ||"").trim();
            const subjectsStr = String(row[1] ||"").trim();
            const daysStr = String(row[2] ||"").trim();
            if (!code) {
              skipped++;
              return;
            }
            const subjArray = subjectsStr.split(",").map(s => s.trim()).filter(Boolean);
            const daysArray = daysStr.split(",").map(d => d.trim()).filter(Boolean);
            next[code] = {
              days: daysArray,
              subjects: subjArray
            };
            updatedCount++;
          });
          return next;
        });
        updated = updatedCount;
        inserted = 0;
      } else if (activeTab === "generate" || activeTab === "jadwal") {
        let insertedCount = 0;
        let updatedCount = 0;
        setSchedule(prev => {
          const map = new Map((prev || []).map(item => [`${item.day}__${item.slotId}__${item.className}`, item]));
          rows.forEach(row => {
            if (row.length < requiredColumns) {
              skipped++;
              return;
            }
            const [dayRaw, slotRaw, classRaw, teacherRaw, subjectRaw, roomRaw] = row;
            const day = resolveDay(dayRaw);
            const slots = resolveSlots(slotRaw, day);
            const className = resolveClass(classRaw);
            const teacherCode = resolveTeacher(teacherRaw);
            const subject = resolveSubject(subjectRaw);
            const roomId = resolveRoom(roomRaw);

            if (!day || slots.length === 0 || !className || !teacherCode || !subject) {
              skipped++;
              return;
            }

            slots.forEach(slotId => {
              const item = {
                day,
                slotId: String(slotId),
                className,
                teacherCode,
                subject,
                roomId: roomId || ""
              };
              const key = `${day}__${slotId}__${className}`;
              if (map.has(key)) {
                map.set(key, item);
                updatedCount++;
              } else {
                map.set(key, item);
                insertedCount++;
              }
            });
          });
          return Array.from(map.values());
        });
        inserted = insertedCount;
        updated = updatedCount;
      }
      showNotification(`Import selesai: +${inserted} ditambahkan, ${updated} diperbarui${skipped ? `, ${skipped} dilewati` :""}.`,"success");
      setBulkImportPreview(null);
      return true;
    } catch (e) {
      console.error(e);
      showNotification("Format data salah. Pastikan file atau teks menggunakan format Excel/CSV/TXT yang sesuai.","error");
    }
    return false;
  };

  const handleBulkText = async () => {
    const success = await processBulkData(bulkText);
    if (success) {
      setBulkText("");
      closeModal();
    }
  };

  return {
    downloadMasterTemplate,
    downloadScheduleTemplate,
    exportAllDataToExcel,
    exportAbsensiGuruToExcel,
    handleFileUpload,
    handlePreviewImport,
    handleProcessImport
  };
}
