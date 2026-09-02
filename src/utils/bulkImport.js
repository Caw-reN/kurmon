

export const BULK_IMPORT_CONFIG = {
  jurusan: {
    sheet: "1_Jurusan",
    requiredColumns: 1,
    headerHints: [["nama jurusan"]],
  },
  kelas: {
    sheet: "2_Kelas",
    requiredColumns: 2,
    headerHints: [["nama kelas", "jurusan"]],
  },
  guru: {
    sheet: "3_Guru",
    requiredColumns: 5,
    headerHints: [["kode guru", "nama guru", "password", "kategori", "prioritas jurusan"]],
  },
  mapel: {
    sheet: "4_Mapel",
    requiredColumns: 5,
    headerHints: [
      ["nama mapel", "grade", "jurusan", "praktik", "ruangan praktik", "durasi"],
      ["nama mapel", "grade", "jurusan", "praktik", "durasi"],
    ],
  },
  ruangan: {
    sheet: "5_Ruangan",
    requiredColumns: 4,
    headerHints: [
      ["id ruang", "nama ruangan", "tipe", "jurusan", "target tingkat", "prioritas"],
      ["id ruang", "nama ruangan", "tipe", "jurusan"],
    ],
  },
  beban: {
    sheet: "6_Beban",
    requiredColumns: 5,
    headerHints: [["kode guru", "nama mapel", "target grade", "target jurusan", "durasi"]],
  },
  silabus: {
    sheet: "7_Modul",
    alternateSheets: ["Modul", "7_Silabus", "Silabus"],
    requiredColumns: 6,
    headerHints: [
      ["mata pelajaran", "guru pengajar", "judul pertemuan", "kelas / semester", "tujuan pembelajaran", "materi pembelajaran"],
      ["mata pelajaran", "guru pengajar", "judul pertemuan / bab", "kelas / semester", "tujuan pembelajaran", "materi pembelajaran"],
    ],
  },
  silabusguru: {
    sheet: "Modul",
    alternateSheets: ["7_Modul", "7_Silabus", "Silabus"],
    requiredColumns: 6,
    headerHints: [
      ["mata pelajaran", "guru pengajar", "judul pertemuan", "kelas / semester", "tujuan pembelajaran", "materi pembelajaran"],
      ["mata pelajaran", "guru pengajar", "judul pertemuan / bab", "kelas / semester", "tujuan pembelajaran", "materi pembelajaran"],
    ],
  },
  pengaturan: {
    sheet: "8_Waktu",
    requiredColumns: 5,
    headerHints: [
      ["hari", "waktu", "apakah istirahat", "nama kegiatan", "jumlah jp", "menit per jp"],
      ["hari", "waktu", "apakah istirahat", "nama kegiatan", "jumlah jp"]
    ],
  },
  ketersediaan: {
    sheet: "9_Ketersediaan",
    requiredColumns: 3,
    headerHints: [["kode guru", "mapel kompetensi", "hari tersedia"]],
  },
  akademik: {
    sheet: "10_Kalender_Akademik",
    requiredColumns: 3,
    headerHints: [
      ["judul kegiatan", "mulai", "selesai", "kategori", "deskripsi"],
      ["judul kegiatan", "mulai", "selesai", "kategori", "keterangan"],
      ["judul", "mulai", "selesai", "kategori", "deskripsi"],
      ["judul", "mulai", "selesai", "kategori", "keterangan"],
      ["agenda", "mulai", "selesai", "kategori", "keterangan"],
    ],
  },
  kategori_kalender: {
    sheet: "11_Kategori_Kalender",
    requiredColumns: 1,
    headerHints: [
      ["nama kategori", "warna"],
      ["kategori", "warna"],
    ],
  },
  kategori_silabus: {
    sheet: "12_Kategori_Modul",
    alternateSheets: ["12_Kategori_Silabus"],
    requiredColumns: 1,
    headerHints: [
      ["nama kategori", "warna"],
      ["kategori", "warna"],
    ],
  },
  karyawan: {
    sheet: "14_Karyawan",
    requiredColumns: 2,
    headerHints: [
      ["kode karyawan", "nama karyawan", "divisi", "whatsapp"],
      ["kode", "nama", "divisi", "hp"]
    ],
  },
  siswa: {
    sheet: "15_Siswa",
    requiredColumns: 2,
    headerHints: [
      ["nis", "nama siswa", "kelas", "jenis kelamin", "ortu"],
      ["nis", "nama", "kelas", "gender"]
    ],
  },
  generate: {
    sheet: "16_Jadwal",
    alternateSheets: ["Jadwal", "Jadwal_Pelajaran", "16_Jadwal_Pelajaran", "Schedule"],
    requiredColumns: 4,
    headerHints: [
      ["hari", "jam ke", "kelas", "kode guru", "mata pelajaran", "ruangan"],
      ["hari", "jam", "kelas", "guru", "mapel", "ruang"],
      ["hari", "slot", "kelas", "guru", "mapel"],
      ["day", "slot", "class", "teacher", "subject", "room"]
    ],
  },
  jadwal: {
    sheet: "16_Jadwal",
    alternateSheets: ["Jadwal", "Jadwal_Pelajaran", "16_Jadwal_Pelajaran", "Schedule"],
    requiredColumns: 4,
    headerHints: [
      ["hari", "jam ke", "kelas", "kode guru", "mata pelajaran", "ruangan"],
      ["hari", "jam", "kelas", "guru", "mapel", "ruang"],
      ["hari", "slot", "kelas", "guru", "mapel"],
      ["day", "slot", "class", "teacher", "subject", "room"]
    ],
  },
};

export const splitBulkColumns = (line) => {
  const raw = String(line ?? "");
  const delimiter = raw.includes("\t") ? "\t" : raw.includes(";") ? ";" : raw.includes(",") ? "," : raw.includes("|") ? "|" : ",";
  const cols = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (char === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cols.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cols.push(current.trim());
  return cols.map((part) => part.replace(/^"|"$/g, "").trim());
};

export const normalizeBulkHeaderCell = (value) => String(value ?? "").replace(/[()]/g, " ").trim().toLowerCase();

export const rowLooksLikeBulkHeader = (row, tabKey) => {
  const config = BULK_IMPORT_CONFIG[tabKey];
  if (!config || !Array.isArray(row)) return false;
  const normalized = row.map(normalizeBulkHeaderCell);
  return config.headerHints.some((hintRow) => hintRow.every((hint, index) => normalized[index]?.includes(hint)));
};

export const parseBulkTextRows = (text, tabKey) => {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((line) => splitBulkColumns(line))
    .filter((cols) => cols.some((col) => String(col || "").trim() !== ""));
  if (rows.length > 0 && rowLooksLikeBulkHeader(rows[0], tabKey)) return rows.slice(1);
  return rows;
};

export const escapeBulkCell = (value) => {
  const text = String(value ?? "").trim();
  if (/[",;\t\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

export const workbookSheetToDelimitedText = (workbook, tabKey, sheetToJson) => {
  const config = BULK_IMPORT_CONFIG[tabKey];
  const preferredSheet = config?.sheet;
  if (!preferredSheet) throw new Error("Tab impor tidak dikenali.");
  const acceptedSheets = [preferredSheet, ...(config.alternateSheets || [])];
  const sheetName = acceptedSheets.find((name) => workbook.SheetNames.includes(name));
  if (!sheetName) {
    throw new Error(`Sheet "${preferredSheet}" tidak ditemukan pada file Excel.`);
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" kosong atau tidak valid.`);
  if (typeof sheetToJson !== "function") {
    throw new Error("Pembaca file Excel belum siap.");
  }
  const rows = sheetToJson(sheet, { header: 1, defval: "", blankrows: false });
  if (rows.length === 0) return "";
  if (!rowLooksLikeBulkHeader(rows[0], tabKey)) {
    throw new Error(`Header pada sheet "${sheetName}" tidak sesuai template impor.`);
  }
  return rows
    .slice(1)
    .map((row) => (Array.isArray(row) ? row : []).map(escapeBulkCell).join("\t"))
    .filter((line) => line.trim() !== "")
    .join("\n");
};
