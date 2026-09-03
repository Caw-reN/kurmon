import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useRef } from 'react';
import { CloudUpload, Settings, LayoutDashboard, KeyRound, DatabaseBackup, MessageSquare } from 'lucide-react';
import useAuthStore from '../../../store/monitoring/authStore.js';
import { HardDrive, Send, Cloud, UploadCloud, Trash2, FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw, Info, Shield, Calendar, FileJson, Sparkles, Clock, Trash } from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';

export default function BackupGDrive({ activeTab: activeSystemTab, setActiveTab: setSystemTab }) {
  const [activeTab, setActiveTab] = useState('local'); //'local','telegram','r2','gdrive','restore','archive'
  
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

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

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
    } catch (e) { console.error(e); }
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
    if (type === 'local') { apiEndpoint = '/api/backup/local'; label = 'Local Storage'; }
    
    showToast(`Memulai backup ke ${label}...`, 'success');
    
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
          id: Date.now(), type: label, status: 'success', filename, size, created_at: new Date().toISOString() 
        };
        setBackupLogs(prev => [newLog, ...prev]);
        showToast(`Backup berhasil dikirim ke ${label}! 🎉`);
        if (type === 'local') loadData(); // refresh list
      } else {
        showToast(data.error || 'Terjadi kesalahan saat mem-backup.', 'error');
      }
    } catch (e) {
      showToast('Gagal memanggil API backup.', 'error');
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
        showToast(errJson?.error || `Gagal mengunduh backup.`, 'error');
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
      
      showToast(`Berhasil mengunduh backup!`);
    } catch (err) {
      showToast(`Gagal mengunduh backup.`, 'error');
    } finally {
      setIsDownloading(prev => ({ ...prev, [typeOrFilename]: false }));
    }
  };

  const handleDeleteLocal = async (filename) => {
    if (!await window.confirmAsync(`Hapus permanen file backup: ${filename}?`)) return;
    try {
      const res = await fetch(`/api/backup/delete/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        showToast(`File ${filename} berhasil dihapus.`);
        loadData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menghapus file.', 'error');
      }
    } catch (e) {
      showToast('Gagal memanggil API.', 'error');
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
        showToast('Jadwal backup berhasil disimpan!');
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menyimpan jadwal.', 'error');
      }
    } catch (e) {
      showToast('Gagal memanggil API.', 'error');
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
      if (data.ok) showToast('Test pesan berhasil dikirim ke Telegram!');
      else showToast(data.error || 'Gagal test bot.', 'error');
    } catch (e) { showToast('Gagal koneksi ke server.', 'error'); }
  };

  const handleReloadBot = async () => {
    try {
      const res = await fetch('/api/telegram-bot/reload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Bot berhasil direstart/direload.');
        loadData();
      }
      else showToast(data.error || 'Gagal reload bot.', 'error');
    } catch (e) { showToast('Gagal koneksi ke server.', 'error'); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      showToast('File backup harus berformat .json', 'error');
      return;
    }

    if (!await window.confirmAsync('PERINGATAN: Memulihkan database akan menimpa SEMUA data yang ada saat ini. Apakah Anda yakin?')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    showToast('Memulihkan database, mohon tunggu...', 'success');
    
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
          showToast('Database berhasil dipulihkan! 🎉');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          showToast(data.error || 'Terjadi kesalahan saat memulihkan.', 'error');
        }
      } catch (e) {
        showToast('File tidak valid atau gagal terhubung ke server.', 'error');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleArchive = async () => {
    if (!archiveDate) return;
    if (!await window.confirmAsync(`PERINGATAN KRITIKAL! Anda akan MENGHAPUS PERMANEN seluruh data log/absensi yang dibuat sebelum tanggal ${archiveDate}. Lanjutkan?`)) {
      return;
    }
    
    setIsArchiving(true);
    showToast('Memulai proses pengarsipan dan pembersihan...', 'success');
    
    try {
      const res = await fetch('/api/archive-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateBefore: archiveDate + 'T00:00:00Z' })
      });
      const data = await res.json();
      if (data.ok) showToast(data.message);
      else showToast(data.error || 'Gagal melakukan pembersihan.', 'error');
    } catch (e) {
      showToast('Gagal memanggil API.', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Manajemen Backup & Arsip"
        description="Kelola pencadangan database sekolah ke berbagai platform (Lokal, R2, Telegram, GDrive) dan bersihkan data lampau."
        icon={CloudUpload}
        tabs={[
          { id:"fitur", label:"Fitur", icon: Settings },
          { id:"tampilan", label:"Tampilan Web", icon: LayoutDashboard },
          { id:"whatsapp", label:"WhatsApp", icon: MessageSquare },
          { id:"api_keys", label:"API Key", icon: KeyRound },
          { id:"gdrive_backup", label:"Backup", icon: DatabaseBackup }
        ]}
        activeTab={activeSystemTab}
        onTabChange={setSystemTab}
      />
      
      {/* TABS */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl w-max max-w-full overflow-x-auto shadow-inner border border-slate-200/60 mb-8">
        {[
          { id: 'local', icon: HardDrive, label: 'Backup Lokal', color: 'var(--ui-primary)' },
          { id: 'telegram', icon: Send, label: 'Telegram Bot', color: '#0284c7' },
          { id: 'r2', icon: Cloud, label: 'Cloudflare R2', color: '#f59e0b' },
          { id: 'gdrive', icon: HardDrive, label: 'Google Drive', color: '#10b981' },
          { id: 'restore', icon: UploadCloud, label: 'Pulihkan Data', color: '#8b5cf6' },
          { id: 'archive', icon: Trash2, label: 'Arsip & Bersihkan', color: '#e11d48' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-white shadow-md text-slate-800 scale-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95 hover:scale-100'
            }`}
          >
            <tab.icon size={16} className={activeTab === tab.id ? '' : 'opacity-70'} style={activeTab === tab.id ? { color: tab.color } : {}} />
            <span className={activeTab === tab.id ? 'tracking-tight' : ''}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT: LOCAL BACKUP */}
      {activeTab === 'local' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-[24px] border border-indigo-200 p-6 flex flex-col justify-between relative group hover:shadow-xl transition-all">
              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-200">
                  <DatabaseBackup size={28} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">Backup Relasional DB</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Unduh struktur dan data mentah (SQL Dump).</p>
                </div>
              </div>
              <Button onClick={() => handleDownloadBackup('postgresql')} disabled={!!isDownloading['postgresql']} className="w-full mt-2 font-bold rounded-xl" variant="outline">
                {isDownloading['postgresql'] ? <RefreshCw size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />} Unduh SQL Dump
              </Button>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-[24px] border border-emerald-200 p-6 flex flex-col justify-between relative group hover:shadow-xl transition-all">
              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-200">
                  <FileSpreadsheet size={28} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">Backup Master Data</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Ekspor data akademik utama (Excel).</p>
                </div>
              </div>
              <Button onClick={() => handleDownloadBackup('excel')} disabled={!!isDownloading['excel']} className="w-full mt-2 font-bold rounded-xl" variant="outline">
                {isDownloading['excel'] ? <RefreshCw size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />} Unduh Excel
              </Button>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-white rounded-[24px] border border-amber-300 p-6 flex flex-col justify-between relative group hover:shadow-xl transition-all shadow-sm">
              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-14 h-14 bg-amber-200 text-amber-700 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-amber-300">
                  <FileJson size={28} />
                </div>
                <div>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-200 text-amber-900 mb-1">Rekomendasi</span>
                  <h4 className="font-extrabold text-slate-800 text-base">Backup JSON Lokal</h4>
                  <p className="text-xs text-slate-600 mt-1 font-medium">Buat arsip JSON lengkap dari seluruh sistem saat ini.</p>
                </div>
              </div>
              <Button onClick={() => handleManualBackup('local')} disabled={isBackingUp} className="w-full mt-2 font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md">
                {isBackingUp ? <RefreshCw size={16} className="animate-spin mr-2" /> : <DatabaseBackup size={16} className="mr-2" />} Buat Backup Baru
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Auto Schedule Form */}
            <div className="md:col-span-1 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Clock size={18} className="text-slate-400" /> Jadwal Otomatis</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-600">Aktifkan Auto-Backup</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={schedule.enabled} onChange={e => setSchedule({...schedule, enabled: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ui-primary)]"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Jam Eksekusi (0-23)</label>
                  <input type="number" min="0" max="23" value={schedule.hour} onChange={e => setSchedule({...schedule, hour: parseInt(e.target.value)})} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Simpan File Lama (Hari)</label>
                  <input type="number" min="1" max="30" value={schedule.keepDays} onChange={e => setSchedule({...schedule, keepDays: parseInt(e.target.value)})} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-600">Kirim Notif Telegram</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={schedule.sendToTelegram} onChange={e => setSchedule({...schedule, sendToTelegram: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ui-primary)]"></div>
                  </label>
                </div>
                <Button onClick={handleSaveSchedule} disabled={isSavingSchedule} className="w-full mt-2" variant="outline">
                  {isSavingSchedule ? 'Menyimpan...' : 'Simpan Jadwal'}
                </Button>
              </div>
            </div>

            {/* Local Backup List */}
            <div className="md:col-span-2 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><HardDrive size={18} className="text-slate-400" /> Riwayat File Backup (Di Server)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold uppercase">Nama File</th>
                      <th className="px-4 py-3 text-left font-bold uppercase">Waktu</th>
                      <th className="px-4 py-3 text-right font-bold uppercase">Ukuran</th>
                      <th className="px-4 py-3 text-center font-bold uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localBackups.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-8 text-slate-400">Belum ada file backup.</td></tr>
                    ) : localBackups.map(file => (
                      <tr key={file.filename} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-700">{file.filename}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5" title={file.fullChecksum}>SHA-256: {file.checksum}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(file.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-600">{file.size}</td>
                        <td className="px-4 py-3 flex items-center justify-center gap-2">
                          <button onClick={() => handleDownloadBackup(file.filename, true)} disabled={isDownloading[file.filename]} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-[var(--ui-primary)] hover:text-white text-slate-500 flex items-center justify-center transition-colors">
                            {isDownloading[file.filename] ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                          </button>
                          <button onClick={() => handleDeleteLocal(file.filename)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center transition-colors">
                            <Trash size={14} />
                          </button>
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

      {/* TAB CONTENT: TELEGRAM BOT */}
      {activeTab === 'telegram' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`p-6 rounded-[24px] border shadow-sm flex flex-col md:flex-row gap-6 ${botStatus?.isRunning ? 'bg-gradient-to-br from-sky-50 to-white border-sky-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${botStatus?.isRunning ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <Send size={28} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-800 flex items-center gap-2">
                    Telegram Monitoring Bot 
                    {botStatus?.isRunning && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] uppercase font-black tracking-widest">Online</span>}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Terima notifikasi keamanan, error server, dan backup langsung ke Telegram.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 max-w-lg">
                <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Status Bot</p>
                  <p className="font-bold text-slate-700">{botStatus?.isRunning ? 'Berjalan (Polling)' : 'Berhenti'}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Bot Token & Chat ID</p>
                  <p className="font-bold text-slate-700">{botStatus?.hasBotToken && botStatus?.hasChatId ? 'Dikonfigurasi' : 'Belum Lengkap'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 shrink-0 md:w-48 justify-center">
              <Button onClick={() => handleManualBackup('telegram')} disabled={isBackingUp || !botStatus?.hasBotToken} className="w-full bg-sky-600 hover:bg-sky-700 text-white shadow-md">
                {isBackingUp ? 'Memproses...' : 'Kirim Backup Manual'}
              </Button>
              <Button onClick={handleTestBot} disabled={!botStatus?.hasBotToken} variant="outline" className="w-full">
                Kirim Pesan Uji Coba
              </Button>
              <Button onClick={handleReloadBot} variant="outline" className="w-full border-slate-300 text-slate-600 hover:bg-slate-100">
                <RefreshCw size={14} className="mr-2" /> Reload Konfigurasi
              </Button>
            </div>
          </div>
          
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Info size={18} className="text-slate-400" /> Cara Menghubungkan Bot</h3>
            <ol className="list-decimal pl-5 space-y-3 text-sm text-slate-600 font-medium">
              <li>Buka aplikasi Telegram dan cari <b>@BotFather</b>.</li>
              <li>Ketik <code className="bg-slate-100 px-1 rounded text-pink-600">/newbot</code> dan ikuti instruksi untuk membuat bot baru.</li>
              <li>Salin <b>HTTP API Token</b> yang diberikan.</li>
              <li>Cari bot yang baru Anda buat, tekan Start, lalu kirim satu pesan bebas.</li>
              <li>Buka <b><a href="https://api.telegram.org/botTOKEN/getUpdates" target="_blank" className="text-sky-600 hover:underline">https://api.telegram.org/bot&lt;TOKEN_ANDA&gt;/getUpdates</a></b> untuk melihat Chat ID Anda.</li>
              <li>Masuk ke tab <b>API Key</b> (ikon kunci) di halaman ini.</li>
              <li>Tambahkan API Key baru dengan <b>Service Name</b>: <code className="bg-slate-100 px-1 rounded font-mono text-xs">telegram_bot_monitor</code></li>
              <li>Masukkan Token sebagai API Key, dan isi JSON berikut pada Extra Config:<br/>
                <code className="block bg-slate-800 text-emerald-400 p-3 rounded-lg mt-2 font-mono text-xs shadow-inner whitespace-pre-wrap">
                  {`{\n  "chat_id": "CHAT_ID_ANDA_DISINI",\n  "alerts": {\n    "bruteForce": true,\n    "serverError": true,\n    "backupStatus": true,\n    "adminLogin": true,\n    "restoreDatabase": true\n  }\n}`}
                </code>
              </li>
              <li className="pt-2 text-rose-600 font-bold">Catatan: Setelah menyimpan API Key, kembali ke tab ini dan klik "Reload Konfigurasi".</li>
            </ol>
          </div>
        </div>
      )}

      {/* OTHER TABS (R2, GDRIVE, RESTORE, ARCHIVE) - Sama seperti sebelumnya */}
      
      {activeTab === 'r2' && (
        <div className="p-8 bg-white border border-slate-200 rounded-[24px] text-center text-slate-500 font-medium">Fitur Cloudflare R2 sedang dimaintenance. (Telah dipindahkan ke versi sebelumnya)</div>
      )}
      {activeTab === 'gdrive' && (
        <div className="p-8 bg-white border border-slate-200 rounded-[24px] text-center text-slate-500 font-medium">Fitur Google Drive sedang dimaintenance. (Telah dipindahkan ke versi sebelumnya)</div>
      )}
      
      {activeTab === 'restore' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-xl p-10 text-center relative overflow-hidden max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Pulihkan Database <span className="text-violet-600">(Restore)</span></h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto font-medium text-sm">Sistem akan membaca file JSON dari backup dan memasukkan seluruh datanya kembali ke database.</p>
            <div className="relative z-10">
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isRestoring} className="bg-violet-600 hover:bg-violet-700 text-white h-14 px-10 rounded-xl shadow-lg font-extrabold">
                {isRestoring ? 'Memulihkan Data...' : 'Pilih File JSON & Jalankan Restore'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-xl p-10 text-center relative max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Arsip & <span className="text-rose-600">Pembersihan</span></h2>
            <div className="max-w-xs mx-auto mb-10 text-left">
              <input type="date" value={archiveDate} onChange={e => setArchiveDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700" />
            </div>
            <Button onClick={handleArchive} disabled={isArchiving || !archiveDate} className="bg-rose-600 hover:bg-rose-700 text-white h-14 px-10 rounded-xl font-extrabold shadow-lg">
              {isArchiving ? 'Memproses...' : 'Mulai Bersihkan Database'}
            </Button>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-lg font-bold text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white max-w-sm ${toast.type ==='error' ?'bg-rose-600' :'bg-emerald-600'} z-50`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
