import { useState, useMemo } from 'react';
import { ClipboardList, Calendar, ShieldCheck } from 'lucide-react';
import JadwalPiket from './JadwalPiket.jsx';
import PanelPiket from './PanelPiket.jsx';
import { PageHeader } from '../../components/monitoring/ui/index.js';

export default function ManajemenPiket({
  teachers = [],
  students = [],
  classes = [],
  currentUser,
  rolePermissions,
  getTabPermissionLevel,
  isSuperAdminRole
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

  // Evaluasi apakah user memiliki hak edit/kelola ke Piket & Pelanggaran
  const canEdit = useMemo(() => {
    // 1. Superadmin / Admin / Kepsek
    if (rawRole === 'admin' || rawRole === 'superadmin' || rawRole === 'kepsek') return true;
    if (typeof isSuperAdminRole === 'function' && isSuperAdminRole(rawRole)) return true;

    // 2. BP/BK, Waka Kesiswaan, Kesiswaan, Pembina OSIS, Tim Kesiswaan
    if ((rawRole === 'waka' && division === 'kesiswaan') || rawRole === 'kesiswaan') return true;
    if (subrole === 'bpbk' || rawRole === 'bpbk' || division === 'bk' || division === 'bp/bk' || division === 'bpbk') return true;
    if (subrole === 'pembina_osis' || subrole === 'sekretaris_kesiswaan' || subrole === 'anggota_kesiswaan') return true;

    // 3. getTabPermissionLevel
    if (typeof getTabPermissionLevel === 'function') {
      const level = getTabPermissionLevel('kedisiplinan_piket');
      if (level === 'edit' || level === 'otomatis') return true;
      if (level === 'view') return false;
    }

    // 4. rolePermissions Matrix
    const SUBROLE_KEYS_ALL = [
      'bpbk', 'pembina_osis', 'sekretaris_osis', 'walikelas',
      'sekretaris_kesiswaan', 'anggota_kesiswaan',
      'sekretaris_kurikulum', 'anggota_kurikulum',
      'sekretaris_hubin', 'anggota_hubin',
      'sekretaris_sarpras', 'anggota_sarpras',
      'sekretaris_tu', 'bendahara',
    ];
    const roleKey = rawRole === 'waka' ? `waka_${division || 'kurikulum'}` : rawRole;
    const effectiveRoleKey = (subrole && SUBROLE_KEYS_ALL.includes(subrole)) ? subrole : roleKey;

    const perms = rolePermissions?.[effectiveRoleKey] || rolePermissions?.[roleKey] || rolePermissions?.[rawRole];
    if (perms) {
      if (Array.isArray(perms)) {
        if (perms.includes('kedisiplinan_piket')) return true;
      } else if (typeof perms === 'object') {
        const p = perms['kedisiplinan_piket'];
        if (p === 'edit' || p === 'otomatis') return true;
        if (p === 'view') return false;
      }
    }

    return true;
  }, [rawRole, subrole, division, isSuperAdminRole, getTabPermissionLevel, rolePermissions]);

  const tabs = [
    { id: 'panel', label: 'Panel Input Pelanggaran', icon: ClipboardList },
    { id: 'jadwal', label: 'Jadwal Piket', icon: Calendar }
  ];

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
        {activeTab === 'panel' && <PanelPiket students={students} classes={classes} canEdit={canEdit} />}
        {activeTab === 'jadwal' && <JadwalPiket teachers={teachers} canEdit={canEdit} />}
      </div>
    </div>
  );
}
