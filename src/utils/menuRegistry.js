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
  DoorOpen, Phone, HardDrive, DatabaseBackup, Activity, UserCog, KeyRound,
  Shield, ShieldCheck, MonitorSmartphone, User, Wand2, Building2, FolderOpen, UserCheck
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
    activeIds: ['generate', 'ketersediaan', 'beban', 'pengaturan', 'advanced_rules'],
  },
  {
    id: 'ketersediaan',
    icon: Clock,
    label: 'Ketersediaan Guru',
    section: 'Jadwal & Agenda',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'beban',
    icon: FileSpreadsheet,
    label: 'Beban Mengajar',
    section: 'Jadwal & Agenda',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },

  // ─── PEMBELAJARAN ────────────────────────────────────────────────────────────
  {
    id: 'modul_ajar',
    icon: FileText,
    label: 'Modul & Perangkat Ajar',
    section: 'Pembelajaran',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
    activeIds: ['modul_ajar', 'silabus', 'silabusguru', 'rpp_guru'],
  },
  {
    id: 'jurnal_harian',
    icon: BookOpen,
    label: 'Jurnal Harian Guru',
    section: 'Pembelajaran',
    adminGroup: 'Kurikulum',
    adminGroupIcon: BookOpen,
    adminGroupKey: 'kurikulum',
    activeIds: ['jurnal_harian', 'rekap_jurnal_kelas'],
  },
  {
    id: 'pengaturan',
    icon: Settings,
    label: 'Konfigurasi Waktu',
    section: 'Pembelajaran',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'advanced_rules',
    icon: SlidersHorizontal,
    label: 'Aturan Penjadwalan',
    section: 'Pembelajaran',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },

  // ─── KEHADIRAN ───────────────────────────────────────────────────────────────
  {
    id: 'absensiguru',
    icon: CheckCircle2,
    label: 'Absen Mandiri Guru',
    section: 'Kehadiran',
    adminGroup: 'Kehadiran',
    adminGroupIcon: Clock,
    adminGroupKey: 'kehadiran',
    featureKey: 'attendance',
  },
  {
    id: 'absensi',
    icon: UserCheck,
    label: 'Jadwal & Sesi Absensi',
    section: 'Kehadiran',
    adminGroup: 'Kehadiran',
    adminGroupIcon: Clock,
    adminGroupKey: 'kehadiran',
    featureKey: 'attendance',
  },
  {
    id: 'laporan_absensi',
    icon: ClipboardList,
    label: 'Laporan Kehadiran',
    section: 'Kehadiran',
    adminGroup: 'Kehadiran',
    adminGroupIcon: Clock,
    adminGroupKey: 'kehadiran',
    activeIds: ['laporan_absensi', 'hikvision_report_guru', 'hikvision_report_karyawan'],
  },
  {
    id: 'hikvision_report_guru',
    icon: FileText,
    label: 'Kehadiran Guru',
    section: 'Kehadiran',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'hikvision_report_siswa',
    icon: ClipboardList,
    label: 'Presensi Siswa',
    section: 'Kesiswaan',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
    activeIds: ['hikvision_report_siswa', 'kedisiplinan_absensi', 'keterangan_massal'],
  },
  {
    id: 'kedisiplinan_absensi',
    icon: CheckCircle2,
    label: 'Izin & Sakit Siswa',
    section: 'Kesiswaan',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'keterangan_massal',
    icon: FileSpreadsheet,
    label: 'Keterangan Massal',
    section: 'Kesiswaan',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },

  // ─── KESISWAAN ───────────────────────────────────────────────────────────────
  {
    id: 'siswa',
    icon: GraduationCap,
    label: 'Data Siswa',
    section: 'Data Master',
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
    id: 'kedisiplinan_hub',
    icon: ShieldCheck,
    label: 'Pusat Kedisiplinan & BK',
    section: 'Kesiswaan',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
    activeIds: ['kedisiplinan_hub', 'kedisiplinan_bpbk', 'kedisiplinan_piket', 'buku_konseling'],
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
    id: 'kedisiplinan_bpbk',
    icon: ShieldCheck,
    label: 'Bimbingan Konseling (BK)',
    section: 'Kesiswaan',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
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

  // ─── WALI KELAS & KESISWAAN ──────────────────────────────────────────────────
  {
    id: 'catatan_walikelas',
    icon: MessageSquare,
    label: 'Catatan Wali Kelas',
    section: 'Kesiswaan',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
    specialCondition: 'walas_only',
  },
  {
    id: 'rekap_jurnal_kelas',
    icon: BookOpen,
    label: 'Rekap Jurnal Kelas',
    section: 'Pembelajaran',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'walas_report',
    icon: FileText,
    label: 'Laporan Rekap Wali Kelas',
    section: 'Kesiswaan',
    adminGroup: 'Kesiswaan',
    adminGroupIcon: Users,
    adminGroupKey: 'kesiswaan',
    specialCondition: 'walas_only',
  },

  // ─── DATA MASTER (Data Pegawai/Kelas/Jurusan/Mapel, hanya admin/waka) ─────────
  {
    id: 'data_pegawai',
    icon: Users,
    label: 'Data Pegawai',
    section: 'Data Master',
    adminGroup: 'Data Sekolah',
    adminGroupIcon: FolderOpen,
    adminGroupKey: 'dataMaster',
    activeIds: ['data_pegawai', 'guru', 'dataguru', 'karyawan'],
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
    label: 'Monitoring & Data PKL',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    activeIds: ['pkl_dashboard', 'pkl_data_siswa', 'pkl_data_perusahaan', 'pkl_penugasan', 'pkl_import'],
  },
  {
    id: 'pkl_data_siswa',
    icon: Users,
    label: 'Data Siswa PKL',
    section: 'PKL & Hubin',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'pkl_data_perusahaan',
    icon: Briefcase,
    label: 'Data Perusahaan',
    section: 'PKL & Hubin',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'pkl_penugasan',
    icon: Wand2,
    label: 'Penugasan Guru',
    section: 'PKL & Hubin',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'pkl_jurnal',
    icon: BookOpen,
    label: 'Jurnal & Laporan PKL',
    section: 'PKL & Hubin',
    adminGroup: 'Hubungan Industri',
    adminGroupIcon: Briefcase,
    adminGroupKey: 'hubin',
    activeIds: ['pkl_jurnal', 'pkl_laporan', 'pkl_administrasi', 'pkl_absensi_setting'],
  },
  {
    id: 'pkl_administrasi',
    icon: FileText,
    label: 'Administrasi PKL',
    section: 'PKL & Hubin',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'pkl_laporan',
    icon: PieChart,
    label: 'Laporan PKL',
    section: 'PKL & Hubin',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'pkl_absensi_setting',
    icon: Settings,
    label: 'Absensi GPS PKL',
    section: 'PKL & Hubin',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },

  // ─── SARANA & PRASARANA ──────────────────────────────────────────────────────
  {
    id: 'ruangan',
    icon: DoorOpen,
    label: 'Data Ruangan & Fasilitas',
    section: 'Sarana & Prasarana',
    adminGroup: 'Sarana & Prasarana',
    adminGroupIcon: DoorOpen,
    adminGroupKey: 'sarpras',
    activeIds: ['ruangan', 'denah', 'fasilitas'],
  },
  {
    id: 'denah',
    icon: DoorOpen,
    label: 'Denah Ruangan',
    section: 'Sarana & Prasarana',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },
  {
    id: 'fasilitas',
    icon: Building2,
    label: 'Data Fasilitas & Sarana',
    section: 'Sarana & Prasarana',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
  },

  // ─── MESIN ABSENSI (Hikvision) ───────────────────────────────────────────────
  {
    id: 'hikvision',
    icon: LayoutDashboard,
    label: 'Manajemen Mesin Absensi',
    section: 'Mesin Absensi',
    adminGroup: 'Mesin Absensi',
    adminGroupIcon: MonitorSmartphone,
    adminGroupKey: 'absensi',
    adminOnly: true,
    activeIds: ['hikvision', 'hikvision_devices', 'hikvision_students'],
  },
  {
    id: 'hikvision_students',
    icon: Users,
    label: 'Data Pengguna Mesin',
    section: 'Mesin Absensi',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
    adminOnly: true,
  },
  {
    id: 'hikvision_devices',
    icon: HardDrive,
    label: 'Pengaturan Alat',
    section: 'Mesin Absensi',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
    adminOnly: true,
  },

  // ─── TAMPILAN ────────────────────────────────────────────────────────────────
  {
    id: 'tampilan',
    icon: AppWindow,
    label: 'Tampilan Web',
    section: 'Tampilan',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
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
    id: 'hak_akses',
    icon: UserCog,
    label: 'Hak Akses & Pengguna',
    section: 'Pengaturan',
    adminGroup: 'Konfigurasi Sistem',
    adminGroupIcon: Settings,
    adminGroupKey: 'sistem',
    adminOnly: true,
    activeIds: ['hak_akses', 'manajemen_role', 'pengaturanuser', 'status_password', 'log_password', 'audit_log'],
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
    id: 'manajemen_role',
    icon: Shield,
    label: 'Struktur & Jabatan Staf',
    section: 'Pengaturan',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
    adminOnly: true,
  },
  {
    id: 'status_password',
    icon: KeyRound,
    label: 'Log Status Sandi',
    section: 'Pengaturan',
    adminGroup: null,
    adminGroupKey: null,
    hideInSidebar: true,
    adminOnly: true,
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
  // ─── AKTIVITAS & KEAMANAN ────────────────────────────────────────────────────
  {
    id: 'audit_log',
    icon: Activity,
    label: 'Log Aktivitas',
    section: 'Aktivitas',
    adminGroup: 'Konfigurasi Sistem',
    adminGroupIcon: Settings,
    adminGroupKey: 'sistem',
  },
  {
    id: 'keamanan',
    icon: Shield,
    label: 'Keamanan Akun',
    section: 'Aktivitas',
    adminGroup: 'Konfigurasi Sistem',
    adminGroupIcon: Settings,
    adminGroupKey: 'sistem',
    hideInSidebar: true,
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
