import { useState, useEffect, useMemo } from'react';
import { ClipboardList, Calendar, ShieldCheck } from'lucide-react';
import JadwalPiket from'./JadwalPiket.jsx';
import PanelPiket from'./PanelPiket.jsx';
import { PageHeader } from'../../components/monitoring/ui/index.js';


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
  const [piketHariIni, setPiketHariIni] = useState(false);
  const [checkingPiket, setCheckingPiket] = useState(true);

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

  const todayName = useMemo(() => {
    const dayIdx = new Date().getDay();
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    return days[dayIdx];
  }, []);

  useEffect(() => {
    const session = storageSession || currentUser;
    const authToken = session?.authToken;
    const myCode = session?.code || session?.id;

    if (authToken && myCode) {
      fetch("/api/kedisiplinan/jadwal", {
        headers: { "Authorization": `Bearer ${authToken}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.ok && Array.isArray(data.data)) {
            let isOnDuty = false;
            data.data.forEach(s => {
              if (String(s.hari).toLowerCase() === todayName.toLowerCase()) {
                let ids = s.guru_ids;
                if (typeof ids === "string") {
                  try { ids = JSON.parse(ids); } catch { /* intentionally ignored */ }
                }
                if (Array.isArray(ids) && ids.some(id => String(id).trim().toLowerCase() === String(myCode).trim().toLowerCase())) {
                  isOnDuty = true;
                }
              }
            });
            setPiketHariIni(isOnDuty);
          }
        })
        .catch(e => console.error(e))
        .finally(() => setCheckingPiket(false));
    } else {
      setCheckingPiket(false);
    }
  }, [todayName, storageSession, currentUser]);

  // Evaluasi apakah user memiliki hak akses penuh (edit/input) ke Piket & Pelanggaran
  const hasFullAccess = useMemo(() => {
    // 1. Superadmin / Admin / Kepsek
    if (rawRole === 'admin' || rawRole === 'superadmin' || rawRole === 'kepsek') return true;
    if (typeof isSuperAdminRole === 'function' && isSuperAdminRole(rawRole)) return true;

    // 2. Waka Kesiswaan / Kesiswaan / BPBK / Pembina OSIS
    if ((rawRole === 'waka' && division === 'kesiswaan') || rawRole === 'kesiswaan') return true;
    if (subrole === 'bpbk' || rawRole === 'bpbk' || division === 'bk' || division === 'bp/bk' || division === 'bpbk') return true;
    if (subrole === 'pembina_osis' || subrole === 'sekretaris_kesiswaan' || subrole === 'anggota_kesiswaan') return true;

    // 3. getTabPermissionLevel
    if (typeof getTabPermissionLevel === 'function') {
      const level = getTabPermissionLevel('kedisiplinan_piket');
      if (level === 'edit' || level === 'otomatis') return true;
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
      }
    }

    // 5. User yang piket hari ini
    if (piketHariIni) return true;

    return false;
  }, [rawRole, subrole, division, isSuperAdminRole, getTabPermissionLevel, rolePermissions, piketHariIni]);

  // Hanya sembunyikan Panel Input jika sama sekali tidak memiliki akses penuh dan tidak sedang piket hari ini
  const showOnlyJadwal = !hasFullAccess && !checkingPiket;

  const tabs = useMemo(() => {
    if (showOnlyJadwal) {
      return [{ id: 'jadwal', label: 'Jadwal Piket', icon: Calendar }];
    }
    return [
      { id: 'panel', label: 'Panel Input', icon: ClipboardList },
      { id: 'jadwal', label: 'Jadwal Piket', icon: Calendar }
    ];
  }, [showOnlyJadwal]);

  return (
    <div className="flex flex-col gap-4 h-full animate-in fade-in duration-300">
      <PageHeader
        title="Piket & Pelanggaran"
        icon={ShieldCheck}
        description={showOnlyJadwal ? "Lihat jadwal piket mingguan sekolah." : "Kelola jadwal guru piket dan input pelanggaran siswa secara cepat."}
        tabs={showOnlyJadwal ? undefined : tabs}
        activeTab={showOnlyJadwal ? 'jadwal' : activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 min-h-0 relative">
        {showOnlyJadwal ? (
          <JadwalPiket teachers={teachers} canEdit={false} />
        ) : (
          <>
            {activeTab === 'panel' && <PanelPiket students={students} classes={classes} />}
            {activeTab === 'jadwal' && <JadwalPiket teachers={teachers} canEdit={hasFullAccess} />}
          </>
        )}
      </div>
    </div>
  );
}
