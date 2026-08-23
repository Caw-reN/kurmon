import { Phone, Printer, Shield, ShieldCheck, Key, History, User, Briefcase, Users, Building2, CheckCircle2, QrCode, Camera, MousePointerClick, Edit2, FileSpreadsheet, MapPin, MessageSquare, BookOpenText, CalendarDays, DoorOpen, Wand2, FileText, BookOpen, Settings, LayoutDashboard, HardDrive, RefreshCw, UploadCloud, SlidersHorizontal, Lock, ArrowUpCircle, FolderOpen, List, Plus, LayoutTemplate, MonitorSmartphone, Palette, Clock, AlertCircle, Trophy, Award, FileImage } from 'lucide-react';

export const DEFAULT_SIDEBAR_GROUPS = {
  dataMaster: false,
  kurikulum: false,
  kesiswaan: false,
  hubin: false,
  sarpras: false,
  informasiUmum: false,
  sistem: false,
  absensi: false,
  tataUsaha: false,
};

export const SIDEBAR_GROUP_BY_TAB = {
  generate: "kurikulum",
  ketersediaan: "kurikulum",
  beban: "kurikulum",
  pengaturan: "kurikulum",
  advanced_rules: "kurikulum",
  kelas: "dataMaster",
  siswa: "dataMaster",
  jurusan: "dataMaster",
  guru: "dataMaster",
  mapel: "dataMaster",
  ruangan: "dataMaster",
  denah: "dataMaster",
  silabus: "kurikulum",
  absensi: "kurikulum",
  hikvision: "absensi",
  hikvision_devices: "absensi",
  hikvision_report_guru: "tataUsaha",
  hikvision_report_siswa: "kesiswaan",
  hikvision_students: "absensi",
  walas_report: "absensi",
  pkl_data_siswa: "hubin",
  pkl_data_perusahaan: "hubin",
  pkl_penugasan: "hubin",
  pkl_administrasi: "hubin",
  pkl_jurnal: "hubin",
  pkl_laporan: "hubin",
  pkl_absensi_setting: "hubin",
  akademik: "informasiUmum",
  pesan: "informasiUmum",
  struktur: "tataUsaha",
  fitur: "sistem",
  tampilan: "sistem",
  pengaturanuser: "sistem",
  kedisiplinan_absensi: "kesiswaan",
  kedisiplinan_piket: "kesiswaan",
  kedisiplinan_bpbk: "kesiswaan",
  riwayat_prestasi: "kesiswaan",
  jurnal_harian: "kurikulum",
  catatan_walikelas: "kesiswaan",

  // === NEW FEATURES ===
  profil_sekolah: "informasiUmum",
  api_keys: "sistem",
  whatsapp: "sistem",
  kartu_pelajar: "tataUsaha",
  esurat: "tataUsaha",
  kenaikan_kelas: "dataMaster",
  audit_log: "sistem",
  gdrive_backup: "sistem",
};

export const TABLE_SORT_OPTIONS = {
  kelas: [
    { value: "name", label: "Nama Kelas / Rombel" },
    { value: "major", label: "Jurusan" },
  ],
  jurusan: [
    { value: "name", label: "Nama Jurusan" },
    { value: "code", label: "Kode Jurusan" },
  ],
  guru: [
    { value: "code", label: "No. Urut / Kode Guru" },
    { value: "name", label: "Nama Guru (A-Z)" },
    { value: "type", label: "Kategori Guru" },
    { value: "preferredMajor", label: "Prioritas Jurusan" },
    { value: "targetWeeklyJp", label: "Target JP" },
  ],
  mapel: [
    { value: "code", label: "No. / Kode Mapel" },
    { value: "name", label: "Nama Mapel" },
    { value: "grade", label: "Tingkat" },
    { value: "major", label: "Jurusan" },
    { value: "defaultDuration", label: "Durasi" },
  ],
  ruangan: [
    { value: "id", label: "No. / ID Ruang" },
    { value: "name", label: "Nama Ruangan" },
    { value: "type", label: "Tipe Ruang" },
    { value: "major", label: "Khusus Jurusan" },
  ],
  beban: [
    { value: "teacherCode", label: "No. Kode Guru" },
    { value: "subject", label: "Mata Pelajaran" },
    { value: "targetGrade", label: "Tingkat Target" },
    { value: "targetMajor", label: "Jurusan" },
    { value: "duration", label: "Durasi" },
    { value: "maxClasses", label: "Maks Kelas" },
  ],
  karyawan: [
    { value: "code", label: "No. Urut / Kode Karyawan" },
    { value: "name", label: "Nama Karyawan" },
    { value: "division", label: "Divisi" },
  ],
  siswa: [
    { value: "nis", label: "NIS / No. Urut Siswa" },
    { value: "nisn", label: "NISN" },
    { value: "name", label: "Nama Siswa" },
    { value: "class", label: "Kelas" },
  ],
  akademik: [
    { value: "dateStart", label: "Tanggal" },
    { value: "title", label: "Judul Agenda" },
  ],
  kategori_kalender: [
    { value: "name", label: "Nama Kategori" },
  ],
  kategori_silabus: [
    { value: "name", label: "Nama Kategori" },
  ],
  silabus: [
    { value: "title", label: "Judul Modul Ajar" },
    { value: "grade", label: "Tingkat" },
  ],
  pengaturanuser: [
    { value: "code", label: "No. / ID User" },
    { value: "name", label: "Nama Pengguna" },
    { value: "role", label: "Peran" },
  ],
  data_pegawai: [
    { value: "code", label: "No. Urut / Kode (1, 2, 3...)" },
    { value: "name", label: "Nama Pegawai (A-Z)" },
    { value: "type", label: "Kategori / Tipe" },
  ],
  advanced_rules: [
    { value: "name", label: "Nama Aturan" },
    { value: "type", label: "Tipe" },
  ],
};

export const DEFAULT_TABLE_SORTS = {
  data_pegawai: { key: "code", dir: "asc" },
  kelas: { key: "name", dir: "asc" },
  jurusan: { key: "name", dir: "asc" },
  guru: { key: "code", dir: "asc" },
  mapel: { key: "code", dir: "asc" },
  ruangan: { key: "id", dir: "asc" },
  beban: { key: "teacherCode", dir: "asc" },
  karyawan: { key: "code", dir: "asc" },
  siswa: { key: "nis", dir: "asc" },
  akademik: { key: "dateStart", dir: "asc" },
  kategori_kalender: { key: "name", dir: "asc" },
  kategori_silabus: { key: "name", dir: "asc" },
  silabus: { key: "title", dir: "asc" },
  pengaturanuser: { key: "code", dir: "asc" },
  advanced_rules: { key: "name", dir: "asc" },
};

export const ATTENDANCE_MODE_OPTIONS = [
  {
    value: "button",
    label: "Tombol Hadir",
    shortLabel: "Tombol",
    icon: CheckCircle2,
    description: "Guru menekan tombol hadir setelah verifikasi lokasi.",
  },
  {
    value: "qr",
    label: "Scan QR",
    shortLabel: "QR",
    icon: QrCode,
    description: "Guru absen dengan memindai QR sekolah.",
  },
  {
    value: "photo",
    label: "Foto Selfie",
    shortLabel: "Foto",
    icon: Camera,
    description: "Guru absen dengan selfie dan lokasi aktif.",
  },
  {
    value: "manual",
    label: "Manual",
    shortLabel: "Manual",
    icon: MousePointerClick,
    description: "Guru mengonfirmasi hadir tanpa alur QR atau foto.",
  },
];

export const FEATURE_TOGGLE_OPTIONS = [
  { key: "attendance", label: "Absensi Guru", description: "Menu absensi guru dan rekap kehadiran.", icon: CheckCircle2 },
  { key: "attendance_manual", label: "Absensi Web/Manual", description: "Menu kehadiran guru via Web (GPS/Tombol). Matikan jika hanya pakai Mesin.", icon: MousePointerClick },
  { key: "attendanceCorrections", label: "Koreksi Absensi", description: "Guru dapat mengajukan koreksi dan admin/kepsek dapat meninjau.", icon: Edit2 },
  { key: "attendanceExport", label: "Export Rekap Absensi", description: "Unduh laporan absensi ke Excel.", icon: FileSpreadsheet },
  { key: "attendanceQr", label: "QR Absensi", description: "Mode absensi memakai kode QR harian.", icon: QrCode },
  { key: "attendanceGps", label: "GPS Absensi", description: "Validasi radius lokasi sekolah.", icon: MapPin },
  { key: "attendancePhoto", label: "Selfie Absensi", description: "Mode absensi memakai foto/selfie.", icon: Camera },
  { key: "dashboardMessages", label: "Pesan Dashboard", description: "Admin/kepsek bisa menampilkan pengumuman di dashboard.", icon: MessageSquare },
  { key: "teacherSyllabus", label: "Modul Ajar Guru", description: "Guru dapat mengelola modul ajar dari akun masing-masing.", icon: BookOpenText },
  { key: "publicCalendar", label: "Kalender Publik", description: "Kalender akademik tampil di halaman publik.", icon: CalendarDays },
  { key: "publicDenah", label: "Denah Publik", description: "Denah sekolah tampil di halaman publik.", icon: DoorOpen },
  { key: "pkl_data_siswa", label: "Data Siswa PKL", description: "Menu manajemen siswa peserta PKL.", icon: Users },
  { key: "pkl_data_perusahaan", label: "Data Perusahaan", description: "Menu manajemen data DUDI/Mitra industri.", icon: Briefcase },
  { key: "pkl_penugasan", label: "Penugasan Guru", description: "Otomatisasi pembagian guru pembimbing PKL.", icon: Wand2 },
  { key: "pkl_administrasi", label: "Administrasi PKL", description: "Menu permohonan surat pengantar & mutasi PKL.", icon: FileText },
  { key: "pkl_jurnal", label: "Jurnal Siswa", description: "Menu pengecekan jurnal harian siswa PKL.", icon: BookOpen },
  { key: "pkl_laporan", label: "Laporan PKL", description: "Menu rekap laporan akhir siswa PKL.", icon: FileText },
  { key: "pkl_absensi_setting", label: "Pengaturan Jarak PKL", description: "Menu atur batas radius absensi GPS siswa PKL.", icon: Settings },
];

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: "Hadir", label: "Hadir" },
  { value: "Terlambat", label: "Terlambat" },
  { value: "Izin", label: "Izin" },
  { value: "Sakit", label: "Sakit" },
  { value: "Dinas Luar", label: "Dinas Luar" },
  { value: "Alpa", label: "Alpa" },
];

export const ATTENDANCE_SESSION_TYPES = [
  { value: "in", label: "Masuk" },
  { value: "out", label: "Keluar" },
  { value: "checkpoint", label: "Checkpoint" },
];

export const DASHBOARD_MESSAGE_PRIORITIES = [
  { value: "normal", label: "Normal", className: "bg-[var(--ui-primary)]/10 text-blue-700 border-blue-100" },
  { value: "important", label: "Penting", className: "bg-amber-50 text-amber-700 border-amber-100" },
  { value: "urgent", label: "Darurat", className: "bg-rose-50 text-rose-700 border-rose-100" },
];

export const DASHBOARD_MESSAGE_TARGETS = [
  { value: "all", label: "Semua" },
  { value: "admin", label: "SuperAdmin" },
  { value: "guru", label: "Guru" },
  { value: "kepsek", label: "Kepsek" },
  { value: "waka", label: "Waka" },
];

export const ROLE_OPTIONS = [
  { value: "admin", label: "Super Admin", shortLabel: "Admin", badgeClass: "bg-purple-100 text-purple-700 border-purple-200", icon: Shield },
  { value: "kepsek", label: "Kepala Sekolah", shortLabel: "Kepsek", badgeClass: "bg-blue-100 text-blue-700 border-blue-200", icon: User },
  { value: "waka", label: "Wakil Kepala Sekolah", shortLabel: "Waka", badgeClass: "bg-amber-100 text-amber-700 border-amber-200", icon: Briefcase },
  { value: "guru", label: "Guru", shortLabel: "Guru", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Users },
  { value: "tu", label: "Tata Usaha", shortLabel: "TU", badgeClass: "bg-teal-100 text-teal-700 border-teal-200", icon: Building2 },
  { value: "karyawan", label: "Karyawan", shortLabel: "Karyawan", badgeClass: "bg-slate-100 text-slate-700 border-slate-200", icon: FileText }
];

export const getRoleOption = (roleValue) => {
  if (!roleValue) return ROLE_OPTIONS.find(r => r.value === "guru");
  const normalized = String(roleValue).toLowerCase().trim();
  if (normalized === "tata_usaha" || normalized === "tata usaha") {
    return ROLE_OPTIONS.find(r => r.value === "tu");
  }
  return ROLE_OPTIONS.find(r => r.value === normalized) || ROLE_OPTIONS.find(r => r.value === "guru");
};


export const WAKA_DIVISION_OPTIONS = [
  { value: "kurikulum", label: "Waka Kurikulum", description: "Jadwal, kalender akademik, modul ajar, dan beban mengajar." },
  { value: "kesiswaan", label: "Waka Kesiswaan", description: "Absensi, kegiatan, BK, dan tata tertib." },
  { value: "sarpras", label: "Waka Sarpras", description: "Ruangan, denah, dan fasilitas sekolah." },
  { value: "hubin", label: "Waka Hubin", description: "Monitoring PKL, lokasi industri, dan kemitraan." },
];

// Subrole (jabatan staf di bawah Waka atau khusus)
export const SUBROLE_OPTIONS_BY_DIVISION = {
  kurikulum: [
    { value: "", label: "— Guru Biasa (tanpa jabatan)" },
    { value: "sekretaris_kurikulum", label: "Sekretaris Waka Kurikulum" },
    { value: "anggota_kurikulum", label: "Anggota Tim Kurikulum" },
    { value: "walikelas", label: "Wali Kelas" },
  ],
  kesiswaan: [
    { value: "", label: "— Guru Biasa (tanpa jabatan)" },
    { value: "sekretaris_kesiswaan", label: "Sekretaris Waka Kesiswaan" },
    { value: "anggota_kesiswaan", label: "Anggota Tim Kesiswaan" },
    { value: "bpbk", label: "Guru BP/BK" },
    { value: "pembina_osis", label: "Pembina OSIS" },
    { value: "sekretaris_osis", label: "Sekretaris Pembina OSIS" },
    { value: "walikelas", label: "Wali Kelas" },
  ],
  sarpras: [
    { value: "", label: "— Guru Biasa (tanpa jabatan)" },
    { value: "sekretaris_sarpras", label: "Sekretaris Waka Sarpras" },
    { value: "anggota_sarpras", label: "Anggota Tim Sarpras" },
    { value: "walikelas", label: "Wali Kelas" },
  ],
  hubin: [
    { value: "", label: "— Guru Biasa (tanpa jabatan)" },
    { value: "sekretaris_hubin", label: "Sekretaris Waka Hubin" },
    { value: "anggota_hubin", label: "Anggota Tim Hubin" },
    { value: "walikelas", label: "Wali Kelas" },
  ],
  tu: [
    { value: "", label: "— Tata Usaha (Kepala TU)" },
    { value: "sekretaris_tu", label: "Sekretaris TU" },
    { value: "bendahara", label: "Bendahara Sekolah" },
    { value: "karyawan", label: "Staf Karyawan / Umum" },
  ],
  karyawan: [
    { value: "", label: "— Karyawan Biasa / Umum" },
    { value: "tu", label: "Staf Tata Usaha (TU)" },
    { value: "sekretaris_tu", label: "Sekretaris TU" },
    { value: "bendahara", label: "Bendahara Sekolah" },
  ],
  none: [
    { value: "", label: "— Tanpa Jabatan Spesifik" },
    { value: "walikelas", label: "Wali Kelas" },
    { value: "tu", label: "Staf Tata Usaha" },
    { value: "sekretaris_tu", label: "Sekretaris TU" },
    { value: "bendahara", label: "Bendahara Sekolah" },
    { value: "bpbk", label: "Guru BP/BK" },
    { value: "pembina_osis", label: "Pembina OSIS" },
  ],
};

export const SUBROLE_ALL_OPTIONS = [
  { value: "", label: "— Guru Biasa (tanpa jabatan)" },
  { value: "walikelas", label: "Wali Kelas" },
  { value: "bpbk", label: "Guru BP/BK" },
  { value: "pembina_osis", label: "Pembina OSIS" },
  { value: "sekretaris_osis", label: "Sekretaris Pembina OSIS" },
  { value: "sekretaris_kurikulum", label: "Sekretaris Waka Kurikulum" },
  { value: "anggota_kurikulum", label: "Anggota Tim Kurikulum" },
  { value: "sekretaris_kesiswaan", label: "Sekretaris Waka Kesiswaan" },
  { value: "anggota_kesiswaan", label: "Anggota Tim Kesiswaan" },
  { value: "sekretaris_hubin", label: "Sekretaris Waka Hubin" },
  { value: "anggota_hubin", label: "Anggota Tim Hubin" },
  { value: "sekretaris_sarpras", label: "Sekretaris Waka Sarpras" },
  { value: "anggota_sarpras", label: "Anggota Tim Sarpras" },
];

// Label tampilan untuk tiap role key di halaman hak akses
export const ROLE_KEY_LABELS = {
  admin: { label: "Super Admin", color: "bg-purple-100 text-purple-800", short: "Admin" },
  guru: { label: "Guru", color: "bg-emerald-100 text-emerald-800", short: "Guru" },
  walikelas: { label: "Wali Kelas", color: "bg-teal-100 text-teal-800", short: "Walikelas" },
  karyawan: { label: "Karyawan", color: "bg-slate-100 text-slate-700", short: "Karyawan" },
  tu: { label: "Tata Usaha", color: "bg-cyan-100 text-cyan-800", short: "TU" },
  kepsek: { label: "Kepala Sekolah", color: "bg-blue-100 text-blue-800", short: "Kepsek" },
  waka_kurikulum: { label: "Waka Kurikulum", color: "bg-amber-100 text-amber-800", short: "Waka Kurikulum" },
  waka_kesiswaan: { label: "Waka Kesiswaan", color: "bg-orange-100 text-orange-800", short: "Waka Kesiswaan" },
  waka_sarpras: { label: "Waka Sarpras", color: "bg-purple-100 text-purple-800", short: "Waka Sarpras" },
  waka_hubin: { label: "Waka Hubin", color: "bg-pink-100 text-pink-800", short: "Waka Hubin" },
  bpbk: { label: "Guru BP/BK", color: "bg-red-100 text-red-800", short: "BP/BK" },
  pembina_osis: { label: "Pembina OSIS", color: "bg-indigo-100 text-indigo-800", short: "Pembina OSIS" },
  sekretaris_osis: { label: "Sekretaris OSIS", color: "bg-violet-100 text-violet-800", short: "Sekr. OSIS" },
  sekretaris_kurikulum: { label: "Sekretaris Kurikulum", color: "bg-yellow-100 text-yellow-800", short: "Sekr. Kurikulum" },
  anggota_kurikulum: { label: "Anggota Kurikulum", color: "bg-yellow-50 text-yellow-700", short: "Anggota Kurikulum" },
  sekretaris_kesiswaan: { label: "Sekretaris Kesiswaan", color: "bg-orange-100 text-orange-700", short: "Sekr. Kesiswaan" },
  anggota_kesiswaan: { label: "Anggota Kesiswaan", color: "bg-orange-50 text-orange-600", short: "Anggota Kesiswaan" },
  sekretaris_hubin: { label: "Sekretaris Hubin", color: "bg-rose-100 text-rose-700", short: "Sekr. Hubin" },
  anggota_hubin: { label: "Anggota Hubin", color: "bg-rose-50 text-rose-600", short: "Anggota Hubin" },
  sekretaris_sarpras: { label: "Sekretaris Sarpras", color: "bg-purple-100 text-purple-700", short: "Sekr. Sarpras" },
  anggota_sarpras: { label: "Anggota Sarpras", color: "bg-purple-50 text-purple-600", short: "Anggota Sarpras" },
};

export const getSubroleOption = (subrole) => {
  return SUBROLE_ALL_OPTIONS.find(s => s.value === subrole) || SUBROLE_ALL_OPTIONS[0];
};

export const getRoleKeyLabel = (key) => {
  return ROLE_KEY_LABELS[key] || { label: key, color: "bg-slate-100 text-slate-700", short: key };
};

export const normalizeUserRole = (role) => {
  if (!role) return "guru";
  const normalized = String(role).toLowerCase().trim();
  if (normalized === "superadmin") return "admin";
  if (normalized === "tata_usaha" || normalized === "tata usaha") return "tu";
  return normalized;
};

export const getWakaDivisionOption = (division, settings = {}) => {
  const base = WAKA_DIVISION_OPTIONS.find((item) => item.value === division) || WAKA_DIVISION_OPTIONS[0];
  const customLabel = settings[`waka${base.value.charAt(0).toUpperCase() + base.value.slice(1)}Label`];
  return { ...base, label: customLabel || base.label };
};
export const isSuperAdminRole = (role) => normalizeUserRole(role) === "admin";
export const isLeadershipRole = (role) => ["admin", "kepsek", "waka"].includes(normalizeUserRole(role));

export const WORKSPACE_GUIDES = {
  pkl_dashboard: {
    title: "Dashboard PKL",
    customKelolaLabel: "Dasbor",
    description: "Pantau statistik dan pergerakan program PKL secara keseluruhan.",
    icon: LayoutDashboard,
    steps: [
      { title: "Statistik Utama", detail: "Pantau jumlah siswa, perusahaan, dan pembimbing aktif.", icon: Users },
      { title: "Grafik & Peta", detail: "Analisis sebaran penempatan siswa dan performa program.", icon: MapPin },
      { title: "Akses Cepat", detail: "Gunakan menu untuk melihat laporan absensi dan jurnal.", icon: BookOpen },
    ],
  },
  pkl_data_siswa: {
    title: "Data Siswa PKL",
    customKelolaLabel: "Siswa PKL",
    description: "Kelola daftar siswa yang memenuhi syarat untuk berangkat Praktik Kerja Lapangan.",
    icon: Users,
    steps: [
      { title: "Pilih Siswa", detail: "Tentukan siswa dari master data yang akan diberangkatkan PKL.", icon: CheckCircle2 },
      { title: "Kelompokkan", detail: "Bagi siswa ke dalam kelompok jika diperlukan oleh perusahaan.", icon: Users },
      { title: "Sinkronisasi", detail: "Pastikan data jurusan dan kelas sesuai dengan master data.", icon: RefreshCw },
    ],
  },
  pkl_data_perusahaan: {
    title: "Data Perusahaan",
    customKelolaLabel: "Perusahaan Mitra",
    description: "Kelola daftar industri mitra yang menjadi tempat siswa melaksanakan PKL.",
    icon: Building2,
    steps: [
      { title: "Tambah Mitra", detail: "Daftarkan nama perusahaan, alamat, dan kuota yang tersedia.", icon: Plus },
      { title: "Pemetaan Jurusan", detail: "Tentukan jurusan mana saja yang diterima oleh perusahaan ini.", icon: SlidersHorizontal },
      { title: "Lokasi Peta", detail: "Pastikan titik kordinat tepat agar jarak radius presensi sesuai.", icon: MapPin },
    ],
  },
  pkl_penugasan: {
    title: "Penugasan Guru",
    customKelolaLabel: "Penugasan",
    description: "Tugaskan guru pembimbing untuk memantau siswa selama PKL berlangsung.",
    icon: Wand2,
    steps: [
      { title: "Pilih Pembimbing", detail: "Tentukan guru yang akan mendampingi siswa PKL.", icon: User },
      { title: "Tentukan Kelompok", detail: "Bagi jumlah bimbingan agar seimbang antar guru.", icon: Users },
      { title: "Akses Guru", detail: "Guru yang ditugaskan dapat melihat laporan jurnal dan absensi.", icon: BookOpen },
    ],
  },
  pkl_lokasi: {
    title: "Penempatan Lokasi",
    customKelolaLabel: "Approval",
    description: "Atur penempatan siswa ke perusahaan mitra serta validasi lokasi yang diajukan siswa.",
    icon: MapPin,
    steps: [
      { title: "Verifikasi Pengajuan", detail: "Setujui atau tolak perusahaan yang diajukan secara mandiri oleh siswa.", icon: CheckCircle2 },
      { title: "Distribusi", detail: "Tempatkan siswa ke perusahaan yang telah memiliki kuota.", icon: Wand2 },
      { title: "Pindah Lokasi", detail: "Admin dapat memindahkan siswa ke lokasi lain jika ada kendala.", icon: RefreshCw },
    ],
  },
  pkl_administrasi: {
    title: "Administrasi PKL",
    customKelolaLabel: "Administrasi",
    description: "Kelola dokumen surat pengantar, sertifikat, dan nilai siswa selama PKL.",
    icon: FileText,
    steps: [
      { title: "Cetak Surat", detail: "Generate surat pengantar dan permohonan PKL ke perusahaan.", icon: FileText },
      { title: "Sertifikat", detail: "Terbitkan sertifikat bagi siswa yang telah menyelesaikan PKL.", icon: CheckCircle2 },
      { title: "Nilai Industri", detail: "Input nilai yang diberikan oleh pihak perusahaan.", icon: BookOpen },
    ],
  },
  pkl_jurnal: {
    title: "Jurnal Siswa",
    customKelolaLabel: "Jurnal",
    description: "Pantau laporan kegiatan harian (jurnal) yang ditulis siswa dari tempat PKL.",
    icon: BookOpen,
    steps: [
      { title: "Baca Laporan", detail: "Lihat jurnal dan dokumentasi foto harian yang dikirim siswa.", icon: BookOpen },
      { title: "Validasi", detail: "Guru pembimbing dapat memberikan komentar atau memvalidasi jurnal.", icon: CheckCircle2 },
      { title: "Rekapitulasi", detail: "Cek intensitas pelaporan tiap siswa secara keseluruhan.", icon: FileSpreadsheet },
    ],
  },
  pkl_absensi_setting: {
    title: "Pengaturan Absensi",
    customKelolaLabel: "Pengaturan",
    description: "Atur jadwal kerja dan radius toleransi jarak absensi GPS di lokasi PKL.",
    icon: Settings,
    steps: [
      { title: "Jam Kerja", detail: "Tentukan batas waktu absensi masuk dan pulang.", icon: Clock },
      { title: "Radius Jarak", detail: "Atur seberapa jauh siswa boleh melakukan absen dari titik kordinat perusahaan.", icon: MapPin },
      { title: "Metode Absen", detail: "Aktifkan wajib foto selfie atau pembatasan perangkat (Fake GPS detection).", icon: Settings },
    ],
  },
  hikvision: {
    title: "Dashboard Mesin",
    customKelolaLabel: "Dasbor",
    description: "Pantau status perangkat dan data absensi harian yang masuk dari mesin.",
    icon: LayoutDashboard,
    steps: [
      { title: "Status Perangkat", detail: "Cek apakah mesin terhubung dengan sistem secara realtime.", icon: HardDrive },
      { title: "Log Terbaru", detail: "Pantau daftar orang yang baru saja melakukan absensi (tap).", icon: Users },
      { title: "Tarik Data", detail: "Tarik log absensi manual jika terjadi kendala jaringan.", icon: RefreshCw },
    ],
  },
  hikvision_report_guru: {
    title: "Laporan Guru",
    customKelolaLabel: "Laporan",
    description: "Tinjau rekapitulasi kehadiran harian dan bulanan guru dari mesin absensi.",
    icon: FileText,
    steps: [
      { title: "Filter Data", detail: "Pilih rentang tanggal untuk melihat rekapitulasi.", icon: CalendarDays },
      { title: "Koreksi", detail: "Admin dapat mengoreksi status kehadiran (sakit/izin/alfa).", icon: Settings },
      { title: "Ekspor", detail: "Unduh laporan dalam format Excel atau PDF.", icon: UploadCloud },
    ],
  },
  hikvision_report_siswa: {
    title: "Laporan Siswa",
    customKelolaLabel: "Laporan",
    description: "Tinjau rekapitulasi kehadiran harian dan bulanan siswa dari mesin absensi.",
    icon: FileText,
    steps: [
      { title: "Filter Data", detail: "Pilih kelas dan rentang tanggal untuk melihat absensi.", icon: CalendarDays },
      { title: "Rekap Per Kelas", detail: "Gunakan data ini untuk diserahkan kepada Wali Kelas.", icon: Users },
      { title: "Ekspor", detail: "Unduh laporan dalam format Excel atau PDF.", icon: UploadCloud },
    ],
  },
  hikvision_students: {
    title: "Data Pengguna Mesin",
    customKelolaLabel: "Pemetaan",
    description: "Daftarkan wajah, kartu (RFID), dan sidik jari siswa/guru ke mesin.",
    icon: Users,
    steps: [
      { title: "Registrasi Wajah", detail: "Upload foto wajah pengguna agar bisa melakukan absensi Face ID.", icon: User },
      { title: "Pemetaan ID", detail: "Pastikan PIN atau ID Mesin sesuai dengan NISN/NIP di database utama.", icon: CheckCircle2 },
      { title: "Kirim ke Mesin", detail: "Sinkronkan (Upload) data ke mesin agar segera bisa dipakai.", icon: HardDrive },
    ],
  },
  hikvision_devices: {
    title: "Pengaturan Alat",
    customKelolaLabel: "Mesin Absensi",
    description: "Kelola konfigurasi jaringan dan daftar mesin yang terhubung ke sistem.",
    icon: HardDrive,
    steps: [
      { title: "Tambah Mesin", detail: "Masukkan IP Address, Port, Username, dan Password dari mesin.", icon: Plus },
      { title: "Tes Koneksi", detail: "Pastikan server dapat berkomunikasi dengan mesin absensi.", icon: CheckCircle2 },
      { title: "Sinkron Waktu", detail: "Setel waktu mesin agar selalu sama dengan zona waktu server.", icon: Clock },
    ],
  },
  fitur: {
    title: "Kontrol Fitur",
    customKelolaLabel: "Fitur",
    description: "Aktifkan atau matikan modul aplikasi sesuai dengan kebutuhan spesifik sekolah.",
    icon: SlidersHorizontal,
    steps: [
      { title: "Matikan Modul", detail: "Sembunyikan menu yang tidak terpakai agar antarmuka lebih bersih.", icon: Settings },
      { title: "Akses Peran", detail: "Tentukan menu apa saja yang bisa diakses oleh Waka atau Guru.", icon: Lock },
      { title: "Simpan Perubahan", detail: "Pengguna harus refresh browser setelah fitur diubah.", icon: RefreshCw },
    ],
  },
  pesan: {
    title: "Pengumuman Dashboard",
    customKelolaLabel: "Pengumuman",
    description: "Kirim pengumuman penting yang akan tampil di dashboard semua pengguna.",
    icon: MessageSquare,
    steps: [
      { title: "Tulis Pengumuman", detail: "Buat pesan yang singkat dan jelas.", icon: Plus },
      { title: "Target Penerima", detail: "Tentukan apakah pesan ini untuk Guru, Siswa, atau Keduanya.", icon: Users },
      { title: "Tandai Penting", detail: "Pesan yang penting (Alert) akan berwarna merah/kuning untuk menarik perhatian.", icon: AlertCircle },
    ],
  },
  siswa: {
    title: "Data Induk Siswa",
    customKelolaLabel: "Data Induk",
    description: "Kelola basis data seluruh siswa yang aktif di sekolah dari semua kelas.",
    icon: Users,
    steps: [
      { title: "Pendaftaran Siswa", detail: "Tambahkan data diri, NISN, dan nomor telepon siswa (atau orangtua).", icon: User },
      { title: "Kenaikan Kelas", detail: "Pindahkan siswa ke tingkat yang lebih tinggi (Massal).", icon: ArrowUpCircle },
      { title: "Impor Data", detail: "Gunakan Excel untuk memasukkan data siswa baru secara cepat.", icon: UploadCloud },
    ],
  },
  ketersediaan: {
    title: "Ketersediaan Guru",
    description: "Catat waktu mengajar dan kompetensi guru agar generator dapat menyusun jadwal yang realistis.",
    icon: Clock,
    steps: [
      { title: "Pilih guru", detail: "Buka data guru yang ingin diatur. Pastikan kode guru dan statusnya sudah benar.", icon: Users },
      { title: "Tandai hari tersedia", detail: "Pilih hari mengajar yang memungkinkan. Hari yang tidak dipilih tidak akan digunakan generator.", icon: CalendarDays },
      { title: "Cocokkan kompetensi", detail: "Isi mapel yang dikuasai bila Strict Kompetensi digunakan, lalu periksa kembali sebelum generate.", icon: CheckCircle2 },
    ],
  },
  absensi: {
    title: "Absensi Guru",
    description: "Atur cara absensi yang sederhana, aman, dan mudah dipahami seluruh guru.",
    icon: CheckCircle2,
    steps: [
      { title: "Pilih metode absensi", detail: "Gunakan tombol hadir, QR, foto, atau manual sesuai kebutuhan sekolah.", icon: MousePointerClick },
      { title: "Atur lokasi sekolah", detail: "Periksa titik GPS dan radius agar verifikasi lokasi tidak terlalu ketat atau longgar.", icon: MapPin },
      { title: "Tinjau rekap", detail: "Lihat catatan kehadiran untuk memastikan data KBM sudah tercatat dengan benar.", icon: FileText },
    ],
  },
  akademik: {
    title: "Kalender Akademik",
    description: "Susun agenda sekolah dan bagikan informasi penting dengan urutan yang mudah diikuti.",
    icon: CalendarDays,
    steps: [
      { title: "Siapkan kategori", detail: "Buat kategori seperti libur, ujian, rapat, atau kegiatan sekolah agar agenda rapi.", icon: FolderOpen },
      { title: "Tambahkan atau impor agenda", detail: "Isi tanggal, judul, dan kategori. Gunakan impor Excel untuk banyak agenda sekaligus.", icon: FileSpreadsheet },
      { title: "Periksa lalu publikasikan", detail: "Tinjau agenda mendatang dan pastikan tanggalnya sudah benar sebelum dipakai warga sekolah.", icon: CheckCircle2 },
    ],
  },
  silabus: {
    title: "Modul Ajar",
    description: "Kelola materi pembelajaran dalam satu tempat dan pastikan guru menerima data yang sama.",
    icon: BookOpen,
    steps: [
      { title: "Atur kategori materi", detail: "Kelompokkan materi agar guru mudah menemukan modul ajar sesuai mapel dan tingkat.", icon: List },
      { title: "Isi atau impor modul", detail: "Tambahkan materi satu per satu atau gunakan Excel saat datanya sudah tersedia.", icon: FileSpreadsheet },
      { title: "Sinkronkan ke akses guru", detail: "Tinjau mapel, kelas, dan guru tujuan agar materi tampil pada akun guru yang tepat.", icon: RefreshCw },
    ],
  },
  kelas: {
    title: "Data Kelas",
    description: "Buat kelas yang konsisten agar jadwal, modul ajar, dan beban mengajar dapat saling terhubung.",
    icon: Users,
    steps: [
      { title: "Tambah kelas", detail: "Isi nama kelas, tingkat, jurusan, dan wali kelas bila diperlukan.", icon: Plus },
      { title: "Cocokkan jurusan", detail: "Nama jurusan harus sesuai dengan Data Jurusan agar filter dan generator tidak keliru.", icon: SlidersHorizontal },
      { title: "Cek sebelum generate", detail: "Pastikan tidak ada kelas ganda atau kelas tanpa tingkat dan jurusan.", icon: CheckCircle2 },
    ],
  },
  jurusan: {
    title: "Data Jurusan",
    description: "Kelola program keahlian sebagai acuan kelas, mapel, ruangan, dan beban mengajar.",
    icon: SlidersHorizontal,
    steps: [
      { title: "Tambah program keahlian", detail: "Gunakan nama jurusan yang singkat and konsisten di seluruh data sekolah.", icon: Plus },
      { title: "Hubungkan data terkait", detail: "Pastikan kelas, mapel, guru prioritas, serta ruangan praktik memakai jurusan yang sama.", icon: RefreshCw },
      { title: "Tinjau perubahan", detail: "Perubahan nama jurusan dapat memengaruhi data terkait, jadi periksa sebelum menyimpan.", icon: CheckCircle2 },
    ],
  },
  guru: {
    title: "Data Guru",
    description: "Simpan profil dan kode guru dengan benar karena data ini dipakai di beban, absensi, dan akses guru.",
    icon: Users,
    steps: [
      { title: "Isi profil guru", detail: "Gunakan kode guru yang unik, nama lengkap, kategori, dan target JP bila diperlukan.", icon: User },
      { title: "Atur akses guru", detail: "Pastikan akun dan perannya tepat agar guru dapat membuka jadwal, absensi, dan modul ajarnya.", icon: Lock },
      { title: "Sinkronkan penugasan", detail: "Lanjutkan ke beban mengajar dan ketersediaan setelah data guru lengkap.", icon: RefreshCw },
    ],
  },
  mapel: {
    title: "Mata Pelajaran",
    description: "Buat daftar mapel yang jelas supaya pembagian beban dan jadwal berjalan tepat.",
    icon: BookOpen,
    steps: [
      { title: "Tambah mapel", detail: "Isi nama mapel, tingkat, jurusan sasaran, dan durasi JP yang diperlukan.", icon: Plus },
      { title: "Tentukan kebutuhan ruang", detail: "Untuk praktik, pilih lab atau bengkel yang sesuai agar tidak bentrok saat dijadwalkan.", icon: DoorOpen },
      { title: "Hubungkan ke beban", detail: "Gunakan nama mapel yang sama saat membuat beban mengajar guru.", icon: RefreshCw },
    ],
  },
  ruangan: {
    title: "Ruangan",
    description: "Kelola ruang teori dan praktik agar kapasitas serta kebutuhan khusus dapat dipertimbangkan jadwal.",
    icon: DoorOpen,
    steps: [
      { title: "Daftarkan ruangan", detail: "Isi ID ruang yang unik, nama ruang, tipe, kapasitas, dan jurusan khusus bila ada.", icon: Plus },
      { title: "Tandai ruang praktik", detail: "Hubungkan lab atau bengkel ke mapel praktik dan jurusan yang membutuhkannya.", icon: Settings },
      { title: "Cek kapasitas", detail: "Pastikan ruang yang dipilih mampu menampung kelas agar hasil jadwal lebih akurat.", icon: CheckCircle2 },
    ],
  },
  beban: {
    title: "Beban Mengajar",
    description: "Susun penugasan guru sebagai sumber utama yang dibaca saat jadwal dibuat.",
    icon: FileSpreadsheet,
    steps: [
      { title: "Pilih guru dan mapel", detail: "Kode guru serta nama mapel harus sudah tersedia pada data master.", icon: Users },
      { title: "Atur sasaran mengajar", detail: "Tentukan tingkat, jurusan, durasi JP, dan jumlah kelas bila ingin dibatasi.", icon: SlidersHorizontal },
      { title: "Sinkronkan ketersediaan", detail: "Setelah beban lengkap, pastikan guru terkait memiliki hari tersedia untuk mengajar.", icon: RefreshCw },
    ],
  },
  denah: {
    title: "Denah Ruangan",
    description: "Susun posisi ruang agar pengecekan penggunaan ruang lebih mudah setelah jadwal dibuat.",
    icon: LayoutTemplate,
    steps: [
      { title: "Pilih hari dan denah", detail: "Tentukan hari yang ingin ditinjau dan gunakan preset denah sebagai titik awal.", icon: CalendarDays },
      { title: "Tempatkan ruang", detail: "Seret kelas atau ruang ke blok yang sesuai untuk menggambarkan kondisi sekolah.", icon: MapPin },
      { title: "Cek hasil jadwal", detail: "Gunakan denah untuk meninjau kemungkinan bentrok ruang setelah generate jadwal.", icon: CheckCircle2 },
    ],
  },
  pengaturan: {
    title: "Konfigurasi Waktu",
    description: "Atur hari aktif dan jam pelajaran sebelum menyusun beban atau menghasilkan jadwal.",
    icon: Settings,
    steps: [
      { title: "Pilih hari aktif", detail: "Aktifkan hari belajar sekolah dan nonaktifkan hari yang tidak digunakan.", icon: CalendarDays },
      { title: "Susun jam pelajaran", detail: "Isi jam mulai, selesai, durasi, dan tandai waktu istirahat dengan jelas.", icon: Clock },
      { title: "Samakan dengan guru", detail: "Nama hari harus sama dengan pilihan hari pada ketersediaan guru.", icon: RefreshCw },
    ],
  },
  advanced_rules: {
    title: "Aturan Penjadwalan",
    description: "Tentukan batas dan prioritas agar generator membuat jadwal sesuai kebijakan sekolah.",
    icon: SlidersHorizontal,
    steps: [
      { title: "Atur batas JP", detail: "Tentukan batas jam per tingkat dan hari agar beban belajar tetap wajar.", icon: Clock },
      { title: "Tentukan aturan khusus", detail: "Atur ketentuan hari tertentu, mapel akhir, serta kebutuhan ruang teori atau praktik.", icon: Settings },
      { title: "Generate dan tinjau", detail: "Simpan aturan, buat jadwal, lalu periksa catatan konflik sebelum membagikannya.", icon: CheckCircle2 },
    ],
  },
  tampilan: {
    title: "Tampilan Web",
    description: "Sesuaikan identitas sekolah dan warna aplikasi dengan pengaturan yang tetap mudah dibaca.",
    icon: MonitorSmartphone,
    steps: [
      { title: "Isi identitas", detail: "Atur nama aplikasi, logo, kontak, dan informasi yang tampil pada halaman publik.", icon: User },
      { title: "Pilih warna dan tema", detail: "Gunakan warna dengan kontras cukup agar nyaman dipakai semua usia.", icon: Palette },
      { title: "Periksa pratinjau", detail: "Tinjau tampilan sebelum disimpan untuk memastikan informasi sekolah terbaca jelas.", icon: MonitorSmartphone },
    ],
  },
  pengaturanuser: {
    title: "Pengaturan User",
    customKelolaLabel: "Akses User",
    description: "Kelola akun admin dan akses guru supaya setiap pengguna melihat fitur yang tepat.",
    icon: User,
    steps: [
      { title: "Periksa admin utama", detail: "Pastikan nama dan kredensial admin disimpan secara aman.", icon: Lock },
      { title: "Atur peran guru", detail: "Pilih peran guru atau administrator sesuai kebutuhan operasional sekolah.", icon: Users },
      { title: "Sampaikan perubahan", detail: "Minta pengguna login ulang setelah hak aksesnya diperbarui.", icon: CheckCircle2 },
    ],
  },
  data_pegawai: {
    title: "Data Pendidik & Karyawan",
    customKelolaLabel: "Data Pegawai",
    description: "Kelola data master guru dan tenaga kependidikan dalam satu tempat terpusat.",
    icon: Users,
    steps: [
      { title: "Tambah Data", detail: "Masukkan informasi profil, nomor kontak, dan peran pengguna.", icon: User },
      { title: "Hak Akses", detail: "Tentukan hak akses untuk setiap pegawai sesuai tanggung jawabnya.", icon: Lock },
      { title: "Sinkronisasi", detail: "Gunakan fitur import jika Anda memiliki banyak data dalam format Excel.", icon: UploadCloud },
    ],
  },
  fasilitas: {
    title: "Fasilitas & Ruangan",
    customKelolaLabel: "Fasilitas",
    description: "Atur data ruangan kelas, lab, dan fasilitas pendukung lainnya beserta tata letaknya.",
    icon: DoorOpen,
    steps: [
      { title: "Daftar Ruang", detail: "Inventarisasi seluruh ruangan yang ada di lingkungan sekolah.", icon: Plus },
      { title: "Kapasitas", detail: "Tentukan kapasitas maksimal tiap ruangan untuk validasi jadwal.", icon: Settings },
      { title: "Denah", detail: "Gunakan fitur denah visual untuk memetakan tata letak gedung.", icon: MapPin },
    ],
  },
  profil_sekolah: {
    title: "Profil Instansi",
    customKelolaLabel: "Profil",
    description: "Lengkapi informasi dasar sekolah yang akan tampil pada kop surat dan laporan.",
    icon: Building2,
    steps: [
      { title: "Identitas", detail: "Isi NPSN, nama institusi, dan alamat lengkap dengan akurat.", icon: FileText },
      { title: "Kontak", detail: "Cantumkan nomor telepon dan email resmi yang bisa dihubungi.", icon: Phone },
      { title: "Logo", detail: "Unggah logo sekolah beresolusi tinggi untuk keperluan cetak.", icon: UploadCloud },
    ],
  },
  hak_akses: {
    title: "Manajemen Hak Akses",
    customKelolaLabel: "Hak Akses",
    description: "Tentukan batasan wewenang untuk masing-masing peran dan grup pengguna.",
    icon: ShieldCheck,
    steps: [
      { title: "Pemetaan Peran", detail: "Pastikan setiap pengguna berada di grup peran yang tepat.", icon: Users },
      { title: "Modul Akses", detail: "Beri centang pada modul-modul yang diizinkan untuk diakses.", icon: CheckCircle2 },
      { title: "Keamanan", detail: "Gunakan prinsip hak akses terendah (least privilege) demi keamanan.", icon: Lock },
    ],
  },
  api_keys: {
    title: "API Keys & Integrasi",
    customKelolaLabel: "API",
    description: "Kelola kunci akses (API Keys) untuk menghubungkan sistem dengan layanan eksternal.",
    icon: Key,
    steps: [
      { title: "Generate Key", detail: "Buat kunci akses baru untuk layanan spesifik.", icon: Plus },
      { title: "Batasan", detail: "Atur domain atau IP yang diizinkan menggunakan kunci tersebut.", icon: ShieldCheck },
      { title: "Rotasi", detail: "Perbarui API Key secara berkala untuk menjaga keamanan data.", icon: RefreshCw },
    ],
  },
  whatsapp: {
    title: "Integrasi WhatsApp",
    customKelolaLabel: "WhatsApp",
    description: "Hubungkan aplikasi dengan API WhatsApp Gateway untuk notifikasi otomatis.",
    icon: MessageSquare,
    steps: [
      { title: "Konfigurasi", detail: "Masukkan token API dan nomor pengirim yang valid.", icon: Settings },
      { title: "Template Pesan", detail: "Buat kerangka pesan untuk pemberitahuan keterlambatan atau info.", icon: FileText },
      { title: "Uji Coba", detail: "Kirim pesan tes sebelum mengaktifkannya secara massal.", icon: CheckCircle2 },
    ],
  },
  gdrive_backup: {
    title: "Google Drive Backup",
    customKelolaLabel: "Backup",
    description: "Amankan basis data aplikasi dengan melakukan pencadangan otomatis ke cloud.",
    icon: HardDrive,
    steps: [
      { title: "Otentikasi", detail: "Hubungkan akun Google Drive resmi sekolah.", icon: Lock },
      { title: "Jadwal Backup", detail: "Atur rutinitas harian atau mingguan untuk pencadangan.", icon: CalendarDays },
      { title: "Restore Data", detail: "Pastikan Anda bisa mengembalikan data dari file backup jika diperlukan.", icon: RefreshCw },
    ],
  },
  audit_log: {
    title: "Audit Log Sistem",
    customKelolaLabel: "Audit",
    description: "Pantau rekam jejak setiap aktivitas pengguna untuk keperluan keamanan dan investigasi.",
    icon: History,
    steps: [
      { title: "Pemantauan", detail: "Lihat aktivitas login, perubahan data, dan penghapusan.", icon: Settings },
      { title: "Filter Log", detail: "Cari log berdasarkan pengguna, tanggal, atau modul.", icon: SlidersHorizontal },
      { title: "Evaluasi", detail: "Tinjau aktivitas anomali secara rutin demi keamanan.", icon: ShieldCheck },
    ],
  },
  struktur: {
    title: "Struktur Organisasi",
    customKelolaLabel: "Struktur",
    description: "Bangun bagan hierarki struktural sekolah beserta pejabat yang berwenang.",
    icon: Users,
    steps: [
      { title: "Buat Bagan", detail: "Tentukan posisi struktural dari kepala sekolah hingga staf.", icon: Users },
      { title: "Jabatan", detail: "Tetapkan nama dan masa bakti pengemban tugas.", icon: User },
      { title: "Publikasi", detail: "Struktur ini dapat ditampilkan pada halaman portal/informasi publik.", icon: MonitorSmartphone },
    ],
  },
  esurat: {
    title: "E-Surat Administrasi",
    customKelolaLabel: "E-Surat",
    description: "Digitalisasi persuratan sekolah mulai dari pembuatan, disposisi, hingga arsip.",
    icon: FileText,
    steps: [
      { title: "Template", detail: "Siapkan format surat keluar resmi beserta kop dan penandatangan.", icon: FileText },
      { title: "Surat Masuk", detail: "Catat dan unggah hasil pindai (scan) surat fisik yang diterima.", icon: UploadCloud },
      { title: "Penomoran", detail: "Sistem akan membantu mengurutkan nomor surat secara otomatis.", icon: CheckCircle2 },
    ],
  },
  kartu_pelajar: {
    title: "Kartu Pelajar & ID",
    customKelolaLabel: "Kartu",
    description: "Desain dan cetak kartu pelajar yang terintegrasi dengan mesin absensi.",
    icon: User,
    steps: [
      { title: "Desain Template", detail: "Sesuaikan latar belakang, tata letak foto, dan informasi siswa.", icon: LayoutTemplate },
      { title: "Barcode/QR", detail: "Aktifkan fitur barcode agar kartu dapat dipindai oleh scanner.", icon: MapPin },
      { title: "Cetak Massal", detail: "Pilih beberapa siswa sekaligus untuk pencetakan yang efisien.", icon: Printer },
    ],
  },
  kenaikan_kelas: {
    title: "Kenaikan Kelas & Kelulusan",
    customKelolaLabel: "Kenaikan",
    description: "Proses pemindahan siswa ke tingkat berikutnya pada pergantian tahun ajaran.",
    icon: ArrowUpCircle,
    steps: [
      { title: "Pilih Rombel", detail: "Tentukan kelas asal dan kelas tujuan dengan teliti.", icon: Users },
      { title: "Validasi Status", detail: "Periksa kelayakan nilai atau administrasi setiap siswa.", icon: CheckCircle2 },
      { title: "Eksekusi", detail: "Lakukan proses kenaikan kelas secara massal agar cepat selesai.", icon: RefreshCw },
    ],
  },
  kedisiplinan_absensi: {
    title: "Kedisiplinan & Poin",
    customKelolaLabel: "Kedisiplinan",
    description: "Catat pelanggaran tata tertib dan prestasi siswa menggunakan sistem poin.",
    icon: AlertCircle,
    steps: [
      { title: "Aturan Poin", detail: "Buat daftar bobot poin untuk tiap jenis pelanggaran atau prestasi.", icon: Settings },
      { title: "Input Laporan", detail: "Catat kejadian indisipliner secara real-time.", icon: FileText },
      { title: "Tindak Lanjut", detail: "Sistem akan memberi peringatan jika poin melampaui batas.", icon: ShieldCheck },
    ],
  },
  kedisiplinan_piket: {
    title: "Jurnal Piket",
    customKelolaLabel: "Piket",
    description: "Kelola laporan kegiatan harian dan pengawasan sekolah oleh guru piket.",
    icon: CheckCircle2,
    steps: [
      { title: "Catatan Harian", detail: "Catat kejadian penting, kehadiran siswa telat, atau insiden.", icon: FileText },
      { title: "Pengawasan", detail: "Lakukan pengawasan kelas kosong dan kondusifitas lingkungan.", icon: Users },
      { title: "Rekapitulasi", detail: "Cetak laporan harian atau mingguan untuk arsip kesiswaan.", icon: FileSpreadsheet },
    ],
  },
  kedisiplinan_bpbk: {
    title: "Layanan BP/BK",
    customKelolaLabel: "BP/BK",
    description: "Fasilitasi bimbingan konseling untuk siswa bermasalah atau penelusuran minat bakat.",
    icon: User,
    steps: [
      { title: "Panggilan Siswa", detail: "Jadwalkan sesi bimbingan untuk siswa yang membutuhkan.", icon: CalendarDays },
      { title: "Buku Kasus", detail: "Catat dan rahasiakan detail permasalahan dan solusinya.", icon: Lock },
      { title: "Tindak Lanjut", detail: "Koordinasikan hasil bimbingan dengan Wali Kelas atau Orang Tua.", icon: Phone },
    ],
  },
  riwayat_prestasi: {
    title: "Riwayat Prestasi",
    customKelolaLabel: "Prestasi",
    description: "Pendataan siswa berprestasi di tingkat regional, nasional, maupun internasional.",
    icon: Trophy,
    steps: [
      { title: "Input Prestasi", detail: "Catat prestasi akademik maupun non-akademik siswa.", icon: Award },
      { title: "Sertifikat", detail: "Arsipkan bukti sertifikat atau dokumentasi penghargaan.", icon: FileImage },
      { title: "Rekap Prestasi", detail: "Cetak rekap prestasi untuk laporan dinas atau sekolah.", icon: FileSpreadsheet }
    ]
  },
  hikvision_report: {
    title: "Laporan Absensi",
    customKelolaLabel: "Laporan",
    description: "Rekapitulasi lengkap riwayat kehadiran dari perangkat Hikvision maupun manual.",
    icon: FileText,
    steps: [
      { title: "Pilih Entitas", detail: "Buka tab Laporan Guru, Karyawan, atau Siswa.", icon: Users },
      { title: "Rentang Waktu", detail: "Tentukan filter tanggal awal dan akhir laporan.", icon: CalendarDays },
      { title: "Unduh Berkas", detail: "Ekspor ke dalam file Excel untuk diproses lebih lanjut.", icon: UploadCloud },
    ],
  },
  pkl_laporan: {
    title: "Laporan PKL",
    customKelolaLabel: "Laporan",
    description: "Rekapitulasi hasil keseluruhan program Praktik Kerja Lapangan siswa.",
    icon: FileText,
    steps: [
      { title: "Nilai Akhir", detail: "Tinjau akumulasi nilai dari industri dan guru pembimbing.", icon: CheckCircle2 },
      { title: "Ketercapaian", detail: "Evaluasi tingkat keberhasilan dan kehadiran siswa.", icon: SlidersHorizontal },
      { title: "Cetak Sertifikat", detail: "Buat dokumen resmi sebagai bukti penyelesaian PKL.", icon: FileText },
    ],
  },
  generate: {
    title: "Generate Jadwal",
    customKelolaLabel: "Generate",
    description: "Mesin otomatis pembuat jadwal pelajaran menggunakan algoritma heuristik.",
    icon: Wand2,
    steps: [
      { title: "Cek Konflik", detail: "Pastikan ketersediaan guru dan jumlah beban mengajar valid.", icon: AlertCircle },
      { title: "Atur Parameter", detail: "Sesuaikan batas maksimal iterasi sesuai kompleksitas data.", icon: Settings },
      { title: "Generate", detail: "Mulai proses dan tunggu hingga sistem memformulasikan jadwal.", icon: CheckCircle2 },
    ],
  },
};

export const GRADES = ["Semua", "X", "XI", "XII"];

export const getMajorFullName = (abbrev) => {
  const mapping = {
    "TKJ": "Teknik Komputer dan Jaringan",
    "TJKT": "Teknik Jaringan Komputer dan Telekomunikasi",
    "TKR": "Teknik Kendaraan Ringan",
    "TKRO": "Teknik Kendaraan Ringan Otomotif",
    "AK": "Akuntansi",
    "AKL": "Akuntansi dan Keuangan Lembaga",
    "MP": "Manajemen Perkantoran",
    "MPLB": "Manajemen Perkantoran dan Layanan Bisnis",
    "RPL": "Rekayasa Perangkat Lunak",
    "PPLG": "Pengembangan Perangkat Lunak dan Gim",
    "DKV": "Desain Komunikasi Visual",
    "TP": "Teknik Pemesinan",
    "TITL": "Teknik Instalasi Tenaga Listrik",
  };
  const clean = String(abbrev || "").trim().toUpperCase();
  return mapping[clean] || abbrev || "-";
};
