import { Button } from '../../../components/ui.jsx';
import { useState, useEffect, useRef } from'react';
import { CloudUpload, Settings, LayoutDashboard, KeyRound, DatabaseBackup, MessageSquare } from'lucide-react';
import useAuthStore from'../../../store/monitoring/authStore.js';
import { HardDrive, Send, Cloud, UploadCloud, Trash2, FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw, Info, Shield, Calendar } from'lucide-react';
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
      
      {/* TABS */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
        <Button variant="outline" onClick={() =>setActiveTab('local')} className={`${activeTab ==='local' ?'border-[var(--ui-primary)] text-[var(--ui-primary)]' :'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center gap-2"><HardDrive size={16} /> Backup Lokal</div></Button>
        <Button variant="outline" onClick={() =>setActiveTab('telegram')} className={`${activeTab ==='telegram' ?'border-[var(--ui-primary)] text-[var(--ui-primary)]' :'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center gap-2"><Send size={16} /> Telegram</div></Button>
        <Button variant="outline" onClick={() =>setActiveTab('r2')} className={`${activeTab ==='r2' ?'border-[var(--ui-primary)] text-[var(--ui-primary)]' :'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center gap-2"><Cloud size={16} /> Cloudflare R2</div></Button>
        <Button variant="outline" onClick={() =>setActiveTab('gdrive')} className={`${activeTab ==='gdrive' ?'border-[var(--ui-primary)] text-[var(--ui-primary)]' :'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center gap-2"><HardDrive size={16} /> Google Drive</div></Button>
        <Button variant="outline" onClick={() =>setActiveTab('restore')} className={`${activeTab ==='restore' ?'border-[var(--ui-primary)] text-[var(--ui-primary)]' :'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center gap-2"><UploadCloud size={16} /> Pulihkan Data</div></Button>
        <Button variant="outline" onClick={() =>setActiveTab('archive')} className={`${activeTab ==='archive' ?'border-red-500 text-red-600' :'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <div className="flex items-center gap-2"><Trash2 size={16} /> Arsip & Bersihkan</div></Button>
      </div>

      {/* TAB CONTENT: LOCAL BACKUP */}
      {activeTab ==='local' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Excel Master Data Backup */}
            <div className="ui-card p-6 flex flex-col justify-between relative group hover:border-[var(--ui-primary)] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Backup Master Data (Format Excel)</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                    Ekspor seluruh data akademik primer (Jurusan, Kelas, Guru, Mapel, Ruangan, Beban, Modul Ajar, Sesi Belajar, Ketersediaan) ke dalam format dokumen Excel (.xlsx) multi-sheet.
                  </p>
                </div>
              </div>
              <Button variant="outline" 
                onClick={() =>{
                  window.open(`/api/backup/excel?token=${authToken ||''}`,'_blank');
                }}
                className="w-full mt-4 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={14} /> Unduh Master Data Excel (.xlsx)</Button>
            </div>

            {/* Card 2: PostgreSQL Dump Backup */}
            <div className="ui-card p-6 flex flex-col justify-between relative group hover:border-[var(--ui-primary)] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0">
                  <DatabaseBackup size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Backup Relasional Database (PostgreSQL Dump)</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                    Unduh skrip skema relasional lengkap beserta seluruh record/baris data (DML SQL) dari PostgreSQL untuk pemulihan database penuh secara cepat.
                  </p>
                </div>
              </div>
              <Button variant="outline" 
                onClick={() =>{
                  window.open(`/api/backup/postgresql?token=${authToken ||''}`,'_blank');
                }}
                className="w-full mt-4 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={14} /> Unduh Database Dump SQL (.sql)</Button>
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: TELEGRAM */}
      {activeTab ==='telegram' && (
        <div className="space-y-6 animate-in fade-in">
          {!isCheckingConfig && (
            <div className={`p-5 rounded-[var(--ui-radius-small)] border-2 flex items-start justify-between gap-4 ${isTelegramConfigured ?'bg-emerald-50 border-emerald-300' :'bg-amber-50 border-amber-300'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${isTelegramConfigured ?'bg-emerald-100' :'bg-amber-100'}`}>
                  {isTelegramConfigured ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-amber-600" />}
                </div>
                <div>
                  <p className={`font-bold flex items-center gap-1.5 ${isTelegramConfigured ?'text-emerald-700' :'text-amber-700'}`}>
                    {isTelegramConfigured ? (
                      <>
                        <span>Telegram Terhubung</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </>
                    ) : (
                      <span>Telegram Belum Dikonfigurasi</span>
                    )}
                  </p>
                  <p className={`text-sm mt-0.5 ${isTelegramConfigured ?'text-emerald-600' :'text-amber-600'}`}>
                    {isTelegramConfigured
                      ?'Backup otomatis aktif setiap hari pukul 02:00 WIB. Data terkirim ke obrolan Telegram Anda secara gratis dan bebas limit.'
                      :'Tambahkan API Key Telegram di menu Manajemen API Key → pilih"Telegram Auto-Backup".'}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() =>handleManualBackup('telegram')} disabled={isBackingUp || !isTelegramConfigured} className="flex items-center gap-2 shrink-0">
                {isBackingUp ? <RefreshCw size={14} className="animate-spin" /> : <CloudUpload size={14} />} Backup Telegram</Button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: R2 */}
      {activeTab ==='r2' && (
        <div className="space-y-6 animate-in fade-in">
          {!isCheckingConfig && (
            <div className={`p-5 rounded-[var(--ui-radius-small)] border-2 flex items-start justify-between gap-4 ${isR2Configured ?'bg-emerald-50 border-emerald-300' :'bg-amber-50 border-amber-300'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${isR2Configured ?'bg-emerald-100' :'bg-amber-100'}`}>
                  {isR2Configured ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-amber-600" />}
                </div>
                <div>
                  <p className={`font-bold flex items-center gap-1.5 ${isR2Configured ?'text-emerald-700' :'text-amber-700'}`}>
                    {isR2Configured ? (
                      <>
                        <span>Cloudflare R2 Terhubung</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </>
                    ) : (
                      <span>Cloudflare R2 Belum Dikonfigurasi</span>
                    )}
                  </p>
                  <p className={`text-sm mt-0.5 ${isR2Configured ?'text-emerald-600' :'text-amber-600'}`}>
                    {isR2Configured
                      ?'Backup otomatis aktif setiap hari pukul 02:00 WIB. File tersimpan aman di Cloudflare (AWS S3) tanpa biaya egress.'
                      :'Tambahkan API Key di menu Manajemen API Key → pilih"Cloudflare R2 Backup".'}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() =>handleManualBackup('r2')} disabled={isBackingUp || !isR2Configured} className="flex items-center gap-2 shrink-0">
                {isBackingUp ? <RefreshCw size={14} className="animate-spin" /> : <CloudUpload size={14} />} Backup R2</Button>
            </div>
          )}

          <div className="bg-white rounded-xl border-none shadow-sm p-6">
            <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Info size={16} className="text-[var(--ui-primary)]" /> Cara Setup Cloudflare R2</h2>
            <ol className="space-y-3">
              {[
                { step:'1', title:'Buat Akun Cloudflare', desc:'Daftar di cloudflare.com, masuk to menu R2 Object Storage.' },
                { step:'2', title:'Buat Bucket Baru', desc:'Buat Bucket baru (misal: kurmon-backup). Catat nama bucket ini.' },
                { step:'3', title:'Dapatkan Kredensial', desc:'Pilih"Manage R2 API Tokens", buat token dengan akses Admin Read & Write. Anda akan mendapatkan Access Key dan Secret Key.' },
                { step:'4', title:'Dapatkan Endpoint URL', desc:'Di halaman dashboard R2, Anda akan melihat URL Endpoint (contoh: https://<account_id>.r2.cloudflarestorage.com).' },
                { step:'5', title:'Simpan di Sistem', desc:'Salin semua data tersebut dan simpan di Manajemen API Key.' },
              ].map(item => (
                <li key={item.step} className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full bg-[var(--ui-primary)] text-white font-black text-sm flex items-center justify-center shrink-0">{item.step}</span>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* TAB CONTENT: G DRIVE */}
      {activeTab ==='gdrive' && (
        <div className="space-y-6 animate-in fade-in">
          {!isCheckingConfig && (
            <div className={`p-5 rounded-[var(--ui-radius-small)] border-2 flex items-start justify-between gap-4 ${isGDriveConfigured ?'bg-emerald-50 border-emerald-300' :'bg-amber-50 border-amber-300'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-[var(--ui-radius-small)] flex items-center justify-center shrink-0 ${isGDriveConfigured ?'bg-emerald-100' :'bg-amber-100'}`}>
                  {isGDriveConfigured ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-amber-600" />}
                </div>
                <div>
                  <p className={`font-bold flex items-center gap-1.5 ${isGDriveConfigured ?'text-emerald-700' :'text-amber-700'}`}>
                    {isGDriveConfigured ? (
                      <>
                        <span>Google Drive Terhubung</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </>
                    ) : (
                      <span>GDrive Belum Dikonfigurasi</span>
                    )}
                  </p>
                  <p className={`text-sm mt-0.5 ${isGDriveConfigured ?'text-emerald-600' :'text-amber-600'}`}>
                    {isGDriveConfigured
                      ?'Backup otomatis aktif setiap hari pukul 02:00 WIB. File tersimpan di folder Google Drive Anda.'
                      :'PENTING: Hanya untuk akun Google Workspace (belajar.id). Akun @gmail.com tidak bisa.'}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() =>handleManualBackup('gdrive')} disabled={isBackingUp || !isGDriveConfigured} className="flex items-center gap-2 shrink-0">
                {isBackingUp ? <RefreshCw size={14} className="animate-spin" /> : <CloudUpload size={14} />} Backup GDrive</Button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: RESTORE */}
      {activeTab ==='restore' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-xl border-none shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-[var(--ui-primary)]/10 text-[var(--ui-primary)] rounded-full flex items-center justify-center mx-auto mb-6">
              <UploadCloud size={36} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Pulihkan Database (Restore)</h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">
              Sistem akan membaca file JSON dari backup dan memasukkan seluruh datanya kembali ke database.
            </p>
            
            <div className="inline-block p-4 bg-red-50 border border-red-200 rounded-[var(--ui-radius-small)] text-left mb-8 max-w-lg">
              <p className="text-sm font-bold text-red-700 flex items-center gap-2 mb-1"><AlertCircle size={16} /> PERINGATAN KRITIKAL!</p>
              <p className="text-xs text-red-600 leading-relaxed">
                Melakukan restore akan <b>MENGHAPUS SELURUH DATA</b> saat ini dan menggantinya dengan data dari file JSON yang diunggah.
              </p>
            </div>

            <div>
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <Button variant="outline" onClick={() =>fileInputRef.current?.click()} disabled={isRestoring} size="lg" className="flex items-center justify-center gap-2 mx-auto">
                {isRestoring ? <RefreshCw size={18} className="animate-spin" /> : <Shield size={18} />}
                {isRestoring ?'Memulihkan Data...' :'Pilih File JSON & Restore'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ARCHIVE */}
      {activeTab ==='archive' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-xl border-none shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={36} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Arsip & Pembersihan (Purging)</h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">
              Fitur ini akan menarik miliaran data log/absensi lampau, membungkusnya menjadi JSON Arsip ke Cloud, lalu menghapusnya secara permanen dari server agar sistem kembali super cepat.
            </p>
            
            <div className="inline-block p-4 bg-amber-50 border border-amber-200 rounded-[var(--ui-radius-small)] text-left mb-6 max-w-lg">
              <p className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-1"><AlertCircle size={16} /> Syarat Pembersihan</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                Pembersihan hanya dapat dijalankan jika Anda telah menghubungkan salah satu layanan penyimpanan Cloud <b>(Cloudflare R2 atau Telegram)</b>.
                Data tidak akan dihapus jika proses unggah ke awan gagal demi keamanan data Anda.
              </p>
            </div>

            <div className="max-w-xs mx-auto mb-8 text-left">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hapus Semua Log Sebelum Tanggal:</label>
              <input type="date" value={archiveDate} onChange={e => setArchiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-[var(--ui-radius-small)] text-sm font-bold text-slate-700 focus:outline-none focus:border-[var(--ui-primary)]" />
            </div>

            <div>
              <button onClick={handleArchive} disabled={isArchiving || !archiveDate || (!isTelegramConfigured && !isR2Configured)} className="flex items-center justify-center gap-2 mx-auto">
                {isArchiving ? <RefreshCw size={18} className="animate-spin text-white" /> : <Trash2 size={18} className="text-white" />}
                <span className="text-white">{isArchiving ?'Sedang Memproses...' :'Mulai Bersihkan Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGS TABLE (Shared) */}
      <div className="bg-white rounded-[var(--ui-radius-small)] border-none shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-700 flex items-center gap-2"><Calendar size={16} /> Riwayat Eksekusi (Sesi Ini)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-bold text-left">Platform</th>
              <th className="px-4 py-3 font-bold text-left">File Backup</th>
              <th className="px-4 py-3 font-bold text-center">Ukuran</th>
              <th className="px-4 py-3 font-bold text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {backupLogs.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-slate-500">Belum ada riwayat aktivitas di sesi ini.</td>
              </tr>
            ) : backupLogs.map(log => (
              <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-xs text-slate-700">{log.type}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.filename}</td>
                <td className="px-4 py-3 text-center text-slate-500 text-xs">{log.size ||'-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-[var(--ui-radius-small)] text-[10px] font-bold ${log.status ==='success' ?'bg-emerald-100 text-emerald-700' :'bg-red-100 text-red-700'}`}>
                    {log.status ==='success' ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />} Sukses
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-[var(--ui-radius-small)] shadow-sm font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-5 text-white max-w-sm ${toast.type ==='error' ?'bg-red-600' :'bg-emerald-600'}`}>
          {toast.type ==='error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} {toast.message}
        </div>
      )}
    </div>
  );
}
