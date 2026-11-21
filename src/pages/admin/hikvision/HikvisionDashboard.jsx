import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MonitorSmartphone, Users, UserCheck, Briefcase, AlertTriangle, 
  Cpu, RefreshCw, Server, Activity, Clock, X, Zap, ClipboardList, 
  LayoutDashboard, HardDrive, FileText, ChevronRight, CheckCircle2, 
  ShieldCheck, ArrowUpRight, Search, Radio, Wifi, Calendar, Sparkles
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
    durationText = 'Baru saja (< 1 mnt)';
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
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
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
  // Determine subTab based on router activeTab or initialSubTab
  const defaultTab = initialSubTab 
    ? initialSubTab 
    : activeTab === 'hikvision_devices' 
      ? 'devices' 
      : activeTab === 'hikvision_students' 
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

  // Sync subTab if router changes activeTab externally
  useEffect(() => {
    if (activeTab === 'hikvision_devices') {
      setCurrentSubTab('devices');
    } else if (activeTab === 'hikvision_students') {
      setCurrentSubTab('users');
    } else if (activeTab === 'hikvision' && !initialSubTab) {
      // keep currentSubTab or default to overview
    }
  }, [activeTab, initialSubTab]);

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

  // KPI Calculations
  const onlineDevicesCount = devices.filter(d => d.is_online === true).length;
  const offlineDevicesCount = devices.length - onlineDevicesCount;
  const todayDateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const todayLogsCount = useMemo(() => {
    return recentLogs.filter(log => {
      const logDate = log.timestamp ? String(log.timestamp).slice(0, 10) : '';
      return logDate === todayDateStr;
    }).length;
  }, [recentLogs, todayDateStr]);

  // Filtered Logs
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

  const DASHBOARD_TABS = [
    { id: 'overview', label: 'Ringkasan & Status', icon: LayoutDashboard },
    { id: 'devices', label: 'Pengaturan Alat', icon: HardDrive },
    { id: 'users', label: 'Data Pengguna & Biometrik', icon: Users },
    { id: 'schedule', label: 'Batas Waktu Absensi', icon: Clock },
    { id: 'reports', label: 'Pusat Laporan & Rekap', icon: FileText },
  ];

  const navigateToTab = (tabId) => {
    setCurrentSubTab(tabId);
    if (setActiveTab) {
      if (tabId === 'devices') setActiveTab('hikvision_devices');
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Central Header */}
      <PageHeader 
        title="Pusat Kontrol & Manajemen Mesin Absensi"
        icon={MonitorSmartphone}
        description="Monitoring telemetri perangkat, status gateway, manajemen mesin fisik, pemetaan biometrik pengguna, dan audit presensi."
        tabs={DASHBOARD_TABS}
        activeTab={currentSubTab}
        onTabChange={navigateToTab}
      >
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 border-amber-300 text-amber-800 hover:bg-amber-50 font-bold"
            onClick={() => navigateToExternalReport('hikvision_report_siswa')}
          >
            <ClipboardList size={15} className="text-amber-600" />
            <span className="hidden sm:inline">Keterangan Massal</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2" 
            onClick={fetchData}
            disabled={loading}
            title="Segarkan data status & log"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[var(--ui-primary)]" : ""} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
          <Button 
            size="sm" 
            className="flex items-center gap-2 shadow-xs" 
            onClick={handleSyncAll} 
            disabled={syncing} 
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> 
            <span>{syncing ? 'Menarik Log...' : 'Tarik Data Semua'}</span>
          </Button>
        </div>
      </PageHeader>

      {/* Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Mesin Terhubung */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Mesin</span>
            <div className="text-2xl font-black text-slate-800 mt-0.5 flex items-baseline gap-2">
              <span>{devices.length}</span>
              <span className="text-xs font-bold text-slate-500">Unit</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {onlineDevicesCount} Online
              </span>
              {offlineDevicesCount > 0 && (
                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {offlineDevicesCount} Offline
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200/80 shrink-0">
            <Server size={24} />
          </div>
        </div>

        {/* KPI 2: Status Konektivitas */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Konektivitas Jaringan</span>
            <div className="text-lg font-black text-slate-800 mt-1 flex items-center gap-2">
              {offlineDevicesCount === 0 && devices.length > 0 ? (
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  Semua Terhubung
                </span>
              ) : devices.length === 0 ? (
                <span className="text-slate-400">Belum Ada Mesin</span>
              ) : (
                <span className="text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle size={18} className="text-rose-600" />
                  {offlineDevicesCount} Mesin Terputus
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Protokol ISAPI TCP/IP Port 80
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200/80 shrink-0">
            <Radio size={24} />
          </div>
        </div>

        {/* KPI 3: Scan Kehadiran Hari Ini */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tap Scan Hari Ini</span>
            <div className="text-2xl font-black text-slate-800 mt-0.5 flex items-baseline gap-2">
              <span>{todayLogsCount}</span>
              <span className="text-xs font-bold text-slate-500">Scan</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5 truncate max-w-[170px]">
              {recentLogs[0]?.timestamp ? `Terakhir: ${new Date(recentLogs[0].timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : 'Belum ada log hari ini'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-200/80 shrink-0">
            <Activity size={24} />
          </div>
        </div>

        {/* KPI 4: Standar Integritas Biometrik */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Integritas Biometrik</span>
            <div className="text-sm font-extrabold text-slate-800 mt-1">
              Wajah & Sidik Jari
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
              <span>Anti-Titip Kartu Aktif</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-200/80 shrink-0">
            <Cpu size={24} />
          </div>
        </div>
      </div>

      {/* Sync Message Alert Banner */}
      {syncMessage && (
        <div className={`p-4 rounded-xl border shadow-xs backdrop-blur-sm ${syncMessage.type === 'success' ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900' : 'bg-rose-50/80 border-rose-200/80 text-rose-900'}`}>
          <div className="flex justify-between items-start">
            <p className="font-extrabold text-sm">{syncMessage.text}</p>
            <button onClick={() => setSyncMessage(null)} className="flex items-center justify-center p-1 hover:bg-black/5 rounded-full transition-colors border-none cursor-pointer">
              <X size={16} className="opacity-70" />
            </button>
          </div>
          
          {syncMessage.stats && (
            <div className="flex flex-wrap gap-4 mt-2.5 text-xs font-bold text-emerald-800 bg-white/80 p-3 rounded-lg border border-emerald-200/70">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-emerald-600" /> User Baru: {syncMessage.stats.usersSynced}
              </span>
              <span className="flex items-center gap-1.5">
                <Activity size={14} className="text-emerald-600" /> Log Masuk: {syncMessage.stats.logsPulled}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" /> Absensi Terproses: {syncMessage.stats.attendanceProcessed}
              </span>
            </div>
          )}

          {syncMessage.unmatchedCount > 0 && (
            <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-lg text-xs">
              <p className="font-black flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                Peringatan: {syncMessage.unmatchedCount} ID Tidak Dikenali Sistem
              </p>
              <p className="mb-2 opacity-85 font-medium mt-0.5">ID pada mesin tidak ditemukan di database Siswa/Guru/Karyawan, log diabaikan.</p>
              <ul className="list-disc pl-5 max-h-28 overflow-auto text-[11px] space-y-0.5">
                {syncMessage.unmatched.map((u, i) => (
                  <li key={i}>ID Mesin: <strong>{u.id}</strong> - Nama: {u.name} (Tipe: {u.type}, Alat: {u.device})</li>
                ))}
              </ul>
            </div>
          )}

          {syncMessage.results && (
            <div className="mt-3 space-y-2">
              <ul className="list-disc list-inside text-xs space-y-1 bg-white/80 p-2.5 rounded-lg border border-slate-200/80">
                {syncMessage.results.map((res, i) => {
                  const isFailed = String(res.status).toLowerCase().includes('fetch failed') || String(res.status).toLowerCase().includes('error');
                  return (
                    <li key={i} className={isFailed ? "text-rose-700 font-semibold" : "text-emerald-700 font-semibold"}>
                      <span className="font-bold">{res.ip}</span>: {isFailed ? `Gagal Terhubung (${res.status})` : res.status}
                      {res.logs_saved !== undefined && ` (${res.logs_saved} tersimpan)`}
                    </li>
                  );
                })}
              </ul>

              {syncMessage.results.some(r => String(r.status).toLowerCase().includes('fetch failed')) && (
                <div className="p-3 bg-rose-50/90 border border-rose-200 text-rose-900 rounded-lg text-xs space-y-1.5">
                  <p className="font-black flex items-center gap-1.5">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                    Penyebab Utama "Error: fetch failed":
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 font-semibold text-[11px] text-rose-800">
                    <li><strong>Beda Jaringan (LAN/WiFi):</strong> Server aplikasi tidak berada dalam 1 router/jaringan lokal yang sama dengan IP mesin.</li>
                    <li><strong>Mesin Mati / Kabel LAN Terlepas:</strong> Mesin fingerprint dalam keadaan mati atau kabel jaringan terlepas.</li>
                    <li><strong>IP Address Berubah:</strong> IP mesin di jaringan berubah. Cek IP aktif pada layar menu mesin dan perbarui di tab <em>Pengaturan Alat</em>.</li>
                    <li><strong>Firewall Router:</strong> Port ISAPI (80 / 8000) terblokir oleh router sekolah.</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: OVERVIEW (RINGKASAN & STATUS) */}
      {currentSubTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Grid Status Mesin Fisik */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Server size={16} className="text-[var(--ui-primary)]" />
                  Telemetri Status Perangkat Mesin
                </h3>
                <p className="text-xs text-slate-500 font-medium">Status kesehatan jaringan dan respon ping mesin absensi secara real-time.</p>
              </div>
              <button
                type="button"
                onClick={() => navigateToTab('devices')}
                className="text-xs font-bold text-[var(--ui-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Kelola Alat</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200/80">
                  <RefreshCw className="animate-spin mx-auto mb-2 text-slate-400" />
                  <span>Memuat daftar mesin...</span>
                </div>
              ) : devices.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200/80 font-bold">
                  Belum ada perangkat terdaftar. Silakan tambahkan mesin di tab Pengaturan Alat.
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
                      className={`bg-white rounded-xl border p-4 shadow-xs flex flex-col justify-between transition-all ${
                        isOnline ? 'border-slate-200/80 hover:border-emerald-300' : 'border-rose-200/80 bg-rose-50/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              <HardDrive size={16} />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 leading-snug">{device.location}</h4>
                              <div className="text-[11px] font-mono text-slate-500 mt-0.5">{device.ip_address}</div>
                            </div>
                          </div>
                          <DeviceTypeBadge type={device.device_type || 'siswa'} />
                        </div>

                        {/* Status Bar */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-bold">Status:</span>
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              ONLINE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              {isSyncFailed ? "GAGAL TERHUBUNG" : "OFFLINE"}
                            </span>
                          )}
                        </div>

                        {/* Downtime Info */}
                        {downtime && (
                          <div className="mt-2.5 p-2 rounded-lg bg-rose-50/80 border border-rose-200/70 text-[11px] text-rose-800 font-medium space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Clock size={11} className="text-rose-500 shrink-0" />
                              <span>Mati sejak: <strong>{downtime.startTimeFormatted}</strong></span>
                            </div>
                            <div className="pl-3.5">
                              <span>Durasi: <strong>{downtime.durationText}</strong></span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">Port 80 (ISAPI)</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs font-bold text-slate-600 hover:text-[var(--ui-primary)]"
                          onClick={() => navigateToTab('devices')}
                        >
                          Kelola Alat
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Log Kehadiran Realtime Feed */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Clock size={16} className="text-[var(--ui-primary)]" />
                  Log Kehadiran Mesin Absensi (Real-Time Feed)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Audit data scan masuk & pulang dari seluruh mesin biometrik yang terpasang.
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama / NIS..."
                    value={searchLog}
                    onChange={(e) => { setSearchLog(e.target.value); setCurrentPage(1); }}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-[var(--ui-primary)]"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {filterOptions.map(opt => (
                    <Button 
                      variant="outline"
                      size="sm"
                      key={opt.value}
                      onClick={() => { setActiveFilter(opt.value); setCurrentPage(1); }}
                      className={`text-xs font-bold cursor-pointer ${activeFilter === opt.value ? 'bg-[var(--ui-primary)] text-white hover:bg-[var(--ui-primary-hover)] border-transparent' : ''}`}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-white border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-3 py-3 w-12 text-center">No</th>
                    <th className="px-4 py-3">Waktu Scan</th>
                    <th className="px-4 py-3">Nama Pengguna & ID</th>
                    <th className="px-4 py-3">Perangkat Mesin</th>
                    <th className="px-4 py-3 text-right">Tipe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Memuat audit log kehadiran...</td></tr>
                  ) : paginatedLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-3 text-center text-slate-400 font-bold">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.timestamp).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-800">{log.student_name || 'Tidak Dikenal'}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIS/ID: {log.employee_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-700">
                          {devices.find(d => d.ip_address === log.ip_address)?.location || 'Mesin Hikvision'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.ip_address}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeviceTypeBadge type={log.true_person_type || log.person_type || log.device_type || 'siswa'} />
                      </td>
                    </tr>
                  ))}
                  {!loading && paginatedLogs.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Tidak ada data log yang cocok.</td></tr>
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

      {/* SUB-TAB 2: PENGATURAN ALAT (DEVICES MANAGEMENT) */}
      {currentSubTab === 'devices' && (
        <div className="animate-in fade-in duration-200">
          <HikvisionDevices 
            embedded={true} 
            activeTab="hikvision_devices"
            setActiveTab={setActiveTab} 
          />
        </div>
      )}

      {/* SUB-TAB 3: DATA PENGGUNA & BIOMETRIK (USERS & BIOMETRICS) */}
      {currentSubTab === 'users' && (
        <div className="animate-in fade-in duration-200">
          <HikvisionStudents 
            embedded={true} 
            classes={classes} 
          />
        </div>
      )}

      {/* SUB-TAB 4: BATAS WAKTU ABSENSI (SCHEDULE & CONFIG) */}
      {currentSubTab === 'schedule' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden animate-in fade-in duration-200">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Clock size={16} className="text-[var(--ui-primary)]" />
                Konfigurasi Jadwal & Batas Waktu Absensi
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Atur jam masuk, toleransi keterlambatan, dan jam buka absen pulang per jenjang dan kampus.
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplyPreset}
              title="Terapkan jadwal standar Kampus A (Jumat 11.50) & Kampus B (Jumat 15.30)"
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Sparkles size={14} />
              <span>Terapkan Preset Standar A/B</span>
            </button>
          </div>

          <div className="p-5 space-y-5 max-w-4xl">
            {/* Step 1: Pilihan Peran */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">1. Pilih Kelompok Pengguna:</label>
              <div className="flex border-b border-slate-200 gap-4">
                {['siswa', 'guru', 'karyawan'].map(tab => (
                  <button 
                    key={tab}
                    type="button"
                    onClick={() => setActiveConfigTab(tab)}
                    className={`pb-2.5 text-xs font-black capitalize transition-colors border-b-2 bg-transparent cursor-pointer flex items-center gap-1.5 ${
                      activeConfigTab === tab 
                        ? 'border-[var(--ui-primary)] text-[var(--ui-primary)]' 
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab === 'siswa' && <Users size={14} />}
                    {tab === 'guru' && <UserCheck size={14} />}
                    {tab === 'karyawan' && <Briefcase size={14} />}
                    <span>{tab}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Pilihan Kampus */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">2. Pilih Lokasi Kampus:</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80 max-w-md">
                {[
                  { id: 'kampus_a', label: 'Kampus A' },
                  { id: 'kampus_b', label: 'Kampus B' },
                  { id: 'all', label: 'Semua / Umum' }
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCampusTab(c.id)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      activeCampusTab === c.id
                        ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Pilihan Hari */}
            {activeCampusTab !== 'all' && (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">3. Pilih Hari Operasional:</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80 max-w-md">
                  {[
                    { id: 'regular', label: 'Senin - Kamis' },
                    { id: 'jumat', label: 'Jumat' },
                    { id: 'sabtu', label: 'Sabtu' }
                  ].map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setActiveDayTab(d.id)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        activeDayTab === d.id
                          ? 'bg-[var(--ui-primary)] text-white font-extrabold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 bg-transparent'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info Banners */}
            {activeCampusTab === 'kampus_a' && activeDayTab === 'jumat' && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-xs font-semibold leading-relaxed flex items-center gap-2">
                <Zap size={16} className="text-indigo-600 shrink-0" />
                <span><strong>Aturan Jumat Kampus A:</strong> Jam buka absen pulang disetel pukul <strong>11:50</strong>. Tap siswa mulai 11:50 otomatis tercatat sebagai absen Pulang.</span>
              </div>
            )}
            {activeCampusTab === 'kampus_b' && activeDayTab === 'jumat' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold leading-relaxed flex items-center gap-2">
                <Zap size={16} className="text-amber-600 shrink-0" />
                <span><strong>Aturan Jumat Kampus B:</strong> Jam buka absen pulang disetel pukul <strong>15:30</strong>.</span>
              </div>
            )}

            {/* Jam Masuk Form */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider block">Absen Masuk (Pagi)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-bold block mb-1">Buka Presensi (24J)</label>
                  <UITimeInput24 
                    placeholder="05:30" 
                    value={getCurrentSchedule()?.masuk_open || ""} 
                    onChange={e => updateCurrentSchedule('masuk_open', e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-bold block mb-1">Batas Terlambat (24J)</label>
                  <UITimeInput24 
                    placeholder="07:01" 
                    value={getCurrentSchedule()?.masuk_late || ""} 
                    onChange={e => updateCurrentSchedule('masuk_late', e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-bold block mb-1">Tutup Presensi (24J)</label>
                  <UITimeInput24 
                    placeholder="11:00" 
                    value={getCurrentSchedule()?.masuk_close || ""} 
                    onChange={e => updateCurrentSchedule('masuk_close', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Jam Pulang Form */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider block">Absen Pulang (Sore)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-bold block mb-1">Buka Presensi Pulang (24J)</label>
                  <UITimeInput24 
                    placeholder={activeDayTab === 'jumat' && activeCampusTab === 'kampus_a' ? "11:50" : activeDayTab === 'jumat' && activeCampusTab === 'kampus_b' ? "15:30" : "14:00"} 
                    value={getCurrentSchedule()?.pulang_open || ""} 
                    onChange={e => updateCurrentSchedule('pulang_open', e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-bold block mb-1">Tutup Presensi Pulang (24J)</label>
                  <UITimeInput24 
                    placeholder="16:30" 
                    value={getCurrentSchedule()?.pulang_close || ""} 
                    onChange={e => updateCurrentSchedule('pulang_close', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Notifikasi Izin & Sakit Form */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider block">Notifikasi Izin / Sakit Guru & Karyawan</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-bold block mb-1">Tujuan Notifikasi Telegram / WhatsApp</label>
                  <UISelect 
                    value={config.notify_role || "none"} 
                    onChange={e => setConfig({...config, notify_role: e.target.value})} 
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none"
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
                    <label className="text-[11px] text-slate-500 font-bold block mb-1">Nomor WhatsApp Penerima</label>
                    <input 
                      type="text" 
                      value={config.notify_custom_phone || ""} 
                      onChange={e => setConfig({...config, notify_custom_phone: e.target.value})} 
                      className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-bold focus:border-[var(--ui-primary)] focus:ring-1 focus:ring-[var(--ui-primary)] outline-none" 
                      placeholder="Contoh: 628123456789"
                    />
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full sm:w-auto px-6 font-bold shadow-xs">
              {savingConfig ? "Menyimpan Konfigurasi..." : "Simpan Batas Waktu"}
            </Button>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PUSAT LAPORAN & REKAP (REPORTS HUB) */}
      {currentSubTab === 'reports' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <FileText size={16} className="text-[var(--ui-primary)]" />
              Pusat Laporan & Matriks Rekap Kehadiran
            </h3>
            <p className="text-xs text-slate-500 font-medium">Akses langsung ke rekapitulasi kehadiran bulanan siswa, guru, dan karyawan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Report Card: Siswa */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-[var(--ui-primary)] transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center mb-3">
                  <Users size={20} />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Laporan Presensi Siswa</h4>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Matriks absensi harian dan bulanan seluruh kelas, persentase hadir, izin, sakit, alpa, serta ekspor Excel resmi.
                </p>
              </div>
              <Button 
                onClick={() => navigateToExternalReport('hikvision_report_siswa')}
                className="mt-4 w-full flex items-center justify-center gap-1.5 font-bold text-xs"
              >
                <span>Buka Presensi Siswa</span>
                <ArrowUpRight size={14} />
              </Button>
            </div>

            {/* Report Card: Guru */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-[var(--ui-primary)] transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center mb-3">
                  <UserCheck size={20} />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Laporan Presensi Guru</h4>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Rekapitulasi kehadiran guru, waktu tap scan masuk/pulang, keterlambatan, dan persetujuan izin resmi kurikulum.
                </p>
              </div>
              <Button 
                onClick={() => navigateToExternalReport('hikvision_report_guru')}
                className="mt-4 w-full flex items-center justify-center gap-1.5 font-bold text-xs"
              >
                <span>Buka Presensi Guru</span>
                <ArrowUpRight size={14} />
              </Button>
            </div>

            {/* Report Card: Karyawan */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-[var(--ui-primary)] transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-700 flex items-center justify-center mb-3">
                  <Briefcase size={20} />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Laporan Presensi Karyawan</h4>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Audit absensi staf tata usaha, teknisi, sekuriti, dan tenaga kependidikan sekolah.
                </p>
              </div>
              <Button 
                onClick={() => navigateToExternalReport('hikvision_report_karyawan')}
                className="mt-4 w-full flex items-center justify-center gap-1.5 font-bold text-xs"
              >
                <span>Buka Presensi Karyawan</span>
                <ArrowUpRight size={14} />
              </Button>
            </div>

            {/* Report Card: Keterangan Massal */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-[var(--ui-primary)] transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center mb-3">
                  <ClipboardList size={20} />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Keterangan Massal Absensi</h4>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Entri massal dispensasi, kegiatan lomba, magang PKL, atau libur khusus per rombel siswa.
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => navigateToExternalReport('hikvision_report_siswa')}
                className="mt-4 w-full flex items-center justify-center gap-1.5 font-bold text-xs"
              >
                <span>Entri Keterangan Massal</span>
                <ArrowUpRight size={14} />
              </Button>
            </div>

            {/* Report Card: Izin & Sakit Siswa */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-[var(--ui-primary)] transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-700 flex items-center justify-center mb-3">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Izin & Sakit Siswa (BK/Walas)</h4>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Manajemen surat izin dan dokter siswa dengan hierarki persetujuan di atas scan mesin fisik.
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => navigateToExternalReport('kedisiplinan_absensi')}
                className="mt-4 w-full flex items-center justify-center gap-1.5 font-bold text-xs"
              >
                <span>Kelola Izin & Sakit</span>
                <ArrowUpRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-md font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-[100] ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
