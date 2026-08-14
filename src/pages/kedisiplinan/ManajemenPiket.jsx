import { useState, useEffect, useMemo } from'react';
import { ClipboardList, Calendar, ShieldCheck } from'lucide-react';


export default function ManajemenPiket({ teachers = [], students = [], classes = [], currentUser }) {
  const [activeTab, setActiveTab] = useState('panel');
  const [piketHariIni, setPiketHariIni] = useState(false);
  const [checkingPiket, setCheckingPiket] = useState(true);
  const initialRole = currentUser?.role ? String(currentUser.role).toLowerCase() :"guru";
  const [userRole, setUserRole] = useState(initialRole);

  const todayName = useMemo(() => {
    const dayIdx = new Date().getDay();
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    return days[dayIdx];
  }, []);

  useEffect(() => {
    const storageSession = localStorage.getItem('school_schedule_session_v1') || sessionStorage.getItem('school_schedule_session_v1');
    if (storageSession) {
      try {
        const session = JSON.parse(storageSession);
        const authToken = session?.authToken;
        const role = currentUser?.role ? String(currentUser.role).toLowerCase() : (session?.role ? String(session.role).toLowerCase() :"guru");
        setUserRole(role);
        
        if (authToken) {
          fetch("/api/kedisiplinan/jadwal", {
            headers: {"Authorization": `Bearer ${authToken}` }
          })
          .then(r => r.json())
          .then(data => {
            if (data.ok && Array.isArray(data.data)) {
              const myCode = session?.code || session?.id;
              if (myCode) {
                let isOnDuty = false;
                data.data.forEach(s => {
                  if (String(s.hari).toLowerCase() === todayName.toLowerCase()) {
                    let ids = s.guru_ids;
                    if (typeof ids ==="string") {
                      try { ids = JSON.parse(ids); } catch { /* intentionally ignored */ }
                    }
                    if (Array.isArray(ids) && ids.some(id => String(id).trim().toLowerCase() === String(myCode).trim().toLowerCase())) {
                      isOnDuty = true;
                    }
                  }
                });
                setPiketHariIni(isOnDuty);
                if (role ==='guru') {
                  setActiveTab(isOnDuty ?'panel' :'jadwal');
                }
              }
            }
          })
          .catch(e => console.error(e))
          .finally(() => setCheckingPiket(false));
        } else {
          setCheckingPiket(false);
        }
      } catch (e) {
        console.error(e);
        setCheckingPiket(false);
      }
    } else {
      if (currentUser?.role) setUserRole(String(currentUser.role).toLowerCase());
      setCheckingPiket(false);
    }
  }, [todayName]);

  const isGuru = userRole ==='guru';
  const showOnlyJadwal = isGuru && !piketHariIni && !checkingPiket;

  const tabs = useMemo(() => {
    if (showOnlyJadwal) {
      return [{ id:'jadwal', label:'Jadwal Piket', icon: Calendar }];
    }
    return [
      { id:'panel', label:'Panel Input', icon: ClipboardList },
      { id:'jadwal', label:'Jadwal Piket', icon: Calendar }
    ];
  }, [showOnlyJadwal]);

  return (
    <div className="flex flex-col gap-4 h-full animate-in fade-in duration-300">
      <PageHeader
        title="Piket & Pelanggaran"
        icon={ShieldCheck}
        description={showOnlyJadwal ?"Lihat jadwal piket mingguan sekolah." :"Kelola jadwal guru piket dan input pelanggaran siswa secara cepat."}
        tabs={showOnlyJadwal ? undefined : tabs}
        activeTab={showOnlyJadwal ?'jadwal' : activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 min-h-0 relative">
        {showOnlyJadwal ? (
          <JadwalPiket teachers={teachers} />
        ) : (
          <>
            {activeTab ==='panel' && <PanelPiket students={students} classes={classes} />}
            {activeTab ==='jadwal' && <JadwalPiket teachers={teachers} />}
          </>
        )}
      </div>
    </div>
  );
}
