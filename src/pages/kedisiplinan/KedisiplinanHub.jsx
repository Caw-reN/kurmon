import { useState, useMemo, useEffect } from 'react';
import { 
  Activity, ClipboardList, ShieldHalf, BarChart3, Calendar, Mail, ShieldCheck,
  PlusCircle, BookOpen, Clock, Users, ArrowRight, Home
} from 'lucide-react';
import PanelPiket from './PanelPiket.jsx';
import RekapKedisiplinan from './RekapKedisiplinan.jsx';
import DashboardBPBK from './DashboardBPBK.jsx';
import JadwalPiket from './JadwalPiket.jsx';
import { PageHeader } from '../../components/monitoring/ui/index.js';
import useAuthStore from '../../store/monitoring/authStore.js';

export default function KedisiplinanHub({
  initialTab = 'ringkasan',
  teachers = [],
  students = [],
  classes = [],
  currentUser,
  rolePermissions,
  getTabPermissionLevel,
  isSuperAdminRole,
  hasPiket = false
}) {
  // 4 Tab Utama: 'ringkasan' | 'piket' | 'bk' | 'rekap'
  const resolveMainTab = (t) => {
    if (t === 'panel' || t === 'jadwal' || t === 'piket') return 'piket';
    if (t === 'konseling' || t === 'surat' || t === 'visit' || t === 'home_visit' || t === 'bk') return 'bk';
    if (t === 'rekap') return 'rekap';
    return 'ringkasan';
  };

  const resolveBkSubTab = (t) => {
    if (t === 'surat') return 'surat';
    if (t === 'visit' || t === 'home_visit') return 'visit';
    return 'konseling';
  };

  const [activeTab, setActiveTab] = useState(() => resolveMainTab(initialTab));
  const [piketSubTab, setPiketSubTab] = useState(() => initialTab === 'jadwal' ? 'jadwal' : 'input');
  const [bkSubTab, setBkSubTab] = useState(() => resolveBkSubTab(initialTab));

  // Sync saat initialTab berubah dari navigasi luar
  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveMainTab(initialTab));
      if (initialTab === 'jadwal' || initialTab === 'panel') {
        setPiketSubTab(initialTab === 'jadwal' ? 'jadwal' : 'input');
      }
      if (initialTab === 'surat' || initialTab === 'konseling' || initialTab === 'visit' || initialTab === 'home_visit') {
        setBkSubTab(resolveBkSubTab(initialTab));
      }
    }
  }, [initialTab]);

  const authUser = useAuthStore(state => state.user);
  const storageSession = useMemo(() => {
    try {
      const raw = localStorage.getItem('school_schedule_session_v1') || sessionStorage.getItem('school_schedule_session_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const user = currentUser || authUser || storageSession || {};
  const rawRole = String(user.role || 'guru').toLowerCase().trim();
  const subrole = String(user.subrole || '').toLowerCase().trim();
  const division = String(user.division || '').toLowerCase().trim();
  const isWalas = Boolean(user.isWalas || user.walasClass || subrole === 'walikelas');

  const isSuperAdmin = rawRole === 'admin' || rawRole === 'superadmin' || rawRole === 'kepsek' || 
    (typeof isSuperAdminRole === 'function' && isSuperAdminRole(rawRole));

  const isKesiswaanTeam = (rawRole === 'waka' && division === 'kesiswaan') || rawRole === 'kesiswaan' ||
    ['bpbk', 'pembina_osis', 'sekretaris_kesiswaan', 'anggota_kesiswaan'].includes(subrole) ||
    rawRole === 'bpbk' || division === 'bk' || division === 'bp/bk' || division === 'bpbk';

  const isBKRole = rawRole === 'bpbk' || subrole === 'bpbk' || division === 'bk' || division === 'bp/bk' || division === 'bpbk';

  const permsPiket = typeof getTabPermissionLevel === 'function' ? getTabPermissionLevel('kedisiplinan_piket') : null;
  const isExplicitlyDeniedPiket = permsPiket === 'nonaktif' || permsPiket === 'none' || permsPiket === 'off';

  // Hak input pelanggaran
  const canInputPelanggaran = useMemo(() => {
    if (isSuperAdmin || isKesiswaanTeam || isBKRole) return true;
    if (isExplicitlyDeniedPiket) return false;
    if (rawRole === 'guru' || isWalas || hasPiket) return true;
    if (permsPiket === 'edit' || permsPiket === 'full' || permsPiket === 'view' || permsPiket === 'otomatis') return true;
    return true;
  }, [rawRole, isWalas, isSuperAdmin, isKesiswaanTeam, isBKRole, isExplicitlyDeniedPiket, permsPiket, hasPiket]);

  // Hak kelola jadwal piket
  const canEditJadwal = useMemo(() => {
    if (isSuperAdmin || isKesiswaanTeam) return true;
    if (permsPiket === 'edit' || permsPiket === 'otomatis') return true;
    return false;
  }, [isSuperAdmin, isKesiswaanTeam, permsPiket]);

  // 4 Tab Utama di Header (Rapi, Bersih, Sangat Mudah Dipahami Orang Awam)
  const tabs = useMemo(() => [
    { id: 'ringkasan', label: 'Ringkasan & EWS', icon: Activity },
    { id: 'piket', label: 'Input Pelanggaran (Piket)', icon: ClipboardList },
    { id: 'bk', label: 'Layanan BK', icon: ShieldHalf },
    { id: 'rekap', label: 'Rekap & Rapor Siswa', icon: BarChart3 }
  ], []);

  return (
    <div className="flex flex-col gap-4 h-full animate-in fade-in duration-300">
      {/* Header Utama Bersih dengan 4 Tab Terpadu */}
      <PageHeader
        title="Bimbingan, Piket & Kedisiplinan"
        icon={ShieldCheck}
        description="Pusat pemantauan kedisiplinan, sistem deteksi dini (EWS), layanan bimbingan konseling, dan jadwal piket harian."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 min-h-0 relative">
        {/* ========================================================== */}
        {/* TAB 1: RINGKASAN & EWS (Dashboard Awal Bersih Tanpa Duplikat) */}
        {/* ========================================================== */}
        {activeTab === 'ringkasan' && (
          <div className="flex flex-col gap-4">
            {/* Konten Dashboard BPBK (Statistik & EWS Langsung Tampil Bersih) */}
            <DashboardBPBK 
              tab="ringkasan" 
              onTabChange={(tabTarget) => {
                if (tabTarget === 'konseling') { setActiveTab('bk'); setBkSubTab('konseling'); }
                else if (tabTarget === 'surat') { setActiveTab('bk'); setBkSubTab('surat'); }
                else if (tabTarget === 'visit' || tabTarget === 'home_visit') { setActiveTab('bk'); setBkSubTab('visit'); }
                else if (tabTarget === 'rekap') { setActiveTab('rekap'); }
              }} 
              teachers={teachers} 
              students={students} 
              classes={classes} 
            />
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: PIKET & PELANGGARAN (Input POS + Jadwal Piket)      */}
        {/* ========================================================== */}
        {activeTab === 'piket' && (
          <div className="flex flex-col gap-4">
            {/* Sub-Tab Pill Switcher */}
            <div className="flex items-center justify-between bg-white p-1.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPiketSubTab('input')}
                  className={`px-3.5 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    piketSubTab === 'input'
                      ? 'bg-[var(--ui-primary)] text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <ClipboardList size={15} />
                  <span>Input Pelanggaran Cepat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPiketSubTab('jadwal')}
                  className={`px-3.5 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    piketSubTab === 'jadwal'
                      ? 'bg-[var(--ui-primary)] text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Calendar size={15} />
                  <span>Jadwal Petugas Piket</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 pr-2 text-xs text-slate-400 font-medium">
                <span>Pencatatan pelanggaran harian & absensi gerbang sekolah</span>
              </div>
            </div>

            {/* Sub-Tab Konten */}
            {piketSubTab === 'input' && (
              <PanelPiket 
                students={students} 
                classes={classes} 
                canEdit={canInputPelanggaran} 
              />
            )}

            {piketSubTab === 'jadwal' && (
              <JadwalPiket 
                teachers={teachers} 
                canEdit={canEditJadwal} 
              />
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: LAYANAN BK (Sesi Konseling + Surat Panggilan + Home Visit) */}
        {/* ========================================================== */}
        {activeTab === 'bk' && (
          <div className="flex flex-col gap-4">
            {/* Sub-Tab Pill Switcher (3 Pilihan Sangat Jelas & User Friendly) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-1.5 rounded-[var(--ui-radius-card)] border border-slate-200/80 shadow-xs gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBkSubTab('konseling')}
                  className={`px-3.5 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    bkSubTab === 'konseling'
                      ? 'bg-[var(--ui-primary)] text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <ShieldHalf size={15} />
                  <span>Sesi Konseling Siswa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBkSubTab('surat')}
                  className={`px-3.5 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    bkSubTab === 'surat'
                      ? 'bg-[var(--ui-primary)] text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Mail size={15} />
                  <span>Surat Panggilan &amp; SP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBkSubTab('visit')}
                  className={`px-3.5 py-2 rounded-[var(--ui-radius-small)] text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    bkSubTab === 'visit'
                      ? 'bg-[var(--ui-primary)] text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Home size={15} />
                  <span>Kunjungan Rumah (Home Visit)</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-2 pr-2 text-xs text-slate-400 font-medium">
                <span>Layanan bimbingan siswa, pemanggilan orang tua &amp; home visit</span>
              </div>
            </div>

            {/* Sub-Tab Konten */}
            {bkSubTab === 'konseling' && (
              <DashboardBPBK 
                tab="konseling" 
                onTabChange={setBkSubTab} 
                teachers={teachers} 
                students={students} 
                classes={classes} 
              />
            )}

            {bkSubTab === 'surat' && (
              <DashboardBPBK 
                tab="surat" 
                onTabChange={setBkSubTab} 
                teachers={teachers} 
                students={students} 
                classes={classes} 
              />
            )}

            {bkSubTab === 'visit' && (
              <DashboardBPBK 
                tab="visit" 
                onTabChange={setBkSubTab} 
                teachers={teachers} 
                students={students} 
                classes={classes} 
              />
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: REKAP SISWA (Skor Kredit & Riwayat Pelanggaran)     */}
        {/* ========================================================== */}
        {activeTab === 'rekap' && (
          <div className="flex flex-col gap-4">
            <RekapKedisiplinan 
              students={students} 
              classes={classes} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
