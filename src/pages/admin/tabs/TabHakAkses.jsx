import { useState, useEffect, useMemo } from 'react';
import { Button, Modal, UISelect } from '../../../components/ui.jsx';
import { UserCog, ShieldCheck, Key, History, Shield, Save, RotateCcw, Search, Sparkles, AlertCircle, Plus, Trash2, CheckCircle2, Eye, Edit3, XCircle } from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { getRoleKeyLabel } from '../../../utils/constants.js';

// ─── Metadata Menu/Tab ────────────────────────────────────────────────────────
const ALL_TABS_METADATA = {
  // Utama
  dashboard: { label: 'Dashboard Utama', desc: 'Halaman dashboard utama ringkasan data' },
  pesan: { label: 'Pusat Pesan', desc: 'Pesan pengumuman di dashboard' },
  tampilan: { label: 'Tampilan Web', desc: 'Pengaturan tema, logo, dan landing page' },

  // Siswa & Bimbingan
  siswa: { label: 'Data Induk Siswa', desc: 'Daftar biodata siswa dan pencarian' },
  riwayat_prestasi: { label: 'Riwayat Prestasi', desc: 'Catatan piagam dan prestasi siswa' },
  siswa_keluar: { label: 'Mutasi Siswa Keluar', desc: 'Daftar alumni dan siswa keluar' },
  kedisiplinan_bpbk: { label: 'Bimbingan Konseling (BK)', desc: 'Konseling siswa bermasalah dan catatan BK' },

  // Kedisiplinan & Piket
  kedisiplinan_piket: { label: 'Piket & Pelanggaran', desc: 'Input poin pelanggaran harian oleh guru piket' },
  tatib_skor: { label: 'Aturan Tatib & Skor', desc: 'Daftar poin pelanggaran/prestasi dan unggah PDF tatib' },
  catatan_walikelas: { label: 'Catatan Wali Kelas', desc: 'Catatan wali kelas mengenai kondisi siswa' },
  walas_report: { label: 'Laporan Wali Kelas', desc: 'Rekapitulasi kelas binaan' },

  // Guru & KBM
  guru: { label: 'Data Guru & Pendidik', desc: 'Daftar guru, kode, dan akun' },
  data_pegawai: { label: 'Data Pegawai', desc: 'Ringkasan beban mengajar guru' },
  karyawan: { label: 'Data Karyawan/Staf', desc: 'Daftar staf TU, tata usaha, dan karyawan umum' },
  kelas: { label: 'Data Kelas', desc: 'Manajemen ruang kelas dan wali kelas' },
  jurusan: { label: 'Data Jurusan', desc: 'Manajemen program keahlian' },
  mapel: { label: 'Mata Pelajaran', desc: 'Manajemen daftar mata pelajaran' },
  generate: { label: 'Jadwal Mengajar', desc: 'Penjadwalan otomatis KBM' },

  // Silabus & Mengajar
  silabus: { label: 'Silabus Akademik Waka', desc: 'Monitoring silabus kurikulum oleh waka' },
  silabusguru: { label: 'Silabus Guru', desc: 'Kelola RPP & silabus mengajar oleh masing-masing guru' },
  modul_ajar: { label: 'Modul Ajar (RPP)', desc: 'Pengaturan silabus terintegrasi' },
  jurnal_harian: { label: 'Jurnal Harian KBM', desc: 'Mengisi jurnal pengajaran harian kelas' },

  // Kehadiran
  absensi: { label: 'Rekap Absensi Fingerprint', desc: 'Rekapitulasi kehadiran finger/mesin sekolah' },
  absensiguru: { label: 'Kehadiran Guru', desc: 'Kehadiran absen mengajar/piket' },
  kedisiplinan_absensi: { label: 'Rekap Kehadiran Siswa', desc: 'Rekap absensi kelas oleh kesiswaan' },

  // Sarpras & Surat
  ruangan: { label: 'Data Ruangan Kelas', desc: 'Manajemen ruang teori & lab praktik' },
  denah: { label: 'Denah Bangunan', desc: 'Pengaturan plot kelas di denah sekolah' },
  esurat: { label: 'Administrasi Surat TU', desc: 'Pembuatan surat keputusan, undangan, dll' },
  kartu_pelajar: { label: 'Cetak Kartu Pelajar', desc: 'Desain dan cetak kartu NISN siswa' },

  // PKL
  pkl_dashboard: { label: 'PKL Dashboard (Monitoring)', desc: 'Ringkasan statistik prakerin' },
  pkl_data_siswa: { label: 'Siswa Prakerin', desc: 'Daftar penempatan PKL siswa' },
  pkl_data_perusahaan: { label: 'Mitra Perusahaan', desc: 'Daftar lokasi industri/DUDI' },
  pkl_penugasan: { label: 'Penugasan Pembimbing', desc: 'Plotting guru pembimbing PKL' },
  pkl_administrasi: { label: 'Dokumen Administrasi', desc: 'Surat jalan, permohonan, dll' },
  pkl_jurnal: { label: 'Jurnal Siswa PKL', desc: 'Monitoring isi jurnal prakerin harian' },
  pkl_laporan: { label: 'Laporan Nilai PKL', desc: 'Rekapitulasi sertifikat dan nilai PKL' },
  pkl_absensi_setting: { label: 'Pengaturan GPS PKL', desc: 'Radius dan jam absen lokasi industri' }
};

const PERMISSION_GROUPS = [
  { key: 'utama', label: 'Utama & Dashboard', color: 'bg-blue-500', tabs: ['dashboard', 'pesan', 'tampilan'] },
  { key: 'siswa', label: 'Siswa & Bimbingan', color: 'bg-emerald-500', tabs: ['siswa', 'riwayat_prestasi', 'siswa_keluar', 'kedisiplinan_bpbk'] },
  { key: 'kedisiplinan', label: 'Kedisiplinan & Piket', color: 'bg-rose-500', tabs: ['kedisiplinan_piket', 'tatib_skor', 'catatan_walikelas', 'walas_report'] },
  { key: 'guru', label: 'Guru & KBM', color: 'bg-amber-500', tabs: ['guru', 'data_pegawai', 'karyawan', 'kelas', 'jurusan', 'mapel', 'generate'] },
  { key: 'silabus', label: 'Silabus & Mengajar', color: 'bg-indigo-500', tabs: ['silabus', 'silabusguru', 'modul_ajar', 'jurnal_harian'] },
  { key: 'absensi', label: 'Absensi & Kehadiran', color: 'bg-teal-500', tabs: ['absensi', 'absensiguru', 'kedisiplinan_absensi'] },
  { key: 'sarpras', label: 'Sarpras & Surat', color: 'bg-cyan-500', tabs: ['ruangan', 'denah', 'esurat', 'kartu_pelajar'] },
  { key: 'pkl', label: 'Prakerin (PKL)', color: 'bg-purple-500', tabs: ['pkl_dashboard', 'pkl_data_siswa', 'pkl_data_perusahaan', 'pkl_penugasan', 'pkl_administrasi', 'pkl_jurnal', 'pkl_laporan', 'pkl_absensi_setting'] }
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
    showNotification
  } = props;

  const [selectedRoleKey, setSelectedRoleKey] = useState('guru');
  const [localPermissions, setLocalPermissions] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create role modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [templateRoleKey, setTemplateRoleKey] = useState('guru');
  const [isCreating, setIsCreating] = useState(false);

  // Delete role confirmation state
  const [deleteRoleKey, setDeleteRoleKey] = useState(null);

  // Preset confirmation state
  const [pendingPreset, setPendingPreset] = useState(null);

  const getRoleLabelExtended = (key) => {
    if (!key) return { label: 'Guru', color: 'bg-emerald-100 text-emerald-800', short: 'Guru' };
    try {
      if (rolePermissions && rolePermissions[key] && rolePermissions[key].__label) {
        return {
          label: rolePermissions[key].__label,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          short: rolePermissions[key].__label
        };
      }
    } catch (e) {
      console.error("Error resolving custom role label:", e);
    }
    return getRoleKeyLabel(key);
  };

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
    const val = localPermissions[tab] || 'nonaktif';
    return val; // 'nonaktif' | 'view' | 'edit'
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
      await updateRolePermissions({
        [selectedRoleKey]: localPermissions
      });
      setIsModified(false);
      if (showNotification) {
        const roleLabel = getRoleLabelExtended(selectedRoleKey).label;
        showNotification(`Hak akses untuk role "${roleLabel}" berhasil diperbarui!`, 'success');
      }
    } catch (err) {
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
      showNotification(`Role berhasil dihapus.`, 'success');
    } catch (err) {
      showNotification('Gagal menghapus role.', 'error');
    } finally {
      setDeleteRoleKey(null);
    }
  };

  const applyPresetConfirmed = (presetKey) => {
    const next = {};
    Object.keys(ALL_TABS_METADATA).forEach(t => { next[t] = 'nonaktif'; });

    if (presetKey === 'full') {
      Object.keys(ALL_TABS_METADATA).forEach(t => { next[t] = 'edit'; });
      showNotification('Preset Akses Penuh diaktifkan.', 'info');
    } else if (presetKey === 'empty') {
      showNotification('Semua akses dinonaktifkan.', 'info');
    } else if (presetKey === 'kepsek_report') {
      const viewList = [
        'dashboard', 'pesan', 'siswa', 'riwayat_prestasi', 'siswa_keluar', 'kedisiplinan_bpbk',
        'kedisiplinan_piket', 'tatib_skor', 'catatan_walikelas', 'walas_report', 'guru',
        'data_pegawai', 'karyawan', 'kelas', 'jurusan', 'mapel', 'generate', 'silabus',
        'silabusguru', 'modul_ajar', 'jurnal_harian', 'absensi', 'absensiguru', 'kedisiplinan_absensi',
        'ruangan', 'denah', 'esurat', 'kartu_pelajar', 'pkl_dashboard', 'pkl_data_siswa',
        'pkl_data_perusahaan', 'pkl_penugasan', 'pkl_administrasi', 'pkl_jurnal', 'pkl_laporan',
        'pkl_absensi_setting'
      ];
      viewList.forEach(t => { next[t] = 'view'; });
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
      showNotification('Preset Tata Usaha (Full Administrasi + Tampilan Web) diterapkan.', 'info');
    } else if (presetKey === 'guru_biasa') {
      next['dashboard'] = 'edit';
      next['silabusguru'] = 'edit';
      next['modul_ajar'] = 'edit';
      next['jurnal_harian'] = 'edit';
      next['absensiguru'] = 'edit';
      next['kedisiplinan_piket'] = 'edit';
      showNotification('Preset Guru Biasa (KBM & Jurnal) diterapkan.', 'info');
    }

    setLocalPermissions(next);
    setIsModified(true);
    setPendingPreset(null);
  };

  const applyPreset = (presetKey) => {
    setPendingPreset(presetKey);
  };

  const handleCreateRole = async () => {
    const trimmedName = String(newRoleName || '').trim();
    const trimmedKey = String(newRoleKey || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (!trimmedName) {
      showNotification('Nama role wajib diisi.', 'warning');
      return;
    }
    if (!trimmedKey) {
      showNotification('Key role wajib diisi.', 'warning');
      return;
    }

    const customRoleKey = `custom_${trimmedKey}`;

    if (rolePermissions && rolePermissions[customRoleKey]) {
      showNotification('Key role ini sudah digunakan.', 'warning');
      return;
    }

    setIsCreating(true);

    try {
      let templatePerms = {};
      if (templateRoleKey && rolePermissions && rolePermissions[templateRoleKey]) {
        templatePerms = { ...rolePermissions[templateRoleKey] };
      }
      
      templatePerms.__label = trimmedName;

      const nextRolePermissions = {
        ...rolePermissions,
        [customRoleKey]: templatePerms
      };

      await updateRolePermissions({ [customRoleKey]: templatePerms });
      await saveDatabaseNow({ rolePermissions: nextRolePermissions }, 'menambah role baru');
      
      setSelectedRoleKey(customRoleKey);
      setCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleKey('');
      showNotification(`Role "${trimmedName}" berhasil dibuat.`, 'success');
    } catch (err) {
      showNotification('Gagal membuat role baru.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const currentRoleInfo = getRoleLabelExtended(selectedRoleKey);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300 relative z-10 pb-20">
      <PageHeader
        title="Manajemen Hak Akses Role (Privilege)"
        description="Atur hak akses baca (Read) dan edit (Write) untuk masing-masing peran/jabatan sekolah."
        icon={UserCog}
        tabs={[
          { id: "hak_akses", label: "Hak Akses & Role", icon: ShieldCheck },
          { id: "pengaturanuser", label: "Akun Pengguna", icon: Key },
          { id: "audit_log", label: "Audit Log & Aktivitas", icon: History }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT COLUMN: Role List Selector */}
        <div className="w-full lg:w-[280px] shrink-0 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Pilih Role / Jabatan
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                Pilih role untuk mengatur izin modul
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="lg:hidden p-2 rounded-[var(--ui-radius-small)] bg-blue-50 text-blue-600 font-black text-xs flex items-center gap-1 cursor-pointer border border-blue-200"
            >
              <Plus size={14} />
              <span>Role Baru</span>
            </button>
          </div>
          
          {/* Scrollable Container (Horizontal on mobile, vertical on desktop) */}
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto max-h-[500px] pb-2 lg:pb-0 pr-1 scrollbar-thin select-none">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="hidden lg:flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[var(--ui-radius-small)] border border-dashed border-blue-300 hover:border-blue-500 text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 transition-all cursor-pointer w-full shadow-xs"
            >
              <Plus size={14} />
              Tambah Role Baru
            </button>

            {Object.keys(rolePermissions || {}).map((roleKey) => {
              const info = getRoleLabelExtended(roleKey);
              const isSelected = selectedRoleKey === roleKey;
              const isCustomRole = roleKey.startsWith('custom_');
              const currentAllowedCount = typeof rolePermissions[roleKey] === 'object' && rolePermissions[roleKey] !== null
                ? Object.keys(rolePermissions[roleKey])
                    .filter(k => k !== '__label' && rolePermissions[roleKey][k] && rolePermissions[roleKey][k] !== 'nonaktif' && rolePermissions[roleKey][k] !== 'none').length
                : 0;

              return (
                <div key={roleKey} className="relative group shrink-0 lg:w-full">
                  <button
                    type="button"
                    onClick={() => setSelectedRoleKey(roleKey)}
                    className={`flex items-center justify-between gap-3 text-left px-3.5 py-2.5 rounded-[var(--ui-radius-small)] transition-all cursor-pointer border w-full ${
                      isSelected
                        ? 'bg-[var(--ui-primary)] text-white border-blue-600 shadow-sm font-black'
                        : 'hover:bg-slate-50 text-slate-700 bg-white border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                      <span className="text-xs font-black truncate">{info.label}</span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-[var(--ui-radius-pill)] shrink-0 ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {currentAllowedCount} Menu
                    </span>
                  </button>

                  {isCustomRole && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteRoleKey(roleKey); }}
                      title="Hapus role ini"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all w-6 h-6 flex items-center justify-center bg-red-50 hover:bg-red-100 text-rose-500 rounded-md border border-red-200"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Permission Cards Workspace */}
        <div className="flex-1 w-full flex flex-col gap-4">
          
          {/* Active Role Status & Real-time Search */}
          <div className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--ui-radius-small)] text-xs font-black uppercase tracking-wider ${currentRoleInfo.color} border border-slate-200/20`}>
                  {currentRoleInfo.label}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  • Atur Akses Modul
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Pilih opsi di tiap modul, lalu klik <strong className="text-blue-600">Update Role</strong> di bawah.
              </p>
            </div>
            
            {/* Real-time search filter */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama modul…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Preset Panel Card */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-[var(--ui-radius-card)] p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600 shrink-0" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Preset Hak Akses Cepat</span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed -mt-1">
              Pilih preset standar di bawah untuk mengisi izin modul secara otomatis:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'kepsek_report', label: 'Kepsek (Lihat Semua Lap.)', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' },
                { key: 'kesiswaan', label: 'Full Kesiswaan', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200' },
                { key: 'kurikulum', label: 'Full Kurikulum', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' },
                { key: 'hubin', label: 'Full Hubin / PKL', color: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' },
                { key: 'tu', label: 'Full Tata Usaha', color: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200' },
                { key: 'guru_biasa', label: 'Guru Biasa', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200' },
                { key: 'full', label: 'Centang Semua', color: 'bg-[var(--ui-primary)] hover:opacity-90 text-white border-blue-600 font-black' },
                { key: 'empty', label: 'Reset (Kosongkan)', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300' }
              ].map(preset => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyPreset(preset.key)}
                  className={`text-[10px] font-extrabold px-3 py-1.5 rounded-[var(--ui-radius-small)] border transition-all cursor-pointer shadow-xs ${preset.color}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permission Group Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.length === 0 ? (
              <div className="col-span-full text-center py-16 text-slate-400 bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs">
                <AlertCircle size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">Tidak ada modul ditemukan</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
              </div>
            ) : (
              filteredGroups.map((group) => {
                return (
                  <div 
                    key={group.key} 
                    className="bg-white border border-slate-200/80 rounded-[var(--ui-radius-card)] shadow-xs overflow-hidden flex flex-col hover:shadow-xs transition-all"
                  >
                    {/* Group Header */}
                    <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${group.color} shrink-0`} />
                        <span className="font-black text-xs text-slate-800 uppercase tracking-wider truncate">
                          {group.label}
                        </span>
                      </div>

                      {/* Quick Bulk Group Toggles */}
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
                          Off All
                        </button>
                      </div>
                    </div>

                    {/* Group Body: Module Row Items */}
                    <div className="p-3.5 space-y-2.5 flex-1 bg-white">
                      {group.tabs.map((tab) => {
                        const tabInfo = ALL_TABS_METADATA[tab];
                        if (!tabInfo) return null;

                        const currentLevel = getPermissionState(tab);

                        return (
                          <div 
                            key={tab} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-[var(--ui-radius-small)] border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-black text-slate-800 block truncate">
                                {tabInfo.label}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                                {tabInfo.desc}
                              </span>
                            </div>
                            
                            {/* Segmented 3-State Radio Buttons */}
                            <div className="flex items-center bg-white border border-slate-200/80 rounded-[var(--ui-radius-small)] p-1 shrink-0 self-start sm:self-center shadow-xs">
                              
                              {/* Nonaktif */}
                              <button
                                type="button"
                                onClick={() => setTabPermission(tab, 'nonaktif')}
                                className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                                  currentLevel === 'nonaktif'
                                    ? 'bg-rose-500 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                                title="Nonaktifkan akses modul ini"
                              >
                                <XCircle size={11} />
                                <span>Tutup</span>
                              </button>

                              {/* Lihat Saja */}
                              <button
                                type="button"
                                onClick={() => setTabPermission(tab, 'view')}
                                className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                                  currentLevel === 'view'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                                title="Hanya dapat melihat data (Read Only)"
                              >
                                <Eye size={11} />
                                <span>Lihat</span>
                              </button>

                              {/* Akses Full / Edit */}
                              <button
                                type="button"
                                onClick={() => setTabPermission(tab, 'edit')}
                                className={`px-2.5 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                                  currentLevel === 'edit'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                                title="Akses penuh tambah, edit, dan hapus"
                              >
                                <Edit3 size={11} />
                                <span>Full</span>
                              </button>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Update Footer */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-[var(--ui-radius-card)] p-4 flex items-center justify-between fixed bottom-4 right-4 left-4 lg:left-[320px] shadow-xs z-30 transition-all">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isModified ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="text-xs font-bold text-slate-200">
                {isModified ? "Ada perubahan hak akses yang belum disimpan!" : "Hak akses role ini tersinkronisasi."}
              </span>
            </div>
            
            <div className="flex items-center gap-2.5 ml-auto">
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
                  className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white border-slate-700 bg-slate-800"
                >
                  <RotateCcw size={13} />
                  Batal
                </Button>
              )}
              
              <Button
                type="button"
                onClick={handleUpdateRole}
                disabled={!isModified}
                className={`px-5 py-2 text-xs font-black rounded-[var(--ui-radius-small)] flex items-center gap-1.5 transition-all ${
                  isModified 
                    ? 'bg-[var(--ui-primary)] hover:opacity-90 text-white shadow-sm shadow-blue-600/30' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Save size={13} />
                Update Role
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* Create Role Modal */}
      {createModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => { setCreateModalOpen(false); setNewRoleName(''); setNewRoleKey(''); }}
          title="Tambah Role / Jabatan Baru"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                Nama Role / Jabatan Baru
              </label>
              <input
                type="text"
                placeholder="Contoh: Kepala Lab Komputer, Laboran RPL"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-semibold focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                Key Kustom (Huruf Kecil & Angka)
              </label>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] px-3 py-2 text-xs font-semibold text-slate-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                <span>custom_</span>
                <input
                  type="text"
                  placeholder="laboran_rpl, kalab_komputer"
                  value={newRoleKey}
                  onChange={e => setNewRoleKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="flex-1 border-none outline-none bg-transparent p-0 text-slate-800 text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                Salin Template Hak Akses Dari
              </label>
              <UISelect
                value={templateRoleKey}
                onChange={e => setTemplateRoleKey(e.target.value)}
                className="w-full text-slate-800"
                placeholder="Pilih Template..."
              >
                {Object.keys(rolePermissions || {}).map(k => (
                  <option key={k} value={k}>{getRoleLabelExtended(k).label}</option>
                ))}
                <option value="">Kosongkan (Nonaktifkan semua)</option>
              </UISelect>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
              <Button
                variant="outline"
                type="button"
                onClick={() => { setCreateModalOpen(false); setNewRoleName(''); setNewRoleKey(''); }}
              >
                Batal
              </Button>
              
              <Button
                type="button"
                onClick={handleCreateRole}
                disabled={isCreating}
                className="bg-[var(--ui-primary)] hover:opacity-90 text-white font-black px-5"
              >
                {isCreating ? 'Membuat...' : 'Buat Role'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Role Confirmation Modal */}
      {deleteRoleKey && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteRoleKey(null)}
          title="Hapus Role Custom?"
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-[var(--ui-radius-small)]">
              <Trash2 size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-red-700">
                  Role <span className="underline">{getRoleLabelExtended(deleteRoleKey).label}</span> akan dihapus permanen.
                </p>
                <p className="text-[10px] text-rose-500 font-semibold mt-1">
                  Aksi ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <Button variant="outline" type="button" onClick={() => setDeleteRoleKey(null)}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => handleDeleteRole(deleteRoleKey)}
                className="bg-rose-600 hover:bg-red-700 text-white font-black px-5"
              >
                Ya, Hapus Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Preset Apply Confirmation Modal */}
      {pendingPreset && (
        <Modal
          isOpen={true}
          onClose={() => setPendingPreset(null)}
          title="Terapkan Preset Hak Akses?"
          maxWidth="max-w-sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-[var(--ui-radius-small)]">
              <Sparkles size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-700">
                  Semua centang hak akses role <span className="underline">{getRoleLabelExtended(selectedRoleKey).label}</span> akan disesuaikan dengan preset.
                </p>
                <p className="text-[10px] text-amber-600 font-semibold mt-1">
                  Perubahan baru tersimpan setelah klik <strong>Update Role</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <Button variant="outline" type="button" onClick={() => setPendingPreset(null)}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => applyPresetConfirmed(pendingPreset)}
                className="bg-[var(--ui-primary)] hover:opacity-90 text-white font-black px-5"
              >
                Ya, Terapkan Preset
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
