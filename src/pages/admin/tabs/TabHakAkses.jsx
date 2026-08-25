import { useState, useEffect, useMemo } from 'react';
import { Button, Modal, UISelect } from '../../../components/ui.jsx';
import { 
  UserCog, ShieldCheck, Key, History, Shield, Save, RotateCcw, 
  Search, Sparkles, AlertCircle, Plus, Trash2, CheckCircle2, 
  Eye, Edit3, XCircle, Info, Layers, Lock, Unlock, Check
} from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { getRoleKeyLabel } from '../../../utils/constants.js';

// ─── METADATA MODUL & MENU APLIKASI ──────────────────────────────────────────
const ALL_TABS_METADATA = {
  // Utama & Dashboard
  dashboard: { label: 'Dashboard Utama', desc: 'Ringkasan data, statistik kehadiran, dan grafik sekolah' },
  pesan: { label: 'Pusat Pesan & Pengumuman', desc: 'Membuat dan membaca pengumuman sekolah' },
  tampilan: { label: 'Tampilan Web & Landing Page', desc: 'Pengaturan tema, logo, sambutan kepsek, dan landing page' },

  // Siswa & Bimbingan
  siswa: { label: 'Data Induk Siswa', desc: 'Daftar biodata siswa lengkap, pencarian, dan NISN' },
  riwayat_prestasi: { label: 'Riwayat Prestasi Siswa', desc: 'Pencatatan prestasi, piagam kejuaraan, dan lomba' },
  siswa_keluar: { label: 'Mutasi & Alumni Siswa', desc: 'Daftar mutasi keluar dan arsip alumni' },
  kedisiplinan_bpbk: { label: 'Bimbingan Konseling (BK)', desc: 'Konseling siswa, pemanggilan ortu, dan catatan khusus BK' },

  // Kedisiplinan & Piket
  kedisiplinan_piket: { label: 'Piket & Pelanggaran', desc: 'Input poin pelanggaran harian oleh guru piket' },
  tatib_skor: { label: 'Aturan Tatib & Skor', desc: 'Master bobot poin pelanggaran, sanksi, dan PDF tatib' },
  catatan_walikelas: { label: 'Catatan Wali Kelas', desc: 'Catatan kondisi siswa per kelas binaan' },
  walas_report: { label: 'Laporan Rekap Wali Kelas', desc: 'Rekapitulasi ketercapaian kelas binaan' },

  // Guru & KBM
  guru: { label: 'Data Guru & Pendidik', desc: 'Data induk guru, kode pengajar, dan beban JP' },
  data_pegawai: { label: 'Data Pegawai & Beban Kerja', desc: 'Ringkasan jam mengajar dan tugas tambahan' },
  karyawan: { label: 'Data Staf & Karyawan', desc: 'Daftar staf TU, toolman, satpam, dan kebersihan' },
  kelas: { label: 'Data Ruang Kelas', desc: 'Manajemen rombel kelas dan wali kelas' },
  jurusan: { label: 'Data Jurusan / Program Keahlian', desc: 'Manajemen konsentrasi keahlian' },
  mapel: { label: 'Mata Pelajaran', desc: 'Daftar mata pelajaran kurikulum merdeka/nasional' },
  generate: { label: 'Jadwal Mengajar (KBM Otomatis)', desc: 'Pembuatan & modifikasi jadwal pelajaran mingguan' },

  // Silabus & Mengajar
  silabus: { label: 'Silabus Akademik (Waka Kurikulum)', desc: 'Monitoring capaian silabus seluruh mata pelajaran' },
  silabusguru: { label: 'Silabus & Perangkat Guru', desc: 'Upload RPP & silabus mengajar oleh masing-masing guru' },
  modul_ajar: { label: 'Modul Ajar (RPP)', desc: 'Pengaturan modul ajar terintegrasi' },
  jurnal_harian: { label: 'Jurnal Harian KBM', desc: 'Pengisian absensi kelas dan materi ajar per jam tatap muka' },

  // Kehadiran & Absensi
  absensi: { label: 'Jadwal & Sesi Absensi', desc: 'Pengaturan sesi jadwal absensi' },
  absensiguru: { label: 'Absen Mandiri Guru (KBM)', desc: 'Absensi mandiri guru di lokasi sekolah' },
  kedisiplinan_absensi: { label: 'Izin & Sakit Siswa', desc: 'Pengajuan & persetujuan surat izin, sakit, dan dispensasi siswa' },
  hikvision_report_siswa: { label: 'Presensi Siswa', desc: 'Rekap matriks presensi harian per kelas' },

  // Sarpras & Administrasi
  ruangan: { label: 'Data Ruangan & Lab', desc: 'Manajemen ruang teori, bengkel praktikum, dan lab' },
  denah: { label: 'Denah Bangunan Sekolah', desc: 'Visualisasi plot lokasi kelas pada denah sekolah' },
  esurat: { label: 'Administrasi Surat TU (e-Surat)', desc: 'Pembuatan surat keputusan, izin dinas, dan undangan' },
  kartu_pelajar: { label: 'Cetak Kartu Pelajar', desc: 'Desain dan cetak kartu tanda siswa' },

  // Praktek Kerja Lapangan (PKL)
  pkl_dashboard: { label: 'Dashboard PKL (Prakerin)', desc: 'Statistik penempatan dan monitoring PKL' },
  pkl_data_siswa: { label: 'Data Siswa PKL', desc: 'Plotting siswa ke lokasi industri DUDI' },
  pkl_data_perusahaan: { label: 'Mitra Industri (DUDI)', desc: 'Daftar perusahaan rekanan PKL' },
  pkl_penugasan: { label: 'Penugasan Guru Pembimbing', desc: 'Penunjukan guru pembimbing per lokasi industri' },
  pkl_administrasi: { label: 'Dokumen Administrasi PKL', desc: 'Surat jalan, permohonan, dan mou kemitraan' },
  pkl_jurnal: { label: 'Jurnal Siswa PKL', desc: 'Monitoring kegiatan kerja harian siswa di industri' },
  pkl_laporan: { label: 'Laporan & Nilai PKL', desc: 'Rekap nilai industri dan sertifikat PKL' },
  pkl_absensi_setting: { label: 'Pengaturan GPS PKL', desc: 'Radius toleransi absen mobile PKL' }
};

// ─── KELOMPOK PERMISSION ──────────────────────────────────────────────────────
const PERMISSION_GROUPS = [
  { key: 'utama', label: 'Utama & Dashboard', color: 'bg-blue-500', tabs: ['dashboard', 'pesan', 'tampilan'] },
  { key: 'siswa', label: 'Siswa & Bimbingan', color: 'bg-emerald-500', tabs: ['siswa', 'riwayat_prestasi', 'siswa_keluar', 'kedisiplinan_bpbk'] },
  { key: 'kedisiplinan', label: 'Kedisiplinan & Piket', color: 'bg-rose-500', tabs: ['kedisiplinan_piket', 'tatib_skor', 'catatan_walikelas', 'walas_report'] },
  { key: 'guru', label: 'Guru & KBM', color: 'bg-amber-500', tabs: ['guru', 'data_pegawai', 'karyawan', 'kelas', 'jurusan', 'mapel', 'generate'] },
  { key: 'silabus', label: 'Silabus & Mengajar', color: 'bg-indigo-500', tabs: ['silabus', 'silabusguru', 'modul_ajar', 'jurnal_harian'] },
  { key: 'absensi', label: 'Absensi & Kehadiran', color: 'bg-teal-500', tabs: ['absensi', 'absensiguru', 'kedisiplinan_absensi', 'hikvision_report_siswa'] },
  { key: 'sarpras', label: 'Sarpras & Surat', color: 'bg-cyan-500', tabs: ['ruangan', 'denah', 'esurat', 'kartu_pelajar'] },
  { key: 'pkl', label: 'Prakerin (PKL / Hubin)', color: 'bg-purple-500', tabs: ['pkl_dashboard', 'pkl_data_siswa', 'pkl_data_perusahaan', 'pkl_penugasan', 'pkl_administrasi', 'pkl_jurnal', 'pkl_laporan', 'pkl_absensi_setting'] }
];

// ─── KELOMPOK ROLE UNTUK TABS ─────────────────────────────────────────────────
const ROLE_GROUPS = [
  {
    category: 'Pimpinan & TU',
    roles: [
      { key: 'kepsek', label: 'Kepala Sekolah', desc: 'Monitoring kebijakan & laporan' },
      { key: 'tu', label: 'Tata Usaha (TU)', desc: 'Administrasi data, surat, & kartu' },
      { key: 'sekretaris_tu', label: 'Sekretaris TU', desc: 'Surat menyurat & arsip' },
      { key: 'bendahara', label: 'Bendahara Sekolah', desc: 'Keuangan & administrasi' },
    ]
  },
  {
    category: 'Wakil Kepala Sekolah (Waka)',
    roles: [
      { key: 'waka_kurikulum', label: 'Waka Kurikulum', desc: 'Jadwal KBM, mapel, & silabus' },
      { key: 'waka_kesiswaan', label: 'Waka Kesiswaan', desc: 'Tatib, absensi siswa, & BK' },
      { key: 'waka_hubin', label: 'Waka Hubin (PKL)', desc: 'Mitra industri & prakerin' },
      { key: 'waka_sarpras', label: 'Waka Sarpras', desc: 'Ruangan, lab, & inventaris' },
    ]
  },
  {
    category: 'Tim Kurikulum',
    roles: [
      { key: 'sekretaris_kurikulum', label: 'Sekretaris Kurikulum', desc: 'Arsip kurikulum & modul ajar' },
      { key: 'anggota_kurikulum', label: 'Anggota Tim Kurikulum', desc: 'Bantuan teknis KBM & Silabus' },
    ]
  },
  {
    category: 'Tim Kesiswaan',
    roles: [
      { key: 'bpbk', label: 'Guru BP / BK', desc: 'Konseling & catatan khusus' },
      { key: 'pembina_osis', label: 'Pembina OSIS', desc: 'Kegiatan kesiswaan & tatib' },
      { key: 'sekretaris_osis', label: 'Sekretaris OSIS', desc: 'Administrasi OSIS' },
      { key: 'sekretaris_kesiswaan', label: 'Sekretaris Kesiswaan', desc: 'Rekap tatib & pelanggaran' },
      { key: 'anggota_kesiswaan', label: 'Anggota Kesiswaan', desc: 'Monitoring & piket kesiswaan' },
    ]
  },
  {
    category: 'Tim Hubin & Sarpras',
    roles: [
      { key: 'sekretaris_hubin', label: 'Sekretaris Hubin', desc: 'Dokumen & surat jalan PKL' },
      { key: 'anggota_hubin', label: 'Anggota Tim PKL', desc: 'Monitoring & pembimbing PKL' },
      { key: 'sekretaris_sarpras', label: 'Sekretaris Sarpras', desc: 'Inventarisasi sarana sekolah' },
      { key: 'anggota_sarpras', label: 'Anggota Tim Sarpras', desc: 'Pemeliharaan fasilitas' },
    ]
  },
  {
    category: 'Pengajar & Staf Umum',
    roles: [
      { key: 'walikelas', label: 'Wali Kelas', desc: 'Laporan kelas binaan' },
      { key: 'guru', label: 'Guru Biasa (Pengajar)', desc: 'Jurnal KBM & silabus mengajar' },
      { key: 'karyawan', label: 'Karyawan / Staf Umum', desc: 'Satpam, toolman, kebersihan' },
    ]
  }
];

export default function TabHakAkses(props) {
  const {
    isSuperAdminRole,
    currentUser,
    rolePermissions,
    ensureDatabaseReadyForWrite,
    updateRolePermissions,
    saveDatabaseNow,
    activeTab,
    setActiveTab,
    showNotification,
    teachers,
    staffs,
    syncAuthSnapshotNow,
    adminUser,
  } = props;

  const [selectedRoleKey, setSelectedRoleKey] = useState('guru');
  const [localPermissions, setLocalPermissions] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Create Role
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [templateRoleKey, setTemplateRoleKey] = useState('guru');
  const [isCreating, setIsCreating] = useState(false);

  // Delete Role Confirmation
  const [deleteRoleKey, setDeleteRoleKey] = useState(null);

  // Sync state with selected role
  useEffect(() => {
    if (rolePermissions && rolePermissions[selectedRoleKey]) {
      const allowedTabs = rolePermissions[selectedRoleKey];
      let normalized = {};
      if (Array.isArray(allowedTabs)) {
        allowedTabs.forEach(t => {
          normalized[t] = 'edit';
        });
      } else {
        normalized = { ...allowedTabs };
      }
      setLocalPermissions(normalized);
      setIsModified(false);
    }
  }, [rolePermissions, selectedRoleKey]);

  const getRoleLabelExtended = (key) => {
    if (!key) return { label: 'Guru', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', short: 'Guru' };
    try {
      if (rolePermissions && rolePermissions[key] && rolePermissions[key].__label) {
        return {
          label: rolePermissions[key].__label,
          color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          short: rolePermissions[key].__label
        };
      }
    } catch (e) {
      console.error("Error resolving custom role label:", e);
    }
    return getRoleKeyLabel(key);
  };

  // Filter permission groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return PERMISSION_GROUPS;
    return PERMISSION_GROUPS.map(group => {
      const filteredTabs = group.tabs.filter(tab => {
        const info = ALL_TABS_METADATA[tab];
        return info && (
          info.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          info.desc.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      return { ...group, tabs: filteredTabs };
    }).filter(group => group.tabs.length > 0);
  }, [searchQuery]);

  if (!isSuperAdminRole(currentUser?.role)) {
    return (
      <div className="bg-white border border-slate-200 rounded-[var(--ui-radius-card)] p-10 text-center max-w-md mx-auto mt-10 shadow-sm">
        <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
        <h3 className="text-base font-black text-slate-700">Akses SuperAdmin Diperlukan</h3>
        <p className="text-sm text-slate-400 mt-1">Hak akses hanya dapat diubah oleh operator SuperAdmin.</p>
      </div>
    );
  }

  const setTabPermission = (tab, level) => {
    setLocalPermissions(prev => {
      const next = { ...prev, [tab]: level };
      setIsModified(true);
      return next;
    });
  };

  const getPermissionState = (tab) => {
    return localPermissions[tab] || 'nonaktif';
  };

  const handleToggleGroupLevel = (group, targetLevel) => {
    const next = { ...localPermissions };
    group.tabs.forEach(tab => {
      next[tab] = targetLevel;
    });
    setLocalPermissions(next);
    setIsModified(true);
  };

  const handleUpdateRole = async () => {
    if (!ensureDatabaseReadyForWrite('mengubah hak akses')) return;
    try {
      // Update store lokal
      await updateRolePermissions({
        [selectedRoleKey]: localPermissions
      });
      // Simpan ke database server agar persisten
      const nextRolePermissions = {
        ...(rolePermissions || {}),
        [selectedRoleKey]: localPermissions
      };
      await saveDatabaseNow({ rolePermissions: nextRolePermissions }, 'menyimpan hak akses role');
      // Sync auth snapshot agar user yang sedang login langsung merasakan perubahan
      if (syncAuthSnapshotNow && adminUser) {
        await syncAuthSnapshotNow(adminUser, teachers || [], staffs || [], 'sync hak akses role');
      }
      setIsModified(false);
      if (showNotification) {
        const roleLabel = getRoleLabelExtended(selectedRoleKey).label;
        showNotification(`Hak akses untuk role "${roleLabel}" berhasil disimpan & dipersistensikan!`, 'success');
      }
    } catch (err) {
      console.error('Error saving role permissions:', err);
      if (showNotification) {
        showNotification('Gagal menyimpan perubahan hak akses.', 'error');
      }
    }
  };

  const handleDeleteRole = async (roleKeyToDelete) => {
    if (!ensureDatabaseReadyForWrite('menghapus role')) return;
    try {
      const nextRolePermissions = { ...rolePermissions };
      delete nextRolePermissions[roleKeyToDelete];
      await saveDatabaseNow({ rolePermissions: nextRolePermissions }, 'menghapus role custom');
      if (selectedRoleKey === roleKeyToDelete) setSelectedRoleKey('guru');
      showNotification(`Role kustom berhasil dihapus.`, 'success');
    } catch (err) {
      showNotification('Gagal menghapus role.', 'error');
    } finally {
      setDeleteRoleKey(null);
    }
  };

  const applyPreset = (presetKey) => {
    const next = {};
    Object.keys(ALL_TABS_METADATA).forEach(t => { next[t] = 'nonaktif'; });

    if (presetKey === 'full') {
      Object.keys(ALL_TABS_METADATA).forEach(t => { next[t] = 'edit'; });
      showNotification('Preset Akses Penuh diaktifkan.', 'info');
    } else if (presetKey === 'empty') {
      showNotification('Semua akses dinonaktifkan.', 'info');
    } else if (presetKey === 'kepsek_report') {
      Object.keys(ALL_TABS_METADATA).forEach(t => { next[t] = 'view'; });
      showNotification('Preset Kepala Sekolah (Lihat Semua Laporan) diterapkan.', 'info');
    } else if (presetKey === 'kesiswaan') {
      const editList = [
        'dashboard', 'pesan', 'siswa', 'riwayat_prestasi', 'siswa_keluar', 'kedisiplinan_bpbk',
        'kedisiplinan_piket', 'tatib_skor', 'catatan_walikelas', 'walas_report',
        'absensi', 'absensiguru', 'kedisiplinan_absensi'
      ];
      editList.forEach(t => { next[t] = 'edit'; });
      showNotification('Preset Waka Kesiswaan (Akses Full Kesiswaan) diterapkan.', 'info');
    } else if (presetKey === 'kurikulum') {
      const editList = [
        'dashboard', 'guru', 'data_pegawai', 'kelas', 'jurusan', 'mapel', 'generate',
        'silabus', 'silabusguru', 'modul_ajar', 'jurnal_harian', 'absensiguru'
      ];
      editList.forEach(t => { next[t] = 'edit'; });
      showNotification('Preset Waka Kurikulum (Akses Full Kurikulum) diterapkan.', 'info');
    } else if (presetKey === 'hubin') {
      const editList = [
        'dashboard', 'pesan', 'pkl_dashboard', 'pkl_data_siswa', 'pkl_data_perusahaan',
        'pkl_penugasan', 'pkl_administrasi', 'pkl_jurnal', 'pkl_laporan', 'pkl_absensi_setting'
      ];
      editList.forEach(t => { next[t] = 'edit'; });
      showNotification('Preset Waka Hubin (Akses Full PKL) diterapkan.', 'info');
    } else if (presetKey === 'tu') {
      const editList = [
        'dashboard', 'tampilan', 'siswa', 'siswa_keluar', 'guru', 'data_pegawai', 'karyawan',
        'kelas', 'jurusan', 'absensi', 'absensiguru', 'esurat', 'kartu_pelajar'
      ];
      editList.forEach(t => { next[t] = 'edit'; });
      showNotification('Preset Tata Usaha (Full Administrasi) diterapkan.', 'info');
    } else if (presetKey === 'guru_biasa') {
      next['dashboard'] = 'edit';
      next['silabusguru'] = 'edit';
      next['jurnal_harian'] = 'edit';
      next['absensiguru'] = 'edit';
      next['kedisiplinan_piket'] = 'edit';
      showNotification('Preset Guru Pengajar (KBM & Jurnal) diterapkan.', 'info');
    }

    setLocalPermissions(next);
    setIsModified(true);
  };

  const handleCreateRole = async () => {
    const trimmedName = String(newRoleName || '').trim();
    const trimmedKey = String(newRoleKey || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (!trimmedName) {
      showNotification('Nama role wajib diisi.', 'warning');
      return;
    }
    if (!trimmedKey) {
      showNotification('Kode/Key role wajib diisi.', 'warning');
      return;
    }

    const customRoleKey = `custom_${trimmedKey}`;
    if (rolePermissions && rolePermissions[customRoleKey]) {
      showNotification('Kode role ini sudah digunakan. Gunakan kode lain.', 'warning');
      return;
    }

    setIsCreating(true);

    try {
      let templatePerms = {};
      if (templateRoleKey && rolePermissions && rolePermissions[templateRoleKey]) {
        templatePerms = { ...rolePermissions[templateRoleKey] };
        // Hapus __label dari template agar tidak tercopy
        delete templatePerms.__label;
      }
      templatePerms.__label = trimmedName;

      const nextRolePermissions = {
        ...(rolePermissions || {}),
        [customRoleKey]: templatePerms
      };

      // Update store dulu
      await updateRolePermissions({ [customRoleKey]: templatePerms });
      // Kemudian simpan ke database agar persisten
      await saveDatabaseNow({ rolePermissions: nextRolePermissions }, 'menambah role kustom baru');
      
      setSelectedRoleKey(customRoleKey);
      setCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleKey('');
      showNotification(`Role kustom "${trimmedName}" berhasil dibuat & disimpan!`, 'success');
    } catch (err) {
      console.error('Error creating custom role:', err);
      showNotification('Gagal membuat role baru.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const currentRoleInfo = getRoleLabelExtended(selectedRoleKey);
  const customRoleKeys = Object.keys(rolePermissions || {}).filter(k => k.startsWith('custom_'));

  return (
    <div className="space-y-5 w-full animate-in fade-in duration-200 relative pb-20">
      
      {/* Page Header */}
      <PageHeader
        title="Hak Akses & Matriks Izin"
        description="Atur izin modul menu aplikasi (Bisa Edit, Hanya Lihat, atau Ditutup) untuk masing-masing jabatan/role."
        icon={UserCog}
        tabs={[
          { id: "hak_akses", label: "Hak Akses & Role", icon: ShieldCheck },
          { id: "pengaturanuser", label: "Akun Pengguna", icon: Key },
          { id: "audit_log", label: "Audit Log & Aktivitas", icon: History }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        customButtons={
          <Button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus size={14} /> + Buat Role Kustom Baru
          </Button>
        }
      />

      {/* Guide Banner */}
      <div className="p-4 rounded-[var(--ui-radius-card)] bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[var(--ui-radius-small)] bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Cara Mengatur Hak Akses</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              1. Pilih <strong>Role/Jabatan</strong> yang ingin diedit di bawah. &nbsp;|&nbsp; 
              2. Tentukan status izin pada modul (<strong>Full</strong> = Boleh Edit, <strong>Lihat</strong> = Read Only, <strong>Tutup</strong> = Sembunyi). &nbsp;|&nbsp; 
              3. Klik tombol hijau <strong>"Simpan Hak Akses"</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE: ROLE TABS + MATRIX */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* LEFT COLUMN: ROLE SELECTOR */}
        <div className="w-full lg:w-72 shrink-0 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Daftar Role / Jabatan</span>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              + Role Baru
            </button>
          </div>

          <div className="space-y-4">
            {ROLE_GROUPS.map(grp => (
              <div key={grp.category} className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                  {grp.category}
                </span>
                <div className="space-y-1">
                  {grp.roles.map(r => {
                    const isSelected = selectedRoleKey === r.key;
                    const count = typeof rolePermissions[r.key] === 'object' && rolePermissions[r.key] !== null
                      ? Object.keys(rolePermissions[r.key]).filter(k => k !== '__label' && rolePermissions[r.key][k] && rolePermissions[r.key][k] !== 'nonaktif').length
                      : 0;

                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setSelectedRoleKey(r.key)}
                        className={`w-full text-left px-3 py-2 rounded-[var(--ui-radius-small)] transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--ui-primary)] text-white border-blue-600 shadow-xs font-black'
                            : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs truncate">{r.label}</p>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-500 border border-slate-200'
                        }`}>
                          {count} Menu
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom Roles Category */}
            {customRoleKeys.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block px-1">
                  Role Kustom Tambahan
                </span>
                <div className="space-y-1">
                  {customRoleKeys.map(k => {
                    const isSelected = selectedRoleKey === k;
                    const label = rolePermissions[k]?.__label || k.replace('custom_', '');
                    return (
                      <div key={k} className="relative group">
                        <button
                          type="button"
                          onClick={() => setSelectedRoleKey(k)}
                          className={`w-full text-left px-3 py-2 pr-8 rounded-[var(--ui-radius-small)] transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs font-black'
                              : 'bg-indigo-50/40 hover:bg-indigo-50 text-indigo-900 border-indigo-200/60'
                          }`}
                        >
                          <span className="text-xs truncate">{label}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteRoleKey(k); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Hapus role kustom ini"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PERMISSION MATRIX */}
        <div className="flex-1 w-full space-y-4">
          
          {/* Active Role Bar & Search Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-800">
                  Role Aktif: <span className="text-[var(--ui-primary)]">{currentRoleInfo.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Sesuaikan menu apa saja yang boleh diakses ketika akun dengan role ini login.
              </p>
            </div>

            <div className="relative w-full sm:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama modul..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20 transition-all"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-[var(--ui-radius-card)] p-3.5 shadow-xs space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
              <Sparkles size={14} className="text-amber-500" />
              <span>Preset Cepat (Sekali Klik)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'full', label: 'Centang Full Semua', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                { key: 'kepsek_report', label: 'Kepsek (Lihat Saja)', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' },
                { key: 'kurikulum', label: 'Full Kurikulum', color: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' },
                { key: 'kesiswaan', label: 'Full Kesiswaan', color: 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200' },
                { key: 'hubin', label: 'Full Hubin / PKL', color: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200' },
                { key: 'tu', label: 'Full Tata Usaha', color: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200' },
                { key: 'guru_biasa', label: 'Guru Biasa (KBM)', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200' },
                { key: 'empty', label: 'Tutup / Kosongkan', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' },
              ].map(preset => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyPreset(preset.key)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-[var(--ui-radius-small)] border transition-all cursor-pointer shadow-xs ${preset.color}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Groups Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map(group => (
              <div 
                key={group.key}
                className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs overflow-hidden flex flex-col"
              >
                {/* Category Header */}
                <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${group.color}`} />
                    <span className="font-extrabold text-xs text-slate-800">{group.label}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleToggleGroupLevel(group, 'edit')}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Full All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleToggleGroupLevel(group, 'nonaktif')}
                      className="text-slate-400 hover:underline cursor-pointer"
                    >
                      Tutup All
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-3 space-y-2 flex-1 divide-y divide-slate-100">
                  {group.tabs.map(tab => {
                    const tabInfo = ALL_TABS_METADATA[tab];
                    if (!tabInfo) return null;
                    const currentLevel = getPermissionState(tab);

                    return (
                      <div key={tab} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 truncate">{tabInfo.label}</p>
                          <p className="text-[10px] text-slate-400 truncate">{tabInfo.desc}</p>
                        </div>

                        {/* 3-State Buttons */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-[var(--ui-radius-small)] shrink-0 self-start sm:self-center">
                          {/* Tutup */}
                          <button
                            type="button"
                            onClick={() => setTabPermission(tab, 'nonaktif')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentLevel === 'nonaktif'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <XCircle size={10} /> Tutup
                          </button>

                          {/* Lihat */}
                          <button
                            type="button"
                            onClick={() => setTabPermission(tab, 'view')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentLevel === 'view'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <Eye size={10} /> Lihat
                          </button>

                          {/* Full */}
                          <button
                            type="button"
                            onClick={() => setTabPermission(tab, 'edit')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              currentLevel === 'edit'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <Edit3 size={10} /> Full
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* STICKY SAVE BAR */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-[var(--ui-radius-card)] p-3.5 sm:p-4 flex items-center justify-between fixed bottom-4 right-4 left-4 lg:left-80 shadow-md z-30 transition-all">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${isModified ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="text-xs font-bold text-slate-200">
            {isModified ? "Ada perubahan hak akses yang belum disimpan!" : `Hak akses ${currentRoleInfo.label} tersinkronisasi.`}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isModified && (
            <Button
              variant="outline"
              onClick={() => {
                if (rolePermissions && rolePermissions[selectedRoleKey]) {
                  const saved = rolePermissions[selectedRoleKey];
                  let normalized = {};
                  if (Array.isArray(saved)) {
                    saved.forEach(t => { normalized[t] = 'edit'; });
                  } else {
                    normalized = { ...saved };
                  }
                  setLocalPermissions(normalized);
                }
                setIsModified(false);
              }}
              className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white border-slate-700 bg-slate-800"
            >
              <RotateCcw size={12} /> Batal
            </Button>
          )}

          <Button
            type="button"
            onClick={handleUpdateRole}
            disabled={!isModified}
            className={`px-4 py-1.5 text-xs font-black rounded-[var(--ui-radius-small)] flex items-center gap-1.5 transition-all ${
              isModified 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Save size={13} /> Simpan Hak Akses
          </Button>
        </div>
      </div>

      {/* MODAL: TAMBAH ROLE KUSTOM BARU */}
      {createModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => { setCreateModalOpen(false); setNewRoleName(''); setNewRoleKey(''); }}
          title="Tambah Role Kustom Baru"
        >
          <div className="p-5 space-y-4 max-w-md w-full">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Role / Jabatan Baru
              </label>
              <input
                type="text"
                placeholder="Contoh: Kepala Lab Komputer, Koordinator P5"
                value={newRoleName}
                onChange={e => {
                  setNewRoleName(e.target.value);
                  if (!newRoleKey) {
                    setNewRoleKey(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[var(--ui-primary)]/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Kode Unik Sistem (Key)
              </label>
              <input
                type="text"
                placeholder="Contoh: kepala_lab"
                value={newRoleKey}
                onChange={e => setNewRoleKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-mono font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Sistem akan menyimpan sebagai `custom_{newRoleKey || 'kode'}`</p>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Salin Template Izin Dari
              </label>
              <UISelect
                value={templateRoleKey}
                onChange={e => setTemplateRoleKey(e.target.value)}
                className="w-full text-xs font-bold"
              >
                <option value="guru">Guru Biasa (Pengajar)</option>
                <option value="waka_kurikulum">Waka Kurikulum</option>
                <option value="waka_kesiswaan">Waka Kesiswaan</option>
                <option value="tu">Tata Usaha (TU)</option>
                <option value="kepsek">Kepala Sekolah</option>
              </UISelect>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                disabled={isCreating}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleCreateRole}
                disabled={isCreating}
                className="text-xs font-black gap-1.5"
              >
                {isCreating ? "Membuat..." : "+ Buat Role"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: HAPUS ROLE KUSTOM */}
      {deleteRoleKey && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteRoleKey(null)}
          title="Hapus Role Kustom"
        >
          <div className="p-5 space-y-4 max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">Hapus Role Ini?</h4>
              <p className="text-xs text-slate-600 mt-1">
                Role <strong>{getRoleLabelExtended(deleteRoleKey).label}</strong> akan dihapus permanen dari sistem.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteRoleKey(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => handleDeleteRole(deleteRoleKey)}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Ya, Hapus Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
