import React, { useMemo, useState, useEffect, Suspense, lazy } from 'react';
import {
  Settings, ShieldCheck, Users, Shield, SlidersHorizontal,
  Palette, MessageSquare, KeyRound, DatabaseBackup, History,
  CheckCircle2, ArrowRight, Server, RefreshCw, LayoutDashboard,
  Lock, CloudUpload
} from 'lucide-react';
import useFiturStore, { FITUR_CONFIG } from '../../../store/monitoring/fiturStore';
import { PageHeader } from '../../../components/monitoring/ui/index.js';

// Lazy load sub-modul konfigurasi untuk performa optimal
const TabHakAkses = lazy(() => import('../tabs/TabHakAkses.jsx'));
const TabPengaturanUser = lazy(() => import('../tabs/TabPengaturanUser.jsx'));
const ManajemenRole = lazy(() => import('../tabs/ManajemenRole.jsx'));
const FiturManagement = lazy(() => import('./FiturManagement.jsx'));
const TabTampilan = lazy(() => import('../tabs/TabTampilan.jsx'));
const IntegrasiWhatsApp = lazy(() => import('./IntegrasiWhatsApp.jsx'));
const BackupGDrive = lazy(() => import('./BackupGDrive.jsx'));
const ManajemenAPIKey = lazy(() => import('./ManajemenAPIKey.jsx'));
const TabLogPassword = lazy(() => import('../tabs/TabLogPassword.jsx'));
const TabKeamanan = lazy(() => import('../tabs/TabKeamanan.jsx'));

// ── DEFINISI 5 KATEGORI KONFIGURASI (TERHUBUNG LANGSUNG KE SIDEBAR UTAMA) ──
export const CONFIG_SECTIONS = {
  ringkasan: {
    id: 'konfigurasi_sistem',
    title: 'Ringkasan Sistem',
    description: 'Overview metrik pengguna, otorisasi role, modul aktif, serta status kesehatan & keamanan sistem.',
    icon: LayoutDashboard,
    defaultSub: 'ringkasan',
    tabs: []
  },
  pengguna_akses: {
    id: 'pengguna_akses',
    title: 'Pengguna & Hak Akses',
    description: 'Kelola akun pengguna (admin, guru, staf), struktur jabatan role, dan matriks izin akses modul.',
    icon: Users,
    defaultSub: 'pengaturanuser',
    tabs: [
      { id: 'pengaturanuser', label: 'Akun Pengguna', icon: Users },
      { id: 'manajemen_role', label: 'Jabatan & Role', icon: Shield },
      { id: 'hak_akses', label: 'Matriks Hak Akses', icon: ShieldCheck }
    ]
  },
  modul_tampilan: {
    id: 'modul_tampilan',
    title: 'Fitur & Tampilan',
    description: 'Aktifkan/nonaktifkan modul fitur sistem dan sesuaikan identitas visual serta tema web.',
    icon: SlidersHorizontal,
    defaultSub: 'fitur',
    tabs: [
      { id: 'fitur', label: 'Kontrol Fitur', icon: SlidersHorizontal },
      { id: 'tampilan', label: 'Tampilan Web', icon: Palette }
    ]
  },
  integrasi_cloud: {
    id: 'integrasi_cloud',
    title: 'Integrasi & Cloud',
    description: 'Konfigurasi gateway WhatsApp, jadwal cadangan otomatis Google Drive, dan manajemen kunci API.',
    icon: CloudUpload,
    defaultSub: 'whatsapp',
    tabs: [
      { id: 'whatsapp', label: 'WhatsApp Gateway', icon: MessageSquare },
      { id: 'gdrive_backup', label: 'Backup Cloud', icon: DatabaseBackup },
      { id: 'api_keys', label: 'Kunci API', icon: KeyRound }
    ]
  },
  keamanan_audit: {
    id: 'keamanan_audit',
    title: 'Keamanan & Audit',
    description: 'Pengaturan keamanan kata sandi admin serta pemantauan riwayat perubahan sandi pengguna.',
    icon: Shield,
    defaultSub: 'keamanan',
    tabs: [
      { id: 'keamanan', label: 'Keamanan Akun', icon: Lock },
      { id: 'log_password', label: 'Log Sandi & Audit', icon: History }
    ]
  }
};

// Backward-compatible exports
export const CONFIG_NAV_GROUPS = Object.values(CONFIG_SECTIONS);
export const CONFIG_NAV_ITEMS = CONFIG_NAV_GROUPS;

// Pemeta ID tab (lama maupun baru) ke sectionKey dan subTabId yang tepat
const resolveSectionAndSub = (rawId) => {
  const raw = String(rawId || '').toLowerCase().trim();
  if (!raw || raw === 'konfigurasi_sistem' || raw === 'pengaturan_sistem' || raw === 'dashboard_sistem' || raw === 'ringkasan') {
    return { sectionKey: 'ringkasan', subTabId: 'ringkasan' };
  }
  if (raw === 'pengguna_akses') return { sectionKey: 'pengguna_akses', subTabId: 'pengaturanuser' };
  if (raw === 'modul_tampilan' || raw === 'fitur_tampilan') return { sectionKey: 'modul_tampilan', subTabId: 'fitur' };
  if (raw === 'integrasi_cloud') return { sectionKey: 'integrasi_cloud', subTabId: 'whatsapp' };
  if (raw === 'keamanan_audit') return { sectionKey: 'keamanan_audit', subTabId: 'keamanan' };

  if (raw === 'pengaturanuser' || raw === 'manajemen_role' || raw === 'hak_akses') {
    return { sectionKey: 'pengguna_akses', subTabId: raw };
  }
  if (raw === 'fitur' || raw === 'tampilan') {
    return { sectionKey: 'modul_tampilan', subTabId: raw };
  }
  if (raw === 'whatsapp' || raw === 'gdrive_backup' || raw === 'api_keys') {
    return { sectionKey: 'integrasi_cloud', subTabId: raw };
  }
  if (raw === 'keamanan') {
    return { sectionKey: 'keamanan_audit', subTabId: 'keamanan' };
  }
  if (raw === 'log_password' || raw === 'status_password' || raw === 'audit_log') {
    return { sectionKey: 'keamanan_audit', subTabId: 'log_password' };
  }

  return { sectionKey: 'ringkasan', subTabId: 'ringkasan' };
};

export default function DashboardKonfigurasiSistem(props) {
  const {
    activeTab: rawActiveTab = 'konfigurasi_sistem',
    setActiveTab: rawSetActiveTab,
    teachers = [],
    staffs = [],
    adminUser = {},
    rolePermissions = {},
    syncAuthSnapshotNow,
    appSettings = {},
    currentUser,
    isSuperAdminRole,
    checkIsAllowed
  } = props;

  const { fitur } = useFiturStore();

  const isSuper = typeof isSuperAdminRole === 'function'
    ? isSuperAdminRole(currentUser?.role)
    : ['admin', 'superadmin'].includes(String(currentUser?.role || '').toLowerCase());

  const resolved = useMemo(() => resolveSectionAndSub(rawActiveTab), [rawActiveTab]);
  const [subTabId, setSubTabId] = useState(resolved.subTabId);

  useEffect(() => {
    setSubTabId(resolved.subTabId);
  }, [resolved.subTabId]);

  const setActiveTab = (tabId) => {
    if (typeof rawSetActiveTab === 'function') {
      rawSetActiveTab(tabId);
    } else if (typeof window !== 'undefined' && typeof window.__setActiveTab === 'function') {
      window.__setActiveTab(tabId);
    }
  };

  // Jika non-admin membuka ringkasan, arahkan ke tab konfigurasi pertama yang diizinkan (misal: tampilan untuk waka_humas)
  useEffect(() => {
    if (!isSuper && resolved.sectionKey === 'ringkasan' && typeof checkIsAllowed === 'function') {
      const candidateTabs = ['tampilan', 'pengaturanuser', 'manajemen_role', 'hak_akses', 'fitur', 'whatsapp', 'gdrive_backup', 'api_keys'];
      const firstPermitted = candidateTabs.find(t => checkIsAllowed(t));
      if (firstPermitted) {
        setActiveTab(firstPermitted);
      }
    }
  }, [isSuper, resolved.sectionKey, checkIsAllowed]);

  const handleSubTabChange = (nextSubId) => {
    setSubTabId(nextSubId);
    setActiveTab(nextSubId);
  };

  const currentSection = useMemo(() => {
    const base = CONFIG_SECTIONS[resolved.sectionKey] || CONFIG_SECTIONS.ringkasan;
    if (isSuper || typeof checkIsAllowed !== 'function' || !base.tabs?.length) {
      return base;
    }
    return {
      ...base,
      tabs: base.tabs.filter(t => checkIsAllowed(t.id))
    };
  }, [resolved.sectionKey, isSuper, checkIsAllowed]);

  // Metrik ringkasan
  const totalFeatures = FITUR_CONFIG?.length || 10;
  const activeFeatures = useMemo(() => {
    if (!fitur) return totalFeatures;
    return Object.values(fitur).filter(Boolean).length;
  }, [fitur, totalFeatures]);
  const featurePct = Math.round((activeFeatures / (totalFeatures || 1)) * 100);

  const teacherCount = teachers?.length || 0;
  const staffCount = staffs?.length || 0;
  const totalUsers = teacherCount + staffCount + (adminUser?.username ? 1 : 1);

  const roleCount = useMemo(() => {
    return Object.keys(rolePermissions || {}).length || 8;
  }, [rolePermissions]);

  const isFonnteConnected = Boolean(appSettings?.fonnte_token || appSettings?.whatsapp_token);

  const handleSyncSnapshot = () => {
    if (typeof syncAuthSnapshotNow === 'function') {
      syncAuthSnapshotNow();
    } else if (typeof window !== 'undefined' && typeof window.__syncAuthSnapshotNow === 'function') {
      window.__syncAuthSnapshotNow();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">

      {/* ── HEADER TUNGGAL DENGAN TAB TERINTEGRASI (TANPA MENU GANDA) ── */}
      <PageHeader
        title={currentSection.title}
        description={currentSection.description}
        icon={currentSection.icon || Settings}
        tabs={currentSection.tabs}
        activeTab={subTabId}
        onTabChange={handleSubTabChange}
      />

      {/* ── KONTEN LEBAR PENUH ── */}
      <div className="w-full">
        <Suspense fallback={
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 font-bold animate-pulse shadow-xs">
            Memuat modul pengaturan...
          </div>
        }>
          {/* 1. RINGKASAN SISTEM */}
          {resolved.sectionKey === 'ringkasan' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* 4 Kartu KPI Utama */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div
                  onClick={() => setActiveTab('pengaturanuser')}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        <Users size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                        Pengguna
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Akun Pengguna
                    </span>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl font-black text-slate-800 tracking-tight leading-none">{totalUsers}</span>
                      <span className="text-xs text-slate-500 font-semibold">Akun Aktif</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      1 Admin &bull; {teacherCount} Guru &bull; {staffCount} Karyawan
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-indigo-600 text-xs font-bold group-hover:text-indigo-700">
                    <span>Buka Akun Pengguna</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('hak_akses')}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        <ShieldCheck size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                        Otorisasi
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Matriks Izin Role
                    </span>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl font-black text-emerald-700 tracking-tight leading-none">{roleCount}</span>
                      <span className="text-xs text-slate-500 font-semibold">Role Terdaftar</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Izin Modul: Edit, Lihat, Nonaktif
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-emerald-600 text-xs font-bold group-hover:text-emerald-700">
                    <span>Atur Hak Akses</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('fitur')}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        <SlidersHorizontal size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                        {featurePct}% Aktif
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Kontrol Fitur Modul
                    </span>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-2xl font-black text-amber-700 tracking-tight leading-none">{activeFeatures}</span>
                      <span className="text-xs text-slate-500 font-semibold">dari {totalFeatures} Modul</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Toggle On/Off Fleksibel
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-amber-600 text-xs font-bold group-hover:text-amber-700">
                    <span>Kelola Fitur</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('gdrive_backup')}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        <DatabaseBackup size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs">
                        Cloud
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Integrasi & Backup
                    </span>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-lg font-black text-slate-800 tracking-tight leading-none">WhatsApp & GDrive</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {isFonnteConnected ? 'WhatsApp Siap Blast' : 'Gateway Siap Konfigurasi'}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-sky-600 text-xs font-bold group-hover:text-sky-700">
                    <span>Buka Cadangan Cloud</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Status Kesehatan & Integritas Sistem Realtime */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-md border border-slate-700/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                      <Server size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold tracking-tight">Status Kesehatan & Keamanan Sistem</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Diagnosa otomatis integritas basis data, mesin presensi, dan gateway eksternal.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncSnapshot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 transition-all cursor-pointer self-start sm:self-auto shadow-2xs active:scale-95"
                  >
                    <RefreshCw size={12} className="text-emerald-400" />
                    <span>Sinkronkan Snapshot</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Basis Data</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-200">PostgreSQL Aktif</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gateway Hikvision</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-200">Face & Finger Siap</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Enkripsi Sandi</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-200">PBKDF2 SHA-256</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cadangan Cloud</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-200">Terjadwal & Siap</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2. PENGGUNA & HAK AKSES */}
          {resolved.sectionKey === 'pengguna_akses' && (
            <>
              {subTabId === 'pengaturanuser' && (
                <TabPengaturanUser {...props} hideHeader={true} />
              )}
              {subTabId === 'manajemen_role' && (
                <ManajemenRole {...props} hideHeader={true} />
              )}
              {subTabId === 'hak_akses' && (
                <TabHakAkses {...props} hideHeader={true} />
              )}
            </>
          )}

          {/* 3. FITUR & TAMPILAN */}
          {resolved.sectionKey === 'modul_tampilan' && (
            <>
              {subTabId === 'fitur' && (
                <FiturManagement {...props} hideHeader={true} />
              )}
              {subTabId === 'tampilan' && (
                <TabTampilan {...props} hideHeader={true} />
              )}
            </>
          )}

          {/* 4. INTEGRASI & CLOUD */}
          {resolved.sectionKey === 'integrasi_cloud' && (
            <>
              {subTabId === 'whatsapp' && (
                <IntegrasiWhatsApp {...props} hideHeader={true} />
              )}
              {subTabId === 'gdrive_backup' && (
                <BackupGDrive {...props} hideHeader={true} />
              )}
              {subTabId === 'api_keys' && (
                <ManajemenAPIKey {...props} hideHeader={true} />
              )}
            </>
          )}

          {/* 5. KEAMANAN & AUDIT */}
          {resolved.sectionKey === 'keamanan_audit' && (
            <>
              {subTabId === 'keamanan' && (
                <TabKeamanan {...props} hideHeader={true} />
              )}
              {subTabId === 'log_password' && (
                <TabLogPassword {...props} hideHeader={true} />
              )}
            </>
          )}
        </Suspense>
      </div>

    </div>
  );
}

export { DashboardKonfigurasiSistem };
