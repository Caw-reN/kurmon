/**
 * MENU REGISTRY — Sumber kebenaran tunggal untuk semua menu sidebar.
 *
 * Cara kerja:
 * - Setiap item mendefinisikan id, icon, label, section, dan featureKey (opsional).
 * - `id` HARUS sama dengan key yang digunakan di `rolePermissions` (di useAppStore.js).
 * - Sidebar akan merender semua item ini secara dinamis lewat renderNavItem().
 * - renderNavItem() akan cek `rolePermissions[userRoleKey][id]` untuk menampilkan/menyembunyikan.
 *
 * Untuk menambah menu baru: cukup tambahkan entry di sini + tambahkan key di DEFAULT_ROLE_PERMISSIONS.
 */

import {
  LayoutDashboard, Calendar, CalendarDays, Clock, FileSpreadsheet,
  FileText, BookOpen, CheckCircle2, ClipboardList, MessageSquare,
  History, Users, GraduationCap, UserMinus, Trophy, ShieldAlert,
  Briefcase, PieChart, Settings, SlidersHorizontal, AppWindow,
  DoorOpen, Phone, HardDrive, DatabaseBackup, Activity, UserCog,
  Shield, MonitorSmartphone, User, Wand2, Building2, FolderOpen, UserCheck
} from 'lucide-react';

/**
 * Definisi semua menu yang ada di aplikasi.
 * `section`: nama grup/pemisah yang tampil di sidebar.
 * `adminGroup`: nama grup kolapsibel untuk tampilan admin/superadmin.
 * `adminGroupIcon`: icon untuk grup admin.
 * `adminOnly`: jika true, HANYA muncul untuk admin/superadmin (tidak difilter via rolePermissions).
 * `featureKey`: jika diisi, menu hanya tampil jika fitur ini aktif.
 * `specialCondition`: string yang mewakili kondisi khusus (ditangani di sidebar).
 */
export const MENU_REGISTRY = [
  // ─── UTAMA ──────────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    section: null,
    adminGroup: null,
  },

  // ─── JADWAL & AGENDA ────────────────────────────────────────────────────────
  {
    id: 'akademik',
    icon: CalendarDays,
    label: 'Kalender Akademik',
    section: 'Jadwal & Agenda',
    adminGroup: 'Informasi Umum',
    adminGroupIcon: MessageSquare,
    adminGroupKey: 'informasiUmum',
  },
  {
    id: 'generate',
    icon: Calendar,
    label: 'Jadwal Pelajaran',
    section: 'Jadwal & Agenda',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
  },
  {
    id: 'ketersediaan',
    icon: Clock,
    label: 'Ketersediaan Guru',
    section: 'Jadwal & Agenda',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
  },
  {
    id: 'beban',
    icon: FileSpreadsheet,
    label: 'Beban Mengajar',
    section: 'Jadwal & Agenda',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
  },

  // ─── PEMBELAJARAN ────────────────────────────────────────────────────────────
  {
    id: 'silabus',
    icon: FileText,
    label: 'Silabus Akademik',
    section: 'Pembelajaran',
    adminGroup: null,
  },
  {
    id: 'rpp_guru',
    icon: FileSpreadsheet,
    label: 'Silabus & Perangkat Guru',
    section: 'Pembelajaran',
    adminGroup: null,
  },
  {
    id: 'silabusguru',
    icon: FileText,
    label: 'Modul Saya',
    section: 'Pembelajaran',
    adminGroup: null,
  },
  {
    id: 'modul_ajar',
    icon: FileText,
    label: 'Modul Ajar',
    section: 'Pembelajaran',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
  },
  {
    id: 'jurnal_harian',
    icon: BookOpen,
    label: 'Jurnal Harian Guru',
    section: 'Pembelajaran',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
  },
  {
    id: 'pengaturan',
    icon: Settings,
    label: 'Konfigurasi Waktu',
    section: 'Pembelajaran',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
  },
  {
    id: 'advanced_rules',
    icon: SlidersHorizontal,
    label: 'Aturan Penjadwalan',
    section: 'Pembelajaran',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
  },

  // ─── KEHADIRAN ───────────────────────────────────────────────────────────────
  {
    id: 'absensiguru',
    icon: CheckCircle2,
    label: 'Absen Mandiri Guru',
    section: 'Kehadiran',
    adminGroup: null,
    featureKey: 'attendance',
  },
  {
    id: 'absensi',
    icon: UserCheck,
    label: 'Jadwal & Sesi Absensi',
    section: 'Kehadiran',
    adminGroup: null,
    featureKey: 'attendance',
  },
  {
    id: 'laporan_absensi',
    icon: ClipboardList,
    label: 'Laporan Presensi & Absensi',
    section: 'Kehadiran',
    adminGroup: 'Tata Usaha',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'tataUsaha',
    activeIds: ['laporan_absensi', 'hikvision_report_guru', 'hikvision_report_karyawan'],
  },
  {
    id: 'hikvision_report_guru',
    icon: FileText,
    label: 'Kehadiran Guru',
    section: 'Kehadiran',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
  },
  {
    id: 'kedisiplinan_absensi',
    icon: ClipboardList,
    label: 'Izin & Sakit Siswa',
    section: 'Kehadiran',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
  },
  {
    id: 'hikvision_report_siswa',
    icon: FileText,
    label: 'Presensi Siswa',
    section: 'Kehadiran',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
  },

  // ─── KESISWAAN ───────────────────────────────────────────────────────────────
  {
    id: 'siswa',
    icon: GraduationCap,
    label: 'Data Siswa',
    section: 'Kesiswaan',
    adminGroup: 'Data Sekolah',
    adminGroupIcon: FolderOpen,
    adminGroupKey: 'dataMaster',
  },
  {
    id: 'riwayat_prestasi',
    icon: Trophy,
    label: 'Riwayat Prestasi',
    section: 'Kesiswaan',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
  },
  {
    id: 'siswa_keluar',
    icon: UserMinus,
    label: 'Mutasi & Alumni Siswa',
    section: 'Kesiswaan',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
  },
  {
    id: 'kedisiplinan_bpbk',
    icon: BookOpen,
    label: 'Bimbingan Konseling',
    section: 'Kesiswaan',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
  },
  {
    id: 'kedisiplinan_piket',
    icon: ClipboardList,
    label: 'Piket & Pelanggaran',
    section: 'Kesiswaan',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
  },
  {
    id: 'tatib_skor',
    icon: BookOpen,
    label: 'Skor Kredit & Tatib',
    section: 'Kesiswaan',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
  },

  // ─── WALI KELAS (hanya tampil jika isWalas) ──────────────────────────────────
  {
    id: 'catatan_walikelas',
    icon: MessageSquare,
    label: 'Catatan Wali Kelas',
    section: 'Wali Kelas',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
    specialCondition: 'walas_only',
  },
  {
    id: 'walas_report',
    icon: FileText,
    label: 'Laporan Rekap Wali Kelas',
    section: 'Wali Kelas',
    adminGroup: null,
    specialCondition: 'walas_only',
  },

  // ─── DATA MASTER (Guru/Karyawan/Kelas, hanya admin/waka) ──────────────────────
  {
    id: 'guru',
    icon: Users,
    label: 'Data Guru',
    section: 'Data Master',
    adminGroup: 'Data Sekolah',
    adminGroupIcon: FolderOpen,
    adminGroupKey: 'dataMaster',
  },
  {
    id: 'karyawan',
    icon: Briefcase,
    label: 'Data Karyawan',
    section: 'Data Master',
    adminGroup: 'Data Sekolah',
    adminGroupIcon: FolderOpen,
    adminGroupKey: 'dataMaster',
  },
  {
    id: 'kelas',
    icon: Users,
    label: 'Data Kelas',
    section: 'Data Master',
    adminGroup: 'Data Sekolah',
    adminGroupIcon: FolderOpen,
    adminGroupKey: 'dataMaster',
  },
  {
    id: 'jurusan',
    icon: SlidersHorizontal,
    label: 'Data Jurusan',
    section: 'Data Master',
    adminGroup: 'Data Sekolah',
    adminGroupIcon: FolderOpen,
    adminGroupKey: 'dataMaster',
  },
  {
    id: 'mapel',
    icon: BookOpen,
    label: 'Mata Pelajaran',
    section: 'Data Master',
    adminGroup: 'Data Sekolah',
    adminGroupIcon: FolderOpen,
    adminGroupKey: 'dataMaster',
  },
  {
    id: 'data_pegawai',
    icon: Users,
    label: 'Data Pegawai',
    section: 'Data Master',
    adminGroup: 'Data Sekolah',
    adminGroupIcon: FolderOpen,
    adminGroupKey: 'dataMaster',
  },

  // ─── ADMINISTRASI TU ─────────────────────────────────────────────────────────
  {
    id: 'esurat',
    icon: FileText,
    label: 'Administrasi E-Surat',
    section: 'Administrasi',
    adminGroup: 'Tata Usaha',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'tataUsaha',
  },
  {
    id: 'kartu_pelajar',
    icon: Shield,
    label: 'Kartu Pelajar',
    section: 'Administrasi',
    adminGroup: 'Tata Usaha',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'tataUsaha',
  },
  {
    id: 'struktur',
    icon: Briefcase,
    label: 'Struktur Organisasi',
    section: 'Administrasi',
    adminGroup: 'Tata Usaha',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'tataUsaha',
  },

  // ─── PKL / HUBIN ─────────────────────────────────────────────────────────────
  {
    id: 'pkl_dashboard',
    icon: LayoutDashboard,
    label: 'Monitoring PKL',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    featureKey: 'pkl_dashboard',
  },
  {
    id: 'pkl_data_siswa',
    icon: Users,
    label: 'Data Siswa PKL',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    featureKey: 'pkl_data_siswa',
  },
  {
    id: 'pkl_data_perusahaan',
    icon: Briefcase,
    label: 'Data Perusahaan',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    featureKey: 'pkl_data_perusahaan',
  },
  {
    id: 'pkl_penugasan',
    icon: Wand2,
    label: 'Penugasan Guru',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    featureKey: 'pkl_penugasan',
  },
  {
    id: 'pkl_administrasi',
    icon: FileText,
    label: 'Administrasi PKL',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    featureKey: 'pkl_administrasi',
  },
  {
    id: 'pkl_jurnal',
    icon: BookOpen,
    label: 'Jurnal Siswa PKL',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    featureKey: 'pkl_jurnal',
  },
  {
    id: 'pkl_laporan',
    icon: PieChart,
    label: 'Laporan PKL',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    featureKey: 'pkl_laporan',
  },
  {
    id: 'pkl_absensi_setting',
    icon: Settings,
    label: 'Absensi GPS PKL',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    featureKey: 'pkl_absensi_setting',
  },

  // ─── SARANA & PRASARANA ──────────────────────────────────────────────────────
  {
    id: 'ruangan',
    icon: DoorOpen,
    label: 'Data Ruangan',
    section: 'Sarana & Prasarana',
    adminGroup: 'Sarana & Prasarana',
    adminGroupIcon: DoorOpen,
    adminGroupKey: 'sarpras',
  },
  {
    id: 'denah',
    icon: DoorOpen,
    label: 'Denah Ruangan',
    section: 'Sarana & Prasarana',
    adminGroup: 'Sarana & Prasarana',
    adminGroupIcon: DoorOpen,
    adminGroupKey: 'sarpras',
  },

  // ─── MESIN ABSENSI (Hikvision) ───────────────────────────────────────────────
  {
    id: 'hikvision',
    icon: LayoutDashboard,
    label: 'Dashboard Mesin',
    section: 'Mesin Absensi',
    adminGroup: 'Mesin Absensi',
    adminGroupIcon: MonitorSmartphone,
    adminGroupKey: 'absensi',
  },
  {
    id: 'hikvision_students',
    icon: Users,
    label: 'Data Pengguna Mesin',
    section: 'Mesin Absensi',
    adminGroup: 'Mesin Absensi',
    adminGroupIcon: MonitorSmartphone,
    adminGroupKey: 'absensi',
  },
  {
    id: 'hikvision_devices',
    icon: HardDrive,
    label: 'Pengaturan Alat',
    section: 'Mesin Absensi',
    adminGroup: 'Mesin Absensi',
    adminGroupIcon: MonitorSmartphone,
    adminGroupKey: 'absensi',
  },

  // ─── TAMPILAN ────────────────────────────────────────────────────────────────
  {
    id: 'tampilan',
    icon: AppWindow,
    label: 'Tampilan Web',
    section: 'Tampilan',
    adminGroup: null,
    adminOnly: true,
  },

  // ─── KOMUNIKASI ──────────────────────────────────────────────────────────────
  {
    id: 'pesan',
    icon: MessageSquare,
    label: 'Pesan Dashboard',
    section: 'Komunikasi',
    adminGroup: 'Informasi Umum',
    adminGroupIcon: MessageSquare,
    adminGroupKey: 'informasiUmum',
    featureKey: 'dashboardMessages',
  },

  // ─── PENGATURAN SISTEM (Admin Only) ──────────────────────────────────────────
  {
    id: 'manajemen_role',
    icon: Shield,
    label: 'Struktur & Jabatan Staf',
    section: 'Pengaturan',
    adminGroup: 'Konfigurasi Sistem',
    adminGroupIcon: Settings,
    adminGroupKey: 'sistem',
    adminOnly: true,
  },
  {
    id: 'hak_akses',
    icon: UserCog,
    label: 'Hak Akses & Matriks Izin',
    section: 'Pengaturan',
    adminGroup: 'Konfigurasi Sistem',
    adminGroupIcon: Settings,
    adminGroupKey: 'sistem',
    adminOnly: true,
    activeIds: ['hak_akses', 'pengaturanuser', 'audit_log'],
  },
  {
    id: 'fitur',
    icon: SlidersHorizontal,
    label: 'Sistem & Integrasi',
    section: 'Pengaturan',
    adminGroup: 'Konfigurasi Sistem',
    adminGroupIcon: Settings,
    adminGroupKey: 'sistem',
    adminOnly: true,
    activeIds: ['fitur', 'tampilan', 'api_keys', 'whatsapp', 'gdrive_backup'],
  },
  {
    id: 'profil_sekolah',
    icon: Building2,
    label: 'Profil Instansi',
    section: 'Pengaturan',
    adminGroup: 'Informasi Umum',
    adminGroupIcon: MessageSquare,
    adminGroupKey: 'informasiUmum',
    adminOnly: true,
  },
];

/**
 * Mengelompokkan menu registry berdasarkan section-nya.
 * Digunakan untuk merender sidebar non-admin secara dinamis per section.
 */
export function getMenuBySections(registry = MENU_REGISTRY) {
  const sections = {};
  for (const item of registry) {
    const key = item.section || '_root';
    if (!sections[key]) sections[key] = [];
    sections[key].push(item);
  }
  return sections;
}

/**
 * Mengelompokkan menu registry berdasarkan adminGroupKey-nya.
 * Digunakan untuk merender sidebar admin/superadmin.
 */
export function getMenuByAdminGroups(registry = MENU_REGISTRY) {
  const groups = {};
  for (const item of registry) {
    const key = item.adminGroupKey || '_root';
    if (!groups[key]) {
      groups[key] = {
        label: item.adminGroup,
        icon: item.adminGroupIcon,
        key,
        items: [],
      };
    }
    groups[key].items.push(item);
  }
  return groups;
}
