import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useRef } from'react';
import { CloudUpload, Settings, LayoutDashboard, KeyRound, DatabaseBackup, MessageSquare } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { HardDrive, Send, Cloud, UploadCloud, Trash2, FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw, Info, Shield, Calendar, FileJson, Sparkles } from 'lucide-react';
import { PageHeader } from '../../../components/monitoring/ui/index.js';
;


export default function BackupGDrive({ activeTab: activeSystemTab, setActiveTab: setSystemTab }) {
  const [activeTab, setActiveTab] = useState('local'); //'local','telegram','r2','gdrive','restore','archive'
  
  const [isTelegramConfigured, setIsTelegramConfigured] = useState(false);
  const [isR2Configured, setIsR2Configured] = useState(false);
  const [isGDriveConfigured, setIsGDriveConfigured] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveDate, setArchiveDate] = useState('');
  const [isDownloading, setIsDownloading] = useState({});
  
  const [backupLogs, setBackupLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  
  const authToken = useAuthStore(state => state.user?.authToken);

  const showToast = (msg, type ='success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    const checkConfig = async () => {
      if (!authToken) return;
      try {
        const res = await fetch('/api/api-keys', { headers: { Authorization: `Bearer ${authToken}` } });
        const data = await res.json();
        if (data.ok) {
          const telegramKey = (data.data || []).find(k => k.service_name ==='telegram_backup' && k.is_active);
          const r2Key = (data.data || []).find(k => k.service_name ==='cloudflare_r2' && k.is_active);
          const gdriveKey = (data.data || []).find(k => k.service_name ==='google_drive' && k.is_active);
          setIsTelegramConfigured(!!telegramKey);
          setIsR2Configured(!!r2Key);
          setIsGDriveConfigured(!!gdriveKey);
        }
      } catch (e) { console.error(e); }
      setIsCheckingConfig(false);
    };
    checkConfig();
    
    // Default 6 months ago for archive
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    setArchiveDate(d.toISOString().split('T')[0]);
  }, [authToken]);

  const handleManualBackup = async (type) => {
    setIsBackingUp(true);
    let apiEndpoint ='';
    let label ='';
    if (type ==='telegram') { apiEndpoint ='/api/backup-telegram'; label ='Telegram'; }
    if (type ==='gdrive') { apiEndpoint ='/api/backup-gdrive'; label ='Google Drive'; }
    if (type ==='r2') { apiEndpoint ='/api/backup-r2'; label ='Cloudflare R2'; }
    
    showToast(`Memulai backup ke ${label}...`,'success');
    
    try {
      const res = await fetch(apiEndpoint, {
        method:'POST',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      
      if (data.ok) {
        const newLog = { 
          id: Date.now(), type: label, status:'success', filename: data.data.filename, size: data.data.size, created_at: new Date().toISOString() 
        };
        setBackupLogs(prev => [newLog, ...prev]);
        showToast(`Backup berhasil dikirim ke ${label}! 🎉`);
      } else {
        showToast(data.error ||'Terjadi kesalahan saat mem-backup.','error');
      }
    } catch (e) {
      showToast('Gagal memanggil API backup.','error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      showToast('File backup harus berformat .json','error');
      return;
    }

    if (!await window.confirmAsync('PERINGATAN: Memulihkan database akan menimpa SEMUA data yang ada saat ini. Apakah Anda yakin?')) {
      e.target.value ='';
      return;
    }

    setIsRestoring(true);
    showToast('Memulihkan database, mohon tunggu...','success');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target.result;
        JSON.parse(jsonContent);
        
        const res = await fetch('/api/restore-backup', {
          method:'POST',
          headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
          body: jsonContent
        });
        const data = await res.json();
        
        if (data.ok) {
          showToast('Database berhasil dipulihkan! 🎉');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          showToast(data.error ||'Terjadi kesalahan saat memulihkan.','error');
        }
      } catch (e) {
        showToast('File tidak valid atau gagal terhubung ke server.','error');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
    e.target.value ='';
  };

  const handleArchive = async () => {
    if (!archiveDate) return;
    if (!await window.confirmAsync(`PERINGATAN KRITIKAL! Anda akan MENGHAPUS PERMANEN seluruh data log/absensi yang dibuat sebelum tanggal ${archiveDate}. Data ini akan diunggah ke Cloud sebagai arsip. Lanjutkan?`)) {
      return;
    }
    
    setIsArchiving(true);
    showToast('Memulai proses pengarsipan dan pembersihan...','success');
    
    try {
      const res = await fetch('/api/archive-data', {
        method:'POST',
        headers: { Authorization: `Bearer ${authToken}`,'Content-Type':'application/json' },
        body: JSON.stringify({ dateBefore: archiveDate +'T00:00:00Z' })
      });
      const data = await res.json();
      
      if (data.ok) {
        showToast(data.message);
      } else {
        showToast(data.error ||'Gagal melakukan pembersihan.','error');
      }
    } catch (e) {
      showToast('Gagal memanggil API.','error');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDownloadBackup = async (type) => {
    if (isDownloading[type]) return; // Prevent duplicate downloads
    const token = authToken || JSON.parse(sessionStorage.getItem('school_schedule_session_v1') || '{}')?.authToken || '';
    // Keamanan: token TIDAK boleh di query string (bocor ke log). Kirim hanya via Authorization header.
    const url = `/api/backup/${type}`;
    setIsDownloading(prev => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        showToast(errJson?.error || `Gagal mengunduh backup ${type}.`, 'error');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const dateStr = new Date().toISOString().slice(0, 10);
      const ext = type === 'excel' ? 'xlsx' : type === 'json' ? 'json' : 'sql';
      link.download = `kurmon_backup_${type}_${dateStr}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      
      const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2) + ' MB';
      const label = type === 'excel' ? 'Excel Export' : type === 'json' ? 'JSON Backup' : 'SQL Dump';
      const newLog = { 
        id: Date.now(), 
        type: 'Download Lokal', 
        status: 'success', 
        filename: `kurmon_backup_${type}_${dateStr}.${ext}`, 
        size: fileSizeMB, 
        created_at: new Date().toISOString() 
      };
      setBackupLogs(prev => [newLog, ...prev]);
      
      showToast(`Berhasil mengunduh backup ${type.toUpperCase()}!`);
    } catch (err) {
      showToast(`Gagal mengunduh backup ${type}.`, 'error');
    } finally {
      setIsDownloading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300 z-10">
      <PageHeader 
        title="Manajemen Backup & Arsip"
        description="Kelola pencadangan database sekolah ke berbagai platform (R2, Telegram, GDrive) dan bersihkan data lampau."
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
      
      {/* TABS (Premium Pill Design) */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl w-max max-w-full overflow-x-auto shadow-inner border border-slate-200/60 mb-8">
        {[
          { id: 'local', icon: HardDrive, label: 'Backup Lokal', color: 'var(--ui-primary)' },
          { id: 'telegram', icon: Send, label: 'Telegram', color: '#0284c7' },
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
      {activeTab ==='local' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Excel Master Data Backup */}
            <div className="bg-white rounded-[24px] border border-slate-200 p-6 flex flex-col justify-between relative group hover:border-emerald-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-14 h-14 bg-emerald-100/80 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-200/50">
                  <FileSpreadsheet size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">Backup Master Data</h4>
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full mt-1 mb-2 border border-slate-200 uppercase tracking-wide">Format Excel</span>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Ekspor seluruh data akademik primer (Jurusan, Kelas, Guru, Mapel, Ruangan, Beban, Sesi) ke dalam format dokumen Excel multi-sheet.
                  </p>
                </div>
              </div>
              <Button variant="outline" 
                onClick={() => handleDownloadBackup('excel')}
                disabled={!!isDownloading['excel']}
                className="w-full mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-bold rounded-xl relative z-10"
              >
                {isDownloading['excel'] ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                {isDownloading['excel'] ? 'Mengunduh...' : 'Unduh Excel (.xlsx)'}
              </Button>
            </div>

            {/* Card 2: PostgreSQL Dump Backup */}
            <div className="bg-white rounded-[24px] border border-slate-200 p-6 flex flex-col justify-between relative group hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-14 h-14 bg-indigo-100/80 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-200/50">
                  <DatabaseBackup size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">Backup Relasional DB</h4>
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full mt-1 mb-2 border border-slate-200 uppercase tracking-wide">PostgreSQL Dump</span>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Unduh skrip skema relasional lengkap beserta seluruh record/baris data (DML SQL) untuk pemulihan cepat.
                  </p>
                </div>
              </div>
              <Button variant="outline" 
                onClick={() => handleDownloadBackup('postgresql')}
                disabled={!!isDownloading['postgresql']}
                className="w-full mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-bold rounded-xl relative z-10"
              >
                {isDownloading['postgresql'] ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                {isDownloading['postgresql'] ? 'Mengunduh...' : 'Unduh SQL Dump (.sql)'}
              </Button>
            </div>

            {/* Card 3: Full Backup JSON (Restorasi 1-Klik Pindah Server) */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-[24px] border border-amber-200 p-6 flex flex-col justify-between relative group hover:border-amber-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-60 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-amber-200/60">
                  <FileJson size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200 text-amber-900 mb-1 shadow-sm">
                    <Sparkles size={10} className="text-amber-800" />
                    <span>Rekomendasi Pindah Server</span>
                  </span>
                  <h4 className="font-extrabold text-slate-800 text-base">Full Backup Portabel</h4>
                  <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                    Unduh **seluruh data sistem** (DB, Pengaturan, Akun User, Absensi, Jurnal). Unggah file ini di menu "Pulihkan Data" untuk **Impor 1-Klik**!
                  </p>
                </div>
              </div>
              <Button variant="outline" 
                onClick={() => handleDownloadBackup('json')}
                disabled={!!isDownloading['json']}
                className="w-full mt-4 flex items-center justify-center gap-2 cursor-pointer border-amber-300 text-amber-800 bg-amber-100/50 hover:bg-amber-200/70 font-extrabold rounded-xl relative z-10 shadow-sm"
              >
                {isDownloading['json'] ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                {isDownloading['json'] ? 'Mengunduh...' : 'Unduh Full Backup JSON (.json)'}
              </Button>
            </div>

          </div>
        </div>
      )}


      {/* TAB CONTENT: TELEGRAM */}
      {activeTab ==='telegram' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!isCheckingConfig && (
            <div className={`p-6 rounded-[24px] border flex items-center justify-between gap-6 shadow-sm transition-all duration-300 ${isTelegramConfigured ?'bg-gradient-to-br from-sky-50 to-white border-sky-200' :'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isTelegramConfigured ?'bg-sky-500 text-white shadow-sky-200' :'bg-slate-200 text-slate-500'}`}>
                  <Send size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <p className={`font-extrabold text-lg flex items-center gap-2 ${isTelegramConfigured ?'text-sky-900' :'text-slate-700'}`}>
                    {isTelegramConfigured ? (
                      <><span>Telegram Terhubung Aktif</span><CheckCircle2 size={18} className="text-sky-500" /></>
                    ) : (
                      <span>Telegram Belum Dikonfigurasi</span>
                    )}
                  </p>
                  <p className={`text-sm mt-1 font-medium ${isTelegramConfigured ?'text-sky-600/80' :'text-slate-500'}`}>
                    {isTelegramConfigured
                      ?'Backup otomatis setiap hari pukul 02:00 WIB. Data terkirim aman ke obrolan Telegram Anda secara gratis tanpa batasan limit.'
                      :'Tambahkan API Key Telegram di menu Manajemen API Key → pilih "Telegram Auto-Backup" untuk mengaktifkan fitur ini.'}
                  </p>
                </div>
              </div>
              <Button onClick={() =>handleManualBackup('telegram')} disabled={isBackingUp || !isTelegramConfigured} className="flex items-center gap-2 shrink-0 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-md h-11 px-6 font-bold disabled:opacity-50">
                {isBackingUp ? <RefreshCw size={18} className="animate-spin" /> : <CloudUpload size={18} />} Backup Manual
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: R2 */}
      {activeTab ==='r2' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!isCheckingConfig && (
            <div className={`p-6 rounded-[24px] border flex items-center justify-between gap-6 shadow-sm transition-all duration-300 ${isR2Configured ?'bg-gradient-to-br from-amber-50 to-white border-amber-300' :'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isR2Configured ?'bg-amber-500 text-white shadow-amber-200' :'bg-slate-200 text-slate-500'}`}>
                  <Cloud size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <p className={`font-extrabold text-lg flex items-center gap-2 ${isR2Configured ?'text-amber-900' :'text-slate-700'}`}>
                    {isR2Configured ? (
                      <><span>Cloudflare R2 Terhubung Aktif</span><CheckCircle2 size={18} className="text-amber-500" /></>
                    ) : (
                      <span>Cloudflare R2 Belum Dikonfigurasi</span>
                    )}
                  </p>
                  <p className={`text-sm mt-1 font-medium ${isR2Configured ?'text-amber-700/80' :'text-slate-500'}`}>
                    {isR2Configured
                      ?'Backup otomatis aktif setiap hari pukul 02:00 WIB. File tersimpan aman di Cloudflare (AWS S3) tanpa biaya egress.'
                      :'Tambahkan API Key di menu Manajemen API Key → pilih "Cloudflare R2 Backup".'}
                  </p>
                </div>
              </div>
              <Button onClick={() =>handleManualBackup('r2')} disabled={isBackingUp || !isR2Configured} className="flex items-center gap-2 shrink-0 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md h-11 px-6 font-bold disabled:opacity-50">
                {isBackingUp ? <RefreshCw size={18} className="animate-spin" /> : <CloudUpload size={18} />} Backup Manual
              </Button>
            </div>
          )}

          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>
            <h2 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center gap-2 relative z-10">
              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[var(--ui-primary)]"><Info size={18} /></span> 
              Cara Setup Cloudflare R2 Gratis (10GB)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {[
                { step:'1', title:'Buat Akun Cloudflare', desc:'Daftar di cloudflare.com, masuk to menu R2 Object Storage.' },
                { step:'2', title:'Buat Bucket Baru', desc:'Buat Bucket baru (misal: kurmon-backup). Catat nama bucket ini.' },
                { step:'3', title:'Dapatkan Kredensial', desc:'Pilih "Manage R2 API Tokens", buat token dengan akses Admin Read & Write. Anda akan mendapatkan Access Key dan Secret Key.' },
                { step:'4', title:'Dapatkan Endpoint URL', desc:'Di halaman dashboard R2, Anda akan melihat URL Endpoint (contoh: https://<account_id>.r2.cloudflarestorage.com).' },
                { step:'5', title:'Simpan di Sistem', desc:'Salin semua data tersebut dan simpan di Manajemen API Key.' },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                  <span className="w-8 h-8 rounded-full bg-[var(--ui-primary)] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm shadow-[var(--ui-primary)]">{item.step}</span>
                  <div>
                    <p className="font-extrabold text-slate-700 text-sm mb-1">{item.title}</p>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: G DRIVE */}
      {activeTab ==='gdrive' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!isCheckingConfig && (
            <div className={`p-6 rounded-[24px] border flex items-center justify-between gap-6 shadow-sm transition-all duration-300 ${isGDriveConfigured ?'bg-gradient-to-br from-emerald-50 to-white border-emerald-300' :'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isGDriveConfigured ?'bg-emerald-500 text-white shadow-emerald-200' :'bg-slate-200 text-slate-500'}`}>
                  <HardDrive size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <p className={`font-extrabold text-lg flex items-center gap-2 ${isGDriveConfigured ?'text-emerald-900' :'text-slate-700'}`}>
                    {isGDriveConfigured ? (
                      <><span>Google Drive Terhubung Aktif</span><CheckCircle2 size={18} className="text-emerald-500" /></>
                    ) : (
                      <span>GDrive Belum Dikonfigurasi</span>
                    )}
                  </p>
                  <p className={`text-sm mt-1 font-medium ${isGDriveConfigured ?'text-emerald-700/80' :'text-slate-500'}`}>
                    {isGDriveConfigured
                      ?'Backup otomatis aktif setiap hari pukul 02:00 WIB. File tersimpan langsung di folder Google Drive Anda.'
                      :'PENTING: Hanya untuk akun Google Workspace (belajar.id). Akun @gmail.com standar tidak bisa digunakan untuk Service Account.'}
                  </p>
                </div>
              </div>
              <Button onClick={() =>handleManualBackup('gdrive')} disabled={isBackingUp || !isGDriveConfigured} className="flex items-center gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md h-11 px-6 font-bold disabled:opacity-50">
                {isBackingUp ? <RefreshCw size={18} className="animate-spin" /> : <CloudUpload size={18} />} Backup Manual
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: RESTORE */}
      {activeTab ==='restore' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-xl shadow-slate-200/40 p-10 text-center relative overflow-hidden max-w-3xl mx-auto">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-100 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-rose-100 rounded-full blur-3xl opacity-60"></div>
            
            <div className="w-24 h-24 bg-violet-100 text-violet-600 rounded-[28px] rotate-3 hover:rotate-0 transition-transform duration-300 flex items-center justify-center mx-auto mb-8 shadow-sm border border-violet-200">
              <UploadCloud size={44} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3 relative z-10">Pulihkan Database <span className="text-violet-600">(Restore)</span></h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto font-medium text-sm leading-relaxed relative z-10">
              Sistem akan membaca file JSON dari backup dan memasukkan seluruh datanya kembali ke database. Ini adalah fitur paling aman untuk migrasi data antar server.
            </p>
            
            <div className="inline-block p-5 bg-rose-50/80 backdrop-blur border border-rose-200/80 rounded-2xl text-left mb-10 max-w-lg relative z-10 shadow-sm">
              <p className="text-sm font-black text-rose-700 flex items-center gap-2 mb-2 uppercase tracking-wide"><AlertCircle size={18} /> PERINGATAN KRITIKAL!</p>
              <p className="text-sm font-medium text-rose-600/90 leading-relaxed">
                Melakukan restore akan <b>MENGHAPUS SELURUH DATA</b> saat ini dan menggantinya dengan data dari file JSON yang diunggah. Pastikan file JSON yang Anda pilih sudah benar!
              </p>
            </div>

            <div className="relative z-10">
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <Button onClick={() =>fileInputRef.current?.click()} disabled={isRestoring} className="flex items-center justify-center gap-2 mx-auto bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-200 h-14 px-10 text-base font-extrabold disabled:opacity-60 transition-transform hover:-translate-y-1">
                {isRestoring ? <RefreshCw size={22} className="animate-spin" /> : <Shield size={22} />}
                {isRestoring ? 'Memulihkan Data ke Database...' : 'Pilih File JSON & Jalankan Restore'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ARCHIVE */}
      {activeTab ==='archive' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-xl shadow-slate-200/40 p-10 text-center relative overflow-hidden max-w-3xl mx-auto">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-rose-50 rounded-full blur-3xl opacity-60"></div>
            
            <div className="w-24 h-24 bg-rose-100/80 text-rose-600 rounded-[28px] rotate-3 hover:rotate-0 transition-transform duration-300 flex items-center justify-center mx-auto mb-8 shadow-sm border border-rose-200/60">
              <Trash2 size={44} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3 relative z-10">Arsip & <span className="text-rose-600">Pembersihan</span> (Purging)</h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto font-medium text-sm leading-relaxed relative z-10">
              Fitur ini akan menarik miliaran data log/absensi lampau, membungkusnya menjadi JSON Arsip ke Cloud, lalu menghapusnya secara permanen dari server agar sistem kembali super cepat.
            </p>
            
            <div className="inline-block p-5 bg-amber-50/80 backdrop-blur border border-amber-200/80 rounded-2xl text-left mb-8 max-w-lg relative z-10 shadow-sm">
              <p className="text-sm font-black text-amber-700 flex items-center gap-2 mb-2 uppercase tracking-wide"><AlertCircle size={18} /> Syarat Keamanan Pembersihan</p>
              <p className="text-sm font-medium text-amber-700/80 leading-relaxed">
                Pembersihan hanya dapat dijalankan jika Anda telah menghubungkan salah satu layanan penyimpanan Cloud <b>(Cloudflare R2 atau Telegram)</b>. Data tidak akan dihapus jika proses unggah ke awan gagal!
              </p>
            </div>

            <div className="max-w-xs mx-auto mb-10 text-left relative z-10">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Tarik Semua Log Sebelum Tanggal:</label>
              <div className="relative">
                <input type="date" value={archiveDate} onChange={e => setArchiveDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all shadow-inner" />
                <Calendar size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div className="relative z-10">
              <Button onClick={handleArchive} disabled={isArchiving || !archiveDate || (!isTelegramConfigured && !isR2Configured)} className="flex items-center justify-center gap-2 mx-auto bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-200 h-14 px-10 text-base font-extrabold disabled:opacity-60 transition-transform hover:-translate-y-1">
                {isArchiving ? <RefreshCw size={22} className="animate-spin text-white" /> : <Trash2 size={22} className="text-white" />}
                <span className="text-white">{isArchiving ? 'Memproses Arsip ke Cloud...' : 'Mulai Bersihkan Database'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LOGS TABLE (Shared) */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden mt-8 mb-10">
        <div className="px-7 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-extrabold text-slate-800 flex items-center gap-3 text-base">
            <div className="w-8 h-8 rounded-lg bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] flex items-center justify-center">
              <Calendar size={16} strokeWidth={2.5} />
            </div>
            Riwayat Eksekusi <span className="text-slate-400 font-medium text-sm ml-2">(Sesi Ini)</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-7 py-4 font-black text-left uppercase tracking-wider">Platform/Tipe</th>
                <th className="px-7 py-4 font-black text-left uppercase tracking-wider">File Backup (Ref)</th>
                <th className="px-7 py-4 font-black text-center uppercase tracking-wider">Ukuran</th>
                <th className="px-7 py-4 font-black text-center uppercase tracking-wider">Status Akhir</th>
              </tr>
            </thead>
            <tbody>
              {backupLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-7 py-12 text-center">
                    <div className="inline-flex flex-col items-center justify-center text-slate-400">
                      <Calendar size={32} strokeWidth={1.5} className="mb-3 opacity-50" />
                      <p className="font-medium text-sm">Belum ada riwayat aktivitas di sesi ini.</p>
                    </div>
                  </td>
                </tr>
              ) : backupLogs.map((log, i) => (
                <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${i !== backupLogs.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <td className="px-7 py-4">
                    <div className="font-extrabold text-sm text-slate-800">{log.type}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{new Date(log.created_at).toLocaleTimeString('id-ID')} WIB</div>
                  </td>
                  <td className="px-7 py-4 font-mono text-xs text-slate-600 bg-slate-50/50">{log.filename}</td>
                  <td className="px-7 py-4 text-center text-slate-600 font-bold text-xs">{log.size || '-'}</td>
                  <td className="px-7 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm border ${log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                      {log.status === 'success' ? <CheckCircle2 size={12} strokeWidth={3} /> : <AlertCircle size={12} strokeWidth={3} />}
                      {log.status === 'success' ? 'Berhasil' : 'Gagal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white max-w-sm ${toast.type ==='error' ?'bg-rose-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
