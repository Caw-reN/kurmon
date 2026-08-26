import { BULK_IMPORT_CONFIG, parseBulkTextRows, workbookSheetToDelimitedText } from "/src/utils/bulkImport.js";
import { useAppStore } from "/src/store/useAppStore.js";
import { sameText, normalizeText, getLoadKey, parsePositiveInt, serializeCsvList, parseCsvList, createClientId } from "/src/utils/adminHelpers.js";
var _s = $RefreshSig$();
export function useAdminImportExport(props) {
	_s();
	const { academicCalendar } = useAppStore();
	const { matchesGradeTarget, getRoomName, updateSelectionForTab, normalizeUserRole, isSuperAdminRole, csvValueMatches, csvIncludesText, parseTeacherCodes, getCappedClassCount, getCalendarCategoryIdByLabel, getClassKey, getRoomKey, getTeacherKey, getSubjectKey, hashPassword, syncAuthSnapshotSafe, normalizeCalendarDateInput, formatCalendarDateRange, adminUser, showNotification, majors, classes, teachers, subjects, rooms, scheduleCellMap, timeSlots, days, activeTab, setBulkImportPreview, bulkImportPreview, closeModal, setMajors, setClasses, setRooms, setTeachers, setSubjects, setTeachingLoads, setDays, setTimeSlots, setTeacherAvailability, setCalendarCategories, setAcademicCalendar, staffs, setStaffs, students, setStudents, currentUser, databaseHydrated, databaseHydrationFailedRef, getTeacherName, syllabuses, setSyllabuses, syllabusCategories, setSyllabusCategories, attendanceRecords, setAttendanceRecords, appSettings, calendarCategories, setBulkText, handleBulkTextChange, openAcademicCalendarGuide, openTeacherGuide, openImportGuide, setIsImportGuideOpen, fileInputRef, bulkText, downloadAcademicCalendarTemplate, downloadTeacherTemplate, teachingLoads, teacherAvailability } = props || {};
	const downloadMasterTemplate = async () => {
		const ExcelJS = (await import('/node_modules/.vite/deps/exceljs.js?v=187f8eff').then(m => ((m, n) => n || !m?.__esModule ? {	...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {},	default: m} : m)(m.default, 1))).default;
		const { saveAs } = await import('/node_modules/.vite/deps/file-saver.js?v=187f8eff').then(m => ((m, n) => n || !m?.__esModule ? {	...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {},	default: m} : m)(m.default, 1));
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
		panduanData.forEach((row) => wsPanduan.addRow(row));
		var cols = [{ wch: 120 }];
		cols.forEach((col, idx) => {
			if (col.wch) wsPanduan.getColumn(idx + 1).width = col.wch;
		});
		// 1_Jurusan
		const jurusanData = [
			["NAMA JURUSAN (Wajib)"],
			["Rekayasa Perangkat Lunak"],
			["Teknik Komputer dan Jaringan"]
		];
		const wsJurusan = wb.addWorksheet("1_Jurusan");
		jurusanData.forEach((row) => wsJurusan.addRow(row));
		var cols = [{ wch: 45 }];
		cols.forEach((col, idx) => {
			if (col.wch) wsJurusan.getColumn(idx + 1).width = col.wch;
		});
		// 2_Kelas
		const kelasData = [
			[
				"NAMA KELAS (Wajib)",
				"JURUSAN (Wajib - Sama dgn Sheet 1)",
				"WALI KELAS (Opsional)"
			],
			[
				"X RPL 1",
				"Rekayasa Perangkat Lunak",
				"Budi Santoso, S.Pd"
			],
			[
				"XI TKJ 2",
				"Teknik Komputer dan Jaringan",
				"Diana Lestari, M.Pd"
			]
		];
		const wsKelas = wb.addWorksheet("2_Kelas");
		kelasData.forEach((row) => wsKelas.addRow(row));
		var cols = [
			{ wch: 30 },
			{ wch: 40 },
			{ wch: 35 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsKelas.getColumn(idx + 1).width = col.wch;
		});
		// 3_Guru
		const guruData = [
			[
				"KODE GURU (Wajib)",
				"NAMA GURU (Wajib)",
				"PASSWORD (Opsional)",
				"KATEGORI (Umum/Jurusan/Campuran)",
				"PRIORITAS JURUSAN",
				"PRIORITAS TINGKAT",
				"TARGET JP/MINGGU"
			],
			[
				"G01",
				"Ahmad Fauzi, M.T",
				"123456",
				"Jurusan",
				"RPL",
				"XII",
				24
			],
			[
				"G02",
				"Siti Aminah, S.Pd",
				"123456",
				"Umum",
				"Semua",
				"Semua",
				18
			]
		];
		const wsGuru = wb.addWorksheet("3_Guru");
		guruData.forEach((row) => wsGuru.addRow(row));
		var cols = [
			{ wch: 20 },
			{ wch: 40 },
			{ wch: 25 },
			{ wch: 35 },
			{ wch: 25 },
			{ wch: 25 },
			{ wch: 25 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsGuru.getColumn(idx + 1).width = col.wch;
		});
		// 4_Mapel
		const mapelData = [
			[
				"NAMA MAPEL (Wajib)",
				"GRADE (X/XI/XII/Semua)",
				"JURUSAN (Semua/Jurusan Spesifik)",
				"PRAKTIK? (Ya/Tidak)",
				"RUANGAN PRAKTIK (Bila Praktik)",
				"DURASI (JP)"
			],
			[
				"Dasar Pemrograman",
				"X",
				"Rekayasa Perangkat Lunak",
				"Ya",
				"LAB_RPL",
				2
			],
			[
				"Pendidikan Pancasila",
				"Semua",
				"Semua",
				"Tidak",
				"",
				2
			]
		];
		const wsMapel = wb.addWorksheet("4_Mapel");
		mapelData.forEach((row) => wsMapel.addRow(row));
		var cols = [
			{ wch: 40 },
			{ wch: 25 },
			{ wch: 40 },
			{ wch: 20 },
			{ wch: 35 },
			{ wch: 15 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsMapel.getColumn(idx + 1).width = col.wch;
		});
		// 5_Ruangan
		const ruanganData = [
			[
				"ID RUANG (Wajib)",
				"NAMA RUANGAN (Wajib)",
				"TIPE (Teori/Praktik)",
				"JURUSAN (Semua/Jurusan Spesifik)",
				"TARGET TINGKAT (Semua/X/XI/XII)",
				"PRIORITAS (Ya/Tidak)"
			],
			[
				"R01",
				"Ruang Kelas X RPL 1",
				"Teori",
				"Rekayasa Perangkat Lunak",
				"X",
				"Tidak"
			],
			[
				"LAB_RPL",
				"Laboratorium Komputer",
				"Praktik",
				"Rekayasa Perangkat Lunak",
				"Semua",
				"Ya"
			]
		];
		const wsRuangan = wb.addWorksheet("5_Ruangan");
		ruanganData.forEach((row) => wsRuangan.addRow(row));
		var cols = [
			{ wch: 20 },
			{ wch: 40 },
			{ wch: 25 },
			{ wch: 40 },
			{ wch: 35 },
			{ wch: 20 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsRuangan.getColumn(idx + 1).width = col.wch;
		});
		// 6_Beban
		const bebanData = [
			[
				"KODE GURU (Wajib)",
				"NAMA MAPEL (Wajib)",
				"TARGET GRADE (Semua/X/XI/XII)",
				"TARGET JURUSAN (Semua/Spesifik)",
				"DURASI",
				"MAKS KELAS (Opsional)"
			],
			[
				"G01",
				"Dasar Pemrograman",
				"X",
				"Rekayasa Perangkat Lunak",
				2,
				"3"
			],
			[
				"G02",
				"Pendidikan Pancasila",
				"Semua",
				"Semua",
				2,
				""
			]
		];
		const wsBeban = wb.addWorksheet("6_Beban");
		bebanData.forEach((row) => wsBeban.addRow(row));
		var cols = [
			{ wch: 20 },
			{ wch: 40 },
			{ wch: 35 },
			{ wch: 40 },
			{ wch: 15 },
			{ wch: 25 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsBeban.getColumn(idx + 1).width = col.wch;
		});
		// 7_Modul
		const silabusData = [[
			"MATA PELAJARAN (Wajib)",
			"GURU PENGAJAR (Wajib)",
			"JUDUL PERTEMUAN (Wajib)",
			"KELAS / SEMESTER",
			"TUJUAN PEMBELAJARAN",
			"MATERI PEMBELAJARAN",
			"CATATAN / KETERANGAN"
		], [
			"Dasar Pemrograman",
			"G01",
			"Pertemuan 1: Pengenalan Vektor",
			"X / Ganjil",
			"Siswa memahami dasar vektor",
			"Konsep vektor dan bitmap",
			"Membawa laptop"
		]];
		const wsSilabus = wb.addWorksheet("7_Modul");
		silabusData.forEach((row) => wsSilabus.addRow(row));
		var cols = [
			{ wch: 30 },
			{ wch: 25 },
			{ wch: 45 },
			{ wch: 25 },
			{ wch: 50 },
			{ wch: 50 },
			{ wch: 30 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsSilabus.getColumn(idx + 1).width = col.wch;
		});
		// 8_Waktu
		const waktuData = [
			[
				"HARI (Wajib)",
				"WAKTU (Wajib)",
				"APAKAH ISTIRAHAT? (Ya/Tidak)",
				"NAMA KEGIATAN",
				"JUMLAH JP"
			],
			[
				"Senin",
				"07:00 - 07:45",
				"Tidak",
				"Jam Pelajaran 1",
				1
			],
			[
				"Senin",
				"09:15 - 09:45",
				"Ya",
				"Istirahat Pagi",
				0
			]
		];
		const wsWaktu = wb.addWorksheet("8_Waktu");
		waktuData.forEach((row) => wsWaktu.addRow(row));
		var cols = [
			{ wch: 20 },
			{ wch: 25 },
			{ wch: 30 },
			{ wch: 30 },
			{ wch: 20 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsWaktu.getColumn(idx + 1).width = col.wch;
		});
		// 9_Ketersediaan
		const ketersediaanData = [
			[
				"KODE GURU (Wajib)",
				"MAPEL KOMPETENSI",
				"HARI TERSEDIA"
			],
			[
				"G01",
				"Dasar Pemrograman",
				"Senin, Selasa, Rabu, Kamis, Jumat"
			],
			[
				"G02",
				"Pendidikan Pancasila",
				"Senin, Kamis, Jumat"
			]
		];
		const wsKetersediaan = wb.addWorksheet("9_Ketersediaan");
		ketersediaanData.forEach((row) => wsKetersediaan.addRow(row));
		var cols = [
			{ wch: 20 },
			{ wch: 40 },
			{ wch: 45 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsKetersediaan.getColumn(idx + 1).width = col.wch;
		});
		// 10_Kalender_Akademik
		const akademikData = [[
			"JUDUL KEGIATAN (Wajib)",
			"MULAI (YYYY-MM-DD)",
			"SELESAI (YYYY-MM-DD)",
			"KATEGORI (Wajib)",
			"DESKRIPSI / KETERANGAN"
		], [
			"Libur Semester Ganjil",
			"2024-12-15",
			"2024-12-31",
			"Libur",
			"Liburan akhir semester"
		]];
		const wsAkademik = wb.addWorksheet("10_Kalender_Akademik");
		akademikData.forEach((row) => wsAkademik.addRow(row));
		var cols = [
			{ wch: 35 },
			{ wch: 25 },
			{ wch: 25 },
			{ wch: 25 },
			{ wch: 45 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsAkademik.getColumn(idx + 1).width = col.wch;
		});
		// 11_Kategori_Kalender
		const katKalenderData = [
			["NAMA KATEGORI (Wajib)", "WARNA (Hex Code Opsional)"],
			["Libur", "#ef4444"],
			["Ujian", "#3b82f6"]
		];
		const wsKatKalender = wb.addWorksheet("11_Kategori_Kalender");
		katKalenderData.forEach((row) => wsKatKalender.addRow(row));
		var cols = [{ wch: 30 }, { wch: 30 }];
		cols.forEach((col, idx) => {
			if (col.wch) wsKatKalender.getColumn(idx + 1).width = col.wch;
		});
		// 12_Kategori_Modul
		const katSilabusData = [
			["NAMA KATEGORI (Wajib)", "WARNA (Hex Code Opsional)"],
			["Pertemuan Biasa", "#3b82f6"],
			["Praktikum", "#10b981"]
		];
		const wsKatSilabus = wb.addWorksheet("12_Kategori_Modul");
		katSilabusData.forEach((row) => wsKatSilabus.addRow(row));
		var cols = [{ wch: 30 }, { wch: 30 }];
		cols.forEach((col, idx) => {
			if (col.wch) wsKatSilabus.getColumn(idx + 1).width = col.wch;
		});
		// 13_Absensi_Guru
		const absensiData = [
			["PEMBERITAHUAN"],
			["Sheet 13_Absensi_Guru ini HANYA UNTUK KEPERLUAN EXPORT DATA."],
			["Anda tidak dapat melakukan import absen masa lalu melalui file Excel ini."]
		];
		const wsAbsensi = wb.addWorksheet("13_Absensi_Guru");
		absensiData.forEach((row) => wsAbsensi.addRow(row));
		var cols = [{ wch: 80 }];
		cols.forEach((col, idx) => {
			if (col.wch) wsAbsensi.getColumn(idx + 1).width = col.wch;
		});
		// 14_Karyawan
		const karyawanData = [
			[
				"KODE KARYAWAN (Wajib)",
				"NAMA KARYAWAN (Wajib)",
				"DIVISI / BAGIAN",
				"NO WHATSAPP"
			],
			[
				"K01",
				"Budi Santoso",
				"Kebersihan",
				"'081234567890"
			],
			[
				"K02",
				"Siti Aminah",
				"Tata Usaha",
				"'081298765432"
			]
		];
		const wsKaryawan = wb.addWorksheet("14_Karyawan");
		karyawanData.forEach((row) => wsKaryawan.addRow(row));
		var cols = [
			{ wch: 25 },
			{ wch: 40 },
			{ wch: 25 },
			{ wch: 25 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsKaryawan.getColumn(idx + 1).width = col.wch;
		});
		// 15_Siswa
		const siswaData = [
			[
				"NIS / NISN (Wajib)",
				"NAMA SISWA (Wajib)",
				"KELAS (Sesuai Data Kelas)",
				"JENIS KELAMIN (L/P)",
				"NO WHATSAPP ORTU"
			],
			[
				"1001",
				"Ahmad Yusuf",
				"X RPL 1",
				"L",
				"'081234567890"
			],
			[
				"1002",
				"Bunga Lestari",
				"X RPL 1",
				"P",
				"'081298765432"
			]
		];
		const wsSiswa = wb.addWorksheet("15_Siswa");
		siswaData.forEach((row) => wsSiswa.addRow(row));
		var cols = [
			{ wch: 25 },
			{ wch: 45 },
			{ wch: 35 },
			{ wch: 25 },
			{ wch: 25 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsSiswa.getColumn(idx + 1).width = col.wch;
		});
		const buf = await wb.xlsx.writeBuffer();
		saveAs(new Blob([buf]), `Template Master Data ${appSettings.appName || "TimeSchedule"}.xlsx`);
		showNotification("Template Master Data berhasil diunduh.", "success");
	};
	async function exportAllDataToExcel() {
		const ExcelJS = (await import('/node_modules/.vite/deps/exceljs.js?v=187f8eff').then(m => ((m, n) => n || !m?.__esModule ? {	...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {},	default: m} : m)(m.default, 1))).default;
		const { saveAs } = await import('/node_modules/.vite/deps/file-saver.js?v=187f8eff').then(m => ((m, n) => n || !m?.__esModule ? {	...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {},	default: m} : m)(m.default, 1));
		const wb = new ExcelJS.Workbook();
		const jurusanData = [["Nama Jurusan (wajib)"], ...majors.map((m) => [m])];
		const wsJurusan = wb.addWorksheet("1_Jurusan");
		jurusanData.forEach((row) => wsJurusan.addRow(row));
		var cols = [{ wch: 36 }];
		cols.forEach((col, idx) => {
			if (col.wch) wsJurusan.getColumn(idx + 1).width = col.wch;
		});
		const kelasData = [[
			"Nama Kelas (wajib)",
			"Jurusan (pilih dari Data Jurusan)",
			"Wali Kelas"
		], ...classes.map((c) => [
			c.name,
			c.major,
			c.homeroom || ""
		])];
		const wsKelas = wb.addWorksheet("2_Kelas");
		kelasData.forEach((row) => wsKelas.addRow(row));
		var cols = [
			{ wch: 34 },
			{ wch: 36 },
			{ wch: 34 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsKelas.getColumn(idx + 1).width = col.wch;
		});
		const guruData = [[
			"Kode Guru (wajib)",
			"Nama Guru (wajib)",
			"Password",
			"Kategori (Umum/Jurusan/Campuran)",
			"Prioritas Jurusan",
			"Prioritas Tingkat",
			"Target JP/Minggu"
		], ...teachers.map((t) => [
			t.code,
			t.name,
			"",
			t.type,
			t.preferredMajor,
			t.preferredGrade,
			t.targetWeeklyJp || ""
		])];
		const wsGuru = wb.addWorksheet("3_Guru");
		guruData.forEach((row) => wsGuru.addRow(row));
		var cols = [
			{ wch: 20 },
			{ wch: 40 },
			{ wch: 14 },
			{ wch: 28 },
			{ wch: 22 },
			{ wch: 20 },
			{ wch: 18 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsGuru.getColumn(idx + 1).width = col.wch;
		});
		const mapelData = [[
			"Nama Mapel (wajib)",
			"Grade (X/XI/XII/Semua)",
			"Jurusan (Umum/TKR/TKJ/RPL/Akuntansi)",
			"Praktik? (Ya/Tidak)",
			"Ruangan Praktik (ID dipisah koma)",
			"Durasi"
		], ...subjects.map((s) => [
			s.name,
			s.grade,
			s.major,
			s.isBlock ? "Ya" : "Tidak",
			s.practiceRoomIds || "",
			s.defaultDuration
		])];
		const wsMapel = wb.addWorksheet("4_Mapel");
		mapelData.forEach((row) => wsMapel.addRow(row));
		var cols = [
			{ wch: 36 },
			{ wch: 26 },
			{ wch: 44 },
			{ wch: 20 },
			{ wch: 40 },
			{ wch: 10 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsMapel.getColumn(idx + 1).width = col.wch;
		});
		const ruanganData = [[
			"ID Ruang (wajib)",
			"Nama Ruangan (wajib)",
			"Tipe (Teori/Praktik)",
			"Jurusan (All/TKR/TKJ/RPL/Akuntansi)",
			"Target Tingkat (Semua/X/XI/XII)",
			"Prioritas (Ya/Tidak)"
		], ...rooms.map((r) => [
			r.id,
			r.name,
			r.type,
			r.major,
			r.targetGrade || "Semua",
			r.isPriority ? "Ya" : "Tidak"
		])];
		const wsRuangan = wb.addWorksheet("5_Ruangan");
		ruanganData.forEach((row) => wsRuangan.addRow(row));
		var cols = [
			{ wch: 20 },
			{ wch: 34 },
			{ wch: 22 },
			{ wch: 40 },
			{ wch: 28 },
			{ wch: 20 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsRuangan.getColumn(idx + 1).width = col.wch;
		});
		const bebanData = [[
			"Kode Guru",
			"Nama Mapel",
			"Target Grade (All/X/XI/XII atau X,XI)",
			"Target Jurusan (All/TKR/TKJ/RPL/Akuntansi)",
			"Durasi",
			"Maks Kelas (opsional)"
		], ...teachingLoads.map((b) => [
			b.teacherCode,
			b.subject,
			b.targetGrade,
			b.targetMajor,
			b.duration,
			b.maxClasses || ""
		])];
		const wsBeban = wb.addWorksheet("6_Beban");
		bebanData.forEach((row) => wsBeban.addRow(row));
		var cols = [
			{ wch: 18 },
			{ wch: 34 },
			{ wch: 40 },
			{ wch: 44 },
			{ wch: 10 },
			{ wch: 22 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsBeban.getColumn(idx + 1).width = col.wch;
		});
		const silabusData = [[
			"Mata Pelajaran (wajib)",
			"Guru Pengajar (wajib)",
			"Judul Pertemuan / BAB (wajib)",
			"Kelas / Semester",
			"Tujuan Pembelajaran",
			"Materi Pembelajaran (pisah enter)",
			"Catatan (opsional)"
		], ...syllabuses.map((s) => [
			s.subjectName,
			s.teacherCode,
			s.title,
			s.gradeSemester || "",
			s.objectives || "",
			s.materials || "",
			s.notes || ""
		])];
		const wsSilabus = wb.addWorksheet("7_Modul");
		silabusData.forEach((row) => wsSilabus.addRow(row));
		var cols = [
			{ wch: 25 },
			{ wch: 20 },
			{ wch: 40 },
			{ wch: 20 },
			{ wch: 50 },
			{ wch: 50 },
			{ wch: 24 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsSilabus.getColumn(idx + 1).width = col.wch;
		});
		const waktuData = [[
			"Hari",
			"Waktu",
			"Apakah Istirahat?",
			"Nama Kegiatan / Istirahat",
			"Jumlah JP",
			"Menit per JP"
		], ...Object.entries(timeSlots || {}).flatMap(([dayName, slots]) => (slots || []).map((slot) => [
			dayName,
			slot.label || "",
			slot.isBreak ? "Ya" : "Tidak",
			slot.isBreak ? slot.labelBreak || slot.label || "" : "",
			slot.isBreak ? "" : slot.jpCount || 1,
			slot.minsPerJp || 45
		]))];
		const wsWaktu = wb.addWorksheet("8_Waktu");
		waktuData.forEach((row) => wsWaktu.addRow(row));
		var cols = [
			{ wch: 16 },
			{ wch: 20 },
			{ wch: 18 },
			{ wch: 30 },
			{ wch: 12 },
			{ wch: 14 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsWaktu.getColumn(idx + 1).width = col.wch;
		});
		const ketersediaanData = [[
			"Kode Guru (wajib)",
			"Mapel Kompetensi (pisahkan dengan koma)",
			"Hari Tersedia (pisahkan dengan koma)"
		], ...teachers.map((t) => {
			const avail = teacherAvailability[t.code] || {
				days: [],
				subjects: []
			};
			return [
				t.code,
				avail.subjects.join(","),
				avail.days.join(",")
			];
		})];
		const wsKetersediaan = wb.addWorksheet("9_Ketersediaan");
		ketersediaanData.forEach((row) => wsKetersediaan.addRow(row));
		var cols = [
			{ wch: 20 },
			{ wch: 50 },
			{ wch: 40 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsKetersediaan.getColumn(idx + 1).width = col.wch;
		});
		const calendarCategoryById = new Map((calendarCategories || []).map((cat) => [cat.id, cat.name]));
		const akademikData = [[
			"Judul Kegiatan",
			"Mulai",
			"Selesai",
			"Kategori",
			"Keterangan"
		], ...(academicCalendar || []).map((evt) => [
			evt.title || "",
			normalizeCalendarDateInput(evt.dateStart) || "",
			normalizeCalendarDateInput(evt.dateEnd || evt.dateStart) || "",
			calendarCategoryById.get(evt.categoryId) || evt.categoryId || "",
			evt.description || ""
		])];
		const wsAkademik = wb.addWorksheet("10_Kalender_Akademik");
		akademikData.forEach((row) => wsAkademik.addRow(row));
		var cols = [
			{ wch: 34 },
			{ wch: 16 },
			{ wch: 16 },
			{ wch: 24 },
			{ wch: 48 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsAkademik.getColumn(idx + 1).width = col.wch;
		});
		const kategoriKalenderData = [["Nama Kategori", "Warna"], ...(calendarCategories || []).map((cat) => [cat.name || "", cat.color || "blue"])];
		const wsKategoriKalender = wb.addWorksheet("11_Kategori_Kalender");
		kategoriKalenderData.forEach((row) => wsKategoriKalender.addRow(row));
		var cols = [{ wch: 30 }, { wch: 16 }];
		cols.forEach((col, idx) => {
			if (col.wch) wsKategoriKalender.getColumn(idx + 1).width = col.wch;
		});
		const kategoriSilabusData = [["Nama Kategori", "Warna"], ...(syllabusCategories || []).map((cat) => [cat.name || "", cat.color || "blue"])];
		const wsKategoriSilabus = wb.addWorksheet("12_Kategori_Modul");
		kategoriSilabusData.forEach((row) => wsKategoriSilabus.addRow(row));
		var cols = [{ wch: 30 }, { wch: 16 }];
		cols.forEach((col, idx) => {
			if (col.wch) wsKategoriSilabus.getColumn(idx + 1).width = col.wch;
		});
		const absensiData = [[
			"Tanggal",
			"Waktu",
			"Kode Guru",
			"Nama Guru",
			"Sesi",
			"Status",
			"Mode",
			"Catatan",
			"Lokasi (Lat, Lng)"
		], ...(attendanceRecords || []).map((record) => [
			record.date || "",
			record.time || "",
			record.teacherCode || "",
			getTeacherName(record.teacherCode) || "",
			record.sessionName || "",
			record.status || "",
			record.mode || "",
			record.note || "",
			record.location ? `${record.location.lat}, ${record.location.lng}` : ""
		])];
		const wsAbsensi = wb.addWorksheet("13_Absensi_Guru");
		absensiData.forEach((row) => wsAbsensi.addRow(row));
		var cols = [
			{ wch: 14 },
			{ wch: 12 },
			{ wch: 14 },
			{ wch: 34 },
			{ wch: 20 },
			{ wch: 14 },
			{ wch: 12 },
			{ wch: 30 },
			{ wch: 24 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsAbsensi.getColumn(idx + 1).width = col.wch;
		});
		const karyawanData = [[
			"KODE KARYAWAN (Wajib)",
			"NAMA KARYAWAN (Wajib)",
			"DIVISI / BAGIAN",
			"NO WHATSAPP"
		], ...(staffs || []).map((k) => [
			k.code || "",
			k.name || "",
			k.division || "",
			k.phone ? `'${k.phone}` : ""
		])];
		const wsKaryawan = wb.addWorksheet("14_Karyawan");
		karyawanData.forEach((row) => wsKaryawan.addRow(row));
		var cols = [
			{ wch: 25 },
			{ wch: 40 },
			{ wch: 25 },
			{ wch: 25 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsKaryawan.getColumn(idx + 1).width = col.wch;
		});
		const siswaData = [[
			"NIS / NISN (Wajib)",
			"NAMA SISWA (Wajib)",
			"KELAS (Sesuai Data Kelas)",
			"JENIS KELAMIN (L/P)",
			"NO WHATSAPP ORTU"
		], ...(students || []).map((s) => {
			const hp = s.wa_ortu || s.phone || "";
			return [
				s.nis || s.code || "",
				s.name || s.nama || "",
				s.class_name || s.kelas || "",
				s.gender || "",
				hp ? `'${hp}` : ""
			];
		})];
		const wsSiswa = wb.addWorksheet("15_Siswa");
		siswaData.forEach((row) => wsSiswa.addRow(row));
		var cols = [
			{ wch: 25 },
			{ wch: 45 },
			{ wch: 35 },
			{ wch: 25 },
			{ wch: 25 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsSiswa.getColumn(idx + 1).width = col.wch;
		});
		const buf = await wb.xlsx.writeBuffer();
		saveAs(new Blob([buf]), `Export Data ${appSettings.appName || "TimeSchedule"}.xlsx`);
		showNotification("Data berhasil diekspor ke Excel.", "success");
	}
	async function exportAbsensiGuruToExcel(recordsToExport = attendanceRecords) {
		const ExcelJS = (await import('/node_modules/.vite/deps/exceljs.js?v=187f8eff').then(m => ((m, n) => n || !m?.__esModule ? {	...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {},	default: m} : m)(m.default, 1))).default;
		const { saveAs } = await import('/node_modules/.vite/deps/file-saver.js?v=187f8eff').then(m => ((m, n) => n || !m?.__esModule ? {	...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {},	default: m} : m)(m.default, 1));
		const wb = new ExcelJS.Workbook();
		const absensiData = [[
			"Tanggal",
			"Waktu",
			"Kode Guru",
			"Nama Guru",
			"Sesi",
			"Status",
			"Mode",
			"Catatan",
			"Lokasi (Lat, Lng)"
		], ...(recordsToExport || []).map((record) => [
			record.date || "",
			record.time || "",
			record.teacherCode || "",
			getTeacherName(record.teacherCode) || "",
			record.sessionName || "",
			record.status || "",
			record.mode || "",
			record.note || "",
			record.location ? `${record.location.lat}, ${record.location.lng}` : ""
		])];
		const wsAbsensi = wb.addWorksheet("Laporan_Absensi_Guru");
		absensiData.forEach((row) => wsAbsensi.addRow(row));
		var cols = [
			{ wch: 14 },
			{ wch: 12 },
			{ wch: 14 },
			{ wch: 34 },
			{ wch: 20 },
			{ wch: 14 },
			{ wch: 12 },
			{ wch: 30 },
			{ wch: 24 }
		];
		cols.forEach((col, idx) => {
			if (col.wch) wsAbsensi.getColumn(idx + 1).width = col.wch;
		});
		const tgl = new Date().toISOString().split("T")[0];
		const buf = await wb.xlsx.writeBuffer();
		saveAs(new Blob([buf]), `Laporan_Absensi_Guru_${tgl}.xlsx`);
		showNotification("Laporan Absensi berhasil diekspor ke Excel.", "success");
	}
	const handleFileUpload = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const ext = file.name.split(".").pop().toLowerCase();
		if (ext === "xlsx" || ext === "xls" || ext === "xlsm") {
			const reader = new FileReader();
			reader.onload = async (evt) => {
				try {
					const ExcelJS = (await import('/node_modules/.vite/deps/exceljs.js?v=187f8eff').then(m => ((m, n) => n || !m?.__esModule ? {	...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {},	default: m} : m)(m.default, 1))).default;
					const workbook = new ExcelJS.Workbook();
					await workbook.xlsx.load(new Uint8Array(evt.target.result));
					const ws = workbook.worksheets[0];
					const rawData = [];
					ws.eachRow({ includeEmpty: true }, (row) => {
						const r = [];
						row.eachCell({ includeEmpty: true }, (cell) => r.push(cell.value ?? ""));
						rawData.push(r);
					});
					const text = rawData.map((r) => r.join("	")).join("\n");
					setBulkText(text);
					analyzeBulkData(text);
				} catch (err) {
					console.error(err);
					showNotification(err.message || "Gagal membaca file Excel. Pastikan format valid.", "error");
				}
			};
			reader.onerror = () => showNotification("File Excel gagal dibaca. Coba pilih ulang file atau periksa izin file.", "error");
			reader.readAsArrayBuffer(file);
		} else {
			const reader = new FileReader();
			reader.onload = (evt) => {
				setBulkText(evt.target.result);
				analyzeBulkData(evt.target.result);
			};
			reader.onerror = () => showNotification("File gagal dibaca. Coba pilih ulang file atau periksa izin file.", "error");
			reader.readAsText(file);
		}
		if (fileInputRef.current) fileInputRef.current.value = "";
	};
	const handlePreviewImport = () => {
		if (!bulkText.trim()) {
			showNotification("Teks data masih kosong.", "warning");
			return;
		}
		analyzeBulkData(bulkText);
	};
	const handleProcessImport = async () => {
		await handleBulkText();
	};
	const analyzeBulkData = (text) => {
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
				reasons: { invalid: 0 },
				type: activeTab
			});
			showNotification("Tab ini belum mendukung import massal.", "warning");
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
			reasons: { invalid: 0 },
			type: activeTab
		};
		const requiredColumns = importConfig.requiredColumns || 0;
		const pushSample = (sample) => {
			if (summary.samples.length < 5) summary.samples.push(sample);
		};
		const pushIssue = (lineNumber, reason, message) => {
			summary.skipped++;
			summary.reasons[reason] = (summary.reasons[reason] || 0) + 1;
			if (summary.issues.length < 5) summary.issues.push(`Baris ${lineNumber}: ${message}`);
		};
		if (activeTab === "jurusan") {
			const existing = new Set(majors.map(normalizeText));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "nama jurusan kosong");
					return;
				}
				const name = String(row[0] || "").trim();
				if (!name) {
					pushIssue(lineNumber, "invalid", "nama jurusan kosong");
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
		} else if (activeTab === "kelas") {
			const existing = new Set(classes.map(getClassKey));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format kelas tidak lengkap");
					return;
				}
				const [nameRaw, majorRaw, homeroomRaw] = row;
				const name = String(nameRaw || "").trim();
				const major = String(majorRaw || "").trim();
				const homeroom = String(homeroomRaw || "").trim();
				if (!name || !major) {
					pushIssue(lineNumber, "invalid", "format kelas tidak lengkap");
					return;
				}
				summary.valid++;
				const key = getClassKey({ name });
				if (existing.has(key)) {
					summary.updated++;
					pushSample(`${name} | ${major}${homeroom ? ` | Wali: ${homeroom}` : ""} (Update)`);
					return;
				}
				existing.add(key);
				summary.inserted++;
				pushSample(`${name} | ${major}${homeroom ? ` | Wali: ${homeroom}` : ""}`);
			});
		} else if (activeTab === "ruangan") {
			const existing = new Set(rooms.map(getRoomKey));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format ruangan tidak lengkap");
					return;
				}
				const [idRaw, nameRaw, typeRaw, majorRaw, targetGradeRaw, isPriorityRaw] = row;
				const id = String(idRaw || "").trim().toUpperCase();
				const name = String(nameRaw || "").trim();
				const type = String(typeRaw || "").trim();
				const major = String(majorRaw || "").trim();
				if (!id || !name || !type || !major) {
					pushIssue(lineNumber, "invalid", "format ruangan tidak lengkap");
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
				const targetGrade = String(targetGradeRaw || "Semua").trim() || "Semua";
				const isPriority = [
					"ya",
					"true",
					"1"
				].includes(String(isPriorityRaw || "").trim().toLowerCase());
				pushSample(`${id} | ${name} | ${type} | ${major} | ${targetGrade}${isPriority ? " | Prioritas" : ""}`);
			});
		} else if (activeTab === "guru") {
			const existing = new Set(teachers.map(getTeacherKey));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format guru tidak lengkap");
					return;
				}
				const [codeRaw, nameRaw, passwordRaw, typeRaw, majorRaw, gradeRaw, targetJpRaw] = row;
				const code = String(codeRaw || "").trim().toUpperCase();
				const name = String(nameRaw || "").trim();
				const targetJp = parsePositiveInt(targetJpRaw, "");
				if (!code || !name) {
					pushIssue(lineNumber, "invalid", "format guru tidak lengkap");
					return;
				}
				summary.valid++;
				const key = getTeacherKey({ code });
				if (existing.has(key)) {
					summary.updated++;
					pushSample(`${code} | ${name} | ${String(passwordRaw || "123").trim() || "123"} | ${String(typeRaw || "Umum").trim() || "Umum"} | ${String(majorRaw || "Semua").trim() || "Semua"} | ${String(gradeRaw || "Semua").trim() || "Semua"} | ${targetJp || "-"} JP (Update)`);
					return;
				}
				existing.add(key);
				summary.inserted++;
				pushSample(`${code} | ${name} | ${String(passwordRaw || "123").trim() || "123"} | ${String(typeRaw || "Umum").trim() || "Umum"} | ${String(majorRaw || "Semua").trim() || "Semua"} | ${String(gradeRaw || "Semua").trim() || "Semua"} | ${targetJp || "-"} JP`);
			});
		} else if (activeTab === "mapel") {
			const existing = new Set(subjects.map(getSubjectKey));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format mapel tidak lengkap");
					return;
				}
				const [nameRaw, gradeRaw, majorRaw, blockRaw, fifthColumn, sixthColumn] = row;
				const name = String(nameRaw || "").trim();
				const grade = String(gradeRaw || "").trim();
				const major = String(majorRaw || "").trim();
				const isBlock = String(blockRaw || "").trim().toLowerCase() === "ya";
				const hasPracticeRoomColumn = row.length >= 6;
				const duration = parseInt(hasPracticeRoomColumn ? sixthColumn : fifthColumn, 10) || 2;
				const practiceRoomIds = serializeCsvList(parseCsvList(hasPracticeRoomColumn ? fifthColumn : ""));
				if (!name || !grade || !major) {
					pushIssue(lineNumber, "invalid", "format mapel tidak lengkap");
					return;
				}
				summary.valid++;
				const key = getSubjectKey({ name });
				if (existing.has(key)) {
					summary.updated++;
					pushSample(`${name} | ${grade} | ${major} | ${isBlock ? "Praktik" : "Teori"} | ${practiceRoomIds || "Semua Ruang Praktik"} | ${duration} JP (Update)`);
					return;
				}
				existing.add(key);
				summary.inserted++;
				pushSample(`${name} | ${grade} | ${major} | ${isBlock ? "Praktik" : "Teori"} | ${practiceRoomIds || "Semua Ruang Praktik"} | ${duration} JP`);
			});
		} else if (activeTab === "beban") {
			const existing = new Set(teachingLoads.map(getLoadKey));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format beban tidak lengkap");
					return;
				}
				const [teacherCodeRaw, subjectRaw, targetGradeRaw, targetMajorRaw, durationRaw] = row;
				const teacherCode = String(teacherCodeRaw || "").trim().toUpperCase();
				const subject = String(subjectRaw || "").trim();
				const targetGrade = String(targetGradeRaw || "").trim() || "All";
				const targetMajor = String(targetMajorRaw || "").trim() || "All";
				const duration = parseInt(durationRaw, 10) || 2;
				if (!teacherCode || !subject) {
					pushIssue(lineNumber, "invalid", "format beban tidak lengkap");
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
		} else if (activeTab === "silabus" || activeTab === "silabusguru") {
			const getSyllabusImportKey = (item) => [
				normalizeText(item.subjectName),
				normalizeText(item.teacherCode),
				normalizeText(item.title),
				normalizeText(item.gradeSemester || "")
			].join("__");
			const existing = new Set((syllabuses || []).map(getSyllabusImportKey));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format silabus tidak lengkap");
					return;
				}
				const [subjectName, teacherCode, title, gradeSemester] = row;
				if (!subjectName || !teacherCode || !title) {
					pushIssue(lineNumber, "invalid", "format silabus tidak lengkap");
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
		} else if (activeTab === "pengaturan") {
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format waktu tidak lengkap");
					return;
				}
				const [dayName, label, isBreak, labelBreak] = row;
				if (!dayName || !label) {
					pushIssue(lineNumber, "invalid", "hari atau waktu kosong");
					return;
				}
				summary.valid++;
				summary.inserted++;
				pushSample(`${dayName} | ${label} | ${isBreak === "ya" ? "Istirahat (" + labelBreak + ")" : "KBM"}`);
			});
		} else if (activeTab === "ketersediaan") {
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format ketersediaan tidak lengkap");
					return;
				}
				const [code, subjects, days] = row;
				if (!code) {
					pushIssue(lineNumber, "invalid", "kode guru kosong");
					return;
				}
				summary.valid++;
				summary.updated++;
				pushSample(`${code} | Mapel: ${subjects || "-"} | Hari: ${days || "-"}`);
			});
		} else if (activeTab === "akademik") {
			const existing = new Set(academicCalendar.map((evt) => [
				normalizeText(evt.title),
				normalizeCalendarDateInput(evt.dateStart),
				normalizeCalendarDateInput(evt.dateEnd || evt.dateStart)
			].join("__")));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format kalender tidak lengkap");
					return;
				}
				const [titleRaw, startRaw, endRaw, categoryRaw, descriptionRaw] = row;
				const title = String(titleRaw || "").trim();
				const dateStart = normalizeCalendarDateInput(startRaw);
				const dateEnd = normalizeCalendarDateInput(endRaw || startRaw);
				const categoryLabel = String(categoryRaw || "").trim();
				const description = String(descriptionRaw || "").trim();
				if (!title || !dateStart) {
					pushIssue(lineNumber, "invalid", "judul atau tanggal mulai kosong");
					return;
				}
				if (dateEnd && dateEnd < dateStart) {
					pushIssue(lineNumber, "invalid", "tanggal selesai lebih awal dari tanggal mulai");
					return;
				}
				summary.valid++;
				const key = [
					normalizeText(title),
					dateStart,
					dateEnd || dateStart
				].join("__");
				if (existing.has(key)) {
					summary.updated++;
					pushSample(`${title} | ${formatCalendarDateRange(dateStart, dateEnd)} | ${categoryLabel || "Kategori aktif"} (Update)`);
					return;
				}
				existing.add(key);
				summary.inserted++;
				pushSample(`${title} | ${formatCalendarDateRange(dateStart, dateEnd)} | ${categoryLabel || "Kategori aktif"}`);
			});
		} else if (activeTab === "karyawan") {
			const existing = new Set((staffs || []).map((k) => String(k.code || "").trim().toLowerCase()));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format karyawan tidak lengkap");
					return;
				}
				const [codeRaw, nameRaw, divRaw, phoneRaw] = row;
				const code = String(codeRaw || "").trim().toUpperCase();
				const name = String(nameRaw || "").trim();
				if (!code || !name) {
					pushIssue(lineNumber, "invalid", "kode atau nama kosong");
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
		} else if (activeTab === "siswa") {
			const existing = new Set((students || []).map((s) => String(s.nis || s.code || "").trim().toLowerCase()));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "format siswa tidak lengkap");
					return;
				}
				const [nisRaw, nameRaw, classRaw, genderRaw, phoneRaw] = row;
				const nis = String(nisRaw || "").trim();
				const name = String(nameRaw || "").trim();
				if (!nis || !name) {
					pushIssue(lineNumber, "invalid", "NIS atau nama kosong");
					return;
				}
				summary.valid++;
				const key = nis.toLowerCase();
				if (existing.has(key)) {
					summary.updated++;
					pushSample(`${nis} | ${name} | ${classRaw || ""} (Update)`);
					return;
				}
				existing.add(key);
				summary.inserted++;
				pushSample(`${nis} | ${name} | ${classRaw || ""}`);
			});
		} else if (activeTab === "kategori_kalender" || activeTab === "kategori_silabus") {
			const existingCategories = activeTab === "kategori_kalender" ? calendarCategories : syllabusCategories;
			const existing = new Set((existingCategories || []).map((cat) => normalizeText(cat.name)));
			rows.forEach((row, index) => {
				const lineNumber = index + 1;
				if (row.length < requiredColumns) {
					pushIssue(lineNumber, "invalid", "nama kategori kosong");
					return;
				}
				const name = String(row[0] || "").trim();
				const color = String(row[1] || "blue").trim() || "blue";
				if (!name) {
					pushIssue(lineNumber, "invalid", "nama kategori kosong");
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
	const processBulkData = async (text) => {
		try {
			if (currentUser?.authToken && (!databaseHydrated || databaseHydrationFailedRef.current)) {
				showNotification("Tunggu database selesai sinkron sebelum import. Ini mencegah data tertimpa/reset.", "error");
				return false;
			}
			const importConfig = BULK_IMPORT_CONFIG[activeTab];
			if (!importConfig) {
				showNotification("Tab ini belum mendukung import massal.", "warning");
				return false;
			}
			const rows = parseBulkTextRows(text, activeTab);
			if (rows.length === 0) {
				showNotification("Tidak ada baris data yang bisa diproses.", "warning");
				return false;
			}
			const requiredColumns = importConfig.requiredColumns || 0;
			let inserted = 0;
			let updated = 0;
			let skipped = 0;
			if (activeTab === "jurusan") {
				let insertedCount = 0;
				let updatedCount = 0;
				setMajors((prev) => {
					const map = new Map(prev.map((major) => {
						const name = typeof major === "object" && major !== null ? major.name || major.payload || "" : String(major || "");
						return [normalizeText(name), name];
					}));
					rows.forEach((row) => {
						if (row.length < requiredColumns) {
							skipped++;
							return;
						}
						const name = String(row[0] || "").trim();
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
			} else if (activeTab === "kelas") {
				let insertedCount = 0;
				let updatedCount = 0;
				setClasses((prev) => {
					const map = new Map(prev.map((c) => [getClassKey(c), c]));
					rows.forEach((row) => {
						if (row.length < requiredColumns) {
							skipped++;
							return;
						}
						const name = String(row[0] || "").trim();
						const major = String(row[1] || "").trim();
						const homeroom = String(row[2] || "").trim();
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
			} else if (activeTab === "ruangan") {
				let insertedCount = 0;
				let updatedCount = 0;
				setRooms((prev) => {
					const map = new Map(prev.map((r) => [getRoomKey(r), r]));
					rows.forEach((row) => {
						if (row.length < requiredColumns) {
							skipped++;
							return;
						}
						const id = String(row[0] || "").trim().toUpperCase();
						const name = String(row[1] || "").trim();
						const type = String(row[2] || "").trim();
						const major = String(row[3] || "").trim();
						const targetGrade = String(row[4] || "Semua").trim() || "Semua";
						const isPriority = [
							"ya",
							"true",
							"1"
						].includes(String(row[5] || "").trim().toLowerCase());
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
			} else if (activeTab === "guru") {
				let insertedCount = 0;
				let updatedCount = 0;
				const defaultImportedPassword = await hashPassword("123");
				const importedTeachers = [];
				for (const row of rows) {
					if (row.length < requiredColumns) {
						skipped++;
						continue;
					}
					const code = String(row[0] || "").trim().toUpperCase();
					const name = String(row[1] || "").trim();
					const passwordRaw = String(row[2] ?? "").trim();
					const typeRaw = String(row[3] || "Umum").trim() || "Umum";
					const majorRaw = String(row[4] || "Semua").trim() || "Semua";
					const gradeRaw = String(row[5] || "Semua").trim() || "Semua";
					const targetJp = parsePositiveInt(row[6], "");
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
				const teacherMap = new Map(teachers.map((teacher) => [getTeacherKey(teacher), teacher]));
				importedTeachers.forEach((item) => {
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
			} else if (activeTab === "mapel") {
				let insertedCount = 0;
				let updatedCount = 0;
				setSubjects((prev) => {
					const map = new Map(prev.map((s) => [getSubjectKey(s), s]));
					rows.forEach((row) => {
						if (row.length < requiredColumns) {
							skipped++;
							return;
						}
						const name = String(row[0] || "").trim();
						const grade = String(row[1] || "").trim();
						const major = String(row[2] || "").trim();
						const isBlock = String(row[3] || "").trim().toLowerCase() === "ya";
						const hasPracticeRoomColumn = row.length >= 6;
						const duration = parseInt(hasPracticeRoomColumn ? row[5] : row[4], 10) || 2;
						const practiceRoomIds = serializeCsvList(parseCsvList(hasPracticeRoomColumn ? row[4] : ""));
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
			} else if (activeTab === "beban") {
				let insertedCount = 0;
				let updatedCount = 0;
				setTeachingLoads((prev) => {
					const map = new Map(prev.map((l) => [getLoadKey(l), l]));
					rows.forEach((row) => {
						if (row.length < requiredColumns) {
							skipped++;
							return;
						}
						const teacherCode = String(row[0] || "").trim().toUpperCase();
						const subject = String(row[1] || "").trim();
						const targetGrade = String(row[2] || "").trim() || "All";
						const targetMajor = String(row[3] || "").trim() || "All";
						const duration = parseInt(row[4], 10) || 2;
						const hasMaxClassesValue = row.length > 5 && String(row[5] ?? "").trim() !== "";
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
								...hasMaxClassesValue ? { maxClasses } : {}
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
			} else if (activeTab === "pengaturan") {
				let insertedCount = 0;
				let updatedCount = 0;
				const newDays = new Set(days);
				const newTimeSlots = { ...timeSlots };
				rows.forEach((row) => {
					if (row.length < requiredColumns) {
						skipped++;
						return;
					}
					const dayName = String(row[0] || "").trim();
					const label = String(row[1] || "").trim();
					const isBreakStr = String(row[2] || "").trim().toLowerCase();
					const labelBreak = String(row[3] || "").trim();
					const isBreak = isBreakStr === "ya" || isBreakStr === "true" || isBreakStr === "1";
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
					const existingSlotIndex = newTimeSlots[dayName].findIndex((s) => sameText(s.label, label));
					if (existingSlotIndex !== -1) {
						newTimeSlots[dayName][existingSlotIndex] = {
							...newTimeSlots[dayName][existingSlotIndex],
							isBreak,
							labelBreak: isBreak ? labelBreak : "",
							jpCount,
							minsPerJp
						};
						updatedCount++;
					} else {
						newTimeSlots[dayName].push({
							id: `${dayName}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
							label,
							isBreak,
							labelBreak: isBreak ? labelBreak : "",
							jpCount,
							minsPerJp
						});
						insertedCount++;
					}
				});
				Object.keys(newTimeSlots).forEach((day) => {
					newTimeSlots[day].sort((a, b) => a.label.localeCompare(b.label));
				});
				const nextDays = Array.from(newDays);
				setDays(nextDays);
				setTimeSlots(newTimeSlots);
				setTeacherAvailability((prev) => {
					const next = { ...prev };
					const teacherCodes = new Set([...Object.keys(prev), ...teachers.map((teacher) => teacher.code).filter(Boolean)]);
					teacherCodes.forEach((code) => {
						const entry = next[code] || {
							days: [],
							subjects: []
						};
						const existingDays = Array.isArray(entry.days) ? entry.days.filter((day) => newDays.has(day)) : [];
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
			} else if (activeTab === "silabus" || activeTab === "silabusguru") {
				let insertedCount = 0;
				let updatedCount = 0;
				const getSyllabusImportKey = (item) => [
					normalizeText(item.subjectName),
					normalizeText(item.teacherCode),
					normalizeText(item.title),
					normalizeText(item.gradeSemester || "")
				].join("__");
				const syllabusMap = new Map((syllabuses || []).map((item) => [getSyllabusImportKey(item), item]));
				rows.forEach((row) => {
					if (row.length < requiredColumns) {
						skipped++;
						return;
					}
					const subjectName = String(row[0] || "").trim();
					const teacherCode = String(row[1] || "").trim().toUpperCase();
					const title = String(row[2] || "").trim();
					const gradeSemester = String(row[3] || "").trim();
					const objectives = String(row[4] || "").trim();
					const materials = String(row[5] || "").trim();
					const notes = String(row[6] || "").trim();
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
						...existingItem || {},
						id: existingItem?.id || `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`,
						subjectName,
						teacherCode,
						title,
						gradeSemester,
						objectives,
						materials,
						notes
					});
					if (existingItem) updatedCount++;
					else insertedCount++;
				});
				useAppStore.setState({ syllabuses: Array.from(syllabusMap.values()) });
				inserted = insertedCount;
				updated = updatedCount;
			} else if (activeTab === "akademik") {
				const categoryMap = new Map(calendarCategories.map((cat) => [normalizeText(cat.name), cat.id]));
				const categoryIds = new Set(calendarCategories.map((cat) => cat.id));
				const nextCategories = [...calendarCategories];
				const eventMap = new Map(academicCalendar.map((evt) => {
					const key = [
						normalizeText(evt.title),
						normalizeCalendarDateInput(evt.dateStart),
						normalizeCalendarDateInput(evt.dateEnd || evt.dateStart)
					].join("__");
					return [key, evt];
				}));
				let insertedCount = 0;
				let updatedCount = 0;
				rows.forEach((row) => {
					if (row.length < requiredColumns) {
						skipped++;
						return;
					}
					const [titleRaw, startRaw, endRaw, categoryRaw, descriptionRaw] = row;
					const title = String(titleRaw || "").trim();
					const dateStart = normalizeCalendarDateInput(startRaw);
					const dateEnd = normalizeCalendarDateInput(endRaw || startRaw);
					const categoryLabel = String(categoryRaw || "").trim();
					const description = String(descriptionRaw || "").trim();
					if (!title || !dateStart) {
						skipped++;
						return;
					}
					if (dateEnd && dateEnd < dateStart) {
						skipped++;
						return;
					}
					let categoryId = calendarCategories[0]?.id || "";
					if (categoryLabel) {
						const normalizedCategory = normalizeText(categoryLabel);
						categoryId = categoryMap.get(normalizedCategory) || getCalendarCategoryIdByLabel(categoryLabel);
						if (!categoryIds.has(categoryId)) {
							categoryIds.add(categoryId);
							categoryMap.set(normalizedCategory, categoryId);
							nextCategories.push({
								id: categoryId,
								name: categoryLabel,
								color: "blue"
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
					const key = [
						normalizeText(title),
						event.dateStart,
						event.dateEnd
					].join("__");
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
			} else if (activeTab === "karyawan") {
				let insertedCount = 0;
				let updatedCount = 0;
				const existingMap = new Map((staffs || []).map((k) => [String(k.code || "").trim().toLowerCase(), k]));
				rows.forEach((row) => {
					if (row.length < requiredColumns) {
						skipped++;
						return;
					}
					const [codeRaw, nameRaw, divRaw, phoneRaw] = row;
					const code = String(codeRaw || "").trim().toUpperCase();
					const name = String(nameRaw || "").trim();
					if (!code || !name) {
						skipped++;
						return;
					}
					const key = code.toLowerCase();
					if (existingMap.has(key)) {
						existingMap.set(key, {
							...existingMap.get(key),
							name,
							division: String(divRaw || "").trim(),
							phone: String(phoneRaw || "").trim()
						});
						updatedCount++;
					} else {
						existingMap.set(key, {
							code,
							name,
							division: String(divRaw || "").trim(),
							phone: String(phoneRaw || "").trim()
						});
						insertedCount++;
					}
				});
				if (setStaffs) setStaffs(Array.from(existingMap.values()));
				inserted = insertedCount;
				updated = updatedCount;
			} else if (activeTab === "siswa") {
				let insertedCount = 0;
				let updatedCount = 0;
				const existingMap = new Map((students || []).map((s) => [String(s.nis || s.code || "").trim().toLowerCase(), s]));
				rows.forEach((row) => {
					if (row.length < requiredColumns) {
						skipped++;
						return;
					}
					const [nisRaw, nameRaw, classRaw, genderRaw, phoneRaw] = row;
					const nis = String(nisRaw || "").trim();
					const name = String(nameRaw || "").trim();
					if (!nis || !name) {
						skipped++;
						return;
					}
					const key = nis.toLowerCase();
					if (existingMap.has(key)) {
						existingMap.set(key, {
							...existingMap.get(key),
							name,
							nama: name,
							class_name: String(classRaw || "").trim(),
							kelas: String(classRaw || "").trim(),
							gender: String(genderRaw || "").trim().toUpperCase() === "P" ? "P" : "L",
							wa_ortu: String(phoneRaw || "").trim(),
							phone: String(phoneRaw || "").trim()
						});
						updatedCount++;
					} else {
						existingMap.set(key, {
							nis,
							code: nis,
							name,
							nama: name,
							class_name: String(classRaw || "").trim(),
							kelas: String(classRaw || "").trim(),
							gender: String(genderRaw || "").trim().toUpperCase() === "P" ? "P" : "L",
							wa_ortu: String(phoneRaw || "").trim(),
							phone: String(phoneRaw || "").trim()
						});
						insertedCount++;
					}
				});
				if (setStudents) setStudents(Array.from(existingMap.values()));
				inserted = insertedCount;
				updated = updatedCount;
			} else if (activeTab === "kategori_kalender" || activeTab === "kategori_silabus") {
				const allowedColors = new Set([
					"blue",
					"red",
					"green",
					"emerald",
					"amber",
					"purple",
					"pink",
					"slate",
					"cyan",
					"orange"
				]);
				const normalizeCategoryColor = (value) => {
					const color = String(value || "blue").trim().toLowerCase();
					return allowedColors.has(color) ? color : "blue";
				};
				const sourceCategories = activeTab === "kategori_kalender" ? calendarCategories : syllabusCategories;
				const map = new Map((sourceCategories || []).map((cat) => [normalizeText(cat.name), cat]));
				let insertedCount = 0;
				let updatedCount = 0;
				rows.forEach((row) => {
					if (row.length < requiredColumns) {
						skipped++;
						return;
					}
					const name = String(row[0] || "").trim();
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
							id: `${activeTab === "kategori_kalender" ? "cal-c" : "cat"}-${createClientId()}`,
							name,
							color
						});
						insertedCount++;
					}
				});
				const nextCategories = Array.from(map.values());
				if (activeTab === "kategori_kalender") {
					setCalendarCategories(nextCategories);
				} else {
					useAppStore.setState({ syllabusCategories: nextCategories });
				}
				inserted = insertedCount;
				updated = updatedCount;
			} else if (activeTab === "ketersediaan") {
				let updatedCount = 0;
				setTeacherAvailability((prev) => {
					const next = { ...prev };
					rows.forEach((row) => {
						if (row.length < requiredColumns) {
							skipped++;
							return;
						}
						const code = String(row[0] || "").trim();
						const subjectsStr = String(row[1] || "").trim();
						const daysStr = String(row[2] || "").trim();
						if (!code) {
							skipped++;
							return;
						}
						const subjArray = subjectsStr.split(",").map((s) => s.trim()).filter(Boolean);
						const daysArray = daysStr.split(",").map((d) => d.trim()).filter(Boolean);
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
			showNotification(`Import selesai: +${inserted} ditambahkan, ${updated} diperbarui${skipped ? `, ${skipped} dilewati` : ""}.`, "success");
			setBulkImportPreview(null);
			return true;
		} catch (e) {
			console.error(e);
			showNotification("Format data salah. Pastikan file atau teks menggunakan format Excel/CSV/TXT yang sesuai.", "error");
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
_s(useAdminImportExport, "XxOYWgPlhCWKfH5PSWLIjD3uGLQ=", false, function() {
	return [useAppStore];
});

//# sourceMappingURL=data:application/json;base64,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IjpbInVzZUFkbWluSW1wb3J0RXhwb3J0LmpzeCJdLCJ2ZXJzaW9uIjozLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCVUxLX0lNUE9SVF9DT05GSUcsIHBhcnNlQnVsa1RleHRSb3dzLCB3b3JrYm9va1NoZWV0VG9EZWxpbWl0ZWRUZXh0IH0gZnJvbScuLi8uLi91dGlscy9idWxrSW1wb3J0LmpzJztcbmltcG9ydCB7IHVzZUFwcFN0b3JlIH0gZnJvbScuLi8uLi9zdG9yZS91c2VBcHBTdG9yZS5qcyc7XG5pbXBvcnQgeyBzYW1lVGV4dCwgbm9ybWFsaXplVGV4dCwgZ2V0TG9hZEtleSwgcGFyc2VQb3NpdGl2ZUludCwgc2VyaWFsaXplQ3N2TGlzdCwgcGFyc2VDc3ZMaXN0LCBjcmVhdGVDbGllbnRJZCB9IGZyb20nLi4vLi4vdXRpbHMvYWRtaW5IZWxwZXJzLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHVzZUFkbWluSW1wb3J0RXhwb3J0KHByb3BzKSB7XG4gIGNvbnN0IHsgYWNhZGVtaWNDYWxlbmRhciB9ID0gdXNlQXBwU3RvcmUoKTtcblxuICBjb25zdCB7IFxuICAgIG1hdGNoZXNHcmFkZVRhcmdldCwgZ2V0Um9vbU5hbWUsIHVwZGF0ZVNlbGVjdGlvbkZvclRhYiwgbm9ybWFsaXplVXNlclJvbGUsIGlzU3VwZXJBZG1pblJvbGUsIGNzdlZhbHVlTWF0Y2hlcywgY3N2SW5jbHVkZXNUZXh0LCBwYXJzZVRlYWNoZXJDb2RlcywgZ2V0Q2FwcGVkQ2xhc3NDb3VudCwgZ2V0Q2FsZW5kYXJDYXRlZ29yeUlkQnlMYWJlbCwgZ2V0Q2xhc3NLZXksIGdldFJvb21LZXksIGdldFRlYWNoZXJLZXksIGdldFN1YmplY3RLZXksIGhhc2hQYXNzd29yZCwgc3luY0F1dGhTbmFwc2hvdFNhZmUsIFxuICAgIG5vcm1hbGl6ZUNhbGVuZGFyRGF0ZUlucHV0LCBmb3JtYXRDYWxlbmRhckRhdGVSYW5nZSwgXG4gICAgYWRtaW5Vc2VyLFxuICAgIHNob3dOb3RpZmljYXRpb24sXG4gICAgbWFqb3JzLFxuICAgIGNsYXNzZXMsXG4gICAgdGVhY2hlcnMsXG4gICAgc3ViamVjdHMsXG4gICAgcm9vbXMsXG4gICAgc2NoZWR1bGVDZWxsTWFwLFxuICAgIHRpbWVTbG90cyxcbiAgICBkYXlzLFxuICAgIGFjdGl2ZVRhYixcbiAgICBzZXRCdWxrSW1wb3J0UHJldmlldyxcbiAgICBidWxrSW1wb3J0UHJldmlldyxcbiAgICBjbG9zZU1vZGFsLFxuICAgIHNldE1ham9ycywgc2V0Q2xhc3Nlcywgc2V0Um9vbXMsIHNldFRlYWNoZXJzLCBzZXRTdWJqZWN0cyxcbiAgICBzZXRUZWFjaGluZ0xvYWRzLCBzZXREYXlzLCBzZXRUaW1lU2xvdHMsIHNldFRlYWNoZXJBdmFpbGFiaWxpdHksXG4gICAgc2V0Q2FsZW5kYXJDYXRlZ29yaWVzLCBzZXRBY2FkZW1pY0NhbGVuZGFyLFxuICAgIHN0YWZmcywgc2V0U3RhZmZzLCBzdHVkZW50cywgc2V0U3R1ZGVudHMsXG4gICAgY3VycmVudFVzZXIsIGRhdGFiYXNlSHlkcmF0ZWQsIGRhdGFiYXNlSHlkcmF0aW9uRmFpbGVkUmVmLFxuICAgIGdldFRlYWNoZXJOYW1lLCBzeWxsYWJ1c2VzLCBzZXRTeWxsYWJ1c2VzLCBzeWxsYWJ1c0NhdGVnb3JpZXMsIHNldFN5bGxhYnVzQ2F0ZWdvcmllcyxcbiAgICBhdHRlbmRhbmNlUmVjb3Jkcywgc2V0QXR0ZW5kYW5jZVJlY29yZHMsXG4gICAgYXBwU2V0dGluZ3MsXG4gICAgY2FsZW5kYXJDYXRlZ29yaWVzLFxuICAgIHNldEJ1bGtUZXh0LFxuICAgIGhhbmRsZUJ1bGtUZXh0Q2hhbmdlLFxuICAgIG9wZW5BY2FkZW1pY0NhbGVuZGFyR3VpZGUsXG4gICAgb3BlblRlYWNoZXJHdWlkZSxcbiAgICBvcGVuSW1wb3J0R3VpZGUsXG4gICAgc2V0SXNJbXBvcnRHdWlkZU9wZW4sXG4gICAgZmlsZUlucHV0UmVmLFxuICAgIGJ1bGtUZXh0LFxuICAgIGRvd25sb2FkQWNhZGVtaWNDYWxlbmRhclRlbXBsYXRlLFxuICAgIGRvd25sb2FkVGVhY2hlclRlbXBsYXRlLFxuICAgIHRlYWNoaW5nTG9hZHMsXG4gICAgdGVhY2hlckF2YWlsYWJpbGl0eVxuICB9ID0gcHJvcHMgfHwge307XG5cbiAgY29uc3QgZG93bmxvYWRNYXN0ZXJUZW1wbGF0ZSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBFeGNlbEpTID0gKGF3YWl0IGltcG9ydChcImV4Y2VsanNcIikpLmRlZmF1bHQ7XG4gICAgY29uc3QgeyBzYXZlQXMgfSA9IGF3YWl0IGltcG9ydChcImZpbGUtc2F2ZXJcIik7XG4gICAgY29uc3Qgd2IgPSBuZXcgRXhjZWxKUy5Xb3JrYm9vaygpO1xuXG4gICAgLy8gMF9QYW5kdWFuX1NpbmdrYXRcbiAgICBjb25zdCBwYW5kdWFuRGF0YSA9IFtcbiAgICAgIFtcIlBBTkRVQU4gUEVOR0lTSUFOIE1BU1RFUiBEQVRBXCJdLFxuICAgICAgW1wiXCJdLFxuICAgICAgW1wiUEVUVU5KVUsgVU1VTTpcIl0sXG4gICAgICBbXCIxLiBBbmRhIERBUEFUIE1FTkdJU0kgc2VrYWxpZ3VzIGJlYmVyYXBhIHNoZWV0IHlhbmcgQW5kYSBidXR1aGthbi5cIl0sXG4gICAgICBbXCIyLiBESUxBUkFORyBNRU5HVUJBSCAvIE1FTkdIQVBVUyBOQU1BIEJBUklTIFBFUlRBTUEgKEhFQURFUikgcGFkYSBzZXRpYXAgc2hlZXQuXCJdLFxuICAgICAgW1wiMy4gS29sb20gZGVuZ2FuIHR1bGlzYW4gKFdhamliKSBIQVJVUyBkaWlzaSwgc2lzYW55YSBiZXJzaWZhdCBvcHNpb25hbC5cIl0sXG4gICAgICBbXCI0LiBIQVBVUyBiYXJpcyBjb250b2ggKGNvbnRvaCBwZW5naXNpYW4pIHNlYmVsdW0gQW5kYSBtZW5naW1wb3IgZmlsZSBpbmkga2Ugc2lzdGVtLlwiXSxcbiAgICAgIFtcIjUuIFNpbXBhbiBmaWxlIGluaSBzZWxhbHUgZGFsYW0gZm9ybWF0IC54bHN4IGF0YXUgLnhsc1wiXSxcbiAgICAgIFtcIjYuIFVudHVrIG5vbW9yIEhQIGF0YXUgYW5na2EgeWFuZyBkaWF3YWxpIGFuZ2thIDAsIEFuZGEgYmlzYSBtZW5hbWJhaGthbiB0YW5kYSBwZXRpayB0dW5nZ2FsIGRpIGRlcGFubnlhIChjb250b2g6JzA4MTIzNDU2NzgpIGFnYXIgYW5na2EgMCB0aWRhayBoaWxhbmcuXCJdLFxuICAgICAgW1wiXCJdLFxuICAgICAgW1wiREVUQUlMIFNIRUVUOlwiXSxcbiAgICAgIFtcIi0gSnVydXNhbiAmIEtlbGFzIDogUGFzdGlrYW4gbmFtYSBqdXJ1c2FuIHNhbWEgcGVyc2lzIChodXJ1ZiBiZXNhci9rZWNpbCkgc2FhdCBkaXBha2FpIGRpIHNoZWV0IEtlbGFzLlwiXSxcbiAgICAgIFtcIi0gR3VydSAmIEthcnlhd2FuIDogTWFzdWtrYW4gS29kZSB5YW5nIHVuaWsuIE5vbW9yIFdoYXRzQXBwIHNhbmdhdCBwZW50aW5nIHVudHVrIG5vdGlmaWthc2kuXCJdLFxuICAgICAgW1wiLSBTaXN3YSAgICAgICAgICAgOiBQYXN0aWthbiBOSVMvTklTTiB1bmlrLiBLZWxhcyBoYXJ1cyBtZXJ1anVrIGtlIGRhdGEgZGkgc2hlZXQgS2VsYXMuXCJdLFxuICAgICAgW1wiLSBCZWJhbiAmIFNpbGFidXMgOiBEaWd1bmFrYW4gdW50dWsgbWVuamFkd2Fsa2FuIGd1cnUgZGFuIG1hdGVyaSBkaSBLdXJpa3VsdW0uXCJdXG4gICAgXTtcbiAgICBjb25zdCB3c1BhbmR1YW4gPSB3Yi5hZGRXb3Jrc2hlZXQoXCIwX1BhbmR1YW5fU2luZ2thdFwiKTtcbiAgICBwYW5kdWFuRGF0YS5mb3JFYWNoKHJvdyA9PiB3c1BhbmR1YW4uYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3sgd2NoOiAxMjAgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c1BhbmR1YW4uZ2V0Q29sdW1uKGlkeCArIDEpLndpZHRoID0gY29sLndjaDsgfSk7XG5cbiAgICAvLyAxX0p1cnVzYW5cbiAgICBjb25zdCBqdXJ1c2FuRGF0YSA9IFtcbiAgICAgIFtcIk5BTUEgSlVSVVNBTiAoV2FqaWIpXCJdLFxuICAgICAgW1wiUmVrYXlhc2EgUGVyYW5na2F0IEx1bmFrXCJdLFxuICAgICAgW1wiVGVrbmlrIEtvbXB1dGVyIGRhbiBKYXJpbmdhblwiXVxuICAgIF07XG4gICAgY29uc3Qgd3NKdXJ1c2FuID0gd2IuYWRkV29ya3NoZWV0KFwiMV9KdXJ1c2FuXCIpO1xuICAgIGp1cnVzYW5EYXRhLmZvckVhY2gocm93ID0+IHdzSnVydXNhbi5hZGRSb3cocm93KSk7XG4gICAgdmFyIGNvbHMgPSBbeyB3Y2g6IDQ1IH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NKdXJ1c2FuLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gMl9LZWxhc1xuICAgIGNvbnN0IGtlbGFzRGF0YSA9IFtcbiAgICAgIFtcIk5BTUEgS0VMQVMgKFdhamliKVwiLFwiSlVSVVNBTiAoV2FqaWIgLSBTYW1hIGRnbiBTaGVldCAxKVwiLFwiV0FMSSBLRUxBUyAoT3BzaW9uYWwpXCJdLFxuICAgICAgW1wiWCBSUEwgMVwiLFwiUmVrYXlhc2EgUGVyYW5na2F0IEx1bmFrXCIsXCJCdWRpIFNhbnRvc28sIFMuUGRcIl0sXG4gICAgICBbXCJYSSBUS0ogMlwiLFwiVGVrbmlrIEtvbXB1dGVyIGRhbiBKYXJpbmdhblwiLFwiRGlhbmEgTGVzdGFyaSwgTS5QZFwiXVxuICAgIF07XG4gICAgY29uc3Qgd3NLZWxhcyA9IHdiLmFkZFdvcmtzaGVldChcIjJfS2VsYXNcIik7XG4gICAga2VsYXNEYXRhLmZvckVhY2gocm93ID0+IHdzS2VsYXMuYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3sgd2NoOiAzMCB9LCB7IHdjaDogNDAgfSwgeyB3Y2g6IDM1IH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NLZWxhcy5nZXRDb2x1bW4oaWR4ICsgMSkud2lkdGggPSBjb2wud2NoOyB9KTtcblxuICAgIC8vIDNfR3VydVxuICAgIGNvbnN0IGd1cnVEYXRhID0gW1xuICAgICAgW1wiS09ERSBHVVJVIChXYWppYilcIixcIk5BTUEgR1VSVSAoV2FqaWIpXCIsXCJQQVNTV09SRCAoT3BzaW9uYWwpXCIsXCJLQVRFR09SSSAoVW11bS9KdXJ1c2FuL0NhbXB1cmFuKVwiLFwiUFJJT1JJVEFTIEpVUlVTQU5cIixcIlBSSU9SSVRBUyBUSU5HS0FUXCIsXCJUQVJHRVQgSlAvTUlOR0dVXCJdLFxuICAgICAgW1wiRzAxXCIsXCJBaG1hZCBGYXV6aSwgTS5UXCIsXCIxMjM0NTZcIixcIkp1cnVzYW5cIixcIlJQTFwiLFwiWElJXCIsIDI0XSxcbiAgICAgIFtcIkcwMlwiLFwiU2l0aSBBbWluYWgsIFMuUGRcIixcIjEyMzQ1NlwiLFwiVW11bVwiLFwiU2VtdWFcIixcIlNlbXVhXCIsIDE4XVxuICAgIF07XG4gICAgY29uc3Qgd3NHdXJ1ID0gd2IuYWRkV29ya3NoZWV0KFwiM19HdXJ1XCIpO1xuICAgIGd1cnVEYXRhLmZvckVhY2gocm93ID0+IHdzR3VydS5hZGRSb3cocm93KSk7XG4gICAgdmFyIGNvbHMgPSBbeyB3Y2g6IDIwIH0sIHsgd2NoOiA0MCB9LCB7IHdjaDogMjUgfSwgeyB3Y2g6IDM1IH0sIHsgd2NoOiAyNSB9LCB7IHdjaDogMjUgfSwgeyB3Y2g6IDI1IH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NHdXJ1LmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gNF9NYXBlbFxuICAgIGNvbnN0IG1hcGVsRGF0YSA9IFtcbiAgICAgIFtcIk5BTUEgTUFQRUwgKFdhamliKVwiLFwiR1JBREUgKFgvWEkvWElJL1NlbXVhKVwiLFwiSlVSVVNBTiAoU2VtdWEvSnVydXNhbiBTcGVzaWZpaylcIixcIlBSQUtUSUs/IChZYS9UaWRhaylcIixcIlJVQU5HQU4gUFJBS1RJSyAoQmlsYSBQcmFrdGlrKVwiLFwiRFVSQVNJIChKUClcIl0sXG4gICAgICBbXCJEYXNhciBQZW1yb2dyYW1hblwiLFwiWFwiLFwiUmVrYXlhc2EgUGVyYW5na2F0IEx1bmFrXCIsXCJZYVwiLFwiTEFCX1JQTFwiLCAyXSxcbiAgICAgIFtcIlBlbmRpZGlrYW4gUGFuY2FzaWxhXCIsXCJTZW11YVwiLFwiU2VtdWFcIixcIlRpZGFrXCIsXCJcIiwgMl1cbiAgICBdO1xuICAgIGNvbnN0IHdzTWFwZWwgPSB3Yi5hZGRXb3Jrc2hlZXQoXCI0X01hcGVsXCIpO1xuICAgIG1hcGVsRGF0YS5mb3JFYWNoKHJvdyA9PiB3c01hcGVsLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7IHdjaDogNDAgfSwgeyB3Y2g6IDI1IH0sIHsgd2NoOiA0MCB9LCB7IHdjaDogMjAgfSwgeyB3Y2g6IDM1IH0sIHsgd2NoOiAxNSB9XTtcbiAgICBjb2xzLmZvckVhY2goKGNvbCwgaWR4KSA9PiB7IGlmKGNvbC53Y2gpIHdzTWFwZWwuZ2V0Q29sdW1uKGlkeCArIDEpLndpZHRoID0gY29sLndjaDsgfSk7XG5cbiAgICAvLyA1X1J1YW5nYW5cbiAgICBjb25zdCBydWFuZ2FuRGF0YSA9IFtcbiAgICAgIFtcIklEIFJVQU5HIChXYWppYilcIixcIk5BTUEgUlVBTkdBTiAoV2FqaWIpXCIsXCJUSVBFIChUZW9yaS9QcmFrdGlrKVwiLFwiSlVSVVNBTiAoU2VtdWEvSnVydXNhbiBTcGVzaWZpaylcIixcIlRBUkdFVCBUSU5HS0FUIChTZW11YS9YL1hJL1hJSSlcIixcIlBSSU9SSVRBUyAoWWEvVGlkYWspXCJdLFxuICAgICAgW1wiUjAxXCIsXCJSdWFuZyBLZWxhcyBYIFJQTCAxXCIsXCJUZW9yaVwiLFwiUmVrYXlhc2EgUGVyYW5na2F0IEx1bmFrXCIsXCJYXCIsXCJUaWRha1wiXSxcbiAgICAgIFtcIkxBQl9SUExcIixcIkxhYm9yYXRvcml1bSBLb21wdXRlclwiLFwiUHJha3Rpa1wiLFwiUmVrYXlhc2EgUGVyYW5na2F0IEx1bmFrXCIsXCJTZW11YVwiLFwiWWFcIl1cbiAgICBdO1xuICAgIGNvbnN0IHdzUnVhbmdhbiA9IHdiLmFkZFdvcmtzaGVldChcIjVfUnVhbmdhblwiKTtcbiAgICBydWFuZ2FuRGF0YS5mb3JFYWNoKHJvdyA9PiB3c1J1YW5nYW4uYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3sgd2NoOiAyMCB9LCB7IHdjaDogNDAgfSwgeyB3Y2g6IDI1IH0sIHsgd2NoOiA0MCB9LCB7IHdjaDogMzUgfSwgeyB3Y2g6IDIwIH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NSdWFuZ2FuLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gNl9CZWJhblxuICAgIGNvbnN0IGJlYmFuRGF0YSA9IFtcbiAgICAgIFtcIktPREUgR1VSVSAoV2FqaWIpXCIsXCJOQU1BIE1BUEVMIChXYWppYilcIixcIlRBUkdFVCBHUkFERSAoU2VtdWEvWC9YSS9YSUkpXCIsXCJUQVJHRVQgSlVSVVNBTiAoU2VtdWEvU3Blc2lmaWspXCIsXCJEVVJBU0lcIixcIk1BS1MgS0VMQVMgKE9wc2lvbmFsKVwiXSxcbiAgICAgIFtcIkcwMVwiLFwiRGFzYXIgUGVtcm9ncmFtYW5cIixcIlhcIixcIlJla2F5YXNhIFBlcmFuZ2thdCBMdW5ha1wiLCAyLFwiM1wiXSxcbiAgICAgIFtcIkcwMlwiLFwiUGVuZGlkaWthbiBQYW5jYXNpbGFcIixcIlNlbXVhXCIsXCJTZW11YVwiLCAyLFwiXCJdXG4gICAgXTtcbiAgICBjb25zdCB3c0JlYmFuID0gd2IuYWRkV29ya3NoZWV0KFwiNl9CZWJhblwiKTtcbiAgICBiZWJhbkRhdGEuZm9yRWFjaChyb3cgPT4gd3NCZWJhbi5hZGRSb3cocm93KSk7XG4gICAgdmFyIGNvbHMgPSBbeyB3Y2g6IDIwIH0sIHsgd2NoOiA0MCB9LCB7IHdjaDogMzUgfSwgeyB3Y2g6IDQwIH0sIHsgd2NoOiAxNSB9LCB7IHdjaDogMjUgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c0JlYmFuLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gN19Nb2R1bFxuICAgIGNvbnN0IHNpbGFidXNEYXRhID0gW1xuICAgICAgW1wiTUFUQSBQRUxBSkFSQU4gKFdhamliKVwiLFwiR1VSVSBQRU5HQUpBUiAoV2FqaWIpXCIsXCJKVURVTCBQRVJURU1VQU4gKFdhamliKVwiLFwiS0VMQVMgLyBTRU1FU1RFUlwiLFwiVFVKVUFOIFBFTUJFTEFKQVJBTlwiLFwiTUFURVJJIFBFTUJFTEFKQVJBTlwiLFwiQ0FUQVRBTiAvIEtFVEVSQU5HQU5cIl0sXG4gICAgICBbXCJEYXNhciBQZW1yb2dyYW1hblwiLFwiRzAxXCIsXCJQZXJ0ZW11YW4gMTogUGVuZ2VuYWxhbiBWZWt0b3JcIixcIlggLyBHYW5qaWxcIixcIlNpc3dhIG1lbWFoYW1pIGRhc2FyIHZla3RvclwiLFwiS29uc2VwIHZla3RvciBkYW4gYml0bWFwXCIsXCJNZW1iYXdhIGxhcHRvcFwiXVxuICAgIF07XG4gICAgY29uc3Qgd3NTaWxhYnVzID0gd2IuYWRkV29ya3NoZWV0KFwiN19Nb2R1bFwiKTtcbiAgICBzaWxhYnVzRGF0YS5mb3JFYWNoKHJvdyA9PiB3c1NpbGFidXMuYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3sgd2NoOiAzMCB9LCB7IHdjaDogMjUgfSwgeyB3Y2g6IDQ1IH0sIHsgd2NoOiAyNSB9LCB7IHdjaDogNTAgfSwgeyB3Y2g6IDUwIH0sIHsgd2NoOiAzMCB9XTtcbiAgICBjb2xzLmZvckVhY2goKGNvbCwgaWR4KSA9PiB7IGlmKGNvbC53Y2gpIHdzU2lsYWJ1cy5nZXRDb2x1bW4oaWR4ICsgMSkud2lkdGggPSBjb2wud2NoOyB9KTtcblxuICAgIC8vIDhfV2FrdHVcbiAgICBjb25zdCB3YWt0dURhdGEgPSBbXG4gICAgICBbXCJIQVJJIChXYWppYilcIixcIldBS1RVIChXYWppYilcIixcIkFQQUtBSCBJU1RJUkFIQVQ/IChZYS9UaWRhaylcIixcIk5BTUEgS0VHSUFUQU5cIixcIkpVTUxBSCBKUFwiXSxcbiAgICAgIFtcIlNlbmluXCIsXCIwNzowMCAtIDA3OjQ1XCIsXCJUaWRha1wiLFwiSmFtIFBlbGFqYXJhbiAxXCIsIDFdLFxuICAgICAgW1wiU2VuaW5cIixcIjA5OjE1IC0gMDk6NDVcIixcIllhXCIsXCJJc3RpcmFoYXQgUGFnaVwiLCAwXVxuICAgIF07XG4gICAgY29uc3Qgd3NXYWt0dSA9IHdiLmFkZFdvcmtzaGVldChcIjhfV2FrdHVcIik7XG4gICAgd2FrdHVEYXRhLmZvckVhY2gocm93ID0+IHdzV2FrdHUuYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3sgd2NoOiAyMCB9LCB7IHdjaDogMjUgfSwgeyB3Y2g6IDMwIH0sIHsgd2NoOiAzMCB9LCB7IHdjaDogMjAgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c1dha3R1LmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gOV9LZXRlcnNlZGlhYW5cbiAgICBjb25zdCBrZXRlcnNlZGlhYW5EYXRhID0gW1xuICAgICAgW1wiS09ERSBHVVJVIChXYWppYilcIixcIk1BUEVMIEtPTVBFVEVOU0lcIixcIkhBUkkgVEVSU0VESUFcIl0sXG4gICAgICBbXCJHMDFcIixcIkRhc2FyIFBlbXJvZ3JhbWFuXCIsXCJTZW5pbiwgU2VsYXNhLCBSYWJ1LCBLYW1pcywgSnVtYXRcIl0sXG4gICAgICBbXCJHMDJcIixcIlBlbmRpZGlrYW4gUGFuY2FzaWxhXCIsXCJTZW5pbiwgS2FtaXMsIEp1bWF0XCJdXG4gICAgXTtcbiAgICBjb25zdCB3c0tldGVyc2VkaWFhbiA9IHdiLmFkZFdvcmtzaGVldChcIjlfS2V0ZXJzZWRpYWFuXCIpO1xuICAgIGtldGVyc2VkaWFhbkRhdGEuZm9yRWFjaChyb3cgPT4gd3NLZXRlcnNlZGlhYW4uYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3sgd2NoOiAyMCB9LCB7IHdjaDogNDAgfSwgeyB3Y2g6IDQ1IH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NLZXRlcnNlZGlhYW4uZ2V0Q29sdW1uKGlkeCArIDEpLndpZHRoID0gY29sLndjaDsgfSk7XG5cbiAgICAvLyAxMF9LYWxlbmRlcl9Ba2FkZW1pa1xuICAgIGNvbnN0IGFrYWRlbWlrRGF0YSA9IFtcbiAgICAgIFtcIkpVRFVMIEtFR0lBVEFOIChXYWppYilcIixcIk1VTEFJIChZWVlZLU1NLUREKVwiLFwiU0VMRVNBSSAoWVlZWS1NTS1ERClcIixcIktBVEVHT1JJIChXYWppYilcIixcIkRFU0tSSVBTSSAvIEtFVEVSQU5HQU5cIl0sXG4gICAgICBbXCJMaWJ1ciBTZW1lc3RlciBHYW5qaWxcIixcIjIwMjQtMTItMTVcIixcIjIwMjQtMTItMzFcIixcIkxpYnVyXCIsXCJMaWJ1cmFuIGFraGlyIHNlbWVzdGVyXCJdXG4gICAgXTtcbiAgICBjb25zdCB3c0FrYWRlbWlrID0gd2IuYWRkV29ya3NoZWV0KFwiMTBfS2FsZW5kZXJfQWthZGVtaWtcIik7XG4gICAgYWthZGVtaWtEYXRhLmZvckVhY2gocm93ID0+IHdzQWthZGVtaWsuYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3sgd2NoOiAzNSB9LCB7IHdjaDogMjUgfSwgeyB3Y2g6IDI1IH0sIHsgd2NoOiAyNSB9LCB7IHdjaDogNDUgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c0FrYWRlbWlrLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gMTFfS2F0ZWdvcmlfS2FsZW5kZXJcbiAgICBjb25zdCBrYXRLYWxlbmRlckRhdGEgPSBbXG4gICAgICBbXCJOQU1BIEtBVEVHT1JJIChXYWppYilcIixcIldBUk5BIChIZXggQ29kZSBPcHNpb25hbClcIl0sXG4gICAgICBbXCJMaWJ1clwiLFwiI2VmNDQ0NFwiXSxcbiAgICAgIFtcIlVqaWFuXCIsXCIjM2I4MmY2XCJdXG4gICAgXTtcbiAgICBjb25zdCB3c0thdEthbGVuZGVyID0gd2IuYWRkV29ya3NoZWV0KFwiMTFfS2F0ZWdvcmlfS2FsZW5kZXJcIik7XG4gICAga2F0S2FsZW5kZXJEYXRhLmZvckVhY2gocm93ID0+IHdzS2F0S2FsZW5kZXIuYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3sgd2NoOiAzMCB9LCB7IHdjaDogMzAgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c0thdEthbGVuZGVyLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gMTJfS2F0ZWdvcmlfTW9kdWxcbiAgICBjb25zdCBrYXRTaWxhYnVzRGF0YSA9IFtcbiAgICAgIFtcIk5BTUEgS0FURUdPUkkgKFdhamliKVwiLFwiV0FSTkEgKEhleCBDb2RlIE9wc2lvbmFsKVwiXSxcbiAgICAgIFtcIlBlcnRlbXVhbiBCaWFzYVwiLFwiIzNiODJmNlwiXSxcbiAgICAgIFtcIlByYWt0aWt1bVwiLFwiIzEwYjk4MVwiXVxuICAgIF07XG4gICAgY29uc3Qgd3NLYXRTaWxhYnVzID0gd2IuYWRkV29ya3NoZWV0KFwiMTJfS2F0ZWdvcmlfTW9kdWxcIik7XG4gICAga2F0U2lsYWJ1c0RhdGEuZm9yRWFjaChyb3cgPT4gd3NLYXRTaWxhYnVzLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7IHdjaDogMzAgfSwgeyB3Y2g6IDMwIH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NLYXRTaWxhYnVzLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gMTNfQWJzZW5zaV9HdXJ1XG4gICAgY29uc3QgYWJzZW5zaURhdGEgPSBbXG4gICAgICBbXCJQRU1CRVJJVEFIVUFOXCJdLFxuICAgICAgW1wiU2hlZXQgMTNfQWJzZW5zaV9HdXJ1IGluaSBIQU5ZQSBVTlRVSyBLRVBFUkxVQU4gRVhQT1JUIERBVEEuXCJdLFxuICAgICAgW1wiQW5kYSB0aWRhayBkYXBhdCBtZWxha3VrYW4gaW1wb3J0IGFic2VuIG1hc2EgbGFsdSBtZWxhbHVpIGZpbGUgRXhjZWwgaW5pLlwiXVxuICAgIF07XG4gICAgY29uc3Qgd3NBYnNlbnNpID0gd2IuYWRkV29ya3NoZWV0KFwiMTNfQWJzZW5zaV9HdXJ1XCIpO1xuICAgIGFic2Vuc2lEYXRhLmZvckVhY2gocm93ID0+IHdzQWJzZW5zaS5hZGRSb3cocm93KSk7XG4gICAgdmFyIGNvbHMgPSBbeyB3Y2g6IDgwIH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NBYnNlbnNpLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gMTRfS2FyeWF3YW5cbiAgICBjb25zdCBrYXJ5YXdhbkRhdGEgPSBbXG4gICAgICBbXCJLT0RFIEtBUllBV0FOIChXYWppYilcIixcIk5BTUEgS0FSWUFXQU4gKFdhamliKVwiLFwiRElWSVNJIC8gQkFHSUFOXCIsXCJOTyBXSEFUU0FQUFwiXSxcbiAgICAgIFtcIkswMVwiLFwiQnVkaSBTYW50b3NvXCIsXCJLZWJlcnNpaGFuXCIsXCInMDgxMjM0NTY3ODkwXCJdLFxuICAgICAgW1wiSzAyXCIsXCJTaXRpIEFtaW5haFwiLFwiVGF0YSBVc2FoYVwiLFwiJzA4MTI5ODc2NTQzMlwiXVxuICAgIF07XG4gICAgY29uc3Qgd3NLYXJ5YXdhbiA9IHdiLmFkZFdvcmtzaGVldChcIjE0X0thcnlhd2FuXCIpO1xuICAgIGthcnlhd2FuRGF0YS5mb3JFYWNoKHJvdyA9PiB3c0thcnlhd2FuLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7IHdjaDogMjUgfSwgeyB3Y2g6IDQwIH0sIHsgd2NoOiAyNSB9LCB7IHdjaDogMjUgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c0thcnlhd2FuLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgLy8gMTVfU2lzd2FcbiAgICBjb25zdCBzaXN3YURhdGEgPSBbXG4gICAgICBbXCJOSVMgLyBOSVNOIChXYWppYilcIixcIk5BTUEgU0lTV0EgKFdhamliKVwiLFwiS0VMQVMgKFNlc3VhaSBEYXRhIEtlbGFzKVwiLFwiSkVOSVMgS0VMQU1JTiAoTC9QKVwiLFwiTk8gV0hBVFNBUFAgT1JUVVwiXSxcbiAgICAgIFtcIjEwMDFcIixcIkFobWFkIFl1c3VmXCIsXCJYIFJQTCAxXCIsXCJMXCIsXCInMDgxMjM0NTY3ODkwXCJdLFxuICAgICAgW1wiMTAwMlwiLFwiQnVuZ2EgTGVzdGFyaVwiLFwiWCBSUEwgMVwiLFwiUFwiLFwiJzA4MTI5ODc2NTQzMlwiXVxuICAgIF07XG4gICAgY29uc3Qgd3NTaXN3YSA9IHdiLmFkZFdvcmtzaGVldChcIjE1X1Npc3dhXCIpO1xuICAgIHNpc3dhRGF0YS5mb3JFYWNoKHJvdyA9PiB3c1Npc3dhLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7IHdjaDogMjUgfSwgeyB3Y2g6IDQ1IH0sIHsgd2NoOiAzNSB9LCB7IHdjaDogMjUgfSwgeyB3Y2g6IDI1IH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NTaXN3YS5nZXRDb2x1bW4oaWR4ICsgMSkud2lkdGggPSBjb2wud2NoOyB9KTtcblxuICAgIGNvbnN0IGJ1ZiA9IGF3YWl0IHdiLnhsc3gud3JpdGVCdWZmZXIoKTtcbiAgICBzYXZlQXMobmV3IEJsb2IoW2J1Zl0pLCBgVGVtcGxhdGUgTWFzdGVyIERhdGEgJHthcHBTZXR0aW5ncy5hcHBOYW1lIHx8XCJUaW1lU2NoZWR1bGVcIn0ueGxzeGApO1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJUZW1wbGF0ZSBNYXN0ZXIgRGF0YSBiZXJoYXNpbCBkaXVuZHVoLlwiLFwic3VjY2Vzc1wiKTtcbiAgfTtcblxuICBhc3luYyBmdW5jdGlvbiBleHBvcnRBbGxEYXRhVG9FeGNlbCgpIHtcbiAgICBjb25zdCBFeGNlbEpTID0gKGF3YWl0IGltcG9ydChcImV4Y2VsanNcIikpLmRlZmF1bHQ7XG4gICAgY29uc3QgeyBzYXZlQXMgfSA9IGF3YWl0IGltcG9ydChcImZpbGUtc2F2ZXJcIik7XG4gICAgY29uc3Qgd2IgPSBuZXcgRXhjZWxKUy5Xb3JrYm9vaygpO1xuICAgIGNvbnN0IGp1cnVzYW5EYXRhID0gW1tcIk5hbWEgSnVydXNhbiAod2FqaWIpXCJdLCAuLi5tYWpvcnMubWFwKG0gPT4gW21dKV07XG4gICAgY29uc3Qgd3NKdXJ1c2FuID0gd2IuYWRkV29ya3NoZWV0KFwiMV9KdXJ1c2FuXCIpO1xuICAgIGp1cnVzYW5EYXRhLmZvckVhY2gocm93ID0+IHdzSnVydXNhbi5hZGRSb3cocm93KSk7XG4gICAgdmFyIGNvbHMgPSBbe1xuICAgICAgd2NoOiAzNlxuICAgIH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NKdXJ1c2FuLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuICAgIGNvbnN0IGtlbGFzRGF0YSA9IFtbXCJOYW1hIEtlbGFzICh3YWppYilcIixcIkp1cnVzYW4gKHBpbGloIGRhcmkgRGF0YSBKdXJ1c2FuKVwiLFwiV2FsaSBLZWxhc1wiXSwgLi4uY2xhc3Nlcy5tYXAoYyA9PiBbYy5uYW1lLCBjLm1ham9yLCBjLmhvbWVyb29tIHx8XCJcIl0pXTtcbiAgICBjb25zdCB3c0tlbGFzID0gd2IuYWRkV29ya3NoZWV0KFwiMl9LZWxhc1wiKTtcbiAgICBrZWxhc0RhdGEuZm9yRWFjaChyb3cgPT4gd3NLZWxhcy5hZGRSb3cocm93KSk7XG4gICAgdmFyIGNvbHMgPSBbe1xuICAgICAgd2NoOiAzNFxuICAgIH0sIHtcbiAgICAgIHdjaDogMzZcbiAgICB9LCB7XG4gICAgICB3Y2g6IDM0XG4gICAgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c0tlbGFzLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuICAgIGNvbnN0IGd1cnVEYXRhID0gW1tcIktvZGUgR3VydSAod2FqaWIpXCIsXCJOYW1hIEd1cnUgKHdhamliKVwiLFwiUGFzc3dvcmRcIixcIkthdGVnb3JpIChVbXVtL0p1cnVzYW4vQ2FtcHVyYW4pXCIsXCJQcmlvcml0YXMgSnVydXNhblwiLFwiUHJpb3JpdGFzIFRpbmdrYXRcIixcIlRhcmdldCBKUC9NaW5nZ3VcIl0sIC4uLnRlYWNoZXJzLm1hcCh0ID0+IFt0LmNvZGUsIHQubmFtZSxcIlwiLCB0LnR5cGUsIHQucHJlZmVycmVkTWFqb3IsIHQucHJlZmVycmVkR3JhZGUsIHQudGFyZ2V0V2Vla2x5SnAgfHxcIlwiXSldO1xuICAgIGNvbnN0IHdzR3VydSA9IHdiLmFkZFdvcmtzaGVldChcIjNfR3VydVwiKTtcbiAgICBndXJ1RGF0YS5mb3JFYWNoKHJvdyA9PiB3c0d1cnUuYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3tcbiAgICAgIHdjaDogMjBcbiAgICB9LCB7XG4gICAgICB3Y2g6IDQwXG4gICAgfSwge1xuICAgICAgd2NoOiAxNFxuICAgIH0sIHtcbiAgICAgIHdjaDogMjhcbiAgICB9LCB7XG4gICAgICB3Y2g6IDIyXG4gICAgfSwge1xuICAgICAgd2NoOiAyMFxuICAgIH0sIHtcbiAgICAgIHdjaDogMThcbiAgICB9XTtcbiAgICBjb2xzLmZvckVhY2goKGNvbCwgaWR4KSA9PiB7IGlmKGNvbC53Y2gpIHdzR3VydS5nZXRDb2x1bW4oaWR4ICsgMSkud2lkdGggPSBjb2wud2NoOyB9KTtcbiAgICBjb25zdCBtYXBlbERhdGEgPSBbW1wiTmFtYSBNYXBlbCAod2FqaWIpXCIsXCJHcmFkZSAoWC9YSS9YSUkvU2VtdWEpXCIsXCJKdXJ1c2FuIChVbXVtL1RLUi9US0ovUlBML0FrdW50YW5zaSlcIixcIlByYWt0aWs/IChZYS9UaWRhaylcIixcIlJ1YW5nYW4gUHJha3RpayAoSUQgZGlwaXNhaCBrb21hKVwiLFwiRHVyYXNpXCJdLCAuLi5zdWJqZWN0cy5tYXAocyA9PiBbcy5uYW1lLCBzLmdyYWRlLCBzLm1ham9yLCBzLmlzQmxvY2sgP1wiWWFcIiA6XCJUaWRha1wiLCBzLnByYWN0aWNlUm9vbUlkcyB8fFwiXCIsIHMuZGVmYXVsdER1cmF0aW9uXSldO1xuICAgIGNvbnN0IHdzTWFwZWwgPSB3Yi5hZGRXb3Jrc2hlZXQoXCI0X01hcGVsXCIpO1xuICAgIG1hcGVsRGF0YS5mb3JFYWNoKHJvdyA9PiB3c01hcGVsLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7XG4gICAgICB3Y2g6IDM2XG4gICAgfSwge1xuICAgICAgd2NoOiAyNlxuICAgIH0sIHtcbiAgICAgIHdjaDogNDRcbiAgICB9LCB7XG4gICAgICB3Y2g6IDIwXG4gICAgfSwge1xuICAgICAgd2NoOiA0MFxuICAgIH0sIHtcbiAgICAgIHdjaDogMTBcbiAgICB9XTtcbiAgICBjb2xzLmZvckVhY2goKGNvbCwgaWR4KSA9PiB7IGlmKGNvbC53Y2gpIHdzTWFwZWwuZ2V0Q29sdW1uKGlkeCArIDEpLndpZHRoID0gY29sLndjaDsgfSk7XG4gICAgY29uc3QgcnVhbmdhbkRhdGEgPSBbW1wiSUQgUnVhbmcgKHdhamliKVwiLFwiTmFtYSBSdWFuZ2FuICh3YWppYilcIixcIlRpcGUgKFRlb3JpL1ByYWt0aWspXCIsXCJKdXJ1c2FuIChBbGwvVEtSL1RLSi9SUEwvQWt1bnRhbnNpKVwiLFwiVGFyZ2V0IFRpbmdrYXQgKFNlbXVhL1gvWEkvWElJKVwiLFwiUHJpb3JpdGFzIChZYS9UaWRhaylcIl0sIC4uLnJvb21zLm1hcChyID0+IFtyLmlkLCByLm5hbWUsIHIudHlwZSwgci5tYWpvciwgci50YXJnZXRHcmFkZSB8fFwiU2VtdWFcIiwgci5pc1ByaW9yaXR5ID9cIllhXCIgOlwiVGlkYWtcIl0pXTtcbiAgICBjb25zdCB3c1J1YW5nYW4gPSB3Yi5hZGRXb3Jrc2hlZXQoXCI1X1J1YW5nYW5cIik7XG4gICAgcnVhbmdhbkRhdGEuZm9yRWFjaChyb3cgPT4gd3NSdWFuZ2FuLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7XG4gICAgICB3Y2g6IDIwXG4gICAgfSwge1xuICAgICAgd2NoOiAzNFxuICAgIH0sIHtcbiAgICAgIHdjaDogMjJcbiAgICB9LCB7XG4gICAgICB3Y2g6IDQwXG4gICAgfSwge1xuICAgICAgd2NoOiAyOFxuICAgIH0sIHtcbiAgICAgIHdjaDogMjBcbiAgICB9XTtcbiAgICBjb2xzLmZvckVhY2goKGNvbCwgaWR4KSA9PiB7IGlmKGNvbC53Y2gpIHdzUnVhbmdhbi5nZXRDb2x1bW4oaWR4ICsgMSkud2lkdGggPSBjb2wud2NoOyB9KTtcbiAgICBjb25zdCBiZWJhbkRhdGEgPSBbW1wiS29kZSBHdXJ1XCIsXCJOYW1hIE1hcGVsXCIsXCJUYXJnZXQgR3JhZGUgKEFsbC9YL1hJL1hJSSBhdGF1IFgsWEkpXCIsXCJUYXJnZXQgSnVydXNhbiAoQWxsL1RLUi9US0ovUlBML0FrdW50YW5zaSlcIixcIkR1cmFzaVwiLFwiTWFrcyBLZWxhcyAob3BzaW9uYWwpXCJdLCAuLi50ZWFjaGluZ0xvYWRzLm1hcChiID0+IFtiLnRlYWNoZXJDb2RlLCBiLnN1YmplY3QsIGIudGFyZ2V0R3JhZGUsIGIudGFyZ2V0TWFqb3IsIGIuZHVyYXRpb24sIGIubWF4Q2xhc3NlcyB8fFwiXCJdKV07XG4gICAgY29uc3Qgd3NCZWJhbiA9IHdiLmFkZFdvcmtzaGVldChcIjZfQmViYW5cIik7XG4gICAgYmViYW5EYXRhLmZvckVhY2gocm93ID0+IHdzQmViYW4uYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3tcbiAgICAgIHdjaDogMThcbiAgICB9LCB7XG4gICAgICB3Y2g6IDM0XG4gICAgfSwge1xuICAgICAgd2NoOiA0MFxuICAgIH0sIHtcbiAgICAgIHdjaDogNDRcbiAgICB9LCB7XG4gICAgICB3Y2g6IDEwXG4gICAgfSwge1xuICAgICAgd2NoOiAyMlxuICAgIH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NCZWJhbi5nZXRDb2x1bW4oaWR4ICsgMSkud2lkdGggPSBjb2wud2NoOyB9KTtcbiAgICBjb25zdCBzaWxhYnVzRGF0YSA9IFtbXCJNYXRhIFBlbGFqYXJhbiAod2FqaWIpXCIsXCJHdXJ1IFBlbmdhamFyICh3YWppYilcIixcIkp1ZHVsIFBlcnRlbXVhbiAvIEJBQiAod2FqaWIpXCIsXCJLZWxhcyAvIFNlbWVzdGVyXCIsXCJUdWp1YW4gUGVtYmVsYWphcmFuXCIsXCJNYXRlcmkgUGVtYmVsYWphcmFuIChwaXNhaCBlbnRlcilcIixcIkNhdGF0YW4gKG9wc2lvbmFsKVwiXSwgLi4uc3lsbGFidXNlcy5tYXAocyA9PiBbcy5zdWJqZWN0TmFtZSwgcy50ZWFjaGVyQ29kZSwgcy50aXRsZSwgcy5ncmFkZVNlbWVzdGVyIHx8XCJcIiwgcy5vYmplY3RpdmVzIHx8XCJcIiwgcy5tYXRlcmlhbHMgfHxcIlwiLCBzLm5vdGVzIHx8XCJcIl0pXTtcbiAgICBjb25zdCB3c1NpbGFidXMgPSB3Yi5hZGRXb3Jrc2hlZXQoXCI3X01vZHVsXCIpO1xuICAgIHNpbGFidXNEYXRhLmZvckVhY2gocm93ID0+IHdzU2lsYWJ1cy5hZGRSb3cocm93KSk7XG4gICAgdmFyIGNvbHMgPSBbe1xuICAgICAgd2NoOiAyNVxuICAgIH0sIHtcbiAgICAgIHdjaDogMjBcbiAgICB9LCB7XG4gICAgICB3Y2g6IDQwXG4gICAgfSwge1xuICAgICAgd2NoOiAyMFxuICAgIH0sIHtcbiAgICAgIHdjaDogNTBcbiAgICB9LCB7XG4gICAgICB3Y2g6IDUwXG4gICAgfSwge1xuICAgICAgd2NoOiAyNFxuICAgIH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NTaWxhYnVzLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuICAgIGNvbnN0IHdha3R1RGF0YSA9IFtbXCJIYXJpXCIsXCJXYWt0dVwiLFwiQXBha2FoIElzdGlyYWhhdD9cIixcIk5hbWEgS2VnaWF0YW4gLyBJc3RpcmFoYXRcIixcIkp1bWxhaCBKUFwiLFwiTWVuaXQgcGVyIEpQXCJdLCAuLi5PYmplY3QuZW50cmllcyh0aW1lU2xvdHMgfHwge30pLmZsYXRNYXAoKFtkYXlOYW1lLCBzbG90c10pID0+IChzbG90cyB8fCBbXSkubWFwKHNsb3QgPT4gW2RheU5hbWUsIHNsb3QubGFiZWwgfHxcIlwiLCBzbG90LmlzQnJlYWsgP1wiWWFcIiA6XCJUaWRha1wiLCBzbG90LmlzQnJlYWsgPyBzbG90LmxhYmVsQnJlYWsgfHwgc2xvdC5sYWJlbCB8fFwiXCIgOlwiXCIsIHNsb3QuaXNCcmVhayA/XCJcIiA6IHNsb3QuanBDb3VudCB8fCAxLCBzbG90Lm1pbnNQZXJKcCB8fCA0NV0pKV07XG4gICAgY29uc3Qgd3NXYWt0dSA9IHdiLmFkZFdvcmtzaGVldChcIjhfV2FrdHVcIik7XG4gICAgd2FrdHVEYXRhLmZvckVhY2gocm93ID0+IHdzV2FrdHUuYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3tcbiAgICAgIHdjaDogMTZcbiAgICB9LCB7XG4gICAgICB3Y2g6IDIwXG4gICAgfSwge1xuICAgICAgd2NoOiAxOFxuICAgIH0sIHtcbiAgICAgIHdjaDogMzBcbiAgICB9LCB7XG4gICAgICB3Y2g6IDEyXG4gICAgfSwge1xuICAgICAgd2NoOiAxNFxuICAgIH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NXYWt0dS5nZXRDb2x1bW4oaWR4ICsgMSkud2lkdGggPSBjb2wud2NoOyB9KTtcbiAgICBjb25zdCBrZXRlcnNlZGlhYW5EYXRhID0gW1tcIktvZGUgR3VydSAod2FqaWIpXCIsXCJNYXBlbCBLb21wZXRlbnNpIChwaXNhaGthbiBkZW5nYW4ga29tYSlcIixcIkhhcmkgVGVyc2VkaWEgKHBpc2Foa2FuIGRlbmdhbiBrb21hKVwiXSwgLi4udGVhY2hlcnMubWFwKHQgPT4ge1xuICAgICAgY29uc3QgYXZhaWwgPSB0ZWFjaGVyQXZhaWxhYmlsaXR5W3QuY29kZV0gfHwge1xuICAgICAgICBkYXlzOiBbXSxcbiAgICAgICAgc3ViamVjdHM6IFtdXG4gICAgICB9O1xuICAgICAgcmV0dXJuIFt0LmNvZGUsIGF2YWlsLnN1YmplY3RzLmpvaW4oXCIsXCIpLCBhdmFpbC5kYXlzLmpvaW4oXCIsXCIpXTtcbiAgICB9KV07XG4gICAgY29uc3Qgd3NLZXRlcnNlZGlhYW4gPSB3Yi5hZGRXb3Jrc2hlZXQoXCI5X0tldGVyc2VkaWFhblwiKTtcbiAgICBrZXRlcnNlZGlhYW5EYXRhLmZvckVhY2gocm93ID0+IHdzS2V0ZXJzZWRpYWFuLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7XG4gICAgICB3Y2g6IDIwXG4gICAgfSwge1xuICAgICAgd2NoOiA1MFxuICAgIH0sIHtcbiAgICAgIHdjaDogNDBcbiAgICB9XTtcbiAgICBjb2xzLmZvckVhY2goKGNvbCwgaWR4KSA9PiB7IGlmKGNvbC53Y2gpIHdzS2V0ZXJzZWRpYWFuLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuICAgIGNvbnN0IGNhbGVuZGFyQ2F0ZWdvcnlCeUlkID0gbmV3IE1hcCgoY2FsZW5kYXJDYXRlZ29yaWVzIHx8IFtdKS5tYXAoY2F0ID0+IFtjYXQuaWQsIGNhdC5uYW1lXSkpO1xuICAgIGNvbnN0IGFrYWRlbWlrRGF0YSA9IFtbXCJKdWR1bCBLZWdpYXRhblwiLFwiTXVsYWlcIixcIlNlbGVzYWlcIixcIkthdGVnb3JpXCIsXCJLZXRlcmFuZ2FuXCJdLCAuLi4oYWNhZGVtaWNDYWxlbmRhciB8fCBbXSkubWFwKGV2dCA9PiBbZXZ0LnRpdGxlIHx8XCJcIiwgbm9ybWFsaXplQ2FsZW5kYXJEYXRlSW5wdXQoZXZ0LmRhdGVTdGFydCkgfHxcIlwiLCBub3JtYWxpemVDYWxlbmRhckRhdGVJbnB1dChldnQuZGF0ZUVuZCB8fCBldnQuZGF0ZVN0YXJ0KSB8fFwiXCIsIGNhbGVuZGFyQ2F0ZWdvcnlCeUlkLmdldChldnQuY2F0ZWdvcnlJZCkgfHwgZXZ0LmNhdGVnb3J5SWQgfHxcIlwiLCBldnQuZGVzY3JpcHRpb24gfHxcIlwiXSldO1xuICAgIGNvbnN0IHdzQWthZGVtaWsgPSB3Yi5hZGRXb3Jrc2hlZXQoXCIxMF9LYWxlbmRlcl9Ba2FkZW1pa1wiKTtcbiAgICBha2FkZW1pa0RhdGEuZm9yRWFjaChyb3cgPT4gd3NBa2FkZW1pay5hZGRSb3cocm93KSk7XG4gICAgdmFyIGNvbHMgPSBbe1xuICAgICAgd2NoOiAzNFxuICAgIH0sIHtcbiAgICAgIHdjaDogMTZcbiAgICB9LCB7XG4gICAgICB3Y2g6IDE2XG4gICAgfSwge1xuICAgICAgd2NoOiAyNFxuICAgIH0sIHtcbiAgICAgIHdjaDogNDhcbiAgICB9XTtcbiAgICBjb2xzLmZvckVhY2goKGNvbCwgaWR4KSA9PiB7IGlmKGNvbC53Y2gpIHdzQWthZGVtaWsuZ2V0Q29sdW1uKGlkeCArIDEpLndpZHRoID0gY29sLndjaDsgfSk7XG4gICAgY29uc3Qga2F0ZWdvcmlLYWxlbmRlckRhdGEgPSBbW1wiTmFtYSBLYXRlZ29yaVwiLFwiV2FybmFcIl0sIC4uLihjYWxlbmRhckNhdGVnb3JpZXMgfHwgW10pLm1hcChjYXQgPT4gW2NhdC5uYW1lIHx8XCJcIiwgY2F0LmNvbG9yIHx8XCJibHVlXCJdKV07XG4gICAgY29uc3Qgd3NLYXRlZ29yaUthbGVuZGVyID0gd2IuYWRkV29ya3NoZWV0KFwiMTFfS2F0ZWdvcmlfS2FsZW5kZXJcIik7XG4gICAga2F0ZWdvcmlLYWxlbmRlckRhdGEuZm9yRWFjaChyb3cgPT4gd3NLYXRlZ29yaUthbGVuZGVyLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7XG4gICAgICB3Y2g6IDMwXG4gICAgfSwge1xuICAgICAgd2NoOiAxNlxuICAgIH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NLYXRlZ29yaUthbGVuZGVyLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuICAgIGNvbnN0IGthdGVnb3JpU2lsYWJ1c0RhdGEgPSBbW1wiTmFtYSBLYXRlZ29yaVwiLFwiV2FybmFcIl0sIC4uLihzeWxsYWJ1c0NhdGVnb3JpZXMgfHwgW10pLm1hcChjYXQgPT4gW2NhdC5uYW1lIHx8XCJcIiwgY2F0LmNvbG9yIHx8XCJibHVlXCJdKV07XG4gICAgY29uc3Qgd3NLYXRlZ29yaVNpbGFidXMgPSB3Yi5hZGRXb3Jrc2hlZXQoXCIxMl9LYXRlZ29yaV9Nb2R1bFwiKTtcbiAgICBrYXRlZ29yaVNpbGFidXNEYXRhLmZvckVhY2gocm93ID0+IHdzS2F0ZWdvcmlTaWxhYnVzLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7XG4gICAgICB3Y2g6IDMwXG4gICAgfSwge1xuICAgICAgd2NoOiAxNlxuICAgIH1dO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NLYXRlZ29yaVNpbGFidXMuZ2V0Q29sdW1uKGlkeCArIDEpLndpZHRoID0gY29sLndjaDsgfSk7XG4gICAgY29uc3QgYWJzZW5zaURhdGEgPSBbW1wiVGFuZ2dhbFwiLFwiV2FrdHVcIixcIktvZGUgR3VydVwiLFwiTmFtYSBHdXJ1XCIsXCJTZXNpXCIsXCJTdGF0dXNcIixcIk1vZGVcIixcIkNhdGF0YW5cIixcIkxva2FzaSAoTGF0LCBMbmcpXCJdLCAuLi4oYXR0ZW5kYW5jZVJlY29yZHMgfHwgW10pLm1hcChyZWNvcmQgPT4gW3JlY29yZC5kYXRlIHx8XCJcIiwgcmVjb3JkLnRpbWUgfHxcIlwiLCByZWNvcmQudGVhY2hlckNvZGUgfHxcIlwiLCBnZXRUZWFjaGVyTmFtZShyZWNvcmQudGVhY2hlckNvZGUpIHx8XCJcIiwgcmVjb3JkLnNlc3Npb25OYW1lIHx8XCJcIiwgcmVjb3JkLnN0YXR1cyB8fFwiXCIsIHJlY29yZC5tb2RlIHx8XCJcIiwgcmVjb3JkLm5vdGUgfHxcIlwiLCByZWNvcmQubG9jYXRpb24gPyBgJHtyZWNvcmQubG9jYXRpb24ubGF0fSwgJHtyZWNvcmQubG9jYXRpb24ubG5nfWAgOlwiXCJdKV07XG4gICAgY29uc3Qgd3NBYnNlbnNpID0gd2IuYWRkV29ya3NoZWV0KFwiMTNfQWJzZW5zaV9HdXJ1XCIpO1xuICAgIGFic2Vuc2lEYXRhLmZvckVhY2gocm93ID0+IHdzQWJzZW5zaS5hZGRSb3cocm93KSk7XG4gICAgdmFyIGNvbHMgPSBbe1xuICAgICAgd2NoOiAxNFxuICAgIH0sIHtcbiAgICAgIHdjaDogMTJcbiAgICB9LCB7XG4gICAgICB3Y2g6IDE0XG4gICAgfSwge1xuICAgICAgd2NoOiAzNFxuICAgIH0sIHtcbiAgICAgIHdjaDogMjBcbiAgICB9LCB7XG4gICAgICB3Y2g6IDE0XG4gICAgfSwge1xuICAgICAgd2NoOiAxMlxuICAgIH0sIHtcbiAgICAgIHdjaDogMzBcbiAgICB9LCB7XG4gICAgICB3Y2g6IDI0XG4gICAgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c0Fic2Vuc2kuZ2V0Q29sdW1uKGlkeCArIDEpLndpZHRoID0gY29sLndjaDsgfSk7XG5cbiAgICBjb25zdCBrYXJ5YXdhbkRhdGEgPSBbW1wiS09ERSBLQVJZQVdBTiAoV2FqaWIpXCIsXCJOQU1BIEtBUllBV0FOIChXYWppYilcIixcIkRJVklTSSAvIEJBR0lBTlwiLFwiTk8gV0hBVFNBUFBcIl0sIC4uLihzdGFmZnMgfHwgW10pLm1hcChrID0+IFtrLmNvZGUgfHxcIlwiLCBrLm5hbWUgfHxcIlwiLCBrLmRpdmlzaW9uIHx8XCJcIiwgay5waG9uZSA/IGAnJHtrLnBob25lfWAgOlwiXCJdKV07XG4gICAgY29uc3Qgd3NLYXJ5YXdhbiA9IHdiLmFkZFdvcmtzaGVldChcIjE0X0thcnlhd2FuXCIpO1xuICAgIGthcnlhd2FuRGF0YS5mb3JFYWNoKHJvdyA9PiB3c0thcnlhd2FuLmFkZFJvdyhyb3cpKTtcbiAgICB2YXIgY29scyA9IFt7IHdjaDogMjUgfSwgeyB3Y2g6IDQwIH0sIHsgd2NoOiAyNSB9LCB7IHdjaDogMjUgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c0thcnlhd2FuLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgY29uc3Qgc2lzd2FEYXRhID0gW1tcIk5JUyAvIE5JU04gKFdhamliKVwiLFwiTkFNQSBTSVNXQSAoV2FqaWIpXCIsXCJLRUxBUyAoU2VzdWFpIERhdGEgS2VsYXMpXCIsXCJKRU5JUyBLRUxBTUlOIChML1ApXCIsXCJOTyBXSEFUU0FQUCBPUlRVXCJdLCAuLi4oc3R1ZGVudHMgfHwgW10pLm1hcChzID0+IHtcbiAgICAgIGNvbnN0IGhwID0gcy53YV9vcnR1IHx8IHMucGhvbmUgfHxcIlwiO1xuICAgICAgcmV0dXJuIFtzLm5pcyB8fCBzLmNvZGUgfHxcIlwiLCBzLm5hbWUgfHwgcy5uYW1hIHx8XCJcIiwgcy5jbGFzc19uYW1lIHx8IHMua2VsYXMgfHxcIlwiLCBzLmdlbmRlciB8fFwiXCIsIGhwID8gYCcke2hwfWAgOlwiXCJdO1xuICAgIH0pXTtcbiAgICBjb25zdCB3c1Npc3dhID0gd2IuYWRkV29ya3NoZWV0KFwiMTVfU2lzd2FcIik7XG4gICAgc2lzd2FEYXRhLmZvckVhY2gocm93ID0+IHdzU2lzd2EuYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW3sgd2NoOiAyNSB9LCB7IHdjaDogNDUgfSwgeyB3Y2g6IDM1IH0sIHsgd2NoOiAyNSB9LCB7IHdjaDogMjUgfV07XG4gICAgY29scy5mb3JFYWNoKChjb2wsIGlkeCkgPT4geyBpZihjb2wud2NoKSB3c1Npc3dhLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgY29uc3QgYnVmID0gYXdhaXQgd2IueGxzeC53cml0ZUJ1ZmZlcigpO1xuICAgIHNhdmVBcyhuZXcgQmxvYihbYnVmXSksIGBFeHBvcnQgRGF0YSAke2FwcFNldHRpbmdzLmFwcE5hbWUgfHxcIlRpbWVTY2hlZHVsZVwifS54bHN4YCk7XG4gICAgc2hvd05vdGlmaWNhdGlvbihcIkRhdGEgYmVyaGFzaWwgZGlla3Nwb3Iga2UgRXhjZWwuXCIsXCJzdWNjZXNzXCIpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gZXhwb3J0QWJzZW5zaUd1cnVUb0V4Y2VsKHJlY29yZHNUb0V4cG9ydCA9IGF0dGVuZGFuY2VSZWNvcmRzKSB7XG4gICAgY29uc3QgRXhjZWxKUyA9IChhd2FpdCBpbXBvcnQoXCJleGNlbGpzXCIpKS5kZWZhdWx0O1xuICAgIGNvbnN0IHsgc2F2ZUFzIH0gPSBhd2FpdCBpbXBvcnQoXCJmaWxlLXNhdmVyXCIpO1xuICAgIGNvbnN0IHdiID0gbmV3IEV4Y2VsSlMuV29ya2Jvb2soKTtcbiAgICBjb25zdCBhYnNlbnNpRGF0YSA9IFtcbiAgICAgIFtcIlRhbmdnYWxcIiwgXCJXYWt0dVwiLCBcIktvZGUgR3VydVwiLCBcIk5hbWEgR3VydVwiLCBcIlNlc2lcIiwgXCJTdGF0dXNcIiwgXCJNb2RlXCIsIFwiQ2F0YXRhblwiLCBcIkxva2FzaSAoTGF0LCBMbmcpXCJdLFxuICAgICAgLi4uKHJlY29yZHNUb0V4cG9ydCB8fCBbXSkubWFwKHJlY29yZCA9PiBbXG4gICAgICAgIHJlY29yZC5kYXRlIHx8IFwiXCIsXG4gICAgICAgIHJlY29yZC50aW1lIHx8IFwiXCIsXG4gICAgICAgIHJlY29yZC50ZWFjaGVyQ29kZSB8fCBcIlwiLFxuICAgICAgICBnZXRUZWFjaGVyTmFtZShyZWNvcmQudGVhY2hlckNvZGUpIHx8IFwiXCIsXG4gICAgICAgIHJlY29yZC5zZXNzaW9uTmFtZSB8fCBcIlwiLFxuICAgICAgICByZWNvcmQuc3RhdHVzIHx8IFwiXCIsXG4gICAgICAgIHJlY29yZC5tb2RlIHx8IFwiXCIsXG4gICAgICAgIHJlY29yZC5ub3RlIHx8IFwiXCIsXG4gICAgICAgIHJlY29yZC5sb2NhdGlvbiA/IGAke3JlY29yZC5sb2NhdGlvbi5sYXR9LCAke3JlY29yZC5sb2NhdGlvbi5sbmd9YCA6IFwiXCJcbiAgICAgIF0pXG4gICAgXTtcbiAgICBjb25zdCB3c0Fic2Vuc2kgPSB3Yi5hZGRXb3Jrc2hlZXQoXCJMYXBvcmFuX0Fic2Vuc2lfR3VydVwiKTtcbiAgICBhYnNlbnNpRGF0YS5mb3JFYWNoKHJvdyA9PiB3c0Fic2Vuc2kuYWRkUm93KHJvdykpO1xuICAgIHZhciBjb2xzID0gW1xuICAgICAgeyB3Y2g6IDE0IH0sIHsgd2NoOiAxMiB9LCB7IHdjaDogMTQgfSwgeyB3Y2g6IDM0IH0sXG4gICAgICB7IHdjaDogMjAgfSwgeyB3Y2g6IDE0IH0sIHsgd2NoOiAxMiB9LCB7IHdjaDogMzAgfSwgeyB3Y2g6IDI0IH1cbiAgICBdO1xuICAgIGNvbHMuZm9yRWFjaCgoY29sLCBpZHgpID0+IHsgaWYoY29sLndjaCkgd3NBYnNlbnNpLmdldENvbHVtbihpZHggKyAxKS53aWR0aCA9IGNvbC53Y2g7IH0pO1xuXG4gICAgY29uc3QgdGdsID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF07XG4gICAgY29uc3QgYnVmID0gYXdhaXQgd2IueGxzeC53cml0ZUJ1ZmZlcigpO1xuICAgIHNhdmVBcyhuZXcgQmxvYihbYnVmXSksIGBMYXBvcmFuX0Fic2Vuc2lfR3VydV8ke3RnbH0ueGxzeGApO1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJMYXBvcmFuIEFic2Vuc2kgYmVyaGFzaWwgZGlla3Nwb3Iga2UgRXhjZWwuXCIsIFwic3VjY2Vzc1wiKTtcbiAgfVxuXG4gIGNvbnN0IGhhbmRsZUZpbGVVcGxvYWQgPSBlID0+IHtcbiAgICBjb25zdCBmaWxlID0gZS50YXJnZXQuZmlsZXM/LlswXTtcbiAgICBpZiAoIWZpbGUpIHJldHVybjtcbiAgICBjb25zdCBleHQgPSBmaWxlLm5hbWUuc3BsaXQoXCIuXCIpLnBvcCgpLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKGV4dCA9PT1cInhsc3hcIiB8fCBleHQgPT09XCJ4bHNcIiB8fCBleHQgPT09XCJ4bHNtXCIpIHtcbiAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICByZWFkZXIub25sb2FkID0gYXN5bmMgZXZ0ID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBFeGNlbEpTID0gKGF3YWl0IGltcG9ydChcImV4Y2VsanNcIikpLmRlZmF1bHQ7XG4gICAgICAgICAgY29uc3Qgd29ya2Jvb2sgPSBuZXcgRXhjZWxKUy5Xb3JrYm9vaygpO1xuICAgICAgICAgIGF3YWl0IHdvcmtib29rLnhsc3gubG9hZChuZXcgVWludDhBcnJheShldnQudGFyZ2V0LnJlc3VsdCkpO1xuICAgICAgICAgIGNvbnN0IHdzID0gd29ya2Jvb2sud29ya3NoZWV0c1swXTtcbiAgICAgICAgICBjb25zdCByYXdEYXRhID0gW107XG4gICAgICAgICAgd3MuZWFjaFJvdyh7IGluY2x1ZGVFbXB0eTogdHJ1ZSB9LCAocm93KSA9PiB7XG4gICAgICAgICAgICAgY29uc3QgciA9IFtdO1xuICAgICAgICAgICAgIHJvdy5lYWNoQ2VsbCh7IGluY2x1ZGVFbXB0eTogdHJ1ZSB9LCAoY2VsbCkgPT4gci5wdXNoKGNlbGwudmFsdWUgPz8gJycpKTtcbiAgICAgICAgICAgICByYXdEYXRhLnB1c2gocik7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29uc3QgdGV4dCA9IHJhd0RhdGEubWFwKHIgPT4gci5qb2luKCdcXHQnKSkuam9pbignXFxuJyk7XG4gICAgICAgICAgc2V0QnVsa1RleHQodGV4dCk7XG4gICAgICAgICAgYW5hbHl6ZUJ1bGtEYXRhKHRleHQpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgc2hvd05vdGlmaWNhdGlvbihlcnIubWVzc2FnZSB8fFwiR2FnYWwgbWVtYmFjYSBmaWxlIEV4Y2VsLiBQYXN0aWthbiBmb3JtYXQgdmFsaWQuXCIsXCJlcnJvclwiKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHJlYWRlci5vbmVycm9yID0gKCkgPT4gc2hvd05vdGlmaWNhdGlvbihcIkZpbGUgRXhjZWwgZ2FnYWwgZGliYWNhLiBDb2JhIHBpbGloIHVsYW5nIGZpbGUgYXRhdSBwZXJpa3NhIGl6aW4gZmlsZS5cIixcImVycm9yXCIpO1xuICAgICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGV2dCA9PiB7XG4gICAgICAgIHNldEJ1bGtUZXh0KGV2dC50YXJnZXQucmVzdWx0KTtcbiAgICAgICAgYW5hbHl6ZUJ1bGtEYXRhKGV2dC50YXJnZXQucmVzdWx0KTtcbiAgICAgIH07XG4gICAgICByZWFkZXIub25lcnJvciA9ICgpID0+IHNob3dOb3RpZmljYXRpb24oXCJGaWxlIGdhZ2FsIGRpYmFjYS4gQ29iYSBwaWxpaCB1bGFuZyBmaWxlIGF0YXUgcGVyaWtzYSBpemluIGZpbGUuXCIsXCJlcnJvclwiKTtcbiAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpO1xuICAgIH1cbiAgICBpZiAoZmlsZUlucHV0UmVmLmN1cnJlbnQpIGZpbGVJbnB1dFJlZi5jdXJyZW50LnZhbHVlID1cIlwiO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVByZXZpZXdJbXBvcnQgPSAoKSA9PiB7XG4gICAgaWYgKCFidWxrVGV4dC50cmltKCkpIHtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJUZWtzIGRhdGEgbWFzaWgga29zb25nLlwiLFwid2FybmluZ1wiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYW5hbHl6ZUJ1bGtEYXRhKGJ1bGtUZXh0KTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVQcm9jZXNzSW1wb3J0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGhhbmRsZUJ1bGtUZXh0KCk7XG4gIH07XG5cbiAgXG5cbiAgY29uc3QgYW5hbHl6ZUJ1bGtEYXRhID0gdGV4dCA9PiB7XG4gICAgY29uc3QgaW1wb3J0Q29uZmlnID0gQlVMS19JTVBPUlRfQ09ORklHW2FjdGl2ZVRhYl07XG4gICAgaWYgKCFpbXBvcnRDb25maWcpIHtcbiAgICAgIHNldEJ1bGtJbXBvcnRQcmV2aWV3KHtcbiAgICAgICAgdG90YWw6IDAsXG4gICAgICAgIHZhbGlkOiAwLFxuICAgICAgICBza2lwcGVkOiAwLFxuICAgICAgICBpbnNlcnRlZDogMCxcbiAgICAgICAgdXBkYXRlZDogMCxcbiAgICAgICAgc2FtcGxlczogW10sXG4gICAgICAgIGlzc3VlczogW1wiVGFiIGluaSBiZWx1bSBtZW5kdWt1bmcgaW1wb3J0IG1hc3NhbC5cIl0sXG4gICAgICAgIHJlYXNvbnM6IHtcbiAgICAgICAgICBpbnZhbGlkOiAwXG4gICAgICAgIH0sXG4gICAgICAgIHR5cGU6IGFjdGl2ZVRhYlxuICAgICAgfSk7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiVGFiIGluaSBiZWx1bSBtZW5kdWt1bmcgaW1wb3J0IG1hc3NhbC5cIixcIndhcm5pbmdcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJvd3MgPSBwYXJzZUJ1bGtUZXh0Um93cyh0ZXh0LCBhY3RpdmVUYWIpO1xuICAgIGNvbnN0IHN1bW1hcnkgPSB7XG4gICAgICB0b3RhbDogcm93cy5sZW5ndGgsXG4gICAgICB2YWxpZDogMCxcbiAgICAgIHNraXBwZWQ6IDAsXG4gICAgICBpbnNlcnRlZDogMCxcbiAgICAgIHVwZGF0ZWQ6IDAsXG4gICAgICBzYW1wbGVzOiBbXSxcbiAgICAgIGlzc3VlczogW10sXG4gICAgICByZWFzb25zOiB7XG4gICAgICAgIGludmFsaWQ6IDBcbiAgICAgIH0sXG4gICAgICB0eXBlOiBhY3RpdmVUYWJcbiAgICB9O1xuICAgIGNvbnN0IHJlcXVpcmVkQ29sdW1ucyA9IGltcG9ydENvbmZpZy5yZXF1aXJlZENvbHVtbnMgfHwgMDtcbiAgICBjb25zdCBwdXNoU2FtcGxlID0gc2FtcGxlID0+IHtcbiAgICAgIGlmIChzdW1tYXJ5LnNhbXBsZXMubGVuZ3RoIDwgNSkgc3VtbWFyeS5zYW1wbGVzLnB1c2goc2FtcGxlKTtcbiAgICB9O1xuICAgIGNvbnN0IHB1c2hJc3N1ZSA9IChsaW5lTnVtYmVyLCByZWFzb24sIG1lc3NhZ2UpID0+IHtcbiAgICAgIHN1bW1hcnkuc2tpcHBlZCsrO1xuICAgICAgc3VtbWFyeS5yZWFzb25zW3JlYXNvbl0gPSAoc3VtbWFyeS5yZWFzb25zW3JlYXNvbl0gfHwgMCkgKyAxO1xuICAgICAgaWYgKHN1bW1hcnkuaXNzdWVzLmxlbmd0aCA8IDUpIHN1bW1hcnkuaXNzdWVzLnB1c2goYEJhcmlzICR7bGluZU51bWJlcn06ICR7bWVzc2FnZX1gKTtcbiAgICB9O1xuICAgIGlmIChhY3RpdmVUYWIgPT09XCJqdXJ1c2FuXCIpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gbmV3IFNldChtYWpvcnMubWFwKG5vcm1hbGl6ZVRleHQpKTtcbiAgICAgIHJvd3MuZm9yRWFjaCgocm93LCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBsaW5lTnVtYmVyID0gaW5kZXggKyAxO1xuICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwibmFtYSBqdXJ1c2FuIGtvc29uZ1wiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbmFtZSA9IFN0cmluZyhyb3dbMF0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgIGlmICghbmFtZSkge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwibmFtYSBqdXJ1c2FuIGtvc29uZ1wiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3VtbWFyeS52YWxpZCsrO1xuICAgICAgICBjb25zdCBrZXkgPSBub3JtYWxpemVUZXh0KG5hbWUpO1xuICAgICAgICBpZiAoZXhpc3RpbmcuaGFzKGtleSkpIHtcbiAgICAgICAgICBzdW1tYXJ5LnVwZGF0ZWQrKztcbiAgICAgICAgICBwdXNoU2FtcGxlKGAke25hbWV9IChTdWRhaCBhZGEpYCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGV4aXN0aW5nLmFkZChrZXkpO1xuICAgICAgICBzdW1tYXJ5Lmluc2VydGVkKys7XG4gICAgICAgIHB1c2hTYW1wbGUobmFtZSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cImtlbGFzXCIpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gbmV3IFNldChjbGFzc2VzLm1hcChnZXRDbGFzc0tleSkpO1xuICAgICAgcm93cy5mb3JFYWNoKChyb3csIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IGxpbmVOdW1iZXIgPSBpbmRleCArIDE7XG4gICAgICAgIGlmIChyb3cubGVuZ3RoIDwgcmVxdWlyZWRDb2x1bW5zKSB7XG4gICAgICAgICAgcHVzaElzc3VlKGxpbmVOdW1iZXIsXCJpbnZhbGlkXCIsXCJmb3JtYXQga2VsYXMgdGlkYWsgbGVuZ2thcFwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgW25hbWVSYXcsIG1ham9yUmF3LCBob21lcm9vbVJhd10gPSByb3c7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBTdHJpbmcobmFtZVJhdyB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgY29uc3QgbWFqb3IgPSBTdHJpbmcobWFqb3JSYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgIGNvbnN0IGhvbWVyb29tID0gU3RyaW5nKGhvbWVyb29tUmF3IHx8XCJcIikudHJpbSgpO1xuICAgICAgICBpZiAoIW5hbWUgfHwgIW1ham9yKSB7XG4gICAgICAgICAgcHVzaElzc3VlKGxpbmVOdW1iZXIsXCJpbnZhbGlkXCIsXCJmb3JtYXQga2VsYXMgdGlkYWsgbGVuZ2thcFwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3VtbWFyeS52YWxpZCsrO1xuICAgICAgICBjb25zdCBrZXkgPSBnZXRDbGFzc0tleSh7IG5hbWUgfSk7XG4gICAgICAgIGlmIChleGlzdGluZy5oYXMoa2V5KSkge1xuICAgICAgICAgIHN1bW1hcnkudXBkYXRlZCsrO1xuICAgICAgICAgIHB1c2hTYW1wbGUoYCR7bmFtZX0gfCAke21ham9yfSR7aG9tZXJvb20gPyBgIHwgV2FsaTogJHtob21lcm9vbX1gIDpcIlwifSAoVXBkYXRlKWApO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBleGlzdGluZy5hZGQoa2V5KTtcbiAgICAgICAgc3VtbWFyeS5pbnNlcnRlZCsrO1xuICAgICAgICBwdXNoU2FtcGxlKGAke25hbWV9IHwgJHttYWpvcn0ke2hvbWVyb29tID8gYCB8IFdhbGk6ICR7aG9tZXJvb219YCA6XCJcIn1gKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoYWN0aXZlVGFiID09PVwicnVhbmdhblwiKSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IG5ldyBTZXQocm9vbXMubWFwKGdldFJvb21LZXkpKTtcbiAgICAgIHJvd3MuZm9yRWFjaCgocm93LCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBsaW5lTnVtYmVyID0gaW5kZXggKyAxO1xuICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwiZm9ybWF0IHJ1YW5nYW4gdGlkYWsgbGVuZ2thcFwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgW2lkUmF3LCBuYW1lUmF3LCB0eXBlUmF3LCBtYWpvclJhdywgdGFyZ2V0R3JhZGVSYXcsIGlzUHJpb3JpdHlSYXddID0gcm93O1xuICAgICAgICBjb25zdCBpZCA9IFN0cmluZyhpZFJhdyB8fFwiXCIpLnRyaW0oKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBjb25zdCBuYW1lID0gU3RyaW5nKG5hbWVSYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBTdHJpbmcodHlwZVJhdyB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgY29uc3QgbWFqb3IgPSBTdHJpbmcobWFqb3JSYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgIGlmICghaWQgfHwgIW5hbWUgfHwgIXR5cGUgfHwgIW1ham9yKSB7XG4gICAgICAgICAgcHVzaElzc3VlKGxpbmVOdW1iZXIsXCJpbnZhbGlkXCIsXCJmb3JtYXQgcnVhbmdhbiB0aWRhayBsZW5na2FwXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdW1tYXJ5LnZhbGlkKys7XG4gICAgICAgIGNvbnN0IGtleSA9IGdldFJvb21LZXkoeyBpZCB9KTtcbiAgICAgICAgaWYgKGV4aXN0aW5nLmhhcyhrZXkpKSB7XG4gICAgICAgICAgc3VtbWFyeS51cGRhdGVkKys7XG4gICAgICAgICAgcHVzaFNhbXBsZShgJHtpZH0gfCAke25hbWV9IHwgJHt0eXBlfSB8ICR7bWFqb3J9IChVcGRhdGUpYCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGV4aXN0aW5nLmFkZChrZXkpO1xuICAgICAgICBzdW1tYXJ5Lmluc2VydGVkKys7XG4gICAgICAgIGNvbnN0IHRhcmdldEdyYWRlID0gU3RyaW5nKHRhcmdldEdyYWRlUmF3IHx8XCJTZW11YVwiKS50cmltKCkgfHxcIlNlbXVhXCI7XG4gICAgICAgIGNvbnN0IGlzUHJpb3JpdHkgPSBbXCJ5YVwiLFwidHJ1ZVwiLFwiMVwiXS5pbmNsdWRlcyhTdHJpbmcoaXNQcmlvcml0eVJhdyB8fFwiXCIpLnRyaW0oKS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgcHVzaFNhbXBsZShgJHtpZH0gfCAke25hbWV9IHwgJHt0eXBlfSB8ICR7bWFqb3J9IHwgJHt0YXJnZXRHcmFkZX0ke2lzUHJpb3JpdHkgP1wiIHwgUHJpb3JpdGFzXCIgOlwiXCJ9YCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cImd1cnVcIikge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBuZXcgU2V0KHRlYWNoZXJzLm1hcChnZXRUZWFjaGVyS2V5KSk7XG4gICAgICByb3dzLmZvckVhY2goKHJvdywgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgbGluZU51bWJlciA9IGluZGV4ICsgMTtcbiAgICAgICAgaWYgKHJvdy5sZW5ndGggPCByZXF1aXJlZENvbHVtbnMpIHtcbiAgICAgICAgICBwdXNoSXNzdWUobGluZU51bWJlcixcImludmFsaWRcIixcImZvcm1hdCBndXJ1IHRpZGFrIGxlbmdrYXBcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFtjb2RlUmF3LCBuYW1lUmF3LCBwYXNzd29yZFJhdywgdHlwZVJhdywgbWFqb3JSYXcsIGdyYWRlUmF3LCB0YXJnZXRKcFJhd10gPSByb3c7XG4gICAgICAgIGNvbnN0IGNvZGUgPSBTdHJpbmcoY29kZVJhdyB8fFwiXCIpLnRyaW0oKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBjb25zdCBuYW1lID0gU3RyaW5nKG5hbWVSYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgIGNvbnN0IHRhcmdldEpwID0gcGFyc2VQb3NpdGl2ZUludCh0YXJnZXRKcFJhdyxcIlwiKTtcbiAgICAgICAgaWYgKCFjb2RlIHx8ICFuYW1lKSB7XG4gICAgICAgICAgcHVzaElzc3VlKGxpbmVOdW1iZXIsXCJpbnZhbGlkXCIsXCJmb3JtYXQgZ3VydSB0aWRhayBsZW5na2FwXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdW1tYXJ5LnZhbGlkKys7XG4gICAgICAgIGNvbnN0IGtleSA9IGdldFRlYWNoZXJLZXkoeyBjb2RlIH0pO1xuICAgICAgICBpZiAoZXhpc3RpbmcuaGFzKGtleSkpIHtcbiAgICAgICAgICBzdW1tYXJ5LnVwZGF0ZWQrKztcbiAgICAgICAgICBwdXNoU2FtcGxlKGAke2NvZGV9IHwgJHtuYW1lfSB8ICR7U3RyaW5nKHBhc3N3b3JkUmF3IHx8XCIxMjNcIikudHJpbSgpIHx8XCIxMjNcIn0gfCAke1N0cmluZyh0eXBlUmF3IHx8XCJVbXVtXCIpLnRyaW0oKSB8fFwiVW11bVwifSB8ICR7U3RyaW5nKG1ham9yUmF3IHx8XCJTZW11YVwiKS50cmltKCkgfHxcIlNlbXVhXCJ9IHwgJHtTdHJpbmcoZ3JhZGVSYXcgfHxcIlNlbXVhXCIpLnRyaW0oKSB8fFwiU2VtdWFcIn0gfCAke3RhcmdldEpwIHx8XCItXCJ9IEpQIChVcGRhdGUpYCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGV4aXN0aW5nLmFkZChrZXkpO1xuICAgICAgICBzdW1tYXJ5Lmluc2VydGVkKys7XG4gICAgICAgIHB1c2hTYW1wbGUoYCR7Y29kZX0gfCAke25hbWV9IHwgJHtTdHJpbmcocGFzc3dvcmRSYXcgfHxcIjEyM1wiKS50cmltKCkgfHxcIjEyM1wifSB8ICR7U3RyaW5nKHR5cGVSYXcgfHxcIlVtdW1cIikudHJpbSgpIHx8XCJVbXVtXCJ9IHwgJHtTdHJpbmcobWFqb3JSYXcgfHxcIlNlbXVhXCIpLnRyaW0oKSB8fFwiU2VtdWFcIn0gfCAke1N0cmluZyhncmFkZVJhdyB8fFwiU2VtdWFcIikudHJpbSgpIHx8XCJTZW11YVwifSB8ICR7dGFyZ2V0SnAgfHxcIi1cIn0gSlBgKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoYWN0aXZlVGFiID09PVwibWFwZWxcIikge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBuZXcgU2V0KHN1YmplY3RzLm1hcChnZXRTdWJqZWN0S2V5KSk7XG4gICAgICByb3dzLmZvckVhY2goKHJvdywgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgbGluZU51bWJlciA9IGluZGV4ICsgMTtcbiAgICAgICAgaWYgKHJvdy5sZW5ndGggPCByZXF1aXJlZENvbHVtbnMpIHtcbiAgICAgICAgICBwdXNoSXNzdWUobGluZU51bWJlcixcImludmFsaWRcIixcImZvcm1hdCBtYXBlbCB0aWRhayBsZW5na2FwXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBbbmFtZVJhdywgZ3JhZGVSYXcsIG1ham9yUmF3LCBibG9ja1JhdywgZmlmdGhDb2x1bW4sIHNpeHRoQ29sdW1uXSA9IHJvdztcbiAgICAgICAgY29uc3QgbmFtZSA9IFN0cmluZyhuYW1lUmF3IHx8XCJcIikudHJpbSgpO1xuICAgICAgICBjb25zdCBncmFkZSA9IFN0cmluZyhncmFkZVJhdyB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgY29uc3QgbWFqb3IgPSBTdHJpbmcobWFqb3JSYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgIGNvbnN0IGlzQmxvY2sgPSBTdHJpbmcoYmxvY2tSYXcgfHxcIlwiKS50cmltKCkudG9Mb3dlckNhc2UoKSA9PT1cInlhXCI7XG4gICAgICAgIGNvbnN0IGhhc1ByYWN0aWNlUm9vbUNvbHVtbiA9IHJvdy5sZW5ndGggPj0gNjtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSBwYXJzZUludChoYXNQcmFjdGljZVJvb21Db2x1bW4gPyBzaXh0aENvbHVtbiA6IGZpZnRoQ29sdW1uLCAxMCkgfHwgMjtcbiAgICAgICAgY29uc3QgcHJhY3RpY2VSb29tSWRzID0gc2VyaWFsaXplQ3N2TGlzdChwYXJzZUNzdkxpc3QoaGFzUHJhY3RpY2VSb29tQ29sdW1uID8gZmlmdGhDb2x1bW4gOlwiXCIpKTtcbiAgICAgICAgaWYgKCFuYW1lIHx8ICFncmFkZSB8fCAhbWFqb3IpIHtcbiAgICAgICAgICBwdXNoSXNzdWUobGluZU51bWJlcixcImludmFsaWRcIixcImZvcm1hdCBtYXBlbCB0aWRhayBsZW5na2FwXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdW1tYXJ5LnZhbGlkKys7XG4gICAgICAgIGNvbnN0IGtleSA9IGdldFN1YmplY3RLZXkoeyBuYW1lIH0pO1xuICAgICAgICBpZiAoZXhpc3RpbmcuaGFzKGtleSkpIHtcbiAgICAgICAgICBzdW1tYXJ5LnVwZGF0ZWQrKztcbiAgICAgICAgICBwdXNoU2FtcGxlKGAke25hbWV9IHwgJHtncmFkZX0gfCAke21ham9yfSB8ICR7aXNCbG9jayA/XCJQcmFrdGlrXCIgOlwiVGVvcmlcIn0gfCAke3ByYWN0aWNlUm9vbUlkcyB8fFwiU2VtdWEgUnVhbmcgUHJha3Rpa1wifSB8ICR7ZHVyYXRpb259IEpQIChVcGRhdGUpYCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGV4aXN0aW5nLmFkZChrZXkpO1xuICAgICAgICBzdW1tYXJ5Lmluc2VydGVkKys7XG4gICAgICAgIHB1c2hTYW1wbGUoYCR7bmFtZX0gfCAke2dyYWRlfSB8ICR7bWFqb3J9IHwgJHtpc0Jsb2NrID9cIlByYWt0aWtcIiA6XCJUZW9yaVwifSB8ICR7cHJhY3RpY2VSb29tSWRzIHx8XCJTZW11YSBSdWFuZyBQcmFrdGlrXCJ9IHwgJHtkdXJhdGlvbn0gSlBgKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoYWN0aXZlVGFiID09PVwiYmViYW5cIikge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBuZXcgU2V0KHRlYWNoaW5nTG9hZHMubWFwKGdldExvYWRLZXkpKTtcbiAgICAgIHJvd3MuZm9yRWFjaCgocm93LCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBsaW5lTnVtYmVyID0gaW5kZXggKyAxO1xuICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwiZm9ybWF0IGJlYmFuIHRpZGFrIGxlbmdrYXBcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFt0ZWFjaGVyQ29kZVJhdywgc3ViamVjdFJhdywgdGFyZ2V0R3JhZGVSYXcsIHRhcmdldE1ham9yUmF3LCBkdXJhdGlvblJhd10gPSByb3c7XG4gICAgICAgIGNvbnN0IHRlYWNoZXJDb2RlID0gU3RyaW5nKHRlYWNoZXJDb2RlUmF3IHx8XCJcIikudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIGNvbnN0IHN1YmplY3QgPSBTdHJpbmcoc3ViamVjdFJhdyB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgY29uc3QgdGFyZ2V0R3JhZGUgPSBTdHJpbmcodGFyZ2V0R3JhZGVSYXcgfHxcIlwiKS50cmltKCkgfHxcIkFsbFwiO1xuICAgICAgICBjb25zdCB0YXJnZXRNYWpvciA9IFN0cmluZyh0YXJnZXRNYWpvclJhdyB8fFwiXCIpLnRyaW0oKSB8fFwiQWxsXCI7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcGFyc2VJbnQoZHVyYXRpb25SYXcsIDEwKSB8fCAyO1xuICAgICAgICBpZiAoIXRlYWNoZXJDb2RlIHx8ICFzdWJqZWN0KSB7XG4gICAgICAgICAgcHVzaElzc3VlKGxpbmVOdW1iZXIsXCJpbnZhbGlkXCIsXCJmb3JtYXQgYmViYW4gdGlkYWsgbGVuZ2thcFwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3VtbWFyeS52YWxpZCsrO1xuICAgICAgICBjb25zdCBrZXkgPSBnZXRMb2FkS2V5KHtcbiAgICAgICAgICB0ZWFjaGVyQ29kZSxcbiAgICAgICAgICBzdWJqZWN0LFxuICAgICAgICAgIHRhcmdldEdyYWRlLFxuICAgICAgICAgIHRhcmdldE1ham9yXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZXhpc3RpbmcuaGFzKGtleSkpIHtcbiAgICAgICAgICBzdW1tYXJ5LnVwZGF0ZWQrKztcbiAgICAgICAgICBwdXNoU2FtcGxlKGAke3RlYWNoZXJDb2RlfSB8ICR7c3ViamVjdH0gfCAke3RhcmdldEdyYWRlfSB8ICR7dGFyZ2V0TWFqb3J9IHwgJHtkdXJhdGlvbn0gSlAgKFVwZGF0ZSlgKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZXhpc3RpbmcuYWRkKGtleSk7XG4gICAgICAgIHN1bW1hcnkuaW5zZXJ0ZWQrKztcbiAgICAgICAgcHVzaFNhbXBsZShgJHt0ZWFjaGVyQ29kZX0gfCAke3N1YmplY3R9IHwgJHt0YXJnZXRHcmFkZX0gfCAke3RhcmdldE1ham9yfSB8ICR7ZHVyYXRpb259IEpQYCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cInNpbGFidXNcIiB8fCBhY3RpdmVUYWIgPT09XCJzaWxhYnVzZ3VydVwiKSB7XG4gICAgICBjb25zdCBnZXRTeWxsYWJ1c0ltcG9ydEtleSA9IGl0ZW0gPT4gW25vcm1hbGl6ZVRleHQoaXRlbS5zdWJqZWN0TmFtZSksIG5vcm1hbGl6ZVRleHQoaXRlbS50ZWFjaGVyQ29kZSksIG5vcm1hbGl6ZVRleHQoaXRlbS50aXRsZSksIG5vcm1hbGl6ZVRleHQoaXRlbS5ncmFkZVNlbWVzdGVyIHx8XCJcIildLmpvaW4oXCJfX1wiKTtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gbmV3IFNldCgoc3lsbGFidXNlcyB8fCBbXSkubWFwKGdldFN5bGxhYnVzSW1wb3J0S2V5KSk7XG4gICAgICByb3dzLmZvckVhY2goKHJvdywgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgbGluZU51bWJlciA9IGluZGV4ICsgMTtcbiAgICAgICAgaWYgKHJvdy5sZW5ndGggPCByZXF1aXJlZENvbHVtbnMpIHtcbiAgICAgICAgICBwdXNoSXNzdWUobGluZU51bWJlcixcImludmFsaWRcIixcImZvcm1hdCBzaWxhYnVzIHRpZGFrIGxlbmdrYXBcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFtzdWJqZWN0TmFtZSwgdGVhY2hlckNvZGUsIHRpdGxlLCBncmFkZVNlbWVzdGVyXSA9IHJvdztcbiAgICAgICAgaWYgKCFzdWJqZWN0TmFtZSB8fCAhdGVhY2hlckNvZGUgfHwgIXRpdGxlKSB7XG4gICAgICAgICAgcHVzaElzc3VlKGxpbmVOdW1iZXIsXCJpbnZhbGlkXCIsXCJmb3JtYXQgc2lsYWJ1cyB0aWRhayBsZW5na2FwXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdW1tYXJ5LnZhbGlkKys7XG4gICAgICAgIGNvbnN0IGtleSA9IGdldFN5bGxhYnVzSW1wb3J0S2V5KHtcbiAgICAgICAgICBzdWJqZWN0TmFtZSxcbiAgICAgICAgICB0ZWFjaGVyQ29kZSxcbiAgICAgICAgICB0aXRsZSxcbiAgICAgICAgICBncmFkZVNlbWVzdGVyXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZXhpc3RpbmcuaGFzKGtleSkpIHtcbiAgICAgICAgICBzdW1tYXJ5LnVwZGF0ZWQrKztcbiAgICAgICAgICBwdXNoU2FtcGxlKGAke3N1YmplY3ROYW1lfSB8ICR7dGVhY2hlckNvZGV9IHwgJHt0aXRsZX0gKFVwZGF0ZSlgKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZXhpc3RpbmcuYWRkKGtleSk7XG4gICAgICAgIHN1bW1hcnkuaW5zZXJ0ZWQrKztcbiAgICAgICAgcHVzaFNhbXBsZShgJHtzdWJqZWN0TmFtZX0gfCAke3RlYWNoZXJDb2RlfSB8ICR7dGl0bGV9YCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cInBlbmdhdHVyYW5cIikge1xuICAgICAgcm93cy5mb3JFYWNoKChyb3csIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IGxpbmVOdW1iZXIgPSBpbmRleCArIDE7XG4gICAgICAgIGlmIChyb3cubGVuZ3RoIDwgcmVxdWlyZWRDb2x1bW5zKSB7XG4gICAgICAgICAgcHVzaElzc3VlKGxpbmVOdW1iZXIsXCJpbnZhbGlkXCIsXCJmb3JtYXQgd2FrdHUgdGlkYWsgbGVuZ2thcFwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgW2RheU5hbWUsIGxhYmVsLCBpc0JyZWFrLCBsYWJlbEJyZWFrXSA9IHJvdztcbiAgICAgICAgaWYgKCFkYXlOYW1lIHx8ICFsYWJlbCkge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwiaGFyaSBhdGF1IHdha3R1IGtvc29uZ1wiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3VtbWFyeS52YWxpZCsrO1xuICAgICAgICBzdW1tYXJ5Lmluc2VydGVkKys7XG4gICAgICAgIHB1c2hTYW1wbGUoYCR7ZGF5TmFtZX0gfCAke2xhYmVsfSB8ICR7aXNCcmVhayA9PT1cInlhXCIgP1wiSXN0aXJhaGF0IChcIiArIGxhYmVsQnJlYWsgK1wiKVwiIDpcIktCTVwifWApO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09XCJrZXRlcnNlZGlhYW5cIikge1xuICAgICAgcm93cy5mb3JFYWNoKChyb3csIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IGxpbmVOdW1iZXIgPSBpbmRleCArIDE7XG4gICAgICAgIGlmIChyb3cubGVuZ3RoIDwgcmVxdWlyZWRDb2x1bW5zKSB7XG4gICAgICAgICAgcHVzaElzc3VlKGxpbmVOdW1iZXIsXCJpbnZhbGlkXCIsXCJmb3JtYXQga2V0ZXJzZWRpYWFuIHRpZGFrIGxlbmdrYXBcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFtjb2RlLCBzdWJqZWN0cywgZGF5c10gPSByb3c7XG4gICAgICAgIGlmICghY29kZSkge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwia29kZSBndXJ1IGtvc29uZ1wiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3VtbWFyeS52YWxpZCsrO1xuICAgICAgICBzdW1tYXJ5LnVwZGF0ZWQrKztcbiAgICAgICAgcHVzaFNhbXBsZShgJHtjb2RlfSB8IE1hcGVsOiAke3N1YmplY3RzIHx8XCItXCJ9IHwgSGFyaTogJHtkYXlzIHx8XCItXCJ9YCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cImFrYWRlbWlrXCIpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gbmV3IFNldChhY2FkZW1pY0NhbGVuZGFyLm1hcChldnQgPT4gW25vcm1hbGl6ZVRleHQoZXZ0LnRpdGxlKSwgbm9ybWFsaXplQ2FsZW5kYXJEYXRlSW5wdXQoZXZ0LmRhdGVTdGFydCksIG5vcm1hbGl6ZUNhbGVuZGFyRGF0ZUlucHV0KGV2dC5kYXRlRW5kIHx8IGV2dC5kYXRlU3RhcnQpXS5qb2luKFwiX19cIikpKTtcbiAgICAgIHJvd3MuZm9yRWFjaCgocm93LCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBsaW5lTnVtYmVyID0gaW5kZXggKyAxO1xuICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwiZm9ybWF0IGthbGVuZGVyIHRpZGFrIGxlbmdrYXBcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFt0aXRsZVJhdywgc3RhcnRSYXcsIGVuZFJhdywgY2F0ZWdvcnlSYXcsIGRlc2NyaXB0aW9uUmF3XSA9IHJvdztcbiAgICAgICAgY29uc3QgdGl0bGUgPSBTdHJpbmcodGl0bGVSYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgIGNvbnN0IGRhdGVTdGFydCA9IG5vcm1hbGl6ZUNhbGVuZGFyRGF0ZUlucHV0KHN0YXJ0UmF3KTtcbiAgICAgICAgY29uc3QgZGF0ZUVuZCA9IG5vcm1hbGl6ZUNhbGVuZGFyRGF0ZUlucHV0KGVuZFJhdyB8fCBzdGFydFJhdyk7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5TGFiZWwgPSBTdHJpbmcoY2F0ZWdvcnlSYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gU3RyaW5nKGRlc2NyaXB0aW9uUmF3IHx8XCJcIikudHJpbSgpO1xuICAgICAgICBpZiAoIXRpdGxlIHx8ICFkYXRlU3RhcnQpIHtcbiAgICAgICAgICBwdXNoSXNzdWUobGluZU51bWJlcixcImludmFsaWRcIixcImp1ZHVsIGF0YXUgdGFuZ2dhbCBtdWxhaSBrb3NvbmdcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRlRW5kICYmIGRhdGVFbmQgPCBkYXRlU3RhcnQpIHtcbiAgICAgICAgICBwdXNoSXNzdWUobGluZU51bWJlcixcImludmFsaWRcIixcInRhbmdnYWwgc2VsZXNhaSBsZWJpaCBhd2FsIGRhcmkgdGFuZ2dhbCBtdWxhaVwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3VtbWFyeS52YWxpZCsrO1xuICAgICAgICBjb25zdCBrZXkgPSBbbm9ybWFsaXplVGV4dCh0aXRsZSksIGRhdGVTdGFydCwgZGF0ZUVuZCB8fCBkYXRlU3RhcnRdLmpvaW4oXCJfX1wiKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nLmhhcyhrZXkpKSB7XG4gICAgICAgICAgc3VtbWFyeS51cGRhdGVkKys7XG4gICAgICAgICAgcHVzaFNhbXBsZShgJHt0aXRsZX0gfCAke2Zvcm1hdENhbGVuZGFyRGF0ZVJhbmdlKGRhdGVTdGFydCwgZGF0ZUVuZCl9IHwgJHtjYXRlZ29yeUxhYmVsIHx8XCJLYXRlZ29yaSBha3RpZlwifSAoVXBkYXRlKWApO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBleGlzdGluZy5hZGQoa2V5KTtcbiAgICAgICAgc3VtbWFyeS5pbnNlcnRlZCsrO1xuICAgICAgICBwdXNoU2FtcGxlKGAke3RpdGxlfSB8ICR7Zm9ybWF0Q2FsZW5kYXJEYXRlUmFuZ2UoZGF0ZVN0YXJ0LCBkYXRlRW5kKX0gfCAke2NhdGVnb3J5TGFiZWwgfHxcIkthdGVnb3JpIGFrdGlmXCJ9YCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cImthcnlhd2FuXCIpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gbmV3IFNldCgoc3RhZmZzIHx8IFtdKS5tYXAoayA9PiBTdHJpbmcoay5jb2RlIHx8XCJcIikudHJpbSgpLnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgIHJvd3MuZm9yRWFjaCgocm93LCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBsaW5lTnVtYmVyID0gaW5kZXggKyAxO1xuICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwiZm9ybWF0IGthcnlhd2FuIHRpZGFrIGxlbmdrYXBcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFtjb2RlUmF3LCBuYW1lUmF3LCBkaXZSYXcsIHBob25lUmF3XSA9IHJvdztcbiAgICAgICAgY29uc3QgY29kZSA9IFN0cmluZyhjb2RlUmF3IHx8XCJcIikudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBTdHJpbmcobmFtZVJhdyB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgaWYgKCFjb2RlIHx8ICFuYW1lKSB7XG4gICAgICAgICAgcHVzaElzc3VlKGxpbmVOdW1iZXIsXCJpbnZhbGlkXCIsXCJrb2RlIGF0YXUgbmFtYSBrb3NvbmdcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN1bW1hcnkudmFsaWQrKztcbiAgICAgICAgY29uc3Qga2V5ID0gY29kZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBpZiAoZXhpc3RpbmcuaGFzKGtleSkpIHtcbiAgICAgICAgICBzdW1tYXJ5LnVwZGF0ZWQrKztcbiAgICAgICAgICBwdXNoU2FtcGxlKGAke2NvZGV9IHwgJHtuYW1lfSAoVXBkYXRlKWApO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBleGlzdGluZy5hZGQoa2V5KTtcbiAgICAgICAgc3VtbWFyeS5pbnNlcnRlZCsrO1xuICAgICAgICBwdXNoU2FtcGxlKGAke2NvZGV9IHwgJHtuYW1lfWApO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09XCJzaXN3YVwiKSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IG5ldyBTZXQoKHN0dWRlbnRzIHx8IFtdKS5tYXAocyA9PiBTdHJpbmcocy5uaXMgfHwgcy5jb2RlIHx8XCJcIikudHJpbSgpLnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgIHJvd3MuZm9yRWFjaCgocm93LCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBsaW5lTnVtYmVyID0gaW5kZXggKyAxO1xuICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwiZm9ybWF0IHNpc3dhIHRpZGFrIGxlbmdrYXBcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFtuaXNSYXcsIG5hbWVSYXcsIGNsYXNzUmF3LCBnZW5kZXJSYXcsIHBob25lUmF3XSA9IHJvdztcbiAgICAgICAgY29uc3QgbmlzID0gU3RyaW5nKG5pc1JhdyB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgY29uc3QgbmFtZSA9IFN0cmluZyhuYW1lUmF3IHx8XCJcIikudHJpbSgpO1xuICAgICAgICBpZiAoIW5pcyB8fCAhbmFtZSkge1xuICAgICAgICAgIHB1c2hJc3N1ZShsaW5lTnVtYmVyLFwiaW52YWxpZFwiLFwiTklTIGF0YXUgbmFtYSBrb3NvbmdcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN1bW1hcnkudmFsaWQrKztcbiAgICAgICAgY29uc3Qga2V5ID0gbmlzLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChleGlzdGluZy5oYXMoa2V5KSkge1xuICAgICAgICAgIHN1bW1hcnkudXBkYXRlZCsrO1xuICAgICAgICAgIHB1c2hTYW1wbGUoYCR7bmlzfSB8ICR7bmFtZX0gfCAke2NsYXNzUmF3IHx8XCJcIn0gKFVwZGF0ZSlgKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZXhpc3RpbmcuYWRkKGtleSk7XG4gICAgICAgIHN1bW1hcnkuaW5zZXJ0ZWQrKztcbiAgICAgICAgcHVzaFNhbXBsZShgJHtuaXN9IHwgJHtuYW1lfSB8ICR7Y2xhc3NSYXcgfHxcIlwifWApO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09XCJrYXRlZ29yaV9rYWxlbmRlclwiIHx8IGFjdGl2ZVRhYiA9PT1cImthdGVnb3JpX3NpbGFidXNcIikge1xuICAgICAgY29uc3QgZXhpc3RpbmdDYXRlZ29yaWVzID0gYWN0aXZlVGFiID09PVwia2F0ZWdvcmlfa2FsZW5kZXJcIiA/IGNhbGVuZGFyQ2F0ZWdvcmllcyA6IHN5bGxhYnVzQ2F0ZWdvcmllcztcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gbmV3IFNldCgoZXhpc3RpbmdDYXRlZ29yaWVzIHx8IFtdKS5tYXAoY2F0ID0+IG5vcm1hbGl6ZVRleHQoY2F0Lm5hbWUpKSk7XG4gICAgICByb3dzLmZvckVhY2goKHJvdywgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgbGluZU51bWJlciA9IGluZGV4ICsgMTtcbiAgICAgICAgaWYgKHJvdy5sZW5ndGggPCByZXF1aXJlZENvbHVtbnMpIHtcbiAgICAgICAgICBwdXNoSXNzdWUobGluZU51bWJlcixcImludmFsaWRcIixcIm5hbWEga2F0ZWdvcmkga29zb25nXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuYW1lID0gU3RyaW5nKHJvd1swXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgY29uc3QgY29sb3IgPSBTdHJpbmcocm93WzFdIHx8XCJibHVlXCIpLnRyaW0oKSB8fFwiYmx1ZVwiO1xuICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICBwdXNoSXNzdWUobGluZU51bWJlcixcImludmFsaWRcIixcIm5hbWEga2F0ZWdvcmkga29zb25nXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdW1tYXJ5LnZhbGlkKys7XG4gICAgICAgIGNvbnN0IGtleSA9IG5vcm1hbGl6ZVRleHQobmFtZSk7XG4gICAgICAgIGlmIChleGlzdGluZy5oYXMoa2V5KSkge1xuICAgICAgICAgIHN1bW1hcnkudXBkYXRlZCsrO1xuICAgICAgICAgIHB1c2hTYW1wbGUoYCR7bmFtZX0gfCAke2NvbG9yfSAoVXBkYXRlKWApO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBleGlzdGluZy5hZGQoa2V5KTtcbiAgICAgICAgc3VtbWFyeS5pbnNlcnRlZCsrO1xuICAgICAgICBwdXNoU2FtcGxlKGAke25hbWV9IHwgJHtjb2xvcn1gKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBzZXRCdWxrSW1wb3J0UHJldmlldyhzdW1tYXJ5KTtcbiAgfTtcblxuICBjb25zdCBwcm9jZXNzQnVsa0RhdGEgPSBhc3luYyB0ZXh0ID0+IHtcbiAgICB0cnkge1xuICAgICAgaWYgKGN1cnJlbnRVc2VyPy5hdXRoVG9rZW4gJiYgKCFkYXRhYmFzZUh5ZHJhdGVkIHx8IGRhdGFiYXNlSHlkcmF0aW9uRmFpbGVkUmVmLmN1cnJlbnQpKSB7XG4gICAgICAgIHNob3dOb3RpZmljYXRpb24oXCJUdW5nZ3UgZGF0YWJhc2Ugc2VsZXNhaSBzaW5rcm9uIHNlYmVsdW0gaW1wb3J0LiBJbmkgbWVuY2VnYWggZGF0YSB0ZXJ0aW1wYS9yZXNldC5cIixcImVycm9yXCIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBjb25zdCBpbXBvcnRDb25maWcgPSBCVUxLX0lNUE9SVF9DT05GSUdbYWN0aXZlVGFiXTtcbiAgICAgIGlmICghaW1wb3J0Q29uZmlnKSB7XG4gICAgICAgIHNob3dOb3RpZmljYXRpb24oXCJUYWIgaW5pIGJlbHVtIG1lbmR1a3VuZyBpbXBvcnQgbWFzc2FsLlwiLFwid2FybmluZ1wiKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgY29uc3Qgcm93cyA9IHBhcnNlQnVsa1RleHRSb3dzKHRleHQsIGFjdGl2ZVRhYik7XG4gICAgICBpZiAocm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc2hvd05vdGlmaWNhdGlvbihcIlRpZGFrIGFkYSBiYXJpcyBkYXRhIHlhbmcgYmlzYSBkaXByb3Nlcy5cIixcIndhcm5pbmdcIik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlcXVpcmVkQ29sdW1ucyA9IGltcG9ydENvbmZpZy5yZXF1aXJlZENvbHVtbnMgfHwgMDtcbiAgICAgIGxldCBpbnNlcnRlZCA9IDA7XG4gICAgICBsZXQgdXBkYXRlZCA9IDA7XG4gICAgICBsZXQgc2tpcHBlZCA9IDA7XG4gICAgICBpZiAoYWN0aXZlVGFiID09PVwianVydXNhblwiKSB7XG4gICAgICAgIGxldCBpbnNlcnRlZENvdW50ID0gMDtcbiAgICAgICAgbGV0IHVwZGF0ZWRDb3VudCA9IDA7XG4gICAgICAgIHNldE1ham9ycyhwcmV2ID0+IHtcbiAgICAgICAgICBjb25zdCBtYXAgPSBuZXcgTWFwKHByZXYubWFwKG1ham9yID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSB0eXBlb2YgbWFqb3IgPT09J29iamVjdCcgJiYgbWFqb3IgIT09IG51bGwgPyAobWFqb3IubmFtZSB8fCBtYWpvci5wYXlsb2FkIHx8JycpIDogU3RyaW5nKG1ham9yIHx8JycpO1xuICAgICAgICAgICAgcmV0dXJuIFtub3JtYWxpemVUZXh0KG5hbWUpLCBuYW1lXTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgICAgcm93cy5mb3JFYWNoKHJvdyA9PiB7XG4gICAgICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBTdHJpbmcocm93WzBdIHx8XCJcIikudHJpbSgpO1xuICAgICAgICAgICAgaWYgKCFuYW1lKSB7XG4gICAgICAgICAgICAgIHNraXBwZWQrKztcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qga2V5ID0gbm9ybWFsaXplVGV4dChuYW1lKTtcbiAgICAgICAgICAgIGlmIChtYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgbWFwLnNldChrZXksIG5hbWUpO1xuICAgICAgICAgICAgICB1cGRhdGVkQ291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1hcC5zZXQoa2V5LCBuYW1lKTtcbiAgICAgICAgICAgICAgaW5zZXJ0ZWRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBBcnJheS5mcm9tKG1hcC52YWx1ZXMoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpbnNlcnRlZCA9IGluc2VydGVkQ291bnQ7XG4gICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkQ291bnQ7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cImtlbGFzXCIpIHtcbiAgICAgICAgbGV0IGluc2VydGVkQ291bnQgPSAwO1xuICAgICAgICBsZXQgdXBkYXRlZENvdW50ID0gMDtcbiAgICAgICAgc2V0Q2xhc3NlcyhwcmV2ID0+IHtcbiAgICAgICAgICBjb25zdCBtYXAgPSBuZXcgTWFwKHByZXYubWFwKGMgPT4gW2dldENsYXNzS2V5KGMpLCBjXSkpO1xuICAgICAgICAgIHJvd3MuZm9yRWFjaChyb3cgPT4ge1xuICAgICAgICAgICAgaWYgKHJvdy5sZW5ndGggPCByZXF1aXJlZENvbHVtbnMpIHtcbiAgICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gU3RyaW5nKHJvd1swXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IG1ham9yID0gU3RyaW5nKHJvd1sxXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IGhvbWVyb29tID0gU3RyaW5nKHJvd1syXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmICghbmFtZSB8fCAhbWFqb3IpIHtcbiAgICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBpdGVtID0ge1xuICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICBtYWpvcixcbiAgICAgICAgICAgICAgaG9tZXJvb21cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBnZXRDbGFzc0tleShpdGVtKTtcbiAgICAgICAgICAgIGlmIChtYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgbWFwLnNldChrZXksIGl0ZW0pO1xuICAgICAgICAgICAgICB1cGRhdGVkQ291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1hcC5zZXQoa2V5LCBpdGVtKTtcbiAgICAgICAgICAgICAgaW5zZXJ0ZWRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBBcnJheS5mcm9tKG1hcC52YWx1ZXMoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpbnNlcnRlZCA9IGluc2VydGVkQ291bnQ7XG4gICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkQ291bnQ7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cInJ1YW5nYW5cIikge1xuICAgICAgICBsZXQgaW5zZXJ0ZWRDb3VudCA9IDA7XG4gICAgICAgIGxldCB1cGRhdGVkQ291bnQgPSAwO1xuICAgICAgICBzZXRSb29tcyhwcmV2ID0+IHtcbiAgICAgICAgICBjb25zdCBtYXAgPSBuZXcgTWFwKHByZXYubWFwKHIgPT4gW2dldFJvb21LZXkociksIHJdKSk7XG4gICAgICAgICAgcm93cy5mb3JFYWNoKHJvdyA9PiB7XG4gICAgICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGlkID0gU3RyaW5nKHJvd1swXSB8fFwiXCIpLnRyaW0oKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IFN0cmluZyhyb3dbMV0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gU3RyaW5nKHJvd1syXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IG1ham9yID0gU3RyaW5nKHJvd1szXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEdyYWRlID0gU3RyaW5nKHJvd1s0XSB8fFwiU2VtdWFcIikudHJpbSgpIHx8XCJTZW11YVwiO1xuICAgICAgICAgICAgY29uc3QgaXNQcmlvcml0eSA9IFtcInlhXCIsXCJ0cnVlXCIsXCIxXCJdLmluY2x1ZGVzKFN0cmluZyhyb3dbNV0gfHxcIlwiKS50cmltKCkudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICBpZiAoIWlkIHx8ICFuYW1lIHx8ICF0eXBlIHx8ICFtYWpvcikge1xuICAgICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB7XG4gICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICBtYWpvcixcbiAgICAgICAgICAgICAgdGFyZ2V0R3JhZGUsXG4gICAgICAgICAgICAgIGlzUHJpb3JpdHlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBnZXRSb29tS2V5KGl0ZW0pO1xuICAgICAgICAgICAgaWYgKG1hcC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICBtYXAuc2V0KGtleSwgaXRlbSk7XG4gICAgICAgICAgICAgIHVwZGF0ZWRDb3VudCsrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWFwLnNldChrZXksIGl0ZW0pO1xuICAgICAgICAgICAgICBpbnNlcnRlZENvdW50Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIEFycmF5LmZyb20obWFwLnZhbHVlcygpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGluc2VydGVkID0gaW5zZXJ0ZWRDb3VudDtcbiAgICAgICAgdXBkYXRlZCA9IHVwZGF0ZWRDb3VudDtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aXZlVGFiID09PVwiZ3VydVwiKSB7XG4gICAgICAgIGxldCBpbnNlcnRlZENvdW50ID0gMDtcbiAgICAgICAgbGV0IHVwZGF0ZWRDb3VudCA9IDA7XG4gICAgICAgIGNvbnN0IGRlZmF1bHRJbXBvcnRlZFBhc3N3b3JkID0gYXdhaXQgaGFzaFBhc3N3b3JkKFwiMTIzXCIpO1xuICAgICAgICBjb25zdCBpbXBvcnRlZFRlYWNoZXJzID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGNvZGUgPSBTdHJpbmcocm93WzBdIHx8XCJcIikudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IFN0cmluZyhyb3dbMV0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgY29uc3QgcGFzc3dvcmRSYXcgPSBTdHJpbmcocm93WzJdID8/XCJcIikudHJpbSgpO1xuICAgICAgICAgIGNvbnN0IHR5cGVSYXcgPSBTdHJpbmcocm93WzNdIHx8XCJVbXVtXCIpLnRyaW0oKSB8fFwiVW11bVwiO1xuICAgICAgICAgIGNvbnN0IG1ham9yUmF3ID0gU3RyaW5nKHJvd1s0XSB8fFwiU2VtdWFcIikudHJpbSgpIHx8XCJTZW11YVwiO1xuICAgICAgICAgIGNvbnN0IGdyYWRlUmF3ID0gU3RyaW5nKHJvd1s1XSB8fFwiU2VtdWFcIikudHJpbSgpIHx8XCJTZW11YVwiO1xuICAgICAgICAgIGNvbnN0IHRhcmdldEpwID0gcGFyc2VQb3NpdGl2ZUludChyb3dbNl0sXCJcIik7XG4gICAgICAgICAgaWYgKCFjb2RlIHx8ICFuYW1lKSB7XG4gICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW1wb3J0ZWRUZWFjaGVycy5wdXNoKHtcbiAgICAgICAgICAgIGNvZGUsXG4gICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IHBhc3N3b3JkUmF3ID8gYXdhaXQgaGFzaFBhc3N3b3JkKHBhc3N3b3JkUmF3KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHR5cGU6IHR5cGVSYXcsXG4gICAgICAgICAgICBwcmVmZXJyZWRNYWpvcjogbWFqb3JSYXcsXG4gICAgICAgICAgICBwcmVmZXJyZWRHcmFkZTogZ3JhZGVSYXcsXG4gICAgICAgICAgICB0YXJnZXRXZWVrbHlKcDogdGFyZ2V0SnBcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0ZWFjaGVyTWFwID0gbmV3IE1hcCh0ZWFjaGVycy5tYXAodGVhY2hlciA9PiBbZ2V0VGVhY2hlcktleSh0ZWFjaGVyKSwgdGVhY2hlcl0pKTtcbiAgICAgICAgaW1wb3J0ZWRUZWFjaGVycy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgIGNvbnN0IGtleSA9IGdldFRlYWNoZXJLZXkoaXRlbSk7XG4gICAgICAgICAgaWYgKHRlYWNoZXJNYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nSXRlbSA9IHRlYWNoZXJNYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICB0ZWFjaGVyTWFwLnNldChrZXksIHtcbiAgICAgICAgICAgICAgLi4uZXhpc3RpbmdJdGVtLFxuICAgICAgICAgICAgICAuLi5pdGVtLFxuICAgICAgICAgICAgICBwYXNzd29yZDogaXRlbS5wYXNzd29yZCB8fCBleGlzdGluZ0l0ZW0ucGFzc3dvcmRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdXBkYXRlZENvdW50Kys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRlYWNoZXJNYXAuc2V0KGtleSwge1xuICAgICAgICAgICAgICAuLi5pdGVtLFxuICAgICAgICAgICAgICBwYXNzd29yZDogaXRlbS5wYXNzd29yZCB8fCBkZWZhdWx0SW1wb3J0ZWRQYXNzd29yZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpbnNlcnRlZENvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgbmV4dFRlYWNoZXJzID0gQXJyYXkuZnJvbSh0ZWFjaGVyTWFwLnZhbHVlcygpKTtcbiAgICAgICAgc2V0VGVhY2hlcnMobmV4dFRlYWNoZXJzKTtcbiAgICAgICAgYXdhaXQgc3luY0F1dGhTbmFwc2hvdFNhZmUoYWRtaW5Vc2VyLCBuZXh0VGVhY2hlcnMpO1xuICAgICAgICBpbnNlcnRlZCA9IGluc2VydGVkQ291bnQ7XG4gICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkQ291bnQ7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cIm1hcGVsXCIpIHtcbiAgICAgICAgbGV0IGluc2VydGVkQ291bnQgPSAwO1xuICAgICAgICBsZXQgdXBkYXRlZENvdW50ID0gMDtcbiAgICAgICAgc2V0U3ViamVjdHMocHJldiA9PiB7XG4gICAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcChwcmV2Lm1hcChzID0+IFtnZXRTdWJqZWN0S2V5KHMpLCBzXSkpO1xuICAgICAgICAgIHJvd3MuZm9yRWFjaChyb3cgPT4ge1xuICAgICAgICAgICAgaWYgKHJvdy5sZW5ndGggPCByZXF1aXJlZENvbHVtbnMpIHtcbiAgICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gU3RyaW5nKHJvd1swXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IGdyYWRlID0gU3RyaW5nKHJvd1sxXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IG1ham9yID0gU3RyaW5nKHJvd1syXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IGlzQmxvY2sgPSBTdHJpbmcocm93WzNdIHx8XCJcIikudHJpbSgpLnRvTG93ZXJDYXNlKCkgPT09XCJ5YVwiO1xuICAgICAgICAgICAgY29uc3QgaGFzUHJhY3RpY2VSb29tQ29sdW1uID0gcm93Lmxlbmd0aCA+PSA2O1xuICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBwYXJzZUludChoYXNQcmFjdGljZVJvb21Db2x1bW4gPyByb3dbNV0gOiByb3dbNF0sIDEwKSB8fCAyO1xuICAgICAgICAgICAgY29uc3QgcHJhY3RpY2VSb29tSWRzID0gc2VyaWFsaXplQ3N2TGlzdChwYXJzZUNzdkxpc3QoaGFzUHJhY3RpY2VSb29tQ29sdW1uID8gcm93WzRdIDpcIlwiKSk7XG4gICAgICAgICAgICBpZiAoIW5hbWUgfHwgIWdyYWRlIHx8ICFtYWpvcikge1xuICAgICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB7XG4gICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgIGdyYWRlLFxuICAgICAgICAgICAgICBtYWpvcixcbiAgICAgICAgICAgICAgaXNCbG9jayxcbiAgICAgICAgICAgICAgZGVmYXVsdER1cmF0aW9uOiBkdXJhdGlvbixcbiAgICAgICAgICAgICAgcHJhY3RpY2VSb29tSWRzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gZ2V0U3ViamVjdEtleShpdGVtKTtcbiAgICAgICAgICAgIGlmIChtYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgbWFwLnNldChrZXksIGl0ZW0pO1xuICAgICAgICAgICAgICB1cGRhdGVkQ291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1hcC5zZXQoa2V5LCBpdGVtKTtcbiAgICAgICAgICAgICAgaW5zZXJ0ZWRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBBcnJheS5mcm9tKG1hcC52YWx1ZXMoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpbnNlcnRlZCA9IGluc2VydGVkQ291bnQ7XG4gICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkQ291bnQ7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cImJlYmFuXCIpIHtcbiAgICAgICAgbGV0IGluc2VydGVkQ291bnQgPSAwO1xuICAgICAgICBsZXQgdXBkYXRlZENvdW50ID0gMDtcbiAgICAgICAgc2V0VGVhY2hpbmdMb2FkcyhwcmV2ID0+IHtcbiAgICAgICAgICBjb25zdCBtYXAgPSBuZXcgTWFwKHByZXYubWFwKGwgPT4gW2dldExvYWRLZXkobCksIGxdKSk7XG4gICAgICAgICAgcm93cy5mb3JFYWNoKHJvdyA9PiB7XG4gICAgICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHRlYWNoZXJDb2RlID0gU3RyaW5nKHJvd1swXSB8fFwiXCIpLnRyaW0oKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgY29uc3Qgc3ViamVjdCA9IFN0cmluZyhyb3dbMV0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXRHcmFkZSA9IFN0cmluZyhyb3dbMl0gfHxcIlwiKS50cmltKCkgfHxcIkFsbFwiO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0TWFqb3IgPSBTdHJpbmcocm93WzNdIHx8XCJcIikudHJpbSgpIHx8XCJBbGxcIjtcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcGFyc2VJbnQocm93WzRdLCAxMCkgfHwgMjtcbiAgICAgICAgICAgIGNvbnN0IGhhc01heENsYXNzZXNWYWx1ZSA9IHJvdy5sZW5ndGggPiA1ICYmIFN0cmluZyhyb3dbNV0gPz9cIlwiKS50cmltKCkgIT09XCJcIjtcbiAgICAgICAgICAgIGNvbnN0IG1heENsYXNzZXMgPSBoYXNNYXhDbGFzc2VzVmFsdWUgPyBwYXJzZVBvc2l0aXZlSW50KHJvd1s1XSwgMCkgOiAwO1xuICAgICAgICAgICAgaWYgKCF0ZWFjaGVyQ29kZSB8fCAhc3ViamVjdCkge1xuICAgICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGdldExvYWRLZXkoe1xuICAgICAgICAgICAgICB0ZWFjaGVyQ29kZSxcbiAgICAgICAgICAgICAgc3ViamVjdCxcbiAgICAgICAgICAgICAgdGFyZ2V0R3JhZGUsXG4gICAgICAgICAgICAgIHRhcmdldE1ham9yXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChtYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdJdGVtID0gbWFwLmdldChrZXkpO1xuICAgICAgICAgICAgICBtYXAuc2V0KGtleSwge1xuICAgICAgICAgICAgICAgIC4uLmV4aXN0aW5nSXRlbSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICAuLi4oaGFzTWF4Q2xhc3Nlc1ZhbHVlID8ge1xuICAgICAgICAgICAgICAgICAgbWF4Q2xhc3Nlc1xuICAgICAgICAgICAgICAgIH0gOiB7fSlcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHVwZGF0ZWRDb3VudCsrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHtcbiAgICAgICAgICAgICAgICBpZDogYCR7RGF0ZS5ub3coKS50b1N0cmluZygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDgpfWAsXG4gICAgICAgICAgICAgICAgdGVhY2hlckNvZGUsXG4gICAgICAgICAgICAgICAgc3ViamVjdCxcbiAgICAgICAgICAgICAgICB0YXJnZXRHcmFkZSxcbiAgICAgICAgICAgICAgICB0YXJnZXRNYWpvcixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgICAgICAgICBtYXhDbGFzc2VzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIG1hcC5zZXQoa2V5LCBpdGVtKTtcbiAgICAgICAgICAgICAgaW5zZXJ0ZWRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBBcnJheS5mcm9tKG1hcC52YWx1ZXMoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpbnNlcnRlZCA9IGluc2VydGVkQ291bnQ7XG4gICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkQ291bnQ7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZVRhYiA9PT1cInBlbmdhdHVyYW5cIikge1xuICAgICAgICBsZXQgaW5zZXJ0ZWRDb3VudCA9IDA7XG4gICAgICAgIGxldCB1cGRhdGVkQ291bnQgPSAwO1xuICAgICAgICBjb25zdCBuZXdEYXlzID0gbmV3IFNldChkYXlzKTtcbiAgICAgICAgY29uc3QgbmV3VGltZVNsb3RzID0ge1xuICAgICAgICAgIC4uLnRpbWVTbG90c1xuICAgICAgICB9O1xuICAgICAgICByb3dzLmZvckVhY2gocm93ID0+IHtcbiAgICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBkYXlOYW1lID0gU3RyaW5nKHJvd1swXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICBjb25zdCBsYWJlbCA9IFN0cmluZyhyb3dbMV0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgY29uc3QgaXNCcmVha1N0ciA9IFN0cmluZyhyb3dbMl0gfHxcIlwiKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICBjb25zdCBsYWJlbEJyZWFrID0gU3RyaW5nKHJvd1szXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICBjb25zdCBpc0JyZWFrID0gaXNCcmVha1N0ciA9PT1cInlhXCIgfHwgaXNCcmVha1N0ciA9PT1cInRydWVcIiB8fCBpc0JyZWFrU3RyID09PVwiMVwiO1xuICAgICAgICAgIGNvbnN0IHBhcnNlZEpwID0gcGFyc2VJbnQocm93WzRdLCAxMCk7XG4gICAgICAgICAgY29uc3QganBDb3VudCA9IGlzQnJlYWsgPyAwIDogaXNOYU4ocGFyc2VkSnApID8gMSA6IHBhcnNlZEpwO1xuICAgICAgICAgIGNvbnN0IG1pbnNQZXJKcCA9IHBhcnNlSW50KHJvd1s1XSwgMTApIHx8IDQ1O1xuICAgICAgICAgIGlmICghZGF5TmFtZSB8fCAhbGFiZWwpIHtcbiAgICAgICAgICAgIHNraXBwZWQrKztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RGF5cy5hZGQoZGF5TmFtZSk7XG4gICAgICAgICAgaWYgKCFuZXdUaW1lU2xvdHNbZGF5TmFtZV0pIHtcbiAgICAgICAgICAgIG5ld1RpbWVTbG90c1tkYXlOYW1lXSA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBleGlzdGluZ1Nsb3RJbmRleCA9IG5ld1RpbWVTbG90c1tkYXlOYW1lXS5maW5kSW5kZXgocyA9PiBzYW1lVGV4dChzLmxhYmVsLCBsYWJlbCkpO1xuICAgICAgICAgIGlmIChleGlzdGluZ1Nsb3RJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIG5ld1RpbWVTbG90c1tkYXlOYW1lXVtleGlzdGluZ1Nsb3RJbmRleF0gPSB7XG4gICAgICAgICAgICAgIC4uLm5ld1RpbWVTbG90c1tkYXlOYW1lXVtleGlzdGluZ1Nsb3RJbmRleF0sXG4gICAgICAgICAgICAgIGlzQnJlYWssXG4gICAgICAgICAgICAgIGxhYmVsQnJlYWs6IGlzQnJlYWsgPyBsYWJlbEJyZWFrIDpcIlwiLFxuICAgICAgICAgICAgICBqcENvdW50LFxuICAgICAgICAgICAgICBtaW5zUGVySnBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB1cGRhdGVkQ291bnQrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3VGltZVNsb3RzW2RheU5hbWVdLnB1c2goe1xuICAgICAgICAgICAgICBpZDogYCR7ZGF5TmFtZX0tJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyLCA2KX1gLFxuICAgICAgICAgICAgICBsYWJlbCxcbiAgICAgICAgICAgICAgaXNCcmVhayxcbiAgICAgICAgICAgICAgbGFiZWxCcmVhazogaXNCcmVhayA/IGxhYmVsQnJlYWsgOlwiXCIsXG4gICAgICAgICAgICAgIGpwQ291bnQsXG4gICAgICAgICAgICAgIG1pbnNQZXJKcFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpbnNlcnRlZENvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmtleXMobmV3VGltZVNsb3RzKS5mb3JFYWNoKGRheSA9PiB7XG4gICAgICAgICAgbmV3VGltZVNsb3RzW2RheV0uc29ydCgoYSwgYikgPT4gYS5sYWJlbC5sb2NhbGVDb21wYXJlKGIubGFiZWwpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IG5leHREYXlzID0gQXJyYXkuZnJvbShuZXdEYXlzKTtcbiAgICAgICAgc2V0RGF5cyhuZXh0RGF5cyk7XG4gICAgICAgIHNldFRpbWVTbG90cyhuZXdUaW1lU2xvdHMpO1xuICAgICAgICBzZXRUZWFjaGVyQXZhaWxhYmlsaXR5KHByZXYgPT4ge1xuICAgICAgICAgIGNvbnN0IG5leHQgPSB7XG4gICAgICAgICAgICAuLi5wcmV2XG4gICAgICAgICAgfTtcbiAgICAgICAgICBjb25zdCB0ZWFjaGVyQ29kZXMgPSBuZXcgU2V0KFsuLi5PYmplY3Qua2V5cyhwcmV2KSwgLi4udGVhY2hlcnMubWFwKHRlYWNoZXIgPT4gdGVhY2hlci5jb2RlKS5maWx0ZXIoQm9vbGVhbildKTtcbiAgICAgICAgICB0ZWFjaGVyQ29kZXMuZm9yRWFjaChjb2RlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gbmV4dFtjb2RlXSB8fCB7XG4gICAgICAgICAgICAgIGRheXM6IFtdLFxuICAgICAgICAgICAgICBzdWJqZWN0czogW11cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0RheXMgPSBBcnJheS5pc0FycmF5KGVudHJ5LmRheXMpID8gZW50cnkuZGF5cy5maWx0ZXIoZGF5ID0+IG5ld0RheXMuaGFzKGRheSkpIDogW107XG4gICAgICAgICAgICBuZXh0W2NvZGVdID0ge1xuICAgICAgICAgICAgICAuLi5lbnRyeSxcbiAgICAgICAgICAgICAgZGF5czogZXhpc3RpbmdEYXlzLmxlbmd0aCA/IEFycmF5LmZyb20obmV3IFNldChleGlzdGluZ0RheXMpKSA6IG5leHREYXlzLFxuICAgICAgICAgICAgICBzdWJqZWN0czogQXJyYXkuaXNBcnJheShlbnRyeS5zdWJqZWN0cykgPyBlbnRyeS5zdWJqZWN0cyA6IFtdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBuZXh0O1xuICAgICAgICB9KTtcbiAgICAgICAgaW5zZXJ0ZWQgPSBpbnNlcnRlZENvdW50O1xuICAgICAgICB1cGRhdGVkID0gdXBkYXRlZENvdW50O1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09XCJzaWxhYnVzXCIgfHwgYWN0aXZlVGFiID09PVwic2lsYWJ1c2d1cnVcIikge1xuICAgICAgICBsZXQgaW5zZXJ0ZWRDb3VudCA9IDA7XG4gICAgICAgIGxldCB1cGRhdGVkQ291bnQgPSAwO1xuICAgICAgICBjb25zdCBnZXRTeWxsYWJ1c0ltcG9ydEtleSA9IGl0ZW0gPT4gW25vcm1hbGl6ZVRleHQoaXRlbS5zdWJqZWN0TmFtZSksIG5vcm1hbGl6ZVRleHQoaXRlbS50ZWFjaGVyQ29kZSksIG5vcm1hbGl6ZVRleHQoaXRlbS50aXRsZSksIG5vcm1hbGl6ZVRleHQoaXRlbS5ncmFkZVNlbWVzdGVyIHx8XCJcIildLmpvaW4oXCJfX1wiKTtcbiAgICAgICAgY29uc3Qgc3lsbGFidXNNYXAgPSBuZXcgTWFwKChzeWxsYWJ1c2VzIHx8IFtdKS5tYXAoaXRlbSA9PiBbZ2V0U3lsbGFidXNJbXBvcnRLZXkoaXRlbSksIGl0ZW1dKSk7XG4gICAgICAgIHJvd3MuZm9yRWFjaChyb3cgPT4ge1xuICAgICAgICAgIGlmIChyb3cubGVuZ3RoIDwgcmVxdWlyZWRDb2x1bW5zKSB7XG4gICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHN1YmplY3ROYW1lID0gU3RyaW5nKHJvd1swXSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICBjb25zdCB0ZWFjaGVyQ29kZSA9IFN0cmluZyhyb3dbMV0gfHxcIlwiKS50cmltKCkudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICBjb25zdCB0aXRsZSA9IFN0cmluZyhyb3dbMl0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgY29uc3QgZ3JhZGVTZW1lc3RlciA9IFN0cmluZyhyb3dbM10gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgY29uc3Qgb2JqZWN0aXZlcyA9IFN0cmluZyhyb3dbNF0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgY29uc3QgbWF0ZXJpYWxzID0gU3RyaW5nKHJvd1s1XSB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICBjb25zdCBub3RlcyA9IFN0cmluZyhyb3dbNl0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgaWYgKCFzdWJqZWN0TmFtZSB8fCAhdGVhY2hlckNvZGUgfHwgIXRpdGxlKSB7XG4gICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGtleSA9IGdldFN5bGxhYnVzSW1wb3J0S2V5KHtcbiAgICAgICAgICAgIHN1YmplY3ROYW1lLFxuICAgICAgICAgICAgdGVhY2hlckNvZGUsXG4gICAgICAgICAgICB0aXRsZSxcbiAgICAgICAgICAgIGdyYWRlU2VtZXN0ZXJcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb25zdCBleGlzdGluZ0l0ZW0gPSBzeWxsYWJ1c01hcC5nZXQoa2V5KTtcbiAgICAgICAgICBzeWxsYWJ1c01hcC5zZXQoa2V5LCB7XG4gICAgICAgICAgICAuLi4oZXhpc3RpbmdJdGVtIHx8IHt9KSxcbiAgICAgICAgICAgIGlkOiBleGlzdGluZ0l0ZW0/LmlkIHx8IGAke0RhdGUubm93KCkudG9TdHJpbmcoKX0tJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyLCA4KX1gLFxuICAgICAgICAgICAgc3ViamVjdE5hbWUsXG4gICAgICAgICAgICB0ZWFjaGVyQ29kZSxcbiAgICAgICAgICAgIHRpdGxlLFxuICAgICAgICAgICAgZ3JhZGVTZW1lc3RlcixcbiAgICAgICAgICAgIG9iamVjdGl2ZXMsXG4gICAgICAgICAgICBtYXRlcmlhbHMsXG4gICAgICAgICAgICBub3Rlc1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChleGlzdGluZ0l0ZW0pIHVwZGF0ZWRDb3VudCsrOyBlbHNlIGluc2VydGVkQ291bnQrKztcbiAgICAgICAgfSk7XG4gICAgICAgIHVzZUFwcFN0b3JlLnNldFN0YXRlKHtcbiAgICAgICAgICBzeWxsYWJ1c2VzOiBBcnJheS5mcm9tKHN5bGxhYnVzTWFwLnZhbHVlcygpKVxuICAgICAgICB9KTtcbiAgICAgICAgaW5zZXJ0ZWQgPSBpbnNlcnRlZENvdW50O1xuICAgICAgICB1cGRhdGVkID0gdXBkYXRlZENvdW50O1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09XCJha2FkZW1pa1wiKSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5TWFwID0gbmV3IE1hcChjYWxlbmRhckNhdGVnb3JpZXMubWFwKGNhdCA9PiBbbm9ybWFsaXplVGV4dChjYXQubmFtZSksIGNhdC5pZF0pKTtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnlJZHMgPSBuZXcgU2V0KGNhbGVuZGFyQ2F0ZWdvcmllcy5tYXAoY2F0ID0+IGNhdC5pZCkpO1xuICAgICAgICBjb25zdCBuZXh0Q2F0ZWdvcmllcyA9IFsuLi5jYWxlbmRhckNhdGVnb3JpZXNdO1xuICAgICAgICBjb25zdCBldmVudE1hcCA9IG5ldyBNYXAoYWNhZGVtaWNDYWxlbmRhci5tYXAoZXZ0ID0+IHtcbiAgICAgICAgICBjb25zdCBrZXkgPSBbbm9ybWFsaXplVGV4dChldnQudGl0bGUpLCBub3JtYWxpemVDYWxlbmRhckRhdGVJbnB1dChldnQuZGF0ZVN0YXJ0KSwgbm9ybWFsaXplQ2FsZW5kYXJEYXRlSW5wdXQoZXZ0LmRhdGVFbmQgfHwgZXZ0LmRhdGVTdGFydCldLmpvaW4oXCJfX1wiKTtcbiAgICAgICAgICByZXR1cm4gW2tleSwgZXZ0XTtcbiAgICAgICAgfSkpO1xuICAgICAgICBsZXQgaW5zZXJ0ZWRDb3VudCA9IDA7XG4gICAgICAgIGxldCB1cGRhdGVkQ291bnQgPSAwO1xuICAgICAgICByb3dzLmZvckVhY2gocm93ID0+IHtcbiAgICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBbdGl0bGVSYXcsIHN0YXJ0UmF3LCBlbmRSYXcsIGNhdGVnb3J5UmF3LCBkZXNjcmlwdGlvblJhd10gPSByb3c7XG4gICAgICAgICAgY29uc3QgdGl0bGUgPSBTdHJpbmcodGl0bGVSYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgY29uc3QgZGF0ZVN0YXJ0ID0gbm9ybWFsaXplQ2FsZW5kYXJEYXRlSW5wdXQoc3RhcnRSYXcpO1xuICAgICAgICAgIGNvbnN0IGRhdGVFbmQgPSBub3JtYWxpemVDYWxlbmRhckRhdGVJbnB1dChlbmRSYXcgfHwgc3RhcnRSYXcpO1xuICAgICAgICAgIGNvbnN0IGNhdGVnb3J5TGFiZWwgPSBTdHJpbmcoY2F0ZWdvcnlSYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBTdHJpbmcoZGVzY3JpcHRpb25SYXcgfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgaWYgKCF0aXRsZSB8fCAhZGF0ZVN0YXJ0KSB7XG4gICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkYXRlRW5kICYmIGRhdGVFbmQgPCBkYXRlU3RhcnQpIHtcbiAgICAgICAgICAgIHNraXBwZWQrKztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGV0IGNhdGVnb3J5SWQgPSBjYWxlbmRhckNhdGVnb3JpZXNbMF0/LmlkIHx8XCJcIjtcbiAgICAgICAgICBpZiAoY2F0ZWdvcnlMYWJlbCkge1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZENhdGVnb3J5ID0gbm9ybWFsaXplVGV4dChjYXRlZ29yeUxhYmVsKTtcbiAgICAgICAgICAgIGNhdGVnb3J5SWQgPSBjYXRlZ29yeU1hcC5nZXQobm9ybWFsaXplZENhdGVnb3J5KSB8fCBnZXRDYWxlbmRhckNhdGVnb3J5SWRCeUxhYmVsKGNhdGVnb3J5TGFiZWwpO1xuICAgICAgICAgICAgaWYgKCFjYXRlZ29yeUlkcy5oYXMoY2F0ZWdvcnlJZCkpIHtcbiAgICAgICAgICAgICAgY2F0ZWdvcnlJZHMuYWRkKGNhdGVnb3J5SWQpO1xuICAgICAgICAgICAgICBjYXRlZ29yeU1hcC5zZXQobm9ybWFsaXplZENhdGVnb3J5LCBjYXRlZ29yeUlkKTtcbiAgICAgICAgICAgICAgbmV4dENhdGVnb3JpZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgaWQ6IGNhdGVnb3J5SWQsXG4gICAgICAgICAgICAgICAgbmFtZTogY2F0ZWdvcnlMYWJlbCxcbiAgICAgICAgICAgICAgICBjb2xvcjpcImJsdWVcIlxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICBpZDogY3JlYXRlQ2xpZW50SWQoKSxcbiAgICAgICAgICAgIHRpdGxlLFxuICAgICAgICAgICAgZGF0ZVN0YXJ0LFxuICAgICAgICAgICAgZGF0ZUVuZDogZGF0ZUVuZCB8fCBkYXRlU3RhcnQsXG4gICAgICAgICAgICBjYXRlZ29yeUlkLFxuICAgICAgICAgICAgZGVzY3JpcHRpb25cbiAgICAgICAgICB9O1xuICAgICAgICAgIGNvbnN0IGtleSA9IFtub3JtYWxpemVUZXh0KHRpdGxlKSwgZXZlbnQuZGF0ZVN0YXJ0LCBldmVudC5kYXRlRW5kXS5qb2luKFwiX19cIik7XG4gICAgICAgICAgaWYgKGV2ZW50TWFwLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICBldmVudC5pZCA9IGV2ZW50TWFwLmdldChrZXkpLmlkO1xuICAgICAgICAgICAgdXBkYXRlZENvdW50Kys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluc2VydGVkQ291bnQrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgZXZlbnRNYXAuc2V0KGtleSwgZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2V0Q2FsZW5kYXJDYXRlZ29yaWVzKG5leHRDYXRlZ29yaWVzKTtcbiAgICAgICAgc2V0QWNhZGVtaWNDYWxlbmRhcihBcnJheS5mcm9tKGV2ZW50TWFwLnZhbHVlcygpKS5zb3J0KChhLCBiKSA9PiBuZXcgRGF0ZShhLmRhdGVTdGFydCkgLSBuZXcgRGF0ZShiLmRhdGVTdGFydCkpKTtcbiAgICAgICAgaW5zZXJ0ZWQgPSBpbnNlcnRlZENvdW50O1xuICAgICAgICB1cGRhdGVkID0gdXBkYXRlZENvdW50O1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09XCJrYXJ5YXdhblwiKSB7XG4gICAgICAgIGxldCBpbnNlcnRlZENvdW50ID0gMDtcbiAgICAgICAgbGV0IHVwZGF0ZWRDb3VudCA9IDA7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nTWFwID0gbmV3IE1hcCgoc3RhZmZzIHx8IFtdKS5tYXAoayA9PiBbU3RyaW5nKGsuY29kZSB8fFwiXCIpLnRyaW0oKS50b0xvd2VyQ2FzZSgpLCBrXSkpO1xuICAgICAgICByb3dzLmZvckVhY2gocm93ID0+IHtcbiAgICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBbY29kZVJhdywgbmFtZVJhdywgZGl2UmF3LCBwaG9uZVJhd10gPSByb3c7XG4gICAgICAgICAgY29uc3QgY29kZSA9IFN0cmluZyhjb2RlUmF3IHx8XCJcIikudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IFN0cmluZyhuYW1lUmF3IHx8XCJcIikudHJpbSgpO1xuICAgICAgICAgIGlmICghY29kZSB8fCAhbmFtZSkge1xuICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBrZXkgPSBjb2RlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgaWYgKGV4aXN0aW5nTWFwLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICBleGlzdGluZ01hcC5zZXQoa2V5LCB7XG4gICAgICAgICAgICAgIC4uLmV4aXN0aW5nTWFwLmdldChrZXkpLFxuICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICBkaXZpc2lvbjogU3RyaW5nKGRpdlJhdyB8fFwiXCIpLnRyaW0oKSxcbiAgICAgICAgICAgICAgcGhvbmU6IFN0cmluZyhwaG9uZVJhdyB8fFwiXCIpLnRyaW0oKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB1cGRhdGVkQ291bnQrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXhpc3RpbmdNYXAuc2V0KGtleSwge1xuICAgICAgICAgICAgICBjb2RlLFxuICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICBkaXZpc2lvbjogU3RyaW5nKGRpdlJhdyB8fFwiXCIpLnRyaW0oKSxcbiAgICAgICAgICAgICAgcGhvbmU6IFN0cmluZyhwaG9uZVJhdyB8fFwiXCIpLnRyaW0oKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpbnNlcnRlZENvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNldFN0YWZmcykgc2V0U3RhZmZzKEFycmF5LmZyb20oZXhpc3RpbmdNYXAudmFsdWVzKCkpKTtcbiAgICAgICAgaW5zZXJ0ZWQgPSBpbnNlcnRlZENvdW50O1xuICAgICAgICB1cGRhdGVkID0gdXBkYXRlZENvdW50O1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09XCJzaXN3YVwiKSB7XG4gICAgICAgIGxldCBpbnNlcnRlZENvdW50ID0gMDtcbiAgICAgICAgbGV0IHVwZGF0ZWRDb3VudCA9IDA7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nTWFwID0gbmV3IE1hcCgoc3R1ZGVudHMgfHwgW10pLm1hcChzID0+IFtTdHJpbmcocy5uaXMgfHwgcy5jb2RlIHx8XCJcIikudHJpbSgpLnRvTG93ZXJDYXNlKCksIHNdKSk7XG4gICAgICAgIHJvd3MuZm9yRWFjaChyb3cgPT4ge1xuICAgICAgICAgIGlmIChyb3cubGVuZ3RoIDwgcmVxdWlyZWRDb2x1bW5zKSB7XG4gICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IFtuaXNSYXcsIG5hbWVSYXcsIGNsYXNzUmF3LCBnZW5kZXJSYXcsIHBob25lUmF3XSA9IHJvdztcbiAgICAgICAgICBjb25zdCBuaXMgPSBTdHJpbmcobmlzUmF3IHx8XCJcIikudHJpbSgpO1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSBTdHJpbmcobmFtZVJhdyB8fFwiXCIpLnRyaW0oKTtcbiAgICAgICAgICBpZiAoIW5pcyB8fCAhbmFtZSkge1xuICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBrZXkgPSBuaXMudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdNYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgIGV4aXN0aW5nTWFwLnNldChrZXksIHtcbiAgICAgICAgICAgICAgLi4uZXhpc3RpbmdNYXAuZ2V0KGtleSksXG4gICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgIG5hbWE6IG5hbWUsXG4gICAgICAgICAgICAgIGNsYXNzX25hbWU6IFN0cmluZyhjbGFzc1JhdyB8fFwiXCIpLnRyaW0oKSxcbiAgICAgICAgICAgICAga2VsYXM6IFN0cmluZyhjbGFzc1JhdyB8fFwiXCIpLnRyaW0oKSxcbiAgICAgICAgICAgICAgZ2VuZGVyOiBTdHJpbmcoZ2VuZGVyUmF3IHx8XCJcIikudHJpbSgpLnRvVXBwZXJDYXNlKCkgPT09XCJQXCIgP1wiUFwiIDpcIkxcIixcbiAgICAgICAgICAgICAgd2Ffb3J0dTogU3RyaW5nKHBob25lUmF3IHx8XCJcIikudHJpbSgpLFxuICAgICAgICAgICAgICBwaG9uZTogU3RyaW5nKHBob25lUmF3IHx8XCJcIikudHJpbSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHVwZGF0ZWRDb3VudCsrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleGlzdGluZ01hcC5zZXQoa2V5LCB7XG4gICAgICAgICAgICAgIG5pczogbmlzLFxuICAgICAgICAgICAgICBjb2RlOiBuaXMsXG4gICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgIG5hbWE6IG5hbWUsXG4gICAgICAgICAgICAgIGNsYXNzX25hbWU6IFN0cmluZyhjbGFzc1JhdyB8fFwiXCIpLnRyaW0oKSxcbiAgICAgICAgICAgICAga2VsYXM6IFN0cmluZyhjbGFzc1JhdyB8fFwiXCIpLnRyaW0oKSxcbiAgICAgICAgICAgICAgZ2VuZGVyOiBTdHJpbmcoZ2VuZGVyUmF3IHx8XCJcIikudHJpbSgpLnRvVXBwZXJDYXNlKCkgPT09XCJQXCIgP1wiUFwiIDpcIkxcIixcbiAgICAgICAgICAgICAgd2Ffb3J0dTogU3RyaW5nKHBob25lUmF3IHx8XCJcIikudHJpbSgpLFxuICAgICAgICAgICAgICBwaG9uZTogU3RyaW5nKHBob25lUmF3IHx8XCJcIikudHJpbSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGluc2VydGVkQ291bnQrKztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2V0U3R1ZGVudHMpIHNldFN0dWRlbnRzKEFycmF5LmZyb20oZXhpc3RpbmdNYXAudmFsdWVzKCkpKTtcbiAgICAgICAgaW5zZXJ0ZWQgPSBpbnNlcnRlZENvdW50O1xuICAgICAgICB1cGRhdGVkID0gdXBkYXRlZENvdW50O1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09XCJrYXRlZ29yaV9rYWxlbmRlclwiIHx8IGFjdGl2ZVRhYiA9PT1cImthdGVnb3JpX3NpbGFidXNcIikge1xuICAgICAgICBjb25zdCBhbGxvd2VkQ29sb3JzID0gbmV3IFNldChbXCJibHVlXCIsXCJyZWRcIixcImdyZWVuXCIsXCJlbWVyYWxkXCIsXCJhbWJlclwiLFwicHVycGxlXCIsXCJwaW5rXCIsXCJzbGF0ZVwiLFwiY3lhblwiLFwib3JhbmdlXCJdKTtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplQ2F0ZWdvcnlDb2xvciA9IHZhbHVlID0+IHtcbiAgICAgICAgICBjb25zdCBjb2xvciA9IFN0cmluZyh2YWx1ZSB8fFwiYmx1ZVwiKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICByZXR1cm4gYWxsb3dlZENvbG9ycy5oYXMoY29sb3IpID8gY29sb3IgOlwiYmx1ZVwiO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzb3VyY2VDYXRlZ29yaWVzID0gYWN0aXZlVGFiID09PVwia2F0ZWdvcmlfa2FsZW5kZXJcIiA/IGNhbGVuZGFyQ2F0ZWdvcmllcyA6IHN5bGxhYnVzQ2F0ZWdvcmllcztcbiAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcCgoc291cmNlQ2F0ZWdvcmllcyB8fCBbXSkubWFwKGNhdCA9PiBbbm9ybWFsaXplVGV4dChjYXQubmFtZSksIGNhdF0pKTtcbiAgICAgICAgbGV0IGluc2VydGVkQ291bnQgPSAwO1xuICAgICAgICBsZXQgdXBkYXRlZENvdW50ID0gMDtcbiAgICAgICAgcm93cy5mb3JFYWNoKHJvdyA9PiB7XG4gICAgICAgICAgaWYgKHJvdy5sZW5ndGggPCByZXF1aXJlZENvbHVtbnMpIHtcbiAgICAgICAgICAgIHNraXBwZWQrKztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbmFtZSA9IFN0cmluZyhyb3dbMF0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgY29uc3QgY29sb3IgPSBub3JtYWxpemVDYXRlZ29yeUNvbG9yKHJvd1sxXSk7XG4gICAgICAgICAgaWYgKCFuYW1lKSB7XG4gICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGtleSA9IG5vcm1hbGl6ZVRleHQobmFtZSk7XG4gICAgICAgICAgY29uc3QgZXhpc3RpbmdDYXRlZ29yeSA9IG1hcC5nZXQoa2V5KTtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdDYXRlZ29yeSkge1xuICAgICAgICAgICAgbWFwLnNldChrZXksIHtcbiAgICAgICAgICAgICAgLi4uZXhpc3RpbmdDYXRlZ29yeSxcbiAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgY29sb3JcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdXBkYXRlZENvdW50Kys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hcC5zZXQoa2V5LCB7XG4gICAgICAgICAgICAgIGlkOiBgJHthY3RpdmVUYWIgPT09XCJrYXRlZ29yaV9rYWxlbmRlclwiID9cImNhbC1jXCIgOlwiY2F0XCJ9LSR7Y3JlYXRlQ2xpZW50SWQoKX1gLFxuICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICBjb2xvclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpbnNlcnRlZENvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgbmV4dENhdGVnb3JpZXMgPSBBcnJheS5mcm9tKG1hcC52YWx1ZXMoKSk7XG4gICAgICAgIGlmIChhY3RpdmVUYWIgPT09XCJrYXRlZ29yaV9rYWxlbmRlclwiKSB7XG4gICAgICAgICAgc2V0Q2FsZW5kYXJDYXRlZ29yaWVzKG5leHRDYXRlZ29yaWVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB1c2VBcHBTdG9yZS5zZXRTdGF0ZSh7XG4gICAgICAgICAgICBzeWxsYWJ1c0NhdGVnb3JpZXM6IG5leHRDYXRlZ29yaWVzXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zZXJ0ZWQgPSBpbnNlcnRlZENvdW50O1xuICAgICAgICB1cGRhdGVkID0gdXBkYXRlZENvdW50O1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmVUYWIgPT09XCJrZXRlcnNlZGlhYW5cIikge1xuICAgICAgICBsZXQgdXBkYXRlZENvdW50ID0gMDtcbiAgICAgICAgc2V0VGVhY2hlckF2YWlsYWJpbGl0eShwcmV2ID0+IHtcbiAgICAgICAgICBjb25zdCBuZXh0ID0ge1xuICAgICAgICAgICAgLi4ucHJldlxuICAgICAgICAgIH07XG4gICAgICAgICAgcm93cy5mb3JFYWNoKHJvdyA9PiB7XG4gICAgICAgICAgICBpZiAocm93Lmxlbmd0aCA8IHJlcXVpcmVkQ29sdW1ucykge1xuICAgICAgICAgICAgICBza2lwcGVkKys7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGNvZGUgPSBTdHJpbmcocm93WzBdIHx8XCJcIikudHJpbSgpO1xuICAgICAgICAgICAgY29uc3Qgc3ViamVjdHNTdHIgPSBTdHJpbmcocm93WzFdIHx8XCJcIikudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgZGF5c1N0ciA9IFN0cmluZyhyb3dbMl0gfHxcIlwiKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoIWNvZGUpIHtcbiAgICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBzdWJqQXJyYXkgPSBzdWJqZWN0c1N0ci5zcGxpdChcIixcIikubWFwKHMgPT4gcy50cmltKCkpLmZpbHRlcihCb29sZWFuKTtcbiAgICAgICAgICAgIGNvbnN0IGRheXNBcnJheSA9IGRheXNTdHIuc3BsaXQoXCIsXCIpLm1hcChkID0+IGQudHJpbSgpKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgICAgICBuZXh0W2NvZGVdID0ge1xuICAgICAgICAgICAgICBkYXlzOiBkYXlzQXJyYXksXG4gICAgICAgICAgICAgIHN1YmplY3RzOiBzdWJqQXJyYXlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB1cGRhdGVkQ291bnQrKztcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgfSk7XG4gICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkQ291bnQ7XG4gICAgICAgIGluc2VydGVkID0gMDtcbiAgICAgIH1cbiAgICAgIHNob3dOb3RpZmljYXRpb24oYEltcG9ydCBzZWxlc2FpOiArJHtpbnNlcnRlZH0gZGl0YW1iYWhrYW4sICR7dXBkYXRlZH0gZGlwZXJiYXJ1aSR7c2tpcHBlZCA/IGAsICR7c2tpcHBlZH0gZGlsZXdhdGlgIDpcIlwifS5gLFwic3VjY2Vzc1wiKTtcbiAgICAgIHNldEJ1bGtJbXBvcnRQcmV2aWV3KG51bGwpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJGb3JtYXQgZGF0YSBzYWxhaC4gUGFzdGlrYW4gZmlsZSBhdGF1IHRla3MgbWVuZ2d1bmFrYW4gZm9ybWF0IEV4Y2VsL0NTVi9UWFQgeWFuZyBzZXN1YWkuXCIsXCJlcnJvclwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUJ1bGtUZXh0ID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHN1Y2Nlc3MgPSBhd2FpdCBwcm9jZXNzQnVsa0RhdGEoYnVsa1RleHQpO1xuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICBzZXRCdWxrVGV4dChcIlwiKTtcbiAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICB9XG4gIH07XG5cbnJldHVybiB7XG4gICAgZG93bmxvYWRNYXN0ZXJUZW1wbGF0ZSxcbiAgICBleHBvcnRBbGxEYXRhVG9FeGNlbCxcbiAgICBleHBvcnRBYnNlbnNpR3VydVRvRXhjZWwsXG4gICAgaGFuZGxlRmlsZVVwbG9hZCxcbiAgICBoYW5kbGVQcmV2aWV3SW1wb3J0LFxuICAgIGhhbmRsZVByb2Nlc3NJbXBvcnRcbiAgfTtcbn1cbiJdfQ==