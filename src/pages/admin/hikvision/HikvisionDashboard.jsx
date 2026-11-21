import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MonitorSmartphone, Users, UserCheck, Briefcase, AlertTriangle, 
  Cpu, RefreshCw, Server, Activity, Clock, X, Zap, ClipboardList, 
  LayoutDashboard, HardDrive, FileText, ChevronRight, CheckCircle2, 
  ShieldCheck, ArrowUpRight, Search, Radio, Wifi, Calendar, Sparkles,
  Settings
} from 'lucide-react';
import { Button, TablePagination, UITimeInput24, UISelect } from '../../../components/ui.jsx';
import useAuthStore from '../../../store/monitoring/authStore';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import HikvisionDevices from './HikvisionDevices.jsx';
import HikvisionStudents from './HikvisionStudents.jsx';

function formatDowntime(offlineSince) {
  if (!offlineSince) return null;
  const start = new Date(offlineSince);
  if (isNaN(start.getTime())) return null;

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - start.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let durationText = '';
  if (diffDays > 0) {
    const remHours = diffHours % 24;
    durationText = remHours > 0 ? `${diffDays} hari ${remHours} jam` : `${diffDays} hari`;
  } else if (diffHours > 0) {
    const remMin = diffMin % 60;
    durationText = remMin > 0 ? `${diffHours} jam ${remMin} mnt` : `${diffHours} jam`;
  } else if (diffMin > 0) {
    durationText = `${diffMin} menit`;
  } else {
    durationText = '< 1 mnt';
  }

  const startTimeStr = start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' WIB';
  const isToday = start.toDateString() === now.toDateString();
  const dateStr = isToday ? '' : start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' ';

  return {
    durationText,
    startTimeFormatted: `${dateStr}${startTimeStr}`.trim()
  };
}

const getAuthToken = () => {
  try {
    const raw = sessionStorage.getItem('school_schedule_session_v1') || localStorage.getItem('school_schedule_session_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.authToken) return parsed.authToken;
    }
  } catch (e) {}
  return localStorage.getItem('token') || '';
};

const authHeaders = (token) => ({
  "Authorization": `Bearer ${token || getAuthToken()}`
});

const DEVICE_TYPE_CONFIG = {
  siswa:    { label: 'Siswa',            color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',   icon: Users },
  guru:     { label: 'Guru',             color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', icon: UserCheck },
  karyawan: { label: 'Karyawan',         color: 'bg-amber-50 text-amber-700 border-amber-200/80',       icon: Briefcase },
  staff:    { label: 'Guru & Karyawan',  color: 'bg-purple-50 text-purple-700 border-purple-200/80',   icon: UserCheck },
};

const DeviceTypeBadge = ({ type }) => {
  const isStaff = ['guru', 'karyawan', 'staff'].includes(type);
  const cfg = isStaff ? DEVICE_TYPE_CONFIG.staff : (DEVICE_TYPE_CONFIG[type] || DEVICE_TYPE_CONFIG.siswa);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.color} shrink-0 leading-tight`}>
      {cfg.label}
    </span>
  );
};

export default function HikvisionDashboard({ 
  activeTab = 'hikvision', 
  setActiveTab, 
  initialSubTab,
  classes = [],
  students = []
}) {
  const defaultTab = initialSubTab 
    ? (initialSubTab === 'devices' || initialSubTab === 'schedule' || initialSubTab === 'reports' ? 'settings' : initialSubTab)
    : (activeTab === 'hikvision_devices' || initialSubTab === 'devices')
      ? 'settings' 
      : (activeTab === 'hikvision_students' || initialSubTab === 'users') 
        ? 'users' 
        : 'overview';

  const [currentSubTab, setCurrentSubTab] = useState(defaultTab);
  const [devices, setDevices] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [activeFilter, setActiveFilter] = useState('semua');
  const [searchLog, setSearchLog] = useState('');

  // Batas Waktu Config State
  const [config, setConfig] = useState({
    masuk_open: "06:00",
    masuk_late: "07:15",
    masuk_close: "11:00",
    pulang_open: "14:00",
    pulang_close: "18:00",
    siswa: { masuk_open: "05:00", masuk_late: "07:15", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "18:00" },
    guru: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "18:00" },
    karyawan: { masuk_open: "05:00", masuk_late: "07:00", masuk_close: "11:00", pulang_open: "15:00", pulang_close: "18:00" }
  });
  const [activeConfigTab, setActiveConfigTab] = useState('siswa');
  const [activeCampusTab, setActiveCampusTab] = useState('kampus_a');
  const [activeDayTab, setActiveDayTab] = useState('jumat');
  const [savingConfig, setSavingConfig] = useState(false);
  const [toast, setToast] = useState(null);

  // Pagination for logs
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const authToken = useAuthStore(state => state.user?.authToken);

  useEffect(() => {
    if (activeTab === 'hikvision_devices') {
      setCurrentSubTab('settings');
    } else if (activeTab === 'hikvision_students') {
      setCurrentSubTab('users');
    }
  }, [activeTab]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hikvision/dashboard", { headers: authHeaders(authToken) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { ok: false }; }
      if (data.ok) {
        setDevices(data.devices || []);
        setRecentLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [authToken]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/hikvision/config", { headers: authHeaders(authToken) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { ok: false }; }
      if (data.ok && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error(err);
    }
  }, [authToken]);

  useEffect(() => {
    fetchData();
    fetchConfig();
  }, [fetchData, fetchConfig]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/hikvision/sync-all", { method: "POST", headers: authHeaders(authToken) });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(res.status >= 500 ? `Koneksi gateway timeout (HTTP ${res.status}). Pastikan mesin absensi terhubung.` : 'Respon server tidak valid.');
      }
      if (data.ok) {
        setSyncMessage({ 
          type: 'success', 
          text: data.message, 
          stats: data.stats,
          unmatched: data.unmatched,
          unmatchedCount: data.unmatchedCount,
          results: data.syncResults 
        });
        showToast(data.message || 'Sinkronisasi berhasil diselesaikan!', 'success');
        fetchData();
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Gagal sinkronisasi data mesin.' });
        showToast(data.error || 'Gagal sinkronisasi.', 'error');
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.message });
      showToast(err.message, 'error');
    }
    setSyncing(false);
  };

  const getCurrentSchedule = () => {
    if (activeCampusTab === 'all') {
      return config[activeConfigTab] || {};
    }
    const campusSched = config.schedules?.[activeCampusTab]?.[activeConfigTab];
    if (campusSched) {
      return campusSched[activeDayTab] || campusSched['regular'] || config[activeConfigTab] || {};
    }
    return config[activeConfigTab] || {};
  };

  const updateCurrentSchedule = (field, value) => {
    if (activeCampusTab === 'all') {
      setConfig(prev => ({
        ...prev,
        [activeConfigTab]: {
          ...(prev[activeConfigTab] || {}),
          [field]: value
        }
      }));
      return;
    }

    setConfig(prev => {
      const prevSchedules = prev.schedules || {};
      const campusObj = prevSchedules[activeCampusTab] || {};
      const roleObj = campusObj[activeConfigTab] || {};
      const dayObj = roleObj[activeDayTab] || { ...(roleObj['regular'] || prev[activeConfigTab] || {}) };

      return {
        ...prev,
        schedules: {
          ...prevSchedules,
          [activeCampusTab]: {
            ...campusObj,
            [activeConfigTab]: {
              ...roleObj,
              [activeDayTab]: {
                ...dayObj,
                [field]: value
              }
            }
          }
        }
      };
    });
  };

  const handleApplyPreset = () => {
    setConfig(prev => ({
      ...prev,
      schedules: {
        ...(prev.schedules || {}),
        kampus_a: {
          siswa: {
            regular: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "16:30" },
            jumat: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "11:50", pulang_close: "16:30" },
            sabtu: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "12:00", pulang_close: "15:00" }
          },
          guru: {
            regular: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "17:00" },
            jumat: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "11:50", pulang_close: "17:00" },
            sabtu: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "12:00", pulang_close: "15:00" }
          },
          karyawan: {
            regular: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "15:00", pulang_close: "17:30" },
            jumat: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "15:00", pulang_close: "17:30" },
            sabtu: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "12:00", pulang_close: "15:00" }
          }
        },
        kampus_b: {
          siswa: {
            regular: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "16:30" },
            jumat: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "15:30", pulang_close: "17:30" },
            sabtu: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "12:00", pulang_close: "15:00" }
          },
          guru: {
            regular: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "14:00", pulang_close: "17:00" },
            jumat: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "15:30", pulang_close: "17:00" },
            sabtu: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "12:00", pulang_close: "15:00" }
          },
          karyawan: {
            regular: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "15:00", pulang_close: "17:30" },
            jumat: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "15:30", pulang_close: "17:30" },
            sabtu: { masuk_open: "05:30", masuk_late: "07:01", masuk_close: "11:00", pulang_open: "12:00", pulang_close: "15:00" }
          }
        }
      }
    }));
    showToast("Jadwal standar (Jumat Kampus A: 11.50, Kampus B: 15.30) berhasil diterapkan.");
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/hikvision/config", {
        method: "POST",
        headers: { ...authHeaders(authToken), 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { ok: false, error: 'Respon server tidak valid' }; }
      if (data.ok) {
        showToast(data.message || "Batas waktu absensi berhasil disimpan!", "success");
      } else {
        showToast(data.error || "Gagal menyimpan batas waktu absensi.", "error");
      }
    } catch (err) {
      showToast("Kesalahan jaringan: " + err.message, "error");
    }
    setSavingConfig(false);
  };

  const onlineDevicesCount = devices.filter(d => d.is_online === true).length;
  const offlineDevicesCount = devices.length - onlineDevicesCount;
  const todayDateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const todayLogsCount = useMemo(() => {
    return recentLogs.filter(log => {
      const logDate = log.timestamp ? String(log.timestamp).slice(0, 10) : '';
      return logDate === todayDateStr;
    }).length;
  }, [recentLogs, todayDateStr]);

  const filteredLogs = useMemo(() => {
    let list = recentLogs;
    if (activeFilter === 'staff') {
      list = list.filter(log => ['guru', 'karyawan', 'staff'].includes(log.true_person_type || log.person_type || log.device_type));
    } else if (activeFilter !== 'semua') {
      list = list.filter(log => (log.true_person_type || log.person_type || log.device_type) === activeFilter);
    }

    if (searchLog.trim()) {
      const q = searchLog.toLowerCase();
      list = list.filter(log => 
        String(log.student_name || '').toLowerCase().includes(q) ||
        String(log.employee_id || '').toLowerCase().includes(q) ||
        String(log.ip_address || '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => new Date(b.timestamp || b.created_at || b.date || 0) - new Date(a.timestamp || a.created_at || a.date || 0));
  }, [recentLogs, activeFilter, searchLog]);

  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const filterOptions = [
    { value: 'semua', label: 'Semua Tipe' },
    { value: 'siswa', label: 'Siswa' },
    { value: 'staff', label: 'Guru & Karyawan' },
  ];

  // MERGED TABS: 3 tabs only as requested by the user
  const DASHBOARD_TABS = [
    { id: 'overview', label: 'Ringkasan & Status', icon: LayoutDashboard },
    { id: 'users', label: 'Data Pengguna & Biometrik', icon: Users },
    { id: 'settings', label: 'Pengaturan & Laporan', icon: Settings },
  ];

  const navigateToTab = (tabId) => {
    setCurrentSubTab(tabId);
    if (setActiveTab) {
      if (tabId === 'settings') setActiveTab('hikvision_devices');
      else if (tabId === 'users') setActiveTab('hikvision_students');
      else setActiveTab('hikvision');
    }
  };

  const navigateToExternalReport = (targetTab) => {
    if (typeof window !== 'undefined' && window.__setActiveTab) {
      window.__setActiveTab(targetTab);
    } else if (setActiveTab) {
      setActiveTab(targetTab);
    } else {
      window.location.hash = `#${targetTab}`;
    }
  };

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 animate-in fade-in duration-300">
      {/* Central Header */}
      <PageHeader 
        compact={true}
        title="Pusat Kontrol & Manajemen Mesin Absensi"
        icon={MonitorSmartphone}
        description="Monitoring telemetri perangkat, status gateway, manajemen mesin fisik, pemetaan biometrik pengguna, dan audit presensi."
        tabs={DASHBOARD_TABS}
        activeTab={currentSubTab}
        onTabChange={navigateToTab}
      >
        <div className="flex items-center gap-1.5">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 font-bold text-xs h-7.5 px-2.5"
            onClick={() => navigateToExternalReport('hikvision_report_siswa')}
          >
            <ClipboardList size={13} className="text-amber-600" />
            <span className="hidden sm:inline">Keterangan Massal</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1.5 text-xs font-bold h-7.5 px-2.5" 
            onClick={fetchData}
            disabled={loading}
            title="Segarkan data status & log"
          >
            <RefreshCw size={12} className={loading ? "animate-spin text-[var(--ui-primary)]" : ""} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
          <Button 
            size="sm" 
            className="flex items-center gap-1.5 text-xs font-bold shadow-2xs h-7.5 px-3" 
            onClick={handleSyncAll} 
            disabled={syncing} 
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> 
            <span>{syncing ? 'Menarik...' : 'Tarik Data Semua'}</span>
          </Button>
        </div>
      </PageHeader>

      {/* Sync Message Alert Banner (Only when active) */}
      {syncMessage && (
        <div className={`p-3 rounded-xl border shadow-2xs text-xs backdrop-blur-sm ${syncMessage.type === 'success' ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900' : 'bg-rose-50/80 border-rose-200/80 text-rose-900'}`}>
          <div className="flex justify-between items-center">
            <p className="font-extrabold">{syncMessage.text}</p>
            <button onClick={() => setSyncMessage(null)} className="p-1 hover:bg-black/5 rounded-full transition-colors border-none cursor-pointer">
              <X size={14} className="opacity-70" />
            </button>
          </div>
          
          {syncMessage.stats && (
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] font-bold text-emerald-800 bg-white/80 p-2 rounded-lg border border-emerald-200/70">
              <span className="flex items-center gap-1"><Users size={12} className="text-emerald-600" /> User Baru: {syncMessage.stats.usersSynced}</span>
              <span className="flex items-center gap-1"><Activity size={12} className="text-emerald-600" /> Log Masuk: {syncMessage.stats.logsPulled}</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" /> Absensi Terproses: {syncMessage.stats.attendanceProcessed}</span>
            </div>
          )}

          {syncMessage.unmatchedCount > 0 && (
            <div className="mt-2 p-2 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-lg text-[11px]">
              <p className="font-black flex items-center gap-1">
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                {syncMessage.unmatchedCount} ID Tidak Dikenali Sistem
              </p>
              <ul className="list-disc pl-4 max-h-20 overflow-auto text-[10.5px] mt-1 space-y-0.5">
                {syncMessage.unmatched.map((u, i) => (
                  <li key={i}>ID: <strong>{u.id}</strong> - {u.name} ({u.device})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: OVERVIEW (RINGKASAN & STATUS) */}
      {currentSubTab === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Ultra-Compact Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* KPI 1 */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 px-3 shadow-2xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <Server size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total Mesin</div>
                <div className="text-sm font-black text-slate-800 leading-tight mt-1 flex items-baseline gap-1.5">
                  <span>{devices.length} Unit</span>
                  <span className="text-[10.5px] font-bold text-emerald-600">({onlineDevicesCount} Online)</span>
                </div>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 px-3 shadow-2xs flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${offlineDevicesCount === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                <Radio size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Jaringan</div>
                <div className="text-xs font-black text-slate-800 leading-tight mt-1 truncate">
                  {offlineDevicesCount === 0 && devices.length > 0 ? (
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600" /> Semua Online
                    </span>
                  ) : devices.length === 0 ? (
                    <span className="text-slate-400">Belum Ada Mesin</span>
                  ) : (
                    <span className="text-rose-700 font-extrabold flex items-center gap-1">
                      <AlertTriangle size={13} className="text-rose-600" /> {offlineDevicesCount} Offline
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 px-3 shadow-2xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Activity size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Scan Hari Ini</div>
                <div className="text-sm font-black text-slate-800 leading-tight mt-1 flex items-baseline gap-1.5">
                  <span>{todayLogsCount} Scan</span>
                  {recentLogs[0]?.timestamp && (
                    <span className="text-[10.5px] text-slate-400 font-normal truncate">
                      ({new Date(recentLogs[0].timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 px-3 shadow-2xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Biometrik</div>
                <div className="text-xs font-extrabold text-slate-800 leading-tight mt-1 truncate">
                  Wajah & Fingerprint
                </div>
              </div>
            </div>
          </div>

          {/* Grid Status Mesin Fisik (Compact Cards) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Server size={14} className="text-[var(--ui-primary)]" />
                  Telemetri Perangkat Mesin ({devices.length} Unit)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigateToTab('settings')}
                className="text-[11px] font-bold text-[var(--ui-primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Kelola Alat</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {loading ? (
                <div className="col-span-full p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/80">
                  <RefreshCw className="animate-spin mx-auto mb-1 text-slate-400" size={14} />
                  <span>Memuat status mesin...</span>
                </div>
              ) : devices.length === 0 ? (
                <div className="col-span-full p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200/80 font-bold">
                  Belum ada perangkat terdaftar.
                </div>
              ) : (
                devices.map(device => {
                  const devSyncRes = syncMessage?.results?.find(r => r.ip === device.ip_address);
                  const isSyncFailed = devSyncRes && (String(devSyncRes.status).toLowerCase().includes('error') || String(devSyncRes.status).toLowerCase().includes('gagal') || String(devSyncRes.status).toLowerCase().includes('fetch failed'));
                  const isOnline = !isSyncFailed && device.is_online === true;
                  const downtime = !isOnline ? formatDowntime(device.offline_since || device.last_seen || (isSyncFailed ? new Date().toISOString() : null)) : null;

                  return (
                    <div 
                      key={device.id} 
                      className={`bg-white rounded-xl border p-2.5 px-3 shadow-2xs flex items-center justify-between gap-2.5 transition-all ${
                        isOnline ? 'border-slate-200/80 hover:border-emerald-300' : 'border-rose-200/80 bg-rose-50/25'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <HardDrive size={13} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-xs text-slate-800 truncate">{device.location}</h4>
                          </div>
                          <div className="text-[10.5px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span>{device.ip_address}</span>
                            <span className="text-[9.5px] text-slate-400 font-sans">p:80</span>
                          </div>
                          {downtime && (
                            <div className="text-[9.5px] text-rose-700 font-bold mt-0.5 truncate">
                              Mati: {downtime.durationText}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <DeviceTypeBadge type={device.device_type || 'siswa'} />
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                            ONLINE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 leading-none">
                            <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                            OFFLINE
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Log Kehadiran Realtime Feed (Compact Table) */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-2.5 px-3.5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <Clock size={14} className="text-[var(--ui-primary)]" />
                  Log Kehadiran Mesin Absensi (Live Feed)
                </h3>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama / NIS..."
                    value={searchLog}
                    onChange={(e) => { setSearchLog(e.target.value); setCurrentPage(1); }}
                    className="pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-[var(--ui-primary)] h-7 w-36 sm:w-44"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {filterOptions.map(opt => (
                    <Button 
                      variant="outline"
                      size="sm"
                      key={opt.value}
                      onClick={() => { setActiveFilter(opt.value); setCurrentPage(1); }}
                      className={`text-[11px] font-bold h-7 px-2 cursor-pointer ${activeFilter === opt.value ? 'bg-[var(--ui-primary)] text-white hover:bg-[var(--ui-primary-hover)] border-transparent' : ''}`}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-white border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold text-[10.5px]">
                  <tr>
                    <th className="px-3 py-2 w-10 text-center">No</th>
                    <th className="px-3 py-2">Waktu Scan</th>
                    <th className="px-3 py-2">Nama Pengguna & ID</th>
                    <th className="px-3 py-2">Perangkat Mesin</th>
                    <th className="px-3 py-2 text-right">Tipe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {loading ? (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-medium">Memuat audit log kehadiran...</td></tr>
                  ) : paginatedLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 text-center text-slate-400 font-bold text-[11px]">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-800 text-xs">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-800 text-xs">{log.student_name || 'Tidak Dikenal'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {log.employee_id}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-700 text-xs">
                          {devices.find(d => d.ip_address === log.ip_address)?.location || 'Mesin Hikvision'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.ip_address}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DeviceTypeBadge type={log.true_person_type || log.person_type || log.device_type || 'siswa'} />
                      </td>
                    </tr>
                  ))}
                  {!loading && paginatedLogs.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-medium">Tidak ada data log yang cocok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
              isLoading={loading}
            />
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DATA PENGGUNA & BIOMETRIK (USERS & BIOMETRICS) */}
      {currentSubTab === 'users' && (
        <div className="animate-in fade-in duration-200">
          <HikvisionStudents 
            embedded={true} 
            classes={classes} 
          />
        </div>
      )}

      {/* SUB-TAB 3: PENGATURAN & LAPORAN (PENGATURAN ALAT, BATAS WAKTU, DAN PUSAT LAPORAN DIGABUNG) */}
      {currentSubTab === 'settings' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* 1. Pengaturan Alat */}
          <HikvisionDevices 
            embedded={true} 
            activeTab="hikvision_devices"
            setActiveTab={setActiveTab} 
          />

          {/* 2. Batas Waktu Absensi */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-3 px-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <Clock size={14} className="text-[var(--ui-primary)]" />
                  Konfigurasi Jadwal & Batas Waktu Absensi
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Atur jam masuk, batas keterlambatan, dan jam buka absen pulang per jenjang dan kampus.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyPreset}
                title="Terapkan jadwal standar Kampus A (Jumat 11.50) & Kampus B (Jumat 15.30)"
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Sparkles size={13} />
                <span>Preset Standar A/B</span>
              </button>
            </div>

            <div className="p-4 space-y-3.5 max-w-4xl">
              {/* Filter toolbar row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
                {/* Step 1: Pilihan Peran */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">1. Kelompok:</label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                    {['siswa', 'guru', 'karyawan'].map(tab => (
                      <button 
                        key={tab}
                        type="button"
                        onClick={() => setActiveConfigTab(tab)}
                        className={`flex-1 py-1 text-xs font-bold capitalize transition-colors text-center cursor-pointer ${
                          activeConfigTab === tab 
                            ? 'bg-[var(--ui-primary)] text-white' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Pilihan Kampus */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">2. Lokasi Kampus:</label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                    {[
                      { id: 'kampus_a', label: 'Kampus A' },
                      { id: 'kampus_b', label: 'Kampus B' },
                      { id: 'all', label: 'Umum' }
                    ].map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveCampusTab(c.id)}
                        className={`flex-1 py-1 text-xs font-bold transition-all text-center cursor-pointer ${
                          activeCampusTab === c.id
                            ? 'bg-slate-800 text-white font-extrabold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3: Pilihan Hari */}
                {activeCampusTab !== 'all' ? (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">3. Hari Operasional:</label>
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
                      {[
                        { id: 'regular', label: 'Sen-Kam' },
                        { id: 'jumat', label: 'Jumat' },
                        { id: 'sabtu', label: 'Sabtu' }
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setActiveDayTab(d.id)}
                          className={`flex-1 py-1 text-xs font-bold transition-all text-center cursor-pointer ${
                            activeDayTab === d.id
                              ? 'bg-emerald-600 text-white font-extrabold'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : <div></div>}
              </div>

              {/* Info Banners */}
              {activeCampusTab === 'kampus_a' && activeDayTab === 'jumat' && (
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-[11px] font-semibold leading-relaxed flex items-center gap-1.5">
                  <Zap size={14} className="text-indigo-600 shrink-0" />
                  <span><strong>Jumat Kampus A:</strong> Absen pulang dibuka pukul <strong>11:50</strong>.</span>
                </div>
              )}
              {activeCampusTab === 'kampus_b' && activeDayTab === 'jumat' && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] font-semibold leading-relaxed flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-600 shrink-0" />
                  <span><strong>Jumat Kampus B:</strong> Absen pulang dibuka pukul <strong>15:30</strong>.</span>
                </div>
              )}

              {/* Jam Masuk & Jam Pulang (Side by side 2-column) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Masuk */}
                <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Absen Masuk (Pagi)</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Buka (24J)</label>
                      <UITimeInput24 
                        placeholder="05:30" 
                        value={getCurrentSchedule()?.masuk_open || ""} 
                        onChange={e => updateCurrentSchedule('masuk_open', e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Terlambat (24J)</label>
                      <UITimeInput24 
                        placeholder="07:01" 
                        value={getCurrentSchedule()?.masuk_late || ""} 
                        onChange={e => updateCurrentSchedule('masuk_late', e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Tutup (24J)</label>
                      <UITimeInput24 
                        placeholder="11:00" 
                        value={getCurrentSchedule()?.masuk_close || ""} 
                        onChange={e => updateCurrentSchedule('masuk_close', e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* Pulang */}
                <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Absen Pulang (Sore)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Buka Pulang (24J)</label>
                      <UITimeInput24 
                        placeholder={activeDayTab === 'jumat' && activeCampusTab === 'kampus_a' ? "11:50" : activeDayTab === 'jumat' && activeCampusTab === 'kampus_b' ? "15:30" : "14:00"} 
                        value={getCurrentSchedule()?.pulang_open || ""} 
                        onChange={e => updateCurrentSchedule('pulang_open', e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Tutup Pulang (24J)</label>
                      <UITimeInput24 
                        placeholder="16:30" 
                        value={getCurrentSchedule()?.pulang_close || ""} 
                        onChange={e => updateCurrentSchedule('pulang_close', e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifikasi Izin / Sakit */}
              <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Notifikasi Izin / Sakit Guru & Karyawan</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Tujuan Notifikasi Telegram / WhatsApp</label>
                    <UISelect 
                      value={config.notify_role || "none"} 
                      onChange={e => setConfig({...config, notify_role: e.target.value})} 
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white focus:border-[var(--ui-primary)] outline-none"
                    >
                      <option value="none">Tidak Ada (none)</option>
                      <option value="kepsek">Kepala Sekolah (kepsek)</option>
                      <option value="waka_kurikulum">Waka Kurikulum (waka_kurikulum)</option>
                      <option value="waka_kesiswaan">Waka Kesiswaan (waka_kesiswaan)</option>
                      <option value="custom">Nomor WhatsApp Kustom</option>
                    </UISelect>
                  </div>
                  {config.notify_role === "custom" && (
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Nomor WhatsApp Penerima</label>
                      <input 
                        type="text" 
                        value={config.notify_custom_phone || ""} 
                        onChange={e => setConfig({...config, notify_custom_phone: e.target.value})} 
                        className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold focus:border-[var(--ui-primary)] outline-none" 
                        placeholder="Contoh: 628123456789"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleSaveConfig} disabled={savingConfig} size="sm" className="px-5 font-bold shadow-2xs">
                {savingConfig ? "Menyimpan..." : "Simpan Batas Waktu"}
              </Button>
            </div>
          </div>

          {/* 3. Pusat Laporan & Rekap */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-2.5">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <FileText size={14} className="text-[var(--ui-primary)]" />
                Pusat Laporan & Matriks Rekap Kehadiran
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Pintasan langsung ke rekapitulasi kehadiran bulanan siswa, guru, dan karyawan.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {/* Presensi Siswa */}
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/70 p-2.5 flex flex-col justify-between gap-2 hover:border-[var(--ui-primary)] transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shrink-0">
                    <Users size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-800 text-xs truncate">Presensi Siswa</h4>
                    <p className="text-[10px] text-slate-400 font-medium truncate">Matriks siswa</p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  onClick={() => navigateToExternalReport('hikvision_report_siswa')}
                  className="w-full font-bold text-[11px] h-6 px-2"
                >
                  <span>Buka</span>
                  <ArrowUpRight size={11} className="ml-1" />
                </Button>
              </div>

              {/* Presensi Guru */}
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/70 p-2.5 flex flex-col justify-between gap-2 hover:border-[var(--ui-primary)] transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0">
                    <UserCheck size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-800 text-xs truncate">Presensi Guru</h4>
                    <p className="text-[10px] text-slate-400 font-medium truncate">Kehadiran guru</p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  onClick={() => navigateToExternalReport('hikvision_report_guru')}
                  className="w-full font-bold text-[11px] h-6 px-2"
                >
                  <span>Buka</span>
                  <ArrowUpRight size={11} className="ml-1" />
                </Button>
              </div>

              {/* Presensi Karyawan */}
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/70 p-2.5 flex flex-col justify-between gap-2 hover:border-[var(--ui-primary)] transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200/80 text-purple-700 flex items-center justify-center shrink-0">
                    <Briefcase size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-800 text-xs truncate">Presensi Staff</h4>
                    <p className="text-[10px] text-slate-400 font-medium truncate">Audit absensi TU</p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  onClick={() => navigateToExternalReport('hikvision_report_karyawan')}
                  className="w-full font-bold text-[11px] h-6 px-2"
                >
                  <span>Buka</span>
                  <ArrowUpRight size={11} className="ml-1" />
                </Button>
              </div>

              {/* Keterangan Massal */}
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/70 p-2.5 flex flex-col justify-between gap-2 hover:border-[var(--ui-primary)] transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
                    <ClipboardList size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-800 text-xs truncate">Ket. Massal</h4>
                    <p className="text-[10px] text-slate-400 font-medium truncate">Dispensasi rombel</p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToExternalReport('hikvision_report_siswa')}
                  className="w-full font-bold text-[11px] h-6 px-2"
                >
                  <span>Buka</span>
                  <ArrowUpRight size={11} className="ml-1" />
                </Button>
              </div>

              {/* Izin & Sakit */}
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/70 p-2.5 flex flex-col justify-between gap-2 hover:border-[var(--ui-primary)] transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200/80 text-sky-700 flex items-center justify-center shrink-0">
                    <ShieldCheck size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-800 text-xs truncate">Izin & Sakit</h4>
                    <p className="text-[10px] text-slate-400 font-medium truncate">Surat izin siswa</p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToExternalReport('kedisiplinan_absensi')}
                  className="w-full font-bold text-[11px] h-6 px-2"
                >
                  <span>Buka</span>
                  <ArrowUpRight size={11} className="ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-3.5 py-2 rounded-xl shadow-md font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
