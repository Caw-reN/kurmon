import { BULK_IMPORT_CONFIG, parseBulkTextRows, workbookSheetToDelimitedText } from'../../utils/bulkImport.js';
import { useAppStore } from'../../store/useAppStore.js';
import { sameText, normalizeText, getLoadKey, parsePositiveInt, serializeCsvList, parseCsvList, createClientId } from'../../utils/adminHelpers.js';

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
    teacherAvailability
  } = props || {};

  const downloadMasterTemplate = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");
    const wb = new ExcelJS.Workbook();

    // 0_Panduan_Singkat
    const panduanData = [
      ["PANDUAN PENGISIAN MASTER DATA"],
      [""],
      ["PETUNJUK UMUM:"],
      ["1. Anda DAPAT MENGISI sekaligus beberapa sheet yang Anda butuhkan."],
      ["2. DILARANG MENGUBAH / MENGHAPUS NAMA BARIS PERTAMA (HEADER) pada setiap sheet."],
      ["3. Kolom dengan tulisan (Wajib) HARUS diisi, sisanya bersifat opsional."],
      ["4. HAPUS baris contoh (contoh pengisian) sebelum Anda mengimpor file ini ke sistem."],
      ["5. Simpan file ini selalu dalam format .xlsx atau .xls"],
      ["6. Untuk nomor HP atau angka yang diawali angka 0, Anda bisa menambahkan tanda petik tunggal di depannya (contoh:'0812345678) agar angka 0 tidak hilang."],
      [""],
      ["DETAIL SHEET:"],
      ["- Jurusan & Kelas : Pastikan nama jurusan sama persis (huruf besar/kecil) saat dipakai di sheet Kelas."],
      ["- Guru & Karyawan : Masukkan Kode yang unik. Nomor WhatsApp sangat penting untuk notifikasi."],
      ["- Siswa           : Pastikan NIS/NISN unik. Kelas harus merujuk ke data di sheet Kelas."],
      ["- Beban & Silabus : Digunakan untuk menjadwalkan guru dan materi di Kurikulum."]
    ];
    const wsPanduan = wb.addWorksheet("0_Panduan_Singkat");
    panduanData.forEach(row => wsPanduan.addRow(row));
    var cols = [{ wch: 120 }];
    cols.forEach((col, idx) => { if(col.wch) wsPanduan.getColumn(idx + 1).width = col.wch; });

    // 1_Jurusan
    const jurusanData = [
      ["NAMA JURUSAN (Wajib)"],
      ["Rekayasa Perangkat Lunak"],
      ["Teknik Komputer dan Jaringan"]
    ];
    const wsJurusan = wb.addWorksheet("1_Jurusan");
    jurusanData.forEach(row => wsJurusan.addRow(row));
    var cols = [{ wch: 45 }];
    cols.forEach((col, idx) => { if(col.wch) wsJurusan.getColumn(idx + 1).width = col.wch; });

    // 2_Kelas
    const kelasData = [
      ["NAMA KELAS (Wajib)","JURUSAN (Wajib - Sama dgn Sheet 1)","WALI KELAS (Opsional)"],
      ["X RPL 1","Rekayasa Perangkat Lunak","Budi Santoso, S.Pd"],
      ["XI TKJ 2","Teknik Komputer dan Jaringan","Diana Lestari, M.Pd"]
    ];
    const wsKelas = wb.addWorksheet("2_Kelas");
    kelasData.forEach(row => wsKelas.addRow(row));
    var cols = [{ wch: 30 }, { wch: 40 }, { wch: 35 }];
    cols.forEach((col, idx) => { if(col.wch) wsKelas.getColumn(idx + 1).width = col.wch; });

    // 3_Guru
    const guruData = [
      ["KODE GURU (Wajib)","NAMA GURU (Wajib)","PASSWORD (Opsional)","KATEGORI (Umum/Jurusan/Campuran)","PRIORITAS JURUSAN","PRIORITAS TINGKAT","TARGET JP/MINGGU"],
      ["G01","Ahmad Fauzi, M.T","123456","Jurusan","RPL","XII", 24],
      ["G02","Siti Aminah, S.Pd","123456","Umum","Semua","Semua", 18]
    ];
    const wsGuru = wb.addWorksheet("3_Guru");
    guruData.forEach(row => wsGuru.addRow(row));
    var cols = [{ wch: 20 }, { wch: 40 }, { wch: 25 }, { wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];
    cols.forEach((col, idx) => { if(col.wch) wsGuru.getColumn(idx + 1).width = col.wch; });

    // 4_Mapel
    const mapelData = [
      ["NAMA MAPEL (Wajib)","GRADE (X/XI/XII/Semua)","JURUSAN (Semua/Jurusan Spesifik)","PRAKTIK? (Ya/Tidak)","RUANGAN PRAKTIK (Bila Praktik)","DURASI (JP)"],
      ["Dasar Pemrograman","X","Rekayasa Perangkat Lunak","Ya","LAB_RPL", 2],
      ["Pendidikan Pancasila","Semua","Semua","Tidak","", 2]
    ];
    const wsMapel = wb.addWorksheet("4_Mapel");
    mapelData.forEach(row => wsMapel.addRow(row));
    var cols = [{ wch: 40 }, { wch: 25 }, { wch: 40 }, { wch: 20 }, { wch: 35 }, { wch: 15 }];
    cols.forEach((col, idx) => { if(col.wch) wsMapel.getColumn(idx + 1).width = col.wch; });

    // 5_Ruangan
    const ruanganData = [
      ["ID RUANG (Wajib)","NAMA RUANGAN (Wajib)","TIPE (Teori/Praktik)","JURUSAN (Semua/Jurusan Spesifik)","TARGET TINGKAT (Semua/X/XI/XII)","PRIORITAS (Ya/Tidak)"],
      ["R01","Ruang Kelas X RPL 1","Teori","Rekayasa Perangkat Lunak","X","Tidak"],
      ["LAB_RPL","Laboratorium Komputer","Praktik","Rekayasa Perangkat Lunak","Semua","Ya"]
    ];
    const wsRuangan = wb.addWorksheet("5_Ruangan");
    ruanganData.forEach(row => wsRuangan.addRow(row));
    var cols = [{ wch: 20 }, { wch: 40 }, { wch: 25 }, { wch: 40 }, { wch: 35 }, { wch: 20 }];
    cols.forEach((col, idx) => { if(col.wch) wsRuangan.getColumn(idx + 1).width = col.wch; });

    // 6_Beban
    const bebanData = [
      ["KODE GURU (Wajib)","NAMA MAPEL (Wajib)","TARGET GRADE (Semua/X/XI/XII)","TARGET JURUSAN (Semua/Spesifik)","DURASI","MAKS KELAS (Opsional)"],
      ["G01","Dasar Pemrograman","X","Rekayasa Perangkat Lunak", 2,"3"],
      ["G02","Pendidikan Pancasila","Semua","Semua", 2,""]
    ];
    const wsBeban = wb.addWorksheet("6_Beban");
    bebanData.forEach(row => wsBeban.addRow(row));
    var cols = [{ wch: 20 }, { wch: 40 }, { wch: 35 }, { wch: 40 }, { wch: 15 }, { wch: 25 }];
    cols.forEach((col, idx) => { if(col.wch) wsBeban.getColumn(idx + 1).width = col.wch; });

    // 7_Modul
    const silabusData = [
      ["MATA PELAJARAN (Wajib)","GURU PENGAJAR (Wajib)","JUDUL PERTEMUAN (Wajib)","KELAS / SEMESTER","TUJUAN PEMBELAJARAN","MATERI PEMBELAJARAN","CATATAN / KETERANGAN"],
      ["Dasar Pemrograman","G01","Pertemuan 1: Pengenalan Vektor","X / Ganjil","Siswa memahami dasar vektor","Konsep vektor dan bitmap","Membawa laptop"]
    ];
    const wsSilabus = wb.addWorksheet("7_Modul");
    silabusData.forEach(row => wsSilabus.addRow(row));
    var cols = [{ wch: 30 }, { wch: 25 }, { wch: 45 }, { wch: 25 }, { wch: 50 }, { wch: 50 }, { wch: 30 }];
    cols.forEach((col, idx) => { if(col.wch) wsSilabus.getColumn(idx + 1).width = col.wch; });

    // 8_Waktu
    const waktuData = [
      ["HARI (Wajib)","WAKTU (Wajib)","APAKAH ISTIRAHAT? (Ya/Tidak)","NAMA KEGIATAN","JUMLAH JP"],
      ["Senin","07:00 - 07:45","Tidak","Jam Pelajaran 1", 1],
      ["Senin","09:15 - 09:45","Ya","Istirahat Pagi", 0]
    ];
    const wsWaktu = wb.addWorksheet("8_Waktu");
    waktuData.forEach(row => wsWaktu.addRow(row));
    var cols = [{ wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 20 }];
    cols.forEach((col, idx) => { if(col.wch) wsWaktu.getColumn(idx + 1).width = col.wch; });

    // 9_Ketersediaan
    const ketersediaanData = [
      ["KODE GURU (Wajib)","MAPEL KOMPETENSI","HARI TERSEDIA"],
      ["G01","Dasar Pemrograman","Senin, Selasa, Rabu, Kamis, Jumat"],
      ["G02","Pendidikan Pancasila","Senin, Kamis, Jumat"]
    ];
    const wsKetersediaan = wb.addWorksheet("9_Ketersediaan");
    ketersediaanData.forEach(row => wsKetersediaan.addRow(row));
    var cols = [{ wch: 20 }, { wch: 40 }, { wch: 45 }];
    cols.forEach((col, idx) => { if(col.wch) wsKetersediaan.getColumn(idx + 1).width = col.wch; });

    // 10_Kalender_Akademik
    const akademikData = [
      ["JUDUL KEGIATAN (Wajib)","MULAI (YYYY-MM-DD)","SELESAI (YYYY-MM-DD)","KATEGORI (Wajib)","DESKRIPSI / KETERANGAN"],
      ["Libur Semester Ganjil","2024-12-15","2024-12-31","Libur","Liburan akhir semester"]
    ];
    const wsAkademik = wb.addWorksheet("10_Kalender_Akademik");
    akademikData.forEach(row => wsAkademik.addRow(row));
    var cols = [{ wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 45 }];
    cols.forEach((col, idx) => { if(col.wch) wsAkademik.getColumn(idx + 1).width = col.wch; });

    // 11_Kategori_Kalender
    const katKalenderData = [
      ["NAMA KATEGORI (Wajib)","WARNA (Hex Code Opsional)"],
      ["Libur","#ef4444"],
      ["Ujian","#3b82f6"]
    ];
    const wsKatKalender = wb.addWorksheet("11_Kategori_Kalender");
    katKalenderData.forEach(row => wsKatKalender.addRow(row));
    var cols = [{ wch: 30 }, { wch: 30 }];
    cols.forEach((col, idx) => { if(col.wch) wsKatKalender.getColumn(idx + 1).width = col.wch; });

    // 12_Kategori_Modul
    const katSilabusData = [
      ["NAMA KATEGORI (Wajib)","WARNA (Hex Code Opsional)"],
      ["Pertemuan Biasa","#3b82f6"],
      ["Praktikum","#10b981"]
    ];
    const wsKatSilabus = wb.addWorksheet("12_Kategori_Modul");
    katSilabusData.forEach(row => wsKatSilabus.addRow(row));
    var cols = [{ wch: 30 }, { wch: 30 }];
    cols.forEach((col, idx) => { if(col.wch) wsKatSilabus.getColumn(idx + 1).width = col.wch; });

    // 13_Absensi_Guru
    const absensiData = [
      ["PEMBERITAHUAN"],
      ["Sheet 13_Absensi_Guru ini HANYA UNTUK KEPERLUAN EXPORT DATA."],
      ["Anda tidak dapat melakukan import absen masa lalu melalui file Excel ini."]
    ];
    const wsAbsensi = wb.addWorksheet("13_Absensi_Guru");
    absensiData.forEach(row => wsAbsensi.addRow(row));
    var cols = [{ wch: 80 }];
    cols.forEach((col, idx) => { if(col.wch) wsAbsensi.getColumn(idx + 1).width = col.wch; });

    // 14_Karyawan
    const karyawanData = [
      ["KODE KARYAWAN (Wajib)","NAMA KARYAWAN (Wajib)","DIVISI / BAGIAN","NO WHATSAPP"],
      ["K01","Budi Santoso","Kebersihan","'081234567890"],
      ["K02","Siti Aminah","Tata Usaha","'081298765432"]
    ];
    const wsKaryawan = wb.addWorksheet("14_Karyawan");
    karyawanData.forEach(row => wsKaryawan.addRow(row));
    var cols = [{ wch: 25 }, { wch: 40 }, { wch: 25 }, { wch: 25 }];
    cols.forEach((col, idx) => { if(col.wch) wsKaryawan.getColumn(idx + 1).width = col.wch; });

    // 15_Siswa
    const siswaData = [
      ["NIS / NISN (Wajib)","NAMA SISWA (Wajib)","KELAS (Sesuai Data Kelas)","JENIS KELAMIN (L/P)","NO WHATSAPP ORTU"],
      ["1001","Ahmad Yusuf","X RPL 1","L","'081234567890"],
      ["1002","Bunga Lestari","X RPL 1","P","'081298765432"]
    ];
    const wsSiswa = wb.addWorksheet("15_Siswa");
    siswaData.forEach(row => wsSiswa.addRow(row));
    var cols = [{ wch: 25 }, { wch: 45 }, { wch: 35 }, { wch: 25 }, { wch: 25 }];
    cols.forEach((col, idx) => { if(col.wch) wsSiswa.getColumn(idx + 1).width = col.wch; });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `Template Master Data ${appSettings.appName ||"TimeSchedule"}.xlsx`);
    showNotification("Template Master Data berhasil diunduh.","success");
  };

  async function exportAllDataToExcel() {
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");
    const wb = new ExcelJS.Workbook();
    const jurusanData = [["Nama Jurusan (wajib)"], ...majors.map(m => [m])];
    const wsJurusan = wb.addWorksheet("1_Jurusan");
    jurusanData.forEach(row => wsJurusan.addRow(row));
    var cols = [{
      wch: 36
    }];
    cols.forEach((col, idx) => { if(col.wch) wsJurusan.getColumn(idx + 1).width = col.wch; });
    const kelasData = [["Nama Kelas (wajib)","Jurusan (pilih dari Data Jurusan)","Wali Kelas"], ...classes.map(c => [c.name, c.major, c.homeroom ||""])];
    const wsKelas = wb.addWorksheet("2_Kelas");
    kelasData.forEach(row => wsKelas.addRow(row));
    var cols = [{
      wch: 34
    }, {
      wch: 36
    }, {
      wch: 34
    }];
    cols.forEach((col, idx) => { if(col.wch) wsKelas.getColumn(idx + 1).width = col.wch; });
    const guruData = [["Kode Guru (wajib)","Nama Guru (wajib)","Password","Kategori (Umum/Jurusan/Campuran)","Prioritas Jurusan","Prioritas Tingkat","Target JP/Minggu"], ...teachers.map(t => [t.code, t.name,"", t.type, t.preferredMajor, t.preferredGrade, t.targetWeeklyJp ||""])];
    const wsGuru = wb.addWorksheet("3_Guru");
    guruData.forEach(row => wsGuru.addRow(row));
    var cols = [{
      wch: 20
    }, {
      wch: 40
    }, {
      wch: 14
    }, {
      wch: 28
    }, {
      wch: 22
    }, {
      wch: 20
    }, {
      wch: 18
    }];
    cols.forEach((col, idx) => { if(col.wch) wsGuru.getColumn(idx + 1).width = col.wch; });
    const mapelData = [["Nama Mapel (wajib)","Grade (X/XI/XII/Semua)","Jurusan (Umum/TKR/TKJ/RPL/Akuntansi)","Praktik? (Ya/Tidak)","Ruangan Praktik (ID dipisah koma)","Durasi"], ...subjects.map(s => [s.name, s.grade, s.major, s.isBlock ?"Ya" :"Tidak", s.practiceRoomIds ||"", s.defaultDuration])];
    const wsMapel = wb.addWorksheet("4_Mapel");
    mapelData.forEach(row => wsMapel.addRow(row));
    var cols = [{
      wch: 36
    }, {
      wch: 26
    }, {
      wch: 44
    }, {
      wch: 20
    }, {
      wch: 40
    }, {
      wch: 10
    }];
    cols.forEach((col, idx) => { if(col.wch) wsMapel.getColumn(idx + 1).width = col.wch; });
    const ruanganData = [["ID Ruang (wajib)","Nama Ruangan (wajib)","Tipe (Teori/Praktik)","Jurusan (All/TKR/TKJ/RPL/Akuntansi)","Target Tingkat (Semua/X/XI/XII)","Prioritas (Ya/Tidak)"], ...rooms.map(r => [r.id, r.name, r.type, r.major, r.targetGrade ||"Semua", r.isPriority ?"Ya" :"Tidak"])];
    const wsRuangan = wb.addWorksheet("5_Ruangan");
    ruanganData.forEach(row => wsRuangan.addRow(row));
    var cols = [{
      wch: 20
    }, {
      wch: 34
    }, {
      wch: 22
    }, {
      wch: 40
    }, {
      wch: 28
    }, {
      wch: 20
    }];
    cols.forEach((col, idx) => { if(col.wch) wsRuangan.getColumn(idx + 1).width = col.wch; });
    const bebanData = [["Kode Guru","Nama Mapel","Target Grade (All/X/XI/XII atau X,XI)","Target Jurusan (All/TKR/TKJ/RPL/Akuntansi)","Durasi","Maks Kelas (opsional)"], ...teachingLoads.map(b => [b.teacherCode, b.subject, b.targetGrade, b.targetMajor, b.duration, b.maxClasses ||""])];
    const wsBeban = wb.addWorksheet("6_Beban");
    bebanData.forEach(row => wsBeban.addRow(row));
    var cols = [{
      wch: 18
    }, {
      wch: 34
    }, {
      wch: 40
    }, {
      wch: 44
    }, {
      wch: 10
    }, {
      wch: 22
    }];
    cols.forEach((col, idx) => { if(col.wch) wsBeban.getColumn(idx + 1).width = col.wch; });
    const silabusData = [["Mata Pelajaran (wajib)","Guru Pengajar (wajib)","Judul Pertemuan / BAB (wajib)","Kelas / Semester","Tujuan Pembelajaran","Materi Pembelajaran (pisah enter)","Catatan (opsional)"], ...syllabuses.map(s => [s.subjectName, s.teacherCode, s.title, s.gradeSemester ||"", s.objectives ||"", s.materials ||"", s.notes ||""])];
    const wsSilabus = wb.addWorksheet("7_Modul");
    silabusData.forEach(row => wsSilabus.addRow(row));
    var cols = [{
      wch: 25
    }, {
      wch: 20
    }, {
      wch: 40
    }, {
      wch: 20
    }, {
      wch: 50
    }, {
      wch: 50
    }, {
      wch: 24
    }];
    cols.forEach((col, idx) => { if(col.wch) wsSilabus.getColumn(idx + 1).width = col.wch; });
    const waktuData = [["Hari","Waktu","Apakah Istirahat?","Nama Kegiatan / Istirahat","Jumlah JP","Menit per JP"], ...Object.entries(timeSlots || {}).flatMap(([dayName, slots]) => (slots || []).map(slot => [dayName, slot.label ||"", slot.isBreak ?"Ya" :"Tidak", slot.isBreak ? slot.labelBreak || slot.label ||"" :"", slot.isBreak ?"" : slot.jpCount || 1, slot.minsPerJp || 45]))];
    const wsWaktu = wb.addWorksheet("8_Waktu");
    waktuData.forEach(row => wsWaktu.addRow(row));
    var cols = [{
      wch: 16
    }, {
      wch: 20
    }, {
      wch: 18
    }, {
      wch: 30
    }, {
      wch: 12
    }, {
      wch: 14
    }];
    cols.forEach((col, idx) => { if(col.wch) wsWaktu.getColumn(idx + 1).width = col.wch; });
    const ketersediaanData = [["Kode Guru (wajib)","Mapel Kompetensi (pisahkan dengan koma)","Hari Tersedia (pisahkan dengan koma)"], ...teachers.map(t => {
      const avail = teacherAvailability[t.code] || {
        days: [],
        subjects: []
      };
      return [t.code, avail.subjects.join(","), avail.days.join(",")];
    })];
    const wsKetersediaan = wb.addWorksheet("9_Ketersediaan");
    ketersediaanData.forEach(row => wsKetersediaan.addRow(row));
    var cols = [{
      wch: 20
    }, {
      wch: 50
    }, {
      wch: 40
    }];
    cols.forEach((col, idx) => { if(col.wch) wsKetersediaan.getColumn(idx + 1).width = col.wch; });
    const calendarCategoryById = new Map((calendarCategories || []).map(cat => [cat.id, cat.name]));
    const akademikData = [["Judul Kegiatan","Mulai","Selesai","Kategori","Keterangan"], ...(academicCalendar || []).map(evt => [evt.title ||"", normalizeCalendarDateInput(evt.dateStart) ||"", normalizeCalendarDateInput(evt.dateEnd || evt.dateStart) ||"", calendarCategoryById.get(evt.categoryId) || evt.categoryId ||"", evt.description ||""])];
    const wsAkademik = wb.addWorksheet("10_Kalender_Akademik");
    akademikData.forEach(row => wsAkademik.addRow(row));
    var cols = [{
      wch: 34
    }, {
      wch: 16
    }, {
      wch: 16
    }, {
      wch: 24
    }, {
      wch: 48
    }];
    cols.forEach((col, idx) => { if(col.wch) wsAkademik.getColumn(idx + 1).width = col.wch; });
    const kategoriKalenderData = [["Nama Kategori","Warna"], ...(calendarCategories || []).map(cat => [cat.name ||"", cat.color ||"blue"])];
    const wsKategoriKalender = wb.addWorksheet("11_Kategori_Kalender");
    kategoriKalenderData.forEach(row => wsKategoriKalender.addRow(row));
    var cols = [{
      wch: 30
    }, {
      wch: 16
    }];
    cols.forEach((col, idx) => { if(col.wch) wsKategoriKalender.getColumn(idx + 1).width = col.wch; });
    const kategoriSilabusData = [["Nama Kategori","Warna"], ...(syllabusCategories || []).map(cat => [cat.name ||"", cat.color ||"blue"])];
    const wsKategoriSilabus = wb.addWorksheet("12_Kategori_Modul");
    kategoriSilabusData.forEach(row => wsKategoriSilabus.addRow(row));
    var cols = [{
      wch: 30
    }, {
      wch: 16
    }];
    cols.forEach((col, idx) => { if(col.wch) wsKategoriSilabus.getColumn(idx + 1).width = col.wch; });
    const absensiData = [["Tanggal","Waktu","Kode Guru","Nama Guru","Sesi","Status","Mode","Catatan","Lokasi (Lat, Lng)"], ...(attendanceRecords || []).map(record => [record.date ||"", record.time ||"", record.teacherCode ||"", getTeacherName(record.teacherCode) ||"", record.sessionName ||"", record.status ||"", record.mode ||"", record.note ||"", record.location ? `${record.location.lat}, ${record.location.lng}` :""])];
    const wsAbsensi = wb.addWorksheet("13_Absensi_Guru");
    absensiData.forEach(row => wsAbsensi.addRow(row));
    var cols = [{
      wch: 14
    }, {
      wch: 12
    }, {
      wch: 14
    }, {
      wch: 34
    }, {
      wch: 20
    }, {
      wch: 14
    }, {
      wch: 12
    }, {
      wch: 30
    }, {
      wch: 24
    }];
    cols.forEach((col, idx) => { if(col.wch) wsAbsensi.getColumn(idx + 1).width = col.wch; });

    const karyawanData = [["KODE KARYAWAN (Wajib)","NAMA KARYAWAN (Wajib)","DIVISI / BAGIAN","NO WHATSAPP"], ...(staffs || []).map(k => [k.code ||"", k.name ||"", k.division ||"", k.phone ? `'${k.phone}` :""])];
    const wsKaryawan = wb.addWorksheet("14_Karyawan");
    karyawanData.forEach(row => wsKaryawan.addRow(row));
    var cols = [{ wch: 25 }, { wch: 40 }, { wch: 25 }, { wch: 25 }];
    cols.forEach((col, idx) => { if(col.wch) wsKaryawan.getColumn(idx + 1).width = col.wch; });

    const siswaData = [["NIS / NISN (Wajib)","NAMA SISWA (Wajib)","KELAS (Sesuai Data Kelas)","JENIS KELAMIN (L/P)","NO WHATSAPP ORTU"], ...(students || []).map(s => {
      const hp = s.wa_ortu || s.phone ||"";
      return [s.nis || s.code ||"", s.name || s.nama ||"", s.class_name || s.kelas ||"", s.gender ||"", hp ? `'${hp}` :""];
    })];
    const wsSiswa = wb.addWorksheet("15_Siswa");
    siswaData.forEach(row => wsSiswa.addRow(row));
    var cols = [{ wch: 25 }, { wch: 45 }, { wch: 35 }, { wch: 25 }, { wch: 25 }];
    cols.forEach((col, idx) => { if(col.wch) wsSiswa.getColumn(idx + 1).width = col.wch; });

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
          const ws = workbook.worksheets[0];
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
    exportAllDataToExcel,
    exportAbsensiGuruToExcel,
    handleFileUpload,
    handlePreviewImport,
    handleProcessImport
  };
}
