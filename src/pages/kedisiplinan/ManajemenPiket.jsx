import { useState, useMemo } from 'react';
import { ClipboardList, Calendar, ShieldCheck, ShieldAlert, BarChart3 } from 'lucide-react';
import JadwalPiket from './JadwalPiket.jsx';
import PanelPiket from './PanelPiket.jsx';
import RekapKedisiplinan from './RekapKedisiplinan.jsx';
import { PageHeader } from '../../components/monitoring/ui/index.js';

export default function ManajemenPiket({
  teachers = [],
  students = [],
  classes = [],
  currentUser,
  rolePermissions,
  getTabPermissionLevel,
  isSuperAdminRole,
  hasPiket = false
}) {
  const [activeTab, setActiveTab] = useState('panel');

  const storageSession = useMemo(() => {
    try {
      const raw = localStorage.getItem('school_schedule_session_v1') || sessionStorage.getItem('school_schedule_session_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const user = currentUser || storageSession || {};
  const rawRole = String(user.role || 'guru').toLowerCase().trim();
  const subrole = String(user.subrole || '').toLowerCase().trim();
  const division = String(user.division || '').toLowerCase().trim();
  const isWalas = Boolean(user.isWalas || user.walasClass || subrole === 'walikelas');

  const SUBROLE_KEYS_ALL = [
    'bpbk', 'pembina_osis', 'sekretaris_osis', 'walikelas',
    'sekretaris_kesiswaan', 'anggota_kesiswaan',
    'sekretaris_kurikulum', 'anggota_kurikulum',
    'sekretaris_hubin', 'anggota_hubin',
    'sekretaris_sarpras', 'anggota_sarpras',
    'sekretaris_tu', 'bendahara',
  ];
  const roleKey = rawRole === 'waka' ? `waka_${division || 'kurikulum'}` : rawRole;
  let effectiveRoleKey = (subrole && SUBROLE_KEYS_ALL.includes(subrole)) ? subrole : roleKey;
  if (isWalas && rawRole !== 'waka' && rawRole !== 'kepsek' && rawRole !== 'admin' && rawRole !== 'superadmin') {
    effectiveRoleKey = 'walikelas';
  }

  const perms = rolePermissions?.[effectiveRoleKey] || rolePermissions?.[roleKey] || rolePermissions?.[rawRole];
  let permLevel = null;
  if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
    permLevel = perms['kedisiplinan_piket'];
  } else if (typeof getTabPermissionLevel === 'function') {
    permLevel = getTabPermissionLevel('kedisiplinan_piket');
  }

  const isExplicitlyDenied = permLevel === 'nonaktif' || permLevel === 'none' || permLevel === 'off';
  const isSuperAdmin = rawRole === 'admin' || rawRole === 'superadmin' || rawRole === 'kepsek' || (typeof isSuperAdminRole === 'function' && isSuperAdminRole(rawRole));

  const isKesiswaanTeam = (rawRole === 'waka' && division === 'kesiswaan') || rawRole === 'kesiswaan' ||
    ['bpbk', 'pembina_osis', 'sekretaris_kesiswaan', 'anggota_kesiswaan'].includes(subrole) ||
    rawRole === 'bpbk' || division === 'bk' || division === 'bp/bk' || division === 'bpbk';

  // Evaluasi apakah user memiliki hak input pelanggaran di PanelPiket
  // Guru umum, guru piket, wali kelas, tim kesiswaan, atau admin BERHAK menginput pelanggaran siswa selama tidak dinonaktifkan eksplisit
  const canInputPelanggaran = useMemo(() => {
    if (isSuperAdmin || isKesiswaanTeam) return true;
    if (isExplicitlyDenied) return false;

    // Guru umum, wali kelas, atau guru terjadwal piket memiliki hak input pelanggaran
    if (rawRole === 'guru' || isWalas || hasPiket) return true;

    // Perm level edit / otomatis / view (jika dapat melihat modul piket, guru berwenang mencatat)
    if (permLevel === 'edit' || permLevel === 'otomatis' || permLevel === 'view' || permLevel === 'full') return true;
    return false;
  }, [rawRole, isWalas, isSuperAdmin, isKesiswaanTeam, isExplicitlyDenied, permLevel, hasPiket]);

  // Evaluasi hak edit master jadwal piket (khusus admin / koordinator kesiswaan)
  const canEditJadwal = useMemo(() => {
    if (isSuperAdmin || isKesiswaanTeam) return true;
    if (isExplicitlyDenied) return false;
    if (permLevel === 'edit' || permLevel === 'otomatis') return true;
    return false;
  }, [isSuperAdmin, isKesiswaanTeam, isExplicitlyDenied, permLevel]);

  const tabs = [
    { id: 'panel', label: 'Panel Input Pelanggaran', icon: ClipboardList },
    { id: 'rekap', label: 'Rekap & Riwayat Pelanggaran', icon: BarChart3 },
    { id: 'jadwal', label: 'Jadwal Piket', icon: Calendar }
  ];

  if (!isSuperAdmin && isExplicitlyDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 shadow-2xs">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Dibatasi</h2>
        <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
          Role Anda ({isWalas ? 'Wali Kelas' : (user.roleName || rawRole)}) tidak memiliki izin akses ke menu Piket & Pelanggaran sesuai konfigurasi Hak Akses.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full animate-in fade-in duration-300">
      <PageHeader
        title="Piket & Pelanggaran"
        icon={ShieldCheck}
        description="Pusat penanganan kedisiplinan siswa (BP/BK, Kesiswaan & Piket) dan jadwal piket mingguan."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 min-h-0 relative">
        {activeTab === 'panel' && <PanelPiket students={students} classes={classes} canEdit={canInputPelanggaran} />}
        {activeTab === 'rekap' && <RekapKedisiplinan students={students} classes={classes} />}
        {activeTab === 'jadwal' && <JadwalPiket teachers={teachers} canEdit={canEditJadwal} />}
      </div>
    </div>
  );
}
