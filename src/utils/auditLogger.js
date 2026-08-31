/**
 * In-App Audit Logger & Activity Tracker
 * Catat aktivitas pengguna (Guru, Karyawan, Admin) secara real-time dan detail:
 * - Navigasi tab/menu yang diakses
 * - Upload modul ajar / silabus / materi KBM
 * - Download / Ekspor laporan, jadwal, raport
 * - Pengisian Jurnal KBM
 * - Validasi e-surat, administrasi siswa/PKL
 */

// Tab name humanizer dictionary
export const TAB_LABELS = {
  dashboard: 'Membuka Dashboard Utama',
  jurnal_harian: 'Membuka Menu Jurnal Harian Guru',
  silabus: 'Membuka Menu Silabus & Modul Ajar',
  generate: 'Membuka Menu Jadwal & KBM',
  absensi: 'Membuka Menu Presensi Siswa',
  absensiguru: 'Membuka Presensi Guru Mandiri',
  laporan_absensi: 'Membuka Laporan & Rekap Absensi',
  kedisiplinan_bpbk: 'Membuka Buku BPBK & Binaan Siswa',
  kedisiplinan_absensi: 'Membuka Rekap Kedisiplinan Siswa',
  pkl_dashboard: 'Membuka Dashboard PKL & DUDI',
  kelola_administrasi_pkl: 'Membuka Administrasi PKL & E-Surat',
  penugasan_guru: 'Membuka Penugasan Pembimbing PKL',
  dataguru: 'Membuka Master Data SDM Guru',
  datakaryawan: 'Membuka Master Data Karyawan',
  datasiswa: 'Membuka Master Data Siswa',
  dataperusahaan: 'Membuka Master Data Mitra DUDI',
  akademik: 'Membuka Kalender Akademik Sekolah',
  pesan: 'Membuka Pengumuman & Pesan',
  pengaturan_user: 'Membuka Manajemen Akun & Hak Akses',
  kartu_pelajar: 'Membuka Cetak Kartu Pelajar',
  keamanan: 'Membuka Audit Log Keamanan & Aktivitas',
  import_data: 'Membuka Menu Import Data Excel',
  sarpras: 'Membuka Monitoring Fasilitas & Sarpras',
  beban_mengajar: 'Membuka Tabel Beban Mengajar Guru',
  ketersediaan_guru: 'Membuka Jadwal Ketersediaan Guru',
};

// Internal debounce tracker to prevent duplicate consecutive logs within 5 seconds
const lastLoggedActions = new Map();

export const recordAuditLog = async ({ action, detail, targetType = 'APP', targetId = '' }) => {
  try {
    const act = String(action || 'ACTIVITY').toUpperCase();
    const det = String(detail || '').trim();
    if (!det) return;

    // Deduplication check (key = action + detail)
    const key = `${act}::${det}`;
    const now = Date.now();
    const lastTime = lastLoggedActions.get(key) || 0;
    if (now - lastTime < 4000) {
      return; // Skip duplicate within 4 seconds
    }
    lastLoggedActions.set(key, now);

    const session = JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}');
    const token = session?.authToken || localStorage.getItem('token') || '';
    if (!token) return;

    await fetch('/api/audit-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: act,
        detail: det,
        targetType,
        targetId
      })
    });
  } catch (e) {
    // Non-blocking logging
    console.debug('Audit log dispatch error:', e);
  }
};

/**
 * Log Tab Navigation
 */
export const logTabAccess = (tab) => {
  if (!tab || tab === 'null' || tab === 'undefined') return;
  const label = TAB_LABELS[tab] || `Membuka Tab: ${tab.replace(/_/g, ' ')}`;
  recordAuditLog({
    action: 'NAVIGASI',
    detail: label,
    targetType: 'TAB',
    targetId: tab
  });
};

/**
 * Log File Download / Export
 */
export const logFileDownload = (fileName, category = 'LAPORAN') => {
  recordAuditLog({
    action: 'DOWNLOAD',
    detail: `Mengunduh file ${category}: "${fileName}"`,
    targetType: 'FILE',
    targetId: fileName
  });
};

/**
 * Log File Upload
 */
export const logFileUpload = (fileName, category = 'MODUL_AJAR') => {
  recordAuditLog({
    action: 'UPLOAD_MODUL',
    detail: `Mengunggah dokumen ${category}: "${fileName}"`,
    targetType: 'FILE',
    targetId: fileName
  });
};

/**
 * Log Journal Entry
 */
export const logJournalEntry = (mapel, kelas, jamKe, topik) => {
  recordAuditLog({
    action: 'ISI_JURNAL',
    detail: `Mengisi Jurnal KBM Mapel ${mapel} di Kelas ${kelas} (Jam ke-${jamKe || 1}) - "${topik || 'KBM Reguler'}"`,
    targetType: 'JURNAL',
    targetId: `${kelas}-${mapel}`
  });
};

/**
 * Log Walas Attendance Confirmation / Verification
 */
export const logWalasAttendanceCheck = (className, dateStr = '', summaryStats = '') => {
  const dateInfo = dateStr || new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const detail = summaryStats
    ? `Wali Kelas telah melihat & memvalidasi absensi siswa kelas ${className} tanggal ${dateInfo} (${summaryStats})`
    : `Wali Kelas telah melihat & memvalidasi data absensi siswa kelas ${className} hari ini (${dateInfo})`;

  recordAuditLog({
    action: 'VALIDASI_ABSENSI',
    detail,
    targetType: 'ABSENSI_WALAS',
    targetId: className
  });
};
