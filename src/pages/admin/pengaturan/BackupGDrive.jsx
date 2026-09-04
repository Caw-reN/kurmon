import { useState, useEffect, useRef } from 'react';
import { 
  CloudUpload, Settings, LayoutDashboard, KeyRound, DatabaseBackup, 
  MessageSquare, HardDrive, Send, Cloud, UploadCloud, Trash2, 
  FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw, 
  Info, Shield, Calendar, FileJson, Sparkles, Clock, Trash, 
  ExternalLink, ArrowRight, ShieldAlert, Check, AlertTriangle
} from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
import { Button } from '../../../components/ui.jsx';

export default function BackupGDrive({ activeTab: activeSystemTab, setActiveTab: setSystemTab }) {
  const [activeTab, setActiveTab] = useState('local'); // 'local' | 'gdrive' | 'r2' | 'telegram' | 'restore' | 'archive'
  
  const [isTelegramConfigured, setIsTelegramConfigured] = useState(false);
  const [isR2Configured, setIsR2Configured] = useState(false);
  const [isGDriveConfigured, setIsGDriveConfigured] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);
  
  const [localBackups, setLocalBackups] = useState([]);
  const [schedule, setSchedule] = useState({ hour: 2, enabled: true, keepDays: 7, sendToTelegram: false });
  const [botStatus, setBotStatus] = useState(null);
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [archiveDate, setArchiveDate] = useState('');
  const [isDownloading, setIsDownloading] = useState({});
  
  const [backupLogs, setBackupLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (msg, type = 'success') => { 
    setToast({ message: msg, type }); 
    setTimeout(() => setToast(null), 3500); 
  };

  const loadData = async () => {
    if (!authToken) return;
    try {
      const [resKeys, bkRes, schRes, botRes] = await Promise.all([
        fetch('/api/api-keys', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/backup/list', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/backup/schedule', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/telegram-bot/status', { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      
      if (resKeys.ok) {
        const data = await resKeys.json();
        const telegramKey = (data.data || []).find(k => k.service_name === 'telegram_backup' && k.is_active);
        const r2Key = (data.data || []).find(k => k.service_name === 'cloudflare_r2' && k.is_active);
        const gdriveKey = (data.data || []).find(k => k.service_name === 'google_drive' && k.is_active);
        setIsTelegramConfigured(!!telegramKey);
        setIsR2Configured(!!r2Key);
        setIsGDriveConfigured(!!gdriveKey);
      }
      
      if (bkRes.ok) { const b = await bkRes.json(); setLocalBackups(b.data || []); }
      if (schRes.ok) { const s = await schRes.json(); setSchedule(s.data || schedule); }
      if (botRes.ok) { const b = await botRes.json(); setBotStatus(b.data); }
    } catch (e) { 
      console.error(e); 
    }
    setIsCheckingConfig(false);
  };

  useEffect(() => {
    loadData();
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    setArchiveDate(d.toISOString().split('T')[0]);
  }, [authToken]);

  const handleManualBackup = async (type) => {
    setIsBackingUp(true);
    let apiEndpoint = '';
    let label = '';
    if (type === 'telegram') { apiEndpoint = '/api/backup-telegram'; label = 'Telegram'; }
    if (type === 'gdrive') { apiEndpoint = '/api/backup-gdrive'; label = 'Google Drive'; }
    if (type === 'r2') { apiEndpoint = '/api/backup-r2'; label = 'Cloudflare R2'; }
    if (type === 'local') { apiEndpoint = '/api/backup/local'; label = 'Lokal Server'; }
    
    showToast(`Memulai pencadangan data ke ${label}...`, 'success');
    
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      
      if (data.ok) {
        const filename = data.data?.filename || data.data?.fileName || 'backup.json';
        const size = data.data?.size || '-';
        const newLog = { 
          id: Date.now(), 
          type: label, 
          status: 'success', 
          filename, 
          size, 
          created_at: new Date().toISOString() 
        };
        setBackupLogs(prev => [newLog, ...prev]);
        showToast(`Pencadangan database ke ${label} berhasil diselesaikan! 🎉`);
        if (type === 'local') loadData(); // refresh file list
      } else {
        showToast(data.error || 'Terjadi kesalahan saat memproses backup.', 'error');
      }
    } catch (e) {
      showToast('Gagal memanggil antarmuka API backup.', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadBackup = async (typeOrFilename, isLocalFile = false) => {
    if (isDownloading[typeOrFilename]) return;
    const token = authToken || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken || '';
    
    const url = isLocalFile ? `/api/backup/download/${typeOrFilename}` : `/api/backup/${typeOrFilename}`;
    setIsDownloading(prev => ({ ...prev, [typeOrFilename]: true }));
    try {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        showToast(errJson?.error || `Gagal mengunduh berkas cadangan.`, 'error');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      let finalName = typeOrFilename;
      if (!isLocalFile) {
        const dateStr = new Date().toISOString().slice(0, 10);
        const ext = typeOrFilename === 'excel' ? 'xlsx' : typeOrFilename === 'json' ? 'json' : 'sql';
        finalName = `kurmon_backup_${typeOrFilename}_${dateStr}.${ext}`;
      }
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      
      showToast(`Berkas cadangan berhasil diunduh ke komputer Anda!`);
    } catch (err) {
      showToast(`Gagal mengunduh file cadangan.`, 'error');
    } finally {
      setIsDownloading(prev => ({ ...prev, [typeOrFilename]: false }));
    }
  };

  const handleDeleteLocal = async (filename) => {
    if (!await window.confirmAsync(`Hapus permanen berkas backup: ${filename}?`)) return;
    try {
      const res = await fetch(`/api/backup/delete/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        showToast(`Berkas ${filename} berhasil dihapus dari server.`);
        loadData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menghapus berkas.', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi saat menghapus.', 'error');
    }
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const res = await fetch('/api/backup/schedule', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
      if (res.ok) {
        showToast('Konfigurasi jadwal auto-backup berhasil diperbarui!');
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menyimpan jadwal.', 'error');
      }
    } catch (e) {
      showToast('Gagal memanggil API jadwal.', 'error');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleTestBot = async () => {
    try {
      const res = await fetch('/api/telegram-bot/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) showToast('Pesan uji coba berhasil terkirim ke Telegram!');
      else showToast(data.error || 'Gagal mengirim pesan uji coba.', 'error');
    } catch (e) { 
      showToast('Gagal terhubung ke bot server.', 'error'); 
    }
  };

  const handleReloadBot = async () => {
    try {
      const res = await fetch('/api/telegram-bot/reload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Bot Telegram berhasil dimuat ulang!');
        loadData();
      } else {
        showToast(data.error || 'Gagal memuat ulang bot.', 'error');
      }
    } catch (e) { 
      showToast('Gagal menghubungi bot server.', 'error'); 
    }
  };

  const handleToggleAlert = async (key, value) => {
    if (!botStatus) return;
    const newAlerts = { ...(botStatus.alertConfig || {}), [key]: value };
    setBotStatus(prev => ({ ...prev, alertConfig: newAlerts }));
    try {
      const res = await fetch('/api/telegram-bot/config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts: newAlerts })
      });
      const data = await res.json();
      if (!data.ok) showToast('Gagal menyimpan konfigurasi.', 'error');
    } catch(e) {
      showToast('Koneksi bermasalah saat menyimpan.', 'error');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      showToast('Berkas cadangan harus berekstensi .json', 'error');
      return;
    }

    if (!await window.confirmAsync('PERINGATAN KRITIKAL: Memulihkan database akan menimpa SELURUH data sekolah yang ada saat ini dengan data dari file backup. Apakah Anda benar-benar yakin ingin melanjutkan?')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    showToast('Sedang memulihkan database sekolah, mohon tunggu...', 'success');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target.result;
        JSON.parse(jsonContent);
        
        const res = await fetch('/api/restore-backup', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          body: jsonContent
        });
        const data = await res.json();
        
        if (data.ok) {
          showToast('Database berhasil dipulihkan! Halaman akan dimuat ulang...');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          showToast(data.error || 'Terjadi kesalahan saat memulihkan data.', 'error');
        }
      } catch (e) {
        showToast('Berkas JSON tidak valid atau struktur tidak cocok.', 'error');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleArchive = async () => {
    if (!archiveDate) return;
    if (!await window.confirmAsync(`PERINGATAN KEAMANAN: Anda akan MENGHAPUS PERMANEN riwayat log dan absensi yang dibuat sebelum tanggal ${archiveDate}. Data guru, siswa, dan kelas tidak akan terhapus. Lanjutkan?`)) {
      return;
    }
    
    setIsArchiving(true);
    showToast('Memulai proses pengarsipan dan pembersihan data lampau...', 'success');
    
    try {
      const res = await fetch('/api/archive-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateBefore: archiveDate + 'T00:00:00Z' })
      });
      const data = await res.json();
      if (data.ok) showToast(data.message || 'Pembersihan database berhasil diselesaikan!');
      else showToast(data.error || 'Gagal melakukan pembersihan.', 'error');
    } catch (e) {
      showToast('Gagal memanggil API pengarsipan.', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  const TAB_ITEMS = [
    { id: 'local', icon: HardDrive, label: 'Backup Lokal & SQL', isConfigured: true },
    { id: 'gdrive', icon: HardDrive, label: 'Google Drive', isConfigured: isGDriveConfigured },
    { id: 'r2', icon: Cloud, label: 'Cloudflare R2', isConfigured: isR2Configured },
    { id: 'telegram', icon: Send, label: 'Telegram Bot', isConfigured: isTelegramConfigured },
    { id: 'restore', icon: UploadCloud, label: 'Pulihkan Data', isConfigured: true },
    { id: 'archive', icon: Trash2, label: 'Arsip & Bersihkan', isConfigured: true },
  ];

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Manajemen Backup & Arsip"
        description="Pencadangan terpusat database sekolah ke berbagai platform (Lokal, Google Drive, Cloudflare R2, Telegram) serta pemulihan dan pembersihan data berkala."
        icon={CloudUpload}
        tabs={[
          { id: "fitur", label: "Fitur", icon: Settings },
          { id: "tampilan", label: "Tampilan Web", icon: LayoutDashboard },
          { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
          { id: "api_keys", label: "API Key", icon: KeyRound },
          { id: "gdrive_backup", label: "Backup", icon: DatabaseBackup }
        ]}
        activeTab={activeSystemTab}
        onTabChange={setSystemTab}
      />
      
      {/* SEGMENTED TAB BAR */}
      <div className="flex gap-1.5 p-1.5 bg-slate-100/90 backdrop-blur-md rounded-[var(--ui-radius-card)] w-full max-w-full overflow-x-auto border border-slate-200/80 shadow-inner">
        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[var(--ui-radius-small)] font-bold text-xs transition-all duration-200 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white shadow-xs text-slate-800 font-black scale-100 border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <tab.icon size={15} className={isActive ? 'text-emerald-600' : 'opacity-70'} />
              <span>{tab.label}</span>
              {tab.id !== 'local' && tab.id !== 'restore' && tab.id !== 'archive' && (
                <span 
                  className={`w-1.5 h-1.5 rounded-full ${tab.isConfigured ? 'bg-emerald-500' : 'bg-slate-300'}`} 
                  title={tab.isConfigured ? "Terkonfigurasi" : "Belum Dikonfigurasi"} 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── 1. TAB: BACKUP LOKAL & SQL ── */}
      {activeTab === 'local' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SQL Dump */}
            <div className="p-5 rounded-[var(--ui-radius-card)] bg-gradient-to-br from-indigo-50/50 via-white to-white border border-indigo-100 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-[var(--ui-radius-small)] bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
                  <DatabaseBackup size={22} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">Backup Relasional DB</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                    Unduh struktur skema dan seluruh baris data dalam format PostgreSQL SQL Dump.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadBackup('postgresql')}
                disabled={!!isDownloading['postgresql']}
                className="w-full py-2.5 px-4 rounded-[var(--ui-radius-small)] font-bold text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDownloading['postgresql'] ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Unduh Berkas SQL</span>
              </button>
            </div>

            {/* Excel Master Data */}
            <div className="p-5 rounded-[var(--ui-radius-card)] bg-gradient-to-br from-emerald-50/50 via-white to-white border border-emerald-100 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-[var(--ui-radius-small)] bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">Master Data Spreadsheet</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                    Ekspor seluruh data siswa, guru, jadwal, dan kelas ke dokumen Microsoft Excel (.xlsx).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadBackup('excel')}
                disabled={!!isDownloading['excel']}
                className="w-full py-2.5 px-4 rounded-[var(--ui-radius-small)] font-bold text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDownloading['excel'] ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Unduh Format Excel</span>
              </button>
            </div>

            {/* JSON Full Snapshot */}
            <div className="p-5 rounded-[var(--ui-radius-card)] bg-gradient-to-br from-amber-50/50 via-white to-white border border-amber-200 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-[var(--ui-radius-small)] bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                  <FileJson size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[9px] font-black bg-amber-200 text-amber-900 uppercase">
                      Snapshot Penuh
                    </span>
                  </div>
                  <h4 className="font-black text-slate-800 text-sm">Arsip JSON Lokal</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Buat file cadangan JSON instan dari seluruh database server saat ini.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleManualBackup('local')}
                disabled={isBackingUp}
                className="w-full py-2.5 px-4 rounded-[var(--ui-radius-small)] font-black text-xs bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isBackingUp ? <RefreshCw size={14} className="animate-spin" /> : <DatabaseBackup size={14} />}
                <span>Buat Backup Baru di Server</span>
              </button>
            </div>
          </div>

          {/* Schedule & History Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Auto Schedule Form */}
            <div className="p-5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Clock size={18} className="text-slate-400" />
                <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">Jadwal Auto-Backup Otomatis</h3>
              </div>

              <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-100">
                  <div>
                    <span className="font-black text-slate-800 block">Jadwal Harian Otomatis</span>
                    <span className="text-[10.5px] text-slate-400 font-medium">Backup otomatis setiap malam</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={schedule.enabled} 
                    onChange={e => setSchedule({...schedule, enabled: e.target.checked})} 
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" 
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Jam Eksekusi (0 - 23 WIB)
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max="23" 
                    value={schedule.hour} 
                    onChange={e => setSchedule({...schedule, hour: parseInt(e.target.value) || 0})} 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold" 
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Retensi File (Simpan Selama Hari)
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="60" 
                    value={schedule.keepDays} 
                    onChange={e => setSchedule({...schedule, keepDays: parseInt(e.target.value) || 7})} 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">File lebih lama dari jumlah hari ini akan otomatis dibersihkan.</p>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-100">
                  <div>
                    <span className="font-black text-slate-800 block">Kirim Berkas ke Telegram</span>
                    <span className="text-[10.5px] text-slate-400 font-medium">Kirim file saat auto-backup selesai</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={schedule.sendToTelegram} 
                    onChange={e => setSchedule({...schedule, sendToTelegram: e.target.checked})} 
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" 
                  />
                </div>

                <button 
                  type="button"
                  onClick={handleSaveSchedule} 
                  disabled={isSavingSchedule} 
                  className="w-full py-2.5 rounded-[var(--ui-radius-small)] font-black text-xs bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingSchedule ? 'Menyimpan Pengaturan...' : 'Simpan Jadwal Backup'}
                </button>
              </div>
            </div>

            {/* Local Server Backup History Table */}
            <div className="lg:col-span-2 p-5 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HardDrive size={18} className="text-slate-400" />
                  <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                    Arsip Berkas Backup di Server ({localBackups.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[var(--ui-radius-small)] transition-colors border-none bg-transparent cursor-pointer"
                  title="Segarkan List"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-2.5">Nama Berkas</th>
                      <th className="px-3 py-2.5">Waktu Pembuatan</th>
                      <th className="px-3 py-2.5 text-right">Ukuran</th>
                      <th className="px-4 py-2.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {localBackups.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-10 text-slate-400 font-medium">
                          Belum ada berkas backup yang tersimpan di server lokal.
                        </td>
                      </tr>
                    ) : localBackups.map(file => (
                      <tr key={file.filename} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800 font-mono text-[11px]">{file.filename}</p>
                          {file.checksum && (
                            <p className="text-[9.5px] text-slate-400 font-mono mt-0.5" title={file.fullChecksum}>
                              SHA-256: {file.checksum}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-500 font-medium text-[11px]">
                          {new Date(file.createdAt).toLocaleString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-3 py-3 text-right font-black text-slate-700 text-[11px]">
                          {file.size}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button 
                              type="button"
                              onClick={() => handleDownloadBackup(file.filename, true)} 
                              disabled={isDownloading[file.filename]} 
                              className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors border-none cursor-pointer"
                              title="Unduh Berkas"
                            >
                              {isDownloading[file.filename] ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteLocal(file.filename)} 
                              className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors border-none cursor-pointer"
                              title="Hapus Berkas"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. TAB: GOOGLE DRIVE ── */}
      {activeTab === 'gdrive' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className={`p-6 rounded-[var(--ui-radius-card)] border shadow-xs ${
            isGDriveConfigured 
              ? 'bg-gradient-to-br from-teal-50/40 via-white to-white border-teal-200' 
              : 'bg-white border-slate-200/80'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 border ${
                  isGDriveConfigured 
                    ? 'bg-teal-100 text-teal-700 border-teal-200 shadow-sm' 
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  <HardDrive size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-lg text-slate-800">Google Drive Cloud Storage</h3>
                    <span className={`px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider border ${
                      isGDriveConfigured 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {isGDriveConfigured ? 'Terkoneksi (Aktif)' : 'Belum Dikonfigurasi'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 max-w-xl leading-relaxed">
                    Unggah cadangan database sekolah terenkripsi langsung ke folder Google Drive institusi menggunakan Google Cloud Service Account.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                {isGDriveConfigured ? (
                  <button
                    type="button"
                    onClick={() => handleManualBackup('gdrive')}
                    disabled={isBackingUp}
                    className="w-full md:w-auto py-2.5 px-5 rounded-[var(--ui-radius-small)] font-black text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isBackingUp ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                    <span>Backup ke Google Drive Sekarang</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSystemTab?.('api_keys')}
                    className="w-full md:w-auto py-2.5 px-5 rounded-[var(--ui-radius-small)] font-black text-xs bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Konfigurasi di Tab API Key</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="p-6 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Info size={16} className="text-teal-600" />
              Panduan Konfigurasi Google Drive Backup
            </h4>
            <ol className="list-decimal pl-5 space-y-2.5 text-xs text-slate-600 font-medium leading-relaxed">
              <li>
                Buka <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-teal-600 font-bold hover:underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={10} /></a> dan buat project baru.
              </li>
              <li>Aktifkan <b>Google Drive API</b> pada menu Library/API & Services.</li>
              <li>Buat <b>Service Account</b> baru, lalu buat dan unduh file <b>Key (JSON)</b>.</li>
              <li>Buka Google Drive Anda, buat folder khusus (misal: <code>Backup-Kurmon</code>), lalu bagikan akses folder sebagai <b>Editor</b> ke email Service Account tersebut.</li>
              <li>Salin isi berkas JSON Service Account dan <b>Folder ID</b> dari URL Google Drive.</li>
              <li>
                Masuk ke tab <button type="button" onClick={() => setSystemTab?.('api_keys')} className="text-teal-700 font-bold hover:underline bg-transparent border-none cursor-pointer p-0">API Key</button>, pilih kartu <b>Google Drive</b>, lalu tempelkan kredensial tersebut.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* ── 3. TAB: CLOUDFLARE R2 ── */}
      {activeTab === 'r2' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className={`p-6 rounded-[var(--ui-radius-card)] border shadow-xs ${
            isR2Configured 
              ? 'bg-gradient-to-br from-amber-50/40 via-white to-white border-amber-200' 
              : 'bg-white border-slate-200/80'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 border ${
                  isR2Configured 
                    ? 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm' 
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  <Cloud size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-lg text-slate-800">Cloudflare R2 Storage (S3-Compatible)</h3>
                    <span className={`px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] text-[10px] font-black uppercase tracking-wider border ${
                      isR2Configured 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {isR2Configured ? 'Terkoneksi (Aktif)' : 'Belum Dikonfigurasi'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 max-w-xl leading-relaxed">
                    Penyimpanan objek cloud berkecepatan tinggi dengan proteksi enkripsi AES-256, gratis 10 GB kapasitas setiap bulan tanpa biaya transfer keluar (zero egress fee).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                {isR2Configured ? (
                  <button
                    type="button"
                    onClick={() => handleManualBackup('r2')}
                    disabled={isBackingUp}
                    className="w-full md:w-auto py-2.5 px-5 rounded-[var(--ui-radius-small)] font-black text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isBackingUp ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                    <span>Backup ke Cloudflare R2 Sekarang</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSystemTab?.('api_keys')}
                    className="w-full md:w-auto py-2.5 px-5 rounded-[var(--ui-radius-small)] font-black text-xs bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Konfigurasi di Tab API Key</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* R2 Guide */}
          <div className="p-6 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Info size={16} className="text-amber-600" />
              Panduan Konfigurasi Cloudflare R2
            </h4>
            <ol className="list-decimal pl-5 space-y-2.5 text-xs text-slate-600 font-medium leading-relaxed">
              <li>Login ke akun <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-amber-600 font-bold hover:underline inline-flex items-center gap-0.5">Cloudflare Dashboard <ExternalLink size={10} /></a>.</li>
              <li>Pilih menu <b>R2 Object Storage</b> dan buat sebuah Bucket baru (misal: <code>kurmon-backup</code>).</li>
              <li>Masuk ke menu <b>Manage R2 API Tokens</b> dan klik <b>Create API Token</b> dengan hak akses Object Read & Write.</li>
              <li>Salin <b>Access Key ID</b>, <b>Secret Access Key</b>, dan <b>Endpoint URL</b>.</li>
              <li>
                Buka tab <button type="button" onClick={() => setSystemTab?.('api_keys')} className="text-amber-700 font-bold hover:underline bg-transparent border-none cursor-pointer p-0">API Key</button>, pilih kartu <b>Cloudflare R2 Backup</b>, lalu masukkan kredensial tersebut.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* ── 4. TAB: TELEGRAM BOT ── */}
      {activeTab === 'telegram' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className={`p-6 rounded-[var(--ui-radius-card)] border shadow-xs ${
            botStatus?.isRunning 
              ? 'bg-gradient-to-br from-sky-50/50 via-white to-white border-sky-200' 
              : 'bg-white border-slate-200/80'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 border ${
                  botStatus?.isRunning 
                    ? 'bg-sky-500 text-white border-sky-600 shadow-sm' 
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  <Send size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-lg text-slate-800">Telegram Bot Notifikasi & Backup</h3>
                    {botStatus?.isRunning ? (
                      <span className="px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] bg-emerald-100 text-emerald-700 text-[10px] uppercase font-black tracking-wider border border-emerald-200">
                        Online (Polling)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-[var(--ui-radius-pill)] bg-slate-100 text-slate-500 text-[10px] uppercase font-bold border border-slate-200">
                        Berhenti / Offline
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 max-w-xl leading-relaxed">
                    Kirim laporan otomatis kehadiran, log error sistem, percobaan brute-force, dan berkas cadangan langsung ke ruang obrolan Telegram.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleManualBackup('telegram')}
                  disabled={isBackingUp || !botStatus?.hasBotToken}
                  className="py-2.5 px-4 rounded-[var(--ui-radius-small)] font-black text-xs bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isBackingUp ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Kirim Backup Manual</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestBot}
                  disabled={!botStatus?.hasBotToken}
                  className="py-2.5 px-3.5 rounded-[var(--ui-radius-small)] font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Test Pesan
                </button>
                <button
                  type="button"
                  onClick={handleReloadBot}
                  className="py-2.5 px-3.5 rounded-[var(--ui-radius-small)] font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Reload Bot</span>
                </button>
              </div>
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
              <div className="p-3 bg-slate-50/70 rounded-[var(--ui-radius-small)] border border-slate-100">
                <p className="text-[10px] uppercase font-black text-slate-400">Status Server Bot</p>
                <p className="font-extrabold text-slate-700 text-xs mt-0.5">
                  {botStatus?.isRunning ? 'Berjalan Normal' : 'Tidak Aktif'}
                </p>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-[var(--ui-radius-small)] border border-slate-100">
                <p className="text-[10px] uppercase font-black text-slate-400">Bot Token</p>
                <p className="font-extrabold text-slate-700 text-xs mt-0.5">
                  {botStatus?.hasBotToken ? 'Terkonfigurasi' : 'Belum Ada'}
                </p>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-[var(--ui-radius-small)] border border-slate-100">
                <p className="text-[10px] uppercase font-black text-slate-400">Target Chat ID</p>
                <p className="font-extrabold text-slate-700 text-xs mt-0.5">
                  {botStatus?.hasChatId ? 'Tersimpan' : 'Belum Lengkap'}
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Toggles */}
          <div className="p-6 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-slate-100 rounded-md text-slate-600"><Settings size={14} /></div>
              Pengaturan Notifikasi (Toggles)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {[
                { key: 'attendance', label: 'Laporan Absensi Harian', desc: 'Rekap kehadiran otomatis & request manual via /absen' },
                { key: 'serverError', label: 'Log Error Server (HTTP 500)', desc: 'Notifikasi saat backend crash atau unhandled exceptions' },
                { key: 'bruteForce', label: 'Keamanan & Brute-Force', desc: 'Peringatan otomatis saat ada serangan login beruntun' },
                { key: 'backupStatus', label: 'Status Backup & Restore', desc: 'Laporan keberhasilan atau kegagalan proses backup' },
                { key: 'adminLogin', label: 'Notifikasi Login Admin', desc: 'Catat setiap kali SuperAdmin masuk ke sistem' },
                { key: 'apiKeyAdded', label: 'Perubahan API Key', desc: 'Peringatan ketika ada perubahan pengaturan API Key' }
              ].map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-3 p-3 rounded-[var(--ui-radius-small)] border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div>
                    <h5 className="font-bold text-[13px] text-slate-700">{item.label}</h5>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={botStatus?.alertConfig?.[item.key] ?? false}
                      onChange={(e) => handleToggleAlert(item.key, e.target.checked)}
                      disabled={!botStatus?.hasBotToken}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              ))}
            </div>
            {!botStatus?.hasBotToken && (
               <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-md">
                 Tambahkan API Key terlebih dahulu untuk dapat mengatur fitur notifikasi.
               </p>
            )}
          </div>

          {/* ── Guide / Manual Telegram Bot ── */}
          <div className="p-6 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs space-y-5 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Send size={120} />
            </div>

            <div className="relative z-10">
              <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                <Info size={18} className="text-sky-500" />
                Buku Panduan: Konfigurasi Bot Telegram
              </h4>
              
              <div className="space-y-4">
                {/* Step 1: Dapatkan Token */}
                <div className="flex gap-4 p-4 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-100 relative group transition-all hover:shadow-xs hover:bg-white hover:border-sky-100">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-black text-sm flex items-center justify-center shrink-0 border border-sky-200">1</div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-[13px] mb-1">Dapatkan Bot Token</h5>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Buka Telegram, cari <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-600 font-bold hover:underline">@BotFather</a>. Kirim perintah <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-700">/newbot</code>, berikan nama bot Anda, lalu salin <b>HTTP API Token</b> yang diberikan.
                    </p>
                  </div>
                </div>

                {/* Step 2: Dapatkan Chat ID */}
                <div className="flex gap-4 p-4 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-100 relative group transition-all hover:shadow-xs hover:bg-white hover:border-emerald-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-200">2</div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-[13px] mb-1">Dapatkan Target Chat ID</h5>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Cari bot <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline">@userinfobot</a> di Telegram, tekan <b>Start</b>. Salin angka <b>Id</b> (contoh: <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-700">123456789</code>) yang merupakan Chat ID Anda atau Grup Anda.
                    </p>
                  </div>
                </div>

                {/* Step 3: Aktivasi */}
                <div className="flex gap-4 p-4 rounded-[var(--ui-radius-small)] bg-slate-50 border border-slate-100 relative group transition-all hover:shadow-xs hover:bg-white hover:border-purple-100">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-black text-sm flex items-center justify-center shrink-0 border border-purple-200">3</div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-[13px] mb-1">Masukkan ke Sistem & Mulai</h5>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Pindah ke tab <button type="button" onClick={() => setSystemTab?.('api_keys')} className="text-purple-600 font-bold hover:underline bg-transparent border-none cursor-pointer p-0">API Key</button>, pilih kartu <b>Telegram Auto-Backup</b>, lalu masukkan Token dan Chat ID. Buka Bot Anda di Telegram dan tekan <b>Start</b>. Terakhir, kembali ke halaman ini dan tekan <b>Reload Bot</b>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. TAB: PULIHKAN DATA (RESTORE) ── */}
      {activeTab === 'restore' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-8 sm:p-10 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs text-center max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-[var(--ui-radius-card)] bg-purple-100 text-purple-700 flex items-center justify-center mx-auto border border-purple-200 shadow-xs">
              <UploadCloud size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="font-black text-slate-800 text-xl tracking-tight">
                Pulihkan Database Sekolah <span className="text-purple-600">(Restore)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Pilih berkas arsip <code>.json</code> cadangan dari komputer Anda. Sistem akan memvalidasi skema dan memasukkan seluruh data kembali ke database.
              </p>
            </div>

            {/* Warning Alert Box */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-[var(--ui-radius-small)] text-left flex items-start gap-3">
              <AlertTriangle size={18} className="shrink-0 text-amber-700 mt-0.5" />
              <div className="text-[11px] text-amber-800 leading-relaxed font-medium">
                <span className="font-black block">Perhatian Sebelum Memulihkan:</span>
                Proses pemulihan akan menimpa data yang sedang aktif dengan data dari berkas cadangan yang Anda unggah. Pastikan Anda telah membuat cadangan data terkini terlebih dahulu.
              </div>
            </div>

            <div>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoring}
                className="w-full sm:w-auto py-3 px-8 rounded-[var(--ui-radius-small)] font-black text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs mx-auto disabled:opacity-50"
              >
                {isRestoring ? <RefreshCw size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                <span>{isRestoring ? 'Memulihkan Data Database...' : 'Pilih Berkas JSON & Jalankan Restore'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. TAB: ARSIP & PEMBERSIHAN DATA ── */}
      {activeTab === 'archive' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-8 sm:p-10 rounded-[var(--ui-radius-card)] bg-white border border-slate-200/80 shadow-xs text-center max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-[var(--ui-radius-card)] bg-rose-100 text-rose-700 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
              <Trash2 size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="font-black text-slate-800 text-xl tracking-tight">
                Arsip & <span className="text-rose-600">Pembersihan Database</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Hapus catatan log aktivitas, notifikasi lama, dan histori absensi kadaluarsa untuk mempercepat performa database server sekolah.
              </p>
            </div>

            {/* Scope Information */}
            <div className="p-4 bg-slate-50 rounded-[var(--ui-radius-small)] border border-slate-200/80 text-left space-y-2">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 block">
                Cakupan Pembersihan:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 font-medium">
                <li>Log aktivitas sistem & riwayat audit lampau</li>
                <li>Riwayat notifikasi dan antrean webhook kadaluarsa</li>
                <li><b>Aman:</b> Data pokok guru, siswa, kelas, mapel, dan jadwal <u>tidak akan terhapus</u></li>
              </ul>
            </div>

            <div className="max-w-xs mx-auto space-y-1.5 text-left">
              <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider">
                Hapus Seluruh Data Sebelum Tanggal:
              </label>
              <input 
                type="date" 
                value={archiveDate} 
                onChange={e => setArchiveDate(e.target.value)} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-[var(--ui-radius-small)] text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20" 
              />
            </div>

            <button
              type="button"
              onClick={handleArchive}
              disabled={isArchiving || !archiveDate}
              className="w-full sm:w-auto py-3 px-8 rounded-[var(--ui-radius-small)] font-black text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs mx-auto disabled:opacity-50"
            >
              {isArchiving ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
              <span>{isArchiving ? 'Sedang Membersihkan...' : 'Mulai Pembersihan Data Lampau'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TOAST NOTIFIKASI */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-md font-bold text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white z-50 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.message}
        </div>
      )}
    </div>
  );
}
